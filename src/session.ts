// One round on one floor: runs the simulation at a fixed step, feeds the 3D view, the HUD and the
// sound, and turns mouse and keyboard into game commands. Also used without HUD as the live demo
// behind the main menu (attract mode, a bot plays).

import type { Sfx } from './audio/sfx';
import { completeLevel, store, type LevelResult, type SaveData } from './meta/save';
import { sendRound, summarize, type RoundSummary } from './net/api';
import { Actors } from './render/actors';
import type { Assets } from './render/assets';
import { Popups } from './render/popups';
import type { View } from './render/view';
import { World } from './render/world';
import { solidBot, type Bot } from './sim/bots';
import { COLLEAGUES } from './sim/data/colleagues';
import { LEVELS } from './sim/data/levels';
import { TOWERS, type TargetMode } from './sim/data/towers';
import { Game, TICK, type GameEvent } from './sim/game';
import { endScreen } from './ui/end';
import { Hud, SPEEDS } from './ui/hud';
import { confirmOverlay, howToBody, pauseOverlay, textScreen } from './ui/screens';
import { UI_TEXT as T } from './ui/text';

export interface SessionHost {
  view: View;
  assets: Assets;
  sfx: Sfx;
  save: SaveData;
  ui: HTMLElement;
  popupLayer: HTMLElement;
  toCareer(): void;
  retry(levelId: number): void;
}

const MAX_TICKS_PER_FRAME = 60;

export class Session {
  readonly game: Game;
  private readonly world: World;
  private readonly actors: Actors;
  private readonly popups: Popups;
  private readonly hud: Hud | null;
  private readonly root: HTMLElement;
  private overlay: HTMLElement | null = null;
  private speed = 1;
  private paused = false;
  private selected: number | null = null;
  private placing: string | null = null;
  private hover: { tx: number; ty: number } | null = null;
  private acc = 0;
  private prev = new Map<number, { x: number; y: number }>();
  private realTime = 0;
  private speedUse: Record<string, number> = {};
  private ended = false;
  private drag: { x: number; y: number; moved: boolean; button: number } | null = null;
  private ro: ResizeObserver | null = null;
  private botTick = 0;
  private hintStage = 0;
  private readonly bot: Bot | null;
  private readonly cleanup: (() => void)[] = [];

  constructor(
    private readonly host: SessionHost,
    levelId: number,
    readonly attract = false,
  ) {
    const level = LEVELS[levelId];
    this.game = new Game(level, { seed: attract ? 7 : Math.floor(Math.random() * 1e9) });
    this.world = new World(level, this.game, host.assets);
    this.actors = new Actors(host.assets, host.view.screenRight);
    host.view.scene.add(this.world.group, this.actors.group);
    host.view.setBounds(level.size.w, level.size.h);
    this.popups = new Popups(host.popupLayer, host.view);
    this.root = document.createElement('div');
    host.ui.append(this.root);

    if (attract) {
      this.hud = null;
      this.bot = solidBot;
      this.bot.plan(this.game);
      this.game.start();
      this.speed = 2;
      host.view.setInsets({ left: 0, right: 0, top: 0, bottom: 0 });
      return;
    }
    this.bot = null;
    this.hud = new Hud(this.game, {
      pick: (id) => this.pick(id),
      startOrNext: () => this.startOrNext(),
      setSpeed: (s) => this.setSpeed(s),
      togglePause: () => this.togglePause(),
      upgrade: (id, p) => this.upgrade(id, p),
      claim: (id) => this.claim(id),
      sell: (id) => this.sell(id),
      target: (id, m) => this.target(id, m),
      deselect: () => this.select(null),
    });
    this.root.append(this.hud.root);
    this.ro = this.hud.observe(() => this.refit());
    requestAnimationFrame(() => this.refit());
    this.bindInput();
    if (!host.save.hintsDone.includes('l1') && levelId === 1) {
      this.hintStage = 1;
      this.hud.hint(T.hintFirstPlace, 12);
    }
  }

  private refit(): void {
    if (this.hud) this.host.view.setInsets(this.hud.insets());
  }

