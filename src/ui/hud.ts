// The in-game HUD: top bar, shop, tower panel, colleagues on the floor, boss bar, messages.
// Built once, then updated in place every frame (only changed text is written).

import { COLLEAGUES, type ColleagueDef } from '../sim/data/colleagues';
import { SIDE_PATHS, TARGET_HELP, TARGET_LABELS, TARGET_MODES, TOWERS, UPCOMING_TOWERS, type SidePath, type TargetMode } from '../sim/data/towers';
import { earlyCallPoints } from '../sim/economy';
import type { Game, Tower } from '../sim/game';
import type { Insets } from '../render/view';
import { fmt, h, icon, img, setText, toggle } from './dom';
import { UI_TEXT as T } from './text';

export interface HudActions {
  pick(defId: string | null): void;
  startOrNext(): void;
  setSpeed(s: number): void;
  togglePause(): void;
  upgrade(id: number): void;
  side(id: number, path: SidePath): void;
  sell(id: number): void;
  target(id: number, mode: TargetMode): void;
  deselect(): void;
}

export interface HudState {
  selected: number | null;
  placing: string | null;
  speed: number;
  paused: boolean;
}

export const SPEEDS = [1, 2, 4, 8];

interface ShopEntry {
  defId: string;
  el: HTMLButtonElement;
  cost: HTMLElement;
}

export class Hud {
  readonly root: HTMLElement;
  private readonly game: Game;
  private readonly act: HudActions;

  private focusStat!: HTMLElement;
  private focusV!: HTMLElement;
  private coffeeV!: HTMLElement;
  private waveV!: HTMLElement;
  private waveTimer!: HTMLElement;
  private hintEl: HTMLElement | null = null;
  private scoreV!: HTMLElement;
  private startBtn!: HTMLButtonElement;
  private startLabel!: HTMLElement;
  private speedBtns: HTMLButtonElement[] = [];
  private pauseBtn!: HTMLButtonElement;
  private shop: ShopEntry[] = [];
  private towerPanel!: HTMLElement;
  private towerKey = '';
  private towerDyn: (() => void) | null = null;
  private colleagueList!: HTMLElement;
  private colleagueRows = new Map<string, { row: HTMLElement; count: HTMLElement }>();
  private infoCard!: HTMLElement;
  private infoTimer = 0;
  private nextWave!: HTMLElement;
  private bossBar!: HTMLElement;
  private bossFill!: HTMLElement;
  private bossName!: HTMLElement;
  private bossPhase!: HTMLElement;
  private toasts!: HTMLElement;
  private vignette!: HTMLElement;
  private left!: HTMLElement;
  private right!: HTMLElement;
  private topbar!: HTMLElement;
  private lastFocus = -1;
  readonly newBadges = new Set<string>();

  constructor(game: Game, act: HudActions) {
    this.game = game;
    this.act = act;
    this.root = h('div', { class: 'hud' });
    this.buildTop();
    this.buildLeft();
    this.buildCenter();
    this.buildRight();
    this.vignette = h('div', { class: 'vignette' });
    this.root.append(this.vignette);
  }

  // ------------------------------------------------------------------ build

