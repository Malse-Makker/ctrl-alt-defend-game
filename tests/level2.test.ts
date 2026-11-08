// The Level 2 mechanics: what the tower and colleague texts promise must be true in the code.

import { describe, expect, it } from 'vitest';
import { Game, TICK, type Enemy } from '../src/sim/game';
import { corridor } from './helpers';

const TOWERS = ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder'];

function setup(def: string, tiers: [number, number, number] = [0, 0, 0], tx = 8, ty = 1) {
  const g = new Game(corridor(['intern:1@1'], { towers: TOWERS }));
  g.coffee = 5000;
  const r = g.place(def, tx, ty);
  expect(r.ok, r.reason).toBe(true);
  const t = r.tower!;
  tiers.forEach((n, p) => {
    for (let i = 0; i < n; i++) expect(g.upgrade(t.id, p).ok).toBe(true);
  });
  g.phase = 'running';
  g.drainEvents();
  return { g, t };
}

function put(g: Game, type: string, d: number, hp?: number): Enemy {
  const e = g.spawn(type, 0, d, false);
  if (hp !== undefined) e.hp = e.maxHp = hp;
  return e;
}

describe('Headphones', () => {
  it('slows everyone in range at once, no damage', () => {
    const { g } = setup('headphones');
    const a = put(g, 'newhire', 8.5);
    const b = put(g, 'newhire', 10);
    g.step(TICK);
    expect(a.slowTime).toBeGreaterThan(0);
    expect(b.slowTime).toBeGreaterThan(0);
    expect(a.slowMult).toBeCloseTo(0.65);
    expect(a.hp).toBe(12);
    expect(g.drainEvents().some((e) => e.t === 'pulse')).toBe(true);
  });

  it('Noise Cancelling (tier 2) really stuns, and bosses shrug most of it off', () => {
    const { g } = setup('headphones', [2, 0, 0]);
    const n = put(g, 'newhire', 8.5);
    const boss = put(g, 'repairguy', 9.5);
    boss.addTimer = 1e9;
    g.step(TICK);
    expect(n.stunTime).toBeGreaterThan(1.4);
    expect(boss.stunTime).toBeLessThan(0.5);
  });

  it('repeated stuns on the same colleague land shorter', () => {
    const { g, t } = setup('headphones', [2, 0, 0]);
    const n = put(g, 'newhire', 8.5);
    n.stunTime = 1e-9;
    g.step(TICK);
    const first = n.stunTime;
    n.stunTime = 0;
    t.pulseTimer = 0;
    g.step(TICK);
    expect(n.stunTime).toBeLessThan(first);
  });

  it('Lo-fi Beats makes every hit on slowed colleagues land 1 harder', () => {
    const { g } = setup('headphones', [0, 0, 1]);
    const n = put(g, 'newhire', 8.5, 100);
    g.step(TICK);
    expect(g.damage(n, 2).dealt).toBe(3);
  });

  it('Flow State makes towers in range reload faster', () => {
    const { g } = setup('headphones', [0, 2, 4]);
    const r = g.place('autoreply', 9, 1);
    g.step(TICK);
    expect(r.tower!.rateBuff).toBeCloseTo(0.8);
  });
});

describe('The Chatterbox', () => {
  it('silences every tower near him, but not Coffee Machines', () => {
    const { g, t } = setup('autoreply');
    const m = g.place('coffee', 10, 1).tower!;
    put(g, 'chatterbox', 9.5, 1e6).stunTime = 0;
    g.step(TICK);
    expect(t.silenced).toBe(true);
    expect(m.silenced).toBe(false);
    expect(t.stats.shots).toBe(0);
  });

  it('ignores slows, and only headphones can stun him', () => {
    const hp = setup('headphones', [0, 0, 0], 2, 1);
    const c = put(hp.g, 'chatterbox', 9);
    hp.g.step(TICK);
    expect(c.dist).toBeGreaterThan(9);
    expect(c.slowTime).toBe(0);
    const art = setup('artillery', [3, 0, 0], 2, 5);
    const c2 = put(art.g, 'chatterbox', 15, 1e6);
    art.g.step(TICK);
    expect(c2.stunTime).toBe(0);
    const nc = setup('headphones', [2, 0, 0], 2, 1);
    const c3 = put(nc.g, 'chatterbox', 3);
    nc.g.step(TICK);
    expect(c3.stunTime).toBeGreaterThan(0);
  });

  it('Noise Cancelling headphones cannot be talked quiet', () => {
    const { g, t } = setup('headphones', [2, 0, 0]);
    put(g, 'chatterbox', 9.5, 1e6);
    g.step(TICK);
    expect(t.silenced).toBe(false);
  });

  it('a stunned Chatterbox stops silencing', () => {
    const { g, t } = setup('autoreply');
    const c = put(g, 'chatterbox', 9.5, 1e6);
    c.stunTime = 5;
    g.step(TICK);
    expect(t.silenced).toBe(false);
  });
});

