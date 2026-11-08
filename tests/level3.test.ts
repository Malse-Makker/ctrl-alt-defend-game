// Level 3: Quick Reply's build-up, The Presenter, and the projector mini-game.

import { describe, expect, it } from 'vitest';
import { applyCommand, parseCommand } from '../src/sim/commands';
import { Game, TICK } from '../src/sim/game';
import { corridor } from './helpers';

const TOWERS = ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply'];

function setup(tiers: [number, number, number] = [0, 0, 0]) {
  const g = new Game(corridor(['intern:1@1'], { towers: TOWERS }));
  g.coffee = 5000;
  const t = g.place('quickreply', 8, 1).tower!;
  tiers.forEach((n, p) => {
    for (let i = 0; i < n; i++) expect(g.upgrade(t.id, p).ok).toBe(true);
  });
  g.phase = 'running';
  g.drainEvents();
  return { g, t };
}

describe('Quick Reply', () => {
  it('builds up on the same target, to double', () => {
    const { g, t } = setup();
    const e = g.spawn('newhire', 0, 9, false);
    e.hp = e.maxHp = 1e6;
    e.stunTime = 1e9;
    for (let i = 0; i < 60 * 5; i++) g.step(TICK);
    expect(t.ramp).toBeCloseTo(2);
  });

  it('starts over on a new target, unless it has Seen', () => {
    for (const [tiers, keep] of [
      [[0, 0, 0], 0],
      [[3, 0, 0], 0.5],
    ] as const) {
      const { g, t } = setup([...tiers] as [number, number, number]);
      const a = g.spawn('newhire', 0, 9, false);
      a.hp = a.maxHp = 1e6;
      a.stunTime = 1e9;
      for (let i = 0; i < 60 * 4; i++) g.step(TICK);
      const peak = t.ramp;
      a.alive = false;
      const b = g.spawn('newhire', 0, 9, false);
      b.hp = b.maxHp = 1e6;
      b.stunTime = 1e9;
      g.step(TICK);
      g.step(TICK);
      // One or two replies on the new target since the switch.
      expect(t.ramp).toBeLessThan(1 + (peak - 1) * keep + 0.25);
      expect(t.ramp).toBeGreaterThan(1 + (peak - 1) * keep - 0.01);
    }
  });
});

describe('The Presenter', () => {
  it('beams his slides next to your desk', () => {
    const g = new Game(corridor(['presenter:1@1'], { towers: TOWERS }));
    g.start();
    g.runFor(4.1);
    const adds = g.enemies.filter((e) => e.isAdd);
    expect(adds.length).toBe(4);
    for (const a of adds) expect(a.dist / g.paths[0].length).toBeGreaterThan(0.7);
  });

  it('his loading screen fills up again at every phase', () => {
    const g = new Game(corridor(['presenter:1@1'], { towers: TOWERS }));
    g.start();
    g.step(TICK);
    const boss = g.enemies.find((e) => e.def.boss)!;
    g.damage(boss, boss.maxShield + boss.maxHp * 0.4);
    expect(boss.phase).toBe(2);
    expect(boss.shield).toBe(boss.maxShield);
  });
});

describe('the projector', () => {
  const hz = { type: 'projector' as const, first: 2, every: 10, window: 10, reward: 5, blocks: 'building' as const };

  it('blocks building while it is open, pays for solving it, then closes', () => {
    const g = new Game(corridor(['intern:20@1'], { towers: TOWERS, hazard: hz }));
    g.start();
    g.runFor(2.05);
    expect(g.hazardOn).toBe(true);
    expect(g.canPlace('autoreply', 3, 1).reason).toMatch(/projector/);
    const before = g.coffee;
    const r = g.solveHazard(0);
    expect(r.ok).toBe(true);
    // 5 plus one per second left (10 s window, about 0.05 s gone).
    expect(g.coffee - before).toBe(15);
    expect(g.hazardOn).toBe(false);
    expect(g.canPlace('autoreply', 3, 1).ok).toBe(true);
  });

  it('closes by itself after the window, so nobody gets stuck', () => {
    const g = new Game(corridor(['intern:30@1'], { towers: TOWERS, hazard: hz }));
    g.start();
    g.runFor(2.05);
    expect(g.hazardOn).toBe(true);
    g.runFor(10);
    expect(g.hazardOn).toBe(false);
    g.runFor(10);
    expect(g.hazardOn).toBe(true);
  });

  it('in multiplayer everyone fixes their own, and it closes once all have', () => {
    const g = new Game(corridor(['intern:30@1'], { towers: TOWERS, hazard: hz }), { players: 2, sharedWallet: false });
    g.start();
    g.runFor(2.05);
    g.solveHazard(1);
    expect(g.hazardOn).toBe(true);
    expect(g.hazardBlocks(1)).toBe(false);
    expect(g.hazardBlocks(0)).toBe(true);
    expect(g.solveHazard(1).ok).toBe(false);
    g.solveHazard(0);
    expect(g.hazardOn).toBe(false);
  });

  it('goes through the same command path the server uses, and a mirror shows who is done', () => {
    const g = new Game(corridor(['intern:30@1'], { towers: TOWERS, hazard: hz }), { players: 2, sharedWallet: false });
    g.start();
    const cmd = parseCommand({ c: 'solve' });
    expect(cmd).toEqual({ c: 'solve' });
    expect(applyCommand(g, 0, cmd!).ok).toBe(false);
    g.runFor(2.05);
    expect(applyCommand(g, 1, cmd!).ok).toBe(true);
    const mirror = new Game(corridor(['intern:30@1'], { towers: TOWERS, hazard: hz }), { players: 2, sharedWallet: false });
    mirror.applySnapshot(g.toSnapshot());
    expect(mirror.hazardBlocks(0)).toBe(true);
    expect(mirror.hazardBlocks(1)).toBe(false);
    expect(mirror.canPlace('autoreply', 8, 1, 0).ok).toBe(false);
  });
});
