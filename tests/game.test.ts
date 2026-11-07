import { describe, expect, it } from 'vitest';
import { COLLEAGUES } from '../src/sim/data/colleagues';
import { LEVELS } from '../src/sim/data/levels';
import { Game, TICK } from '../src/sim/game';
import { corridor } from './helpers';

function placed(g: Game, def: string, tx: number, ty: number) {
  const r = g.place(def, tx, ty);
  expect(r.ok, r.reason).toBe(true);
  return r.tower!;
}

describe('placing towers', () => {
  it('refuses the walkway, furniture, occupied tiles and out of bounds, with a reason', () => {
    const g = new Game(corridor(['intern:1@1']), {});
    expect(g.canPlace('autoreply', 5, 2).reason).toMatch(/walkway/);
    expect(g.canPlace('autoreply', 20, 2).ok).toBe(false); // your desk
    expect(g.canPlace('autoreply', -1, 0).reason).toMatch(/outside/);
    placed(g, 'autoreply', 5, 3);
    expect(g.canPlace('autoreply', 5, 3).reason).toMatch(/already/);
  });

  it('a damage tower must be able to reach the walkway', () => {
    const g = new Game(corridor(['intern:1@1']));
    // Row 5 is 3 tiles from the walkway centre, within reach (3.375 - 0.2).
    expect(g.canPlace('autoreply', 5, 5).ok).toBe(true);
    const far = new Game(corridor(['intern:1@1'], { size: { w: 21, h: 9 } }));
    expect(far.canPlace('autoreply', 5, 8).reason).toMatch(/Too far/);
    // Coffee machines can stand anywhere.
    expect(far.canPlace('coffee', 5, 8).ok).toBe(true);
  });

  it('charges the duplicate surcharge and refuses when broke', () => {
    const g = new Game(corridor(['intern:1@1']));
    expect(g.coffee).toBe(40);
    placed(g, 'autoreply', 2, 1);
    expect(g.coffee).toBe(26);
    expect(g.placeCostFor('autoreply')).toBe(18);
    placed(g, 'autoreply', 3, 1);
    expect(g.coffee).toBe(8);
    expect(g.canPlace('autoreply', 4, 1).reason).toMatch(/Not enough Coffee/);
  });

  it('upgrades follow the 4-2-0 rule, and selling refunds 60% of everything paid', () => {
    const g = new Game(corridor(['intern:1@1']));
    g.coffee = 1000;
    const t = placed(g, 'autoreply', 2, 1);
    for (let i = 0; i < 4; i++) expect(g.upgrade(t.id, 0).ok).toBe(true);
    expect(g.upgrade(t.id, 0).reason).toMatch(/complete/);
    expect(g.upgrade(t.id, 1).ok).toBe(true);
    expect(g.upgrade(t.id, 1).ok).toBe(true);
    expect(g.upgrade(t.id, 1).reason).toMatch(/Only one path/);
    expect(g.upgrade(t.id, 2).reason).toMatch(/Two paths/);
    expect(t.tiers).toEqual([4, 2, 0]);
    const paid = 14 + [0, 1, 2, 3].reduce((s, i) => s + t.def.paths[0].tiers[i].cost, 0) + t.def.paths[1].tiers[0].cost + t.def.paths[1].tiers[1].cost;
    expect(t.invested).toBe(paid);
    const before = g.coffee;
    g.sell(t.id);
    expect(g.coffee - before).toBe(Math.floor(paid * 0.6));
    expect(g.towers.length).toBe(0);
  });

  it('upgrades change the live stats', () => {
    const g = new Game(corridor(['intern:1@1']));
    g.coffee = 1000;
    const t = placed(g, 'autoreply', 2, 1);
    g.upgrade(t.id, 1);
    g.upgrade(t.id, 1);
    g.upgrade(t.id, 1);
    const s = g.liveStats(t);
    expect(s.interval).toBeCloseTo(0.45 * 0.7 * 0.7 * 0.75);
    expect(s.targets).toBe(2);
    expect(s.damage).toBeCloseTo(2.4);
  });
});

