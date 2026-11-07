// The simulation. Pure logic: no DOM, no Three.js, no Date.now(). The renderer reads the state
// and the events; the balance bots and the tests drive it directly. Fixed time step, seeded RNG,
// so the same seed plus the same actions always gives the same round.

import { COLLEAGUES, killReward, type ColleagueDef } from './data/colleagues';
import { startCoffee, type LevelDef } from './data/levels';
import { TOWERS, type SidePath, type TargetMode, type TowerDef } from './data/towers';
import {
  POST_CLEAR_DELAY,
  PATH_CLEARANCE,
  WAVE_INTERVAL,
  earlyCallPoints,
  killIncomeMult,
  placeCost,
  salaryFor,
  sellValue,
  sideCost,
  starsFor,
  upgradeCost,
} from './economy';
import { Path, dist, type Vec2 } from './geometry';
import { Rng } from './rng';
import { parseWave, type SpawnGroup } from './waves';

export const TICK = 1 / 60;
/** Visual travel speed of a shot, tiles per second. Damage lands instantly in the simulation. */
export const SHOT_SPEED = 16;

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
  tx: number;
  ty: number;
  x: number;
  y: number;
  level: 1 | 2 | 3;
  side: SidePath | null;
  sideStep: 0 | 1 | 2;
  target: TargetMode;
  cooldown: number;
  coffeeTimer: number;
  invested: number;
  placedAtWave: number;
  stats: TowerStats;
}

export interface LiveTowerStats {
  range: number;
  interval: number;
  damage: number;
  targets: number;
  coffeeAmount: number;
  coffeeInterval: number;
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
    }
  | { t: 'kill'; enemyId: number; type: string; x: number; y: number; reward: number; delay: number }
  | { t: 'leak'; enemyId: number; type: string; focus: number }
  | { t: 'split'; parentId: number; type: string; count: number }
  | { t: 'coffee'; towerId: number; amount: number; x: number; y: number }
  | { t: 'salary'; amount: number; wave: number }
  | { t: 'wave'; index: number; total: number; boss: boolean; early: boolean; points: number }
  | { t: 'bossPhase'; enemyId: number; phase: 2 | 3; called: number }
  | { t: 'bossAdds'; enemyId: number; count: number }
  | { t: 'placed' | 'upgraded' | 'side' | 'sold'; towerId: number; defId: string }
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
  coffeeFromSales: number;
  coffeeSpent: number;
  kills: Record<string, number>;
  leaks: Record<string, number>;
  leakFocus: Record<string, number>;
  built: Record<string, number>;
  upgrades: number;
  sidePaths: Record<string, number>;
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
}

interface PendingSpawn {
  at: number;
  seq: number;
  type: string;
  pathIndex: number;
}

const TILE_BLOCKED = 1;
const TILE_PATH = 2;

export class Game {
  readonly level: LevelDef;
  readonly paths: Path[];
  readonly waves: SpawnGroup[][];
  readonly seed: number;
  readonly costMult: number;
  readonly startFocus: number;

