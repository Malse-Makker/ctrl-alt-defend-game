// Level 4: Thumbtacks, Self-Service, The Impersonator, The Cleaner and the lunch break.

import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { LEVELS } from '../src/sim/data/levels';
import { corridor } from './helpers';

const TOWERS = ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice'];

function game(waves: string[] = ['intern:1@1'], extra = {}) {
  const g = new Game(corridor(waves, { towers: TOWERS, ...extra }));
  g.coffee = 5000;
  return g;
}

describe('Thumbtacks', () => {
  it('drops piles on the walkway within range', () => {
    const g = game(['intern:1@60']);
    const t = g.place('thumbtacks', 8, 1).tower!;
    g.start();
    g.runFor(5);
    expect(g.piles.length).toBeGreaterThan(1);
    for (const p of g.piles) {
      expect(p.y).toBeCloseTo(2.5, 0);
      expect(Math.hypot(p.x - t.x, p.y - t.y)).toBeLessThanOrEqual(2.0 + 0.2);
    }
  });

  it('every tack hits one colleague, each colleague once per pile, and the pile runs out', () => {
    const g = game(['chaser:8@0.05']);
    g.place('thumbtacks', 8, 1);
    g.start();
    // Let exactly one pile land before the crowd arrives.
    g.runFor(0.05);
    expect(g.piles.length).toBe(1);
    const pile = g.piles[0];
    g.towers[0].cooldown = 999;
    g.runFor(8);
    // Five tacks, eight Chasers: the pile is used up and gone.
    expect(g.piles.find((p) => p.id === pile.id)).toBeUndefined();
    expect(g.towers[0].stats.damage).toBeGreaterThanOrEqual(5 * 2 - 1e-6);
  });

  it('hits The Impersonator without seeing him, but not The Board Member', () => {
    const g = game(['impersonator:1@1']);
    const t = g.place('thumbtacks', 8, 1).tower!;
    g.start();
    g.runFor(20);
    expect(t.stats.damage).toBeGreaterThan(0);
    const b = game(['boardmember:1@1']);
    const tb = b.place('thumbtacks', 8, 1).tower!;
    b.start();
    b.runFor(20);
    expect(tb.stats.damage).toBe(0);
  });

  it('bounces off the archive box until Drawing Pins', () => {
    const g = game(['oldguard:1@1']);
    const t = g.place('thumbtacks', 8, 1).tower!;
    g.start();
    g.runFor(25);
    expect(t.stats.damage).toBe(0);
    const h = game(['oldguard:1@1']);
    const t2 = h.place('thumbtacks', 8, 1).tower!;
    for (let i = 0; i < 3; i++) expect(h.upgrade(t2.id, 0).ok).toBe(true);
    h.start();
    h.runFor(25);
    expect(t2.stats.damage).toBeGreaterThan(0);
  });

  it('piles get old, and a tower keeps a limited number on the floor', () => {
    const g = game(['intern:1@200']);
    const t = g.place('thumbtacks', 8, 1).tower!;
    g.upgrade(t.id, 1);
    g.upgrade(t.id, 1);
    g.start();
    g.runFor(60);
    expect(g.piles.length).toBeLessThanOrEqual(24);
    const oldest = Math.min(...g.piles.map((p) => p.life));
    expect(oldest).toBeGreaterThan(0);
  });

  it('the targeting mode picks which end of the range gets the piles', () => {
    const near = game(['intern:1@60']);
    const a = near.place('thumbtacks', 8, 1).tower!;
    near.setTargeting(a.id, 'first');
    near.start();
    near.runFor(10);
    const far = game(['intern:1@60']);
    const b = far.place('thumbtacks', 8, 1).tower!;
    far.setTargeting(b.id, 'last');
    far.start();
    far.runFor(10);
    const avg = (g: Game) => g.piles.reduce((s, p) => s + p.x, 0) / g.piles.length;
    // The desk is to the right: 'first' lands further right than 'last'.
    expect(avg(near)).toBeGreaterThan(avg(far) + 1);
  });
});

describe('Self-Service', () => {
  it('answers everyone in its circle at once', () => {
    const g = game(['intern:6@0.01']);
    const t = g.place('selfservice', 8, 1).tower!;
    g.start();
    // Most colleagues answered in a single tick.
    let most = 0;
    let seen = 0;
    g.runFor(10, (gg) => {
      const fresh = gg.events.slice(seen).filter((e) => e.t === 'shot' && e.towerId === t.id).length;
      seen = gg.events.length;
      most = Math.max(most, fresh);
    });
    expect(most).toBeGreaterThanOrEqual(5);
  });
});

