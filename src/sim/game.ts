// The simulation. Pure logic: no DOM, no Three.js, no Date.now(). The renderer reads the state
// and the events; the balance bots, the tests and (later) the multiplayer server drive it directly.
// Fixed time step and seeded randomness, so the same seed plus the same actions always gives the
// same round.
//
// Players: one wallet in single player. In multiplayer the host picks a shared wallet, or one per
// player where all income is split between everyone (like Bloons co-op). Every tower has an owner.

import { COLLEAGUES, killReward, type ColleagueDef } from './data/colleagues';
import { startCoffee, type LevelDef } from './data/levels';
import { TOWERS, boughtEffects, pathBlock, type Effect, type TargetMode, type Tiers, type TowerDef } from './data/towers';
import {
  POST_CLEAR_DELAY,
  PATH_CLEARANCE,
  WAVE_INTERVAL,
  earlyCallPoints,
  killIncomeMult,
  pathCost,
  placeCost,
  salaryFor,
  sellValue,
  starsFor,
} from './economy';
import { Path, dist, type Vec2 } from './geometry';
import { Rng } from './rng';
import { parseWave, type SpawnGroup } from './waves';

export const TICK = 1 / 60;
/** Visual travel speed of a shot, tiles per second. Damage lands instantly in the simulation. */
export const SHOT_SPEED = 16;
/** How close a colleague must stand to the target to be caught by a splash (Mail Merge). */
export const SPLASH_RADIUS = 0.8;
/** How far a reply can bounce on to the next colleague (Out of Office). */
export const BOUNCE_RANGE = 2.0;
/** Tip bonuses never go past this, however many tip jars and franchises you stack. */
export const MAX_TIP = 3.0;

export type Phase = 'plan' | 'running' | 'won' | 'lost';
export type EndReason = 'won' | 'burnout' | 'gaveup';

export interface Enemy {
  id: number;
  type: string;
  def: ColleagueDef;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  pathIndex: number;
  dist: number;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  alive: boolean;
  slowMult: number;
  slowTime: number;
  stunTime: number;
  /** Speed factor from slowing auras this tick (Legal Hold). 1 = none. */
  aura: number;
  revealed: boolean;
  phase: 1 | 2 | 3;
  addTimer: number;
  /** Spawned mid-route (split or boss add) rather than at the door. */
  isAdd: boolean;
  spawnedAt: number;
}

export interface TowerStats {
  damage: number;
  kills: number;
  shots: number;
  coffee: number;
}

export interface Tower {
  id: number;
  defId: string;
  def: TowerDef;
  owner: number;
  tx: number;
  ty: number;
  x: number;
  y: number;
  tiers: Tiers;
  target: TargetMode;
  cooldown: number;
  coffeeTimer: number;
  abilityTimer: number;
  /** Expense Claim: Coffee waiting to be claimed. */
  pot: number;
  invested: number;
  placedAtWave: number;
  stats: TowerStats;
}

export interface LiveTowerStats {
  range: number;
  interval: number;
  damage: number;
  targets: number;
  splash: number;
  bounce: number;
  seesHidden: boolean;
  bossMult: number;
  slowAura: number;
  ability: Effect['ability'] | null;
  coffeeAmount: number;
  coffeeInterval: number;
  bank: Effect['bank'] | null;
  tip: number;
  tipEverywhere: number;
}

export type ShotResult = 'hit' | 'blocked' | 'immune';

export type GameEvent =
  | { t: 'spawn'; enemyId: number }
  | {
      t: 'shot';
      towerId: number;
      enemyId: number;
      fx: number;
      fy: number;
      tx: number;
      ty: number;
      travel: number;
      damage: number;
      result: ShotResult;
      killed: boolean;
      /** 'reply' flies from the tower, 'hop' jumps from colleague to colleague. */
      kind: 'reply' | 'hop';
    }
  | { t: 'kill'; enemyId: number; type: string; x: number; y: number; reward: number; delay: number }
  | { t: 'leak'; enemyId: number; type: string; focus: number }
  | { t: 'split'; parentId: number; type: string; count: number }
  | { t: 'coffee'; towerId: number; amount: number; x: number; y: number; toPot: boolean }
  | { t: 'claim'; towerId: number; amount: number; x: number; y: number }
  | { t: 'ability'; towerId: number; x: number; y: number; range: number; hits: number }
  | { t: 'salary'; amount: number; wave: number }
  | { t: 'wave'; index: number; total: number; boss: boolean; early: boolean; points: number }
  | { t: 'bossPhase'; enemyId: number; phase: 2 | 3; called: number }
  | { t: 'bossAdds'; enemyId: number; count: number }
  | { t: 'placed' | 'upgraded' | 'sold'; towerId: number; defId: string; player: number }
  | { t: 'gift'; from: number; to: number; amount: number }
  | { t: 'end'; reason: EndReason };

export interface Check {
  ok: boolean;
  reason?: string;
  cost?: number;
}

export interface RoundStats {
  coffeeFromKills: number;
  coffeeFromSalary: number;
  coffeeFromMachines: number;
  coffeeFromBank: number;
  coffeeFromSales: number;
  coffeeSpent: number;
  kills: Record<string, number>;
  leaks: Record<string, number>;
  leakFocus: Record<string, number>;
  built: Record<string, number>;
  upgrades: number;
  /** Tiers bought per tower path, keyed "autoreply_0". */
  pathTiers: Record<string, number>;
  sold: number;
  earlyCalls: number;
  firstLeakWave: number;
  peakOnFloor: number;
}

