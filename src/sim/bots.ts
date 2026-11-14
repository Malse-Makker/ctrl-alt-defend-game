// Balance bots: simple players that run the real simulation. Used by tools/balance.ts for the
// report, by tests/balance.test.ts to guard the difficulty, and by the main menu as a live demo.
// Measure, do not guess.

import type { LevelDef } from './data/levels';
import { TOWERS, pathBlock } from './data/towers';
import { DARK_RANGE, Game, needsSight, type Tower } from './game';

export interface BotResult {
  bot: string;
  seed: number;
  won: boolean;
  focus: number;
  focusLost: number;
  stars: number;
  wavesReached: number;
  firstLeakWave: number;
  leaks: Record<string, number>;
  coffeeEnd: number;
  coffeeEarned: number;
  build: string;
  /** Coffee in hand at the start of every wave. */
  coffeeByWave: number[];
  /** Furthest any colleague who came in through the door got along the route, 0..1 (1 = reached your desk). */
  deepest: number;
}

export interface Bot {
  name: string;
  plan(g: Game): void;
  act(g: Game): void;
}

interface Spot {
  tx: number;
  ty: number;
  cover: number;
}

/** Buildable tiles sorted by how much walkway an Auto-Reply would cover from there. */
function seenCoverage(g: Game, c: { x: number; y: number }, range: number): number {
  // The Server Room is closed: a tower only reaches walkway on its own side of the door.
  const z = g.level.closedZone;
  const inside = (p: { x: number; y: number }) => !!z && p.x >= z.x && p.x < z.x + z.w && p.y >= z.y && p.y < z.y + z.h;
  let n = 0;
  for (const path of g.paths) {
    for (let d = 0; d <= path.length; d += 0.25) {
      const p = path.pointAt(d);
      if (z && range < 30 && inside(p) !== inside(c)) continue;
      if (Math.hypot(p.x - c.x, p.y - c.y) <= range && g.lineOfSight(c.x, c.y, p.x, p.y)) n++;
    }
  }
  return n * 0.25;
}

export function rankSpots(g: Game, range: number, sighted = true): Spot[] {
  const spots: Spot[] = [];
  for (let ty = 0; ty < g.level.size.h; ty++) {
    for (let tx = 0; tx < g.level.size.w; tx++) {
      if (g.isPathTile(tx, ty) || g.isBlockedTile(tx, ty)) continue;
      const c = { x: tx + 0.5, y: ty + 0.5 };
      // Release Night: in the dark a tower reaches less far.
      const r = g.isLit(tx, ty) ? range : range * DARK_RANGE;
      // For towers that aim, only walkway they can actually see counts: walls and furniture are
      // in the way. Zones, pulses, piles and the chair do not care.
      const cover = sighted ? seenCoverage(g, c, r) : g.paths.reduce((s, p) => s + p.coverage(c, r, 0.25), 0);
      if (cover > 0) spots.push({ tx, ty, cover });
    }
  }
  return spots.sort((a, b) => b.cover - a.cover || a.ty - b.ty || a.tx - b.tx);
}

function freeSpot(g: Game, spots: Spot[], def: string): Spot | undefined {
  return spots.find((s) => g.canPlace(def, s.tx, s.ty).ok);
}

function economySpot(g: Game): Spot | undefined {
  // Coffee machines go where they steal nothing: far from the walkway.
  for (let ty = g.level.size.h - 1; ty >= 0; ty--) {
    for (let tx = 0; tx < g.level.size.w; tx++) {
      if (g.canPlace('coffee', tx, ty).ok && g.minPathDistance({ x: tx + 0.5, y: ty + 0.5 }) > 2.5) return { tx, ty, cover: 0 };
    }
  }
  for (let ty = 0; ty < g.level.size.h; ty++) {
    for (let tx = 0; tx < g.level.size.w; tx++) {
      if (g.canPlace('coffee', tx, ty).ok) return { tx, ty, cover: 0 };
    }
  }
  return undefined;
}

const RANGE = TOWERS.autoreply.base.range;

/** Upgrade order for an Auto-Reply: RULES 1, TEMPLATES 1, RULES 2, then TEMPLATES to 4 (a 4-2-0). */
const AUTO_PLAN = [1, 0, 1, 0, 0, 0];

function stepsDone(t: Tower): number {
  return t.tiers[0] + t.tiers[1] + t.tiers[2];
}

function nextPlanned(t: Tower, plan: number[]): number | null {
  const want = [0, 0, 0];
  for (const p of plan) {
    want[p]++;
    if (t.tiers[p] < want[p]) return p;
  }
  return null;
}

/** Places one Auto-Reply and then watches. Should lose. */
export const idleBot: Bot = {
  name: 'idle',
  plan(g) {
    const s = freeSpot(g, rankSpots(g, RANGE), 'autoreply');
    if (s) g.place('autoreply', s.tx, s.ty);
  },
  act() {},
};

/** Only ever buys more Auto-Replies, never upgrades. Spamming should lose to upgrading. */
export const spamBot: Bot = {
  name: 'spam',
  plan(g) {
    this.act(g);
  },
  act(g) {
    const spots = rankSpots(g, RANGE);
    for (;;) {
      const s = freeSpot(g, spots, 'autoreply');
      if (!s || !g.place('autoreply', s.tx, s.ty).ok) break;
    }
  },
};

