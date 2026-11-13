// Saying what does not work: a tower that hits nothing while colleagues stand in range says why.

import { describe, expect, it } from 'vitest';
import type { LevelDef } from '../src/sim/data/levels';
import { COLLEAGUES } from '../src/sim/data/colleagues';
import { LEVELS } from '../src/sim/data/levels';
import { Game, IDLE_AFTER, type Enemy } from '../src/sim/game';
import { colleagueBadges, idleNote, leakHint, towerBadge } from '../src/ui/badges';
import { corridor } from './helpers';

const TOWERS = ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder'];

function game(extra: Partial<LevelDef> = {}): Game {
  const g = new Game(corridor(['intern:1@1'], { towers: TOWERS, ...extra }));
  g.coffee = 5000;
  g.phase = 'running';
  return g;
}

function put(g: Game, type: string, d: number): Enemy {
  const e = g.spawn(type, 0, d, false);
  e.hp = e.maxHp = 1000;
  e.stunTime = 1e9;
  return e;
}

describe('idle reasons', () => {
  it('a physical tower next to the Board Member says it may not touch him, after a moment', () => {
    const g = game();
    const t = g.place('artillery', 8, 1).tower!;
    put(g, 'boardmember', 9);
    g.runFor(IDLE_AFTER / 2);
    expect(t.idle).toBeNull();
    g.runFor(IDLE_AFTER);
    expect(t.idle).toBe('immune');
    expect(t.idleWho).toBe('boardmember');
  });

  it('the Shredder says so too', () => {
    const g = game();
    const t = g.place('shredder', 8, 1).tower!;
    put(g, 'boardmember', 8.6);
    g.runFor(IDLE_AFTER + 0.5);
    expect(t.idle).toBe('immune');
  });

  it('an aiming tower that cannot see a hidden colleague says it cannot see him', () => {
    const g = game();
    const t = g.place('autoreply', 8, 1).tower!;
    put(g, 'impersonator', 9);
    g.runFor(IDLE_AFTER + 0.5);
    expect(t.idle).toBe('hidden');
    expect(t.idleWho).toBe('impersonator');
  });

  it('furniture in the way: something is in the way', () => {
    const g = game({ decor: [{ model: 'plant', rect: { x: 6, y: 1, w: 5, h: 1 } }] });
    const t = g.place('autoreply', 8, 0).tower!;
    put(g, 'newhire', 9.5);
    g.runFor(IDLE_AFTER + 0.5);
    expect(t.idle).toBe('sight');
  });

  it('nobody in range, or someone it can hit: no reason at all', () => {
    const g = game();
    const t = g.place('autoreply', 8, 1).tower!;
    g.runFor(IDLE_AFTER + 0.5);
    expect(t.idle).toBeNull();
    put(g, 'boardmember', 9);
    g.runFor(IDLE_AFTER + 0.5);
    expect(t.idle).toBeNull();
    expect(t.stats.shots).toBeGreaterThan(0);
  });

  it('an immune colleague outranks one it cannot see', () => {
    const g = game();
    const t = g.place('artillery', 8, 1).tower!;
    put(g, 'impersonator', 8.6);
    put(g, 'boardmember', 9.4);
    g.runFor(IDLE_AFTER + 0.5);
    expect(t.idle).toBe('immune');
  });

  it('goes away once the tower has something to hit', () => {
    const g = game();
    const t = g.place('artillery', 8, 1).tower!;
    put(g, 'boardmember', 9);
    g.runFor(IDLE_AFTER + 0.5);
    expect(t.idle).toBe('immune');
    put(g, 'newhire', 9.2);
    g.runFor(0.2);
    expect(t.idle).toBeNull();
  });

  it('survives a snapshot, colleague and all', () => {
    const g = game();
    g.place('artillery', 8, 1);
    g.place('autoreply', 12, 1);
    put(g, 'boardmember', 9);
    g.runFor(IDLE_AFTER + 0.5);
    const mirror = game();
    mirror.applySnapshot(g.toSnapshot());
    expect(mirror.towers.map((t) => [t.idle, t.idleWho])).toEqual(g.towers.map((t) => [t.idle, t.idleWho]));
    expect(mirror.towers[0].idle).toBe('immune');
    // And it clears again on the next snapshot.
    g.enemies.length = 0;
    g.runFor(0.2);
    mirror.applySnapshot(g.toSnapshot());
    expect(mirror.towers[0].idle).toBeNull();
  });
});