describe('waves and timing', () => {
  it('spawns groups in sequence with their intervals', () => {
    const g = new Game(corridor(['intern:3@1.0 + newhire:1@1']));
    g.start();
    g.step(TICK);
    expect(g.enemies.length).toBe(1);
    g.runFor(1.0);
    expect(g.enemies.length).toBe(2);
    g.runFor(2.0);
    expect(g.enemies.map((e) => e.type)).toEqual(['intern', 'intern', 'intern', 'newhire']);
  });

  it('pays salary when the next wave starts, and the timer starts the next wave', () => {
    const g = new Game(corridor(['intern:1@1', 'intern:1@1', 'intern:1@1']));
    g.start();
    const c0 = g.coffee;
    g.runFor(16.05);
    expect(g.waveIndex).toBe(2);
    // The Intern of wave 1 walked in uncontested and leaked; salary for wave 1 is 5.
    expect(g.coffee - c0).toBeCloseTo(5);
  });

  it('shortens the wait to 5 seconds once the floor is clear', () => {
    const g = new Game(corridor(['intern:1@1', 'intern:1@1']));
    placed(g, 'autoreply', 2, 1);
    g.start();
    g.runFor(3);
    expect(g.enemies.length).toBe(0);
    expect(g.nextWaveTimer).toBeLessThanOrEqual(5);
  });

  it('calling a wave early pays points and stacks the next wave', () => {
    const g = new Game(corridor(['intern:2@1', 'intern:2@1']));
    g.start();
    g.step(TICK);
    expect(g.callNextWave()).toBe(true);
    expect(g.score).toBe(40);
    expect(g.waveIndex).toBe(2);
    expect(g.stats.earlyCalls).toBe(1);
  });

  it('leaking costs the fixed Focus of the colleague, and running out is a burnout', () => {
    const g = new Game(corridor(['newhire:60@0.3']));
    g.start();
    g.runFor(60);
    expect(g.stats.leakFocus.newhire).toBe(g.stats.leaks.newhire * COLLEAGUES.newhire.focus);
    expect(g.phase).toBe('lost');
    expect(g.endReason).toBe('burnout');
    expect(g.focus).toBe(0);
  });

  it('wins when every wave is out and the floor is empty', () => {
    const g = new Game(corridor(['intern:2@1']));
    placed(g, 'autoreply', 2, 1);
    placed(g, 'autoreply', 4, 1);
    g.start();
    g.runFor(30);
    expect(g.phase).toBe('won');
    expect(g.stars).toBe(3);
    expect(g.stats.kills.intern).toBe(2);
  });

  it('give up ends the round as lost, with the reason kept', () => {
    const g = new Game(corridor(['intern:2@1']));
    g.start();
    g.giveUp();
    expect(g.phase).toBe('lost');
    expect(g.endReason).toBe('gaveup');
  });
});

