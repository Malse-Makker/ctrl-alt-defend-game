// Level 6: walls, Reply All, The Cold Caller, The Baby and No Internet.

import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/sim/data/levels';
import { BAD_WIFI, Game, needsSight, TICK, type Enemy } from '../src/sim/game';
import { TOWERS as DEFS } from '../src/sim/data/towers';
import { corridor } from './helpers';

const TOWERS = ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall'];
// A wall along row 1, between the tiles above the walkway (row 0) and the walkway (y = 2.5).
const WALL = [{ x: 6, y: 1, w: 5, h: 1 }];

function game(waves: string[] = ['intern:1@1'], extra = {}, opts = {}) {
  const g = new Game(corridor(waves, { towers: TOWERS, ...extra }), opts);
  g.wallets = g.wallets.map(() => 5000);
  return g;
}

function put(g: Game, type: string, d: number, hp?: number): Enemy {
  const e = g.spawn(type, 0, d, false);
  if (hp !== undefined) e.hp = e.maxHp = hp;
  return e;
}

describe('walls', () => {
  it('nothing is built on a wall, and towers cannot shoot through one', () => {
    const g = game(['intern:1@1'], { walls: WALL });
    expect(g.canPlace('autoreply', 8, 1).ok).toBe(false);
    const t = g.place('autoreply', 8, 0).tower!;
    g.phase = 'running';
    const e = put(g, 'newhire', 9.5, 100);
    e.stunTime = 1e9;
    g.runFor(1);
    expect(t.stats.shots).toBe(0);
    expect(e.hp).toBe(100);
  });

  it('Office Artillery needs to see them too (the maker, v0.18.0)', () => {
    const g = game(['intern:1@1'], { walls: WALL });
    const t = g.place('artillery', 8, 0).tower!;
    g.phase = 'running';
    put(g, 'newhire', 9.5, 100).stunTime = 1e9;
    g.runFor(1);
    expect(t.stats.shots).toBe(0);
  });

  it('furniture blocks sight like a wall, but not for towers that work in a zone around them', () => {
    const desk = [{ model: 'plant', rect: { x: 6, y: 1, w: 5, h: 1 } }];
    const shoot = game(['intern:1@1'], { decor: desk });
    const auto = shoot.place('autoreply', 8, 0).tower!;
    shoot.phase = 'running';
    put(shoot, 'newhire', 9.5, 100).stunTime = 1e9;
    shoot.runFor(1);
    expect(auto.stats.shots).toBe(0);

    const zone = game(['intern:1@1'], { decor: desk });
    zone.place('headphones', 8, 0);
    zone.phase = 'running';
    const e = put(zone, 'newhire', 9.5, 100);
    zone.runFor(0.2);
    expect(e.stunTime).toBeGreaterThan(0);
  });

  it('everything that aims at someone needs sight; what works in a zone does not', () => {
    const sighted = Object.values(DEFS).filter((d) => needsSight(d)).map((d) => d.id).sort();
    expect(sighted).toEqual(['artillery', 'autoreply', 'delegation', 'keyboardsmash', 'quickreply', 'replyall', 'selfservice']);
  });

  it('a chair stops at a wall', () => {
    const g = game(['intern:1@1'], { walls: WALL });
    const t = g.place('chair', 8, 0).tower!;
    g.setDir(t.id, 1);
    expect(g.laneLength(t, 5)).toBeLessThan(1);
  });
});

describe('Reply All', () => {
  it('lands on everyone near the colleague it was meant for', () => {
    const g = game();
    const t = g.place('replyall', 8, 1).tower!;
    g.phase = 'running';
    const crowd = [9.3, 9.6, 9.8, 10.1].map((d) => put(g, 'newhire', d, 100));
    for (const e of crowd) e.stunTime = 1e9;
    g.step(TICK);
    expect(crowd.filter((e) => e.hp < 100).length).toBe(4);
    expect(t.stats.shots).toBe(1);
  });
});

describe('The Cold Caller', () => {
  it('withholds his number: towers that aim cannot see him, a Shredder zone shows him up', () => {
    // He used to ignore everything DIGITAL; since the maker's call after the review he is hidden.
    const g = game();
    g.place('autoreply', 8, 1);
    g.place('replyall', 10, 1);
    g.phase = 'running';
    const c = put(g, 'coldcaller', 9);
    c.stunTime = 1e9;
    g.runFor(2);
    expect(c.hp).toBe(16);
    c.revealUntil = 1e9;
    g.runFor(2);
    expect(c.hp).toBeLessThan(16);
  });
});