export interface GameOptions {
  seed?: number;
  /** Meta perks from Recognition, later. */
  costMult?: number;
  extraCoffee?: number;
  extraFocus?: number;
  /** Multiplayer: number of players and whether they share one wallet. */
  players?: number;
  sharedWallet?: boolean;
}

/** A tower as the server sends it to the players. */
export interface TowerSnap {
  id: number;
  def: string;
  owner: number;
  tx: number;
  ty: number;
  tiers: Tiers;
  target: TargetMode;
  pot: number;
  invested: number;
  dmg: number;
  kills: number;
  coffee: number;
}

/**
 * Everything a player's screen needs, sent by the multiplayer server about ten times a second.
 * Colleagues are packed as number arrays to keep it small:
 * [id, typeIndex, x, y, dirX, dirY, hp, maxHp, shield, maxShield, phase, isAdd, pathIndex, dist]
 */
export interface Snapshot {
  time: number;
  phase: Phase;
  endReason: EndReason | null;
  focus: number;
  wallets: number[];
  score: number;
  waveIndex: number;
  nextWaveTimer: number;
  towers: TowerSnap[];
  enemies: number[][];
  stats: RoundStats;
}

/** Fixed order of colleague types, so a snapshot can send a number instead of a name. */
export const COLLEAGUE_IDS: readonly string[] = Object.keys(COLLEAGUES).sort();

const r3 = (n: number) => Math.round(n * 1000) / 1000;

interface PendingSpawn {
  at: number;
  seq: number;
  type: string;
  pathIndex: number;
}

const TILE_BLOCKED = 1;
const TILE_PATH = 2;

/** Combine the base numbers of a tower with every upgrade bought. Pure, shared with the UI. */
export function computeStats(def: TowerDef, tiers: Tiers): LiveTowerStats {
  const b = def.base;
  let damageAdd = 0;
  let damageMult = 1;
  let intervalMult = 1;
  let rangeMult = 1;
  let coffeeAdd = 0;
  let coffeeMult = 1;
  const s: LiveTowerStats = {
    range: b.range,
    interval: b.interval ?? 0,
    damage: b.damage ?? 0,
    targets: 1,
    splash: 0,
    bounce: 0,
    seesHidden: false,
    bossMult: 1,
    slowAura: 1,
    ability: null,
    coffeeAmount: b.coffeeAmount ?? 0,
    coffeeInterval: b.coffeeInterval ?? 0,
    bank: null,
    tip: 0,
    tipEverywhere: 0,
  };
  for (const e of boughtEffects(def, tiers)) {
    damageAdd += e.damageAdd ?? 0;
    damageMult *= e.damageMult ?? 1;
    intervalMult *= e.intervalMult ?? 1;
    rangeMult *= e.rangeMult ?? 1;
    coffeeAdd += e.coffeeAdd ?? 0;
    coffeeMult *= e.coffeeMult ?? 1;
    s.targets += e.targetsAdd ?? 0;
    s.splash += e.splash ?? 0;
    s.bounce += e.bounce ?? 0;
    s.tip += e.tip ?? 0;
    s.tipEverywhere += e.tipEverywhere ?? 0;
    if (e.seesHidden) s.seesHidden = true;
    if (e.bossMult) s.bossMult = Math.max(s.bossMult, e.bossMult);
    if (e.slowAura) s.slowAura = Math.min(s.slowAura, e.slowAura);
    if (e.ability) s.ability = e.ability;
    if (e.bank) s.bank = e.bank;
  }
  s.damage = (s.damage + damageAdd) * damageMult;
  s.range *= rangeMult;
  if (def.role === 'economy') s.coffeeInterval *= intervalMult;
  else s.interval *= intervalMult;
  s.coffeeAmount = (s.coffeeAmount + coffeeAdd) * coffeeMult;
  return s;
}

export class Game {
  readonly level: LevelDef;
  readonly paths: Path[];
  readonly waves: SpawnGroup[][];
  readonly seed: number;
  readonly costMult: number;
  readonly startFocus: number;
  readonly players: number;
  readonly sharedWallet: boolean;

  phase: Phase = 'plan';
  endReason: EndReason | null = null;
  time = 0;
  focus: number;
  /** One wallet when shared (or single player), otherwise one per player. */
  wallets: number[];
  score = 0;
  waveIndex = 0;
  nextWaveTimer = WAVE_INTERVAL;

  towers: Tower[] = [];
  enemies: Enemy[] = [];
  events: GameEvent[] = [];
  stats: RoundStats;

  private pending: PendingSpawn[] = [];
  private seq = 0;
  private nextId = 1;
  private rng: Rng;
  private tiles: Uint8Array;

