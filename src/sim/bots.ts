// Balance bots: simple players that run the real simulation. Used by tools/balance.ts for the
// report, by tests/balance.test.ts to guard the difficulty, and by the main menu as a live demo.
// Measure, do not guess.

import type { LevelDef } from './data/levels';
import { TOWERS } from './data/towers';
import { Game, type Tower } from './game';

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
  /** Furthest any colleague got along the route, 0..1 (1 = reached your desk). The safety margin. */
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
export function rankSpots(g: Game, range: number): Spot[] {
  const spots: Spot[] = [];
  for (let ty = 0; ty < g.level.size.h; ty++) {
    for (let tx = 0; tx < g.level.size.w; tx++) {
      if (g.isPathTile(tx, ty) || g.isBlockedTile(tx, ty)) continue;
      const c = { x: tx + 0.5, y: ty + 0.5 };
      const cover = g.paths.reduce((s, p) => s + p.coverage(c, range, 0.25), 0);
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

/**
 * A sensible player: two Auto-Replies on the best spots, one Coffee Machine early, then the
 * cheapest planned upgrade first, a new tower once every tower is well on its way, and half the
 * towers on Most HP when the boss shows up (the boss banner says so).
 */
export const solidBot: Bot = {
  name: 'solid',
  plan(g) {
    const spots = rankSpots(g, RANGE);
    for (let i = 0; i < 2; i++) {
      const s = freeSpot(g, spots, 'autoreply');
      if (s) g.place('autoreply', s.tx, s.ty);
    }
  },
  act(g) {
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
  },
};

/**
 * Goes heavy on Coffee first: one machine brewing, a second one on the Expense Claim, claimed when
 * the pot is nearly full. A valid alternative should also be able to win.
 */
export const greedyBot: Bot = {
  name: 'greedy',
  plan(g) {
    const s = freeSpot(g, rankSpots(g, RANGE), 'autoreply');
    if (s) g.place('autoreply', s.tx, s.ty);
    const e = economySpot(g);
    if (e) g.place('coffee', e.tx, e.ty);
  },
  act(g) {
    const machines = g.towers.filter((t) => t.defId === 'coffee');
    for (const m of machines) {
      const bank = g.liveStats(m).bank;
      if (bank && (m.pot >= bank.cap * 0.9 || g.waveIndex >= g.totalWaves - 1)) g.claim(m.id);
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
    for (const e of gg.enemies) deepest = Math.max(deepest, e.dist / gg.paths[e.pathIndex].length);
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
