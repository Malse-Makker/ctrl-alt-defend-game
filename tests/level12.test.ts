// Level 12: HR Room. The one-way mirror, the HR form, The HR Manager's audits.

import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/sim/data/levels';
import { Game } from '../src/sim/game';
import { corridor } from './helpers';

describe('the one-way mirror', () => {
  it('towers in the observation room see the interview room; nothing sees back', () => {
    const g = new Game(LEVELS[12]);
    // From the observation room (x 8-10) east through the mirror (x 11) into the interview room.
    expect(g.lineOfSight(9.5, 7.5, 13.5, 7.5)).toBe(true);
    expect(g.lineOfSight(13.5, 7.5, 9.5, 7.5)).toBe(false);
    // The observation room's own walls still block everything else.
    expect(g.lineOfSight(9.5, 5.5, 5.5, 5.5)).toBe(false);
  });
});

describe('the HR form', () => {
  it('while it is open you cannot upgrade; filling it in pays', () => {
    const hz = { type: 'form' as const, first: 1, every: 30, window: 10, reward: 5 };
    const g = new Game(corridor(['intern:30@1'], { towers: ['autoreply'], hazard: hz }));
    g.coffee = 500;
    const t = g.place('autoreply', 8, 1).tower!;
    g.start();
    g.runFor(1.1);
    expect(g.hazardOpenFor(0)).toBe(true);
    expect(g.canUpgrade(t, 0).reason).toMatch(/form/);
    expect(g.canPlace('autoreply', 9, 1).ok).toBe(true);
    expect(g.solveHazard(0).ok).toBe(true);
    expect(g.canUpgrade(t, 0).ok).toBe(true);
  });
});

describe('The HR Manager', () => {
  it('audits the kind of tower you spent the most on: it stops for a while', () => {
    const g = new Game(corridor(['intern:1@1'], { towers: ['autoreply', 'artillery'] }));
    g.coffee = 5000;
    const a = g.place('autoreply', 4, 1).tower!;
    const b = g.place('autoreply', 6, 1).tower!;
    const art = g.place('artillery', 8, 1).tower!;
    g.phase = 'running';
    const boss = g.spawn('hrmanager', 0, 3, false);
    boss.cryTimer = 0;
    g.step();
    expect(g.audit?.defId).toBe('autoreply');
    g.step();
    expect(a.quiet).toBe('audit');
    expect(b.quiet).toBe('audit');
    expect(art.quiet).toBeNull();
    expect(g.toSnapshot().towers.find((s) => s.id === a.id)!.sil).toBe(5);
  });
});