  private buildTop(): void {
    const stat = (cls: string, ic: string, label: string) => {
      const v = h('span', { class: 'v', text: '0' });
      const k = h('span', { class: 'k', text: label });
      const el = h('div', { class: `stat ${cls}`, title: label }, icon(ic), v, k);
      return { el, v, k };
    };
    const f = stat('focus', 'brain', T.focus);
    const c = stat('coffee', 'mug-hot', T.coffee);
    const w = stat('wave', 'people-group', T.wave);
    const s = stat('score', 'star', T.score);
    this.focusStat = f.el;
    this.focusV = f.v;
    this.coffeeV = c.v;
    this.waveV = w.v;
    this.waveTimer = h('span', { class: 'timer' });
    w.el.append(this.waveTimer);
    this.scoreV = s.v;

    this.startLabel = h('span', { text: T.start });
    this.startBtn = h('button', { class: 'btn primary', title: T.nextWaveHelp, on: { click: () => this.act.startOrNext() } }, icon('play'), this.startLabel);
    const speeds = h('div', { class: 'speed-group', attrs: { role: 'group', 'aria-label': T.speed } });
    for (const sp of SPEEDS) {
      const b = h('button', { class: 'btn small', text: `${sp}x`, title: `${T.speed} ${sp}x`, on: { click: () => this.act.setSpeed(sp) } });
      this.speedBtns.push(b);
      speeds.append(b);
    }
    this.pauseBtn = h('button', { class: 'btn small', title: `${T.pause} (P)`, on: { click: () => this.act.togglePause() } }, icon('pause'));
    this.topbar = h('div', { class: 'topbar panel' }, f.el, c.el, w.el, s.el, h('div', { class: 'spacer' }), this.startBtn, speeds, this.pauseBtn);
    this.root.append(this.topbar);
  }

  private buildLeft(): void {
    this.colleagueList = h('div', { class: 'colleague-list' });
    this.nextWave = h('div', { class: 'next-wave' });
    const floor = h(
      'div',
      { class: 'section panel scroll' },
      h('div', { class: 'section-head' }, h('span', { class: 'label', text: T.onFloor })),
      this.colleagueList,
      this.nextWave,
    );
    this.infoCard = h('div', { class: 'info-card panel' });
    this.infoCard.hidden = true;
    this.left = h('div', { class: 'left' }, floor, this.infoCard);
    this.root.append(this.left);
  }

  private buildCenter(): void {
    this.bossName = h('span', { class: 'name' });
    this.bossPhase = h('span', { class: 'muted' });
    this.bossFill = h('div', { class: 'fill' });
    const track = h('div', { class: 'track' }, this.bossFill, h('div', { class: 'mark', attrs: { style: 'left:66%' } }), h('div', { class: 'mark', attrs: { style: 'left:33%' } }));
    this.bossBar = h('div', { class: 'boss-bar panel' }, h('div', { class: 'row' }, this.bossName, this.bossPhase), track);
    this.bossBar.hidden = true;
    this.toasts = h('div', { class: 'toasts', attrs: { role: 'status', 'aria-live': 'polite' } });
    this.root.append(h('div', { class: 'center' }, this.bossBar, this.toasts));
  }

  private buildRight(): void {
    const grid = h('div', { class: 'shop-grid' });
    let key = 1;
    for (const defId of this.game.level.towers) {
      const def = TOWERS[defId];
      const cost = h('span', { class: 'cost' });
      const el = h(
        'button',
        { class: 'shop-item', title: def.verb, on: { click: () => this.act.pick(defId) } },
        h('span', { class: 'hotkey', text: String(key++) }),
        img(`icons/${def.models[0]}.png`, def.name),
        h('span', { class: 'name', text: def.name }),
        cost,
      );
      this.shop.push({ defId, el, cost });
      grid.append(el);
    }
    const later = h('ul', { class: 'later' });
    for (const up of UPCOMING_TOWERS) {
      later.append(h('li', { title: `${up.name}: ${T.lockedAt} ${up.unlockLevel}` }, icon('lock'), h('span', { class: 'n', text: up.name }), h('span', { class: 'l', text: `L${up.unlockLevel}` })));
    }
    const shop = h(
      'div',
      { class: 'section panel scroll shop' },
      h('div', { class: 'section-head' }, h('span', { class: 'label', text: T.shop })),
      h('div', { class: 'faint', attrs: { style: 'font-size:12px' }, text: T.shopHint }),
      grid,
      h('div', { class: 'label', attrs: { style: 'margin-top:4px' }, text: T.comingLater }),
      later,
    );
    this.towerPanel = h('div', { class: 'tower-panel panel' });
    this.towerPanel.hidden = true;
    this.right = h('div', { class: 'right' }, this.towerPanel, shop);
    this.root.append(this.right);
  }

