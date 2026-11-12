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
import { parseGrid } from './grid';
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
/** Focus Music: how long stopped colleagues keep taking extra damage after the stop ends. */
export const VULNERABLE_AFTER = 1.5;
/** How close a colleague has to walk past a tack pile to step on it. */
export const PILE_RADIUS = 0.42;
/** A Thumbtacks tower keeps at most this many piles on the floor; the oldest goes first. */
export const MAX_PILES = 24;
/** Colleagues stop this far in front of a keyboard barrier. */
export const BARRIER_GAP = 0.3;
/** Office chair lanes: +x, +y, -x, -y. */
export const CHAIR_DIRS: readonly { x: number; y: number }[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

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
  /** Speed factor from a boss hurrying people along (The Cleaner). 1 = none. */
  haste: number;
  revealed: boolean;
  /** Extra damage from every hit while this lasts (Focus Music). */
  vulnerable: number;
  vulnerableTime: number;
  /** Stunned colleagues take this much more damage (Soundproof Booth). */
  stunnedTakes: number;
  /** Shredder damage that keeps going after leaving the zone (Sticky Paper). */
  bleedDps: number;
  bleedTime: number;
  bleedTower: number;
  /** Repeated stuns land shorter; recovers after a while without one. */
  stunFalloff: number;
  stunRecover: number;
  phase: 1 | 2 | 3;
  addTimer: number;
  /** The Baby: seconds until the next crying fit. */
  cryTimer: number;
  /** Spawned mid-route (split or boss add) rather than at the door. */
  isAdd: boolean;
  /** Seconds left standing at a gate, scanning a pass. */
  gateHold?: number;
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
  /** A Chatterbox is talking next to it: it does nothing this tick. */
  silenced: boolean;
  /** Why it is quiet: a Chatterbox, a crying Baby, or no internet. Null when it works. */
  quiet: 'chat' | 'cry' | 'net' | null;
  /** Seconds left of a crying fit it has to sit through. */
  hushed: number;
  /** Reload multiplier from Flow State headphones nearby (1 = none). */
  rateBuff: number;
  pulseTimer: number;
  /** Quick Reply: who it is building up on, and how far (1 = none yet). */
  rampTarget: number;
  ramp: number;
  /** Seconds left before a mopped Shredder zone works again (The Cleaner). */
  mopped: number;
  /** Office chair: lane direction (0 +x, 1 +y, 2 -x, 3 -y), how far out it is, which way it rolls
   * (1 out, -1 back, 0 resting), HP left this run, and who it already knocked this run. */
  dir: number;
  roll: number;
  rolling: number;
  chairHp: number;
  knocked: Set<number>;
  invested: number;
  /** Coffee each player put into this tower, so selling pays everyone back their own share. */
  paidBy: number[];
  placedAtWave: number;
  stats: TowerStats;
}

/** A pile of tacks on the walkway. Every tack hits one colleague; each colleague once per pile. */
export interface Pile {
  id: number;
  tower: number;
  x: number;
  y: number;
  pierce: number;
  maxPierce: number;
  life: number;
  hit: Set<number>;
}

/** Keyboard Smash: a keyboard across the walkway. Nobody passes until it is kicked away. */
export interface Barrier {
  id: number;
  tower: number;
  pathIndex: number;
  dist: number;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  hp: number;
  maxHp: number;
  time: number;
  thorns: number;
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
  global: boolean;
  stunOnHit: number;
  slow: number;
  slowTime: number;
  stun: number;
  /** Headphones: tiles each pulse pushes colleagues back (bosses a fifth). */
  knockback: number;
  vulnerable: number;
  stunnedTakes: number;
  buffRate: number;
  dot: number;
  bleed: number;
  unshared: boolean;
  stunPulse: Effect['stunPulse'] | null;
  hpPulse: Effect['hpPulse'] | null;
  killCoffee: number;
  waveIncome: number;
  silenceProof: boolean;
  /** Quick Reply: build-up per hit, its ceiling (0 = no build-up), and what is kept on a switch. */
  rampAdd: number;
  rampMax: number;
  rampKeep: number;
  slowOnHit: Effect['slowOnHit'] | null;
  /** Reply All: radius of the hit around the target. */
  aoe: number;
  /** Delegation: each jump hits this much harder than the last, and how far it jumps. */
  bounceMult: number;
  bounceRange: number;
  /** Thumbtacks: tacks per pile, seconds a pile lasts, piles per drop, and hits that ignore shields. */
  pierce: number;
  pileLife: number;
  piles: number;
  ignoresMinHit: boolean;
  /** Keyboard Smash: slam radius, barrier HP and seconds, damage to kickers, double smash. */
  smashRadius: number;
  barrierHp: number;
  barrierTime: number;
  barrierThorns: number;
  doubleSmash: boolean;
  /** Office chair: HP per run, roll speed, hits on the way back. */
  chairHp: number;
  rollSpeed: number;
  rollBack: boolean;
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
      /** 'reply' flies from the tower, 'hop' jumps from colleague to colleague, 'tack' is stepped on. */
      kind: 'reply' | 'hop' | 'tack';
    }
  | { t: 'kill'; enemyId: number; type: string; x: number; y: number; reward: number; delay: number }
  | { t: 'leak'; enemyId: number; type: string; focus: number }
  | { t: 'split'; parentId: number; type: string; count: number }
  | { t: 'coffee'; towerId: number; amount: number; x: number; y: number; toPot: boolean }
  | { t: 'claim'; towerId: number; amount: number; x: number; y: number }
  | { t: 'ability'; towerId: number; x: number; y: number; range: number; hits: number }
  | { t: 'pulse'; towerId: number; x: number; y: number; range: number; stun: boolean }
  | { t: 'salary'; amount: number; wave: number }
  | { t: 'wave'; index: number; total: number; boss: boolean; early: boolean; points: number }
  | { t: 'bossPhase'; enemyId: number; phase: 2 | 3; called: number }
  | { t: 'bossAdds'; enemyId: number; count: number }
  | { t: 'placed' | 'upgraded' | 'sold'; towerId: number; defId: string; player: number }
  | { t: 'gift'; from: number; to: number; amount: number }
  | { t: 'hazard'; kind: string; on: boolean; until: number }
  | { t: 'hazardSolved'; player: number; bonus: number }
  | { t: 'tacks'; towerId: number; pileId: number; x: number; y: number }
  | { t: 'swept'; enemyId: number; count: number }
  | { t: 'mopped'; towerId: number; enemyId: number }
  | { t: 'smash'; towerId: number; x: number; y: number; radius: number }
  | { t: 'chairRoll'; towerId: number }
  | { t: 'cry'; enemyId: number; x: number; y: number; radius: number }
  | { t: 'puff'; enemyId: number; x: number; y: number }
  | { t: 'gate'; enemyId: number; x: number; y: number }
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
  coffeeFromBonus: number;
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
  /** Multiplayer: only the one who built a tower may upgrade, sell or aim it (the default). */
  ownTowers?: boolean;
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
  /** Why it is quiet: 0 working, 1 a Chatterbox, 2 a crying Baby, 3 no internet. */
  sil: number;
  /** 1 while The Cleaner has mopped it. */
  mop: number;
  /** Office chair: direction, how far out, which way rolling. */
  dir: number;
  roll: number;
  rl: number;
}

/**
 * Everything a player's screen needs, sent by the multiplayer server about ten times a second.
 * Colleagues are packed as number arrays to keep it small:
 * [id, typeIndex, x, y, dirX, dirY, hp, maxHp, shield, maxShield, phase, isAdd, pathIndex, dist, stunned, slowed]
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
  /** Tack piles: [id, x, y, tacks left, tacks at the start]. */
  piles: number[][];
  /** Keyboard barriers: [id, x, y, dirX, dirY, hp, maxHp]. */
  barriers?: number[][];
  /** Smoke clouds: [x, y, radius, range left, seconds left]. */
  smoke?: number[][];
  stats: RoundStats;
  hz: { on: boolean; until: number; solved: number[] };
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

/**
 * Does this tower have to see a colleague to do anything? Everything that aims at someone does
 * (Office Artillery included); what works in a zone around itself does not: pulses, zones,
 * piles of thumbtacks, the rolling chair (the maker, v0.18.0).
 */
export function needsSight(def: TowerDef): boolean {
  return def.role === 'damage' || def.role === 'smash';
}

/**
 * The tile your chair stands on: right behind your desk, seen from the colleagues walking up to
 * it. Path, desk, chair, in one line (the maker's rule), so they always arrive at the front.
 */