describe('The Baby', () => {
  it('towers near him aim at him before anyone else', () => {
    const g = game();
    const t = g.place('autoreply', 8, 1).tower!;
    g.phase = 'running';
    const front = put(g, 'newhire', 10.5, 100);
    const baby = put(g, 'baby', 8.5);
    baby.cryTimer = 1e9;
    front.stunTime = baby.stunTime = 1e9;
    g.step(TICK);
    expect(baby.hp).toBeLessThan(1100);
    expect(front.hp).toBe(100);
    expect(t.stats.shots).toBe(1);
  });

  it('a crying fit stops every tower nearby, but Noise Cancelling does not hear it', () => {
    const g = game();
    const near = g.place('autoreply', 8, 1).tower!;
    const hp = g.place('headphones', 9, 1).tower!;
    hp.tiers = [2, 0, 0];
    const far = g.place('autoreply', 18, 1).tower!;
    g.phase = 'running';
    const baby = put(g, 'baby', 9.5);
    baby.stunTime = 1e9;
    baby.cryTimer = 0;
    g.step(TICK);
    g.step(TICK);
    expect(near.quiet).toBe('cry');
    expect(hp.quiet).toBeNull();
    expect(far.quiet).toBeNull();
  });
});

describe('No Internet', () => {
  const hz = { type: 'nointernet' as const, first: 1, every: 30, window: 10, reward: 6 };

  it('takes every DIGITAL tower offline until you reconnect; PHYSICAL towers keep going', () => {
    const g = game(['intern:30@1'], { hazard: hz });
    const mail = g.place('autoreply', 8, 1).tower!;
    const tacks = g.place('thumbtacks', 12, 1).tower!;
    g.start();
    g.runFor(1.1);
    expect(g.hazardOpenFor(0)).toBe(true);
    expect(mail.quiet).toBe('net');
    expect(tacks.quiet).toBeNull();
    // It does not block building, only sending.
    expect(g.hazardBlocks(0)).toBe(false);
    expect(g.solveHazard(0).ok).toBe(true);
    g.step(TICK);
    expect(mail.quiet).toBeNull();
  });

  it('online, everyone reconnects their own towers', () => {
    const g = game(['intern:30@1'], { hazard: hz }, { players: 2, sharedWallet: false });
    const mine = g.place('autoreply', 8, 1, 0).tower!;
    const theirs = g.place('autoreply', 12, 1, 1).tower!;
    g.start();
    g.runFor(1.1);
    g.solveHazard(1);
    g.step(TICK);
    expect(mine.quiet).toBe('net');
    expect(theirs.quiet).toBeNull();
  });

  it('a mirror knows why a tower is quiet', () => {
    const g = game(['intern:30@1'], { hazard: hz });
    g.place('autoreply', 8, 1);
    g.start();
    g.runFor(1.1);
    const mirror = game(['intern:30@1'], { hazard: hz });
    mirror.applySnapshot(g.toSnapshot());
    expect(mirror.towers[0].quiet).toBe('net');
  });
});

describe('Work From Home', () => {
  it('has walls, No Internet, The Cold Caller, and ends on The Baby', () => {
    const l = LEVELS[6];
    expect(l.walls?.length).toBeGreaterThan(0);
    expect(l.hazard?.type).toBe('nointernet');
    expect(l.towers).toContain('replyall');
    expect(l.waves.some((w) => w.includes('coldcaller'))).toBe(true);
    expect(l.waves[l.waves.length - 1]).toMatch(/^baby:1/);
    const g = new Game(l);
    for (const r of l.walls!) expect(g.canPlace('autoreply', r.x, r.y).ok).toBe(false);
  });
});

describe('bad wifi in the bedroom', () => {
  const level = LEVELS[6];

  it('DIGITAL towers fire 40% slower there; PHYSICAL ones do not care', () => {
    const g = new Game(level);
    g.coffee = 5000;
    expect(level.grid![5][7]).toBe('f');
    expect(BAD_WIFI).toBe(0.6);
    const bad = g.place('autoreply', 7, 5).tower!;
    const good = g.place('autoreply', 7, 7).tower!;
    expect(g.liveStats(bad).interval).toBeCloseTo(g.liveStats(good).interval / 0.6);
    const art = g.place('artillery', 8, 5).tower!;
    const art2 = g.place('artillery', 1, 8).tower!;
    expect(g.liveStats(art).interval).toBeCloseTo(g.liveStats(art2).interval);
  });
});
