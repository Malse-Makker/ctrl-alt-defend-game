// Level 3: Quick Reply, The Presenter, and the projector mini-game.

import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/sim/data/levels';
import { applyCommand, parseCommand } from '../src/sim/commands';
import { Game, HAZARD_WARN, TICK } from '../src/sim/game';
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
  // Review step 12 (maker's decision 12): the build-up is gone, Quick Reply is the crowd tower.
  function crowd(g: Game, n: number) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const e = g.spawn('newhire', 0, 8.6 + i * 0.3, false);
      e.hp = e.maxHp = 1e6;
      e.stunTime = 1e9;
      out.push(e);
    }
    return out;
  }

  it('replies to three colleagues at once', () => {
    const { g } = setup();
    const es = crowd(g, 5);
    g.runFor(2);
    expect(es.filter((e) => e.hp < e.maxHp).length).toBe(3);
  });

  it('Reply in Thread: five at once', () => {
    const { g } = setup([0, 3, 0]);
    const es = crowd(g, 6);
    g.runFor(2);
    expect(es.filter((e) => e.hp < e.maxHp).length).toBe(5);
  });

  it('every reply is light: against one colleague it does less than an Auto-Reply', () => {
    const { g, t } = setup();
    const a = g.place('autoreply', 12, 1).tower!;
    const qs = g.liveStats(t);
    const as = g.liveStats(a);
    expect(qs.damage / qs.interval).toBeLessThan(as.damage / as.interval);
    expect((qs.damage / qs.interval) * qs.targets).toBeGreaterThan((as.damage / as.interval) * 2);
  });

  it('Seen gets through the Old Guard\'s box', () => {
    const { g } = setup([3, 0, 0]);
    const og = g.spawn('oldguard', 0, 9, false);
    og.stunTime = 1e9;
    const before = og.shield;
    g.runFor(1);
    expect(og.shield).toBeLessThan(before);
  });
});

describe('The Presenter', () => {
  it('beams his slides in through the side door by your desk', () => {
    const g = new Game(LEVELS[3]);
    g.phase = 'running';
    const boss = g.spawn('presenter', 0, 4, false);
    boss.addTimer = 0;
    g.step(TICK);
    const adds = g.enemies.filter((e) => e.isAdd);
    expect(adds.length).toBe(4);
    for (const a of adds) expect(a.pathIndex).toBe(g.doorPath);
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

  it('announces itself three seconds early: one warning, still time to build, and a copy sees it too', () => {
    const g = new Game(corridor(['intern:40@1'], { towers: TOWERS, hazard: { ...hz, first: 5 } }));
    g.start();
    g.runFor(5 - HAZARD_WARN - 0.1);
    expect(g.hazardWarning).toBe(false);
    g.drainEvents();
    g.runFor(0.2);
    expect(g.hazardWarning).toBe(true);
    expect(g.drainEvents().filter((e) => e.t === 'hazardWarn')).toEqual([{ t: 'hazardWarn', kind: 'projector', at: 5 }]);
    expect(g.canPlace('autoreply', 3, 1).ok).toBe(true);
    const copy = new Game(corridor(['intern:40@1'], { towers: TOWERS, hazard: { ...hz, first: 5 } }));
    copy.applySnapshot(JSON.parse(JSON.stringify(g.toSnapshot())));
    expect(copy.hazardWarning).toBe(true);
    g.runFor(HAZARD_WARN);
    expect(g.hazardOn).toBe(true);
    expect(g.hazardWarning).toBe(false);
    expect(g.drainEvents().some((e) => e.t === 'hazardWarn')).toBe(false);
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