/**
 * A first-time player: buys Auto-Replies until there are six, then gives each one the first
 * TEMPLATES upgrade. Never touches Coffee Machines, other paths or targeting.
 */
export const beginnerBot: Bot = {
  name: 'beginner',
  plan(g) {
    const spots = rankSpots(g, RANGE);
    for (let i = 0; i < 2; i++) {
      const s = freeSpot(g, spots, 'autoreply');
      if (s) g.place('autoreply', s.tx, s.ty);
    }
  },
  act(g) {
    const autos = g.towers.filter((t) => t.defId === 'autoreply');
    if (autos.length < 6) {
      const s = freeSpot(g, rankSpots(g, RANGE), 'autoreply');
      if (s) g.place('autoreply', s.tx, s.ty);
      return;
    }
    const t = autos.find((a) => a.tiers[0] < 1);
    if (t) g.upgrade(t.id, 0);
  },
};

// ------------------------------------------------------------------ scripted build orders

type Step =
  | { place: string; spot: 'cover' | 'far' | 'zone' | 'desk' | 'support' | 'view'; from?: number }
  | { up: string; path: number; all?: boolean }
  /** The Merger: clear the stack of moving boxes that sees the most walkway. */
  | { clear: true };

/** A good player's build order for a level, step by step; each step waits until it is affordable. */
const SCRIPTS: Record<number, Step[]> = {
  2: [
    // Coffee Corner: Auto-Replies for the crowd, Office Artillery for the Old Guard's box,
    // Headphones by your desk for everyone the others miss (and the Chatterbox).
    { place: 'autoreply', spot: 'cover' },
    { place: 'autoreply', spot: 'cover' },
    { up: 'autoreply', path: 1, all: true },
    { place: 'coffee', spot: 'far' },
    { place: 'artillery', spot: 'far' },
    { up: 'autoreply', path: 0, all: true },
    { place: 'headphones', spot: 'cover' },
    { up: 'artillery', path: 0 },
    { up: 'headphones', path: 0 },
    { up: 'headphones', path: 0 },
    { place: 'autoreply', spot: 'cover' },
    { up: 'autoreply', path: 1, all: true },
    { up: 'autoreply', path: 0, all: true },
    { up: 'artillery', path: 0 },
    { place: 'autoreply', spot: 'cover' },
    { up: 'autoreply', path: 0, all: true },
    { up: 'artillery', path: 0 },
    { up: 'autoreply', path: 1, all: true },
    { up: 'autoreply', path: 1, all: true },
    { place: 'artillery', spot: 'far' },
    { up: 'artillery', path: 1 },
    { up: 'artillery', path: 1 },
    { up: 'autoreply', path: 1, all: true },
  ],
};

/** Could this tower stand here, money aside? Finding a spot must not depend on the wallet. */
function placeable(g: Game, def: string, tx: number, ty: number): boolean {
  const c = g.canPlace(def, tx, ty);
  return c.ok || c.reason === 'Not enough Coffee.';
}

SCRIPTS[3] = [
  { place: 'autoreply', spot: 'cover' },
  { place: 'autoreply', spot: 'cover' },
  { place: 'selfservice', spot: 'desk' },
  { up: 'autoreply', path: 1, all: true },
  { place: 'coffee', spot: 'far' },
  // Office Artillery needs a view now: an early one on the best spot carries the middle game.
  { place: 'artillery', spot: 'far' },
  { up: 'autoreply', path: 0, all: true },
  { up: 'artillery', path: 0 },
  // Please hold: Hold Music by the desk keeps The Presenter at the end of his walk.
  { up: 'selfservice', path: 2 },
  { up: 'selfservice', path: 2 },
  { up: 'artillery', path: 0 },
  { place: 'autoreply', spot: 'desk' },
  { up: 'autoreply', path: 1, all: true },
  { place: 'quickreply', spot: 'desk' },
  { up: 'quickreply', path: 0 },
  { up: 'quickreply', path: 2 },
  { up: 'quickreply', path: 0 },
  { up: 'artillery', path: 0 },
  { up: 'autoreply', path: 0, all: true },
  { place: 'quickreply', spot: 'desk' },
  { up: 'quickreply', path: 0, all: true },
  { up: 'artillery', path: 1 },
  { place: 'quickreply', spot: 'desk' },
  { up: 'quickreply', path: 0, all: true },
  { up: 'quickreply', path: 2, all: true },
  { up: 'artillery', path: 0 },
  { up: 'autoreply', path: 1, all: true },
];

SCRIPTS[4] = [
  { place: 'autoreply', spot: 'cover' },
  { place: 'thumbtacks', spot: 'cover' },
  { place: 'autoreply', spot: 'cover' },
  { up: 'autoreply', path: 1, all: true },
  { place: 'coffee', spot: 'far' },
  { place: 'selfservice', spot: 'cover' },
  { up: 'thumbtacks', path: 0 },
  { place: 'artillery', spot: 'far' },
  { up: 'autoreply', path: 0, all: true },
  { place: 'shredder', spot: 'zone' },
  { up: 'selfservice', path: 0 },
  { up: 'thumbtacks', path: 1 },
  { up: 'thumbtacks', path: 0 },
  { up: 'artillery', path: 0 },
  { up: 'shredder', path: 0 },
  { up: 'autoreply', path: 0, all: true },
  { place: 'thumbtacks', spot: 'cover' },
  { up: 'selfservice', path: 0 },
  { up: 'thumbtacks', path: 0, all: true },
  { up: 'artillery', path: 0 },
  { place: 'quickreply', spot: 'desk' },
  { up: 'quickreply', path: 0 },
  { up: 'quickreply', path: 2 },
  { up: 'quickreply', path: 0 },
  { up: 'selfservice', path: 1 },
  { up: 'thumbtacks', path: 1, all: true },
  { up: 'artillery', path: 1 },
  { up: 'autoreply', path: 1, all: true },
  { up: 'thumbtacks', path: 0, all: true },
  { up: 'quickreply', path: 0 },
  { up: 'selfservice', path: 0 },
  { up: 'artillery', path: 0 },
  { up: 'autoreply', path: 0, all: true },
];

