// Tier 3 changes what a tower does (house rule). Review step 12 gave the seven paths whose tier 3
// only raised numbers something of their own.

import { describe, expect, it } from 'vitest';
import { TOWERS, type Tiers } from '../src/sim/data/towers';
import { Game, TICK, computeStats, type Enemy } from '../src/sim/game';
import { corridor } from './helpers';

const ALL = Object.keys(TOWERS);

function game(): Game {
  const g = new Game(corridor(['intern:1@1'], { towers: ALL }));
  g.wallets = g.wallets.map(() => 5000);
  g.phase = 'running';
  return g;
}

function put(g: Game, type: string, d: number, hp = 1000): Enemy {
  const e = g.spawn(type, 0, d, false);
  e.hp = e.maxHp = hp;
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

describe('tier 3 does something new', () => {
  it('Barista Station: a fresh pot at the start of every wave', () => {
    expect(computeStats(TOWERS.coffee, [2, 0, 0]).waveIncome).toBe(0);
    expect(computeStats(TOWERS.coffee, [3, 0, 0]).waveIncome).toBeGreaterThan(0);
  });

  it('Corporate Card: claiming pays a quarter extra', () => {
    const g = game();
    const t = built(g, 'coffee', [0, 3, 0]);
    t.pot = 100;
    const before = g.coffee;
    expect(g.claim(t.id).ok).toBe(true);
    expect(g.coffee - before).toBe(125);
    expect(t.pot).toBe(0);
  });

  it('Studio Monitors: stopped colleagues take half again the damage', () => {
    const g = game();
    built(g, 'headphones', [3, 0, 0]);
    const e = put(g, 'newhire', 9);
    e.stunTime = 0;
    g.step(TICK);
    expect(e.stunTime).toBeGreaterThan(0);
    expect(g.damage(e, 2).dealt).toBeCloseTo(3);
  });

  it('Compactor: the Shredder crushes the Old Guard\'s box', () => {
    const g = game();
    built(g, 'shredder', [0, 0, 3]);
    const og = put(g, 'oldguard', 9);
    const before = og.shield;
    g.runFor(1);
    expect(og.shield).toBeLessThan(before);
  });

  it('Send to Service Desk: Self-Service finds hidden colleagues', () => {
    expect(computeStats(TOWERS.selfservice, [2, 0, 0]).seesHidden).toBe(false);
    expect(computeStats(TOWERS.selfservice, [3, 0, 0]).seesHidden).toBe(true);
  });

  it('Ticket Queue: whoever leaves the circle stays on hold', () => {
    const s = computeStats(TOWERS.selfservice, [0, 3, 0]);
    expect(s.slowOnHit?.time).toBeGreaterThanOrEqual(2);
  });

  it('Steering Group: everyone Delegation reaches stops for a moment', () => {
    const g = game();
    built(g, 'delegation', [3, 0, 0]);
    const a = put(g, 'newhire', 9);
    const b = put(g, 'newhire', 9.6);
    a.stunTime = b.stunTime = 0;
    let stopped = false;
    g.runFor(1.5, () => {
      if (a.stunTime > 0 || b.stunTime > 0) stopped = true;
    });
    expect(stopped).toBe(true);
  });

  it('every tier 3 on every path changes more than one number, or adds something', () => {
    // A cheap guard against new tier 3s that only raise a number: they must touch an effect
    // other than damage, speed and range.
    const plain = new Set(['damageAdd', 'damageMult', 'intervalMult', 'rangeMult', 'coffeeAdd', 'coffeeMult', 'dotAdd']);
    for (const def of Object.values(TOWERS)) {
      def.paths.forEach((path) => {
        const fx = Object.keys(path.tiers[2].effect);
        expect(fx.some((k) => !plain.has(k)), `${def.id} ${path.name} ${path.tiers[2].name}`).toBe(true);
      });
    }
  });
});
