import { describe, expect, it } from 'vitest';
import { COLLEAGUES, hpEquivalent, killReward } from '../src/sim/data/colleagues';
import { startCoffee } from '../src/sim/data/levels';
import { TOWERS } from '../src/sim/data/towers';
import {
  duplicateMult,
  earlyCallPoints,
  killIncomeMult,
  placeCost,
  recognitionForStars,
  salaryFor,
  sellValue,
  sideCost,
  starsFor,
} from '../src/sim/economy';

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

  it('side paths cost half and then the full entry price', () => {
    expect(sideCost(TOWERS.autoreply, 1)).toBe(7);
    expect(sideCost(TOWERS.autoreply, 2)).toBe(14);
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

describe('tower balance rule', () => {
  it('damage per Coffee rises with every upgrade level', () => {
    for (const def of Object.values(TOWERS)) {
      if (def.role !== 'damage') continue;
      let spent = 0;
      let prev = 0;
      def.levels.forEach((lv) => {
        spent += lv.cost;
        const dpsPerCoffee = (lv.damage! / lv.interval!) / spent;
        expect(dpsPerCoffee, `${def.id} ${lv.name}`).toBeGreaterThan(prev);
        prev = dpsPerCoffee;
      });
    }
  });

  it('upgrading beats a second copy at the duplicate price', () => {
    const def = TOWERS.autoreply;
    const l1 = def.levels[0];
    const l2 = def.levels[1];
    const twoCopies = (2 * l1.damage!) / l1.interval! / (placeCost(def, 0) + placeCost(def, 1));
    const upgraded = l2.damage! / l2.interval! / (l1.cost + l2.cost);
    expect(upgraded).toBeGreaterThan(twoCopies);
  });

  it('coffee machine income per Coffee rises with every level', () => {
    const def = TOWERS.coffee;
    let spent = 0;
    let prev = 0;
    for (const lv of def.levels) {
      spent += lv.cost;
      const rate = lv.coffeeAmount! / lv.coffeeInterval! / spent;
      expect(rate).toBeGreaterThanOrEqual(prev);
      prev = rate;
    }
  });
});