SCRIPTS[5] = [
  { place: 'autoreply', spot: 'cover' },
  { place: 'thumbtacks', spot: 'cover' },
  { place: 'autoreply', spot: 'cover' },
  { up: 'autoreply', path: 1, all: true },
  { place: 'coffee', spot: 'far' },
  { place: 'selfservice', spot: 'cover' },
  { up: 'thumbtacks', path: 0 },
  { place: 'artillery', spot: 'far' },
  { place: 'coffee', spot: 'far' },
  { place: 'keyboardsmash', spot: 'cover' },
  { up: 'autoreply', path: 0, all: true },
  { place: 'shredder', spot: 'zone' },
  { up: 'artillery', path: 0 },
  { up: 'artillery', path: 0 },
  { place: 'chair', spot: 'cover' },
  { up: 'selfservice', path: 0 },
  { up: 'thumbtacks', path: 1 },
  { up: 'artillery', path: 0 },
  { up: 'keyboardsmash', path: 1 },
  { up: 'autoreply', path: 0, all: true },
  { place: 'quickreply', spot: 'desk' },
  { up: 'quickreply', path: 0 },
  { up: 'quickreply', path: 2 },
  { up: 'quickreply', path: 0 },
  { up: 'artillery', path: 0 },
  { up: 'chair', path: 2 },
  { up: 'autoreply', path: 1, all: true },
  { up: 'thumbtacks', path: 0 },
  { up: 'selfservice', path: 0 },
  { up: 'quickreply', path: 0 },
  { up: 'chair', path: 2 },
  { up: 'artillery', path: 1 },
  { up: 'autoreply', path: 0, all: true },
];

SCRIPTS[6] = [
  { place: 'autoreply', spot: 'cover' },
  { place: 'thumbtacks', spot: 'cover' },
  { place: 'autoreply', spot: 'cover' },
  { up: 'autoreply', path: 1, all: true },
  { place: 'coffee', spot: 'far' },
  { place: 'artillery', spot: 'far' },
  { up: 'thumbtacks', path: 0 },
  { place: 'replyall', spot: 'cover' },
  { up: 'autoreply', path: 0, all: true },
  { place: 'keyboardsmash', spot: 'cover' },
  { up: 'artillery', path: 0 },
  { up: 'replyall', path: 0 },
  { place: 'thumbtacks', spot: 'cover' },
  { up: 'thumbtacks', path: 0, all: true },
  { up: 'artillery', path: 0 },
  { place: 'shredder', spot: 'zone' },
  { up: 'replyall', path: 1 },
  { up: 'thumbtacks', path: 1, all: true },
  { place: 'chair', spot: 'cover' },
  { up: 'replyall', path: 0 },
  { up: 'autoreply', path: 0, all: true },
  { up: 'artillery', path: 0 },
  { up: 'thumbtacks', path: 0, all: true },
  { up: 'replyall', path: 0 },
  { place: 'replyall', spot: 'cover' },
  { up: 'replyall', path: 0, all: true },
  { up: 'thumbtacks', path: 0 },
  { up: 'replyall', path: 0 },
  { up: 'keyboardsmash', path: 1 },
  { up: 'chair', path: 2 },
  { up: 'shredder', path: 0 },
  { up: 'keyboardsmash', path: 1 },
  { up: 'chair', path: 2 },
  { up: 'shredder', path: 0 },
  { up: 'artillery', path: 1 },
  { up: 'autoreply', path: 1, all: true },
  { up: 'artillery', path: 0 },
];

SCRIPTS[7] = [
  // The Car Park: you only build in empty bays, two tiles off the walkway, and the cars block
  // sight. Office Artillery in the bays with the longest view does the heavy lifting.
  { place: 'autoreply', spot: 'cover' },
  { place: 'thumbtacks', spot: 'cover' },
  { place: 'artillery', spot: 'far' },
  { place: 'coffee', spot: 'far' },
  { up: 'artillery', path: 0 },
  { place: 'delegation', spot: 'cover' },
  { up: 'artillery', path: 0 },
  { up: 'thumbtacks', path: 0 },
  { place: 'artillery', spot: 'far' },
  { up: 'artillery', path: 0, all: true },
  { place: 'thumbtacks', spot: 'cover' },
  { up: 'thumbtacks', path: 0, all: true },
  // Board Members only notice DIGITAL: keep some of it along the whole route.
  { place: 'autoreply', spot: 'cover' },
  { up: 'autoreply', path: 0, all: true },
  { up: 'delegation', path: 0 },
  { place: 'replyall', spot: 'cover' },
  { up: 'artillery', path: 1, all: true },
  { up: 'thumbtacks', path: 1, all: true },
  { up: 'delegation', path: 1 },
  { place: 'keyboardsmash', spot: 'cover' },
  { up: 'replyall', path: 0 },
  { up: 'artillery', path: 0, all: true },
  { place: 'artillery', spot: 'far' },
  { up: 'artillery', path: 0, all: true },
  { up: 'replyall', path: 0 },
  { up: 'delegation', path: 0 },
  { up: 'thumbtacks', path: 0, all: true },
  { up: 'autoreply', path: 1, all: true },
  { up: 'artillery', path: 1, all: true },
];

