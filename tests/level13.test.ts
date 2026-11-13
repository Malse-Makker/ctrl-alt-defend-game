// Level 13: Server Room. The cold, the closed room, overheating.

import { describe, expect, it } from 'vitest';
import { COLD_RATE, Game } from '../src/sim/game';
import { corridor } from './helpers';

const GRID = ['..kkkkkkkkkkkkkkkk...', '..kkkkkkkkkkkkkkkk...', '====================D', '..kkkkkkkkkkkkkkkk...', '.....................', '.....................'];
const ZONE = { x: 2, y: 0, w: 16, h: 6 };

function game(extra = {}) {
  const g = new Game(corridor(['intern:1@1'], { towers: ['autoreply', 'artillery'], grid: GRID, closedZone: ZONE, ...extra }));
  g.coffee = 5000;
  return g;
}

describe('the server room', () => {
  it('towers in the cold fire at half speed', () => {
    const g = game();
    const cold = g.place('autoreply', 8, 1).tower!;
    const warm = g.place('autoreply', 19, 1).tower!;
    expect(g.liveStats(cold).interval).toBeCloseTo(g.liveStats(warm).interval / COLD_RATE);
  });

  it('is closed: towers inside only reach colleagues inside, outside only outside; Artillery anywhere', () => {
    const g = game();
    const inside = g.place('autoreply', 16, 1).tower!;
    const outside = g.place('autoreply', 19, 1).tower!;
    const art = g.place('artillery', 0, 0).tower!;
    g.phase = 'running';
    const e = g.spawn('newhire', 0, 19.5, false);
    e.stunTime = 1e9;
    expect(g.pickTargets(inside, 10, 1)).toEqual([]);
    expect(g.pickTargets(outside, 10, 1)).toEqual([e]);
    expect(g.pickTargets(art, 99, 1)).toEqual([e]);
  });

  it('overheating: the cold is gone for a while, but the racks smoke', () => {
    const hz = { type: 'overheat' as const, first: 1, every: 30, window: 12, clouds: 2, radius: 2, rangeMult: 0.6 };
    const g = game({ hazard: hz, waves: ['intern:30@1'] });
    const t = g.place('autoreply', 8, 1).tower!;
    const slow = g.liveStats(t).interval;
    g.start();
    g.runFor(1.1);
    expect(g.hazardOn).toBe(true);
    expect(g.isCold(8, 1)).toBe(false);
    expect(g.liveStats(t).interval).toBeCloseTo(slow * COLD_RATE);
    expect(g.smoke.length).toBe(2);
    g.runFor(12);
    expect(g.isCold(8, 1)).toBe(true);
  });
});
