// Level 5: the specials (Keyboard Smash, Office Chair) and Your Line Manager.

import { describe, expect, it } from 'vitest';
import { applyCommand, parseCommand } from '../src/sim/commands';
import { LEVELS } from '../src/sim/data/levels';
import { CHAIR_DIRS, Game, TICK, type Enemy } from '../src/sim/game';
import { corridor } from './helpers';

const TOWERS = ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair'];

function game(waves: string[] = ['intern:1@1'], opts = {}) {
  const g = new Game(corridor(waves, { towers: TOWERS }), opts);
  g.wallets = g.wallets.map(() => 5000);
  return g;
}

function put(g: Game, type: string, d: number, hp?: number): Enemy {
  const e = g.spawn(type, 0, d, false);
  if (hp !== undefined) e.hp = e.maxHp = hp;
  return e;
}

describe('specials', () => {
  it('everyone gets one of each, no more', () => {
    const g = game();
    expect(g.place('keyboardsmash', 8, 1).ok).toBe(true);
    expect(g.place('keyboardsmash', 12, 1).reason).toMatch(/only get one/);
    expect(g.place('chair', 4, 1).ok).toBe(true);
    const mp = game(['intern:1@1'], { players: 2, sharedWallet: false });
    expect(mp.place('keyboardsmash', 8, 1, 0).ok).toBe(true);
    expect(mp.place('keyboardsmash', 12, 1, 1).ok).toBe(true);
  });
});

describe('Keyboard Smash', () => {
  it('slams everyone near the first colleague and leaves the keyboard just ahead of them', () => {
    const g = game();
    g.place('keyboardsmash', 8, 1);
    g.phase = 'running';
    const a = put(g, 'newhire', 9.3, 100);
    const b = put(g, 'newhire', 9.0, 100);
    a.stunTime = b.stunTime = 1e9;
    g.step(TICK);
    expect(a.hp).toBe(92);
    expect(b.hp).toBe(92);
    expect(g.barriers.length).toBe(1);
    expect(g.barriers[0].dist).toBeGreaterThan(a.dist);
  });

  it('nobody walks past the keyboard until they have kicked it away', () => {
    const g = game();
    g.place('keyboardsmash', 8, 1);
    g.phase = 'running';
    const a = put(g, 'intern', 9.3, 1000);
    a.stunTime = 0.05;
    g.step(TICK);
    const wall = g.barriers[0];
    g.runFor(3);
    expect(a.dist).toBeLessThan(wall.dist);
    expect(wall.hp).toBeLessThan(wall.maxHp);
    // Kicked away (or timed out): the colleague walks on.
    g.runFor(6);
    expect(a.dist).toBeGreaterThan(wall.dist);
  });

  it('Sharp Keycaps hurt whoever kicks the keyboard', () => {
    const g = game();
    const t = g.place('keyboardsmash', 8, 1).tower!;
    for (let i = 0; i < 3; i++) expect(g.upgrade(t.id, 1).ok).toBe(true);
    g.phase = 'running';
    const a = put(g, 'newhire', 9.3, 1000);
    g.runFor(3);
    expect(a.hp).toBeLessThan(1000 - 8);
  });
});