describe('The Impersonator', () => {
  it('walks past towers that cannot see him, until a Shredder zone shows him up', () => {
    const g = game(['impersonator:1@1']);
    g.place('autoreply', 8, 1);
    g.start();
    g.runFor(20);
    expect(g.stats.leaks.impersonator).toBe(1);
    const h = game(['impersonator:1@1']);
    h.place('autoreply', 8, 1);
    h.place('shredder', 7, 3);
    h.start();
    h.runFor(20);
    expect(h.stats.kills.impersonator).toBe(1);
  });
});

describe('The Cleaner', () => {
  it('hurries everyone near him along', () => {
    const g = game(['cleaner:1@1 + intern:1@0.1']);
    g.start();
    g.runFor(1.5);
    const intern = g.enemies.find((e) => e.type === 'intern')!;
    expect(intern.haste).toBeGreaterThan(1);
  });

  it('sweeps up tack piles near him', () => {
    const g = game(['cleaner:1@1']);
    const t = g.place('thumbtacks', 8, 1).tower!;
    g.start();
    g.runFor(0.5);
    t.cooldown = 999;
    const before = g.piles.length;
    expect(before).toBeGreaterThan(0);
    g.runFor(20);
    expect(g.piles.length).toBe(0);
    // His own crowd may step on a pile first; he never does.
    const c = g.enemies.find((e) => e.type === 'cleaner')!;
    expect(c.hp).toBe(c.maxHp);
  });

  it('mops a Shredder zone he walks into: it stops for a while', () => {
    const g = game(['cleaner:1@1']);
    const s = g.place('shredder', 8, 3).tower!;
    g.start();
    let mopped = false;
    g.runFor(30, () => {
      if (s.mopped > 0) mopped = true;
    });
    expect(mopped).toBe(true);
  });
});

describe('lunch break', () => {
  const hz = { type: 'lunch' as const, first: 2, every: 20, window: 6, swarm: 'intern:5@0.1', haste: 1.3 };

  it('brings a crowd of Interns and speeds everyone up while it lasts', () => {
    const g = game(['newhire:1@1', 'newhire:1@1'], { hazard: hz });
    g.start();
    g.runFor(2.05);
    expect(g.hazardOn).toBe(true);
    expect(g.lunchHaste).toBe(1.3);
    g.runFor(1);
    expect(g.enemies.filter((e) => e.type === 'intern').length).toBe(5);
    g.runFor(6);
    expect(g.hazardOn).toBe(false);
    expect(g.lunchHaste).toBe(1);
  });

  it('does not block building and has nothing to solve', () => {
    const g = game(['newhire:1@1', 'newhire:1@1'], { hazard: hz });
    g.start();
    g.runFor(2.05);
    expect(g.hazardBlocks(0)).toBe(false);
    expect(g.solveHazard(0).ok).toBe(false);
    expect(g.canPlace('autoreply', 3, 1).ok).toBe(true);
  });

  it('skips the boss wave, so the day can end', () => {
    const g = game(['intern:1@1'], { hazard: { ...hz, first: 5 } });
    g.start();
    g.runFor(4);
    expect(g.waveIndex).toBe(g.totalWaves);
    g.runFor(10);
    expect(g.hazardOn).toBe(false);
  });
});

describe('snapshots carry the new state', () => {
  it('piles, hidden colleagues and mopped zones survive the trip', () => {
    const g = game(['impersonator:3@0.5']);
    g.place('thumbtacks', 8, 1);
    const s = g.place('shredder', 3, 3).tower!;
    g.start();
    g.runFor(2);
    s.mopped = 3;
    const mirror = game();
    mirror.applySnapshot(g.toSnapshot());
    expect(mirror.piles.length).toBe(g.piles.length);
    expect(mirror.towers.find((t) => t.defId === 'shredder')!.mopped).toBeGreaterThan(0);
    expect(mirror.enemies.map((e) => e.revealed)).toEqual(g.enemies.map((e) => e.revealed));
  });
});

describe('the Canteen', () => {
  it('has a lunch break, wet floor where you cannot build, and ends on The Cleaner', () => {
    const l = LEVELS[4];
    expect(l.hazard?.type).toBe('lunch');
    const g = new Game(l);
    const wet = l.decor.filter((d) => d.model === 'wet_floor');
    expect(wet.length).toBeGreaterThan(3);
    for (const d of wet) expect(g.canPlace('autoreply', d.rect.x, d.rect.y).ok).toBe(false);
    expect(l.waves[l.waves.length - 1]).toMatch(/^cleaner:1/);
    // Softlock rule from the design: the Shredder and Thumbtacks are there before the first Impersonator.
    expect(l.towers).toContain('shredder');
    expect(l.towers).toContain('thumbtacks');
  });
});
