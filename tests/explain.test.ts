// The explanation layer (review 2026-11-13): the colleague card, its counters and the tips switch.

import { describe, expect, it } from 'vitest';
import { COLLEAGUES } from '../src/sim/data/colleagues';
import { LEVELS } from '../src/sim/data/levels';
import { TOWERS } from '../src/sim/data/towers';
import { parseWave } from '../src/sim/waves';
import { defaults, resetTips } from '../src/meta/save';
import { cardCountdown } from '../src/ui/colleaguecard';

/** The first level whose waves bring this colleague in. */
function firstLevel(type: string): number | null {
  for (const level of Object.values(LEVELS).sort((a, b) => a.id - b.id)) {
    if (level.waves.some((w) => parseWave(w).some((g) => g.type === type))) return level.id;
  }
  return null;
}

describe('the colleague card', () => {
  const regulars = Object.values(COLLEAGUES).filter((c) => !c.boss);

  it('has a short line, a help line and counter towers for every colleague who is not a boss', () => {
    for (const c of regulars) {
      expect(c.short, c.id).toBeTruthy();
      expect(c.helps, c.id).toBeTruthy();
      expect(c.counters?.length, c.id).toBeGreaterThan(0);
      expect(c.short!.length, c.id).toBeLessThanOrEqual(80);
    }
  });

  it('only names towers that exist', () => {
    for (const c of Object.values(COLLEAGUES)) for (const id of c.counters ?? []) expect(TOWERS[id], `${c.id}: ${id}`).toBeDefined();
  });

  it('never leaves a colleague without an answer: a counter is in the shop where he first turns up', () => {
    for (const c of regulars) {
      const at = firstLevel(c.id);
      if (at === null) continue;
      const shop = LEVELS[at].towers;
      expect(c.counters!.some((id) => shop.includes(id)), `${c.id} in level ${at}`).toBe(true);
    }
  });

  it('counts down in real seconds and not at all while paused', () => {
    expect(cardCountdown(10, 0.5, false)).toBe(9.5);
    expect(cardCountdown(10, 0.5, true)).toBe(10);
    expect(cardCountdown(0.2, 0.5, false)).toBe(0);
    // A 144 Hz screen used to burn a ten second card in four.
    let t = 10;
    for (let i = 0; i < 144; i++) t = cardCountdown(t, 1 / 144, false);
    expect(t).toBeCloseTo(9, 5);
  });
});

describe('tips', () => {
  it('are on for a new player', () => {
    expect(defaults().settings.tips).toBe(true);
    expect(defaults().tipsSeen).toEqual([]);
  });

  it('come back after a reset, without touching progress', () => {
    const s = defaults();
    s.settings.tips = false;
    s.tipsSeen = ['oldguard'];
    s.hintsDone = ['l1'];
    s.stars = { '1': 3 };
    resetTips(s);
    expect(s.settings.tips).toBe(true);
    expect(s.tipsSeen).toEqual([]);
    expect(s.hintsDone).toEqual([]);
    expect(s.stars).toEqual({ '1': 3 });
  });
});