export function chairTile(level: LevelDef): { x: number; y: number } {
  const pts = level.paths[0];
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  return { x: level.desk.x + Math.sign(b.x - a.x), y: level.desk.y + Math.sign(b.y - a.y) };
}

const TILE_BLOCKED = 1;
/** Seconds a colleague stands at a gate to scan their pass. */
export const GATE_HOLD = 0.4;
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
    targets: b.targets ?? 1,
    splash: 0,
    bounce: b.bounce ?? 0,
    seesHidden: false,
    bossMult: 1,
    slowAura: 1,
    ability: null,
    coffeeAmount: b.coffeeAmount ?? 0,
    coffeeInterval: b.coffeeInterval ?? 0,
    bank: null,
    tip: 0,
    tipEverywhere: 0,
    global: b.global ?? false,
    stunOnHit: 0,
    slow: b.slow ?? 1,
    slowTime: b.slowTime ?? 0,
    stun: b.stun ?? 0,
    knockback: 0,
    vulnerable: 0,
    stunnedTakes: 1,
    buffRate: 1,
    dot: b.dot ?? 0,
    bleed: 0,
    unshared: false,
    stunPulse: null,
    hpPulse: null,
    killCoffee: 0,
    waveIncome: 0,
    silenceProof: false,
    rampAdd: b.ramp?.add ?? 0,
    rampMax: b.ramp?.max ?? 0,
    rampKeep: 0,
    slowOnHit: null,
    aoe: b.aoe ?? 0,
    bounceMult: b.bounceMult ?? 1,
    bounceRange: BOUNCE_RANGE,
    pierce: b.pierce ?? 0,
    pileLife: b.pileLife ?? 0,
    piles: 1,
    ignoresMinHit: false,
    smashRadius: b.smashRadius ?? 0,
    barrierHp: b.barrierHp ?? 0,
    barrierTime: b.barrierTime ?? 0,
    barrierThorns: 0,
    doubleSmash: false,
    chairHp: b.chairHp ?? 0,
    rollSpeed: b.rollSpeed ?? 0,
    rollBack: false,
  };
  let radiusMult = 1;
  let aoeMult = 1;
  let bounceRangeMult = 1;
  let barrierHpMult = 1;
  let chairHpMult = 1;
  let speedMult = 1;
  let rangeAdd = 0;
  let pileLifeMult = 1;
  let dotAdd = 0;
  let dotMult = 1;
  for (const e of boughtEffects(def, tiers)) {
    dotAdd += e.dotAdd ?? 0;
    dotMult *= e.dotMult ?? 1;
    s.slowTime += e.slowTimeAdd ?? 0;
    s.vulnerable += e.vulnerableAdd ?? 0;
    s.killCoffee += e.killCoffee ?? 0;
    s.waveIncome += e.waveIncome ?? 0;
    if (e.slow !== undefined) s.slow = Math.min(s.slow, e.slow);
    if (e.stun !== undefined) s.stun = Math.max(s.stun, e.stun);
    if (e.knockback !== undefined) s.knockback = Math.max(s.knockback, e.knockback);
    if (e.stunOnHit !== undefined) s.stunOnHit = Math.max(s.stunOnHit, e.stunOnHit);
    if (e.stunnedTakes !== undefined) s.stunnedTakes = Math.max(s.stunnedTakes, e.stunnedTakes);
    if (e.buffRate !== undefined) s.buffRate = Math.min(s.buffRate, e.buffRate);
    if (e.bleed !== undefined) s.bleed = Math.max(s.bleed, e.bleed);
    if (e.unshared) s.unshared = true;
    if (e.silenceProof) s.silenceProof = true;
    s.rampAdd += e.rampAdd ?? 0;
    if (e.rampMax !== undefined) s.rampMax = Math.max(s.rampMax, e.rampMax);
    if (e.rampKeep !== undefined) s.rampKeep = Math.max(s.rampKeep, e.rampKeep);
    if (e.slowOnHit) s.slowOnHit = e.slowOnHit;
    s.pierce += e.pierceAdd ?? 0;
    s.piles += e.pilesAdd ?? 0;
    pileLifeMult *= e.pileLifeMult ?? 1;
    if (e.ignoresMinHit) s.ignoresMinHit = true;
    radiusMult *= e.radiusMult ?? 1;
    aoeMult *= e.aoeMult ?? 1;
    bounceRangeMult *= e.bounceRangeMult ?? 1;
    if (e.bounceMult !== undefined) s.bounceMult = Math.max(s.bounceMult, e.bounceMult);
    s.barrierHp += e.barrierHpAdd ?? 0;
    barrierHpMult *= e.barrierHpMult ?? 1;
    s.barrierTime += e.barrierTimeAdd ?? 0;
    s.barrierThorns = Math.max(s.barrierThorns, e.barrierThorns ?? 0);
    if (e.doubleSmash) s.doubleSmash = true;
    s.chairHp += e.chairHpAdd ?? 0;
    chairHpMult *= e.chairHpMult ?? 1;
    speedMult *= e.speedMult ?? 1;
    rangeAdd += e.rangeAdd ?? 0;
    if (e.rollBack) s.rollBack = true;
    if (e.stunPulse) s.stunPulse = e.stunPulse;
    if (e.hpPulse) s.hpPulse = e.hpPulse;
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
  s.dot = (s.dot + dotAdd) * dotMult;
  s.range = s.global ? Infinity : (s.range + rangeAdd) * rangeMult;
  s.smashRadius *= radiusMult;
  s.aoe *= aoeMult;
  s.bounceRange *= bounceRangeMult;
  s.barrierHp *= barrierHpMult;
  s.chairHp *= chairHpMult;
  s.rollSpeed *= speedMult;
  if (def.role === 'economy') s.coffeeInterval *= intervalMult;
  else s.interval *= intervalMult;
  s.coffeeAmount = (s.coffeeAmount + coffeeAdd) * coffeeMult;
  s.pileLife *= pileLifeMult;
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
  readonly ownTowers: boolean;

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
  piles: Pile[] = [];
  barriers: Barrier[] = [];
  /** Clouds of smoke on the floor: towers inside reach less far. */
  smoke: { x: number; y: number; r: number; mult: number; life: number }[] = [];
  events: GameEvent[] = [];
  stats: RoundStats;

  private pending: PendingSpawn[] = [];
  private seq = 0;
  private nextId = 1;
  private rng: Rng;
  private tiles: Uint8Array;
  private walls: Uint8Array | null = null;

  constructor(level: LevelDef, opts: GameOptions = {}) {
    this.level = level;
    this.seed = opts.seed ?? 1;
    this.rng = new Rng(this.seed);
    this.costMult = opts.costMult ?? 1;
    this.players = Math.max(1, Math.min(8, Math.floor(opts.players ?? 1)));
    this.sharedWallet = this.players === 1 || (opts.sharedWallet ?? true);
    this.ownTowers = this.players > 1 && (opts.ownTowers ?? true);
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
      coffeeFromBonus: 0,
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
    // Sight: walls and every piece of furniture (glass excepted). Towers that aim at someone
    // cannot see through them; see needsSight().
    const sight = new Uint8Array(level.size.w * level.size.h);
    if (level.grid) {
      // The grid decides: what you may build on, and what blocks sight.
      const g = parseGrid(level.grid, level.size.w, level.size.h);
      g.build.forEach((ok, i) => {
        if (!ok) this.tiles[i] |= TILE_BLOCKED;
      });
      sight.set(g.sight);
      this.gates = this.gatesOnPaths(g.gates);
    } else {
      for (const d of level.decor) {
        this.markRect(d.rect.x, d.rect.y, d.rect.w, d.rect.h, TILE_BLOCKED);
        for (let y = d.rect.y; y < d.rect.y + d.rect.h; y++) for (let x = d.rect.x; x < d.rect.x + d.rect.w; x++) if (this.inBounds(x, y)) sight[y * level.size.w + x] = 1;
      }
    }
    // Walls block building, and sight.
    for (const r of level.walls ?? []) {
      this.markRect(r.x, r.y, r.w, r.h, TILE_BLOCKED);
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (this.inBounds(x, y)) sight[y * level.size.w + x] = 1;
    }
    this.markRect(level.desk.x, level.desk.y, 1, 1, TILE_BLOCKED);
    // Your chair stands behind the desk, in line with the walkway: nobody builds on it.
    const chair = chairTile(level);
    this.markRect(chair.x, chair.y, 1, 1, TILE_BLOCKED);
    for (let ty = 0; ty < level.size.h; ty++) {
      for (let tx = 0; tx < level.size.w; tx++) {
        const c = { x: tx + 0.5, y: ty + 0.5 };
        if (this.paths.some((p) => p.distanceTo(c) < PATH_CLEARANCE)) this.tiles[ty * level.size.w + tx] |= TILE_PATH;
      }
    }
    // Whatever stands on the walkway (a speed gate) never hides the people walking through it.
    sight.forEach((v, i) => {
      if (v && this.tiles[i] & TILE_PATH) sight[i] = 0;
    });
    this.walls = sight.some((v) => v === 1) ? sight : null;
  }

  /** Gates, as a distance along each path that walks through them. */
  gates: { pathIndex: number; dist: number; x: number; y: number }[] = [];

  private gatesOnPaths(tiles: { x: number; y: number }[]): { pathIndex: number; dist: number; x: number; y: number }[] {
    const out: { pathIndex: number; dist: number; x: number; y: number }[] = [];
    for (const tile of tiles) {
      const c = { x: tile.x + 0.5, y: tile.y + 0.5 };
      this.paths.forEach((path, pathIndex) => {
        if (path.distanceTo(c) > 0.3) return;
        // The point on the path closest to the middle of the gate.
        let best = { d: 0, gap: Infinity };
        for (let d = 0; d <= path.length; d += 0.05) {
          const p = path.pointAt(d);
          const gap = Math.hypot(p.x - c.x, p.y - c.y);
          if (gap < best.gap) best = { d, gap };
        }
        out.push({ pathIndex, dist: best.d, x: c.x, y: c.y });
      });
    }
    return out;
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

  /** The Repair Guy is on the floor: no Coffee comes in at all. */
  get incomeBlocked(): boolean {
    return this.enemies.some((e) => e.alive && e.def.boss?.blocksIncome);
  }

  /** Income for the team: in a split game everyone gets an equal share. Returns what was paid. */
  private earn(amount: number): number {
    if (this.incomeBlocked) return 0;
    if (this.sharedWallet) this.wallets[0] += amount;
    else for (let i = 0; i < this.wallets.length; i++) this.wallets[i] += amount / this.players;
    return amount;
  }

  /** Income for one player (their own machine). Returns what was paid. */
  private earnFor(player: number, amount: number): number {
    if (this.incomeBlocked) return 0;
    this.wallets[this.walletIndex(player)] += amount;
    return amount;
  }

  /** Money that is not income (a sale, a claimed pot): never blocked. */
  private payTo(player: number, amount: number): void {
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

  isWall(tx: number, ty: number): boolean {
    return this.walls !== null && this.inBounds(tx, ty) && this.walls[ty * this.level.size.w + tx] === 1;
  }

  /** Can a tower at a see a colleague at b, or is there a wall or furniture in between? */
  lineOfSight(ax: number, ay: number, bx: number, by: number): boolean {
    if (!this.walls) return true;
    const d = Math.hypot(bx - ax, by - ay);
    const steps = Math.ceil(d / 0.2);
    for (let i = 1; i < steps; i++) {
      const k = i / steps;
      if (this.isWall(Math.floor(ax + (bx - ax) * k), Math.floor(ay + (by - ay) * k))) return false;
    }
    return true;
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

  /** May this player touch this tower? Own towers (the default): only who built it. Otherwise everyone. */
  canControl(t: Tower, player: number): boolean {
    return !this.ownTowers || t.owner === player;
  }

  liveStats(t: Tower): LiveTowerStats {
    const s = computeStats(t.def, t.tiers);
    const f = this.rangeFactor(t);
    if (f < 1) s.range *= f;
    return s;
  }

  /** Smoke (clouds, or a smoker standing close): towers reach this much of their range. */
  rangeFactor(t: { x: number; y: number }): number {
    let f = 1;
    for (const c of this.smoke) if (Math.hypot(t.x - c.x, t.y - c.y) <= c.r) f = Math.min(f, c.mult);
    for (const e of this.enemies) {
      const sm = e.def.boss?.smoke;
      if (sm && e.alive && this.onFloor(e) && Math.hypot(t.x - e.x, t.y - e.y) <= sm.radius) f = Math.min(f, sm.rangeMult);
    }
    return f;
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
    if (def.special && this.towers.some((t) => t.defId === defId && t.owner === player)) return { ok: false, reason: 'You only get one of these.', cost };
    if (this.hazardBlocks(player)) return { ok: false, reason: 'The projector first. Nobody can concentrate.', cost };
    if (!this.mayBuildAt(player, tx, ty)) return { ok: false, reason: 'That part of the office belongs to someone else.', cost };
    if (def.role !== 'economy' && !def.base.global) {
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
      silenced: false,
      quiet: null,
      hushed: 0,
      rateBuff: 1,
      pulseTimer: 0,
      rampTarget: 0,
      ramp: 1,
      mopped: 0,
      dir: 0,
      roll: 0,
      rolling: 0,
      chairHp: 0,
      knocked: new Set(),
      invested: check.cost,
      paidBy: this.paidList(player, check.cost),
      placedAtWave: this.waveIndex,
      stats: { damage: 0, kills: 0, shots: 0, coffee: 0 },
    };
    if (def.role === 'chair') t.dir = this.bestLane(t);
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
    t.paidBy[player] = (t.paidBy[player] ?? 0) + check.cost;
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
    // Everyone gets back their own share of what went in; a pot belongs to the owner.
    const back = sellValue(t.invested);
    const pot = value - back;
    let paidOut = 0;
    t.paidBy.forEach((paid, p) => {
      if (!paid || p === t.owner) return;
      const share = Math.floor((back * paid) / Math.max(1, t.invested));
      this.payTo(p, share);
      paidOut += share;
    });
    this.payTo(t.owner, back - paidOut + pot);
    this.stats.coffeeFromSales += value;
    this.stats.sold++;
    this.towers = this.towers.filter((x) => x !== t);
    this.events.push({ t: 'sold', towerId: t.id, defId: t.defId, player });
    return { ok: true, cost: -value };
  }

  /**
   * Expense Claim: empty the pot into your Coffee. An Offshore Account empties every pot of the
   * same owner at once.
   */
  claim(towerId: number, player = 0): Check {
    const t = this.tower(towerId);
    if (!t) return { ok: false, reason: 'No such tower.' };
    if (!this.canControl(t, player)) return { ok: false, reason: 'That is not your tower.' };
    const all = this.liveStats(t).bank?.claimAll === true;
    const pots = all ? this.towers.filter((x) => x.owner === t.owner && x.pot >= 1) : [t];
    let total = 0;
    for (const x of pots) {
      const amount = Math.floor(x.pot);
      if (amount <= 0) continue;
      x.pot -= amount;
      this.payTo(x.owner, amount);
      this.stats.coffeeFromBank += amount;
      x.stats.coffee += amount;
      total += amount;
      this.events.push({ t: 'claim', towerId: x.id, amount, x: x.x, y: x.y });
    }
    if (total <= 0) return { ok: false, reason: 'The pot is empty.' };
    return { ok: true, cost: -total };
  }

  /** A Smoke Break: Focus back, up to what you started with. Returns how much came back. */
  takeBreak(amount: number): number {
    if (this.over) return 0;
    const before = this.focus;
    this.focus = Math.min(this.startFocus, this.focus + amount);
    return this.focus - before;
  }

  /** The Offshore Account of this player, if they have one: it claims every pot of theirs at once. */
  claimAllTower(player: number): Tower | undefined {
    return this.towers.find((t) => t.owner === player && t.def.role === 'economy' && this.liveStats(t).bank?.claimAll === true);
  }

  /** Coffee waiting in all of a player's pots. */
  potsOf(player: number): number {
    return this.towers.reduce((sum, t) => sum + (t.owner === player ? Math.floor(t.pot) : 0), 0);
  }

  private paidList(player: number, amount: number): number[] {
    const list: number[] = [];
    list[player] = amount;
    return list;
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
        sil: !t.silenced ? 0 : t.quiet === 'cry' ? 2 : t.quiet === 'net' ? 3 : 1,
        mop: t.mopped > 0 ? 1 : 0,
        dir: t.dir,
        roll: r3(t.roll),
        rl: t.rolling,
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
        e.stunTime > 0 ? 1 : 0,
        e.slowTime > 0 || e.aura < 1 ? 1 : 0,
        e.revealed ? 1 : 0,
      ]),
      piles: this.piles.map((p) => [p.id, r3(p.x), r3(p.y), p.pierce, p.maxPierce]),
      barriers: this.barriers.map((b) => [b.id, r3(b.x), r3(b.y), r3(b.dirX), r3(b.dirY), r3(b.hp), r3(b.maxHp)]),
      smoke: this.smoke.map((c) => [r3(c.x), r3(c.y), r3(c.r), c.mult, r3(c.life)]),
      stats: this.stats,
      hz: { on: this.hazardOn, until: r3(this.hazardUntil), solved: [...this.hazardSolved] },
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
    this.hazardOn = s.hz.on;
    this.hazardUntil = s.hz.until;
    this.hazardSolved = [...s.hz.solved];
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
        silenced: false,
        quiet: null,
        hushed: 0,
        rateBuff: 1,
        pulseTimer: 0,
        rampTarget: 0,
        ramp: 1,
        mopped: 0,
        dir: 0,
        roll: 0,
        rolling: 0,
        chairHp: 0,
        knocked: new Set(),
        invested: 0,
        paidBy: [],
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
      t.silenced = ts.sil > 0;
      t.quiet = ts.sil === 2 ? 'cry' : ts.sil === 3 ? 'net' : ts.sil === 1 ? 'chat' : null;
      t.mopped = ts.mop === 1 ? 1 : 0;
      t.dir = ts.dir ?? 0;
      t.roll = ts.roll ?? 0;
      t.rolling = ts.rl ?? 0;
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
        slowTime: a[15] === 1 ? 0.5 : 0,
        stunTime: a[14] === 1 ? 0.5 : 0,
        aura: 1,
        haste: 1,
        revealed: a[16] === 1,
        vulnerable: 0,
        vulnerableTime: 0,
        stunnedTakes: 1,
        bleedDps: 0,
        bleedTime: 0,
        bleedTower: 0,
        stunFalloff: 1,
        stunRecover: 0,
        addTimer: 0,
        cryTimer: 0,
        spawnedAt: 0,
      };
    });
    this.piles = (s.piles ?? []).map((a) => ({ id: a[0], tower: 0, x: a[1], y: a[2], pierce: a[3], maxPierce: a[4], life: 1, hit: new Set<number>() }));
    this.smoke = (s.smoke ?? []).map((a) => ({ x: a[0], y: a[1], r: a[2], mult: a[3], life: a[4] }));
    this.barriers = (s.barriers ?? []).map((a) => ({ id: a[0], tower: 0, pathIndex: 0, dist: 0, x: a[1], y: a[2], dirX: a[3], dirY: a[4], hp: a[5], maxHp: a[6], time: 1, thorns: 0 }));
  }

  // ------------------------------------------------------------------ storingen (mini-games)

  hazardOn = false;
  hazardUntil = 0;
  hazardSolved: number[] = [];
  private hazardNext = Infinity;

  /** Is the mini-game open for this player (and so blocking them)? */
  hazardBlocks(player: number): boolean {
    return this.hazardOn && this.level.hazard?.type === 'projector' && !this.hazardSolved.includes(player);
  }

  /** Is there a mini-game waiting for this player (the projector, or getting back online)? */
  hazardOpenFor(player: number): boolean {
    const type = this.level.hazard?.type;
    return this.hazardOn && (type === 'projector' || type === 'nointernet') && !this.hazardSolved.includes(player);
  }

  /** Lunch break: everyone on the floor walks faster while it lasts. */
  get lunchHaste(): number {
    const hz = this.level.hazard;
    return this.hazardOn && hz?.type === 'lunch' ? hz.haste : 1;
  }

  /** A player solved the mini-game: Coffee for them, and it closes once everyone has. */
  solveHazard(player: number): Check {
    const hz = this.level.hazard;
    if (!hz || (hz.type !== 'projector' && hz.type !== 'nointernet') || !this.hazardOn) return { ok: false, reason: 'There is nothing to fix right now.' };
    if (this.hazardSolved.includes(player)) return { ok: false, reason: 'You already did your part.' };
    this.hazardSolved.push(player);
    const bonus = hz.reward + Math.max(0, Math.ceil(this.hazardUntil - this.time));
    const paid = this.earnFor(player, bonus);
    this.stats.coffeeFromBonus += paid;
    this.events.push({ t: 'hazardSolved', player, bonus: paid });
    if (this.hazardSolved.length >= this.players) this.endHazard();
    return { ok: true, cost: -paid };
  }

  private endHazard(): void {
    this.hazardOn = false;
    this.hazardNext = this.time + (this.level.hazard?.every ?? Infinity);
    this.events.push({ t: 'hazard', kind: this.level.hazard?.type ?? '', on: false, until: this.time });
  }

  private updateHazard(): void {
    const hz = this.level.hazard;
    if (!hz) return;
    if (this.hazardNext === Infinity && !this.hazardOn) this.hazardNext = hz.first;
    if (!this.hazardOn && this.time >= this.hazardNext) {
      if (hz.type === 'smoke') {
        // A gust of exhaust: clouds settle on random bits of the walkway.
        for (let i = 0; i < hz.clouds; i++) {
          const path = this.paths[i % this.paths.length];
          const p = path.pointAt(this.rng.range(path.length * 0.1, path.length * 0.9));
          this.smoke.push({ x: p.x, y: p.y, r: hz.radius, mult: hz.rangeMult, life: hz.window });
        }
      }
      if (hz.type === 'lunch') {
        // No lunch break during the boss: the day should be able to end.
        if (this.waveIndex >= this.totalWaves) {
          this.hazardNext = this.time + hz.every;
          return;
        }
        const pathIndex = Math.max(0, this.waveIndex - 1) % this.paths.length;
        let at = this.time;
        for (const g of parseWave(hz.swarm)) {
          for (let i = 0; i < g.count; i++) {
            this.pending.push({ at, seq: this.seq++, type: g.type, pathIndex });
            at += g.interval;
          }
        }
        this.pending.sort((a, b) => a.at - b.at || a.seq - b.seq);
      }
      this.hazardOn = true;
      this.hazardUntil = this.time + hz.window;
      this.hazardSolved = [];
      this.events.push({ t: 'hazard', kind: hz.type, on: true, until: this.hazardUntil });
    } else if (this.hazardOn && this.time >= this.hazardUntil) {
      this.endHazard();
    }
  }

  // ------------------------------------------------------------------ the loop

  step(dt = TICK): void {
    if (this.phase !== 'running') return;
    this.time += dt;
    this.updateHazard();
    this.spawnDue();
    this.updateBosses(dt);
    this.updateAuras();
    this.updateTowers(dt);
    this.moveEnemies(dt);
    this.updatePiles(dt);
    this.updateBarriers(dt);
    if (this.smoke.length) {
      for (const c of this.smoke) c.life -= dt;
      this.smoke = this.smoke.filter((c) => c.life > 0);
    }
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

  /** Start of a wave: Expense Claim deposits and interest, and Supply Drops. Blocked by the Repair Guy. */
  private payInterest(): void {
    if (this.incomeBlocked) return;
    for (const t of this.towers) {
      const s = this.liveStats(t);
      if (s.bank) t.pot = Math.min(s.bank.cap, (t.pot + s.bank.perWave) * (1 + s.bank.interest));
      if (s.waveIncome > 0) {
        this.earnFor(t.owner, s.waveIncome);
        this.stats.coffeeFromMachines += s.waveIncome;
        t.stats.coffee += s.waveIncome;
        this.events.push({ t: 'coffee', towerId: t.id, amount: s.waveIncome, x: t.x, y: t.y, toPot: false });
      }
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
      haste: 1,
      revealed: false,
      vulnerable: 0,
      vulnerableTime: 0,
      stunnedTakes: 1,
      bleedDps: 0,
      bleedTime: 0,
      bleedTower: 0,
      stunFalloff: 1,
      stunRecover: 0,
      phase: 1,
      addTimer: 4,
      cryTimer: def.boss?.cry?.every ?? def.boss?.smoke?.cloudEvery ?? 0,
      isAdd,
      spawnedAt: this.time,
    };
    this.enemies.push(e);
    this.events.push({ t: 'spawn', enemyId: e.id });
    return e;
  }

  private speedOf(e: Enemy): number {
    if (e.stunTime > 0) return 0;
    // The Chatterbox ignores every slow; only a proper stun stops him.
    const slowable = !e.def.stunOnlyFrom;
    let s = e.def.speed * (slowable ? e.aura : 1);
    if (e.slowTime > 0 && slowable) s *= e.slowMult;
    if (e.def.boss && e.phase >= 3) s *= e.def.boss.phase3Speed;
    return s * e.haste * this.lunchHaste;
  }

  private moveEnemies(dt: number): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.stunTime > 0) e.stunTime = Math.max(0, e.stunTime - dt);
      else if ((e.stunRecover -= dt) <= 0) e.stunFalloff = 1;
      if (e.slowTime > 0) e.slowTime = Math.max(0, e.slowTime - dt);
      if (e.vulnerableTime > 0 && (e.vulnerableTime -= dt) <= 0) e.vulnerable = 0;
      if (e.bleedTime > 0) {
        // Sticky Paper: the shredder's damage keeps going after the zone.
        e.bleedTime -= dt;
        const owner = this.tower(e.bleedTower);
        const { dealt } = this.damage(e, e.bleedDps * dt, 'in_person', false);
        if (owner) owner.stats.damage += dealt;
        if (!e.alive) {
          if (owner) owner.stats.kills++;
          this.onKill(e, 0, owner);
          continue;
        }
      }
      const path = this.paths[e.pathIndex];
      // Scanning a pass at a gate: stand still until it beeps.
      if (e.gateHold && e.gateHold > 0) {
        e.gateHold = Math.max(0, e.gateHold - dt);
        continue;
      }
      let next = e.dist + this.speedOf(e) * dt;
      for (const g of this.gates) {
        if (g.pathIndex === e.pathIndex && e.dist < g.dist && next >= g.dist) {
          next = g.dist;
          e.gateHold = GATE_HOLD;
          this.events.push({ t: 'gate', enemyId: e.id, x: g.x, y: g.y });
        }
      }
      // A keyboard across the walkway: stop in front of it and kick it until it gives.
      for (const b of this.barriers) {
        if (b.pathIndex !== e.pathIndex || b.hp <= 0) continue;
        const stop = b.dist - BARRIER_GAP;
        if (e.dist <= stop + 1e-6 && next > stop) {
          next = Math.max(e.dist, stop);
          b.hp -= (e.def.boss ? 25 : Math.max(1, e.def.focus)) * dt;
          if (b.thorns > 0) {
            const owner = this.tower(b.tower);
            const { dealt } = this.damage(e, b.thorns * dt, 'in_person', false);
            if (owner) owner.stats.damage += dealt;
            if (!e.alive) {
              if (owner) owner.stats.kills++;
              this.onKill(e, 0, owner);
              break;
            }
          }
        }
      }
      if (!e.alive) continue;
      e.dist = next;
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

  /**
   * Everything that works by standing near something, recomputed every tick:
   * slowing auras (Legal Hold, Party Mode), faster reloads (Flow State), and the Chatterbox
   * silencing every tower around him unless he is stunned.
   */
  private updateAuras(): void {
    const slows: { x: number; y: number; r: number; f: number }[] = [];
    const buffs: { x: number; y: number; r: number; f: number; id: number }[] = [];
    for (const t of this.towers) {
      if (t.def.role === 'economy') continue;
      const s = this.liveStats(t);
      if (s.slowAura < 1) slows.push({ x: t.x, y: t.y, r: s.range, f: s.slowAura });
      if (s.buffRate < 1) buffs.push({ x: t.x, y: t.y, r: s.range, f: s.buffRate, id: t.id });
    }
    const hurry = this.enemies.filter((e) => e.alive && e.def.boss?.haste);
    for (const e of this.enemies) {
      let f = 1;
      for (const a of slows) if (Math.hypot(e.x - a.x, e.y - a.y) <= a.r) f = Math.min(f, a.f);
      e.aura = f;
      let h = 1;
      for (const b of hurry) {
        const hz = b.def.boss!.haste!;
        if (b !== e && Math.hypot(e.x - b.x, e.y - b.y) <= hz.radius) h = Math.max(h, hz.mult);
      }
      e.haste = h;
    }
    const talkers = this.enemies.filter((e) => e.alive && e.def.silence && e.stunTime <= 0);
    const offline = this.hazardOn && this.level.hazard?.type === 'nointernet';
    // Your Line Manager's last phase: towers near him reload slower.
    const nags = this.enemies.filter((e) => e.alive && e.def.boss?.towerSlow && e.phase >= e.def.boss.towerSlow.fromPhase);
    for (const t of this.towers) {
      let r = 1;
      for (const b of buffs) if (b.id !== t.id && Math.hypot(t.x - b.x, t.y - b.y) <= b.r) r = Math.min(r, b.f);
      for (const n of nags) {
        const ts = n.def.boss!.towerSlow!;
        if (Math.hypot(t.x - n.x, t.y - n.y) <= ts.radius) r *= ts.mult;
      }
      t.rateBuff = r;
      // Quiet for one of three reasons. Coffee Machines never are.
      t.quiet = null;
      if (t.def.role !== 'economy') {
        const proof = this.liveStats(t).silenceProof;
        if (!proof && talkers.some((e) => Math.hypot(e.x - t.x, e.y - t.y) <= e.def.silence!)) t.quiet = 'chat';
        else if (!proof && t.hushed > 0) t.quiet = 'cry';
        else if (offline && t.def.damageClass === 'written' && !this.hazardSolved.includes(t.owner)) t.quiet = 'net';
      }
      t.silenced = t.quiet !== null;
    }
  }

  /** A stun from a tower: bosses resist, repeats land shorter, the Chatterbox only fears headphones. */
  private stunEnemy(e: Enemy, duration: number, from: Tower, takes = 1): boolean {
    if (e.def.stunOnlyFrom && e.def.stunOnlyFrom !== from.defId) return false;
    const d = duration * (e.def.stunResist ?? 1) * e.stunFalloff;
    if (d <= 0.02) return false;
    const already = e.stunTime > 0;
    e.stunTime = Math.max(e.stunTime, d);
    e.stunFalloff = Math.max(0.15, e.stunFalloff * 0.5);
    e.stunRecover = 5;
    e.stunnedTakes = already ? Math.max(e.stunnedTakes, takes) : takes;
    return true;
  }

  private slowEnemy(e: Enemy, mult: number, duration: number): void {
    if (e.def.stunOnlyFrom || duration <= 0) return;
    if (e.slowTime <= 0 || mult <= e.slowMult) e.slowMult = mult;
    e.slowTime = Math.max(e.slowTime, duration);
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
      if (b.sweep && this.onFloor(e)) this.sweep(e, b.sweep);
      if (b.smoke && this.onFloor(e) && (e.cryTimer -= dt) <= 0) {
        // The Smoking Colleague leaves a cloud wherever he stops for a puff.
        e.cryTimer = b.smoke.cloudEvery;
        this.smoke.push({ x: e.x, y: e.y, r: b.smoke.cloudRadius, mult: b.smoke.rangeMult, life: b.smoke.cloudTime });
        this.events.push({ t: 'puff', enemyId: e.id, x: e.x, y: e.y });
      }
      if (b.cry && this.onFloor(e) && (e.cryTimer -= dt) <= 0) {
        // A crying fit: every tower nearby has to stop and look. Noise Cancelling does not hear it.
        e.cryTimer = b.cry.every;
        for (const t of this.towers) {
          if (t.def.role === 'economy' || Math.hypot(t.x - e.x, t.y - e.y) > b.cry.radius || this.liveStats(t).silenceProof) continue;
          t.hushed = Math.max(t.hushed, b.cry.duration);
        }
        this.events.push({ t: 'cry', enemyId: e.id, x: e.x, y: e.y, radius: b.cry.radius });
      }
      if (b.addCount <= 0) continue;
      if (b.addsFromPhase && e.phase < b.addsFromPhase) continue;
      e.addTimer -= dt;
      if (e.addTimer <= 0) {
        e.addTimer += b.addEvery;
        this.callIn(e, b.addType, b.addCount);
        this.events.push({ t: 'bossAdds', enemyId: e.id, count: b.addCount });
      }
    }
  }

  /** The Cleaner: tack piles near him are swept up, Shredder zones he walks into are mopped. */
  private sweep(boss: Enemy, sw: { radius: number; mopTime: number }): void {
    const before = this.piles.length;
    this.piles = this.piles.filter((p) => Math.hypot(p.x - boss.x, p.y - boss.y) > sw.radius);
    if (this.piles.length < before) this.events.push({ t: 'swept', enemyId: boss.id, count: before - this.piles.length });
    for (const t of this.towers) {
      if (t.def.role !== 'zone') continue;
      if (Math.hypot(t.x - boss.x, t.y - boss.y) > this.liveStats(t).range + 0.2) continue;
      if (t.mopped <= 0) this.events.push({ t: 'mopped', towerId: t.id, enemyId: boss.id });
      t.mopped = sw.mopTime;
    }
  }

  private callIn(boss: Enemy, type: string, count: number): void {
    const at = boss.def.boss?.addsAt;
    // The Presenter beams his slides at your desk; everyone else calls people in next to him.
    const from = at !== undefined ? this.paths[boss.pathIndex].length * at : boss.dist;
    for (let i = 0; i < count; i++) {
      this.spawn(type, boss.pathIndex, from - 0.35 * (i + 1) - this.rng.range(0, 0.15), true);
    }
  }

  // ------------------------------------------------------------------ towers

  private updateTowers(dt: number): void {
    // Shredder zones reveal hidden colleagues; recomputed every tick.
    for (const e of this.enemies) e.revealed = false;
    for (const t of this.towers) {
      if (t.mopped > 0) t.mopped = Math.max(0, t.mopped - dt);
      if (t.hushed > 0) t.hushed = Math.max(0, t.hushed - dt);
      if (t.def.role === 'zone' && !t.silenced && t.mopped <= 0) {
        const r = this.liveStats(t).range;
        for (const e of this.enemies) if (Math.hypot(e.x - t.x, e.y - t.y) <= r) e.revealed = true;
      }
    }
    for (const t of this.towers) {
      const s = this.liveStats(t);
      if (t.def.role === 'economy') {
        t.coffeeTimer += dt;
        if (t.coffeeTimer >= s.coffeeInterval) {
          t.coffeeTimer -= s.coffeeInterval;
          if (this.incomeBlocked) continue;
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
      if (t.silenced) continue;
      if (t.def.role === 'pulse') {
        this.updatePulse(t, s, dt);
        continue;
      }
      if (t.def.role === 'zone') {
        if (t.mopped <= 0) this.updateZone(t, s, dt);
        continue;
      }
      if (t.def.role === 'trap') {
        this.updateTrap(t, s, dt);
        continue;
      }
      if (t.def.role === 'smash') {
        this.updateSmash(t, s, dt);
        continue;
      }
      if (t.def.role === 'chair') {
        this.updateChair(t, s, dt);
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
      if (s.rampMax > 0) {
        // Quick Reply: the build-up belongs to the first target; switching costs most of it.
        const first = targets[0];
        if (t.rampTarget !== first.id) {
          t.ramp = 1 + (t.ramp - 1) * s.rampKeep;
          t.rampTarget = first.id;
        }
        this.fire(t, first, s, t.ramp);
        t.ramp = Math.min(s.rampMax, t.ramp + s.rampAdd);
        for (const e of targets.slice(1)) this.fire(t, e, s);
      } else {
        for (const e of targets) this.fire(t, e, s);
      }
      t.stats.shots++;
      const interval = s.interval * t.rateBuff;
      t.cooldown += interval;
      if (t.cooldown < 0) t.cooldown = interval;
    }
  }

  /** Thumbtacks: every so often, drop a pile (or two) somewhere on the walkway in range. */
  private updateTrap(t: Tower, s: LiveTowerStats, dt: number): void {
    t.cooldown -= dt;
    if (t.cooldown > 0) return;
    const spots = this.walkwayInRange(t, s.range);
    if (spots.length === 0) {
      t.cooldown = 0;
      return;
    }
    for (let i = 0; i < s.piles; i++) {
      const spot = this.trapSpot(t, spots);
      const pile: Pile = { id: this.nextId++, tower: t.id, x: spot.x, y: spot.y, pierce: s.pierce, maxPierce: s.pierce, life: s.pileLife, hit: new Set() };
      this.piles.push(pile);
      this.events.push({ t: 'tacks', towerId: t.id, pileId: pile.id, x: pile.x, y: pile.y });
    }
    const mine = this.piles.filter((p) => p.tower === t.id);
    if (mine.length > MAX_PILES) {
      const drop = new Set(mine.slice(0, mine.length - MAX_PILES).map((p) => p.id));
      this.piles = this.piles.filter((p) => !drop.has(p.id));
    }
    t.stats.shots++;
    const interval = s.interval * t.rateBuff;
    t.cooldown += interval;
    if (t.cooldown < 0) t.cooldown = interval;
  }

  private walkwayCache = new Map<string, { x: number; y: number; left: number; d: number }[]>();

  /** Points on the walkway (on the floor) within range of a tower, every quarter tile. */
  private walkwayInRange(t: Tower, range: number): { x: number; y: number; left: number; d: number }[] {
    const key = `${t.tx},${t.ty},${range}`;
    let pts = this.walkwayCache.get(key);
    if (!pts) {
      pts = [];
      const { w, h } = this.level.size;
      for (const path of this.paths) {
        for (let d = 0; d <= path.length; d += 0.25) {
          const p = path.pointAt(d);
          if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) continue;
          const dd = Math.hypot(p.x - t.x, p.y - t.y);
          if (dd <= range) pts.push({ x: p.x, y: p.y, left: path.length - d, d: dd });
        }
      }
      this.walkwayCache.set(key, pts);
    }
    return pts;
  }

  /** Where the next pile lands: the targeting mode picks a third of the walkway, then a random spot in it. */
  private trapSpot(t: Tower, spots: { x: number; y: number; left: number; d: number }[]): { x: number; y: number } {
    const score: Record<TargetMode, ((p: (typeof spots)[number]) => number) | null> = {
      first: (p) => -p.left,
      last: (p) => p.left,
      closest: (p) => -p.d,
      farthest: (p) => p.d,
      strongest: null,
      weakest: null,
    };
    const f = score[t.target];
    let pool = spots;
    if (f) {
      pool = [...spots].sort((a, b) => f(b) - f(a));
      pool = pool.slice(0, Math.max(1, Math.ceil(pool.length / 3)));
    }
    const p = pool[Math.floor(this.rng.next() * pool.length) % pool.length];
    // A little scatter, so piles do not stack on the exact same spot.
    return { x: p.x + this.rng.range(-0.12, 0.12), y: p.y + this.rng.range(-0.12, 0.12) };
  }

  /** Colleagues stepping on tacks. Tacks do not need to see anyone. */
  private updatePiles(dt: number): void {
    if (this.piles.length === 0) return;
    for (const p of this.piles) {
      p.life -= dt;
      if (p.life <= 0 || p.pierce <= 0) continue;
      const t = this.tower(p.tower);
      if (!t) {
        p.pierce = 0;
        continue;
      }
      const s = this.liveStats(t);
      for (const e of this.enemies) {
        if (p.pierce <= 0) break;
        if (!e.alive || p.hit.has(e.id) || !this.onFloor(e)) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) > PILE_RADIUS) continue;
        p.hit.add(e.id);
        if (e.def.immune === t.def.damageClass) continue;
        p.pierce--;
        const amount = s.damage * (e.def.boss ? s.bossMult : 1);
        const { dealt, result } = this.damage(e, amount, t.def.damageClass, true, s.ignoresMinHit);
        t.stats.damage += dealt;
        const killed = !e.alive;
        if (!killed && result === 'hit' && s.stunOnHit > 0) this.stunEnemy(e, s.stunOnHit, t);
        if (!killed && result === 'hit' && s.slowOnHit) this.slowEnemy(e, s.slowOnHit.mult, s.slowOnHit.time);
        this.events.push({ t: 'shot', towerId: t.id, enemyId: e.id, fx: p.x, fy: p.y, tx: e.x, ty: e.y, travel: 0, damage: dealt, result, killed, kind: 'tack' });
        if (killed) {
          t.stats.kills++;
          this.onKill(e, 0, t);
        }
      }
    }
    this.piles = this.piles.filter((p) => p.life > 0 && p.pierce > 0);
  }

  /** Keyboard Smash: slam in front of the first colleague, then leave the keyboard there. */
  private updateSmash(t: Tower, s: LiveTowerStats, dt: number): void {
    // Autorepeat: the second smash half a second after the first.
    if (t.pulseTimer > 0 && (t.pulseTimer -= dt) <= 0) {
      const again = this.pickTargets(t, s.range, 1, true)[0];
      if (again) this.slam(t, s, again);
    }
    t.cooldown -= dt;
    if (t.cooldown > 0) return;
    const target = this.pickTargets(t, s.range, 1, true)[0];
    if (!target) {
      t.cooldown = 0;
      return;
    }
    this.slam(t, s, target);
    if (s.doubleSmash) t.pulseTimer = 0.5;
    t.stats.shots++;
    t.cooldown = s.interval * t.rateBuff;
  }

  private slam(t: Tower, s: LiveTowerStats, target: Enemy): void {
    const cx = target.x;
    const cy = target.y;
    for (const e of [...this.enemies]) {
      if (!e.alive || !this.onFloor(e) || Math.hypot(e.x - cx, e.y - cy) > s.smashRadius) continue;
      const { dealt, result } = this.damage(e, s.damage * (e.def.boss ? s.bossMult : 1), t.def.damageClass, true, s.ignoresMinHit);
      t.stats.damage += dealt;
      const killed = !e.alive;
      if (!killed && result === 'hit' && s.stunOnHit > 0) this.stunEnemy(e, s.stunOnHit, t);
      this.events.push({ t: 'shot', towerId: t.id, enemyId: e.id, fx: cx, fy: cy, tx: e.x, ty: e.y, travel: 0, damage: dealt, result, killed, kind: 'tack' });
      if (killed) {
        t.stats.kills++;
        this.onKill(e, 0, t);
      }
    }
    this.events.push({ t: 'smash', towerId: t.id, x: cx, y: cy, radius: s.smashRadius });
    // The keyboard lands just ahead of where it hit. One keyboard per tower.
    const path = this.paths[target.pathIndex];
    const dist = Math.min(path.length - 0.6, target.dist + 0.6);
    const pt = path.pointAt(dist);
    this.barriers = this.barriers.filter((b) => b.tower !== t.id);
    this.barriers.push({
      id: this.nextId++,
      tower: t.id,
      pathIndex: target.pathIndex,
      dist,
      x: pt.x,
      y: pt.y,
      dirX: pt.dirX,
      dirY: pt.dirY,
      hp: s.barrierHp,
      maxHp: s.barrierHp,
      time: s.barrierTime,
      thorns: s.barrierThorns,
    });
  }

  private updateBarriers(dt: number): void {
    if (this.barriers.length === 0) return;
    for (const b of this.barriers) b.time -= dt;
    this.barriers = this.barriers.filter((b) => b.hp > 0 && b.time > 0 && this.tower(b.tower));
  }

  /** How far the chair can roll from its tile in its direction before it hits a wall. */
  laneLength(t: Tower, range: number): number {
    const d = CHAIR_DIRS[t.dir];
    const { w, h } = this.level.size;
    let room = d.x > 0 ? w - t.x : d.x < 0 ? t.x : d.y > 0 ? h - t.y : t.y;
    // A wall stops it too.
    if (this.walls) {
      for (let k = 0.5; k < room; k += 0.25) {
        if (this.isWall(Math.floor(t.x + d.x * k), Math.floor(t.y + d.y * k))) {
          room = k;
          break;
        }
      }
    }
    return Math.max(0, Math.min(range, room - 0.3));
  }

  private inLane(t: Tower, e: { x: number; y: number }, length: number): boolean {
    const d = CHAIR_DIRS[t.dir];
    const ax = e.x - t.x;
    const ay = e.y - t.y;
    const along = ax * d.x + ay * d.y;
    const side = Math.abs(ax * d.y - ay * d.x);
    return along > 0.3 && along <= length + 0.3 && side <= 0.55;
  }

  /** The lane that crosses the most walkway: where a new chair points until you turn it. */
  private bestLane(t: Tower): number {
    const range = computeStats(t.def, t.tiers).range;
    let best = 0;
    let bestCount = -1;
    for (let dir = 0; dir < 4; dir++) {
      t.dir = dir;
      const length = this.laneLength(t, range);
      let count = 0;
      for (const path of this.paths) for (let d = 0; d <= path.length; d += 0.25) if (this.inLane(t, path.pointAt(d), length)) count++;
      if (count > bestCount) {
        best = dir;
        bestCount = count;
      }
    }
    return best;
  }

  /** Where a chair placed on this tile would roll: the best lane and its length. */
  chairLaneAt(defId: string, tx: number, ty: number): { dir: number; length: number } {
    const def = TOWERS[defId];
    const probe = { x: tx + 0.5, y: ty + 0.5, dir: 0, def, tiers: [0, 0, 0] } as unknown as Tower;
    const dir = this.bestLane(probe);
    probe.dir = dir;
    return { dir, length: this.laneLength(probe, computeStats(def, [0, 0, 0]).range) };
  }

  /** Turn the chair. A run in progress is called off. */
  setDir(towerId: number, dir: number, player = 0): Check {
    const t = this.tower(towerId);
    if (!t || t.def.role !== 'chair') return { ok: false, reason: 'Only the chair can be turned.' };
    if (!this.canControl(t, player)) return { ok: false, reason: 'That is not your tower.' };
    if (!Number.isInteger(dir) || dir < 0 || dir > 3) return { ok: false, reason: 'No such direction.' };
    t.dir = dir;
    t.roll = 0;
    t.rolling = 0;
    t.cooldown = Math.min(t.cooldown, 0.5);
    return { ok: true };
  }

  /** The office chair: wait, roll out knocking into colleagues, roll back, repeat. */
  private updateChair(t: Tower, s: LiveTowerStats, dt: number): void {
    const length = this.laneLength(t, s.range);
    if (t.rolling === 0) {
      t.cooldown -= dt;
      if (t.cooldown > 0) return;
      // Only bother when somebody is in the lane.
      if (!this.enemies.some((e) => e.alive && this.onFloor(e) && this.inLane(t, e, length))) {
        t.cooldown = 0;
        return;
      }
      t.rolling = 1;
      t.roll = 0;
      t.chairHp = s.chairHp;
      t.knocked.clear();
      t.stats.shots++;
      this.events.push({ t: 'chairRoll', towerId: t.id });
    }
    const step = s.rollSpeed * dt;
    if (t.rolling === 1) {
      t.roll = Math.min(length, t.roll + step);
      this.knock(t, s);
      if (t.chairHp <= 0 || t.roll >= length) {
        t.rolling = -1;
        t.knocked.clear();
      }
    } else {
      t.roll = Math.max(0, t.roll - step);
      if (s.rollBack && t.chairHp > 0) this.knock(t, s);
      if (t.roll <= 0) {
        t.rolling = 0;
        t.cooldown = s.interval * t.rateBuff;
      }
    }
  }

  /** Every colleague the chair runs into: it deals damage and loses as much HP itself. */
  private knock(t: Tower, s: LiveTowerStats): void {
    const d = CHAIR_DIRS[t.dir];
    const cx = t.x + d.x * t.roll;
    const cy = t.y + d.y * t.roll;
    for (const e of [...this.enemies]) {
      if (t.chairHp <= 0) break;
      if (!e.alive || t.knocked.has(e.id) || !this.onFloor(e) || Math.hypot(e.x - cx, e.y - cy) > 0.5) continue;
      t.knocked.add(e.id);
      if (e.def.immune === t.def.damageClass) continue;
      const amount = Math.min(s.damage * (e.def.boss ? s.bossMult : 1), t.chairHp);
      const { dealt, result } = this.damage(e, amount, t.def.damageClass, true, s.ignoresMinHit);
      t.chairHp -= result === 'blocked' ? amount : Math.max(dealt, 1);
      t.stats.damage += dealt;
      const killed = !e.alive;
      if (!killed && result === 'hit') {
        if (s.stunOnHit > 0) this.stunEnemy(e, s.stunOnHit, t);
        if (s.knockback > 0) {
          e.dist = Math.max(0, e.dist - s.knockback * (e.def.boss ? 0.2 : 1));
          const pt = this.paths[e.pathIndex].pointAt(e.dist);
          e.x = pt.x;
          e.y = pt.y;
        }
      }
      this.events.push({ t: 'shot', towerId: t.id, enemyId: e.id, fx: cx, fy: cy, tx: e.x, ty: e.y, travel: 0, damage: dealt, result, killed, kind: 'tack' });
      if (killed) {
        t.stats.kills++;
        this.onKill(e, 0, t);
      }
    }
  }

  /** Headphones: every few seconds, everyone in range slows (or is stunned), no damage. */
  private updatePulse(t: Tower, s: LiveTowerStats, dt: number): void {
    t.pulseTimer -= dt;
    if (t.pulseTimer > 0) return;
    const inRange = this.enemies.filter((e) => e.alive && this.onFloor(e) && Math.hypot(e.x - t.x, e.y - t.y) <= s.range);
    if (inRange.length === 0) {
      t.pulseTimer = 0;
      return;
    }
    let stunned = 0;
    for (const e of inRange) {
      if (s.slow < 1) this.slowEnemy(e, s.slow, s.slowTime);
      if (s.stun > 0 && this.stunEnemy(e, s.stun, t, s.stunnedTakes)) stunned++;
      if (s.vulnerable > 0 && !e.def.stunOnlyFrom) {
        e.vulnerable = Math.max(e.vulnerable, s.vulnerable);
        e.vulnerableTime = Math.max(e.vulnerableTime, s.stun + VULNERABLE_AFTER);
      }
      if (s.knockback > 0) {
        // Drop the Bass: back towards the door. Bosses barely budge.
        const path = this.paths[e.pathIndex];
        e.dist = Math.max(0, e.dist - s.knockback * (e.def.boss ? 0.2 : 1));
        const pt = path.pointAt(e.dist);
        e.x = pt.x;
        e.y = pt.y;
      }
      if (s.seesHidden) e.revealed = true;
    }
    t.stats.shots++;
    t.pulseTimer = s.interval * t.rateBuff;
    this.events.push({ t: 'pulse', towerId: t.id, x: t.x, y: t.y, range: s.range, stun: stunned > 0 });
  }

  /** The Shredder: slows and damages everyone inside. Damage is shared out unless upgraded. */
  private updateZone(t: Tower, s: LiveTowerStats, dt: number): void {
    const inside = this.enemies.filter(
      (e) => e.alive && this.onFloor(e) && !e.def.zoneProof && e.def.immune !== t.def.damageClass && Math.hypot(e.x - t.x, e.y - t.y) <= s.range,
    );
    if (inside.length > 0) {
      const each = s.unshared ? s.dot : s.dot / inside.length;
      for (const e of inside) {
        // Only a jammed Shredder slows; Paper Trail makes it linger after the zone.
        if (s.slow < 1) this.slowEnemy(e, s.slow, Math.max(0.25, s.slowTime));
        if (s.bleed > 0) {
          e.bleedDps = Math.max(e.bleedDps, each);
          e.bleedTime = s.bleed;
          e.bleedTower = t.id;
        }
        const { dealt } = this.damage(e, each * dt, t.def.damageClass, false);
        t.stats.damage += dealt;
        if (!e.alive) {
          t.stats.kills++;
          this.onKill(e, 0, t);
        }
      }
    }
    t.pulseTimer += dt;
    t.abilityTimer += dt;
    if (s.stunPulse && t.pulseTimer >= s.stunPulse.every) {
      if (inside.length > 0) {
        t.pulseTimer = 0;
        for (const e of inside) if (e.alive) this.stunEnemy(e, s.stunPulse.duration, t);
        this.events.push({ t: 'pulse', towerId: t.id, x: t.x, y: t.y, range: s.range, stun: true });
      } else t.pulseTimer = s.stunPulse.every;
    }
    if (s.hpPulse && t.abilityTimer >= s.hpPulse.every) {
      const live = inside.filter((e) => e.alive);
      if (live.length > 0) {
        t.abilityTimer = 0;
        for (const e of live) {
          const share = e.def.boss ? s.hpPulse.bossShare : s.hpPulse.share;
          const { dealt } = this.damage(e, Math.max(1, (e.hp + e.shield) * share), t.def.damageClass, false);
          t.stats.damage += dealt;
          if (!e.alive) {
            t.stats.kills++;
            this.onKill(e, 0.2, t);
          }
        }
        this.events.push({ t: 'ability', towerId: t.id, x: t.x, y: t.y, range: s.range, hits: live.length });
      } else t.abilityTimer = s.hpPulse.every;
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
      const { dealt } = this.damage(e, amount, t.def.damageClass, false);
      t.stats.damage += dealt;
      if (!e.alive) {
        t.stats.kills++;
        this.onKill(e, 0.2, t);
      }
    }
    this.events.push({ t: 'ability', towerId: t.id, x: t.x, y: t.y, range: s.range, hits: inRange.length });
  }

  /** Colleagues outside the office (still behind the door) are not at work yet: nothing touches them. */
  onFloor(e: Enemy): boolean {
    const { w, h } = this.level.size;
    return e.x >= 0 && e.y >= 0 && e.x <= w && e.y <= h;
  }

  private visibleTo(e: Enemy, seesHidden: boolean): boolean {
    return this.onFloor(e) && (!e.def.invisible || e.revealed || seesHidden);
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
      // Walls and furniture: nothing that aims at someone sees through them, Office Artillery included.
      if (this.walls && !this.lineOfSight(t.x, t.y, e.x, e.y)) continue;
      // All the attention: towers close to a taunting colleague aim at him first.
      const taunt = e.def.taunt !== undefined && d <= e.def.taunt ? 1e6 : 0;
      cands.push({ e, d, score: taunt + this.targetScore(t.target, e, d) });
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
  private fire(t: Tower, target: Enemy, s: LiveTowerStats, mult = 1): void {
    // Office Artillery fires across the whole floor: its staples fly faster.
    const travel = dist(t, target) / (s.global ? SHOT_SPEED * 2.5 : SHOT_SPEED);
    const hit = new Set<Enemy>();
    this.hitOne(t, target, s, t.x, t.y, travel, 'reply', hit, mult);
    let from: Enemy = target;
    let delay = travel;
    if (s.aoe > 0) {
      // Reply All: everyone near the target gets it too.
      for (const e of this.enemies) {
        if (!e.alive || hit.has(e) || !this.visibleTo(e, s.seesHidden) || Math.hypot(e.x - target.x, e.y - target.y) > s.aoe) continue;
        if (t.def.damageClass && e.def.immune === t.def.damageClass) continue;
        this.hitOne(t, e, s, target.x, target.y, travel + 0.03, 'hop', hit);
      }
    }
    if (s.splash > 0) {
      const near = this.enemies
        .filter((e) => e.alive && !hit.has(e) && this.visibleTo(e, s.seesHidden) && Math.hypot(e.x - target.x, e.y - target.y) <= SPLASH_RADIUS)
        .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y) || a.id - b.id)
        .slice(0, s.splash);
      for (const e of near) this.hitOne(t, e, s, target.x, target.y, travel + 0.04, 'hop', hit);
    }
    for (let i = 0; i < s.bounce; i++) {
      let next: Enemy | null = null;
      let best = s.bounceRange;
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
      // Delegation: every jump hits harder than the one before.
      this.hitOne(t, next, s, from.x, from.y, delay + hopTravel, 'hop', hit, Math.pow(s.bounceMult, i + 1));
      delay += hopTravel;
      from = next;
    }
  }

  private hitOne(t: Tower, e: Enemy, s: LiveTowerStats, fx: number, fy: number, travel: number, kind: 'reply' | 'hop', hit: Set<Enemy>, mult = 1): void {
    hit.add(e);
    // The Phone Caller can take it from towers that deal with one colleague at a time.
    const single = s.targets === 1 && s.aoe === 0 && s.splash === 0 && s.bounce === 0;
    const amount = s.damage * mult * (e.def.boss ? s.bossMult : 1) * (single && e.def.pointResist ? e.def.pointResist : 1);
    const { dealt, result } = this.damage(e, amount, t.def.damageClass);
    t.stats.damage += dealt;
    const killed = !e.alive;
    if (!killed && result === 'hit' && s.stunOnHit > 0) this.stunEnemy(e, s.stunOnHit, t);
    if (!killed && result === 'hit' && s.slowOnHit) this.slowEnemy(e, s.slowOnHit.mult, s.slowOnHit.time);
    this.events.push({ t: 'shot', towerId: t.id, enemyId: e.id, fx, fy, tx: e.x, ty: e.y, travel, damage: dealt, result, killed, kind });
    if (killed) {
      t.stats.kills++;
      this.onKill(e, travel, t);
    }
  }

  /** Apply damage. One checkpoint for shields and immunities, so no damage source can skip them. */
  damage(e: Enemy, amount: number, cls?: string, isHit = true, ignoresMinHit = false): { dealt: number; result: ShotResult } {
    if (!e.alive) return { dealt: 0, result: 'hit' };
    if (e.def.immune && cls === e.def.immune) return { dealt: 0, result: 'immune' };
    // Focus Music: every hit lands a bit harder. Soundproof Booth: stunned colleagues take more.
    if (isHit && e.vulnerableTime > 0) amount += e.vulnerable;
    if (e.stunTime > 0 && e.stunnedTakes > 1) amount *= e.stunnedTakes;
    let dealt = 0;
    if (e.shield > 0) {
      if (e.def.shieldMinHit !== undefined && amount < e.def.shieldMinHit && !ignoresMinHit) return { dealt: 0, result: 'blocked' };
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
      if (b.shieldRecharge) e.shield = e.maxShield;
      if (b.phaseBurst > 0) this.callIn(e, b.addType, b.phaseBurst);
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

  private onKill(e: Enemy, delay: number, by?: Tower): void {
    const reward = killReward(e.def) * killIncomeMult(this.waveIndex) * (1 + this.tipBonusAt(e.x, e.y));
    this.stats.coffeeFromKills += this.earn(reward);
    // Expense the Staples, Recycling: the tower that did it earns its owner a little extra.
    if (by) {
      const bonus = this.liveStats(by).killCoffee;
      if (bonus > 0) {
        const paid = this.earnFor(by.owner, bonus);
        this.stats.coffeeFromKills += paid;
        by.stats.coffee += paid;
      }
    }
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