describe('the Office Chair', () => {
  it('points at the walkway when you put it down', () => {
    const g = game();
    // Tile (8, 0): the walkway is below it, +y.
    const t = g.place('chair', 8, 0).tower!;
    expect(CHAIR_DIRS[t.dir]).toEqual({ x: 0, y: 1 });
  });

  it('rolls out, deals damage and loses as much HP, then rolls back and rests', () => {
    const g = game();
    const t = g.place('chair', 8, 0).tower!;
    g.phase = 'running';
    const a = put(g, 'newhire', 9, 100);
    a.stunTime = 1e9;
    g.runFor(0.4);
    expect(a.hp).toBe(95);
    expect(t.chairHp).toBe(15);
    g.runFor(3);
    expect(t.rolling).toBe(0);
    expect(t.roll).toBe(0);
  });

  it('runs out of HP in a crowd and goes back for more', () => {
    const g = game();
    const t = g.place('chair', 8, 0).tower!;
    g.phase = 'running';
    // A crowd standing right where the lane crosses the walkway (x = 8.5).
    for (let i = 0; i < 8; i++) put(g, 'intern', 9.4 + i * 0.03, 4).stunTime = 1e9;
    g.runFor(0.6);
    // 20 HP, 4 per intern: five of them, then back.
    expect(g.stats.kills.intern).toBe(5);
    expect(t.rolling).not.toBe(1);
    g.runFor(1);
    expect(t.roll).toBe(0);
  });

  it('turns with the dir command, and a wall cuts its lane short', () => {
    const g = game();
    const t = g.place('chair', 18, 1).tower!;
    const cmd = parseCommand({ c: 'dir', id: t.id, dir: 0 });
    expect(cmd).toEqual({ c: 'dir', id: t.id, dir: 0 });
    expect(applyCommand(g, 0, cmd!).ok).toBe(true);
    expect(t.dir).toBe(0);
    // +x from tile 18 in a 21-wide room: about two tiles before the wall.
    expect(g.laneLength(t, 5)).toBeLessThan(3);
    expect(parseCommand({ c: 'dir', id: t.id, dir: 7 })).toBeNull();
  });

  it('rolls straight through The Board Member, who is not there in person (it is PHYSICAL)', () => {
    const g = game();
    const t = g.place('chair', 8, 0).tower!;
    g.phase = 'running';
    const bm = put(g, 'boardmember', 9);
    bm.stunTime = 1e9;
    g.runFor(0.6);
    expect(bm.hp).toBe(40);
    expect(t.chairHp).toBe(20);
  });
});

describe('Your Line Manager', () => {
  it('only calls people in from his second phase', () => {
    const g = game(['linemanager:1@1']);
    g.start();
    g.runFor(10);
    expect(g.enemies.filter((e) => e.type === 'requester').length).toBe(0);
    const boss = g.enemies.find((e) => e.type === 'linemanager')!;
    boss.shield = 0;
    g.damage(boss, boss.hp * 0.4);
    g.runFor(8);
    expect(g.enemies.filter((e) => e.type === 'requester').length).toBeGreaterThan(0);
  });

  it('in his last phase every tower near him reloads slower', () => {
    const g = game(['linemanager:1@1']);
    const t = g.place('autoreply', 2, 1).tower!;
    g.start();
    g.runFor(1.5);
    const boss = g.enemies.find((e) => e.type === 'linemanager')!;
    boss.addTimer = 1e9;
    boss.shield = 0;
    g.damage(boss, boss.hp * 0.7);
    expect(boss.phase).toBe(3);
    g.step(TICK);
    expect(t.rateBuff).toBeCloseTo(1.4, 5);
  });
});

describe('snapshots carry the specials', () => {
  it('keyboards and the chair survive the trip', () => {
    const g = game();
    g.place('keyboardsmash', 8, 1);
    const c = g.place('chair', 12, 0).tower!;
    g.phase = 'running';
    put(g, 'newhire', 9.3, 1000).stunTime = 1e9;
    put(g, 'newhire', 13, 1000).stunTime = 1e9;
    g.runFor(0.1);
    const mirror = game();
    mirror.applySnapshot(g.toSnapshot());
    expect(mirror.barriers.length).toBe(1);
    const mc = mirror.towers.find((t) => t.defId === 'chair')!;
    expect(mc.dir).toBe(c.dir);
    expect(mc.roll).toBeCloseTo(c.roll, 2);
  });
});

describe('the Boardroom', () => {
  it('brings both specials and ends on Your Line Manager', () => {
    const l = LEVELS[5];
    expect(l.towers).toContain('keyboardsmash');
    expect(l.towers).toContain('chair');
    expect(l.waves[l.waves.length - 1]).toMatch(/^linemanager:1/);
  });
});
