import { COLLEAGUES, hpEquivalent } from './data/colleagues';

export interface SpawnGroup {
  type: string;
  count: number;
  interval: number;
}

const PART = /^([a-z]+):(\d+)@(\d+(?:\.\d+)?)$/;

/**
 * Parse "intern:5@0.80 + newhire:2@1.20". Throws on anything malformed or unknown: the Godot
 * version once read "2.00*1.8" as a number without complaint, and nobody noticed for weeks.
 */
export function parseWave(spec: string): SpawnGroup[] {
  const groups: SpawnGroup[] = [];
  for (const raw of spec.split('+')) {
    const part = raw.trim();
    const m = PART.exec(part);
    if (!m) throw new Error(`Bad wave group "${part}" in "${spec}"`);
    const type = m[1];
    if (!COLLEAGUES[type]) throw new Error(`Unknown colleague "${type}" in "${spec}"`);
    const count = Number(m[2]);
    const interval = Number(m[3]);
    if (count < 1 || interval <= 0) throw new Error(`Empty or zero-interval group in "${spec}"`);
    groups.push({ type, count, interval });
  }
  return groups;
}

export function waveHp(groups: SpawnGroup[]): number {
  return groups.reduce((sum, g) => sum + g.count * hpEquivalent(g.type), 0);
}

export function waveDuration(groups: SpawnGroup[]): number {
  return groups.reduce((sum, g) => sum + g.count * g.interval, 0);
}
