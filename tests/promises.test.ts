// Upgrades that did not do what their text says (review step 5). Each test failed before the fix.

import { describe, expect, it } from 'vitest';
import { Game, TICK, type Enemy } from '../src/sim/game';
import { corridor } from './helpers';

const TOWERS = ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'keyboardsmash', 'poster'];

function game(): Game {
  const g = new Game(corridor(['intern:1@1'], { towers: TOWERS }));
  g.wallets = g.wallets.map(() => 5000);
  g.phase = 'running';
  return g;
}

function put(g: Game, type: string, d: number, hp = 1000): Enemy {
  const e = g.spawn(type, 0, d, false);
  e.hp = e.maxHp = hp;
  return e;
}

function upgrade(g: Game, id: number, path: number, n: number): void {
  for (let i = 0; i < n; i++) expect(g.upgrade(id, path).ok).toBe(true);
}

describe('Brown Noise', () => {
  it('shows a hidden colleague until the next pulse, whichever tower was built first', () => {
    for (const autoFirst of [true, false]) {
      const g = game();
      let a = 0;
      if (autoFirst) a = g.place('autoreply', 9, 1).tower!.id;
      const hp = g.place('headphones', 8, 3).tower!;
      upgrade(g, hp.id, 2, 2);
      if (!autoFirst) a = g.place('autoreply', 9, 1).tower!.id;
      const e = put(g, 'impersonator', 8.5);
      g.runFor(1);
      expect(e.revealed, `auto-reply built ${autoFirst ? 'first' : 'last'}`).toBe(true);
      expect(g.tower(a)!.stats.shots, `auto-reply built ${autoFirst ? 'first' : 'last'}`).toBeGreaterThan(1);
    }
  });

  it('the light goes out after the next pulse once he has left', () => {
    const g = game();
    const hp = g.place('headphones', 8, 3).tower!;
    upgrade(g, hp.id, 2, 2);
    const e = put(g, 'impersonator', 8.5);
    e.stunTime = 1e9;
    g.step(TICK);
    expect(e.revealed).toBe(true);
    // Carried far away: no pulse reaches him any more.
    e.dist = 18;
    e.x = 17;
    g.runFor(g.liveStats(hp).interval + 0.5);
    expect(e.revealed).toBe(false);
  });
});

describe('a silenced tower does nothing, its help included', () => {
  it('a Motivational Poster next to a Chatterbox stops helping', () => {
    const g = game();
    const auto = g.place('autoreply', 9, 1).tower!;
    const poster = g.place('poster', 10, 1).tower!;
    g.step(TICK);
    expect(auto.rateBuff).toBeLessThan(1);
    // Close enough to silence the Poster, too far for the Auto-Reply (walkway x = d - 1).
    put(g, 'chatterbox', 13.5);
    g.step(TICK);
    g.step(TICK);
    expect(poster.silenced).toBe(true);
    expect(auto.silenced).toBe(false);
    expect(auto.rateBuff).toBe(1);
  });

  it('Headphones on Deep Focus next to a Chatterbox stop helping', () => {
    const g = game();
    const auto = g.place('autoreply', 9, 1).tower!;
    const hp = g.place('headphones', 11, 1).tower!;
    upgrade(g, hp.id, 2, 3);
    g.step(TICK);
    expect(auto.rateBuff).toBeLessThan(1);
    put(g, 'chatterbox', 14.5);
    g.step(TICK);
    g.step(TICK);
    expect(hp.silenced).toBe(true);
    expect(auto.silenced).toBe(false);
    expect(auto.rateBuff).toBe(1);
  });
});

describe('Sharp Keycaps', () => {
  it('hurt the Old Guard through his box', () => {
    const g = game();
    const t = g.place('keyboardsmash', 8, 1).tower!;
    upgrade(g, t.id, 1, 3);
    const og = put(g, 'oldguard', 9.3);
    const before = og.hp + og.shield;
    og.stunTime = 0.05;
    g.step(TICK);
    g.runFor(3);
    // Less than the slam alone would explain: the slam is 8 and bounces off the box anyway.
    expect(before - (og.hp + og.shield)).toBeGreaterThan(5);
  });
});

describe('Noise Cancelling covers its neighbours', () => {
  it('a tower in range of Noise Cancelling Headphones keeps working next to a Chatterbox', () => {
    const g = game();
    const auto = g.place('autoreply', 9, 1).tower!;
    const hp = g.place('headphones', 10, 3).tower!;
    put(g, 'chatterbox', 10.5);
    g.step(TICK);
    g.step(TICK);
    expect(auto.silenced).toBe(true);
    upgrade(g, hp.id, 0, 2);
    g.step(TICK);
    expect(auto.silenced).toBe(false);
  });

  it('outside their range it does not', () => {
    const g = game();
    const auto = g.place('autoreply', 3, 1).tower!;
    const hp = g.place('headphones', 10, 3).tower!;
    upgrade(g, hp.id, 0, 2);
    put(g, 'chatterbox', 4.5);
    g.step(TICK);
    g.step(TICK);
    expect(auto.silenced).toBe(true);
  });
});

describe('simpler rules (review step 10)', () => {
  it('the Shredder grinds the Old Guard once his box is broken', () => {
    const g = game();
    g.place('shredder', 8, 1);
    const og = put(g, 'oldguard', 9);
    og.stunTime = 1e9;
    g.runFor(1);
    // The box stops every tiny tick.
    expect(og.hp).toBe(og.maxHp);
    og.shield = 0;
    g.runFor(1);
    expect(og.hp).toBeLessThan(og.maxHp);
  });

  it('an ordinary colleague stops just as long every time', () => {
    const g = game();
    const hp = g.place('headphones', 8, 1).tower!;
    const e = put(g, 'newhire', 9);
    const stops: number[] = [];
    let was = 0;
    g.runFor(g.liveStats(hp).interval * 3.2, (gg) => {
      if (e.stunTime > was + 0.05) stops.push(e.stunTime);
      was = e.stunTime;
      e.dist = 10;
      e.x = 9;
      void gg;
    });
    expect(stops.length).toBeGreaterThanOrEqual(3);
    for (const s of stops) expect(s).toBeCloseTo(stops[0], 1);
  });

  it('a boss still gets used to it', () => {
    const g = game();
    const hp = g.place('headphones', 8, 1).tower!;
    const b = put(g, 'repairguy', 9, 100000);
    const stops: number[] = [];
    let was = 0;
    g.runFor(g.liveStats(hp).interval * 3.2, () => {
      if (b.stunTime > was + 0.01) stops.push(b.stunTime);
      was = b.stunTime;
      b.dist = 10;
      b.x = 9;
    });
    expect(stops.length).toBeGreaterThanOrEqual(2);
    expect(stops[1]).toBeLessThan(stops[0]);
  });
});
