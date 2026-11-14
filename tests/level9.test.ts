// Level 9: the Motivational Poster, the tribune, the fire alarm and two entrances at once.

import { describe, expect, it } from 'vitest';
import { Game, RAISED_RANGE } from '../src/sim/game';
import { corridor } from './helpers';

const SET = ['coffee', 'autoreply', 'poster', 'pomodoro'];

function game(extra = {}) {
  const g = new Game(corridor(['intern:1@1'], { towers: SET, ...extra }));
  g.wallets = g.wallets.map(() => 5000);
  return g;
}

describe('Motivational Poster', () => {
  it('does nothing itself, but towers around it fire faster', () => {
    const g = game();
    const a = g.place('autoreply', 8, 1).tower!;
    const far = g.place('autoreply', 16, 1).tower!;
    g.place('poster', 9, 0);
    g.phase = 'running';
    g.runFor(0.1);
    expect(a.rateBuff).toBeCloseTo(0.9);
    expect(far.rateBuff).toBe(1);
  });

  it('can stand anywhere: it needs towers near it, not the walkway', () => {
    const g = game({ size: { w: 21, h: 10 } });
    expect(g.canPlace('poster', 8, 9).ok).toBe(true);
    expect(g.canPlace('autoreply', 8, 9).reason).toMatch(/Too far/);
  });

  it('FRAMED PRINT makes them hit harder and, at tier 3, through shields', () => {
    const g = game();
    const a = g.place('autoreply', 8, 1).tower!;
    const before = g.liveStats(a).damage;
    const p = g.place('poster', 9, 0).tower!;
    for (let i = 0; i < 3; i++) expect(g.upgrade(p.id, 1).ok).toBe(true);
    const s = g.liveStats(a);
    expect(s.damage).toBeCloseTo((before + 1) * 1.2);
    expect(s.breaksBoxes).toBe(true);
  });

  it('LED WALL reaches further and makes upgrades cheaper around it', () => {
    const g = game();
    const a = g.place('autoreply', 8, 1).tower!;
    const cost = g.pathCostFor(a, 0)!;
    const range = g.liveStats(a).range;
    const p = g.place('poster', 9, 0).tower!;
    for (let i = 0; i < 3; i++) expect(g.upgrade(p.id, 2).ok).toBe(true);
    expect(g.liveStats(a).range).toBeCloseTo(range * 1.1);
    expect(g.pathCostFor(a, 0)).toBe(Math.round(cost * 0.85));
  });
});

describe('the tribune', () => {
  it('a tower on a step reaches 25% further', () => {
    const grid = ['.^...................', '.....................', '====================D', '.....................', '.....................', '.....................'];
    const g = game({ grid });
    const up = g.place('autoreply', 1, 0).tower!;
    const down = g.place('autoreply', 3, 0).tower!;
    expect(g.liveStats(up).range).toBeCloseTo(g.liveStats(down).range * RAISED_RANGE);
  });
});

describe('the fire alarm', () => {
  it('everyone stops, then rushes to the front', () => {
    const hz = { type: 'firealarm' as const, first: 2, every: 30, freeze: 2, rush: 6, haste: 1.4 };
    const g = new Game(corridor(['newhire:1@1'], { hazard: hz }));
    g.start();
    g.runFor(2.1);
    expect(g.hazardOn).toBe(true);
    const e = g.enemies[0];
    const at = e.dist;
    g.runFor(1);
    expect(e.dist).toBeCloseTo(at);
    expect(g.lunchHaste).toBe(0);
    g.runFor(1.5);
    expect(g.lunchHaste).toBe(1.4);
    expect(e.dist).toBeGreaterThan(at);
    g.runFor(6);
    expect(g.hazardOn).toBe(false);
  });
});

describe('two entrances at once', () => {
  it('splitPaths sends one colleague through each entrance in turn', () => {
    const paths = [
      [
        { x: -1, y: 2.5 },
        { x: 20, y: 2.5 },
      ],
      [
        { x: -1, y: 4.5 },
        { x: 20, y: 4.5 },
        { x: 20, y: 2.5 },
      ],
    ];
    const g = new Game(corridor(['intern:4@0.1'], { paths, splitPaths: true }));
    g.start();
    g.runFor(1);
    expect(new Set(g.enemies.map((e) => e.pathIndex))).toEqual(new Set([0, 1]));
  });
});