  phase: Phase = 'plan';
  endReason: EndReason | null = null;
  time = 0;
  focus: number;
  coffee: number;
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
    this.paths = level.paths.map((p) => new Path(p));
    this.waves = level.waves.map(parseWave);
    this.startFocus = level.startFocus + (opts.extraFocus ?? 0);
    this.focus = this.startFocus;
    this.coffee = startCoffee(level.id) + (opts.extraCoffee ?? 0);
    this.stats = {
      coffeeFromKills: 0,
      coffeeFromSalary: 0,
      coffeeFromMachines: 0,
      coffeeFromSales: 0,
      coffeeSpent: 0,
      kills: {},
      leaks: {},
      leakFocus: {},
      built: {},
      upgrades: 0,
      sidePaths: {},
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

  /** Pull and clear the events produced since the last call. */
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

  copiesOf(defId: string): number {
    return this.towers.filter((t) => t.defId === defId).length;
  }

  placeCostFor(defId: string): number {
    return placeCost(TOWERS[defId], this.copiesOf(defId), this.costMult);
  }

  upgradeCostFor(t: Tower): number | null {
    if (t.level >= 3) return null;
    return upgradeCost(t.def, (t.level + 1) as 2 | 3, this.costMult);
  }

  sideCostFor(t: Tower, path: SidePath): number | null {
    if (!t.def.sidePaths) return null;
    if (t.side !== null && t.side !== path) return null;
    if (t.sideStep >= 2) return null;
    return sideCost(t.def, (t.sideStep + 1) as 1 | 2, this.costMult);
  }

  sellValueFor(t: Tower): number {
    return sellValue(t.invested);
  }

  // ------------------------------------------------------------------ commands

  canPlace(defId: string, tx: number, ty: number): Check {
    const def = TOWERS[defId];
    if (!def || !this.level.towers.includes(defId)) return { ok: false, reason: 'Not available on this floor yet.' };
    if (this.over) return { ok: false, reason: 'The day is over.' };
    const cost = this.placeCostFor(defId);
    if (!this.inBounds(tx, ty)) return { ok: false, reason: 'That is outside the office.', cost };
    if (this.isPathTile(tx, ty)) return { ok: false, reason: 'That is the walkway. People need to get through.', cost };
    if (this.isBlockedTile(tx, ty)) return { ok: false, reason: 'Something is already standing there.', cost };
    if (this.towerAt(tx, ty)) return { ok: false, reason: 'You already put something there.', cost };
    if (def.role === 'damage') {
      const reach = (def.levels[0].range ?? 0) - 0.2;
      if (this.minPathDistance({ x: tx + 0.5, y: ty + 0.5 }) > reach) {
        return { ok: false, reason: 'Too far from the walkway to reach anyone.', cost };
      }
    }
    if (this.coffee < cost) return { ok: false, reason: 'Not enough Coffee.', cost };
    return { ok: true, cost };
  }

  place(defId: string, tx: number, ty: number): Check & { tower?: Tower } {
    const check = this.canPlace(defId, tx, ty);
    if (!check.ok || check.cost === undefined) return check;
    const def = TOWERS[defId];
    const t: Tower = {
      id: this.nextId++,
      defId,
      def,
      tx,
      ty,
      x: tx + 0.5,
      y: ty + 0.5,
      level: 1,
      side: null,
      sideStep: 0,
      target: 'first',
      cooldown: 0,
      coffeeTimer: 0,
      invested: check.cost,
      placedAtWave: this.waveIndex,
      stats: { damage: 0, kills: 0, shots: 0, coffee: 0 },
    };
    this.spend(check.cost);
    this.towers.push(t);
    this.stats.built[defId] = (this.stats.built[defId] ?? 0) + 1;
    this.events.push({ t: 'placed', towerId: t.id, defId });
    return { ...check, tower: t };
  }

  canUpgrade(t: Tower): Check {
    const cost = this.upgradeCostFor(t);
    if (cost === null) return { ok: false, reason: 'Fully upgraded.' };
    if (this.over) return { ok: false, reason: 'The day is over.', cost };
    if (this.coffee < cost) return { ok: false, reason: 'Not enough Coffee.', cost };
    return { ok: true, cost };
  }

  upgrade(towerId: number): Check {
    const t = this.tower(towerId);
    if (!t) return { ok: false, reason: 'No such tower.' };
    const check = this.canUpgrade(t);
    if (!check.ok || check.cost === undefined) return check;
    this.spend(check.cost);
    t.invested += check.cost;
    t.level = (t.level + 1) as 2 | 3;
    this.stats.upgrades++;
    this.events.push({ t: 'upgraded', towerId: t.id, defId: t.defId });
    return check;
  }

  canBuySide(t: Tower, path: SidePath): Check {
    if (!t.def.sidePaths) return { ok: false, reason: 'This one has no side paths.' };
    if (t.side !== null && t.side !== path) return { ok: false, reason: 'You already chose the other path for this tower.' };
    const cost = this.sideCostFor(t, path);
    if (cost === null) return { ok: false, reason: 'This path is complete.' };
    if (this.over) return { ok: false, reason: 'The day is over.', cost };
    if (this.coffee < cost) return { ok: false, reason: 'Not enough Coffee.', cost };
    return { ok: true, cost };
  }

  buySide(towerId: number, path: SidePath): Check {
    const t = this.tower(towerId);
    if (!t) return { ok: false, reason: 'No such tower.' };
    const check = this.canBuySide(t, path);
    if (!check.ok || check.cost === undefined) return check;
    this.spend(check.cost);
    t.invested += check.cost;
    t.side = path;
    t.sideStep = (t.sideStep + 1) as 1 | 2;
    this.stats.sidePaths[path] = (this.stats.sidePaths[path] ?? 0) + 1;
    this.events.push({ t: 'side', towerId: t.id, defId: t.defId });
    return check;
  }

  sell(towerId: number): Check {
    const t = this.tower(towerId);
    if (!t) return { ok: false, reason: 'No such tower.' };
    if (this.over) return { ok: false, reason: 'The day is over.' };
    const value = this.sellValueFor(t);
    this.coffee += value;
    this.stats.coffeeFromSales += value;
    this.stats.sold++;
    this.towers = this.towers.filter((x) => x !== t);
    this.events.push({ t: 'sold', towerId: t.id, defId: t.defId });
    return { ok: true, cost: -value };
  }

  setTargeting(towerId: number, mode: TargetMode): void {
    const t = this.tower(towerId);
    if (t) t.target = mode;
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

  private spend(amount: number): void {
    this.coffee -= amount;
    this.stats.coffeeSpent += amount;
  }

  // ------------------------------------------------------------------ live stats

  liveStats(t: Tower): LiveTowerStats {
    const lv = t.def.levels[t.level - 1];
    const s: LiveTowerStats = {
      range: lv.range ?? 0,
      interval: lv.interval ?? 0,
      damage: lv.damage ?? 0,
      targets: 1,
      coffeeAmount: lv.coffeeAmount ?? 0,
      coffeeInterval: lv.coffeeInterval ?? 0,
    };
    if (t.side === 'overtime') {
      if (t.sideStep >= 1) s.interval *= 0.8;
      if (t.sideStep >= 2) s.range *= 1.2;
    } else if (t.side === 'escalation') {
      if (t.sideStep >= 1) s.targets += 1;
      if (t.sideStep >= 2) s.damage *= 1.25;
    }
    return s;
  }

  // ------------------------------------------------------------------ the loop

  step(dt = TICK): void {
    if (this.phase !== 'running') return;
    this.time += dt;
    this.spawnDue();
    this.updateBosses(dt);
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
      this.coffee += pay;
      this.stats.coffeeFromSalary += pay;
      this.events.push({ t: 'salary', amount: pay, wave: this.waveIndex });
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
    let s = e.def.speed;
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
      if (t.def.role === 'economy') {
        const s = this.liveStats(t);
        t.coffeeTimer += dt;
        if (t.coffeeTimer >= s.coffeeInterval) {
          t.coffeeTimer -= s.coffeeInterval;
          this.coffee += s.coffeeAmount;
          t.stats.coffee += s.coffeeAmount;
          this.stats.coffeeFromMachines += s.coffeeAmount;
          this.events.push({ t: 'coffee', towerId: t.id, amount: s.coffeeAmount, x: t.x, y: t.y });
        }
        continue;
      }
      const s = this.liveStats(t);
      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
      const targets = this.pickTargets(t, s.range, s.targets);
      if (targets.length === 0) {
        t.cooldown = 0;
        continue;
      }
      for (const e of targets) this.shoot(t, e, s.damage);
      t.stats.shots++;
      t.cooldown += s.interval;
      if (t.cooldown < 0) t.cooldown = s.interval;
    }
  }

  /** Valid targets in range, best first according to the tower's targeting mode. */
  pickTargets(t: Tower, range: number, n: number): Enemy[] {
    const cands: { e: Enemy; d: number; score: number }[] = [];
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (t.def.damageClass && e.def.immune === t.def.damageClass) continue;
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

  private shoot(t: Tower, e: Enemy, amount: number): void {
    const travel = dist(t, e) / SHOT_SPEED;
    const fx = t.x;
    const fy = t.y;
    const tx = e.x;
    const ty = e.y;
    const { dealt, result } = this.damage(e, amount, t.def.damageClass);
    t.stats.damage += dealt;
    const killed = !e.alive;
    this.events.push({ t: 'shot', towerId: t.id, enemyId: e.id, fx, fy, tx, ty, travel, damage: dealt, result, killed });
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

  private onKill(e: Enemy, delay: number): void {
    const reward = killReward(e.def) * killIncomeMult(this.waveIndex);
    this.coffee += reward;
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