  constructor(level: LevelDef, opts: GameOptions = {}) {
    this.level = level;
    this.seed = opts.seed ?? 1;
    this.rng = new Rng(this.seed);
    this.costMult = opts.costMult ?? 1;
    this.players = Math.max(1, Math.min(8, Math.floor(opts.players ?? 1)));
    this.sharedWallet = this.players === 1 || (opts.sharedWallet ?? true);
    this.paths = level.paths.map((p) => new Path(p));
    this.waves = level.waves.map(parseWave);
    this.startFocus = level.startFocus + (opts.extraFocus ?? 0);
    this.focus = this.startFocus;
    const start = startCoffee(level.id) + (opts.extraCoffee ?? 0);
    // Split wallets start with the full amount each: Bloons does the same, so nobody begins unable
    // to build. Only income is divided.
    this.wallets = this.sharedWallet ? [start] : Array.from({ length: this.players }, () => start);
    this.stats = {
      coffeeFromKills: 0,
      coffeeFromSalary: 0,
      coffeeFromMachines: 0,
      coffeeFromBank: 0,
      coffeeFromSales: 0,
      coffeeSpent: 0,
      kills: {},
      leaks: {},
      leakFocus: {},
      built: {},
      upgrades: 0,
      pathTiers: {},
      sold: 0,
      earlyCalls: 0,
      firstLeakWave: 0,
      peakOnFloor: 0,
    };
    this.tiles = new Uint8Array(level.size.w * level.size.h);
    for (const d of level.decor) this.markRect(d.rect.x, d.rect.y, d.rect.w, d.rect.h, TILE_BLOCKED);
    this.markRect(level.desk.x, level.desk.y, 1, 1, TILE_BLOCKED);
    for (let ty = 0; ty < level.size.h; ty++) {
      for (let tx = 0; tx < level.size.w; tx++) {
        const c = { x: tx + 0.5, y: ty + 0.5 };
        if (this.paths.some((p) => p.distanceTo(c) < PATH_CLEARANCE)) this.tiles[ty * level.size.w + tx] |= TILE_PATH;
      }
    }
  }

  get totalWaves(): number {
    return this.waves.length;
  }

  get over(): boolean {
    return this.phase === 'won' || this.phase === 'lost';
  }

  get stars(): 0 | 1 | 2 | 3 {
    return this.phase === 'won' ? starsFor(this.focus, this.startFocus) : 0;
  }

  /** Coffee of player 0 (the only one in single player). */
  get coffee(): number {
    return this.wallets[0];
  }

  set coffee(v: number) {
    this.wallets[0] = v;
  }

  walletOf(player: number): number {
    return this.wallets[this.sharedWallet ? 0 : player];
  }

  private walletIndex(player: number): number {
    return this.sharedWallet ? 0 : Math.max(0, Math.min(this.wallets.length - 1, player));
  }

  /** Income for the team: in a split game everyone gets an equal share. */
  private earn(amount: number): void {
    if (this.sharedWallet) this.wallets[0] += amount;
    else for (let i = 0; i < this.wallets.length; i++) this.wallets[i] += amount / this.players;
  }

  /** Income for one player (their own machine, their own sale). */
  private earnFor(player: number, amount: number): void {
    this.wallets[this.walletIndex(player)] += amount;
  }

  private spend(player: number, amount: number): void {
    this.wallets[this.walletIndex(player)] -= amount;
    this.stats.coffeeSpent += amount;
  }

  /** Drain the events produced since the last call. */
  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  // ------------------------------------------------------------------ tiles

  private markRect(x: number, y: number, w: number, h: number, flag: number): void {
    for (let ty = y; ty < y + h; ty++) {
      for (let tx = x; tx < x + w; tx++) {
        if (tx >= 0 && ty >= 0 && tx < this.level.size.w && ty < this.level.size.h) {
          this.tiles[ty * this.level.size.w + tx] |= flag;
        }
      }
    }
  }

  inBounds(tx: number, ty: number): boolean {
    return Number.isInteger(tx) && Number.isInteger(ty) && tx >= 0 && ty >= 0 && tx < this.level.size.w && ty < this.level.size.h;
  }

  isPathTile(tx: number, ty: number): boolean {
    return this.inBounds(tx, ty) && (this.tiles[ty * this.level.size.w + tx] & TILE_PATH) !== 0;
  }

  isBlockedTile(tx: number, ty: number): boolean {
    return this.inBounds(tx, ty) && (this.tiles[ty * this.level.size.w + tx] & TILE_BLOCKED) !== 0;
  }

  towerAt(tx: number, ty: number): Tower | undefined {
    return this.towers.find((t) => t.tx === tx && t.ty === ty);
  }

  minPathDistance(p: Vec2): number {
    return Math.min(...this.paths.map((path) => path.distanceTo(p)));
  }

  // ------------------------------------------------------------------ costs

  copiesOf(defId: string, player = 0): number {
    // The duplicate surcharge counts your own copies: in a team game, a teammate's Auto-Reply does
    // not make yours more expensive.
    return this.towers.filter((t) => t.defId === defId && (this.sharedWallet || t.owner === player)).length;
  }

  placeCostFor(defId: string, player = 0): number {
    return placeCost(TOWERS[defId], this.copiesOf(defId, player), this.costMult);
  }

  pathCostFor(t: Tower, path: number): number | null {
    if (t.tiers[path] >= t.def.paths[path].tiers.length) return null;
    return pathCost(t.def, path, t.tiers[path] + 1, this.costMult);
  }

  sellValueFor(t: Tower): number {
    return sellValue(t.invested) + Math.floor(t.pot);
  }

  /** May this player touch this tower? Shared wallet: everyone. Split: only the owner. */
  canControl(t: Tower, player: number): boolean {
    return this.sharedWallet || t.owner === player;
  }

  liveStats(t: Tower): LiveTowerStats {
    return computeStats(t.def, t.tiers);
  }