describe('Office Artillery', () => {
  it('reaches the whole floor', () => {
    const { g, t } = setup('artillery', [0, 0, 0], 0, 5);
    const far = put(g, 'newhire', 20, 100);
    g.step(TICK);
    expect(far.hp).toBe(85);
    expect(t.stats.shots).toBe(1);
  });

  it('does not shoot colleagues who are still outside the door', () => {
    const { g, t } = setup('artillery', [0, 0, 0], 0, 5);
    put(g, 'newhire', 0.2, 100);
    g.step(TICK);
    expect(t.stats.shots).toBe(0);
  });

  it('breaks the Old Guard box where Auto-Reply bounces off', () => {
    const art = setup('artillery');
    const og = put(art.g, 'oldguard', 9);
    art.g.step(TICK);
    expect(og.shield).toBe(15);
    const ar = setup('autoreply', [2, 0, 0]);
    const og2 = put(ar.g, 'oldguard', 9);
    ar.g.step(TICK);
    expect(og2.shield).toBe(30);
    expect(ar.g.drainEvents().some((e) => e.t === 'shot' && e.result === 'blocked')).toBe(true);
  });

  it('Industrial Tacker pins the target for a second', () => {
    const { g } = setup('artillery', [3, 0, 0]);
    const n = put(g, 'newhire', 9, 1000);
    g.step(TICK);
    expect(n.stunTime).toBeGreaterThan(0.9);
  });

  it('is in person: the Board Member does not even notice', () => {
    const { g } = setup('artillery');
    const b = put(g, 'boardmember', 9);
    g.step(TICK);
    expect(b.hp).toBe(40);
  });
});

describe('The Shredder', () => {
  it('shares its damage over everyone inside and slows them', () => {
    const { g } = setup('shredder', [0, 0, 0], 8, 1);
    const a = put(g, 'newhire', 8.6, 100);
    const b = put(g, 'newhire', 9.4, 100);
    a.stunTime = b.stunTime = 1e9;
    for (let i = 0; i < 60; i++) g.step(TICK);
    expect(100 - a.hp).toBeCloseTo(1, 1);
    expect(100 - b.hp).toBeCloseTo(1, 1);
    expect(a.slowTime).toBeGreaterThan(0);
  });

  it('may not touch the Old Guard archive, and does nothing to the Board Member', () => {
    const { g } = setup('shredder', [2, 0, 0], 8, 1);
    const og = put(g, 'oldguard', 9);
    const bm = put(g, 'boardmember', 9.2);
    og.stunTime = bm.stunTime = 1e9;
    for (let i = 0; i < 120; i++) g.step(TICK);
    expect(og.hp + og.shield).toBe(76);
    expect(bm.hp).toBe(40);
  });

  it('reveals hidden colleagues inside it', () => {
    const { g } = setup('shredder', [0, 0, 0], 8, 1);
    const e = put(g, 'newhire', 9);
    e.def = { ...e.def, invisible: true };
    e.stunTime = 1e9;
    g.step(TICK);
    expect(e.revealed).toBe(true);
  });

  it('Sticky Paper keeps the damage going after the zone', () => {
    const { g } = setup('shredder', [3, 0, 0], 8, 1);
    const e = put(g, 'newhire', 9, 1000);
    e.stunTime = 1e9;
    g.step(TICK);
    // Set to 3 s, and the first tick already counts down.
    expect(e.bleedTime).toBeCloseTo(3, 1);
    expect(e.bleedDps).toBeCloseTo(9);
  });

  it('Recycling pays its owner extra for every colleague it deals with', () => {
    const { g } = setup('shredder', [0, 0, 1], 8, 1);
    const e = put(g, 'intern', 9, 0.01);
    e.stunTime = 1e9;
    const before = g.coffee;
    g.step(TICK);
    expect(e.alive).toBe(false);
    expect(g.coffee - before).toBeCloseTo(1 + 0.04 * 0.12 / 0.04 * 0.04, 0);
    expect(g.coffee - before).toBeGreaterThan(1);
  });
});

describe('The Repair Guy', () => {
  it('blocks every kind of income while he is on the floor, but sales still pay', () => {
    const g = new Game(corridor(['repairguy:1@1', 'intern:1@1'], { towers: TOWERS }));
    g.coffee = 500;
    const m = g.place('coffee', 2, 0).tower!;
    const t = g.place('autoreply', 2, 4).tower!;
    g.start();
    g.step(TICK);
    expect(g.incomeBlocked).toBe(true);
    const before = g.coffee;
    g.runFor(6);
    expect(g.coffee).toBe(before);
    expect(m.stats.coffee).toBe(0);
    g.sell(t.id);
    expect(g.coffee).toBeGreaterThan(before);
  });

  it('his toolbox stops light hits', () => {
    const { g } = setup('autoreply', [2, 0, 0]);
    const boss = put(g, 'repairguy', 9);
    boss.addTimer = 1e9;
    g.step(TICK);
    expect(boss.shield).toBe(100);
  });
});

describe('Supply Drop', () => {
  it('pays its owner at the start of every wave', () => {
    const g = new Game(corridor(['intern:1@1', 'intern:1@1'], { towers: TOWERS }));
    g.coffee = 5000;
    const t = g.place('artillery', 2, 0).tower!;
    for (let i = 0; i < 4; i++) g.upgrade(t.id, 2);
    g.start();
    const before = g.coffee;
    g.callNextWave();
    // Salary for wave 1 (5) plus the Supply Drop (20).
    expect(g.coffee - before).toBeCloseTo(25);
  });
});
