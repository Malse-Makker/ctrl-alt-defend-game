// Saying what does not work: a tower that hits nothing while colleagues stand in range says why.

import { describe, expect, it } from 'vitest';
import type { LevelDef } from '../src/sim/data/levels';
import { COLLEAGUES } from '../src/sim/data/colleagues';
import { LEVELS } from '../src/sim/data/levels';
import { TOWERS as TOWER_DEFS } from '../src/sim/data/towers';
import { Game, IDLE_AFTER, walkwayReach, type Enemy } from '../src/sim/game';
import { colleagueBadges, idleNote, leakHint, towerBadge, towerStatus } from '../src/ui/badges';
import { UI_TEXT } from '../src/ui/text';
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
  it('a tower that cannot break boxes keeps hitting the box and bounces off, like darts off lead', () => {
    const g = game();
    const t = g.place('autoreply', 8, 1).tower!;
    const bm = put(g, 'boardmember', 9);
    bm.shield = bm.maxShield = 16;
    g.runFor(IDLE_AFTER + 0.5);
    expect(t.stats.shots).toBeGreaterThan(0);
    expect(bm.shield).toBe(16);
    expect(t.idle).toBeNull();
  });

  it('the Shredder bounces off a box too, until the Compactor', () => {
    const g = game();
    g.place('shredder', 8, 1);
    const og = put(g, 'oldguard', 8.6);
    og.shield = og.maxShield = 30;
    g.runFor(1);
    expect(og.shield).toBe(30);
  });

  it('an aiming tower that cannot see a hidden colleague says it cannot see him', () => {
    const g = game();
    const t = g.place('autoreply', 8, 1).tower!;
    put(g, 'impersonator', 9);
    g.runFor(IDLE_AFTER + 0.5);
    expect(t.idle).toBe('hidden');
    expect(t.idleWho).toBe('impersonator');
  });

  it('the Cold Caller is hidden now, not immune to DIGITAL', () => {
    const g = game();
    const t = g.place('autoreply', 8, 1).tower!;
    put(g, 'coldcaller', 9);
    g.runFor(IDLE_AFTER + 0.5);
    expect(t.idle).toBe('hidden');
    expect(t.idleWho).toBe('coldcaller');
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
    put(g, 'newhire', 9);
    g.runFor(IDLE_AFTER + 0.5);
    expect(t.idle).toBeNull();
    expect(t.stats.shots).toBeGreaterThan(0);
  });

  it('goes away once the tower has something to hit', () => {
    const g = game();
    const t = g.place('autoreply', 8, 1).tower!;
    put(g, 'impersonator', 9);
    g.runFor(IDLE_AFTER + 0.5);
    expect(t.idle).toBe('hidden');
    put(g, 'newhire', 9.2);
    g.runFor(0.2);
    expect(t.idle).toBeNull();
  });

  it('survives a snapshot, colleague and all', () => {
    const g = game();
    g.place('autoreply', 8, 1);
    g.place('autoreply', 12, 1);
    put(g, 'impersonator', 9);
    g.runFor(IDLE_AFTER + 0.5);
    const mirror = game();
    mirror.applySnapshot(g.toSnapshot());
    expect(mirror.towers.map((t) => [t.idle, t.idleWho])).toEqual(g.towers.map((t) => [t.idle, t.idleWho]));
    expect(mirror.towers[0].idle).toBe('hidden');
    // And it clears again on the next snapshot.
    g.enemies.length = 0;
    g.runFor(0.2);
    mirror.applySnapshot(g.toSnapshot());
    expect(mirror.towers[0].idle).toBeNull();
  });
});

