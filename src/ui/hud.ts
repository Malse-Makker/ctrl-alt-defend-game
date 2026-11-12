// The in-game HUD: top bar, shop, tower panel, colleagues on the floor, boss bar, messages.
// Built once, then updated in place every frame (only changed text is written).

import { COLLEAGUES, type ColleagueDef } from '../sim/data/colleagues';
import {
  MAX_TIER,
  TARGET_HELP,
  TARGET_LABELS,
  TARGET_MODES,
  TOWERS,
  TRAP_TARGET_HELP,
  TRAP_TARGET_LABELS,
  TRAP_TARGET_MODES,
  UPCOMING_TOWERS,
  modelFor,
  pathBlock,
  type DamageClass,
  type TargetMode,
} from '../sim/data/towers';
import { earlyCallPoints } from '../sim/economy';
import type { Game, LiveTowerStats, Tower } from '../sim/game';
import type { Insets } from '../render/view';
import { fmt, h, icon, img, setText, toggle } from './dom';
import { UI_TEXT as T } from './text';

export interface HudActions {
  pick(defId: string | null): void;
  startOrNext(): void;
  setSpeed(s: number): void;
  togglePause(): void;
  upgrade(id: number, path: number): void;
  claim(id: number): void;
  sell(id: number): void;
  target(id: number, mode: TargetMode): void;
  deselect(): void;
  gift(to: number, amount: number): void;
  settings(): void;
  leave(): void;
  dir(id: number, dir: number): void;
  smoke(): void;
}

export interface MpPlayer {
  index: number;
  name: string;
  connected: boolean;
  color: string;
}

export interface HudState {
  selected: number | null;
  placing: string | null;
  speed: number;
  paused: boolean;
  /** Multiplayer: the other players, and whether you are the host. Null in single player. */
  mp: { players: MpPlayer[]; host: number } | null;
  /** Smoke Breaks in your pocket (single player only; null hides the button). */
  smokes: number | null;
}

export const SPEEDS = [1, 2, 4, 8];

/** The heaviest shield in the game: a hit has to be at least this hard to get through it. */
const SHIELD_MIN_HIT = Math.max(...Object.values(COLLEAGUES).map((c) => c.shieldMinHit ?? 0));