describe('towers in action', () => {
  it('a coffee machine makes 1 Coffee per 5 seconds, but only once the day started', () => {
    const g = new Game(corridor(['intern:1@1', 'intern:1@1', 'intern:1@1', 'intern:1@1']));
    placed(g, 'coffee', 2, 0);
    const c0 = g.coffee;
    g.step(TICK);
    expect(g.coffee).toBe(c0);
    g.start();
    g.runFor(10.01);
    expect(g.stats.coffeeFromMachines).toBe(2);
  });

  it('targeting modes pick the right colleague', () => {
    const g = new Game(corridor(['intern:1@1']));
    const t = placed(g, 'autoreply', 8, 1);
    g.phase = 'running';
    const near = g.spawn('newhire', 0, 9, false); // x = 8, right under the tower
    const ahead = g.spawn('intern', 0, 11, false); // x = 10, further along
    const behind = g.spawn('newhire', 0, 7.5, false); // x = 6.5
    behind.hp = 5;
    const pick = (mode: Parameters<Game['setTargeting']>[1]) => {
      g.setTargeting(t.id, mode);
      return g.pickTargets(t, 3.375, 1)[0].id;
    };
    expect(pick('first')).toBe(ahead.id);
    expect(pick('last')).toBe(behind.id);
    expect(pick('closest')).toBe(near.id);
    expect(pick('farthest')).toBe(behind.id);
    expect(pick('strongest')).toBe(near.id);
    expect(pick('weakest')).toBe(ahead.id);
  });

  it('Auto-Forward fires at one extra colleague per shot', () => {
    const g = new Game(corridor(['intern:1@1']));
    g.coffee = 200;
    const t = placed(g, 'autoreply', 8, 1);
    for (let i = 0; i < 3; i++) g.upgrade(t.id, 1);
    g.phase = 'running';
    g.spawn('newhire', 0, 9, false);
    g.spawn('newhire', 0, 10, false);
    g.drainEvents();
    g.step(TICK);
    const shots = g.drainEvents().filter((e) => e.t === 'shot');
    expect(shots.length).toBe(2);
  });

  it('fires at its stated rate', () => {
    const g = new Game(corridor(['intern:1@1']));
    const t = placed(g, 'autoreply', 8, 1);
    g.phase = 'running';
    const e = g.spawn('newhire', 0, 9, false);
    e.hp = 1e9;
    e.maxHp = 1e9;
    // Hold him still under the tower.
    e.stunTime = 1e9;
    for (let i = 0; i < 60 * 9; i++) g.step(TICK);
    // First shot on the first tick, then one every 0.45 s: 20 shots in 9 seconds (one tick of
    // float slack either way).
    expect(Math.abs(t.stats.shots - 20)).toBeLessThanOrEqual(1);
  });

  it('a Requester splits into two Chasers when dealt with', () => {
    const g = new Game(corridor(['intern:1@1']));
    g.phase = 'running';
    const r = g.spawn('requester', 0, 9, false);
    g.damage(r, 100);
    expect(r.alive).toBe(false);
    // damage() itself does not reward or split: kills go through shoot(). Use a tower instead.
    const g2 = new Game(corridor(['intern:1@1']));
    const t = placed(g2, 'autoreply', 8, 1);
    g2.phase = 'running';
    const r2 = g2.spawn('requester', 0, 9, false);
    r2.hp = 1;
    r2.stunTime = 1;
    g2.step(TICK);
    expect(t.stats.kills).toBe(1);
    expect(g2.enemies.filter((e) => e.type === 'chaser').length).toBe(2);
  });

  it('shields stop light hits and immunities stop a whole damage class', () => {
    const g = new Game(corridor(['intern:1@1']));
    g.phase = 'running';
    const e = g.spawn('newhire', 0, 9, false);
    // Synthetic tank: shield 30, light hits under 10 bounce off.
    e.def = { ...e.def, shield: 30, shieldMinHit: 10 };
    e.shield = 30;
    expect(g.damage(e, 4).result).toBe('blocked');
    expect(e.shield).toBe(30);
    expect(g.damage(e, 15).dealt).toBe(15);
    expect(e.shield).toBe(15);
    expect(g.damage(e, 20).dealt).toBe(15 + 5);
    expect(e.hp).toBe(7);
    e.def = { ...e.def, immune: 'written' };
    expect(g.damage(e, 50, 'written').result).toBe('immune');
    expect(e.hp).toBe(7);
  });
});

