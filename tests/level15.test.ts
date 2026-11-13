// Level 15: Boardroom III. Your Line Manager, 360, and the peer reviewers.

import { describe, expect, it } from 'vitest';
import { COLLEAGUES } from '../src/sim/data/colleagues';
import { Game } from '../src/sim/game';
import { corridor } from './helpers';

describe('Your Line Manager, 360', () => {
  it('earlier bosses come back as peer reviewers at 66% and 33%, lighter than before', () => {
    const g = new Game(corridor(['intern:1@1']));
    g.phase = 'running';
    const boss = g.spawn('finalreview', 0, 6, false);
    boss.shield = 0;
    g.damage(boss, boss.maxHp * 0.4);
    const first = g.enemies.find((e) => e.type === 'headofcomms');
    expect(first).toBeDefined();
    expect(first!.maxHp).toBeCloseTo(COLLEAGUES.headofcomms.hp * 0.2);
    g.damage(boss, boss.maxHp * 0.3);
    expect(g.enemies.some((e) => e.type === 'presenter')).toBe(true);
    expect(g.drainEvents().filter((e) => e.t === 'reviewer').length).toBe(2);
  });
});
