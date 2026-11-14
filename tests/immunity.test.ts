// Two things a colleague can shrug off, like lead and camo: a box (only towers that break boxes
// get through it) and being hidden (only towers that see hidden colleagues can aim at him).
// DIGITAL and PHYSICAL still matter on the floor (bad wifi, no internet), but nobody is immune.

import { describe, expect, it } from 'vitest';
import { COLLEAGUES } from '../src/sim/data/colleagues';
import { TOWERS, type Tiers } from '../src/sim/data/towers';
import { Game, computeStats, type Enemy } from '../src/sim/game';
import { corridor } from './helpers';

const ALL = Object.keys(TOWERS);

function game(): Game {
  const g = new Game(corridor(['intern:1@1'], { towers: ALL }));
  g.wallets = g.wallets.map(() => 5000);
  g.phase = 'running';
  return g;
}

function put(g: Game, type: string, d: number): Enemy {
  const e = g.spawn(type, 0, d, false);
  e.stunTime = 1e9;
  return e;
}

function built(g: Game, def: string, tiers: Tiers, tx = 8, ty = 1) {
  const t = g.place(def, tx, ty).tower!;
  tiers.forEach((n, p) => {
    for (let i = 0; i < n; i++) expect(g.upgrade(t.id, p).ok, `${def} path ${p}`).toBe(true);
  });
  return t;
}

describe('only two properties', () => {
  it('nobody is immune to a kind of tower any more', () => {
    for (const c of Object.values(COLLEAGUES)) expect('immune' in c, c.id).toBe(false);
  });

  it('the Board Member sits behind his laptop, the Cold Caller withholds his number', () => {
    expect(COLLEAGUES.boardmember.box).toBe(true);
    expect(COLLEAGUES.boardmember.shield).toBeGreaterThan(0);
    expect(COLLEAGUES.coldcaller.invisible).toBe(true);
  });
});

describe('boxes, like lead', () => {
  it('heavy towers break boxes from the start, light ones only with the right upgrade', () => {
    for (const id of ['artillery', 'keyboardsmash', 'pomodoro']) expect(computeStats(TOWERS[id], [0, 0, 0]).breaksBoxes, id).toBe(true);
    expect(computeStats(TOWERS.autoreply, [0, 0, 0]).breaksBoxes).toBe(false);
    expect(computeStats(TOWERS.autoreply, [2, 0, 0]).breaksBoxes).toBe(false);
    expect(computeStats(TOWERS.autoreply, [3, 0, 0]).breaksBoxes).toBe(true);
  });

  it('no threshold: however hard a light tower hits, it bounces off', () => {
    const g = game();
    const og = put(g, 'oldguard', 9);
    expect(g.damage(og, 500).result).toBe('blocked');
    expect(og.shield).toBe(COLLEAGUES.oldguard.shield);
  });

  it('a tower that cannot break the box aims at someone it can hurt first', () => {
    const g = game();
    built(g, 'autoreply', [0, 0, 0]);
    const bm = put(g, 'boardmember', 9.6);
    const nh = put(g, 'newhire', 8.4);
    nh.hp = nh.maxHp = 1000;
    g.runFor(2);
    expect(nh.hp).toBeLessThan(1000);
    expect(bm.shield).toBe(COLLEAGUES.boardmember.shield);
  });

  it('with nobody else in range it still tries, and bounces off', () => {
    const g = game();
    const t = built(g, 'autoreply', [0, 0, 0]);
    put(g, 'boardmember', 9.6);
    g.runFor(2);
    expect(t.stats.shots).toBeGreaterThan(0);
  });
});

describe('hidden, like camo', () => {
  it('Tracking Pixel finds him for good: after one hit, a plain Auto-Reply can aim at him too', () => {
    const g = game();
    built(g, 'autoreply', [0, 0, 2], 8, 1);
    const plain = built(g, 'autoreply', [0, 0, 0], 12, 1);
    const cc = put(g, 'coldcaller', 8.8);
    cc.hp = cc.maxHp = 1000;
    g.runFor(1.5);
    expect(cc.exposed).toBe(true);
    // Walked away from the Tracking Pixel and nowhere near a Shredder: still in sight.
    cc.dist = 12.4;
    g.runFor(1.5);
    expect(cc.revealed).toBe(true);
    expect(plain.stats.shots).toBeGreaterThan(0);
  });

  it('being found survives a snapshot', () => {
    const g = game();
    const cc = put(g, 'coldcaller', 9);
    cc.exposed = true;
    g.runFor(0.1);
    const mirror = game();
    mirror.applySnapshot(g.toSnapshot());
    const m = mirror.enemies.find((e) => e.id === cc.id)!;
    expect(m.exposed).toBe(true);
    expect(m.revealed).toBe(true);
  });

  it('only Tracking Pixel and Paper Trail find colleagues for good', () => {
    const found: string[] = [];
    for (const def of Object.values(TOWERS)) {
      def.paths.forEach((p) => p.tiers.forEach((t) => {
        if (t.effect.exposes) found.push(t.name);
      }));
    }
    expect(found.sort()).toEqual(['Paper Trail', 'Tracking Pixel']);
  });
});