describe('upgrade behaviours', () => {
  function setup(tiers: [number, number, number], def = 'autoreply') {
    const g = new Game(corridor(['intern:1@1']));
    g.coffee = 5000;
    const t = placed(g, def, 8, 1);
    tiers.forEach((n, p) => {
      for (let i = 0; i < n; i++) expect(g.upgrade(t.id, p).ok).toBe(true);
    });
    g.phase = 'running';
    g.drainEvents();
    return { g, t };
  }
  const still = (g: Game, type: string, d: number, hp = 1000) => {
    const e = g.spawn(type, 0, d, false);
    e.hp = e.maxHp = hp;
    e.stunTime = 1e9;
    return e;
  };

  it('Mail Merge also hits one colleague standing next to the target', () => {
    const { g } = setup([2, 0, 0]);
    const a = still(g, 'newhire', 9.5);
    const b = still(g, 'newhire', 9.0);
    g.step(TICK);
    expect(a.hp).toBeLessThan(1000);
    expect(b.hp).toBeLessThan(1000);
  });

  it('Out of Office bounces on to two more colleagues', () => {
    const { g } = setup([3, 0, 0]);
    const es = [9.5, 8.3, 7.1, 5.9].map((d) => still(g, 'newhire', d));
    g.step(TICK);
    const hit = es.filter((e) => e.hp < 1000).length;
    // Standing 1.2 apart: too far for the splash, so the target plus two bounces.
    expect(hit).toBe(3);
  });

  it('Inbox Zero takes half the HP of everyone in range every 8 seconds, bosses 10%', () => {
    const { g, t } = setup([4, 0, 0]);
    t.cooldown = 1e9; // only the ability
    const n = still(g, 'newhire', 9, 100);
    const boss = still(g, 'headofcomms', 10, 600);
    boss.addTimer = 1e9;
    t.abilityTimer = 7.99;
    g.step(TICK);
    expect(n.hp).toBeCloseTo(50);
    expect(boss.hp).toBeCloseTo(540);
    expect(g.drainEvents().some((e) => e.t === 'ability')).toBe(true);
  });

  it('CC Your Manager triples damage against bosses', () => {
    const { g, t } = setup([0, 0, 3]);
    const boss = still(g, 'headofcomms', 9, 600);
    boss.addTimer = 1e9;
    g.step(TICK);
    expect(600 - boss.hp).toBeCloseTo(g.liveStats(t).damage * 3);
  });

  it('Legal Hold slows everyone in range by 30%', () => {
    const { g } = setup([0, 0, 4]);
    const e = g.spawn('newhire', 0, 9, false);
    e.hp = e.maxHp = 1e9;
    const d0 = e.dist;
    g.step(TICK);
    expect(e.dist - d0).toBeCloseTo(e.def.speed * 0.7 * TICK);
  });

  it('hidden colleagues need a tower that can see them (Tracking Pixel)', () => {
    const blind = setup([0, 0, 0]);
    const e1 = still(blind.g, 'newhire', 9);
    e1.def = { ...e1.def, invisible: true };
    expect(blind.g.pickTargets(blind.t, 5, 1).length).toBe(0);
    const seeing = setup([0, 0, 2]);
    const e2 = still(seeing.g, 'newhire', 9);
    e2.def = { ...e2.def, invisible: true };
    expect(seeing.g.pickTargets(seeing.t, 5, 1, true).length).toBe(1);
  });

  it('Expense Claim: brews go into a pot with interest, up to the cap, and claiming pays it out', () => {
    const g = new Game(corridor(['intern:1@1', 'intern:1@1', 'intern:1@1', 'intern:1@1']));
    g.coffee = 500;
    const m = placed(g, 'coffee', 2, 0);
    g.upgrade(m.id, 1);
    g.start();
    const before = g.coffee;
    g.runFor(10.01);
    // Two brews of 1 went into the pot, not into the wallet.
    expect(m.pot).toBe(2);
    expect(g.stats.coffeeFromMachines).toBe(0);
    m.pot = 50;
    g.callNextWave();
    // +3 deposit, then 10% interest, capped at 60.
    expect(m.pot).toBeCloseTo(Math.min(60, (50 + 3) * 1.1));
    const c = g.coffee;
    expect(g.claim(m.id).ok).toBe(true);
    expect(g.coffee - c).toBe(58);
    expect(m.pot).toBeLessThan(1);
    expect(before).toBeGreaterThan(0);
  });

  it('selling an Expense Claim machine pays out the pot too', () => {
    const g = new Game(corridor(['intern:1@1']));
    g.coffee = 500;
    const m = placed(g, 'coffee', 2, 0);
    g.upgrade(m.id, 1);
    m.pot = 40;
    const c = g.coffee;
    g.sell(m.id);
    expect(g.coffee - c).toBe(Math.floor((20 + 25) * 0.6) + 40);
  });

  it('a tip jar makes colleagues dealt with in its range pay more', () => {
    const g = new Game(corridor(['intern:1@1']));
    g.coffee = 500;
    const m = placed(g, 'coffee', 8, 1);
    g.upgrade(m.id, 2);
    expect(g.tipBonusAt(8.5, 2.5)).toBeCloseTo(0.25);
    expect(g.tipBonusAt(18, 2.5)).toBe(0);
  });
});