SCRIPTS[8] = [
  // Hot Desks: build on the flex desks only, a few booked every wave. Every desk sits right by
  // the walkway; the Pomodoro Timer lobs over everything at the busiest bend.
  { place: 'autoreply', spot: 'cover' },
  { place: 'thumbtacks', spot: 'cover' },
  { place: 'autoreply', spot: 'cover' },
  { up: 'autoreply', path: 1, all: true },
  { place: 'coffee', spot: 'far' },
  { up: 'thumbtacks', path: 0 },
  { place: 'pomodoro', spot: 'cover' },
  { up: 'autoreply', path: 0, all: true },
  { up: 'pomodoro', path: 1 },
  { place: 'artillery', spot: 'far' },
  { up: 'pomodoro', path: 1 },
  { place: 'delegation', spot: 'cover' },
  { up: 'artillery', path: 0 },
  { up: 'thumbtacks', path: 0 },
  { up: 'delegation', path: 0 },
  { place: 'replyall', spot: 'cover' },
  { up: 'artillery', path: 0 },
  { up: 'pomodoro', path: 1 },
  { up: 'replyall', path: 0 },
  { place: 'thumbtacks', spot: 'cover' },
  { up: 'thumbtacks', path: 0, all: true },
  { up: 'delegation', path: 1 },
  { up: 'autoreply', path: 0, all: true },
  { up: 'artillery', path: 0 },
  { up: 'pomodoro', path: 1 },
  { up: 'replyall', path: 0 },
  { up: 'autoreply', path: 1, all: true },
];

SCRIPTS[9] = [
  // Town Hall: two entrances busy at once, joined in front of the stage. Most towers at the
  // meeting point; Office Artillery right by each long lane (the seats block everything else),
  // and a Motivational Poster next to the busiest towers.
  { place: 'autoreply', spot: 'cover' },
  { place: 'thumbtacks', spot: 'cover' },
  { place: 'autoreply', spot: 'cover' },
  { up: 'autoreply', path: 1, all: true },
  { place: 'coffee', spot: 'far' },
  { place: 'pomodoro', spot: 'cover' },
  { up: 'thumbtacks', path: 0 },
  { up: 'autoreply', path: 0, all: true },
  { up: 'pomodoro', path: 1 },
  { place: 'artillery', spot: 'view' },
  { place: 'delegation', spot: 'cover' },
  { up: 'pomodoro', path: 1 },
  { up: 'artillery', path: 0 },
  { place: 'poster', spot: 'support' },
  { up: 'delegation', path: 0 },
  { place: 'replyall', spot: 'cover' },
  { up: 'artillery', path: 0 },
  { up: 'poster', path: 1 },
  { up: 'replyall', path: 0 },
  { up: 'poster', path: 1 },
  { place: 'artillery', spot: 'view' },
  { up: 'artillery', path: 0, all: true },
  { up: 'delegation', path: 1 },
  { up: 'pomodoro', path: 1 },
  { up: 'autoreply', path: 0, all: true },
  { up: 'artillery', path: 0 },
  { up: 'replyall', path: 0 },
  { up: 'poster', path: 0 },
  { up: 'autoreply', path: 1, all: true },
];

SCRIPTS[10] = [
  { place: 'autoreply', spot: 'cover' },
  { place: 'thumbtacks', spot: 'cover' },
  { place: 'autoreply', spot: 'cover' },
  { up: 'autoreply', path: 1, all: true },
  { place: 'coffee', spot: 'far' },
  { place: 'selfservice', spot: 'cover' },
  { up: 'thumbtacks', path: 0 },
  { place: 'artillery', spot: 'far' },
  { place: 'coffee', spot: 'far' },
  { place: 'keyboardsmash', spot: 'cover' },
  { up: 'autoreply', path: 0, all: true },
  { place: 'shredder', spot: 'zone' },
  { up: 'artillery', path: 0 },
  { up: 'artillery', path: 0 },
  { place: 'chair', spot: 'cover' },
  { up: 'selfservice', path: 0 },
  { up: 'thumbtacks', path: 1 },
  { up: 'artillery', path: 0 },
  { up: 'keyboardsmash', path: 1 },
  { up: 'autoreply', path: 0, all: true },
  { place: 'quickreply', spot: 'desk' },
  { up: 'quickreply', path: 0 },
  { up: 'quickreply', path: 2 },
  { up: 'quickreply', path: 0 },
  { up: 'artillery', path: 0 },
  { up: 'chair', path: 2 },
  { up: 'autoreply', path: 1, all: true },
  { up: 'thumbtacks', path: 0 },
  { up: 'selfservice', path: 0 },
  { up: 'quickreply', path: 0 },
  { up: 'chair', path: 2 },
  { up: 'artillery', path: 1 },
  { up: 'autoreply', path: 0, all: true },
];

