// The Recognition shop, Smoke Breaks and promotions.

import { describe, expect, it } from 'vitest';
import { buyPerk, PERKS, perkOptions, SMOKE_FOCUS } from '../src/meta/perks';
import { completeLevel, defaults } from '../src/meta/save';
import { LEVELS } from '../src/sim/data/levels';
import { Game } from '../src/sim/game';

describe('the Recognition shop', () => {
  it('a perk costs Recognition and is yours for good; you cannot buy it twice', () => {
    const save = defaults();
    save.recognition = 70;
    expect(buyPerk(save, 'startup')).toBeNull();
    expect(save.recognition).toBe(40);
    expect(save.perks).toContain('startup');
    expect(buyPerk(save, 'startup')).toMatch(/already/);
    expect(buyPerk(save, 'bulk')).toMatch(/Not enough/);
  });

  it('Smoke Breaks go in your pocket, one per purchase', () => {
    const save = defaults();
    save.recognition = 30;
    expect(buyPerk(save, 'smoke')).toBeNull();
    expect(buyPerk(save, 'smoke')).toBeNull();
    expect(save.smokes).toBe(2);
    expect(save.recognition).toBe(6);
  });

  it('perks change a new game of your own: more Coffee, more Focus, cheaper towers', () => {
    const save = defaults();
    save.perks = ['startup', 'caffeine', 'bulk'];
    const plain = new Game(LEVELS[1]);
    const perked = new Game(LEVELS[1], perkOptions(save));
    expect(perked.coffee - plain.coffee).toBe(15);
    expect(perked.focus - plain.focus).toBe(10);
    expect(perked.placeCostFor('autoreply')).toBeLessThan(plain.placeCostFor('autoreply'));
  });

  it('a Smoke Break gives Focus back, never above what you started with', () => {
    const g = new Game(LEVELS[1]);
    g.focus = 80;
    expect(g.takeBreak(SMOKE_FOCUS)).toBe(15);
    expect(g.focus).toBe(95);
    expect(g.takeBreak(SMOKE_FOCUS)).toBe(5);
    expect(g.focus).toBe(100);
  });

  it('every perk text is plain ASCII without em-dashes', () => {
    for (const p of PERKS) {
      for (const text of [p.name, p.desc]) {
        expect(/^[\x20-\x7e]*$/.test(text), text).toBe(true);
        expect(text.includes('—'), text).toBe(false);
      }
    }
  });
});

describe('promotions', () => {
  it('finishing level 5 for the first time makes you a Medior; replaying it does not again', () => {
    const save = defaults();
    expect(completeLevel(save, 4, 3, false).promoted).toBeNull();
    expect(completeLevel(save, 5, 2, false).promoted).toBe('Medior');
    expect(completeLevel(save, 5, 3, false).promoted).toBeNull();
  });
});