  // ------------------------------------------------------------------ per frame

  update(st: HudState): void {
    const g = this.game;
    setText(this.focusV, String(g.focus));
    if (this.lastFocus >= 0 && g.focus < this.lastFocus) {
      this.focusStat.classList.remove('flash');
      void this.focusStat.offsetWidth;
      this.focusStat.classList.add('flash');
    }
    this.lastFocus = g.focus;
    toggle(this.focusStat, 'low', g.focus <= g.startFocus * 0.25);
    setText(this.coffeeV, String(Math.floor(g.coffee)));
    setText(this.waveV, `${g.waveIndex}/${g.totalWaves}`);
    setText(this.waveTimer, g.phase === 'running' && g.waveIndex < g.totalWaves ? `next in ${Math.max(0, Math.ceil(g.nextWaveTimer))}s` : '');
    setText(this.scoreV, String(g.score));

    if (g.phase === 'plan') {
      setText(this.startLabel, `${T.start}`);
      this.startBtn.disabled = false;
    } else {
      const pts = earlyCallPoints(g.nextWaveTimer);
      setText(this.startLabel, g.waveIndex < g.totalWaves ? `${T.nextWave} +${pts}` : T.nextWave);
      this.startBtn.disabled = g.over || g.waveIndex >= g.totalWaves;
    }
    this.speedBtns.forEach((b, i) => toggle(b, 'active', SPEEDS[i] === st.speed));
    toggle(this.pauseBtn, 'active', st.paused);

    for (const s of this.shop) {
      const cost = g.placeCostFor(s.defId);
      setText(s.cost, String(cost));
      toggle(s.el, 'broke', g.coffee < cost);
      toggle(s.el, 'selected', st.placing === s.defId);
    }

    this.updateColleagues();
    this.updateTowerPanel(st.selected);
    this.updateBoss();
    if (this.infoTimer > 0) {
      this.infoTimer -= 1 / 60;
      if (this.infoTimer <= 0) this.infoCard.hidden = true;
    }
  }

  private updateColleagues(): void {
    const counts = new Map<string, number>();
    for (const e of this.game.enemies) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    for (const [type, n] of counts) {
      let row = this.colleagueRows.get(type);
      if (!row) {
        const def = COLLEAGUES[type];
        const count = h('span', { class: 'count' });
        const name = h('span', { class: 'name', text: def.name.replace(/^The /, '') });
        if (this.newBadges.has(type)) name.append(h('span', { class: 'badge', text: T.newBadge }));
        const el = h('button', { class: 'colleague-row', title: def.ability, on: { click: () => this.showColleague(def, 0) } }, img(`icons/${def.model}.png`, def.name), name, count);
        row = { row: el, count };
        this.colleagueRows.set(type, row);
        this.colleagueList.append(el);
      }
      setText(row.count, String(n));
    }
    for (const [type, row] of this.colleagueRows) {
      if (!counts.has(type)) {
        row.row.remove();
        this.colleagueRows.delete(type);
      }
    }
    if (this.colleagueRows.size === 0 && !this.colleagueList.querySelector('.faint')) {
      this.colleagueList.append(h('div', { class: 'faint', attrs: { style: 'font-size:12px' }, text: T.nobodyYet }));
    } else if (this.colleagueRows.size > 0) {
      this.colleagueList.querySelector('.faint')?.remove();
    }
    const g = this.game;
    if (g.waveIndex < g.totalWaves) {
      const groups = g.waves[g.waveIndex];
      const merged = new Map<string, number>();
      for (const gr of groups) merged.set(gr.type, (merged.get(gr.type) ?? 0) + gr.count);
      const text = [...merged].map(([t, n]) => `${n} ${COLLEAGUES[t].name.replace(/^The /, '')}`).join(', ');
      setText(this.nextWave, `Wave ${g.waveIndex + 1}: ${text}`);
    } else {
      setText(this.nextWave, '');
    }
  }

