// Level 8: the Pomodoro Timer, the flex desks with reservations, and the desk phone.

import { describe, expect, it } from 'vitest';
import { applyCommand, parseCommand } from '../src/sim/commands';
import { Game, MORTAR_FLIGHT, needsSight, TICK, type Enemy } from '../src/sim/game';
import { TOWERS } from '../src/sim/data/towers';
import { corridor } from './helpers';

const SET = ['coffee', 'autoreply', 'pomodoro'];

function game(extra = {}) {
  const g = new Game(corridor(['intern:1@1'], { towers: SET, ...extra }));
  g.wallets = g.wallets.map(() => 5000);
  g.phase = 'running';
  return g;
}

function put(g: Game, type: string, d: number, hp = 100): Enemy {
  const e = g.spawn(type, 0, d, false);
  e.hp = e.maxHp = hp;
  e.stunTime = 1e9;
  return e;
}

describe('Pomodoro Timer', () => {
  it('aims at the walkway next to it, lobs, and lands a moment later on everyone round the tile', () => {
    const g = game();
    const t = g.place('pomodoro', 8, 0).tower!;
    expect(t.aimY).toBe(2.5);
    expect(t.aimX).toBe(8.5);
    const near = put(g, 'newhire', 9.5);
    const far = put(g, 'newhire', 12.5);
    g.runFor(MORTAR_FLIGHT - 0.1);
    expect(near.hp).toBe(100);
    g.runFor(0.2);
    expect(near.hp).toBeLessThan(100);
    expect(far.hp).toBe(100);
  });

  it('works on a tile you pick, anywhere, and needs no sight: walls are no problem', () => {
    const g = game({ walls: [{ x: 6, y: 1, w: 5, h: 1 }] });
    expect(needsSight(TOWERS.pomodoro)).toBe(false);
    const t = g.place('pomodoro', 8, 0).tower!;
    expect(g.setAim(t.id, 16, 2).ok).toBe(true);
    const e = put(g, 'newhire', 17.5);
    g.runFor(1);
    expect(e.hp).toBeLessThan(100);
  });

  it('Back to Back sends two tomatoes, Burnt Out leaves a patch that keeps burning', () => {
    const g = game();
    const t = g.place('pomodoro', 8, 0).tower!;
    for (let i = 0; i < 3; i++) expect(g.upgrade(t.id, 0).ok).toBe(true);
    put(g, 'newhire', 9.5, 1e6);
    g.drainEvents();
    g.runFor(0.1);
    expect(g.drainEvents().filter((e) => e.t === 'lob').length).toBe(2);

    const h = game();
    const b = h.place('pomodoro', 8, 0).tower!;
    for (let i = 0; i < 3; i++) expect(h.upgrade(b.id, 1).ok).toBe(true);
    put(h, 'newhire', 9.5, 1e6);
    h.runFor(1);
    expect(h.craters.length).toBe(1);
    const late = put(h, 'newhire', 9.5, 100);
    h.runFor(1);
    expect(late.hp).toBeLessThan(100);
  });

  it('Snooze pushes them back towards the door', () => {
    const g = game();
    const t = g.place('pomodoro', 8, 0).tower!;
    for (let i = 0; i < 3; i++) expect(g.upgrade(t.id, 2).ok).toBe(true);
    const e = put(g, 'newhire', 9.5, 1e6);
    g.runFor(1);
    expect(e.dist).toBeLessThan(9.5);
  });

  it('aiming goes through the shared command path, and a copy keeps the aim and the patches', () => {
    const g = game();
    const t = g.place('pomodoro', 8, 0).tower!;
    expect(parseCommand({ c: 'aim', id: t.id, tx: 3, ty: 2 })).toEqual({ c: 'aim', id: t.id, tx: 3, ty: 2 });
    expect(parseCommand({ c: 'aim', id: t.id, tx: -1, ty: 2 })).toBeNull();
    expect(applyCommand(g, 0, { c: 'aim', id: t.id, tx: 3, ty: 2 }).ok).toBe(true);
    const a = g.place('autoreply', 2, 0).tower!;
    expect(g.setAim(a.id, 1, 1).ok).toBe(false);
    for (let i = 0; i < 3; i++) g.upgrade(t.id, 1);
    put(g, 'newhire', 3.5, 1e6);
    g.runFor(1);
    const copy = new Game(corridor(['intern:1@1'], { towers: SET }));
    copy.applySnapshot(JSON.parse(JSON.stringify(g.toSnapshot())));
    expect(copy.tower(t.id)!.aimX).toBe(3.5);
    expect(copy.craters.length).toBe(1);
    void TICK;
  });
});

