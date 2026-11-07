// Balance bots: simple players that run the real simulation. Used by tools/balance.ts for the
// report and by tests/balance.test.ts to guard the difficulty. Measure, do not guess.

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

const RANGE = TOWERS.autoreply.levels[0].range!;

/** Places one Auto-Reply and then watches. Should lose. */
export const idleBot: Bot = {
  name: 'idle',
  plan(g) {
    const s = freeSpot(g, rankSpots(g, RANGE), 'autoreply');
    if (s) g.place('autoreply', s.tx, s.ty);
  },
  act() {},
};

/** Only ever buys more level 1 Auto-Replies. Tests that spamming loses to upgrading. */
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
 * A sensible player: two Auto-Replies on the best spots, one Coffee Machine early, then upgrades
 * before new copies, ESCALATION once a tower is maxed, a new tower when everything is level 2+.
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
    // Reads the boss banner: half the towers ignore his Interns.
    const boss = g.enemies.some((e) => e.def.boss);
    autos.forEach((t, i) => g.setTargeting(t.id, boss && i % 2 === 0 ? 'strongest' : 'first'));
    const cover = new Map<Tower, number>();
    for (const t of autos) cover.set(t, g.paths.reduce((s, p) => s + p.coverage(t, RANGE, 0.25), 0));
    const byCover = [...autos].sort((a, b) => cover.get(b)! - cover.get(a)!);

    if (machines.length === 0 && g.waveIndex >= 2 && g.waveIndex <= 6 && g.coffee >= 20) {
      const s = economySpot(g);
      if (s) g.place('coffee', s.tx, s.ty);
      return;
    }
    const lowest = byCover.find((t) => t.level < 3 && (t.level === Math.min(...autos.map((a) => a.level))));
    if (lowest && g.canUpgrade(lowest).ok) {
      g.upgrade(lowest.id);
      return;
    }
    const maxed = byCover.find((t) => t.level === 3 && t.sideStep < 2);
    if (maxed && g.canBuySide(maxed, 'escalation').ok) {
      g.buySide(maxed.id, 'escalation');
      return;
    }
    if (autos.every((t) => t.level >= 2)) {
      const s = freeSpot(g, rankSpots(g, RANGE), 'autoreply');
      if (s && g.canPlace('autoreply', s.tx, s.ty).ok) {
        g.place('autoreply', s.tx, s.ty);
        return;
      }
    }
    const m = machines.find((t) => t.level < 3);
    if (m && g.waveIndex <= 8 && g.canUpgrade(m).ok && autos.every((t) => t.level >= 2)) {
      g.upgrade(m.id);
    }
  },
};

/**
 * A first-time player: buys Auto-Replies until there are six, then takes them to level 2. Never
 * touches side paths, Coffee Machines or targeting. Should win, but not flawlessly.
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
    const t = autos.find((a) => a.level < 2);
    if (t) g.upgrade(t.id);
  },
};

/** Goes heavy on Coffee first. A valid alternative should also be able to win. */
export const greedyBot: Bot = {
  name: 'greedy',
  plan(g) {
    const spots = rankSpots(g, RANGE);
    const s = freeSpot(g, spots, 'autoreply');
    if (s) g.place('autoreply', s.tx, s.ty);
    const e = economySpot(g);
    if (e) g.place('coffee', e.tx, e.ty);
  },
  act(g) {
    const machines = g.towers.filter((t) => t.defId === 'coffee');
    if (g.waveIndex <= 4 && machines.length < 2 && g.coffee >= g.placeCostFor('coffee')) {
      const e = economySpot(g);
      if (e) g.place('coffee', e.tx, e.ty);
      return;
    }
    const m = machines.find((t) => t.level < 3);
    if (m && g.waveIndex <= 5 && g.canUpgrade(m).ok) {
      g.upgrade(m.id);
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
    .map((t) => `${t.defId}${t.level}${t.side ? (t.side === 'overtime' ? 'O' : 'E') + t.sideStep : ''}`)
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
    coffeeEarned: Math.floor(s.coffeeFromKills + s.coffeeFromSalary + s.coffeeFromMachines),
    build: built,
    coffeeByWave,
    deepest: g.stats.firstLeakWave > 0 ? 1 : deepest,
  };
}