SCRIPTS[11] = [
  // The Merger: two entrances like Town Hall, but DIGITAL only on the old company's side and
  // PHYSICAL only on the startup's. The bot leaves the moving boxes alone (the worst case).
  { place: 'autoreply', spot: 'cover' },
  { place: 'thumbtacks', spot: 'cover' },
  { place: 'autoreply', spot: 'cover' },
  { up: 'autoreply', path: 1, all: true },
  { place: 'coffee', spot: 'far' },
  { place: 'pomodoro', spot: 'cover' },
  { up: 'thumbtacks', path: 0 },
  { up: 'autoreply', path: 0, all: true },
  { up: 'pomodoro', path: 1 },
  { place: 'artillery', spot: 'view' },
  { place: 'delegation', spot: 'cover' },
  { up: 'pomodoro', path: 1 },
  { up: 'artillery', path: 0 },
  { place: 'poster', spot: 'support' },
  { up: 'delegation', path: 0 },
  { place: 'replyall', spot: 'cover' },
  { up: 'artillery', path: 0 },
  { up: 'poster', path: 1 },
  { up: 'replyall', path: 0 },
  { up: 'poster', path: 1 },
  { place: 'artillery', spot: 'view' },
  { up: 'artillery', path: 0, all: true },
  { up: 'delegation', path: 1 },
  { up: 'pomodoro', path: 1 },
  { up: 'autoreply', path: 0, all: true },
  { up: 'artillery', path: 0 },
  { up: 'replyall', path: 0 },
  { up: 'poster', path: 0 },
  { up: 'autoreply', path: 1, all: true },
];

SCRIPTS[12] = [
  // HR Room: one long way round the archive and into the interview room, with filing cabinets
  // blocking almost every view. Office Artillery in the observation room sees the last stretch.
  { place: 'autoreply', spot: 'cover' },
  { place: 'thumbtacks', spot: 'cover' },
  { place: 'autoreply', spot: 'cover' },
  { up: 'autoreply', path: 1, all: true },
  { place: 'coffee', spot: 'far' },
  { up: 'thumbtacks', path: 0 },
  { place: 'pomodoro', spot: 'cover' },
  { up: 'autoreply', path: 0, all: true },
  { up: 'pomodoro', path: 1 },
  { place: 'artillery', spot: 'view' },
  { up: 'pomodoro', path: 1 },
  { place: 'delegation', spot: 'cover' },
  { up: 'artillery', path: 0 },
  { up: 'thumbtacks', path: 0 },
  { up: 'delegation', path: 0 },
  { place: 'replyall', spot: 'cover' },
  { up: 'artillery', path: 0 },
  { up: 'pomodoro', path: 1 },
  { up: 'replyall', path: 0 },
  { place: 'thumbtacks', spot: 'cover' },
  { up: 'thumbtacks', path: 0, all: true },
  { up: 'delegation', path: 1 },
  { up: 'autoreply', path: 0, all: true },
  { up: 'artillery', path: 0 },
  { up: 'pomodoro', path: 1 },
  { up: 'replyall', path: 0 },
  { up: 'autoreply', path: 1, all: true },
];

SCRIPTS[13] = [
  // Server Room: one long, straight run through the cold. Towers in there fire at half speed,
  // so more of them; Office Artillery and the Pomodoro Timer reach in from anywhere.
  { place: 'autoreply', spot: 'cover' },
  { place: 'thumbtacks', spot: 'cover' },
  { place: 'autoreply', spot: 'cover' },
  { up: 'autoreply', path: 1, all: true },
  { place: 'coffee', spot: 'far' },
  { up: 'thumbtacks', path: 0 },
  { place: 'pomodoro', spot: 'cover' },
  { up: 'autoreply', path: 0, all: true },
  { up: 'pomodoro', path: 1 },
  { place: 'artillery', spot: 'far' },
  { up: 'pomodoro', path: 1 },
  { place: 'delegation', spot: 'cover' },
  { up: 'artillery', path: 0 },
  { up: 'thumbtacks', path: 0 },
  { up: 'delegation', path: 0 },
  { place: 'replyall', spot: 'cover' },
  { up: 'artillery', path: 0 },
  { up: 'pomodoro', path: 1 },
  { up: 'replyall', path: 0 },
  { place: 'thumbtacks', spot: 'cover' },
  { up: 'thumbtacks', path: 0, all: true },
  { up: 'delegation', path: 1 },
  { up: 'autoreply', path: 0, all: true },
  { up: 'artillery', path: 0 },
  { up: 'pomodoro', path: 1 },
  { up: 'replyall', path: 0 },
  { up: 'autoreply', path: 1, all: true },
];

