// Level 7: Delegation, The Phone Caller, exhaust fumes and The Smoking Colleague.

import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/sim/data/levels';
import { Game, TICK, type Enemy } from '../src/sim/game';
import { corridor } from './helpers';

const TOWERS = ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall', 'delegation'];

function game(waves: string[] = ['intern:1@1'], extra = {}) {
  const g = new Game(corridor(waves, { towers: TOWERS, ...extra }));
  g.coffee = 5000;
  return g;
}

function put(g: Game, type: string, d: number, hp?: number): Enemy {
  const e = g.spawn(type, 0, d, false);
  if (hp !== undefined) e.hp = e.maxHp = hp;
  return e;
}

describe('Delegation', () => {
  it('passes it on: every jump hits harder than the one before', () => {
    const g = game();
    g.place('delegation', 8, 1);
    g.phase = 'running';
    const line = [10.4, 9.6, 8.8, 8.0].map((d) => put(g, 'newhire', d, 100));
    for (const e of line) e.stunTime = 1e9;
    g.step(TICK);
    const taken = line.map((e) => 100 - e.hp);
    expect(taken[0]).toBeCloseTo(2, 5);
    expect(taken[1]).toBeCloseTo(2.8, 5);
    expect(taken[2]).toBeCloseTo(3.92, 5);
    expect(taken[3]).toBeCloseTo(5.488, 5);
  });
});

describe('The Phone Caller', () => {
  it('single-target towers aim at him first and only do him half', () => {
    const g = game();
    const t = g.place('autoreply', 8, 1).tower!;
    g.phase = 'running';
    const front = put(g, 'newhire', 10.5, 100);
    const caller = put(g, 'phonecaller', 8.5);
    front.stunTime = caller.stunTime = 1e9;
    g.step(TICK);
    expect(front.hp).toBe(100);
    expect(34 - caller.hp).toBeCloseTo(g.liveStats(t).damage / 2, 5);
  });

  it('a crowd tower hits him in full', () => {
    const g = game();
    const t = g.place('replyall', 8, 1).tower!;
    g.phase = 'running';
    const caller = put(g, 'phonecaller', 9);
    caller.stunTime = 1e9;
    g.step(TICK);
    expect(34 - caller.hp).toBeCloseTo(g.liveStats(t).damage, 5);
  });
});

describe('exhaust fumes', () => {
  const hz = { type: 'smoke' as const, first: 1, every: 30, window: 10, clouds: 3, radius: 30, rangeMult: 0.5 };

  it('towers in a cloud reach half as far; Office Artillery does not care', () => {
    const g = game(['intern:30@1'], { hazard: hz });
    const t = g.place('autoreply', 8, 1).tower!;
    const a = g.place('artillery', 12, 1).tower!;
    const before = g.liveStats(t).range;
    g.start();
    g.runFor(1.1);
    expect(g.smoke.length).toBe(3);
    expect(g.liveStats(t).range).toBeCloseTo(before / 2, 5);
    expect(g.liveStats(a).range).toBe(Infinity);
    g.runFor(11);
    expect(g.smoke.length).toBe(0);
    expect(g.liveStats(t).range).toBeCloseTo(before, 5);
  });
});

describe('The Smoking Colleague', () => {
  it('towers near him reach less far, and he leaves clouds behind', () => {
    const g = game(['smoker:1@1']);
    const near = g.place('autoreply', 4, 1).tower!;
    const far = g.place('autoreply', 18, 1).tower!;
    const full = g.liveStats(far).range;
    g.start();
    g.runFor(5);
    const smoker = g.enemies.find((e) => e.type === 'smoker')!;
    expect(Math.hypot(near.x - smoker.x, near.y - smoker.y)).toBeLessThan(3.2);
    expect(g.liveStats(near).range).toBeLessThan(full);
    expect(g.liveStats(far).range).toBeCloseTo(full, 5);
    g.runFor(3);
    expect(g.smoke.length).toBeGreaterThan(0);
  });

  it('a mirror sees the same smoke', () => {
    const g = game(['intern:30@1'], { hazard: { type: 'smoke', first: 1, every: 30, window: 10, clouds: 2, radius: 2, rangeMult: 0.5 } });
    g.start();
    g.runFor(1.1);
    const mirror = game();
    mirror.applySnapshot(g.toSnapshot());
    expect(mirror.smoke.length).toBe(2);
    expect(mirror.smoke[0].mult).toBe(0.5);
  });
});

describe('The Car Park', () => {
  it('has fumes, Delegation, Phone Callers and ends on The Smoking Colleague', () => {
    const l = LEVELS[7];
    expect(l.hazard?.type).toBe('smoke');
    expect(l.towers).toContain('delegation');
    expect(l.waves.some((w) => w.includes('phonecaller'))).toBe(true);
    expect(l.waves[l.waves.length - 1]).toMatch(/^smoker:1/);
  });
});