  // ------------------------------------------------------------------ loop

  frame(realDt: number): void {
    const dt = Math.min(realDt, 0.1);
    const g = this.game;
    const running = g.phase === 'running';
    const blocked = this.paused || (this.overlay !== null && !this.ended);
    if (running && !blocked) {
      this.acc += dt * this.speed;
      this.realTime += dt;
      const key = `${this.speed}x`;
      this.speedUse[key] = (this.speedUse[key] ?? 0) + dt;
    }
    let ticks = 0;
    while (this.acc >= TICK && ticks < MAX_TICKS_PER_FRAME) {
      if (this.acc < 2 * TICK) this.snapshot();
      g.step(TICK);
      this.acc -= TICK;
      ticks++;
      if (this.bot && ++this.botTick % 15 === 0) this.bot.act(g);
    }
    if (ticks >= MAX_TICKS_PER_FRAME) this.acc = 0;
    for (const ev of g.drainEvents()) this.onEvent(ev);
    const animDt = blocked ? 0 : running ? dt * this.speed : dt;
    this.actors.sync(g, this.prev, Math.min(1, this.acc / TICK), animDt);
    this.popups.update(dt);
    this.hud?.update({ selected: this.selected, placing: this.placing, speed: this.speed, paused: this.paused });
    this.updatePreview();
    if (this.attract && g.over) this.host.retry(g.level.id);
  }

  private snapshot(): void {
    this.prev.clear();
    for (const e of this.game.enemies) this.prev.set(e.id, { x: e.x, y: e.y });
  }

  // ------------------------------------------------------------------ events