  // ------------------------------------------------------------------ commands

  canPlace(defId: string, tx: number, ty: number, player = 0): Check {
    const def = TOWERS[defId];
    if (!def || !this.level.towers.includes(defId)) return { ok: false, reason: 'Not available on this floor yet.' };
    if (this.over) return { ok: false, reason: 'The day is over.' };
    const cost = this.placeCostFor(defId, player);
    if (!this.inBounds(tx, ty)) return { ok: false, reason: 'That is outside the office.', cost };
    if (this.isPathTile(tx, ty)) return { ok: false, reason: 'That is the walkway. People need to get through.', cost };
    if (this.isBlockedTile(tx, ty)) return { ok: false, reason: 'Something is already standing there.', cost };
    if (this.towerAt(tx, ty)) return { ok: false, reason: 'You already put something there.', cost };
    if (!this.mayBuildAt(player, tx, ty)) return { ok: false, reason: 'That part of the office belongs to someone else.', cost };
    if (def.role === 'damage') {
      const reach = def.base.range - 0.2;
      if (this.minPathDistance({ x: tx + 0.5, y: ty + 0.5 }) > reach) {
        return { ok: false, reason: 'Too far from the walkway to reach anyone.', cost };
      }
    }
    if (this.walletOf(player) < cost) return { ok: false, reason: 'Not enough Coffee.', cost };
    return { ok: true, cost };
  }

  /** Multiplayer build areas: zone index per tile, and the zone each player may build in. */
  zones: Uint8Array | null = null;
  playerZone: number[] = [];

  setZones(map: Uint8Array | null, playerZone: number[]): void {
    this.zones = map;
    this.playerZone = [...playerZone];
  }

  mayBuildAt(player: number, tx: number, ty: number): boolean {
    if (!this.zones || !this.inBounds(tx, ty)) return true;
    const z = this.playerZone[player];
    return z === undefined || z < 0 || this.zones[ty * this.level.size.w + tx] === z;
  }

  place(defId: string, tx: number, ty: number, player = 0): Check & { tower?: Tower } {
    const check = this.canPlace(defId, tx, ty, player);
    if (!check.ok || check.cost === undefined) return check;
    const def = TOWERS[defId];
    const t: Tower = {
      id: this.nextId++,
      defId,
      def,
      owner: player,
      tx,
      ty,
      x: tx + 0.5,
      y: ty + 0.5,
      tiers: [0, 0, 0],
      target: 'first',
      cooldown: 0,
      coffeeTimer: 0,
      abilityTimer: 0,
      pot: 0,
      invested: check.cost,
      placedAtWave: this.waveIndex,
      stats: { damage: 0, kills: 0, shots: 0, coffee: 0 },
    };
    this.spend(player, check.cost);
    this.towers.push(t);
    this.stats.built[defId] = (this.stats.built[defId] ?? 0) + 1;
    this.events.push({ t: 'placed', towerId: t.id, defId, player });
    return { ...check, tower: t };
  }

  canUpgrade(t: Tower, path: number, player = 0): Check {
    if (path < 0 || path > 2) return { ok: false, reason: 'No such path.' };
    const block = pathBlock(t.tiers, path);
    if (block) return { ok: false, reason: block };
    const cost = this.pathCostFor(t, path)!;
    if (this.over) return { ok: false, reason: 'The day is over.', cost };
    if (!this.canControl(t, player)) return { ok: false, reason: 'That is not your tower.', cost };
    if (this.walletOf(player) < cost) return { ok: false, reason: 'Not enough Coffee.', cost };
    return { ok: true, cost };
  }

  upgrade(towerId: number, path: number, player = 0): Check {
    const t = this.tower(towerId);
    if (!t) return { ok: false, reason: 'No such tower.' };
    const check = this.canUpgrade(t, path, player);
    if (!check.ok || check.cost === undefined) return check;
    this.spend(player, check.cost);
    t.invested += check.cost;
    t.tiers[path]++;
    this.stats.upgrades++;
    const key = `${t.defId}_${path}`;
    this.stats.pathTiers[key] = Math.max(this.stats.pathTiers[key] ?? 0, t.tiers[path]);
    this.events.push({ t: 'upgraded', towerId: t.id, defId: t.defId, player });
    return check;
  }

  sell(towerId: number, player = 0): Check {
    const t = this.tower(towerId);
    if (!t) return { ok: false, reason: 'No such tower.' };
    if (this.over) return { ok: false, reason: 'The day is over.' };
    if (!this.canControl(t, player)) return { ok: false, reason: 'That is not your tower.' };
    const value = this.sellValueFor(t);
    this.earnFor(t.owner, value);
    this.stats.coffeeFromSales += value;
    this.stats.sold++;
    this.towers = this.towers.filter((x) => x !== t);
    this.events.push({ t: 'sold', towerId: t.id, defId: t.defId, player });
    return { ok: true, cost: -value };
  }

  /** Expense Claim: empty the pot into your Coffee. */
  claim(towerId: number, player = 0): Check {
    const t = this.tower(towerId);
    if (!t) return { ok: false, reason: 'No such tower.' };
    if (!this.canControl(t, player)) return { ok: false, reason: 'That is not your tower.' };
    const amount = Math.floor(t.pot);
    if (amount <= 0) return { ok: false, reason: 'The pot is empty.' };
    t.pot -= amount;
    this.earnFor(t.owner, amount);
    this.stats.coffeeFromBank += amount;
    t.stats.coffee += amount;
    this.events.push({ t: 'claim', towerId: t.id, amount, x: t.x, y: t.y });
    return { ok: true, cost: -amount };
  }