/** One line for the tower panel: can this tower hurt a shielded colleague? */
function shieldLine(s: LiveTowerStats): { text: string; ok: boolean; help: string } {
  const help = `A shield stops every hit under ${SHIELD_MIN_HIT} damage.`;
  if (s.ignoresMinHit || s.damage >= SHIELD_MIN_HIT) return { text: 'breaks through', ok: true, help };
  if (s.rampMax > 0 && s.damage * s.rampMax >= SHIELD_MIN_HIT) return { text: 'once built up', ok: true, help };
  return { text: 'bounces off', ok: false, help };
}

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
  private coffeeStat!: HTMLElement;
  private claimAllBtn!: HTMLButtonElement;
  private smokeBtn!: HTMLButtonElement;
  private smokeLabel!: HTMLElement;
  private claimAllLabel!: HTMLElement;
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

  /** Which player this screen belongs to (always 0 in single player). */
  private readonly me: number;
  private playersBox!: HTMLElement;
  private playersList!: HTMLElement;
  private playersKey = '';
  private walletEls = new Map<number, HTMLElement>();

  constructor(game: Game, act: HudActions, me = 0) {
    this.game = game;
    this.act = act;
    this.me = me;
    this.root = h('div', { class: 'hud' });
    this.buildTop();
    this.buildLeft();
    this.buildCenter();
    this.buildRight();
    this.vignette = h('div', { class: 'vignette' });
    this.root.append(this.vignette);
  }

  /** The Claim all button: claim through your Offshore Account. */
  private claimAll(): void {
    const t = this.game.claimAllTower(this.me);
    if (t) this.act.claim(t.id);
  }

  // ------------------------------------------------------------------ build

  private buildTop(): void {
    const stat = (cls: string, ic: string, label: string) => {
      const v = h('span', { class: 'v', text: '0' });
      const k = h('span', { class: 'k', text: label });
      const el = h('div', { class: `stat ${cls}`, title: label }, icon(ic), v, k);
      return { el, v, k };
    };
    // Which floor you are on: the number and the name, the intro as a tooltip.
    const lvl = h(
      'div',
      { class: 'stat level', title: this.game.level.intro },
      icon('building'),
      h('span', { class: 'v', text: `L${this.game.level.id}` }),
      h('span', { class: 'k', text: this.game.level.name }),
    );
    const f = stat('focus', 'brain', T.focus);
    const c = stat('coffee', 'mug-hot', T.coffee);
    const w = stat('wave', 'people-group', T.wave);
    const s = stat('score', 'star', T.score);
    this.focusStat = f.el;
    this.coffeeStat = c.el;
    this.focusV = f.v;
    this.coffeeV = c.v;
    this.waveV = w.v;
    this.waveTimer = h('span', { class: 'timer' });
    w.el.append(this.waveTimer);
    this.scoreV = s.v;
    // Shows up once you own an Offshore Account: one click empties every pot of yours.
    this.claimAllLabel = h('span');
    this.claimAllBtn = h('button', { class: 'btn small claim-all', title: T.claimAllHelp, on: { click: () => this.claimAll() } }, icon('sack-dollar'), this.claimAllLabel);
    this.claimAllBtn.hidden = true;
    this.smokeLabel = h('span');
    this.smokeBtn = h('button', { class: 'btn small smoke', title: T.smokeHelp, on: { click: () => this.act.smoke() } }, icon('smoking'), this.smokeLabel);
    this.smokeBtn.hidden = true;

    this.startLabel = h('span', { text: T.start });
    this.startBtn = h('button', { class: 'btn primary', title: T.nextWaveHelp, on: { click: () => this.act.startOrNext() } }, icon('play'), this.startLabel);
    const speeds = h('div', { class: 'speed-group', attrs: { role: 'group', 'aria-label': T.speed } });
    for (const sp of SPEEDS) {
      const b = h('button', { class: 'btn small', text: `${sp}x`, title: `${T.speed} ${sp}x`, on: { click: () => this.act.setSpeed(sp) } });
      this.speedBtns.push(b);
      speeds.append(b);
    }
    this.pauseBtn = h('button', { class: 'btn small', title: `${T.pause} (P)`, on: { click: () => this.act.togglePause() } }, icon('pause'));
    const settingsBtn = h('button', { class: 'btn small', title: T.settings, attrs: { 'aria-label': T.settings }, on: { click: () => this.act.settings() } }, icon('sliders'));
    const leaveBtn = h('button', { class: 'btn small', title: T.goHome, attrs: { 'aria-label': T.goHome }, on: { click: () => this.act.leave() } }, icon('house'));
    this.topbar = h('div', { class: 'topbar panel' }, lvl, f.el, this.smokeBtn, c.el, this.claimAllBtn, w.el, s.el, h('div', { class: 'spacer' }), this.startBtn, speeds, this.pauseBtn, settingsBtn, leaveBtn);
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
    this.playersList = h('div', { class: 'players-list' });
    this.playersBox = h('div', { class: 'section panel' }, h('div', { class: 'section-head' }, h('span', { class: 'label', text: T.mpPlayers })), this.playersList);
    this.playersBox.hidden = true;
    this.left = h('div', { class: 'left' }, this.playersBox, floor, this.infoCard);
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
        h(
          'span',
          { class: 'tags' },
          def.special ? h('span', { class: 'special', text: T.oneEach, title: T.oneEachHelp }) : null,
          classTag(def.damageClass, false),
        ),
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
    setText(this.coffeeV, String(Math.floor(g.walletOf(this.me))));
    const blocked = g.incomeBlocked;
    toggle(this.coffeeStat, 'blocked', blocked);
    this.coffeeStat.title = blocked ? T.incomeBlocked : T.coffee;
    this.smokeBtn.hidden = !st.smokes;
    if (st.smokes) setText(this.smokeLabel, ` ${T.smoke} (${st.smokes})`);
    const offshore = g.claimAllTower(this.me);
    this.claimAllBtn.hidden = !offshore;
    if (offshore) {
      const total = g.potsOf(this.me);
      setText(this.claimAllLabel, ` ${T.claimAll} ${total}`);
      this.claimAllBtn.disabled = total <= 0;
    }
    setText(this.waveV, `${g.waveIndex}/${g.totalWaves}`);
    setText(this.waveTimer, g.phase === 'running' && g.waveIndex < g.totalWaves ? `next in ${Math.max(0, Math.ceil(g.nextWaveTimer))}s` : '');
    setText(this.scoreV, String(g.score));

    // In multiplayer only the host runs the clock: waves, speed and pause.
    const boss = st.mp === null || st.mp.host === this.me;
    if (g.phase === 'plan') {
      setText(this.startLabel, `${T.start}`);
      this.startBtn.disabled = !boss;
    } else {
      const pts = earlyCallPoints(g.nextWaveTimer);
      setText(this.startLabel, g.waveIndex < g.totalWaves ? `${T.nextWave} +${pts}` : T.nextWave);
      this.startBtn.disabled = !boss || g.over || g.waveIndex >= g.totalWaves;
    }
    this.startBtn.title = boss ? T.nextWaveHelp : T.mpHostOnly;
    this.speedBtns.forEach((b, i) => {
      toggle(b, 'active', SPEEDS[i] === st.speed);
      b.disabled = !boss;
    });
    toggle(this.pauseBtn, 'active', st.paused);
    this.pauseBtn.disabled = st.mp !== null && !boss;

    const wallet = g.walletOf(this.me);
    for (const s of this.shop) {
      const cost = g.placeCostFor(s.defId, this.me);
      const taken = TOWERS[s.defId].special === true && g.towers.some((t) => t.defId === s.defId && t.owner === this.me);
      setText(s.cost, taken ? T.placed : String(cost));
      toggle(s.el, 'broke', taken || wallet < cost);
      toggle(s.el, 'selected', st.placing === s.defId);
    }
    this.updatePlayers(st);

    this.updateColleagues();
    this.updateTowerPanel(st.selected);
    this.updateBoss();
    if (this.infoTimer > 0) {
      this.infoTimer -= 1 / 60;
      if (this.infoTimer <= 0) this.infoCard.hidden = true;
    }
  }

  private updatePlayers(st: HudState): void {
    if (!st.mp) return;
    this.playersBox.hidden = false;
    const g = this.game;
    const key = st.mp.players.map((p) => `${p.index}${p.name}${p.connected}`).join('|') + st.mp.host;
    if (key !== this.playersKey) {
      this.playersKey = key;
      this.walletEls.clear();
      this.playersList.replaceChildren(
        ...st.mp.players.map((p) => {
          const wallet = h('span', { class: 'mono wallet' });
          this.walletEls.set(p.index, wallet);
          const name = h('span', { class: 'name wrap', text: p.name });
          if (p.index === this.me) name.append(h('span', { class: 'faint', text: ' (you)' }));
          if (p.index === st.mp!.host) name.prepend(icon('crown', 'host-crown'), ' ');
          const row = h('div', { class: `player-row${p.connected ? '' : ' offline'}` }, h('span', { class: 'dot', attrs: { style: `background:${p.color}` } }), name, wallet);
          if (!g.sharedWallet && p.index !== this.me && p.index < g.players) {
            row.append(
              h('button', { class: 'btn small gift', title: T.mpGiftHelp, on: { click: (ev) => this.act.gift(p.index, (ev as MouseEvent).shiftKey ? 50 : 10) } }, icon('mug-hot'), h('span', { text: ' +10' })),
            );
          }
          if (!p.connected) row.title = T.mpOffline;
          return row;
        }),
      );
    }
    for (const [i, el] of this.walletEls) setText(el, g.sharedWallet ? '' : i < g.players ? String(Math.floor(g.walletOf(i))) : '-');
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
        h('span', { class: 'v', text: String(def.hp) }),
        def.shield ? h('span', { class: 'k shield-k', text: 'Shield' }) : null,
        def.shield ? h('span', { class: 'v shield-v', text: String(def.shield) }) : null,
        h('span', { class: 'k', text: 'Speed' }),
        h('span', { class: 'v', text: def.speed.toFixed(1) }),
        h('span', { class: 'k', text: 'Focus if he reaches you' }),
        h('span', { class: 'v', text: String(def.focus) }),
      ),
    );
    if (def.shieldMinHit) this.infoCard.append(h('div', { class: 'shield-note wrap', text: `Hits under ${def.shieldMinHit} bounce off the shield. Check "Shields" on your towers.` }));
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
    const key = `${t.id}:${t.tiers.join('')}:${t.target}:${t.quiet ?? '-'}:${this.game.rangeFactor(t) < 1 ? 's' : ''}:${t.mopped > 0 ? 1 : 0}:${t.dir}`;
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
    const s = g.liveStats(t);
    // Named after the highest upgrade bought, like Bloons; the base name until then.
    let title = def.name;
    let best = 0;
    def.paths.forEach((p, i) => {
      if (t.tiers[i] > best) {
        best = t.tiers[i];
        title = p.tiers[t.tiers[i] - 1].name;
      }
    });
    const head = h(
      'div',
      { class: 'tp-head' },
      img(`icons/${modelFor(def, t.tiers)}.png`, title),
      h(
        'div',
        {},
        h('div', { class: 'tp-name wrap', text: title }),
        h('div', { class: 'tp-sub' }, h('span', { text: def.name }), h('span', { class: 'mono tiers', text: t.tiers.join('-') }), classTag(def.damageClass, true)),
        g.players > 1 ? h('div', { class: 'tp-owner', text: t.owner === this.me ? T.mpYourTower : `${T.mpOwnedBy} ${this.ownerName(t.owner)}${g.canControl(t, this.me) ? '' : ` (${T.mpReadOnly})`}` }) : null,
      ),
      h('button', { class: 'icon-btn', title: 'Close (Esc)', on: { click: () => this.act.deselect() } }, icon('xmark')),
    );
    const parts: HTMLElement[] = [head];
    const dyn: (() => void)[] = [];

    const stats = h('div', { class: 'kv' });
    if (def.role === 'pulse') {
      stats.append(
        h('span', { class: 'k', text: 'Every' }),
        h('span', { class: 'v', text: `${fmt(s.interval, 1)}s` }),
        h('span', { class: 'k', text: T.range }),
        h('span', { class: 'v', text: fmt(s.range, 2) }),
        h('span', { class: 'k', text: 'Stops everyone' }),
        h('span', { class: 'v', text: `${fmt(s.stun, 1)}s` }),
      );
      if (s.knockback > 0) stats.append(h('span', { class: 'k', text: 'Pushes back' }), h('span', { class: 'v', text: `${fmt(s.knockback, 1)} tile` }));
      const extra = [
        s.vulnerable > 0 ? `+${s.vulnerable} damage taken` : '',
        s.stunnedTakes > 1 ? `stopped take x${s.stunnedTakes}` : '',
        s.buffRate < 1 ? `towers nearby ${Math.round((1 / s.buffRate - 1) * 100)}% faster` : '',
        s.silenceProof ? 'Chatterbox-proof' : '',
        s.seesHidden ? 'reveals hidden' : '',
      ].filter(Boolean);
      if (extra.length) stats.append(h('span', { class: 'k', text: 'Also' }), h('span', { class: 'v wrap', text: extra.join(', ') }));
    } else if (def.role === 'zone') {
      stats.append(
        h('span', { class: 'k', text: 'Damage per second' }),
        h('span', { class: 'v', text: `${fmt(s.dot, 1)}${s.unshared ? ' each' : ' shared'}` }),
        h('span', { class: 'k', text: 'Zone size' }),
        h('span', { class: 'v', text: fmt(s.range, 2) }),
      );
      // Zone damage comes in tiny ticks: a shield stops all of it.
      stats.append(h('span', { class: 'k', text: 'Shields' }), h('span', { class: 'v faint', text: 'bounces off' }));
      if (s.slow < 1) stats.append(h('span', { class: 'k', text: 'Slows to' }), h('span', { class: 'v', text: `${Math.round(s.slow * 100)}%${s.slowTime > 0.5 ? `, ${fmt(s.slowTime, 0)}s after` : ''}` }));
      const extra = ['reveals hidden', s.bleed > 0 ? `sticks for ${s.bleed}s` : '', s.stunPulse ? `stops everyone every ${s.stunPulse.every}s` : '', s.killCoffee > 0 ? `+${s.killCoffee} Coffee per colleague` : '', s.hpPulse ? `a quarter of their HP every ${s.hpPulse.every}s` : ''].filter(Boolean);
      if (extra.length) stats.append(h('span', { class: 'k', text: 'Also' }), h('span', { class: 'v wrap', text: extra.join(', ') }));
      const dealt = h('span', { class: 'v' });
      stats.append(h('span', { class: 'k', text: T.damageDealt }), dealt);
      dyn.push(() => setText(dealt, `${Math.round(t.stats.damage)} (${t.stats.kills} dealt with)`));
    } else if (def.role === 'trap') {
      stats.append(
        h('span', { class: 'k', text: T.damage }),
        h('span', { class: 'v', text: `${fmt(s.damage, 1)} per tack` }),
        h('span', { class: 'k', text: 'Pile' }),
        h('span', { class: 'v', text: `${s.pierce} tacks, lasts ${Math.round(s.pileLife)}s` }),
        h('span', { class: 'k', text: 'Drops' }),
        h('span', { class: 'v', text: `${s.piles > 1 ? `${s.piles} piles` : 'a pile'} every ${fmt(s.interval, 1)}s` }),
        h('span', { class: 'k', text: T.range }),
        h('span', { class: 'v', text: fmt(s.range, 2) }),
      );
      const sl = shieldLine(s);
      stats.append(h('span', { class: 'k', text: 'Shields', title: sl.help }), h('span', { class: `v ${sl.ok ? 'good' : 'faint'}`, text: sl.text, title: sl.help }));
      const extra = ['hits hidden', s.slowOnHit ? 'slows' : '', s.stunOnHit > 0 ? `stops for ${s.stunOnHit}s` : '', s.bossMult > 1 ? `x${s.bossMult} vs bosses` : ''].filter(Boolean);
      stats.append(h('span', { class: 'k', text: 'Also' }), h('span', { class: 'v wrap', text: extra.join(', ') }));
      const dealt = h('span', { class: 'v' });
      const per = h('span', { class: 'v' });
      stats.append(h('span', { class: 'k', text: T.damageDealt }), dealt, h('span', { class: 'k', text: T.perCoffee }), per);
      dyn.push(() => {
        setText(dealt, `${Math.round(t.stats.damage)} (${t.stats.kills} dealt with)`);
        setText(per, fmt(t.stats.damage / Math.max(1, t.invested), 1));
      });
    } else if (def.role === 'smash') {
      stats.append(
        h('span', { class: 'k', text: 'Slam' }),
        h('span', { class: 'v', text: `${fmt(s.damage, 0)} damage, ${fmt(s.smashRadius, 1)} wide` }),
        h('span', { class: 'k', text: 'Every' }),
        h('span', { class: 'v', text: `${fmt(s.interval, 1)}s` }),
        h('span', { class: 'k', text: 'Keyboard' }),
        h('span', { class: 'v', text: `${fmt(s.barrierHp, 0)} kicks, ${fmt(s.barrierTime, 0)}s` }),
      );
      const sl = shieldLine(s);
      stats.append(h('span', { class: 'k', text: 'Shields', title: sl.help }), h('span', { class: `v ${sl.ok ? 'good' : 'faint'}`, text: sl.text, title: sl.help }));
      const extra = [s.doubleSmash ? 'smashes twice' : '', s.stunOnHit > 0 ? `stops for ${s.stunOnHit}s` : '', s.barrierThorns > 0 ? `kicking it hurts (${s.barrierThorns}/s)` : '', s.bossMult > 1 ? `x${s.bossMult} vs bosses` : ''].filter(Boolean);
      if (extra.length) stats.append(h('span', { class: 'k', text: 'Also' }), h('span', { class: 'v wrap', text: extra.join(', ') }));
      const dealt = h('span', { class: 'v' });
      stats.append(h('span', { class: 'k', text: T.damageDealt }), dealt);
      dyn.push(() => setText(dealt, `${Math.round(t.stats.damage)} (${t.stats.kills} dealt with)`));
    } else if (def.role === 'chair') {
      stats.append(
        h('span', { class: 'k', text: 'Per knock' }),
        h('span', { class: 'v', text: `${fmt(s.damage, 0)} damage` }),
        h('span', { class: 'k', text: 'HP per run' }),
        h('span', { class: 'v', text: fmt(s.chairHp, 0) }),
        h('span', { class: 'k', text: 'Lane' }),
        h('span', { class: 'v', text: `${fmt(g.laneLength(t, s.range), 1)} tiles` }),
        h('span', { class: 'k', text: 'Rests' }),
        h('span', { class: 'v', text: `${fmt(s.interval, 1)}s` }),
      );
      const sl = shieldLine(s);
      stats.append(h('span', { class: 'k', text: 'Shields', title: sl.help }), h('span', { class: `v ${sl.ok ? 'good' : 'faint'}`, text: sl.text, title: sl.help }));
      const extra = [s.knockback > 0 ? 'knocks back' : '', s.stunOnHit > 0 ? `stops for ${s.stunOnHit}s` : '', s.rollBack ? 'hits on the way back' : '', s.bossMult > 1 ? `x${s.bossMult} vs bosses` : ''].filter(Boolean);
      if (extra.length) stats.append(h('span', { class: 'k', text: 'Also' }), h('span', { class: 'v wrap', text: extra.join(', ') }));
      const dealt = h('span', { class: 'v' });
      stats.append(h('span', { class: 'k', text: T.damageDealt }), dealt);
      dyn.push(() => setText(dealt, `${Math.round(t.stats.damage)} (${t.stats.kills} dealt with)`));
    } else if (def.role === 'damage') {
      const extra = [s.targets >= 50 ? 'everyone in range' : s.targets > 1 ? `${s.targets} targets` : '', s.splash ? 'splash' : '', s.bounce ? `${s.bounce} bounces` : '', s.bossMult > 1 ? `x${s.bossMult} vs bosses` : '', s.slowAura < 1 ? 'slows' : '', s.seesHidden ? 'sees hidden' : ''].filter(Boolean);
      stats.append(
        h('span', { class: 'k', text: T.damage }),
        h('span', { class: 'v', text: fmt(s.damage, 1) }),
        h('span', { class: 'k', text: T.rate }),
        h('span', { class: 'v', text: fmt(1 / s.interval, 2) }),
        h('span', { class: 'k', text: T.range }),
        h('span', { class: 'v', text: s.global ? 'the whole floor' : fmt(s.range, 2) }),
      );
      const sl = shieldLine(s);
      stats.append(h('span', { class: 'k', text: 'Shields', title: sl.help }), h('span', { class: `v ${sl.ok ? 'good' : 'faint'}`, text: sl.text, title: sl.help }));
      if (s.stunOnHit > 0) extra.push(`pins for ${s.stunOnHit}s`);
      if (s.slowOnHit) extra.push('slows');
      if (s.killCoffee > 0) extra.push(`+${s.killCoffee} Coffee per colleague`);
      if (s.waveIncome > 0) extra.push(`+${s.waveIncome} Coffee per wave`);
      if (extra.length) stats.append(h('span', { class: 'k', text: 'Also' }), h('span', { class: 'v wrap', text: extra.join(', ') }));
      const dealt = h('span', { class: 'v' });
      const per = h('span', { class: 'v' });
      stats.append(h('span', { class: 'k', text: T.damageDealt }), dealt, h('span', { class: 'k', text: T.perCoffee }), per);
      dyn.push(() => {
        setText(dealt, `${Math.round(t.stats.damage)} (${t.stats.kills} dealt with)`);
        setText(per, fmt(t.stats.damage / Math.max(1, t.invested), 1));
      });
    } else {
      stats.append(h('span', { class: 'k', text: s.bank ? 'Brews into the pot' : 'Makes' }), h('span', { class: 'v', text: `${fmt(s.coffeeAmount, 0)} per ${fmt(s.coffeeInterval, 1)}s` }));
      if (s.tip > 0) stats.append(h('span', { class: 'k', text: 'Tips in range' }), h('span', { class: 'v', text: `+${Math.round(s.tip * 100)}%` }));
      if (s.tipEverywhere > 0) stats.append(h('span', { class: 'k', text: 'Tips everywhere' }), h('span', { class: 'v', text: `+${Math.round(s.tipEverywhere * 100)}%` }));
      const made = h('span', { class: 'v' });
      stats.append(h('span', { class: 'k', text: T.coffeeMade }), made);
      dyn.push(() => setText(made, String(Math.floor(t.stats.coffee))));
    }
    parts.push(stats);

    // Expense Claim: the pot and the button that makes this machine something to do.
    if (s.bank) {
      const bank = s.bank;
      const potText = h('span', { class: 'mono' });
      const fill = h('div', { class: 'pot-fill' });
      const claim = h('button', { class: 'btn primary small', title: bank.claimAll ? T.claimAllHelp : 'Claim the pot (C)', on: { click: () => this.act.claim(t.id) } });
      const box = h(
        'div',
        { class: 'pot' },
        h('div', { class: 'row' }, h('span', { class: 'label', text: 'Pot' }), potText),
        h('div', { class: 'pot-track' }, fill),
        h('div', { class: 'faint', attrs: { style: 'font-size:11px' }, text: `+${bank.perWave} and ${Math.round(bank.interest * 100)}% interest every wave. Full = no more growth.` }),
        claim,
      );
      dyn.push(() => {
        setText(potText, `${Math.floor(t.pot)} / ${bank.cap}`);
        fill.style.width = `${Math.min(100, (t.pot / bank.cap) * 100).toFixed(1)}%`;
        toggle(fill, 'full', t.pot >= bank.cap - 0.01);
        const amount = bank.claimAll ? g.potsOf(t.owner) : Math.floor(t.pot);
        setText(claim, `${bank.claimAll ? T.claimAll : 'Claim'} ${amount}`);
        claim.disabled = amount <= 0;
      });
      parts.push(box);
    }

    // The three paths.
    parts.push(h('div', { class: 'label', text: 'Upgrades' }), h('div', { class: 'faint', attrs: { style: 'font-size:11px' }, text: T.pathRule }));
    const keys = [',', '.', '/'];
    def.paths.forEach((path, i) => {
      const tier = t.tiers[i];
      const pips = h('div', { class: 'pips' }, ...Array.from({ length: MAX_TIER }, (_, k) => h('span', { class: `pip${k < tier ? ' on' : ''}`, attrs: { style: k < tier ? `background:${path.color}` : '' } })));
      const card = h('div', { class: 'path', attrs: { style: `border-left-color:${path.color}` } }, h('div', { class: 'row' }, h('span', { class: 'path-name', text: path.name }), pips));
      const block = pathBlock(t.tiers, i);
      if (tier >= MAX_TIER) {
        card.append(h('div', { class: 'faint', attrs: { style: 'font-size:11px' }, text: 'Complete.' }));
      } else if (block) {
        card.classList.add('locked');
        card.append(h('div', { class: 'faint wrap', attrs: { style: 'font-size:11px' } }, icon('lock'), ` ${block}`));
      } else {
        const next = path.tiers[tier];
        const cost = g.pathCostFor(t, i)!;
        const btn = h(
          'button',
          { class: 'btn upgrade-btn', title: `${next.desc} (key ${keys[i]})`, on: { click: () => this.act.upgrade(t.id, i) } },
          h('span', { class: 'row' }, h('span', { class: 'wrap' }, h('span', { class: 'faint mono', text: `${tier + 1} ` }), next.name), h('span', { class: 'price', text: String(cost) })),
          h('span', { class: 'faint wrap', attrs: { style: 'font-size:12px' }, text: next.desc }),
        );
        dyn.push(() => {
          btn.disabled = !g.canUpgrade(t, i, this.me).ok;
          toggle(btn, 'broke', g.walletOf(this.me) < cost);
        });
        card.append(btn);
      }
      parts.push(card);
    });

    if (t.silenced) parts.splice(2, 0, h('div', { class: 'status bad', text: t.quiet === 'cry' ? T.hushedNote : t.quiet === 'net' ? T.offlineNote : T.silencedNote }));
    else if (t.mopped > 0) parts.splice(2, 0, h('div', { class: 'status bad', text: T.moppedNote }));
    else if (g.rangeFactor(t) < 1) parts.splice(2, 0, h('div', { class: 'status bad', text: T.smokedNote }));

    // Targeting
    if (def.role === 'chair') {
      // Four arrows laid out the way they look on screen: +x runs down-right, +y down-left.
      const arrows = h('div', { class: 'chair-dirs', attrs: { role: 'group', 'aria-label': T.chairDirection } });
      const layout: { dir: number; deg: number; label: string }[] = [
        { dir: 2, deg: -45, label: 'up-left' },
        { dir: 3, deg: 45, label: 'up-right' },
        { dir: 1, deg: -135, label: 'down-left' },
        { dir: 0, deg: 135, label: 'down-right' },
      ];
      for (const a of layout) {
        const i = icon('arrow-up');
        i.style.transform = `rotate(${a.deg}deg)`;
        arrows.append(h('button', { class: `btn small${t.dir === a.dir ? ' active' : ''}`, title: `Roll ${a.label}`, attrs: { 'aria-label': `Roll ${a.label}` }, on: { click: () => this.act.dir(t.id, a.dir) } }, i));
      }
      parts.push(h('div', { class: 'label', text: T.chairDirection }), arrows);
    }
    if (def.role === 'damage' || def.role === 'trap') {
      const trap = def.role === 'trap';
      const tg = h('div', { class: 'targets', attrs: { role: 'group', 'aria-label': trap ? T.trapTargeting : T.targeting } });
      for (const mode of trap ? TRAP_TARGET_MODES : TARGET_MODES) {
        const label = (trap ? TRAP_TARGET_LABELS[mode] : undefined) ?? TARGET_LABELS[mode];
        const help = (trap ? TRAP_TARGET_HELP[mode] : undefined) ?? TARGET_HELP[mode];
        tg.append(h('button', { class: `btn${t.target === mode ? ' active' : ''}`, text: label, title: help, on: { click: () => this.act.target(t.id, mode) } }));
      }
      parts.push(h('div', { class: 'label', text: trap ? T.trapTargeting : T.targeting }), tg);
    }

    // Sell
    const sellLabel = h('span');
    const sell = h('button', { class: 'btn danger small', on: { click: () => this.act.sell(t.id) } }, icon('recycle'), sellLabel);
    dyn.push(() => setText(sellLabel, ` ${T.sell} (+${g.sellValueFor(t)})`));
    parts.push(sell);

    this.towerPanel.replaceChildren(...parts);
    this.towerDyn = () => dyn.forEach((f) => f());
  }

  /** Owner names come in with the room info; the panel is rebuilt when the tower changes. */
  ownerNames: string[] = [];
  private ownerName(i: number): string {
    return this.ownerNames[i] ?? `Player ${i + 1}`;
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

/** DIGITAL (a laptop) or PHYSICAL (a hand): which colleagues and hazards a tower cares about. */
function classTag(cls: DamageClass | undefined, words: boolean): HTMLElement | null {
  if (!cls) return null;
  const digital = cls === 'digital';
  return h(
    'span',
    { class: `dmg-class ${cls}`, title: digital ? T.digitalHelp : T.physicalHelp },
    icon(digital ? 'laptop' : 'hand'),
    words ? ` ${digital ? T.digital : T.physical}` : null,
  );
}
