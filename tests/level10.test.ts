// Level 10: Boardroom II, the glass room with blinds.

import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { corridor } from './helpers';

const GRID = ['.....................', 'BBBBBBBBBBBBBBBBBBBBB', '====================D', '.....................', '.....................', '.....................'];
const hz = { type: 'blinds' as const, first: 5, every: 30, window: 10, warn: 2 };

describe('the blinds', () => {
  it('glass is see-through until the blinds come down, with a warning first', () => {
    const g = new Game(corridor(['intern:40@1'], { grid: GRID, hazard: hz }));
    g.start();
    expect(g.lineOfSight(4.5, 0.5, 4.5, 2.5)).toBe(true);
    g.runFor(3.1);
    expect(g.hazardWarning).toBe(true);
    expect(g.drainEvents().some((e) => e.t === 'hazardWarn')).toBe(true);
    g.runFor(2);
    expect(g.blindsDown).toBe(true);
    expect(g.lineOfSight(4.5, 0.5, 4.5, 2.5)).toBe(false);
    // Along the glass, not through it, is fine.
    expect(g.lineOfSight(4.5, 3.5, 9.5, 3.5)).toBe(true);
    g.runFor(10);
    expect(g.blindsDown).toBe(false);
    expect(g.lineOfSight(4.5, 0.5, 4.5, 2.5)).toBe(true);
  });

  it('a tower behind closed blinds stops shooting', () => {
    const g = new Game(corridor(['intern:1@1'], { towers: ['autoreply'], grid: GRID, hazard: { ...hz, first: 0.1 } }));
    g.coffee = 500;
    const t = g.place('autoreply', 8, 0).tower!;
    g.start();
    g.runFor(0.2);
    expect(g.blindsDown).toBe(true);
    const e = g.spawn('newhire', 0, 9, false);
    e.stunTime = 1e9;
    const shots = t.stats.shots;
    g.runFor(2);
    expect(t.stats.shots).toBe(shots);
  });
});