describe('icons over colleagues', () => {
  it('say what each one shrugs off', () => {
    expect(colleagueBadges(COLLEAGUES.boardmember, COLLEAGUES.boardmember.shield!, false)).toEqual(['box']);
    expect(colleagueBadges(COLLEAGUES.coldcaller, 0, false)).toEqual(['hidden']);
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
    expect(towerBadge({ ...base, idle: 'hidden' })).toBe('idle-hidden');
    expect(towerBadge({ ...base, idle: 'sight' })).toBe('idle-sight');
    expect(towerBadge(base)).toBeNull();
  });

  it('being quiet outranks hitting nothing', () => {
    expect(towerBadge({ ...base, silenced: true, quiet: 'chat', idle: 'sight' })).toBe('chat');
  });

  it('the panel line carries the same reason as the icon over the tower, with an icon of its own', () => {
    const g = game();
    const t = g.place('autoreply', 8, 1).tower!;
    expect(towerStatus(g, t)).toBeNull();
    const seen = new Set<string>();
    for (const q of ['chat', 'cry', 'net', 'phone', 'audit'] as const) {
      Object.assign(t, { silenced: true, quiet: q });
      const st = towerStatus(g, t)!;
      expect(st.tone).toBe('bad');
      seen.add(st.icon);
    }
    Object.assign(t, { silenced: false, quiet: null, mopped: 3 });
    seen.add(towerStatus(g, t)!.icon);
    expect(seen.size).toBe(6);
    Object.assign(t, { mopped: 0, idle: 'hidden', idleWho: 'impersonator' });
    const idle = towerStatus(g, t)!;
    expect(idle).toEqual({ icon: 'eye-slash', tone: 'warn', text: idleNote('hidden', 'The Impersonator') });
    Object.assign(t, { idle: null });
    const cold = towerStatus({ rangeFactor: () => 1, slowWifi: () => false, isCold: () => true, isLit: () => true }, t)!;
    expect(cold.text).toBe(UI_TEXT.coldNote);
  });

  it('the panel names the colleague', () => {
    expect(idleNote('hidden', 'The Impersonator')).toContain('The Impersonator');
    expect(idleNote('sight', 'x')).not.toContain('{');
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

describe('the walkway a tower would cover', () => {
  it('a circle on a straight corridor covers a chord of it', () => {
    const g = game();
    const c = g.walkwayCover(8.5, 1.5, 3, true);
    // Walkway at y = 2.5, one tile away: a chord of 2 * sqrt(9 - 1) = 5.7 tiles out of 21.
    expect(c.share).toBeGreaterThan(0.24);
    expect(c.share).toBeLessThan(0.3);
    for (const p of c.points) expect(Math.hypot(p.x - 8.5, p.y - 1.5)).toBeLessThanOrEqual(3);
  });

  it('furniture in the way: nothing for a tower that aims, all of it for one that does not', () => {
    const g = game({ decor: [{ model: 'plant', rect: { x: 6, y: 1, w: 5, h: 1 } }] });
    expect(g.walkwayCover(8.5, 0.5, 3, true).share).toBe(0);
    expect(g.walkwayCover(8.5, 0.5, 3, false).share).toBeGreaterThan(0.1);
  });

  it('the whole floor for a tower that reaches everywhere and sees it all', () => {
    expect(game().walkwayCover(8.5, 1.5, Infinity, true, true).share).toBe(1);
  });

  it('the build grid marks a tile as out of reach exactly when the tower would cover nothing', () => {
    const g = game({ decor: [{ model: 'plant', rect: { x: 6, y: 1, w: 5, h: 1 } }] });
    for (const [x, y, r, sighted] of [[8.5, 1.5, 3, true], [8.5, 0.5, 3, true], [8.5, 0.5, 3, false], [8.5, 0.5, 1, false]] as const) {
      expect(g.reachesWalkway(x, y, r, sighted), `${x},${y} r${r} ${sighted}`).toBe(g.walkwayCover(x, y, r, sighted).share > 0);
    }
    expect(g.reachesWalkway(8.5, 0.5, 3, true)).toBe(false);
  });

  it('the build grid refuses exactly the tiles that placing refuses as too far', () => {
    const g = game();
    let far = 0;
    for (const def of TOWERS) {
      for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 21; x++) {
          const refused = g.canPlace(def, x, y).reason === 'Too far from the walkway to reach anyone.';
          expect(g.tooFarFromWalkway(TOWER_DEFS[def], x, y), `${def} ${x},${y}`).toBe(refused);
          if (refused) far++;
        }
      }
    }
    expect(far).toBeGreaterThan(0);
  });

  it('only towers that work on the walkway can be out of reach', () => {
    expect(walkwayReach(TOWER_DEFS.autoreply)).toEqual({ range: TOWER_DEFS.autoreply.base.range, sighted: true });
    expect(walkwayReach(TOWER_DEFS.shredder)?.sighted).toBe(false);
    for (const id of ['coffee', 'chair', 'poster', 'artillery', 'pomodoro']) expect(walkwayReach(TOWER_DEFS[id]), id).toBeNull();
  });
});
