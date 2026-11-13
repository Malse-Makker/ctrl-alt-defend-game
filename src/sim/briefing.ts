// What is new on a floor, for the briefing before the day starts. Pure: read from the data.

import { COLLEAGUES } from './data/colleagues';
import { LEVELS } from './data/levels';
import { parseWave } from './waves';

export interface Briefing {
  /** Towers in this shop that were not in the shop of the level before. */
  towers: string[];
  /** Colleagues (not bosses) whose first level this is. */
  colleagues: string[];
  /** The boss at the end of the day. */
  boss: string | null;
  rule: string | null;
}

/** Every colleague type that walks in during a level, in order of first appearance. */
export function typesIn(levelId: number): string[] {
  const out: string[] = [];
  for (const w of LEVELS[levelId]?.waves ?? []) for (const g of parseWave(w)) if (!out.includes(g.type)) out.push(g.type);
  return out;
}

/** The first level whose waves bring this colleague in. */
export function firstLevelOf(type: string): number | null {
  const ids = Object.keys(LEVELS)
    .map(Number)
    .sort((a, b) => a - b);
  for (const id of ids) if (typesIn(id).includes(type)) return id;
  return null;
}

export function briefingFor(levelId: number): Briefing {
  const level = LEVELS[levelId];
  const before = LEVELS[levelId - 1]?.towers ?? [];
  const types = typesIn(levelId);
  const bosses = types.filter((t) => COLLEAGUES[t]?.boss);
  return {
    towers: level.towers.filter((id) => !before.includes(id)),
    colleagues: types.filter((t) => !COLLEAGUES[t]?.boss && firstLevelOf(t) === levelId),
    boss: bosses.length ? bosses[bosses.length - 1] : null,
    rule: level.rule ?? null,
  };
}
