// Level 14: Release Night. The dark, the pizza, The Project Manager.

import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/sim/commands';
import { DARK_RANGE, Game } from '../src/sim/game';
import { corridor } from './helpers';

const GRID = ['.*...................', '.....................', '====================D', '.....................', '.....................', '.....................'];

describe('release night', () => {
  it('in the dark towers reach less far; in the light as usual', () => {
    const g = new Game(corridor(['intern:1@1'], { towers: ['autoreply', 'artillery'], grid: GRID }));
    g.coffee = 5000;
    const lit = g.place('autoreply', 1, 0).tower!;
    const dark = g.place('autoreply', 3, 0).tower!;
    expect(g.liveStats(dark).range).toBeCloseTo(g.liveStats(lit).range * DARK_RANGE);
    const art = g.place('artillery', 5, 0).tower!;
    expect(g.liveStats(art).range).toBe(Infinity);
  });

  it('the pizza: take it in time for Coffee, and its spot is lit for a while', () => {
    const hz = { type: 'pizza' as const, first: 1, every: 30, window: 8, reward: 5, light: 20, radius: 1.5 };
    const g = new Game(corridor(['intern:40@1'], { towers: ['autoreply'], grid: GRID, hazard: hz }), { seed: 2 });
    g.start();
    g.runFor(1.1);
    expect(g.pizza).not.toBeNull();
    const at = g.pizza!;
    expect(g.isLit(at.x, at.y)).toBe(false);
    const before = g.coffee;
    expect(applyCommand(g, 0, { c: 'pizza' }).ok).toBe(true);
    expect(g.coffee).toBeGreaterThan(before);
    expect(g.pizza).toBeNull();
    expect(g.isLit(at.x, at.y)).toBe(true);
    g.runFor(21);
    expect(g.isLit(at.x, at.y)).toBe(false);
  });

  it('The Project Manager: the longer he stays, the faster everyone walks', () => {
    const g = new Game(corridor(['intern:1@1']));
    g.phase = 'running';
    g.spawn('projectmanager', 0, 2, false);
    const e = g.spawn('newhire', 0, 4, false);
    g.runFor(1);
    const early = e.haste;
    g.runFor(10);
    expect(e.haste).toBeGreaterThan(early);
    expect(g.rush).toBeLessThanOrEqual(1.8);
  });
});