  private onEvent(ev: GameEvent): void {
    const g = this.game;
    this.actors.onEvent(ev, g);
    if (this.attract) return;
    const sfx = this.host.sfx;
    const st = this.host.save.settings;
    switch (ev.t) {
      case 'shot':
        sfx.play('shot');
        if (ev.result === 'blocked') this.popups.spawn('BLOCKED', ev.tx, ev.ty, 1.1, 'warn', { delay: ev.travel });
        else if (ev.result === 'immune') this.popups.spawn('IMMUNE', ev.tx, ev.ty, 1.1, 'info', { delay: ev.travel });
        else if (st.damageNumbers && this.speed <= 2) this.popups.spawn(ev.damage >= 10 ? ev.damage.toFixed(0) : ev.damage.toFixed(1), ev.tx, ev.ty, 1.0, 'dmg', { delay: ev.travel, life: 0.6 });
        break;
      case 'kill':
        sfx.play('kill', { pitch: COLLEAGUES[ev.type].boss ? 0.6 : 1 });
        if (ev.reward >= 1) this.popups.spawn(`+${Math.round(ev.reward)}`, ev.x, ev.y, 1.2, 'coffee', { delay: ev.delay, icon: 'fa-solid fa-mug-hot' });
        if (COLLEAGUES[ev.type].boss) this.hud?.banner(`${COLLEAGUES[ev.type].name.toUpperCase()} DEALT WITH`, 'The meeting is over. It could have been an email.');
        break;
      case 'leak': {
        sfx.play('leak');
        this.hud?.hurt();
        const d = this.world.deskPos;
        this.popups.spawn(`-${ev.focus} ${T.focus}`, d.x, d.z, 1.5, 'focus', { life: 1.3 });
        break;
      }
      case 'coffee': {
        if (ev.toPot) {
          this.popups.spawn(`+${ev.amount}`, ev.x, ev.y, 1.2, 'info', { icon: 'fa-solid fa-piggy-bank', life: 0.7 });
        } else {
          sfx.play('coffee');
          this.popups.spawn(`+${ev.amount}`, ev.x, ev.y, 1.2, 'coffee', { icon: 'fa-solid fa-mug-hot' });
        }
        break;
      }
      case 'salary':
        this.hud?.toast(`${T.payday}: +${ev.amount} ${T.coffee} for surviving wave ${ev.wave}.`, 'good', 2.4);
        break;
      case 'wave': {
        sfx.play('wave');
        if (ev.boss) {
          const def = Object.values(COLLEAGUES).find((c) => c.boss && g.waves[ev.index - 1].some((gr) => gr.type === c.id));
          if (def?.boss) {
            sfx.play('boss');
            this.hud?.banner(def.name.toUpperCase(), `"${def.quote}" ${def.boss.intro}`);
            this.hud?.showColleague(def, 14, !this.host.save.seenColleagues.includes(def.id));
          }
        }
        if (ev.early && g.enemies.length >= 25 && g.focus > g.startFocus / 2) this.hud?.toast(T.wavesStack, 'warn');
        if (this.hintStage === 2 && ev.index === 2) {
          this.hud?.hint(T.hintUpgrade, 8);
          this.hintStage = 3;
        } else if (this.hintStage === 3 && ev.index === 4) {
          this.hud?.hint(T.hintCoffee, 8);
          this.hintStage = 4;
        }
        break;
      }
      case 'bossPhase': {
        sfx.play('bossphase');
        const e = g.enemy(ev.enemyId);
        if (e) this.hud?.toast(`${e.def.name} calls everyone in. (${ev.called} Interns)`, 'warn');
        break;
      }
      case 'split':
        sfx.play('split');
        break;
      case 'spawn': {
        const e = g.enemy(ev.enemyId);
        if (e && !this.host.save.seenColleagues.includes(e.type)) {
          this.host.save.seenColleagues.push(e.type);
          store(this.host.save);
          this.hud?.newBadges.add(e.type);
          if (!e.def.boss) this.hud?.showColleague(e.def, 10, true);
        }
        break;
      }
      case 'placed':
        sfx.play('place');
        if (this.hintStage === 1) {
          this.hintStage = 2;
          if (g.phase === 'plan') this.hud?.hint(T.hintStart, 10);
        }
        break;
      case 'upgraded':
        sfx.play('upgrade');
        break;
      case 'claim':
        sfx.play('coffee', { pitch: 0.8, gain: 1.6 });
        this.popups.spawn(`+${ev.amount}`, ev.x, ev.y, 1.4, 'coffee', { icon: 'fa-solid fa-sack-dollar', life: 1.4 });
        break;
      case 'ability':
        sfx.play('bossphase', { pitch: 1.6, gain: 0.6 });
        break;
      case 'sold':
        sfx.play('sell');
        break;
      case 'end':
        this.onEnd();
        break;
      default:
        break;
    }
  }

  private onEnd(): void {
    if (this.ended) return;
    this.ended = true;
    const g = this.game;
    this.placing = null;
    this.selected = null;
    const save = this.host.save;
    let result: LevelResult | null = null;
    if (g.phase === 'won') {
      this.host.sfx.play('win');
      result = completeLevel(save, g.level.id, g.stars, g.focus === g.startFocus);
    } else {
      this.host.sfx.play('lose');
    }
    if (g.level.id === 1 && !save.hintsDone.includes('l1')) {
      save.hintsDone.push('l1');
      store(save);
    }
    const summary = summarize(g, save.playerId, this.realTime, this.speedUse);
    if (save.settings.shareStats) void sendRound(summary);
    window.setTimeout(() => this.showEnd(summary, result), g.endReason === 'gaveup' ? 0 : 1300);
  }

  private showEnd(summary: RoundSummary, result: LevelResult | null): void {
    this.setOverlay(
      endScreen(this.game, summary, result, {
        retry: () => this.host.retry(this.game.level.id),
        career: () => this.host.toCareer(),
      }),
    );
  }

  // ------------------------------------------------------------------ commands

  private pick(defId: string | null): void {
    if (this.ended) return;
    this.host.sfx.play('click');
    this.placing = this.placing === defId ? null : defId;
    this.selected = null;
  }

  private startOrNext(): void {
    if (this.ended) return;
    const g = this.game;
    if (g.phase === 'plan') {
      g.start();
      if (this.hintStage <= 2) {
        this.hud?.clearHint();
        this.hintStage = 2;
      }
      this.hud?.toast(T.dayBegins, '', 2.5);
    } else if (!g.callNextWave()) {
      this.host.sfx.play('deny');
    }
  }

