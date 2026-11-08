// Difficulty guard rails, measured with the bots in tools/bots.ts. If one of these fails after a
// change, run `npm run balance` and look at the numbers before touching the thresholds.

import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/sim/data/levels';
import { beginnerBot, greedyBot, idleBot, runBot, solidBot, spamBot } from '../tools/bots';

describe('Level 1 difficulty', () => {
  const level = LEVELS[1];

  it('doing nothing loses', () => {
    const r = runBot(level, idleBot);
    expect(r.won).toBe(false);
  });

  it('a first-time player wins, but loses some Focus (the boss teaches targeting)', () => {
    const r = runBot(level, beginnerBot);
    expect(r.won).toBe(true);
    expect(r.focus).toBeLessThan(100);
    expect(r.stars).toBeGreaterThanOrEqual(2);
  });

  it('spamming level 1 towers is worse than upgrading: no flawless round', () => {
    const r = runBot(level, spamBot);
    expect(r.won).toBe(true);
    expect(r.focus).toBeLessThan(100);
  });

  it('good play is flawless, with a safety margin', () => {
    const r = runBot(level, solidBot);
    expect(r.won).toBe(true);
    expect(r.focus).toBe(100);
    expect(r.deepest).toBeLessThan(0.8);
  });

  it('investing in Coffee first is a valid way to win', () => {
    const r = runBot(level, greedyBot);
    expect(r.won).toBe(true);
    expect(r.stars).toBe(3);
  });
});

describe('Level 2 difficulty', () => {
  const level = LEVELS[2];

  it('doing nothing loses', () => {
    expect(runBot(level, idleBot).won).toBe(false);
  });

  it('Auto-Replies alone are not enough: the level teaches the new towers', () => {
    expect(runBot(level, spamBot).won).toBe(false);
  });

  it('good play with the new towers is flawless, with a safety margin', () => {
    const r = runBot(level, solidBot);
    expect(r.won).toBe(true);
    expect(r.focus).toBe(100);
    expect(r.deepest).toBeLessThan(0.8);
  });

  it('going for Coffee first still wins, at a cost', () => {
    const r = runBot(level, greedyBot);
    expect(r.won).toBe(true);
    expect(r.stars).toBeGreaterThanOrEqual(2);
  });
});

describe('Level 3 difficulty', () => {
  const level = LEVELS[3];

  it('Auto-Replies alone are not enough', () => {
    expect(runBot(level, spamBot).won).toBe(false);
  });

  it('good play is flawless, with a safety margin', () => {
    const r = runBot(level, solidBot);
    expect(r.won).toBe(true);
    expect(r.focus).toBe(100);
    expect(r.deepest).toBeLessThan(0.8);
  });

  it('going for Coffee first still wins', () => {
    const r = runBot(level, greedyBot);
    expect(r.won).toBe(true);
    expect(r.stars).toBeGreaterThanOrEqual(2);
  });
});

describe('Level 4 difficulty', () => {
  const level = LEVELS[4];

  it('Auto-Replies alone are not enough: The Impersonator walks right past them', () => {
    const r = runBot(level, spamBot);
    expect(r.won).toBe(false);
  });

  it('good play is flawless', () => {
    const r = runBot(level, solidBot);
    expect(r.won).toBe(true);
    expect(r.focus).toBe(100);
    expect(r.deepest).toBeLessThan(0.95);
  });

  it('going for Coffee first still wins', () => {
    const r = runBot(level, greedyBot);
    expect(r.won).toBe(true);
    expect(r.stars).toBeGreaterThanOrEqual(2);
  });
});

describe('Level 5 difficulty', () => {
  const level = LEVELS[5];

  it('Auto-Replies alone are not enough', () => {
    expect(runBot(level, spamBot).won).toBe(false);
  });

  it('good play wins with three stars; at most a stray Chaser from the boss gets through', () => {
    const r = runBot(level, solidBot);
    expect(r.won).toBe(true);
    expect(r.stars).toBe(3);
    expect(r.focus).toBeGreaterThanOrEqual(95);
  });

  it('going for Coffee first still wins', () => {
    const r = runBot(level, greedyBot);
    expect(r.won).toBe(true);
    expect(r.stars).toBeGreaterThanOrEqual(2);
  });
});

describe('Level 6 difficulty (the first medior floor)', () => {
  const level = LEVELS[6];

  it('Auto-Replies alone are not enough: walls, outages and Cold Callers see to that', () => {
    expect(runBot(level, spamBot).won).toBe(false);
  });

  it('good play wins with three stars', () => {
    const r = runBot(level, solidBot);
    expect(r.won).toBe(true);
    expect(r.stars).toBe(3);
    expect(r.focus).toBeGreaterThanOrEqual(90);
  });

  it('going for Coffee first still wins, if only just: on a medior floor that is a risk', () => {
    expect(runBot(level, greedyBot).won).toBe(true);
  });
});