describe('icons over colleagues', () => {
  it('say what each one shrugs off', () => {
    expect(colleagueBadges(COLLEAGUES.boardmember, 0, false)).toEqual(['no-physical']);
    expect(colleagueBadges(COLLEAGUES.coldcaller, 0, false)).toEqual(['no-digital']);
    expect(colleagueBadges(COLLEAGUES.impersonator, 0, false)).toEqual(['hidden']);
    expect(colleagueBadges(COLLEAGUES.impersonator, 0, true)).toEqual([]);
    expect(colleagueBadges(COLLEAGUES.phonecaller, 0, false)).toEqual(['taunt']);
    expect(colleagueBadges(COLLEAGUES.intern, 0, false)).toEqual([]);
  });

  it('the box only while it is there', () => {
    const og = COLLEAGUES.oldguard;
    expect(colleagueBadges(og, og.shield!, false)).toContain('box');
    expect(colleagueBadges(og, 0, false)).not.toContain('box');
  });
});

describe('icons over towers', () => {
  const base = { silenced: false, quiet: null, mopped: 0, idle: null, def: { damageClass: undefined } } as const;
  it('six reasons to be quiet, each its own icon', () => {
    const kinds = (['chat', 'cry', 'net', 'phone', 'audit'] as const).map((q) => towerBadge({ ...base, silenced: true, quiet: q }));
    kinds.push(towerBadge({ ...base, mopped: 2 }));
    expect(new Set(kinds).size).toBe(6);
    expect(kinds).not.toContain(null);
  });

  it('a grey icon for hitting nothing, in the kind of the tower', () => {
    expect(towerBadge({ ...base, idle: 'immune', def: { damageClass: 'physical' } })).toBe('idle-physical');
    expect(towerBadge({ ...base, idle: 'immune', def: { damageClass: 'digital' } })).toBe('idle-digital');
    expect(towerBadge({ ...base, idle: 'hidden' })).toBe('idle-hidden');
    expect(towerBadge({ ...base, idle: 'sight' })).toBe('idle-sight');
    expect(towerBadge(base)).toBeNull();
  });

  it('being quiet outranks hitting nothing', () => {
    expect(towerBadge({ ...base, silenced: true, quiet: 'chat', idle: 'sight' })).toBe('chat');
  });

  it('the panel names the colleague', () => {
    expect(idleNote('immune', 'physical', 'The Board Member')).toContain('The Board Member');
    expect(idleNote('hidden', 'digital', 'The Impersonator')).toContain('The Impersonator');
    expect(idleNote('sight', 'digital', 'x')).not.toContain('{');
  });
});

describe('the hint when a colleague gets through', () => {
  function level2(): Game {
    const g = new Game(LEVELS[2]);
    g.coffee = 5000;
    return g;
  }

  it('names a counter that is in the shop, once', () => {
    const g = level2();
    const done = new Set<string>();
    const hint = leakHint(g, 'oldguard', done, true);
    expect(hint).toContain('The Old Guard');
    expect(hint).toContain('Office Artillery');
    done.add('oldguard');
    expect(leakHint(g, 'oldguard', done, true)).toBeNull();
  });

  it('says nothing when a counter already stands there, with tips off, or when you are losing', () => {
    const g = level2();
    expect(leakHint(g, 'oldguard', new Set(), false)).toBeNull();
    g.focus = g.startFocus * 0.2;
    expect(leakHint(g, 'oldguard', new Set(), true)).toBeNull();
    const h = level2();
    const spot = findSpot(h, 'artillery');
    expect(h.place('artillery', spot.x, spot.y).ok).toBe(true);
    expect(leakHint(h, 'oldguard', new Set(), true)).toBeNull();
  });

  it('never for an ordinary colleague or a boss', () => {
    const g = level2();
    expect(leakHint(g, 'intern', new Set(), true)).toBeNull();
    expect(leakHint(g, 'repairguy', new Set(), true)).toBeNull();
  });
});

function findSpot(g: Game, def: string): { x: number; y: number } {
  for (let y = 0; y < g.level.size.h; y++) for (let x = 0; x < g.level.size.w; x++) if (g.canPlace(def, x, y).ok) return { x, y };
  throw new Error('no spot');
}
