// Talks to the small relay next to the game (server/relay). The browser never sees a Discord or
// Mattermost webhook: those live in .env on the server. The relay stores every round in SQLite
// so the balance can be read from real games.

import type { Game } from '../sim/game';
import { VERSION, COMMIT } from '../version';

export interface RoundSummary {
  version: string;
  commit: string;
  player: string;
  level: number;
  seed: number;
  result: 'won' | 'burnout' | 'gaveup';
  stars: number;
  focusStart: number;
  focusLeft: number;
  wavesReached: number;
  totalWaves: number;
  simSeconds: number;
  realSeconds: number;
  score: number;
  coffee: { kills: number; salary: number; machines: number; sales: number; spent: number; end: number };
  kills: Record<string, number>;
  leaks: Record<string, number>;
  leakFocus: Record<string, number>;
  built: Record<string, number>;
  upgrades: number;
  sidePaths: Record<string, number>;
  sold: number;
  earlyCalls: number;
  firstLeakWave: number;
  peakOnFloor: number;
  towers: { type: string; level: number; side: string | null; step: number; damage: number; kills: number; invested: number }[];
  speedUse: Record<string, number>;
}

export function summarize(game: Game, player: string, realSeconds: number, speedUse: Record<string, number>): RoundSummary {
  const s = game.stats;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    version: VERSION,
    commit: COMMIT,
    player,
    level: game.level.id,
    seed: game.seed,
    result: game.endReason ?? 'gaveup',
    stars: game.stars,
    focusStart: game.startFocus,
    focusLeft: game.focus,
    wavesReached: game.waveIndex,
    totalWaves: game.totalWaves,
    simSeconds: Math.round(game.time),
    realSeconds: Math.round(realSeconds),
    score: game.score,
    coffee: {
      kills: r2(s.coffeeFromKills),
      salary: s.coffeeFromSalary,
      machines: s.coffeeFromMachines,
      sales: s.coffeeFromSales,
      spent: s.coffeeSpent,
      end: r2(game.coffee),
    },
    kills: s.kills,
    leaks: s.leaks,
    leakFocus: s.leakFocus,
    built: s.built,
    upgrades: s.upgrades,
    sidePaths: s.sidePaths,
    sold: s.sold,
    earlyCalls: s.earlyCalls,
    firstLeakWave: s.firstLeakWave,
    peakOnFloor: s.peakOnFloor,
    towers: game.towers.map((t) => ({
      type: t.defId,
      level: t.level,
      side: t.side,
      step: t.sideStep,
      damage: Math.round(t.stats.damage),
      kills: t.stats.kills,
      invested: t.invested,
    })),
    speedUse,
  };
}

async function post(path: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function sendRound(summary: RoundSummary): Promise<boolean> {
  return post('api/round', summary);
}

export function sendFeedback(summary: RoundSummary, fun: number, comment: string, name: string): Promise<boolean> {
  return post('api/feedback', { round: summary, fun, comment: comment.slice(0, 1500), name: name.slice(0, 40) });
}
