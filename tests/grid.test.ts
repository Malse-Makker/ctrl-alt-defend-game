// The tile grid from the level design: where you may build, what blocks sight, and the gates.

import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/sim/data/levels';
import { GATE_HOLD, Game, TICK } from '../src/sim/game';
import { isWalkwayLetter, parseGrid } from '../src/sim/grid';

const gridLevels = Object.values(LEVELS).filter((l) => l.grid);

describe('the tile grid', () => {
  it('refuses a grid that does not fit the floor, or a letter nobody knows', () => {
    expect(() => parseGrid(['...', '...'], 3, 3)).toThrow(/rows/);
    expect(() => parseGrid(['...', '..', '...'], 3, 3)).toThrow(/row 1/);
    expect(() => parseGrid(['...', '.?.', '...'], 3, 3)).toThrow(/Unknown/);
  });

  it.each(gridLevels.map((l) => [l.id, l] as const))('level %i: the walkway in the grid is exactly where the path runs', (_, level) => {
    const g = new Game(level);
    const wrong: string[] = [];
    level.grid!.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (isWalkwayLetter(row[x]) !== g.isPathTile(x, y)) wrong.push(`${x},${y} '${row[x]}'`);
      }
    });
    expect(wrong).toEqual([]);
  });

  it.each(gridLevels.map((l) => [l.id, l] as const))('level %i: furniture you can see stands on tiles you cannot build on, or on a worktop', (_, level) => {
    const g = new Game(level);
    const wrong: string[] = [];
    for (const d of level.decor) {
      for (let y = d.rect.y; y < d.rect.y + d.rect.h; y++) {
        for (let x = d.rect.x; x < d.rect.x + d.rect.w; x++) {
          const free = !g.isBlockedTile(x, y) && !g.isPathTile(x, y);
          if (free && d.surface === undefined) wrong.push(`${d.model} on ${x},${y}`);
          if (d.surface !== undefined && level.grid![y][x] !== 'o') wrong.push(`worktop ${d.model} on '${level.grid![y][x]}' at ${x},${y}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe('Reception', () => {
  const level = LEVELS[1];

  it('tall furniture blocks sight, low furniture does not', () => {
    const g = new Game(level);
    // The logo wall (13, 4..5) stands between (14, 5) and the walkway at x = 11.5.
    expect(g.lineOfSight(14.5, 5, 11.5, 5)).toBe(false);
    // The lounge chairs (6..8, 5..6) are low: you can shoot over them.
    expect(g.lineOfSight(9.5, 6, 5.5, 6)).toBe(true);
    expect(g.canPlace('autoreply', 13, 4).ok).toBe(false);
    expect(g.canPlace('autoreply', 7, 5).ok).toBe(false);
  });

  it('everyone stops at the gate to scan their pass, then walks on', () => {
    const g = new Game(level, { seed: 1 });
    expect(g.gates.length).toBe(1);
    const gate = g.gates[0];
    g.phase = 'running';
    const e = g.spawn('intern', 0, gate.dist - 0.3, false);
    let held = 0;
    for (let i = 0; i < 120; i++) {
      const before = e.dist;
      g.step(TICK);
      if (e.dist === before) held += TICK;
      if (e.dist > gate.dist + 0.5) break;
    }
    expect(held).toBeGreaterThanOrEqual(GATE_HOLD - TICK);
    expect(held).toBeLessThan(GATE_HOLD + 2 * TICK);
    expect(e.dist).toBeGreaterThan(gate.dist);
    expect(g.drainEvents().filter((ev) => ev.t === 'gate').length).toBe(1);
  });
});

describe('Coffee Corner', () => {
  const level = LEVELS[2];

  it('you only build on the worktops: counters, tables and the bar', () => {
    const g = new Game(level);
    g.coffee = 5000;
    expect(g.canPlace('autoreply', 6, 4).ok).toBe(true); // a standing table
    expect(g.canPlace('autoreply', 6, 8).ok).toBe(true); // the dining table
    expect(g.canPlace('coffee', 4, 13).ok).toBe(true); // the bar by the window
    expect(g.canPlace('autoreply', 5, 4).ok).toBe(false); // the kitchen floor
    expect(g.canPlace('autoreply', 5, 7).ok).toBe(false); // a chair
    let worktops = 0;
    level.grid!.forEach((row) => (worktops += [...row].filter((c) => c === 'o').length));
    expect(worktops).toBe(33);
  });
});
