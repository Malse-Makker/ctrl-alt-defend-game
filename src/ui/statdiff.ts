// What an upgrade changes, in numbers: computeStats before and after, the lines that differ.
// Pure, so the shop button and the tests agree on what "Damage 15 > 35" means.

import type { Tiers, TowerDef } from '../sim/data/towers';
import { computeStats, type LiveTowerStats } from '../sim/game';

export interface StatChange {
  label: string;
  /** "15 > 35", or for something new just what it is. */
  text: string;
  /** A new ability rather than a bigger number. */
  isNew: boolean;
}

/** `none` is the value that means it does not do this at all (0 unless said otherwise). */
type Num = { label: string; get: (s: LiveTowerStats) => number; show: (v: number) => string; skip?: (s: LiveTowerStats) => boolean; none?: number };

const n1 = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));
const secs = (v: number) => `${v < 1 ? String(Math.round(v * 100) / 100) : v < 10 ? v.toFixed(1) : Math.round(v)}s`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const faster = (v: number) => `+${Math.round((1 / v - 1) * 100)}%`;

// Order is the order a player reads: what it does to a colleague first, then how often, then where.
const NUMBERS: Num[] = [
  { label: 'Damage', get: (s) => s.damage, show: n1, skip: (s) => s.damage <= 0 },
  { label: 'Damage per second', get: (s) => s.dot, show: n1, skip: (s) => s.dot <= 0 },
  { label: 'Targets', get: (s) => Math.min(s.targets, 50), show: (v) => (v >= 50 ? 'everyone' : String(v)) },
  { label: 'Bounces', get: (s) => s.bounce, show: String },
  { label: 'Splash', get: (s) => s.aoe, show: (v) => `${n1(v)} tiles` },
  { label: 'Each jump hits', get: (s) => s.bounceMult, show: (v) => `x${v.toFixed(2)}`, none: 1 },
  { label: 'Jump range', get: (s) => s.bounceRange, show: n1, skip: (s) => s.bounce <= 0 },
  { label: 'Slam width', get: (s) => s.smashRadius, show: n1 },
  { label: 'Stops for', get: (s) => s.stun, show: secs },
  { label: 'Stopped colleagues take', get: (s) => s.stunnedTakes, show: (v) => `x${n1(v)}`, none: 1 },
  { label: 'Stops on hit', get: (s) => s.stunOnHit, show: secs },
  { label: 'Slows to', get: (s) => s.slow, show: pct, none: 1 },
  { label: 'Slow lasts', get: (s) => s.slowTime, show: secs, skip: (s) => s.slow >= 1 || s.slowTime <= 0.5 },
  { label: 'Sticks for', get: (s) => s.bleed, show: secs },
  { label: 'Pushes back', get: (s) => s.knockback, show: (v) => `${n1(v)} tile` },
  { label: 'Reload', get: (s) => s.interval, show: secs, skip: (s) => !Number.isFinite(s.interval) || s.interval <= 0 },
  { label: 'Coffee', get: (s) => s.coffeeAmount, show: n1 },
  { label: 'Tip per colleague', get: (s) => s.tip, show: n1 },
  { label: 'Coffee per colleague', get: (s) => s.killCoffee, show: n1 },
  { label: 'Coffee per wave', get: (s) => s.waveIncome, show: n1 },
  { label: 'Brews every', get: (s) => s.coffeeInterval, show: secs, skip: (s) => !Number.isFinite(s.coffeeInterval) },
  { label: 'Range', get: (s) => s.range, show: (v) => n1(v), skip: (s) => !Number.isFinite(s.range) || s.global },
  { label: 'Tacks per pile', get: (s) => s.pierce, show: String },
  { label: 'Piles', get: (s) => s.piles, show: String },
  { label: 'Keyboard kicks', get: (s) => s.barrierHp, show: n1 },
  { label: 'Keyboard stays', get: (s) => s.barrierTime, show: secs },
  { label: 'Kicking it hurts', get: (s) => s.barrierThorns, show: (v) => `${n1(v)}/s` },
  { label: 'Chair HP', get: (s) => s.chairHp, show: n1 },
  { label: 'Towers nearby fire', get: (s) => s.buffRate, show: faster, none: 1 },
  { label: 'Their damage', get: (s) => s.auraDamage, show: (v) => `+${Math.round((v - 1) * 100)}%`, none: 1 },
  { label: 'Their reach', get: (s) => s.auraRange, show: (v) => `+${Math.round((v - 1) * 100)}%`, none: 1 },
  { label: 'Upgrades cost', get: (s) => s.discount, show: (v) => `-${Math.round(v * 100)}%` },
  { label: 'Extra damage taken', get: (s) => s.vulnerable, show: (v) => `+${n1(v)}` },
  { label: 'vs bosses', get: (s) => s.bossMult, show: (v) => `x${n1(v)}`, none: 1 },
];

const FLAGS: { text: string; get: (s: LiveTowerStats) => boolean }[] = [
  { text: 'sees hidden colleagues', get: (s) => s.seesHidden },
  { text: 'breaks through boxes', get: (s) => s.ignoresMinHit },
  { text: 'reaches the whole floor', get: (s) => s.global },
  { text: 'Chatterbox-proof', get: (s) => s.silenceProof },
  { text: 'smashes twice', get: (s) => s.doubleSmash },
  { text: 'two tomatoes', get: (s) => s.doubleShot },
  { text: 'hits on the way back', get: (s) => s.rollBack },
  { text: 'damage nobody shares', get: (s) => s.unshared },
  { text: 'towers nearby see hidden', get: (s) => s.auraHidden },
  { text: 'towers nearby break boxes', get: (s) => s.auraShield },
  { text: 'keeps its Coffee in a pot', get: (s) => s.bank !== null },
  { text: 'an ability you trigger', get: (s) => s.ability !== null },
  { text: 'stops everyone now and then', get: (s) => s.stunPulse !== null },
  { text: 'takes a share of their HP now and then', get: (s) => s.hpPulse !== null },
  { text: 'slows on hit', get: (s) => s.slowOnHit !== null },
  { text: 'leaves a burning patch', get: (s) => s.crater !== null },
];

/** The changes buying the next tier on this path makes, biggest news first. */
export function upgradeDiff(def: TowerDef, tiers: Tiers, path: number): StatChange[] {
  if (tiers[path] >= def.paths[path].tiers.length) return [];
  const before = computeStats(def, tiers);
  const next = [...tiers] as Tiers;
  next[path]++;
  const after = computeStats(def, next);
  const out: StatChange[] = [];
  for (const f of FLAGS) if (f.get(after) && !f.get(before)) out.push({ label: 'NEW', text: f.text, isNew: true });
  for (const n of NUMBERS) {
    if (n.skip?.(after)) continue;
    const a = n.get(before);
    const b = n.get(after);
    if (Math.abs(a - b) < 1e-6 || n.show(a) === n.show(b)) continue;
    // Something it did not do at all before is news, not a number going up.
    const was = n.skip?.(before) || a === (n.none ?? 0);
    out.push(was ? { label: 'NEW', text: `${n.label.toLowerCase()} ${n.show(b)}`, isNew: true } : { label: n.label, text: `${n.show(a)} > ${n.show(b)}`, isNew: false });
  }
  return out;
}