  /** Split wallets: give Coffee to a teammate. */
  gift(from: number, to: number, amount: number): Check {
    if (this.sharedWallet) return { ok: false, reason: 'You share one wallet already.' };
    if (from === to || to < 0 || to >= this.players) return { ok: false, reason: 'Nobody to give it to.' };
    const a = Math.floor(amount);
    if (a <= 0 || this.walletOf(from) < a) return { ok: false, reason: 'Not enough Coffee.' };
    this.wallets[from] -= a;
    this.wallets[to] += a;
    this.events.push({ t: 'gift', from, to, amount: a });
    return { ok: true, cost: a };
  }

  setTargeting(towerId: number, mode: TargetMode, player = 0): void {
    const t = this.tower(towerId);
    if (t && this.canControl(t, player)) t.target = mode;
  }

  /** Start the day: plan phase ends and wave 1 walks in. */
  start(): void {
    if (this.phase !== 'plan') return;
    this.phase = 'running';
    this.startNextWave(false, 0);
  }

  /** Call the next wave before the timer runs out. Pays points, stacks colleagues. */
  callNextWave(): boolean {
    if (this.phase === 'plan') {
      this.start();
      return true;
    }
    if (this.phase !== 'running' || this.waveIndex >= this.totalWaves) return false;
    const points = earlyCallPoints(this.nextWaveTimer);
    this.score += points;
    this.stats.earlyCalls++;
    this.startNextWave(true, points);
    return true;
  }

  giveUp(): void {
    if (this.over) return;
    this.finish('lost', 'gaveup');
  }

  tower(id: number): Tower | undefined {
    return this.towers.find((t) => t.id === id);
  }

  enemy(id: number): Enemy | undefined {
    return this.enemies.find((e) => e.id === id);
  }

  // ------------------------------------------------------------------ multiplayer snapshots

  toSnapshot(): Snapshot {
    return {
      time: r3(this.time),
      phase: this.phase,
      endReason: this.endReason,
      focus: this.focus,
      wallets: this.wallets.map(r3),
      score: this.score,
      waveIndex: this.waveIndex,
      nextWaveTimer: r3(this.nextWaveTimer),
      towers: this.towers.map((t) => ({
        id: t.id,
        def: t.defId,
        owner: t.owner,
        tx: t.tx,
        ty: t.ty,
        tiers: [...t.tiers] as Tiers,
        target: t.target,
        pot: r3(t.pot),
        invested: t.invested,
        dmg: Math.round(t.stats.damage),
        kills: t.stats.kills,
        coffee: r3(t.stats.coffee),
      })),
      enemies: this.enemies.map((e) => [
        e.id,
        COLLEAGUE_IDS.indexOf(e.type),
        r3(e.x),
        r3(e.y),
        r3(e.dirX),
        r3(e.dirY),
        r3(e.hp),
        e.maxHp,
        r3(e.shield),
        e.maxShield,
        e.phase,
        e.isAdd ? 1 : 0,
        e.pathIndex,
        r3(e.dist),
      ]),
      stats: this.stats,
    };
  }

  /** A player's copy of the game: take over the server's state. Never stepped locally. */
  applySnapshot(s: Snapshot): void {
    this.time = s.time;
    this.phase = s.phase;
    this.endReason = s.endReason;
    this.focus = s.focus;
    this.wallets = [...s.wallets];
    this.score = s.score;
    this.waveIndex = s.waveIndex;
    this.nextWaveTimer = s.nextWaveTimer;
    this.stats = s.stats;
    const old = new Map(this.towers.map((t) => [t.id, t]));
    this.towers = s.towers.map((ts) => {
      const def = TOWERS[ts.def];
      const t: Tower = old.get(ts.id) ?? {
        id: ts.id,
        defId: ts.def,
        def,
        owner: ts.owner,
        tx: ts.tx,
        ty: ts.ty,
        x: ts.tx + 0.5,
        y: ts.ty + 0.5,
        tiers: [0, 0, 0],
        target: 'first',
        cooldown: 0,
        coffeeTimer: 0,
        abilityTimer: 0,
        pot: 0,
        invested: 0,
        placedAtWave: s.waveIndex,
        stats: { damage: 0, kills: 0, shots: 0, coffee: 0 },
      };
      t.tiers = [...ts.tiers] as Tiers;
      t.target = ts.target;
      t.pot = ts.pot;
      t.invested = ts.invested;
      t.owner = ts.owner;
      t.stats.damage = ts.dmg;
      t.stats.kills = ts.kills;
      t.stats.coffee = ts.coffee;
      return t;
    });
    this.enemies = s.enemies.map((a) => {
      const type = COLLEAGUE_IDS[a[1]];
      const def = COLLEAGUES[type];
      return {
        id: a[0],
        type,
        def,
        x: a[2],
        y: a[3],
        dirX: a[4],
        dirY: a[5],
        hp: a[6],
        maxHp: a[7],
        shield: a[8],
        maxShield: a[9],
        phase: a[10] as 1 | 2 | 3,
        isAdd: a[11] === 1,
        pathIndex: a[12],
        dist: a[13],
        alive: true,
        slowMult: 1,
        slowTime: 0,
        stunTime: 0,
        aura: 1,
        revealed: false,
        addTimer: 0,
        spawnedAt: 0,
      };
    });
  }