  /** Show who a colleague is and what beats him. seconds = 0 keeps it open until replaced. */
  showColleague(def: ColleagueDef, seconds: number, isNew = false): void {
    this.infoCard.replaceChildren(
      h('div', { class: 'section-head' }, h('span', { class: 'label', text: isNew ? T.newColleague : def.role }), h('button', { class: 'icon-btn', title: 'Close', on: { click: () => (this.infoCard.hidden = true) } }, icon('xmark'))),
      h('div', { class: 'tp-head', attrs: { style: 'grid-template-columns: 52px minmax(0,1fr)' } }, img(`icons/${def.model}.png`, def.name), h('div', {}, h('div', { class: 'tp-name', text: def.name }), h('div', { class: 'quote wrap', text: `"${def.quote}"` }))),
      h('div', { class: 'wrap', attrs: { style: 'font-size:13px' }, text: def.ability }),
      h('div', { class: 'counter wrap', attrs: { style: 'font-size:13px' }, text: def.counter }),
      h(
        'div',
        { class: 'kv' },
        h('span', { class: 'k', text: 'HP' }),
        h('span', { class: 'v', text: String(def.hp + (def.shield ?? 0)) }),
        h('span', { class: 'k', text: 'Speed' }),
        h('span', { class: 'v', text: def.speed.toFixed(1) }),
        h('span', { class: 'k', text: 'Focus if he reaches you' }),
        h('span', { class: 'v', text: String(def.focus) }),
      ),
    );
    this.infoCard.hidden = false;
    this.infoTimer = seconds;
  }

  private updateTowerPanel(id: number | null): void {
    const t = id !== null ? this.game.tower(id) : undefined;
    if (!t) {
      if (!this.towerPanel.hidden) {
        this.towerPanel.hidden = true;
        this.towerKey = '';
        this.towerDyn = null;
      }
      return;
    }
    const key = `${t.id}:${t.level}:${t.side}:${t.sideStep}:${t.target}`;
    if (key !== this.towerKey) {
      this.towerKey = key;
      this.buildTowerPanel(t);
    }
    this.towerPanel.hidden = false;
    this.towerDyn?.();
  }

