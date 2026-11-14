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