  private setSpeed(s: number): void {
    this.speed = s;
    this.host.sfx.play('click');
  }

  private togglePause(): void {
    if (this.ended) return;
    if (this.overlay) {
      this.closeOverlay();
      return;
    }
    this.paused = true;
    this.setOverlay(
      pauseOverlay({
        resume: () => this.closeOverlay(),
        howTo: () =>
          this.setOverlay(textScreen(T.howTo, howToBody(), () => this.togglePauseMenu())),
        giveUp: () =>
          this.setOverlay(
            confirmOverlay(T.giveUpConfirm, T.confirmYes, T.confirmNo, () => {
              this.closeOverlay();
              this.game.giveUp();
            }, () => this.togglePauseMenu()),
          ),
        quit: () => {
          if (this.game.waveIndex >= 1 && !this.game.over && this.host.save.settings.shareStats) {
            this.game.giveUp();
            void sendRound(summarize(this.game, this.host.save.playerId, this.realTime, this.speedUse));
          }
          this.host.toCareer();
        },
      }),
    );
  }

  private togglePauseMenu(): void {
    this.closeOverlay();
    this.togglePause();
  }

  private setOverlay(el: HTMLElement): void {
    this.overlay?.remove();
    this.overlay = el;
    this.root.append(el);
  }

  private closeOverlay(): void {
    this.overlay?.remove();
    this.overlay = null;
    this.paused = false;
  }

  private upgrade(id: number, path: number): void {
    const r = this.game.upgrade(id, path);
    if (!r.ok) this.refuse(r.reason);
  }

  private claim(id: number): void {
    const r = this.game.claim(id);
    if (!r.ok) this.refuse(r.reason);
  }

  private sell(id: number): void {
    this.game.sell(id);
    this.selected = null;
  }

  private target(id: number, mode: TargetMode): void {
    this.game.setTargeting(id, mode);
    this.host.sfx.play('click');
  }

  private select(id: number | null): void {
    this.selected = id;
    this.placing = null;
  }

  private refuse(reason?: string): void {
    this.host.sfx.play('deny');
    if (reason) this.hud?.toast(reason, 'bad', 2.2);
  }

  // ------------------------------------------------------------------ input