  // ------------------------------------------------------------------ the loop

  step(dt = TICK): void {
    if (this.phase !== 'running') return;
    this.time += dt;
    this.spawnDue();
    this.updateBosses(dt);
    this.updateAuras();
    this.updateTowers(dt);
    this.moveEnemies(dt);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.stats.peakOnFloor = Math.max(this.stats.peakOnFloor, this.enemies.length);
    if (this.over) return;
    if (this.waveIndex < this.totalWaves) {
      if (this.enemies.length === 0 && this.pending.length === 0 && this.nextWaveTimer > POST_CLEAR_DELAY) {
        this.nextWaveTimer = POST_CLEAR_DELAY;
      }
      this.nextWaveTimer -= dt;
      if (this.nextWaveTimer <= 0) this.startNextWave(false, 0);
    } else if (this.enemies.length === 0 && this.pending.length === 0) {
      this.finish('won', 'won');
    }
  }

  /** Run until the round ends or maxSeconds of game time passed. For tests and bots. */
  runFor(seconds: number, onTick?: (g: Game) => void): void {
    const end = this.time + seconds;
    while (this.phase === 'running' && this.time < end) {
      this.step();
      onTick?.(this);
    }
  }

  private startNextWave(early: boolean, points: number): void {
    if (this.waveIndex >= this.totalWaves) return;
    if (this.waveIndex > 0) {
      const pay = salaryFor(this.waveIndex);
      this.earn(pay);
      this.stats.coffeeFromSalary += pay;
      this.events.push({ t: 'salary', amount: pay, wave: this.waveIndex });
      this.payInterest();
    }
    const groups = this.waves[this.waveIndex];
    this.waveIndex++;
    const pathIndex = (this.waveIndex - 1) % this.paths.length;
    let at = this.time;
    for (const g of groups) {
      for (let i = 0; i < g.count; i++) {
        this.pending.push({ at, seq: this.seq++, type: g.type, pathIndex });
        at += g.interval;
      }
    }
    this.pending.sort((a, b) => a.at - b.at || a.seq - b.seq);
    this.nextWaveTimer = WAVE_INTERVAL;
    const boss = groups.some((g) => COLLEAGUES[g.type].boss !== undefined);
    this.events.push({ t: 'wave', index: this.waveIndex, total: this.totalWaves, boss, early, points });
  }

  /** Expense Claim pots: a deposit and interest at the start of every wave, never past the cap. */
  private payInterest(): void {
    for (const t of this.towers) {
      const bank = this.liveStats(t).bank;
      if (!bank) continue;
      t.pot = Math.min(bank.cap, (t.pot + bank.perWave) * (1 + bank.interest));
    }
  }

  private spawnDue(): void {
    while (this.pending.length > 0 && this.pending[0].at <= this.time + 1e-9) {
      const p = this.pending.shift()!;
      this.spawn(p.type, p.pathIndex, 0, false);
    }
  }

  spawn(type: string, pathIndex: number, atDist: number, isAdd: boolean): Enemy {
    const def = COLLEAGUES[type];
    if (!def) throw new Error(`Unknown colleague: ${type}`);
    const path = this.paths[pathIndex];
    const d = Math.max(0, Math.min(path.length - 0.01, atDist));
    const pt = path.pointAt(d);
    const e: Enemy = {
      id: this.nextId++,
      type,
      def,
      hp: def.hp,
      maxHp: def.hp,
      shield: def.shield ?? 0,
      maxShield: def.shield ?? 0,
      pathIndex,
      dist: d,
      x: pt.x,
      y: pt.y,
      dirX: pt.dirX,
      dirY: pt.dirY,
      alive: true,
      slowMult: 1,
      slowTime: 0,
      stunTime: 0,
      aura: 1,
      revealed: false,
      phase: 1,
      addTimer: 4,
      isAdd,
      spawnedAt: this.time,
    };
    this.enemies.push(e);
    this.events.push({ t: 'spawn', enemyId: e.id });
    return e;
  }

  private speedOf(e: Enemy): number {
    if (e.stunTime > 0) return 0;
    let s = e.def.speed * e.aura;
    if (e.slowTime > 0) s *= e.slowMult;
    if (e.def.boss && e.phase >= 3) s *= e.def.boss.phase3Speed;
    return s;
  }