SCRIPTS[14] = [
  // Release Night: a long winding run in the dark. Towers in the light of a desk lamp reach
  // further; the Pomodoro Timer and Office Artillery do not care about the dark.
  { place: 'autoreply', spot: 'cover' },
  { place: 'thumbtacks', spot: 'cover' },
  { place: 'autoreply', spot: 'cover' },
  { up: 'autoreply', path: 1, all: true },
  { place: 'coffee', spot: 'far' },
  { up: 'thumbtacks', path: 0 },
  { place: 'pomodoro', spot: 'cover' },
  { up: 'autoreply', path: 0, all: true },
  { up: 'pomodoro', path: 1 },
  { place: 'artillery', spot: 'far' },
  { up: 'pomodoro', path: 1 },
  { place: 'delegation', spot: 'cover' },
  { up: 'artillery', path: 0 },
  { up: 'thumbtacks', path: 0 },
  { up: 'delegation', path: 0 },
  { place: 'replyall', spot: 'cover' },
  { up: 'artillery', path: 0 },
  { up: 'pomodoro', path: 1 },
  { up: 'replyall', path: 0 },
  { place: 'thumbtacks', spot: 'cover' },
  { up: 'thumbtacks', path: 0, all: true },
  { up: 'delegation', path: 1 },
  { up: 'autoreply', path: 0, all: true },
  { up: 'artillery', path: 0 },
  { up: 'pomodoro', path: 1 },
  { up: 'replyall', path: 0 },
  { up: 'autoreply', path: 1, all: true },
];

SCRIPTS[15] = [
  { place: 'autoreply', spot: 'cover' },
  { place: 'thumbtacks', spot: 'cover' },
  { place: 'autoreply', spot: 'cover' },
  { up: 'autoreply', path: 1, all: true },
  { place: 'coffee', spot: 'far' },
  { place: 'selfservice', spot: 'cover' },
  { up: 'thumbtacks', path: 0 },
  { place: 'artillery', spot: 'far' },
  { place: 'coffee', spot: 'far' },
  { place: 'keyboardsmash', spot: 'cover' },
  { up: 'autoreply', path: 0, all: true },
  { place: 'shredder', spot: 'zone' },
  { up: 'artillery', path: 0 },
  { up: 'artillery', path: 0 },
  { place: 'chair', spot: 'cover' },
  { up: 'selfservice', path: 0 },
  { up: 'thumbtacks', path: 1 },
  { up: 'artillery', path: 0 },
  { up: 'keyboardsmash', path: 1 },
  { up: 'autoreply', path: 0, all: true },
  { place: 'quickreply', spot: 'desk' },
  { up: 'quickreply', path: 0 },
  { up: 'quickreply', path: 2 },
  { up: 'quickreply', path: 0 },
  { up: 'artillery', path: 0 },
  { up: 'chair', path: 2 },
  { up: 'autoreply', path: 1, all: true },
  { up: 'thumbtacks', path: 0 },
  { up: 'selfservice', path: 0 },
  { up: 'quickreply', path: 0 },
  { up: 'chair', path: 2 },
  { up: 'artillery', path: 1 },
  { up: 'autoreply', path: 0, all: true },
];

function spotFor(g: Game, def: string, kind: 'cover' | 'far' | 'zone' | 'desk' | 'support' | 'view'): Spot | undefined {
  if (kind === 'view') {
    // The tile that sees the most walkway at the tower's full reach (Office Artillery on a floor
    // full of furniture: right by a long, straight stretch).
    let best: Spot | undefined;
    for (let ty = 0; ty < g.level.size.h; ty++) {
      for (let tx = 0; tx < g.level.size.w; tx++) {
        if (!placeable(g, def, tx, ty)) continue;
        const cover = seenCoverage(g, { x: tx + 0.5, y: ty + 0.5 }, Math.min(TOWERS[def].base.range, 30));
        if (!best || cover > best.cover) best = { tx, ty, cover };
      }
    }
    if (best) return best;
  }
  if (kind === 'support') {
    // A Motivational Poster goes where it reaches the most Coffee already spent on towers.
    const r = TOWERS[def].base.range;
    let best: Spot | undefined;
    for (let ty = 0; ty < g.level.size.h; ty++) {
      for (let tx = 0; tx < g.level.size.w; tx++) {
        if (!placeable(g, def, tx, ty)) continue;
        const cover = g.towers.filter((t) => t.def.role !== 'economy' && t.def.role !== 'support' && Math.hypot(t.x - tx - 0.5, t.y - ty - 0.5) <= r).reduce((n, t) => n + t.invested, 0);
        if (!best || cover > best.cover) best = { tx, ty, cover };
      }
    }
    if (best && best.cover > 0) return best;
  }
  if (kind === 'desk') {
    // The best spot that still covers the last stretch before your desk.
    const path = g.paths[0];
    const end = path.points[path.points.length - 1];
    const r = TOWERS[def].base.range;
    return rankSpots(g, Math.min(r, 4), needsSight(TOWERS[def]))
      .filter((p) => Math.hypot(p.tx + 0.5 - end.x, p.ty + 0.5 - end.y) <= r * 0.9)
      .find((p) => placeable(g, def, p.tx, p.ty));
  }
  if (kind === 'far') {
    // Out of the way of the good close spots if the floor has any, but with a view: furniture
    // blocks sight.
    let best: Spot | undefined;
    for (const away of [2.5, 0]) {
      for (let ty = g.level.size.h - 1; ty >= 0; ty--) {
        for (let tx = 0; tx < g.level.size.w; tx++) {
          const c = { x: tx + 0.5, y: ty + 0.5 };
          if (!placeable(g, def, tx, ty) || g.minPathDistance(c) <= away) continue;
          const cover = seenCoverage(g, c, TOWERS[def].base.range);
          if (!best || cover > best.cover) best = { tx, ty, cover };
        }
      }
      if (best) return best;
    }
  }
  return rankSpots(g, Math.min(TOWERS[def].base.range, 4), needsSight(TOWERS[def])).find((p) => placeable(g, def, p.tx, p.ty));
}