  private buildTowerPanel(t: Tower): void {
    const g = this.game;
    const def = t.def;
    const lv = def.levels[t.level - 1];
    const s = g.liveStats(t);
    const pips = h('div', { class: 'level-pips', title: `Level ${t.level} of 3` }, ...[1, 2, 3].map((i) => h('span', { class: i <= t.level ? 'on' : '' })));
    const head = h(
      'div',
      { class: 'tp-head' },
      img(`icons/${def.models[t.level - 1]}.png`, lv.name),
      h('div', {}, h('div', { class: 'tp-name wrap', text: lv.name }), h('div', { class: 'tp-flavour wrap', text: `"${lv.flavour}"` }), pips),
      h('button', { class: 'icon-btn', title: 'Close (Esc)', on: { click: () => this.act.deselect() } }, icon('xmark')),
    );
    const parts: HTMLElement[] = [head, h('div', { class: 'wrap muted', attrs: { style: 'font-size:12px' }, text: def.verb })];

    const stats = h('div', { class: 'kv' });
    const dyn: (() => void)[] = [];
    if (def.role === 'damage') {
      stats.append(
        h('span', { class: 'k', text: T.damage }),
        h('span', { class: 'v', text: fmt(s.damage, 1) }),
        h('span', { class: 'k', text: T.rate }),
        h('span', { class: 'v', text: fmt(1 / s.interval, 2) }),
        h('span', { class: 'k', text: T.range }),
        h('span', { class: 'v', text: fmt(s.range, 2) }),
        h('span', { class: 'k', text: T.targets }),
        h('span', { class: 'v', text: String(s.targets) }),
      );
      const dealt = h('span', { class: 'v' });
      const kills = h('span', { class: 'v' });
      const per = h('span', { class: 'v' });
      stats.append(h('span', { class: 'k', text: T.damageDealt }), dealt, h('span', { class: 'k', text: T.kills }), kills, h('span', { class: 'k', text: T.perCoffee }), per);
      dyn.push(() => {
        setText(dealt, String(Math.round(t.stats.damage)));
        setText(kills, String(t.stats.kills));
        setText(per, fmt(t.stats.damage / Math.max(1, t.invested), 1));
      });
    } else {
      stats.append(h('span', { class: 'k', text: 'Makes' }), h('span', { class: 'v', text: `${s.coffeeAmount} per ${s.coffeeInterval}s` }));
      const made = h('span', { class: 'v' });
      stats.append(h('span', { class: 'k', text: T.coffeeMade }), made);
      dyn.push(() => setText(made, String(t.stats.coffee)));
    }
    parts.push(stats);

    // Upgrade
    if (t.level < 3) {
      const next = def.levels[t.level as 1 | 2];
      const cost = g.upgradeCostFor(t)!;
      const preview = def.role === 'damage' ? `${fmt(next.damage!, 1)} dmg, ${fmt(1 / next.interval!, 2)}/s, range ${fmt(next.range!, 2)}` : `${next.coffeeAmount} Coffee per ${next.coffeeInterval}s`;
      const btn = h(
        'button',
        { class: 'btn upgrade-btn', title: 'Upgrade (U)', on: { click: () => this.act.upgrade(t.id) } },
        h('span', { class: 'row' }, h('span', {}, icon('arrow-up'), ` ${T.upgrade}: ${next.name}`), h('span', { class: 'price', text: String(cost) })),
        h('span', { class: 'faint wrap', attrs: { style: 'font-size:12px' }, text: preview }),
      );
      dyn.push(() => {
        const ok = g.canUpgrade(t).ok;
        btn.disabled = !ok;
        toggle(btn, 'broke', g.coffee < cost);
      });
      parts.push(btn);
    } else {
      parts.push(h('div', { class: 'muted', attrs: { style: 'font-size:12px' } }, icon('check'), ` ${T.maxed}`));
    }

    // Side paths
    if (def.sidePaths) {
      const wrap = h('div', { class: 'side-paths' });
      for (const path of ['overtime', 'escalation'] as SidePath[]) {
        const info = SIDE_PATHS[path];
        const locked = t.side !== null && t.side !== path;
        const steps = t.side === path ? t.sideStep : 0;
        const box = h(
          'div',
          { class: `side${locked ? ' locked' : ''}` },
          h('span', { class: 'side-name', text: info.label }),
          h('span', { class: 'quote wrap', text: `"${info.quote}"` }),
          h('div', { class: 'pips' }, h('span', { class: `pip${steps >= 1 ? ' on' : ''}` }), h('span', { class: `pip${steps >= 2 ? ' on' : ''}` })),
        );
        if (!locked && steps < 2) {
          const cost = g.sideCostFor(t, path)!;
          const b = h(
            'button',
            { class: 'btn small', title: info.steps[steps as 0 | 1], on: { click: () => this.act.side(t.id, path) } },
            h('span', { class: 'wrap', text: info.steps[steps as 0 | 1] }),
            h('span', { class: 'price', text: String(cost) }),
          );
          dyn.push(() => {
            b.disabled = !g.canBuySide(t, path).ok;
            toggle(b, 'broke', g.coffee < cost);
          });
          box.append(b);
        } else {
          box.append(h('span', { class: 'faint', attrs: { style: 'font-size:11px' }, text: locked ? T.locked : 'Done' }));
        }
        wrap.append(box);
      }
      parts.push(h('div', { class: 'label', text: 'Side paths' }), h('div', { class: 'faint', attrs: { style: 'font-size:11px' }, text: T.chooseOne }), wrap);
    }

    // Targeting
    if (def.role === 'damage') {
      const tg = h('div', { class: 'targets', attrs: { role: 'group', 'aria-label': T.targeting } });
      for (const mode of TARGET_MODES) {
        tg.append(h('button', { class: `btn${t.target === mode ? ' active' : ''}`, text: TARGET_LABELS[mode], title: TARGET_HELP[mode], on: { click: () => this.act.target(t.id, mode) } }));
      }
      parts.push(h('div', { class: 'label', text: T.targeting }), tg);
    }

    // Sell
    const sellLabel = h('span');
    const sell = h('button', { class: 'btn danger small', on: { click: () => this.act.sell(t.id) } }, icon('recycle'), sellLabel);
    dyn.push(() => setText(sellLabel, ` ${T.sell} (+${g.sellValueFor(t)})`));
    parts.push(sell);

    this.towerPanel.replaceChildren(...parts);
    this.towerDyn = () => dyn.forEach((f) => f());
  }