  private moveEnemies(dt: number): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.stunTime > 0) e.stunTime = Math.max(0, e.stunTime - dt);
      if (e.slowTime > 0) e.slowTime = Math.max(0, e.slowTime - dt);
      const path = this.paths[e.pathIndex];
      e.dist += this.speedOf(e) * dt;
      if (e.dist >= path.length) {
        this.leak(e);
        continue;
      }
      const pt = path.pointAt(e.dist);
      e.x = pt.x;
      e.y = pt.y;
      e.dirX = pt.dirX;
      e.dirY = pt.dirY;
    }
  }

  /** Slowing auras (Legal Hold): the strongest one around a colleague counts. */
  private updateAuras(): void {
    const auras: { x: number; y: number; r: number; f: number }[] = [];
    for (const t of this.towers) {
      if (t.def.role !== 'damage') continue;
      const s = this.liveStats(t);
      if (s.slowAura < 1) auras.push({ x: t.x, y: t.y, r: s.range, f: s.slowAura });
    }
    for (const e of this.enemies) {
      let f = 1;
      for (const a of auras) if (Math.hypot(e.x - a.x, e.y - a.y) <= a.r) f = Math.min(f, a.f);
      e.aura = f;
    }
  }

  private leak(e: Enemy): void {
    e.alive = false;
    const f = e.def.focus;
    this.focus = Math.max(0, this.focus - f);
    this.stats.leaks[e.type] = (this.stats.leaks[e.type] ?? 0) + 1;
    this.stats.leakFocus[e.type] = (this.stats.leakFocus[e.type] ?? 0) + f;
    if (this.stats.firstLeakWave === 0) this.stats.firstLeakWave = this.waveIndex;
    this.events.push({ t: 'leak', enemyId: e.id, type: e.type, focus: f });
    if (this.focus <= 0) this.finish('lost', 'burnout');
  }

  private finish(phase: 'won' | 'lost', reason: EndReason): void {
    if (this.over) return;
    this.phase = phase;
    this.endReason = reason;
    this.events.push({ t: 'end', reason });
  }

  private updateBosses(dt: number): void {
    // Copy: bosses add colleagues to the list while we walk it.
    for (const e of [...this.enemies]) {
      const b = e.def.boss;
      if (!e.alive || !b) continue;
      e.addTimer -= dt;
      if (e.addTimer <= 0) {
        e.addTimer += b.addEvery;
        this.callIn(e, b.addType, b.addCount);
        this.events.push({ t: 'bossAdds', enemyId: e.id, count: b.addCount });
      }
    }
  }

  private callIn(boss: Enemy, type: string, count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawn(type, boss.pathIndex, boss.dist - 0.35 * (i + 1) - this.rng.range(0, 0.15), true);
    }
  }

  // ------------------------------------------------------------------ towers

  private updateTowers(dt: number): void {
    for (const t of this.towers) {
      const s = this.liveStats(t);
      if (t.def.role === 'economy') {
        t.coffeeTimer += dt;
        if (t.coffeeTimer >= s.coffeeInterval) {
          t.coffeeTimer -= s.coffeeInterval;
          if (s.bank) {
            t.pot = Math.min(s.bank.cap, t.pot + s.coffeeAmount);
          } else {
            this.earnFor(t.owner, s.coffeeAmount);
            t.stats.coffee += s.coffeeAmount;
            this.stats.coffeeFromMachines += s.coffeeAmount;
          }
          this.events.push({ t: 'coffee', towerId: t.id, amount: s.coffeeAmount, x: t.x, y: t.y, toPot: s.bank !== null });
        }
        continue;
      }
      if (s.ability) this.updateAbility(t, s, dt);
      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
      const targets = this.pickTargets(t, s.range, s.targets, s.seesHidden);
      if (targets.length === 0) {
        t.cooldown = 0;
        continue;
      }
      for (const e of targets) this.fire(t, e, s);
      t.stats.shots++;
      t.cooldown += s.interval;
      if (t.cooldown < 0) t.cooldown = s.interval;
    }
  }

  /** Inbox Zero: every few seconds everyone in range loses a share of their HP. */
  private updateAbility(t: Tower, s: LiveTowerStats, dt: number): void {
    const ab = s.ability!;
    t.abilityTimer += dt;
    if (t.abilityTimer < ab.every) return;
    const inRange = this.enemies.filter((e) => e.alive && this.visibleTo(e, s.seesHidden) && dist(t, e) <= s.range);
    if (inRange.length === 0) {
      // Stay charged until someone walks in.
      t.abilityTimer = ab.every;
      return;
    }
    t.abilityTimer = 0;
    for (const e of inRange) {
      const share = e.def.boss ? ab.bossShare : ab.hpShare;
      const amount = Math.max(1, (e.hp + e.shield) * share);
      const { dealt } = this.damage(e, amount, t.def.damageClass);
      t.stats.damage += dealt;
      if (!e.alive) {
        t.stats.kills++;
        this.onKill(e, 0.2);
      }
    }
    this.events.push({ t: 'ability', towerId: t.id, x: t.x, y: t.y, range: s.range, hits: inRange.length });
  }

  private visibleTo(e: Enemy, seesHidden: boolean): boolean {
    return !e.def.invisible || e.revealed || seesHidden;
  }

  /** Valid targets in range, best first according to the tower's targeting mode. */
  pickTargets(t: Tower, range: number, n: number, seesHidden = false): Enemy[] {
    const cands: { e: Enemy; d: number; score: number }[] = [];
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (t.def.damageClass && e.def.immune === t.def.damageClass) continue;
      if (!this.visibleTo(e, seesHidden)) continue;
      const d = dist(t, e);
      if (d > range) continue;
      cands.push({ e, d, score: this.targetScore(t.target, e, d) });
    }
    cands.sort((a, b) => b.score - a.score || a.e.id - b.e.id);
    return cands.slice(0, n).map((c) => c.e);
  }

  private targetScore(mode: TargetMode, e: Enemy, d: number): number {
    const remaining = this.paths[e.pathIndex].length - e.dist;
    switch (mode) {
      case 'first':
        return -remaining;
      case 'last':
        return remaining;
      case 'closest':
        return -d;
      case 'farthest':
        return d;
      case 'strongest':
        return e.hp + e.shield;
      case 'weakest':
        return -(e.hp + e.shield);
    }
  }

  /** One reply: hit the target, then the splash next to it, then the bounces. */
  private fire(t: Tower, target: Enemy, s: LiveTowerStats): void {
    const travel = dist(t, target) / SHOT_SPEED;
    const hit = new Set<Enemy>();
    this.hitOne(t, target, s, t.x, t.y, travel, 'reply', hit);
    let from: Enemy = target;
    let delay = travel;
    if (s.splash > 0) {
      const near = this.enemies
        .filter((e) => e.alive && !hit.has(e) && this.visibleTo(e, s.seesHidden) && Math.hypot(e.x - target.x, e.y - target.y) <= SPLASH_RADIUS)
        .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y) || a.id - b.id)
        .slice(0, s.splash);
      for (const e of near) this.hitOne(t, e, s, target.x, target.y, travel + 0.04, 'hop', hit);
    }
    for (let i = 0; i < s.bounce; i++) {
      let next: Enemy | null = null;
      let best = BOUNCE_RANGE;
      for (const e of this.enemies) {
        if (!e.alive || hit.has(e) || !this.visibleTo(e, s.seesHidden)) continue;
        if (t.def.damageClass && e.def.immune === t.def.damageClass) continue;
        const d = Math.hypot(e.x - from.x, e.y - from.y);
        if (d < best || (d === best && next !== null && e.id < next.id)) {
          best = d;
          next = e;
        }
      }
      if (!next) break;
      const hopTravel = best / SHOT_SPEED;
      this.hitOne(t, next, s, from.x, from.y, delay + hopTravel, 'hop', hit);
      delay += hopTravel;
      from = next;
    }
  }

  private hitOne(t: Tower, e: Enemy, s: LiveTowerStats, fx: number, fy: number, travel: number, kind: 'reply' | 'hop', hit: Set<Enemy>): void {
    hit.add(e);
    const amount = s.damage * (e.def.boss ? s.bossMult : 1);
    const { dealt, result } = this.damage(e, amount, t.def.damageClass);
    t.stats.damage += dealt;
    const killed = !e.alive;
    this.events.push({ t: 'shot', towerId: t.id, enemyId: e.id, fx, fy, tx: e.x, ty: e.y, travel, damage: dealt, result, killed, kind });
    if (killed) {
      t.stats.kills++;
      this.onKill(e, travel);
    }
  }

  /** Apply damage. One checkpoint for shields and immunities, so no damage source can skip them. */
  damage(e: Enemy, amount: number, cls?: string): { dealt: number; result: ShotResult } {
    if (!e.alive) return { dealt: 0, result: 'hit' };
    if (e.def.immune && cls === e.def.immune) return { dealt: 0, result: 'immune' };
    let dealt = 0;
    if (e.shield > 0) {
      if (e.def.shieldMinHit !== undefined && amount < e.def.shieldMinHit) return { dealt: 0, result: 'blocked' };
      const onShield = Math.min(e.shield, amount);
      e.shield -= onShield;
      dealt += onShield;
      amount -= onShield;
    }
    if (amount > 0) {
      const onHp = Math.min(e.hp, amount);
      e.hp -= amount;
      dealt += onHp;
    }
    if (e.def.boss) this.checkBossPhase(e);
    if (e.hp <= 1e-9) e.alive = false;
    return { dealt, result: 'hit' };
  }

  private checkBossPhase(e: Enemy): void {
    const b = e.def.boss!;
    const ratio = e.hp / e.maxHp;
    const want: 1 | 2 | 3 = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
    while (e.phase < want && e.hp > 1e-9) {
      e.phase = (e.phase + 1) as 2 | 3;
      this.callIn(e, b.addType, b.phaseBurst);
      this.events.push({ t: 'bossPhase', enemyId: e.id, phase: e.phase as 2 | 3, called: b.phaseBurst });
    }
  }

  /** Extra Coffee from tip jars around where a colleague went down, plus every franchise. */
  tipBonusAt(x: number, y: number): number {
    let local = 0;
    let everywhere = 0;
    for (const t of this.towers) {
      if (t.def.role !== 'economy') continue;
      const s = this.liveStats(t);
      if (s.tip > 0 && Math.hypot(t.x - x, t.y - y) <= s.range) local = Math.max(local, s.tip);
      everywhere += s.tipEverywhere;
    }
    return Math.min(MAX_TIP, local + everywhere);
  }

  private onKill(e: Enemy, delay: number): void {
    const reward = killReward(e.def) * killIncomeMult(this.waveIndex) * (1 + this.tipBonusAt(e.x, e.y));
    this.earn(reward);
    this.stats.coffeeFromKills += reward;
    this.stats.kills[e.type] = (this.stats.kills[e.type] ?? 0) + 1;
    this.score += 1;
    this.events.push({ t: 'kill', enemyId: e.id, type: e.type, x: e.x, y: e.y, reward, delay });
    if (e.def.split) {
      for (let i = 0; i < e.def.split.count; i++) {
        this.spawn(e.def.split.into, e.pathIndex, e.dist - 0.15 - 0.3 * i, true);
      }
      this.events.push({ t: 'split', parentId: e.id, type: e.def.split.into, count: e.def.split.count });
    }
  }
}
