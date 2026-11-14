// The boss's side door: a route of its own, walkway from the start, shut until he arrives. Only
// his people use it; waves never do.

import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/sim/data/levels';
import { COLLEAGUES } from '../src/sim/data/colleagues';
import { Game, TICK } from '../src/sim/game';
import { corridor } from './helpers';

const DOOR = [
  { x: 10.5, y: -1.5 },
  { x: 10.5, y: 2.5 },
  { x: 20, y: 2.5 },
];

function withDoor(waves: string[]): Game {
  const g = new Game(corridor(waves, { towers: ['coffee', 'autoreply'], bossDoor: DOOR }));
  g.phase = 'running';
  return g;
}

describe('the boss door', () => {
  it('is walkway from the start, so nobody builds in the way', () => {
    const g = withDoor(['intern:1@1']);
    expect(g.doorPath).toBe(1);
    expect(g.isPathTile(10, 0)).toBe(true);
    expect(g.isPathTile(10, 1)).toBe(true);
    expect(g.canPlace('autoreply', 10, 1).ok).toBe(false);
  });

  it('stays shut until a boss is on the floor', () => {
    const g = withDoor(['intern:1@1']);
    expect(g.doorOpen).toBe(false);
    g.spawn('intern', 0, 3, false);
    g.step(TICK);
    expect(g.doorOpen).toBe(false);
    g.spawn('headofcomms', 0, 3, false);
    g.step(TICK);
    expect(g.doorOpen).toBe(true);
  });

  it('his people come in through it, queued up behind the door', () => {
    const g = withDoor(['intern:1@1']);
    const boss = g.spawn('headofcomms', 0, 4, false);
    boss.addTimer = 0;
    g.step(TICK);
    const adds = g.enemies.filter((e) => e.isAdd);
    expect(adds.length).toBe(COLLEAGUES.headofcomms.boss!.addCount);
    for (const a of adds) {
      expect(a.pathIndex).toBe(g.doorPath);
      expect(g.onFloor(a)).toBe(false);
    }
  });

  it('waves never use it', () => {
    const g = new Game(corridor(['intern:12@0.2'], { towers: ['coffee', 'autoreply'], bossDoor: DOOR, splitPaths: true }));
    g.start();
    const paths = new Set<number>();
    g.runFor(8, (gg) => {
      for (const e of gg.enemies) if (!e.isAdd) paths.add(e.pathIndex);
    });
    expect(paths.size).toBeGreaterThan(0);
    expect([...paths]).toEqual([0]);
  });

  it('without a door, his people turn up next to him: his bodyguards', () => {
    const g = new Game(corridor(['intern:1@1'], { towers: ['coffee', 'autoreply'] }));
    g.phase = 'running';
    expect(g.doorPath).toBeNull();
    const boss = g.spawn('headofcomms', 0, 9, false);
    boss.addTimer = 0;
    g.step(TICK);
    for (const a of g.enemies.filter((e) => e.isAdd)) {
      expect(a.pathIndex).toBe(0);
      expect(Math.abs(a.dist - boss.dist)).toBeLessThan(2);
    }
  });

  it('the Presentation Room has one, by the lectern', () => {
    expect(LEVELS[3].bossDoor).toBeDefined();
  });
});