/** Runs a script; once it is done, keeps buying Auto-Replies and their upgrades. */
function runScript(g: Game, steps: Step[], state: { i: number }): void {
  const autos = g.towers.filter((t) => t.defId === 'autoreply');
  const boss = g.enemies.some((e) => e.def.boss);
  autos.forEach((t, i) => g.setTargeting(t.id, boss && i % 2 === 0 ? 'strongest' : 'first'));
  for (let guard = 0; guard < 5 && state.i < steps.length; guard++) {
    const st = steps[state.i];
    if ('clear' in st) {
      let best: { x: number; y: number; cover: number } | null = null;
      for (const b of g.boxes) {
        if (!g.isBoxes(b.x, b.y)) continue;
        const cover = g.paths.reduce((n, p) => n + p.coverage({ x: b.x + 0.5, y: b.y + 0.5 }, 3, 0.25), 0);
        if (!best || cover > best.cover) best = { x: b.x, y: b.y, cover };
      }
      if (!best) {
        state.i++;
        continue;
      }
      if (!g.clearBoxes(best.x, best.y).ok) return;
      state.i++;
      continue;
    }
    if ('place' in st) {
      if (st.from !== undefined && g.waveIndex < st.from) return;
      // The projector is down: wait for it instead of skipping the step (no spot is free now).
      if (g.hazardBlocks(0)) return;
      const spot = spotFor(g, st.place, st.spot);
      if (!spot) {
        state.i++;
        continue;
      }
      if (!g.canPlace(st.place, spot.tx, spot.ty).ok) return;
      g.place(st.place, spot.tx, spot.ty);
      state.i++;
      continue;
    }
    // Towers of that type that may still take this path (the 4-2-0 rule allows it).
    const open = g.towers.filter((t) => t.defId === st.up && pathBlock(t.tiers, st.path) === null);
    if (open.length === 0) {
      state.i++;
      continue;
    }
    const lowest = Math.min(...open.map((t) => t.tiers[st.path]));
    const target = open.find((t) => t.tiers[st.path] === lowest)!;
    if (!g.canUpgrade(target, st.path).ok) return;
    g.upgrade(target.id, st.path);
    // "all": stay on this step until every tower of that type reached the same tier.
    const behind = st.all && open.some((t) => t !== target && t.tiers[st.path] < target.tiers[st.path]);
    if (!behind) state.i++;
  }
  if (state.i >= steps.length) solidL1(g);
}

const scriptState = new WeakMap<Game, { i: number }>();

/**
 * A sensible player: two Auto-Replies on the best spots, one Coffee Machine early, then the
 * cheapest planned upgrade first, a new tower once every tower is well on its way, and half the
 * towers on Most HP when the boss shows up (the boss banner says so).
 */
export const solidBot: Bot = {
  name: 'solid',
  plan(g) {
    const script = SCRIPTS[g.level.id];
    if (script) {
      const st = { i: 0 };
      scriptState.set(g, st);
      runScript(g, script, st);
      return;
    }
    const spots = rankSpots(g, RANGE);
    for (let i = 0; i < 2; i++) {
      const s = freeSpot(g, spots, 'autoreply');
      if (s) g.place('autoreply', s.tx, s.ty);
    }
  },
  act(g) {
    reconnect(g);
    const script = SCRIPTS[g.level.id];
    const st = scriptState.get(g);
    if (script && st) return runScript(g, script, st);
    solidL1(g);
  },
};

/**
 * Getting back online takes a real player about eight seconds of dinosaur. The good players do
 * that; the projector they leave alone, so its numbers stay the worst case.
 */
function reconnect(g: Game): void {
  const hz = g.level.hazard;
  if (hz?.type === 'nointernet' && g.hazardOpenFor(0) && g.time >= g.hazardUntil - hz.window + 8) g.solveHazard(0);
  // Pizza: a good player grabs it within a couple of seconds.
  if (hz?.type === 'pizza' && g.hazardOn && g.pizza && g.time >= g.hazardUntil - hz.window + 2) g.takePizza(0);
  // The HR form: three ticks and a signature, about five seconds.
  if (hz?.type === 'form' && g.hazardOpenFor(0) && g.time >= g.hazardUntil - hz.window + 5) g.solveHazard(0);
  // The desk phone: a good player hangs up after a couple of seconds.
  if (hz?.type === 'phone' && g.hazardOn && g.time >= g.hazardUntil - hz.window + 2) g.answerPhone(0, true);
}

