// One round on one floor: feeds the 3D view, the HUD and the sound, and turns mouse and keyboard
// into game commands. Three ways to run:
//   local   single player: the simulation runs here, at a fixed step
//   attract the live demo behind the main menu: a bot plays, no HUD
//   remote  multiplayer: the server runs the simulation; this copy only shows its snapshots and
//           sends commands. Positions are smoothed between snapshots.

import type { Sfx } from './audio/sfx';
import { perkOptions, SMOKE_FOCUS } from './meta/perks';
import { completeLevel, store, type LevelResult, type SaveData } from './meta/save';
import { sendRound, summarize, type RoundSummary } from './net/api';
import type { MpClient, RoomInfo, ServerMsg } from './net/mp';
import { Actors } from './render/actors';
import type { Assets } from './render/assets';
import { Popups } from './render/popups';
import type { View } from './render/view';
import { raiseAt, surfaceAt, World } from './render/world';
import { solidBot, type Bot } from './sim/bots';
import { applyCommand, type Command } from './sim/commands';
import { COLLEAGUES } from './sim/data/colleagues';
import { LEVELS } from './sim/data/levels';
import { TOWERS, type TargetMode } from './sim/data/towers';
import { CHAIR_DIRS, Game, needsSight, TICK, type GameEvent } from './sim/game';
import { zoneMap } from './sim/zones';
import { endScreen } from './ui/end';
import { Hud, SPEEDS } from './ui/hud';
import { confirmOverlay, howToBody, mpEndActions, pauseOverlay, settingsOverlay, textScreen } from './ui/screens';
import { dinoGame } from './ui/dino';
import { formGame } from './ui/form';
import { phoneGame } from './ui/phone';
import { projectorGame } from './ui/projector';
import { UI_TEXT as T } from './ui/text';
import { briefingCard, briefingHasNews } from './ui/briefing';
import { briefingFor } from './sim/briefing';

export interface SessionHost {
  view: View;
  assets: Assets;
  sfx: Sfx;
  save: SaveData;
  ui: HTMLElement;
  popupLayer: HTMLElement;
  toCareer(): void;
  retry(levelId: number): void;
  /** Multiplayer: back to the lobby (the host chose "back to lobby"), or out entirely. */
  toLobby?(): void;
  leaveMp?(): void;
  /** Save and apply changed settings (volume) right away. */
  applySettings(): void;
}

export interface SessionOptions {
  attract?: boolean;
  mp?: { client: MpClient; room: RoomInfo };
}

const MAX_TICKS_PER_FRAME = 60;
/** The server sends this many snapshots a second; positions are smoothed in between. */
const SNAP_INTERVAL = 0.1;

