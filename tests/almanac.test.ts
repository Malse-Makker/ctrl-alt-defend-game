// "Who is who": every colleague and tower, between levels too.

import { describe, expect, it } from 'vitest';
import { COLLEAGUES } from '../src/sim/data/colleagues';
import { TOWERS } from '../src/sim/data/towers';
import { colleagueEntries, floorList, goodAgainst } from '../src/ui/almanac';

describe('the almanac', () => {
  it('lists every colleague that walks in somewhere, in the order you meet them', () => {
    const list = colleagueEntries([]);
    expect(list.length).toBeGreaterThan(15);
    const firsts = list.map((e) => e.first ?? 99);
    expect([...firsts].sort((a, b) => a - b)).toEqual(firsts);
    expect(list[0].first).toBe(1);
  });

  it('only shows who you have met; the rest is a silhouette', () => {
    const list = colleagueEntries(['intern', 'oldguard']);
    expect(list.filter((e) => e.seen).map((e) => e.def.id).sort()).toEqual(['intern', 'oldguard']);
  });

  it('knows on which floors a colleague walks in', () => {
    const og = colleagueEntries([]).find((e) => e.def.id === 'oldguard')!;
    expect(og.floors[0]).toBe(og.first);
    expect(og.floors.length).toBeGreaterThan(3);
  });

  it('a tower is good against the colleagues that name it as a counter', () => {
    expect(goodAgainst('artillery').map((c) => c.id)).toContain('oldguard');
    for (const t of Object.keys(TOWERS)) for (const c of goodAgainst(t)) expect(COLLEAGUES[c.id].counters).toContain(t);
  });

  it('writes runs of floors short', () => {
    expect(floorList([1, 2, 3, 4, 5])).toBe('1 to 5');
    expect(floorList([2, 3, 4, 5, 7])).toBe('2 to 5, 7');
    expect(floorList([2, 5, 6])).toBe('2, 5, 6');
  });
});
