import { describe, expect, it } from 'vitest';
import { COLLEAGUES, hpEquivalent, killReward } from '../src/sim/data/colleagues';
import { startCoffee } from '../src/sim/data/levels';
import { TOWERS, pathBlock, type Tiers } from '../src/sim/data/towers';
import {
  duplicateMult,
  earlyCallPoints,
  killIncomeMult,
  pathCost,
  placeCost,
  recognitionForStars,
  salaryFor,
  sellValue,
  starsFor,
} from '../src/sim/economy';
import { computeStats } from '../src/sim/game';

describe('economy rules from the design bible', () => {
  it('start Coffee is 40 + 5 per level', () => {
    expect(startCoffee(1)).toBe(40);
    expect(startCoffee(15)).toBe(110);
  });

  it('kill income is full to wave 5, then -4% per wave, floor 40%', () => {
    expect(killIncomeMult(1)).toBe(1);
    expect(killIncomeMult(5)).toBe(1);
    expect(killIncomeMult(8)).toBeCloseTo(0.88);
    expect(killIncomeMult(15)).toBeCloseTo(0.6);
    expect(killIncomeMult(21)).toBeCloseTo(0.4);
    expect(killIncomeMult(40)).toBeCloseTo(0.4);
  });

  it('salary is 4 + the wave survived', () => {
    expect(salaryFor(1)).toBe(5);
    expect(salaryFor(10)).toBe(14);
  });

  it('duplicates cost +25% per copy standing, capped at +100%', () => {
    const auto = TOWERS.autoreply;
    const costs = [0, 1, 2, 3, 4, 5].map((n) => placeCost(auto, n));
    expect(costs).toEqual([14, 18, 21, 25, 28, 28]);
    expect(duplicateMult(10)).toBe(2);
  });

  it('path prices come from the tier you are about to buy', () => {
    expect(pathCost(TOWERS.autoreply, 0, 1)).toBe(TOWERS.autoreply.paths[0].tiers[0].cost);
    expect(pathCost(TOWERS.autoreply, 2, 4, 0.9)).toBe(Math.round(TOWERS.autoreply.paths[2].tiers[3].cost * 0.9));
  });

  it('selling returns 60%, rounded down', () => {
    expect(sellValue(14)).toBe(8);
    expect(sellValue(51)).toBe(30);
  });

  it('calling a wave early pays 5 points per second left, at most 40', () => {
    expect(earlyCallPoints(16)).toBe(40);
    expect(earlyCallPoints(3.2)).toBe(20);
    expect(earlyCallPoints(0)).toBe(0);
  });

  it('stars: 3 at 90% or at most 3 lost, 2 at 50% or at most 6 lost', () => {
    expect(starsFor(100, 100)).toBe(3);
    expect(starsFor(90, 100)).toBe(3);
    expect(starsFor(89, 100)).toBe(2);
    expect(starsFor(50, 100)).toBe(2);
    expect(starsFor(49, 100)).toBe(1);
    expect(starsFor(7, 10)).toBe(3);
    expect(starsFor(4, 10)).toBe(2);
    expect(starsFor(0, 100)).toBe(0);
  });

  it('Recognition: 12 per level spread over the stars', () => {
    expect([0, 1, 2, 3].map(recognitionForStars)).toEqual([0, 4, 8, 12]);
  });

  it('rewards follow 0.12 per HP, swarms 0.09', () => {
    expect(killReward(COLLEAGUES.intern)).toBeCloseTo(0.48);
    expect(killReward(COLLEAGUES.newhire)).toBeCloseTo(1.44);
    expect(killReward(COLLEAGUES.chaser)).toBeCloseTo(0.27);
    expect(killReward(COLLEAGUES.headofcomms)).toBe(22);
  });

  it('HP-equivalent counts what comes out of a split', () => {
    expect(hpEquivalent('requester')).toBe(16 + 2 * 3);
  });
});

describe('upgrade paths (Bloons rule: 4-2-0)', () => {
  const ok = (t: Tiers, p: number) => pathBlock(t, p) === null;

  it('allows one path to 4 and a second to 2', () => {
    expect(ok([0, 0, 0], 0)).toBe(true);
    expect(ok([3, 2, 0], 0)).toBe(true);
    expect(ok([4, 1, 0], 1)).toBe(true);
    expect(ok([0, 2, 3], 2)).toBe(true);
  });

  it('refuses a third path, two paths past 2, and tier 5', () => {
    expect(pathBlock([2, 2, 0], 2)).toMatch(/Two paths/);
    expect(pathBlock([3, 2, 0], 1)).toMatch(/Only one path/);
    expect(pathBlock([2, 3, 0], 0)).toMatch(/Only one path/);
    expect(pathBlock([4, 0, 0], 0)).toMatch(/complete/);
  });
});

describe('tower balance rule', () => {
  const crowdDps = (def: (typeof TOWERS)[string], tiers: Tiers) => {
    const s = computeStats(def, tiers);
    return (s.damage / s.interval) * Math.min(5, s.targets + s.splash + s.bounce);
  };
  const copiesDps = (def: (typeof TOWERS)[string], coffee: number) => {
    const b = computeStats(def, [0, 0, 0]);
    let n = 0;
    let spent = 0;
    while (spent + placeCost(def, n) <= coffee) spent += placeCost(def, n++);
    return n * (b.damage / b.interval);
  };

  it('the first tier of a damage path beats buying a third copy', () => {
    for (const def of Object.values(TOWERS)) {
      if (def.role !== 'damage') continue;
      const b = computeStats(def, [0, 0, 0]);
      const copy = b.damage / b.interval / placeCost(def, 2);
      for (const p of [0, 1]) {
        const tiers: Tiers = [0, 0, 0];
        tiers[p] = 1;
        const s = computeStats(def, tiers);
        const gain = (s.damage / s.interval - b.damage / b.interval) / def.paths[p].tiers[0].cost;
        expect(gain, `${def.id} path ${p}`).toBeGreaterThan(copy);
      }
    }
  });

  it('against a crowd, tier 3 and 4 beat spending the same Coffee on copies', () => {
    for (const def of Object.values(TOWERS)) {
      if (def.role !== 'damage') continue;
      for (const p of [0, 1]) {
        let spent = def.base.cost;
        for (let t = 1; t <= 4; t++) {
          spent += def.paths[p].tiers[t - 1].cost;
          if (t < 3) continue;
          const tiers: Tiers = [0, 0, 0];
          tiers[p] = t;
          expect(crowdDps(def, tiers), `${def.id} path ${p} tier ${t}`).toBeGreaterThan(copiesDps(def, spent));
        }
      }
    }
  });

  it('every Coffee Machine brewing upgrade pays for itself within four minutes', () => {
    const def = TOWERS.coffee;
    let prev = computeStats(def, [0, 0, 0]);
    for (let t = 1; t <= 4; t++) {
      const s = computeStats(def, [t, 0, 0]);
      const gain = s.coffeeAmount / s.coffeeInterval - prev.coffeeAmount / prev.coffeeInterval;
      expect(def.paths[0].tiers[t - 1].cost / gain, `tier ${t}`).toBeLessThan(240);
      prev = s;
    }
  });
});