  private bindInput(): void {
    const canvas = this.host.view.renderer.domElement;
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      this.cleanup.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };
    on(canvas, 'pointermove', (e) => this.onMove(e));
    on(canvas, 'pointerdown', (e) => this.onDown(e));
    on(window, 'pointerup', (e) => this.onUp(e));
    on(canvas, 'pointerleave', () => (this.hover = null));
    on(canvas, 'contextmenu', (e) => e.preventDefault());
    on(canvas, 'wheel', (e) => {
      e.preventDefault();
      this.host.view.zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
    }, { passive: false });
    on(window, 'keydown', (e) => this.onKey(e));
    const onVis = () => {
      if (document.hidden && this.game.phase === 'running' && !this.overlay) this.togglePause();
    };
    document.addEventListener('visibilitychange', onVis);
    this.cleanup.push(() => document.removeEventListener('visibilitychange', onVis));
  }

  private tileAt(px: number, py: number): { tx: number; ty: number } | null {
    const p = this.host.view.groundAt(px, py);
    if (!p) return null;
    const tx = Math.floor(p.x);
    const ty = Math.floor(p.y);
    return this.game.inBounds(tx, ty) ? { tx, ty } : null;
  }

  private onMove(e: PointerEvent): void {
    if (this.drag) {
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) this.drag.moved = true;
      if (this.drag.moved) this.host.view.panBy(dx, dy);
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      return;
    }
    this.hover = this.tileAt(e.clientX, e.clientY);
  }

  private onDown(e: PointerEvent): void {
    if (this.ended || this.overlay) return;
    if (e.button === 1 || e.button === 2) {
      this.drag = { x: e.clientX, y: e.clientY, moved: false, button: e.button };
      return;
    }
    if (e.button !== 0) return;
    const tile = this.tileAt(e.clientX, e.clientY);
    if (this.placing) {
      if (!tile) return;
      const r = this.game.place(this.placing, tile.tx, tile.ty);
      if (!r.ok) {
        this.refuse(r.reason);
        return;
      }
      if (!e.shiftKey || this.game.coffee < this.game.placeCostFor(this.placing)) this.placing = null;
      return;
    }
    const t = tile ? this.game.towerAt(tile.tx, tile.ty) : undefined;
    if (t) this.host.sfx.play('click');
    this.select(t ? t.id : null);
  }

  private onUp(e: PointerEvent): void {
    if (!this.drag || e.button !== this.drag.button) return;
    const wasClick = !this.drag.moved;
    this.drag = null;
    if (wasClick && e.button === 2) {
      // Right click without dragging: cancel whatever is going on.
      if (this.placing) this.placing = null;
      else this.select(null);
    }
  }

  private onKey(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (this.ended) return;
    const k = e.key;
    if (k === 'Escape') {
      if (this.overlay) this.togglePauseMenu();
      else if (this.placing) this.placing = null;
      else if (this.selected !== null) this.select(null);
      else this.togglePause();
      e.preventDefault();
      return;
    }
    if (this.overlay) return;
    if (k === ' ') {
      this.startOrNext();
      e.preventDefault();
    } else if (k === 'p' || k === 'P') {
      this.togglePause();
    } else if (k === 'f' || k === 'F') {
      this.setSpeed(SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length]);
    } else if (k === ',' || k === '.' || k === '/') {
      // The Bloons keys for the three upgrade paths.
      if (this.selected !== null) this.upgrade(this.selected, [',', '.', '/'].indexOf(k));
      e.preventDefault();
    } else if (k === 'c' || k === 'C') {
      if (this.selected !== null) this.claim(this.selected);
    } else if (k === 'r' || k === 'R' || k === 'Home') {
      this.host.view.resetView();
    } else if (/^[1-9]$/.test(k)) {
      const id = this.game.level.towers[Number(k) - 1];
      if (id) this.pick(id);
    } else if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.host.view.panBy(40, 0);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.host.view.panBy(-40, 0);
    else if (k === 'ArrowUp' || k === 'w' || k === 'W') this.host.view.panBy(0, 40);
    else if (k === 'ArrowDown' || k === 's' || k === 'S') this.host.view.panBy(0, -40);
  }

  private updatePreview(): void {
    const g = this.game;
    this.world.buildGrid.visible = this.placing !== null;
    if (this.placing && this.hover) {
      const def = TOWERS[this.placing];
      const check = g.canPlace(this.placing, this.hover.tx, this.hover.ty);
      const placeable = check.ok || check.reason === 'Not enough Coffee.';
      const range = def.role === 'damage' ? def.base.range : 0;
      this.actors.showGhost(def.models[0], this.hover.tx, this.hover.ty, check.ok, range);
      if (!placeable && range > 0) this.actors.showRange(this.hover.tx + 0.5, this.hover.ty + 0.5, range, '#e5534b');
      return;
    }
    this.actors.showGhost(null, 0, 0, false, 0);
    const sel = this.selected !== null ? g.tower(this.selected) : undefined;
    const hov = this.hover ? g.towerAt(this.hover.tx, this.hover.ty) : undefined;
    const t = sel ?? hov;
    const tipRange = t && t.def.role === 'economy' && g.liveStats(t).tip > 0;
    if (t && (t.def.role === 'damage' || tipRange)) this.actors.showRange(t.x, t.y, g.liveStats(t).range, tipRange ? '#6fcf7f' : '#ffffff');
    else this.actors.showRange(null, 0, 0);
  }

  dispose(): void {
    this.cleanup.forEach((f) => f());
    this.ro?.disconnect();
    this.root.remove();
    this.popups.clear();
    this.actors.clear();
    this.host.view.scene.remove(this.world.group, this.actors.group);
    this.world.dispose();
  }
}