describe('players and wallets', () => {
  it('a split game divides income between players and lets them gift Coffee', () => {
    const g = new Game(corridor(['intern:1@1', 'intern:1@1']), { players: 4, sharedWallet: false });
    expect(g.wallets).toEqual([40, 40, 40, 40]);
    g.start();
    g.callNextWave();
    // Salary 5 split four ways.
    expect(g.wallets[0]).toBeCloseTo(41.25);
    expect(g.gift(0, 1, 10).ok).toBe(true);
    expect(g.wallets[1]).toBeCloseTo(51.25);
    expect(g.gift(0, 0, 1).ok).toBe(false);
  });

  it('only the owner touches a tower in a split game; everyone in a shared game', () => {
    const split = new Game(corridor(['intern:1@1']), { players: 2, sharedWallet: false });
    const t = split.place('autoreply', 2, 1, 1).tower!;
    expect(t.owner).toBe(1);
    expect(split.wallets[1]).toBe(26);
    expect(split.wallets[0]).toBe(40);
    expect(split.upgrade(t.id, 0, 0).reason).toMatch(/not your tower/);
    expect(split.upgrade(t.id, 0, 1).ok).toBe(true);
    const shared = new Game(corridor(['intern:1@1']), { players: 2, sharedWallet: true });
    const t2 = shared.place('autoreply', 2, 1, 1).tower!;
    expect(shared.upgrade(t2.id, 0, 0).ok).toBe(true);
    expect(shared.wallets.length).toBe(1);
  });

  it('build areas keep players to their own part of the office', () => {
    const g = new Game(corridor(['intern:1@1']), { players: 2, sharedWallet: false });
    g.buildAreas = [[{ x: 0, y: 0, w: 10, h: 6 }], [{ x: 10, y: 0, w: 11, h: 6 }]];
    expect(g.canPlace('autoreply', 12, 1, 0).reason).toMatch(/someone else/);
    expect(g.canPlace('autoreply', 12, 1, 1).ok).toBe(true);
  });
});

describe('the Head of Comms', () => {
  it('keeps calling Interns in, and calls a crowd at 66% and 33%', () => {
    const g = new Game(corridor(['headofcomms:1@1']));
    g.start();
    g.step(TICK);
    const boss = g.enemies.find((e) => e.type === 'headofcomms')!;
    g.runFor(4.05);
    const b = COLLEAGUES.headofcomms.boss!;
    expect(g.enemies.filter((e) => e.type === 'intern').length).toBe(b.addCount);
    g.damage(boss, boss.maxHp * 0.4);
    expect(boss.phase).toBe(2);
    expect(g.enemies.filter((e) => e.type === 'intern').length).toBe(b.addCount + b.phaseBurst);
    g.damage(boss, boss.maxHp * 0.3);
    expect(boss.phase).toBe(3);
    expect(g.enemies.filter((e) => e.type === 'intern').length).toBe(b.addCount + 2 * b.phaseBurst);
  });

  it('called-in Interns appear next to him, not at the door', () => {
    const g = new Game(corridor(['headofcomms:1@1']));
    g.start();
    g.runFor(4.1);
    const boss = g.enemies.find((e) => e.type === 'headofcomms')!;
    const adds = g.enemies.filter((e) => e.isAdd);
    expect(adds.length).toBe(COLLEAGUES.headofcomms.boss!.addCount);
    for (const a of adds) expect(Math.abs(a.dist - boss.dist)).toBeLessThan(1.5);
  });
});

describe('determinism', () => {
  it('the same seed and actions give exactly the same round', () => {
    const run = () => {
      const g = new Game(LEVELS[1], { seed: 42 });
      g.place('autoreply', 6, 3);
      g.place('autoreply', 8, 6);
      g.start();
      g.runFor(400, (gg) => {
        if (gg.coffee > 30) {
          const t = gg.towers.find((x) => x.tiers[0] < 4);
          if (t) gg.upgrade(t.id, 0);
        }
      });
      return JSON.stringify({ s: g.stats, f: g.focus, c: g.coffee, p: g.phase, w: g.waveIndex });
    };
    expect(run()).toBe(run());
  });
});
