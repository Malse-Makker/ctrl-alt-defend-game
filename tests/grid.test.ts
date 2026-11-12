// The tile grid from the level design: where you may build, what blocks sight, and the gates.

import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/sim/data/levels';
import { chairTile, GATE_HOLD, Game, TICK } from '../src/sim/game';
import { isWalkwayLetter, parseGrid } from '../src/sim/grid';
import { deskTurn } from '../src/render/world';

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
  it.each(gridLevels.map((l) => [l.id, l] as const))('level %i: a tile you cannot build on for furniture has furniture on it', (_, level) => {
    const covered = (x: number, y: number) =>
      level.decor.some((d) => x >= d.rect.x && x < d.rect.x + d.rect.w && y >= d.rect.y && y < d.rect.y + d.rect.h) ||
      (level.walls ?? []).some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    const bare: string[] = [];
    level.grid!.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if ('tHRw'.includes(row[x]) && !covered(x, y)) bare.push(`${x},${y} '${row[x]}'`);
    });
    expect(bare).toEqual([]);
  });
});

describe('Reception', () => {
  const level = LEVELS[1];

  it('tall furniture blocks sight, low furniture does not', () => {
    const g = new Game(level);
    // The logo wall (13, 3..4) in the glass wall: from the offices you cannot see past it.
    expect(g.lineOfSight(14.5, 3.6, 11.5, 3.6)).toBe(false);
    // The glass itself is see-through, and so are the low lounge chairs (6..8, 5..6).
    expect(g.lineOfSight(14.5, 9.5, 11.5, 9.5)).toBe(true);
    expect(g.lineOfSight(9.5, 6, 5.5, 6)).toBe(true);
    expect(g.canPlace('autoreply', 13, 4).ok).toBe(false);
    expect(g.canPlace('autoreply', 7, 5).ok).toBe(false);
  });

  it('the glass wall runs the whole floor: the only way through is the gate', () => {
    const g = new Game(level);
    const wall = level.grid!.map((row) => row[13]);
    expect(wall.join('')).toMatch(/^[gHtG]+$/);
    const through = wall.flatMap((_, y) => (g.isPathTile(13, y) ? [y] : []));
    expect(through).toEqual([g.gates[0].y - 0.5]);
  });

  it('everyone walks past the reception desk before the gates', () => {
    const g = new Game(level);
    const desk = level.decor.find((d) => d.model === 'reception_desk')!;
    const path = g.paths[0];
    const passDesk = Math.min(...Array.from({ length: 400 }, (_, i) => i * (path.length / 400)).filter((d) => {
      const p = path.pointAt(d);
      return p.x >= desk.rect.x && p.x <= desk.rect.x + desk.rect.w && Math.abs(p.y - (desk.rect.y + 1.5)) < 0.01;
    }));
    expect(passDesk).toBeLessThan(g.gates[0].dist);
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

  it('you build on the kitchen floor, never on the furniture', () => {
    const g = new Game(level);
    g.coffee = 5000;
    expect(g.canPlace('autoreply', 4, 3).ok).toBe(true); // floor inside the first bend
    expect(g.canPlace('autoreply', 9, 7).ok).toBe(true); // floor by the dining table
    expect(g.canPlace('autoreply', 6, 4).ok).toBe(false); // a standing table
    expect(g.canPlace('autoreply', 6, 8).ok).toBe(false); // the dining table
    expect(g.canPlace('autoreply', 3, 0).ok).toBe(false); // the counter
    expect(g.canPlace('autoreply', 5, 1).ok).toBe(false); // the spill by the coffee machine
    expect(level.decor.some((d) => d.surface !== undefined)).toBe(false);
  });

  it('a full kitchen: the floor you can build on is scarce', () => {
    let free = 0;
    level.grid!.forEach((row) => (free += [...row].filter((c) => c === '.').length));
    expect(free).toBe(65);
  });
});

describe('your desk', () => {
  // The chair side of the desk model points along +z: (sin a, cos a) for a turn of a.
  const chairSide = (a: number) => ({ x: Math.round(Math.sin(a)), y: Math.round(Math.cos(a)) });

  it.each(Object.values(LEVELS).map((l) => [l.id, l] as const))('level %i: walkway, desk, chair in one line', (_, level) => {
    const g = new Game(level);
    const pts = level.paths[0];
    const arrive = { x: Math.sign(pts[pts.length - 1].x - pts[pts.length - 2].x), y: Math.sign(pts[pts.length - 1].y - pts[pts.length - 2].y) };
    expect(chairSide(deskTurn(level))).toEqual(arrive);
    const chair = chairTile(level);
    expect(chair).toEqual({ x: level.desk.x + arrive.x, y: level.desk.y + arrive.y });
    // Room for the chair: on the floor, off the walkway, no furniture in the way, nobody builds there.
    expect(g.inBounds(chair.x, chair.y)).toBe(true);
    expect(g.isPathTile(chair.x, chair.y)).toBe(false);
    expect(level.decor.some((d) => chair.x >= d.rect.x && chair.x < d.rect.x + d.rect.w && chair.y >= d.rect.y && chair.y < d.rect.y + d.rect.h)).toBe(false);
    g.coffee = 5000;
    expect(g.canPlace('coffee', chair.x, chair.y).ok).toBe(false);
  });
});