export class Session {
  readonly game: Game;
  readonly attract: boolean;
  private readonly mp: MpClient | null;
  private room: RoomInfo | null;
  /** The player this screen belongs to (0 in single player). */
  private readonly me: number;
  private readonly world: World;
  /** Heights of the worktops on this floor, highest first (for pointing at them). */
  private readonly surfaces: number[];
  private readonly actors: Actors;
  private readonly popups: Popups;
  private readonly hud: Hud | null;
  private readonly root: HTMLElement;
  private overlay: HTMLElement | null = null;
  /** The mini-game that is open for you right now (projector or no internet). */
  private qte: { el: HTMLElement; setTimeLeft(s: number): void; close(): void; wantsSpace?: boolean } | null = null;
  private speed = 1;
  private paused = false;
  /** A new-colleague card is waiting for "Got it": the simulation stands still (single player). */
  private cardHold = false;
  /** Colleagues whose card this level already showed. */
  private readonly cardsShown = new Set<string>();
  private selected: number | null = null;
  private placing: string | null = null;
  /** A Pomodoro Timer waiting for the next floor click to pick its tile. */
  private aiming: number | null = null;
  private toldReserved = false;
  private hover: { tx: number; ty: number } | null = null;
  private acc = 0;
  private prev = new Map<number, { x: number; y: number }>();
  private sinceSnap = 0;
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
    opts: SessionOptions = {},
  ) {
    this.attract = opts.attract ?? false;
    this.mp = opts.mp?.client ?? null;
    this.room = opts.mp?.room ?? null;
    this.me = this.mp ? Math.max(0, this.mp.you) : 0;
    const level = LEVELS[levelId];
    if (this.room) {
      const n = Math.max(1, this.room.gamePlayers);
      this.game = new Game(level, { players: n, sharedWallet: this.room.settings.shared || n === 1, ownTowers: this.room.settings.ownTowers !== false });
      const mode = this.room.settings.zoneMode;
      this.game.setZones(zoneMap(level.size.w, level.size.h, mode, n), mode === 'anywhere' ? [] : this.room.settings.assign);
    } else {
      // Your Recognition perks count in your own game (not in the menu demo, not online).
      const perks = this.attract ? {} : perkOptions(host.save);
      this.game = new Game(level, { seed: this.attract ? 7 : Math.floor(Math.random() * 1e9), ...perks });
    }
    this.world = new World(level, this.game, host.assets, this.me);
    this.surfaces = [...new Set(level.decor.flatMap((d) => (d.surface === undefined ? [] : [d.surface])))].sort((x, y) => y - x);
    this.actors = new Actors(host.assets, host.view.screenRight);
    if (this.room) this.actors.setOwnerColors(this.room.players.map((p) => p.color));
    host.view.scene.add(this.world.group, this.actors.group);
    host.view.setBounds(level.size.w, level.size.h);
    this.popups = new Popups(host.popupLayer, host.view);
    this.root = document.createElement('div');
    host.ui.append(this.root);

    if (this.attract) {
      this.hud = null;
      this.bot = solidBot;
      this.bot.plan(this.game);
      this.game.start();
      this.speed = 2;
      host.view.setInsets({ left: 0, right: 0, top: 0, bottom: 0 });
      return;
    }
    this.bot = null;
    this.hud = new Hud(
      this.game,
      {
        pick: (id) => this.pick(id),
        startOrNext: () => this.startOrNext(),
        setSpeed: (s) => this.setSpeed(s),
        togglePause: () => this.pauseButton(),
        upgrade: (id, p) => this.run({ c: 'upgrade', id, path: p }),
        claim: (id) => this.run({ c: 'claim', id }),
        sell: (id) => {
          this.run({ c: 'sell', id });
          this.selected = null;
        },
        target: (id, m) => this.target(id, m),
        deselect: () => this.select(null),
        gift: (to, amount) => this.run({ c: 'gift', to, amount }),
        settings: () => this.openSettings(false),
        leave: () => this.confirmLeave(),
        smoke: () => this.smokeBreak(),
        dir: (id, dir) => {
          this.run({ c: 'dir', id, dir });
          this.host.sfx.play('click');
        },
        aim: (id) => {
          this.aiming = id;
          this.placing = null;
          this.hud?.toast(T.aimNow, '', 2.5);
          this.host.sfx.play('click');
        },
      },
      this.me,
    );
    if (this.room) this.hud.ownerNames = this.room.players.map((p) => p.name);
    this.root.append(this.hud.root);
    this.ro = this.hud.observe(() => this.refit());
    requestAnimationFrame(() => this.refit());
    this.bindInput();
    if (this.mp) {
      this.cleanup.push(this.mp.on((m) => this.onServer(m)));
    } else if (!host.save.hintsDone.includes('l1') && levelId === 1) {
      this.hintStage = 1;
      this.hud.hint(T.hintFirstPlace, 12);
    }
    this.showBriefing();
  }

  /** What is new on this floor, before the day starts. Level 1 has its own hints. */
  private showBriefing(): void {
    const save = this.host.save;
    const id = this.game.level.id;
    if (this.attract || id <= 1 || !save.settings.tips || save.briefingsHidden.includes(id)) return;
    const b = briefingFor(id);
    if (!briefingHasNews(b)) return;
    const close = () => this.hud?.closeBriefing();
    this.hud?.showBriefing(
      briefingCard(this.game.level.name, b, {
        close,
        hide: () => {
          save.briefingsHidden.push(id);
          store(save);
          close();
        },
      }),
    );
  }

  private get isHost(): boolean {
    return !this.room || this.room.host === this.me;
  }

  private refit(): void {
    if (this.hud) this.host.view.setInsets(this.hud.insets());
  }

  // ------------------------------------------------------------------ loop

  frame(realDt: number): void {
    const dt = Math.min(realDt, 0.1);
    const g = this.game;
    const running = g.phase === 'running';
    if (this.mp) {
      // Remote: nothing to simulate, just smooth between the last two snapshots.
      this.sinceSnap += dt;
      if (running && !this.paused) this.realTime += dt;
      const animDt = this.paused ? 0 : running ? dt * this.speed : dt;
      this.actors.sync(g, this.prev, Math.min(1, this.sinceSnap / SNAP_INTERVAL), animDt);
    } else {
      const blocked = this.paused || this.cardHold || (this.overlay !== null && !this.ended);
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
    }
    this.world.update(dt, g);
    this.popups.update(dt);
    this.hud?.update({
      selected: this.selected,
      placing: this.placing,
      speed: this.speed,
      paused: this.paused,
      mp: this.room ? { players: this.room.players, host: this.room.host } : null,
      smokes: this.mp ? null : this.host.save.smokes,
      dt: this.paused || this.overlay !== null ? 0 : dt,
    });
    this.updatePreview();
    this.updateHazard();
    // Somebody typing nearby: faster and louder the less Focus you have left.
    const working = !this.attract && !this.ended && !this.paused && this.overlay === null && (g.phase === 'running' || g.phase === 'plan');
    this.host.sfx.setTyping(working, 1 - g.focus / Math.max(1, g.startFocus));
    if (this.attract && g.over) this.host.retry(g.level.id);
  }

  /** The projector mini-game follows the game state, so it also survives a reconnect online. */
  private updateHazard(): void {
    const g = this.game;
    const want = this.hud !== null && !this.ended && g.hazardOpenFor(this.me);
    if (want && !this.qte) {
      const solve = () => this.run({ c: 'solve' });
      const say = (msg: string) => this.refuse(msg);
      const type = g.level.hazard?.type;
      this.qte =
        type === 'phone' ? phoneGame((hang) => this.run({ c: 'phone', hang })) : type === 'form' ? formGame(solve) : type === 'nointernet' ? dinoGame(solve, say) : projectorGame(solve, say);
      this.root.append(this.qte.el);
    } else if (!want && this.qte) {
      this.qte.close();
      this.qte = null;
    }
    if (this.qte) {
      this.qte.setTimeLeft(g.hazardUntil - g.time);
      this.qte.el.hidden = this.overlay !== null;
    }
  }

  private snapshot(): void {
    this.prev.clear();
    for (const e of this.game.enemies) this.prev.set(e.id, { x: e.x, y: e.y });
  }

  // ------------------------------------------------------------------ multiplayer

  private onServer(m: ServerMsg): void {
    switch (m.t) {
      case 'update': {
        this.snapshot();
        this.game.applySnapshot(m.s);
        this.sinceSnap = 0;
        this.speed = m.speed;
        this.paused = m.paused;
        for (const ev of m.e) this.onEvent(ev);
        break;
      }
      case 'room':
        this.room = m.room;
        if (this.hud) this.hud.ownerNames = m.room.players.map((p) => p.name);
        // The host went back to the lobby: everyone follows.
        if (m.room.phase === 'lobby') this.host.toLobby?.();
        break;
      case 'refused':
        this.refuse(m.reason);
        break;
      default:
        break;
    }
  }

  /** Every player action goes through here: straight into the game locally, to the server online. */
  private run(cmd: Command): void {
    if (this.ended) return;
    if (this.mp) {
      // Catch the obvious refusals here so the answer is instant; the server has the final say.
      const pre = this.precheck(cmd);
      if (pre) return this.refuse(pre);
      this.mp.command(cmd);
      return;
    }
    const r = applyCommand(this.game, 0, cmd);
    if (!r.ok) this.refuse(r.reason);
  }

  private precheck(cmd: Command): string | null {
    const g = this.game;
    switch (cmd.c) {
      case 'place': {
        const c = g.canPlace(cmd.def, cmd.tx, cmd.ty, this.me);
        return c.ok ? null : (c.reason ?? null);
      }
      case 'upgrade': {
        const t = g.tower(cmd.id);
        if (!t) return null;
        const c = g.canUpgrade(t, cmd.path, this.me);
        return c.ok ? null : (c.reason ?? null);
      }
      case 'next':
        return this.isHost ? null : T.mpHostOnly;
      default:
        return null;
    }
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
        sfx.play(ev.kind === 'reply' && g.tower(ev.towerId)?.defId === 'artillery' ? 'staple' : 'shot');
        if (ev.result === 'blocked') this.popups.spawn('BLOCKED', ev.tx, ev.ty, 1.1, 'warn', { delay: ev.travel });
        else if (ev.result === 'immune') this.popups.spawn('IMMUNE', ev.tx, ev.ty, 1.1, 'info', { delay: ev.travel });
        else if (st.damageNumbers && this.speed <= 2) this.popups.spawn(ev.damage >= 10 ? ev.damage.toFixed(0) : ev.damage.toFixed(1), ev.tx, ev.ty, 1.0, 'dmg', { delay: ev.travel, life: 0.6 });
        break;
      case 'kill': {
        sfx.play('kill', { pitch: COLLEAGUES[ev.type].boss ? 0.6 : 1 });
        // In a split game everyone gets their share, so show what lands in your own wallet.
        const mine = g.sharedWallet ? ev.reward : ev.reward / g.players;
        if (mine >= 1) this.popups.spawn(`+${Math.round(mine)}`, ev.x, ev.y, 1.2, 'coffee', { delay: ev.delay, icon: 'fa-solid fa-mug-hot' });
        if (COLLEAGUES[ev.type].boss) this.hud?.banner(`${COLLEAGUES[ev.type].name.toUpperCase()} DEALT WITH`, 'The meeting is over. It could have been an email.');
        break;
      }
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
      case 'salary': {
        const mine = g.sharedWallet ? ev.amount : Math.round((ev.amount / g.players) * 10) / 10;
        this.hud?.toast(`${T.payday}: +${mine} ${T.coffee} for surviving wave ${ev.wave}.`, 'good', 2.4);
        break;
      }
      case 'gift':
        if (ev.to === this.me) {
          sfx.play('cash', { pitch: 1.1 });
          this.hud?.toast(`${this.nameOf(ev.from)} gave you ${ev.amount} ${T.coffee}.`, 'good', 3);
        }
        break;
      case 'wave': {
        sfx.play('wave');
        if (ev.index === 1) this.hud?.closeBriefing();
        if (ev.index === 1 && !ev.early && this.mp) this.hud?.toast(T.dayBegins, '', 2.5);
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
        this.hud?.toast(T.bossBackup.replace('{name}', e ? e.def.name : 'The boss'), 'warn');
        break;
      }
      case 'split':
        sfx.play('split');
        break;
      case 'spawn': {
        const e = g.enemy(ev.enemyId);
        if (!e) break;
        const save = this.host.save;
        if (!save.seenColleagues.includes(e.type)) {
          save.seenColleagues.push(e.type);
          store(save);
          this.hud?.newBadges.add(e.type);
        }
        if (e.def.boss || this.cardsShown.has(e.type) || !save.settings.tips || this.attract) break;
        this.cardsShown.add(e.type);
        if (!this.mp && !save.tipsSeen.includes(e.type)) {
          // The very first time: the game waits until the player has read it.
          save.tipsSeen.push(e.type);
          store(save);
          this.cardHold = true;
          this.hud?.showColleague(e.def, 0, true, () => (this.cardHold = false));
        } else {
          // Seen before: once per level, without stopping anything.
          this.hud?.showColleague(e.def, 8, true);
        }
        break;
      }
      case 'placed':
        sfx.play('place', { gain: ev.player === this.me ? 1 : 0.5 });
        if (ev.player === this.me && ev.defId === 'chair') {
          // Straight to its panel, so you can turn it.
          this.select(ev.towerId);
          this.hud?.hint(T.chairHint, 8);
        }
        if (this.hintStage === 1) {
          this.hintStage = 2;
          if (g.phase === 'plan') this.hud?.hint(T.hintStart, 10);
        }
        break;
      case 'upgraded':
        sfx.play('upgrade', { gain: ev.player === this.me ? 1 : 0.5 });
        break;
      case 'claim':
        sfx.play('cash');
        this.popups.spawn(`+${ev.amount}`, ev.x, ev.y, 1.4, 'coffee', { icon: 'fa-solid fa-sack-dollar', life: 1.4 });
        break;
      case 'ability':
        sfx.play('bossphase', { pitch: 1.6, gain: 0.6 });
        break;
      case 'pulse':
        sfx.play('pulse', { pitch: ev.stun ? 0.8 : 1 });
        break;
      case 'sold':
        sfx.play('sell', { gain: ev.player === this.me ? 1 : 0.5 });
        if (this.selected === ev.towerId) this.selected = null;
        break;
      case 'hazard':
        if (ev.kind === 'lunch') {
          if (ev.on) {
            sfx.play('lunch');
            this.hud?.toast(T.lunchStarts, 'warn', 3.5);
          } else this.hud?.toast(T.lunchEnds, '', 2);
        } else if (ev.kind === 'smoke') {
          if (ev.on) {
            sfx.play('mop', { pitch: 0.6, gain: 0.7 });
            this.hud?.toast(T.smokeStarts, 'warn', 3);
          }
        } else if (ev.kind === 'pizza') {
          if (ev.on) {
            sfx.play('gate', { pitch: 0.8 });
            this.hud?.toast(T.pizzaArrives, 'warn', 3);
          }
        } else if (ev.kind === 'overheat') {
          if (ev.on) {
            sfx.play('alarm', { pitch: 1.3, gain: 0.6 });
            this.hud?.toast(T.overheatStarts, 'warn', 3);
          } else this.hud?.toast(T.overheatEnds, '', 2);
        } else if (ev.kind === 'form') {
          if (ev.on) {
            sfx.play('upgrade', { pitch: 0.7 });
            this.hud?.toast(T.formArrives, 'warn', 3);
          } else if (!g.hazardSolved.includes(this.me)) this.hud?.toast(T.formTimeout, '', 2.5);
        } else if (ev.kind === 'blinds') {
          if (!ev.on) this.hud?.toast(T.blindsUp, '', 2);
        } else if (ev.kind === 'firealarm') {
          if (ev.on) {
            sfx.play('alarm');
            this.hud?.toast(T.alarmStarts, 'warn', 3);
          }
        } else if (ev.kind === 'phone') {
          if (ev.on) {
            sfx.play('phone');
            this.hud?.toast(T.phoneRings, 'warn', 3);
          }
        } else if (ev.kind === 'nointernet') {
          if (ev.on) {
            sfx.play('bossphase', { pitch: 0.8, gain: 0.6 });
            this.hud?.toast(T.netStarts, 'warn', 3.5);
          } else if (!g.hazardSolved.includes(this.me)) this.hud?.toast(T.netTimeout, '', 2.5);
        } else if (ev.on) {
          sfx.play('bossphase', { pitch: 1.3, gain: 0.7 });
          this.hud?.toast(T.projStarts, 'warn', 3);
          if (this.placing) this.placing = null;
        } else if (!g.hazardSolved.includes(this.me)) {
          this.hud?.toast(T.projTimeout, '', 2.5);
        }
        break;
      case 'puff':
        sfx.play('mop', { pitch: 0.5, gain: 0.4 });
        break;
      case 'gate':
        sfx.play('gate');
        break;
      case 'cry':
        sfx.play('cry');
        this.toastOnce('cry', T.babyCries, 15);
        break;
      case 'smash':
        sfx.play('smash');
        break;
      case 'chairRoll':
        sfx.play('roll', { gain: 0.8 });
        break;
      case 'tacks':
        sfx.play('tacks');
        break;
      case 'swept':
        sfx.play('mop', { pitch: 1.2, gain: 0.6 });
        this.toastOnce('swept', T.tackSwept, 12);
        break;
      case 'mopped':
        sfx.play('mop');
        this.toastOnce('mopped', T.zoneMopped, 12);
        break;
      case 'phone':
        if (ev.hung) sfx.play('cash');
        this.hud?.toast(ev.hung ? T.phoneHung : T.phoneStuck, ev.hung ? '' : 'warn', 2.5);
        break;
      case 'boxes':
        if (ev.player === this.me) {
          sfx.play('place', { pitch: 0.7 });
          this.hud?.toast(T.boxesCleared, '', 2);
        }
        break;
      case 'audit': {
        const name = TOWERS[ev.defId]?.name ?? ev.defId;
        sfx.play('bossphase', { pitch: 1.2, gain: 0.6 });
        this.hud?.toast(T.auditStarts.replace('{t}', `${name}s`), 'warn', 3);
        break;
      }
      case 'reviewer':
        sfx.play('boss', { gain: 0.7 });
        this.hud?.toast(T.reviewerArrives.replace('{name}', COLLEAGUES[ev.type]?.name ?? ev.type), 'warn', 3);
        break;
      case 'pizza':
        if (ev.player === this.me) {
          sfx.play('cash');
          this.hud?.toast(T.pizzaTaken.replace('{n}', String(ev.bonus)), 'good', 2.5);
        }
        break;
      case 'collapse':
        sfx.play('bossphase', { pitch: 0.7 });
        this.hud?.toast(T.consultantGone, 'good', 3);
        break;
      case 'reserved':
        if (!this.toldReserved) {
          this.toldReserved = true;
          this.hud?.toast(T.reservedDesks, '', 3);
        }
        break;
      case 'lob':
        sfx.play('tick', { gain: 0.6 });
        break;
      case 'boom':
        sfx.play('splat', { gain: 0.7 });
        break;
      case 'hazardWarn':
        if (ev.kind === 'blinds') {
          sfx.play('blinds');
          this.hud?.toast(T.blindsWarn, 'warn', 3);
        } else {
          sfx.play('projector');
          this.hud?.toast(T.projWarn, 'warn', 3);
        }
        break;
      case 'hazardSolved':
        {
          const net = g.level.hazard?.type === 'nointernet';
          if (ev.player === this.me) {
            sfx.play('upgrade', { pitch: 1.2 });
            const form = g.level.hazard?.type === 'form';
            this.hud?.toast(form ? T.formDone : (net ? T.netFixed : T.projFixed).replace('{n}', String(ev.bonus)), 'good', 3);
          } else if (this.mp) {
            this.hud?.toast((net ? T.netOtherFixed : T.projOtherFixed).replace('{name}', this.nameOf(ev.player)), '', 2.2);
          }
        }
        break;
      case 'end':
        this.onEnd();
        break;
      default:
        break;
    }
  }

  private lastToast = new Map<string, number>();

  /** A toast that does not repeat for a while, for things that happen over and over. */
  private toastOnce(key: string, text: string, gap: number): void {
    const now = this.game.time;
    if (now - (this.lastToast.get(key) ?? -Infinity) < gap) return;
    this.lastToast.set(key, now);
    this.hud?.toast(text, 'warn', 2.6);
  }

  private nameOf(i: number): string {
    return this.room?.players.find((p) => p.index === i)?.name ?? `Player ${i + 1}`;
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
      // Stars and Recognition belong to your own career: only single player pays them out.
      if (!this.mp) result = completeLevel(save, g.level.id, g.stars, g.focus === g.startFocus);
    } else {
      this.host.sfx.play('lose');
    }
    if (!this.mp && g.level.id === 1 && !save.hintsDone.includes('l1')) {
      save.hintsDone.push('l1');
      store(save);
    }
    const summary = summarize(g, save.playerId, this.realTime, this.speedUse);
    // One report per game: in multiplayer the host sends it.
    if (save.settings.shareStats && this.isHost) void sendRound(summary);
    window.setTimeout(() => this.showEnd(summary, result), g.endReason === 'gaveup' ? 0 : 1300);
  }

  private showEnd(summary: RoundSummary, result: LevelResult | null): void {
    const screen = endScreen(this.game, summary, result, {
      retry: () => this.host.retry(this.game.level.id),
      career: () => this.host.toCareer(),
      tips: this.mp
        ? undefined
        : {
            on: this.host.save.settings.tips,
            set: (on) => {
              this.host.save.settings.tips = on;
              store(this.host.save);
            },
          },
    });
    if (this.mp) {
      // Multiplayer: the host takes everyone back to the lobby; anyone can leave.
      mpEndActions(screen, this.isHost, {
        lobby: () => this.mp!.send({ t: 'lobby' }),
        leave: () => this.host.leaveMp?.(),
      });
    }
    this.setOverlay(screen);
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
    if (this.mp) {
      this.run({ c: 'next' });
      return;
    }
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
    this.host.sfx.play('click');
    if (this.mp) {
      if (!this.isHost) return this.refuse(T.mpHostOnly);
      this.mp.send({ t: 'speed', speed: s });
      return;
    }
    this.speed = s;
  }

  /** The pause button: pauses the game for everyone (host only online), no menu. */
  private pauseButton(): void {
    if (this.mp) {
      if (!this.isHost) return this.refuse(T.mpHostOnly);
      this.mp.send({ t: 'pause', paused: !this.paused });
      return;
    }
    this.togglePause();
  }

  /** The menu (Esc). Offline it pauses the game; online the game keeps running for everyone. */
  private togglePause(): void {
    if (this.ended) return;
    if (this.overlay) {
      this.closeOverlay();
      return;
    }
    if (!this.mp) this.paused = true;
    this.setOverlay(
      pauseOverlay(
        {
          resume: () => this.closeOverlay(),
          settings: () => this.openSettings(true),
          howTo: () => this.setOverlay(textScreen(T.howTo, howToBody(), () => this.togglePauseMenu())),
          giveUp: () =>
            this.setOverlay(
              confirmOverlay(
                this.mp ? T.mpGiveUpConfirm : T.giveUpConfirm,
                T.confirmYes,
                T.confirmNo,
                () => {
                  this.closeOverlay();
                  if (this.mp) this.mp.send({ t: 'giveup' });
                  else this.game.giveUp();
                },
                () => this.togglePauseMenu(),
              ),
            ),
          quit: () => this.quit(),
        },
        { online: this.mp !== null, host: this.isHost },
      ),
    );
  }

  /** Use a Smoke Break from your pocket. Not when you are at full Focus. */
  private smokeBreak(): void {
    const save = this.host.save;
    if (this.mp || save.smokes <= 0 || this.ended) return;
    if (this.game.focus >= this.game.startFocus) return this.refuse(T.smokeFull);
    const got = this.game.takeBreak(SMOKE_FOCUS);
    if (got <= 0) return;
    save.smokes -= 1;
    store(save);
    this.host.sfx.play('coffee', { pitch: 0.8 });
    this.hud?.toast(T.smokeDone.replace('{n}', String(got)), 'good', 2.5);
  }

  /** Back to the career (or out of the online game). The round counts as given up. */
  private quit(): void {
    if (this.mp) {
      this.host.leaveMp?.();
      return;
    }
    if (this.game.waveIndex >= 1 && !this.game.over && this.host.save.settings.shareStats) {
      this.game.giveUp();
      void sendRound(summarize(this.game, this.host.save.playerId, this.realTime, this.speedUse));
    }
    this.host.toCareer();
  }

  /** The house button in the top bar: ask first, a misclick should not end the round. */
  private confirmLeave(): void {
    if (this.ended) return;
    if (!this.mp) this.paused = true;
    this.setOverlay(
      confirmOverlay(this.mp ? T.mpLeaveConfirm : T.goHomeConfirm, this.mp ? T.mpLeave : T.goHome, T.confirmNo, () => this.quit(), () => this.closeOverlay()),
    );
  }

  /** Settings over the running game. Offline the game waits; online it keeps going. */
  private openSettings(fromMenu: boolean): void {
    if (this.ended) return;
    if (!this.mp) this.paused = true;
    this.setOverlay(
      settingsOverlay(this.host.save, {
        change: () => this.host.applySettings(),
        back: () => (fromMenu ? this.togglePauseMenu() : this.closeOverlay()),
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
    if (!this.mp) this.paused = false;
  }

  private target(id: number, mode: TargetMode): void {
    this.run({ c: 'target', id, mode });
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
    on(
      canvas,
      'wheel',
      (e) => {
        e.preventDefault();
        this.host.view.zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
      },
      { passive: false },
    );
    on(window, 'keydown', (e) => this.onKey(e));
    if (!this.mp) {
      // Single player pauses when you switch tabs. Online the others keep playing.
      const onVis = () => {
        if (document.hidden && this.game.phase === 'running' && !this.overlay) this.togglePause();
      };
      document.addEventListener('visibilitychange', onVis);
      this.cleanup.push(() => document.removeEventListener('visibilitychange', onVis));
    }
  }

  private tileAt(px: number, py: number): { tx: number; ty: number } | null {
    // A worktop (Coffee Corner) is higher than the floor: what you point at is its top, not the
    // floor tile behind it. Try the tops first, highest first.
    for (const h of this.surfaces) {
      const q = this.host.view.groundAt(px, py, h);
      if (q && surfaceAt(this.game.level, Math.floor(q.x), Math.floor(q.y)) === h) return { tx: Math.floor(q.x), ty: Math.floor(q.y) };
    }
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
    if (this.aiming !== null) {
      if (!tile) return;
      this.run({ c: 'aim', id: this.aiming, tx: tile.tx, ty: tile.ty });
      this.host.sfx.play('click');
      this.aiming = null;
      return;
    }
    if (this.placing) {
      if (!tile) return;
      const check = this.game.canPlace(this.placing, tile.tx, tile.ty, this.me);
      if (!check.ok) return this.refuse(check.reason);
      this.run({ c: 'place', def: this.placing, tx: tile.tx, ty: tile.ty });
      const cost = check.cost ?? 0;
      if (!e.shiftKey || this.game.walletOf(this.me) - cost < this.game.placeCostFor(this.placing, this.me)) this.placing = null;
      return;
    }
    // Release Night: click the pizza to take it.
    if (tile && this.game.pizza && this.game.pizza.x === tile.tx && this.game.pizza.y === tile.ty) {
      this.run({ c: 'pizza' });
      return;
    }
    // The Merger: click a stack of moving boxes to clear it.
    if (tile && this.game.isBoxes(tile.tx, tile.ty)) {
      this.run({ c: 'clear', tx: tile.tx, ty: tile.ty });
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
      if (this.aiming !== null) this.aiming = null;
      else if (this.placing) this.placing = null;
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
      else if (this.aiming !== null) this.aiming = null;
      else if (this.placing) this.placing = null;
      else if (this.selected !== null) this.select(null);
      else this.togglePause();
      e.preventDefault();
      return;
    }
    if (this.overlay) return;
    if (k === ' ' && this.hud?.cardWaiting) {
      e.preventDefault();
      this.hud.closeCard();
      return;
    }
    if (k === ' ' && this.qte?.wantsSpace) return;
    if (k === ' ') {
      this.startOrNext();
      e.preventDefault();
    } else if (k === 'p' || k === 'P') {
      this.pauseButton();
    } else if (k === 'f' || k === 'F') {
      this.setSpeed(SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length]);
    } else if (k === ',' || k === '.' || k === '/') {
      // The Bloons keys for the three upgrade paths.
      if (this.selected !== null) this.run({ c: 'upgrade', id: this.selected, path: [',', '.', '/'].indexOf(k) });
      e.preventDefault();
    } else if (k === 'c' || k === 'C') {
      // A selected machine claims its pot; otherwise an Offshore Account claims them all.
      const id = this.selected ?? this.game.claimAllTower(this.me)?.id ?? null;
      if (id !== null) this.run({ c: 'claim', id });
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
    this.world.showBuildGrid(this.placing);
    if (this.placing && this.hover) {
      const def = TOWERS[this.placing];
      const check = g.canPlace(this.placing, this.hover.tx, this.hover.ty, this.me);
      const placeable = check.ok || check.reason === 'Not enough Coffee.';
      const chair = def.role === 'chair';
      const range = def.role === 'economy' || def.base.global || chair ? 0 : def.base.range;
      this.actors.showGhost(def.models[0], this.hover.tx, this.hover.ty, check.ok, range, surfaceAt(this.game.level, this.hover.tx, this.hover.ty), raiseAt(this.game.level, this.hover.tx, this.hover.ty));
      if (!placeable && range > 0) this.actors.showRange(this.hover.tx + 0.5, this.hover.ty + 0.5, range, '#e5534b');
      if (needsSight(def)) this.actors.showBlind(g, this.hover.tx + 0.5, this.hover.ty + 0.5, def.base.global ? Infinity : def.base.range);
      else this.actors.showBlind(null);
      if (chair) {
        // The lane it would take; turn it afterwards with the arrows.
        const lane = g.chairLaneAt(this.placing, this.hover.tx, this.hover.ty);
        const d = CHAIR_DIRS[lane.dir];
        this.actors.showLane(this.hover.tx + 0.5, this.hover.ty + 0.5, d.x, d.y, lane.length, placeable ? '#ffffff' : '#e5534b');
      } else this.actors.showLane(null, 0, 0, 0, 0);
      return;
    }
    this.actors.showGhost(null, 0, 0, false, 0);
    this.actors.showBlind(null);
    // Pomodoro Timer: where it lobs (or, while picking, where it would).
    const aimer = this.aiming !== null ? g.tower(this.aiming) : this.selected !== null ? g.tower(this.selected) : undefined;
    if (aimer && aimer.def.role === 'mortar') {
      const r = g.liveStats(aimer).aoe;
      if (this.aiming !== null && this.hover) this.actors.showAim(this.hover.tx + 0.5, this.hover.ty + 0.5, r);
      else this.actors.showAim(aimer.aimX, aimer.aimY, r);
    } else this.actors.showAim(null);
    const sel = this.selected !== null ? g.tower(this.selected) : undefined;
    const hov = this.hover ? g.towerAt(this.hover.tx, this.hover.ty) : undefined;
    const t = sel ?? hov;
    const tipRange = t && t.def.role === 'economy' && g.liveStats(t).tip > 0;
    if (t && t.def.role === 'chair') {
      const d = CHAIR_DIRS[t.dir];
      this.actors.showLane(t.x, t.y, d.x, d.y, g.laneLength(t, g.liveStats(t).range));
      this.actors.showRange(null, 0, 0);
      return;
    }
    this.actors.showLane(null, 0, 0, 0, 0);
    if (t && needsSight(t.def)) this.actors.showBlind(g, t.x, t.y, g.liveStats(t).range);
    if (t && (t.def.role !== 'economy' || tipRange)) this.actors.showRange(t.x, t.y, g.liveStats(t).range, tipRange ? '#6fcf7f' : '#ffffff');
    else this.actors.showRange(null, 0, 0);
  }

  dispose(): void {
    this.host.sfx.setTyping(false, 0);
    this.cleanup.forEach((f) => f());
    this.ro?.disconnect();
    this.root.remove();
    this.popups.clear();
    this.actors.clear();
    this.host.view.scene.remove(this.world.group, this.actors.group);
    this.world.dispose();
  }
}