const GRID = ['.bbbbbb..............', '.....................', '====================D', '.....................', '.....................', '.....................'];

describe('flex desks', () => {
  it('a few empty desks are reserved every wave; towers already on a desk stay', () => {
    const g = new Game(corridor(['intern:1@1', 'intern:1@1', 'intern:1@1'], { towers: SET, grid: GRID, reserve: 3 }), { seed: 3 });
    g.wallets = g.wallets.map(() => 5000);
    g.place('autoreply', 1, 0);
    g.start();
    expect(g.reserved.length).toBe(3);
    expect(g.reserved.some((d) => d.x === 1 && d.y === 0)).toBe(false);
    const r = g.reserved[0];
    expect(g.canPlace('autoreply', r.x, r.y).reason).toMatch(/Reserved/);
    expect(g.drainEvents().some((e) => e.t === 'reserved')).toBe(true);
    const copy = new Game(corridor(['intern:1@1'], { towers: SET, grid: GRID, reserve: 3 }));
    copy.applySnapshot(JSON.parse(JSON.stringify(g.toSnapshot())));
    expect(copy.reserved).toEqual(g.reserved);
  });
});

describe('the desk phone', () => {
  const hz = { type: 'phone' as const, first: 2, every: 20, window: 6, reward: 5, block: 15 };

  function ringing() {
    const g = new Game(corridor(['intern:40@1'], { towers: SET, grid: GRID, hazard: hz }), { seed: 1 });
    g.wallets = g.wallets.map(() => 5000);
    const t = g.place('autoreply', 3, 0).tower!;
    g.start();
    g.runFor(2.05);
    return { g, t };
  }

  it('rings on a desk with something on it; hanging up pays', () => {
    const { g } = ringing();
    expect(g.hazardOn).toBe(true);
    expect(g.phone).toEqual({ x: 3, y: 0 });
    const before = g.coffee;
    expect(applyCommand(g, 0, { c: 'phone', hang: true }).ok).toBe(true);
    expect(g.coffee - before).toBe(11);
    expect(g.hazardOn).toBe(false);
    expect(g.stuckDesk).toBeNull();
  });

  it('picking up, or letting it ring, leaves that desk stuck on the call for a while', () => {
    const { g, t } = ringing();
    expect(parseCommand({ c: 'phone', hang: false })).toEqual({ c: 'phone', hang: false });
    expect(parseCommand({ c: 'phone' })).toBeNull();
    g.answerPhone(0, false);
    g.runFor(0.1);
    expect(t.quiet).toBe('phone');
    expect(g.toSnapshot().towers.find((s) => s.id === t.id)!.sil).toBe(4);
    g.runFor(15);
    expect(t.quiet).toBeNull();

    const other = ringing();
    other.g.runFor(6);
    expect(other.g.hazardOn).toBe(false);
    expect(other.g.stuckDesk).toEqual({ x: 3, y: 0, until: expect.any(Number) });
  });
});

describe('a boss on its second visit', () => {
  it('is heavier: bossHpMult', () => {
    const g = new Game(corridor(['headofcomms:1@1'], { bossHpMult: 1.8 }));
    const e = g.spawn('headofcomms', 0, 1, false);
    const plain = new Game(corridor(['headofcomms:1@1'])).spawn('headofcomms', 0, 1, false);
    expect(e.maxHp).toBeCloseTo(plain.maxHp * 1.8);
  });
});
