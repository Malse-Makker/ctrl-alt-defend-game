// Level 11: The Merger. Company culture, moving boxes, The Consultant.

import { describe, expect, it } from 'vitest';
import { applyCommand, parseCommand } from '../src/sim/commands';
import { BOX_COST, Game } from '../src/sim/game';
import { corridor } from './helpers';

const SET = ['coffee', 'autoreply', 'artillery', 'headphones', 'poster'];
const GRID = ['aaaxxpppppppppppppppp', 'aaaxxpppppppppppppppp', '====================D', 'aaaaaaaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaaaaaaa'];

function game() {
  const g = new Game(corridor(['intern:1@1'], { towers: SET, grid: GRID }));
  g.wallets = g.wallets.map(() => 1000);
  return g;
}

describe('company culture', () => {
  it('the old company takes DIGITAL towers, the startup PHYSICAL ones; the rest may go anywhere', () => {
    const g = game();
    expect(g.canPlace('autoreply', 1, 0).ok).toBe(true);
    expect(g.canPlace('artillery', 1, 0).reason).toMatch(/old company/);
    expect(g.canPlace('artillery', 8, 0).ok).toBe(true);
    expect(g.canPlace('autoreply', 8, 0).reason).toMatch(/startup/);
    expect(g.canPlace('headphones', 8, 1).ok).toBe(true);
    expect(g.canPlace('poster', 1, 1).ok).toBe(true);
  });
});

describe('moving boxes', () => {
  it('block building and sight until you pay to clear them; then any tower goes', () => {
    const g = game();
    expect(g.canPlace('autoreply', 3, 0).reason).toMatch(/Moving boxes/);
    expect(g.lineOfSight(2.5, 0.5, 5.5, 0.5)).toBe(false);
    expect(parseCommand({ c: 'clear', tx: 3, ty: 0 })).toEqual({ c: 'clear', tx: 3, ty: 0 });
    const before = g.coffee;
    expect(applyCommand(g, 0, { c: 'clear', tx: 3, ty: 0 }).ok).toBe(true);
    expect(before - g.coffee).toBe(BOX_COST);
    expect(g.canPlace('autoreply', 3, 0).ok).toBe(true);
    expect(g.canPlace('artillery', 3, 0).ok).toBe(true);
    expect(g.clearBoxes(3, 0).ok).toBe(false);
    const copy = new Game(corridor(['intern:1@1'], { towers: SET, grid: GRID }));
    copy.applySnapshot(JSON.parse(JSON.stringify(g.toSnapshot())));
    expect(copy.isBoxes(3, 0)).toBe(false);
    expect(copy.isBoxes(4, 0)).toBe(true);
  });
});

describe('The Consultant', () => {
  it('covers for everyone else; when he goes, the wave falls apart', () => {
    const g = new Game(corridor(['intern:1@1']));
    g.phase = 'running';
    const boss = g.spawn('consultant', 0, 3, false);
    const e = g.spawn('newhire', 0, 6, false);
    e.hp = e.maxHp = 100;
    g.step();
    expect(g.damage(e, 10).dealt).toBeCloseTo(7);
    g.damage(boss, 1e6);
    expect(boss.alive).toBe(false);
    expect(e.hp).toBeLessThanOrEqual(50);
    expect(e.stunTime).toBeGreaterThan(1);
    expect(g.damage(e, 10).dealt).toBe(10);
  });
});
