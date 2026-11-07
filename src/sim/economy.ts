// Economy rules. Every number here was measured and decided in the Godot version
// (07_REMAKE_PROMPT.md section 2.3). Change them only with numbers from tools/balance.ts.

import { TOWERS, type TowerDef } from './data/towers';

export const WAVE_INTERVAL = 16;
export const POST_CLEAR_DELAY = 5;
export const EARLY_POINTS_PER_SEC = 5;
export const EARLY_POINTS_MAX = 40;

/** Salary per wave survived: base + the number of that wave. */
export const WAVE_INCOME_BASE = 4;
export const SELL_RATIO = 0.6;

/** Placing another copy of the same tower costs +25% per copy already standing, at most +100%. */
export const DUPLICATE_SURCHARGE = 0.25;
export const DUPLICATE_SURCHARGE_MAX = 1.0;

/** Kill income: full up to wave 5, then -4% per wave, never below 40%. */
export const KILL_DAMP_FROM = 5;
export const KILL_DAMP_PER_WAVE = 0.04;
export const KILL_DAMP_FLOOR = 0.4;

/** Distance from a tile centre to the walkway below which you cannot build. */
export const PATH_CLEARANCE = 0.75;

export const STAR3_MIN_RATIO = 0.9;
export const STAR3_MAX_LOSS = 3;
export const STAR2_MIN_RATIO = 0.5;
export const STAR2_MAX_LOSS = 6;

export const RECOGNITION_PER_LEVEL = 12;
export const RECOGNITION_FLAWLESS = 8;

export function killIncomeMult(wave: number): number {
  return Math.max(KILL_DAMP_FLOOR, 1 - KILL_DAMP_PER_WAVE * Math.max(0, wave - KILL_DAMP_FROM));
}

export function salaryFor(waveSurvived: number): number {
  return WAVE_INCOME_BASE + waveSurvived;
}

export function duplicateMult(copiesStanding: number): number {
  return 1 + Math.min(copiesStanding * DUPLICATE_SURCHARGE, DUPLICATE_SURCHARGE_MAX);
}

export function placeCost(def: TowerDef, copiesStanding: number, costMult = 1): number {
  return Math.round(def.levels[0].cost * costMult * duplicateMult(copiesStanding));
}

export function upgradeCost(def: TowerDef, toLevel: 2 | 3, costMult = 1): number {
  return Math.round(def.levels[toLevel - 1].cost * costMult);
}

export function sideCost(def: TowerDef, step: 1 | 2, costMult = 1): number {
  return Math.round(def.levels[0].cost * (step === 1 ? 0.5 : 1) * costMult);
}

export function sellValue(invested: number): number {
  return Math.floor(invested * SELL_RATIO);
}

export function earlyCallPoints(secondsLeft: number): number {
  return Math.min(Math.ceil(Math.max(0, secondsLeft)) * EARLY_POINTS_PER_SEC, EARLY_POINTS_MAX);
}

export function starsFor(focusLeft: number, focusStart: number): 0 | 1 | 2 | 3 {
  if (focusLeft <= 0) return 0;
  const ratio = focusLeft / Math.max(1, focusStart);
  const lost = focusStart - focusLeft;
  if (ratio >= STAR3_MIN_RATIO || lost <= STAR3_MAX_LOSS) return 3;
  if (ratio >= STAR2_MIN_RATIO || lost <= STAR2_MAX_LOSS) return 2;
  return 1;
}

export function recognitionForStars(stars: number): number {
  return Math.round((RECOGNITION_PER_LEVEL * Math.max(0, Math.min(3, stars))) / 3);
}

export function towerDef(id: string): TowerDef {
  const d = TOWERS[id];
  if (!d) throw new Error(`Unknown tower: ${id}`);
  return d;
}