  private updateBoss(): void {
    const boss = this.game.enemies.find((e) => e.def.boss);
    if (!boss) {
      this.bossBar.hidden = true;
      return;
    }
    this.bossBar.hidden = false;
    setText(this.bossName, boss.def.name.toUpperCase());
    setText(this.bossPhase, `Phase ${boss.phase}/3`);
    this.bossFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100).toFixed(1)}%`;
  }

  // ------------------------------------------------------------------ messages

  toast(text: string, kind: '' | 'warn' | 'bad' | 'good' = '', seconds = 3.2): void {
    const el = h('div', { class: `toast panel ${kind}`, text });
    this.toasts.prepend(el);
    while (this.toasts.children.length > 4) this.toasts.lastElementChild?.remove();
    window.setTimeout(() => el.classList.add('out'), seconds * 1000);
    window.setTimeout(() => el.remove(), seconds * 1000 + 450);
  }

  /** Tutorial-style hint. Only one at a time: a new hint replaces the old one. */
  hint(text: string, seconds = 8): void {
    this.hintEl?.remove();
    const el = h('div', { class: 'toast panel hint' }, icon('lightbulb'), h('span', { text: ` ${text}` }));
    this.hintEl = el;
    this.toasts.append(el);
    window.setTimeout(() => el.classList.add('out'), seconds * 1000);
    window.setTimeout(() => {
      el.remove();
      if (this.hintEl === el) this.hintEl = null;
    }, seconds * 1000 + 450);
  }

  clearHint(): void {
    this.hintEl?.remove();
    this.hintEl = null;
  }

  banner(big: string, small: string): void {
    const el = h('div', { class: 'banner' }, h('div', { class: 'big', text: big }), h('div', { class: 'small', text: small }));
    this.root.append(el);
    window.setTimeout(() => el.remove(), 2900);
  }

  hurt(): void {
    this.vignette.classList.add('hit');
    window.setTimeout(() => this.vignette.classList.remove('hit'), 140);
  }

  /** Free screen area for the camera fit, measured from the real panels. */
  insets(): Insets {
    const W = window.innerWidth;
    const top = this.topbar.getBoundingClientRect();
    const left = this.left.getBoundingClientRect();
    const right = this.right.getBoundingClientRect();
    const leftVisible = getComputedStyle(this.left).display !== 'none' && left.width > 0;
    return {
      top: top.bottom,
      left: leftVisible ? left.right : 0,
      right: right.width > 0 ? W - right.left : 0,
      bottom: 0,
    };
  }

  observe(cb: () => void): ResizeObserver {
    const ro = new ResizeObserver(cb);
    ro.observe(this.topbar);
    ro.observe(this.left);
    ro.observe(this.right);
    return ro;
  }
}