/** The Level 1 way of playing: Auto-Replies, one machine, cheapest planned upgrade first. */
function solidL1(g: Game): void {
  {
    const autos = g.towers.filter((t) => t.defId === 'autoreply');
    const machines = g.towers.filter((t) => t.defId === 'coffee');
    const boss = g.enemies.some((e) => e.def.boss);
    autos.forEach((t, i) => g.setTargeting(t.id, boss && i % 2 === 0 ? 'strongest' : 'first'));

    if (machines.length === 0 && g.waveIndex >= 2 && g.waveIndex <= 6 && g.coffee >= g.placeCostFor('coffee')) {
      const s = economySpot(g);
      if (s) g.place('coffee', s.tx, s.ty);
      return;
    }
    // Cheapest planned upgrade among towers that are not too far ahead of the rest.
    const least = Math.min(...autos.map(stepsDone));
    let best: { t: Tower; path: number; cost: number } | null = null;
    for (const t of autos) {
      if (stepsDone(t) > least + 1 && stepsDone(t) < 4) continue;
      const p = nextPlanned(t, AUTO_PLAN);
      if (p === null) continue;
      const cost = g.pathCostFor(t, p) ?? Infinity;
      if (!best || cost < best.cost) best = { t, path: p, cost };
    }
    // Four towers on 2-2 first, then push them to tier 3 and 4 before buying more copies.
    if ((autos.length < 4 && autos.every((t) => stepsDone(t) >= 4)) || (best === null && autos.length > 0)) {
      const s = freeSpot(g, rankSpots(g, RANGE), 'autoreply');
      if (s && g.place('autoreply', s.tx, s.ty).ok) return;
    }
    if (best && g.canUpgrade(best.t, best.path).ok) {
      g.upgrade(best.t.id, best.path);
      return;
    }
    const m = machines.find((t) => t.tiers[0] < 3);
    if (m && g.waveIndex <= 8 && autos.every((t) => stepsDone(t) >= 3) && g.canUpgrade(m, 0).ok) g.upgrade(m.id, 0);
  }
}

/**
 * Goes heavy on Coffee first: one machine brewing, a second one on the Expense Claim, claimed when
 * the pot is nearly full. A valid alternative should also be able to win.
 */
export const greedyBot: Bot = {
  name: 'greedy',
  plan(g) {
    if (SCRIPTS[g.level.id]) {
      // Same build as the solid player, with the Coffee first.
      const e = economySpot(g);
      if (e) g.place('coffee', e.tx, e.ty);
      solidBot.plan(g);
      return;
    }
    const s = freeSpot(g, rankSpots(g, RANGE), 'autoreply');
    if (s) g.place('autoreply', s.tx, s.ty);
    const e = economySpot(g);
    if (e) g.place('coffee', e.tx, e.ty);
  },
  act(g) {
    reconnect(g);
    const machines = g.towers.filter((t) => t.defId === 'coffee');
    for (const m of machines) {
      const bank = g.liveStats(m).bank;
      if (bank && (m.pot >= bank.cap * 0.9 || g.waveIndex >= g.totalWaves - 1)) g.claim(m.id);
    }
    if (SCRIPTS[g.level.id]) {
      // Scripted levels: the machine goes on the Expense Claim once there is money to spare.
      const m = machines[0];
      if (m && g.waveIndex >= 3 && g.waveIndex <= 10 && m.tiers[1] < 3 && g.coffee >= 45 && g.canUpgrade(m, 1).ok) g.upgrade(m.id, 1);
      else solidBot.act(g);
      return;
    }
    // Saves up for a second machine around wave 3, then puts it on the Expense Claim.
    if (g.waveIndex >= 2 && g.waveIndex <= 5 && machines.length < 2) {
      if (g.coffee >= g.placeCostFor('coffee')) {
        const e = economySpot(g);
        if (e) g.place('coffee', e.tx, e.ty);
      }
      return;
    }
    const brewer = machines[0];
    const banker = machines[1];
    if (banker && g.waveIndex <= 6 && banker.tiers[1] < 3 && g.canUpgrade(banker, 1).ok) {
      g.upgrade(banker.id, 1);
      return;
    }
    if (brewer && g.waveIndex <= 6 && brewer.tiers[0] < 2 && g.canUpgrade(brewer, 0).ok) {
      g.upgrade(brewer.id, 0);
      return;
    }
    solidBot.act(g);
  },
};

export const BOTS: Bot[] = [idleBot, beginnerBot, spamBot, solidBot, greedyBot];

export function runBot(level: LevelDef, bot: Bot, seed = 1): BotResult {
  const g = new Game(level, { seed });
  bot.plan(g);
  g.start();
  const coffeeByWave: number[] = [];
  let lastWave = 0;
  let acc = 0;
  let deepest = 0;
  g.runFor(60 * 30, (gg) => {
    // Only colleagues who came in through the door: The Presenter beams his own right next to the desk.
    for (const e of gg.enemies) if (!e.isAdd) deepest = Math.max(deepest, e.dist / gg.paths[e.pathIndex].length);
    if (gg.waveIndex !== lastWave) {
      lastWave = gg.waveIndex;
      coffeeByWave.push(Math.floor(gg.coffee));
    }
    acc += 1;
    if (acc % 15 === 0) bot.act(gg);
  });
  const built = g.towers
    .map((t) => `${t.defId}${t.tiers.join('')}`)
    .sort()
    .join(' ');
  const s = g.stats;
  return {
    bot: bot.name,
    seed,
    won: g.phase === 'won',
    focus: g.focus,
    focusLost: g.startFocus - g.focus,
    stars: g.stars,
    wavesReached: g.waveIndex,
    firstLeakWave: s.firstLeakWave,
    leaks: s.leaks,
    coffeeEnd: Math.floor(g.coffee),
    coffeeEarned: Math.floor(s.coffeeFromKills + s.coffeeFromSalary + s.coffeeFromMachines + s.coffeeFromBank),
    build: built,
    coffeeByWave,
    deepest: g.stats.firstLeakWave > 0 ? 1 : deepest,
  };
}
