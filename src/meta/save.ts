// Progress and settings, kept in this browser only (localStorage). Every access is wrapped:
// private windows and blocked storage must never break the game, they just forget.

import { RECOGNITION_FLAWLESS, recognitionForStars } from '../sim/economy';

export interface Settings {
  volume: number;
  sfx: number;
  damageNumbers: boolean;
  shareStats: boolean;
}

export interface SaveData {
  v: 1;
  playerId: string;
  stars: Record<string, number>;
  flawless: Record<string, boolean>;
  recognition: number;
  seenColleagues: string[];
  hintsDone: string[];
  lastSeenVersion: string;
  settings: Settings;
}

const KEY = 'ctrl-alt-defend.save.v1';

function randomId(): string {
  const bytes = new Uint8Array(8);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function defaults(): SaveData {
  return {
    v: 1,
    playerId: randomId(),
    stars: {},
    flawless: {},
    recognition: 0,
    seenColleagues: [],
    hintsDone: [],
    lastSeenVersion: '',
    settings: { volume: 0.8, sfx: 0.8, damageNumbers: true, shareStats: true },
  };
}

export function load(): SaveData {
  const base = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const d = JSON.parse(raw) as Partial<SaveData>;
    if (d.v !== 1) return base;
    return {
      ...base,
      ...d,
      settings: { ...base.settings, ...(d.settings ?? {}) },
      playerId: typeof d.playerId === 'string' && /^[0-9a-f]{16}$/.test(d.playerId) ? d.playerId : base.playerId,
    };
  } catch {
    return base;
  }
}

export function store(s: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage blocked or full: the game keeps working, it just will not remember.
  }
}

export interface LevelResult {
  starsBefore: number;
  starsNow: number;
  recognition: number;
  flawlessBonus: number;
}

/** Record a finished level. Pays only the difference with what this level paid before. */
export function completeLevel(s: SaveData, levelId: number, stars: number, flawless: boolean): LevelResult {
  const key = String(levelId);
  const before = s.stars[key] ?? 0;
  const best = Math.max(before, stars);
  const pay = Math.max(0, recognitionForStars(best) - recognitionForStars(before));
  let bonus = 0;
  if (flawless && !s.flawless[key]) {
    bonus = RECOGNITION_FLAWLESS;
    s.flawless[key] = true;
  }
  s.stars[key] = best;
  s.recognition += pay + bonus;
  store(s);
  return { starsBefore: before, starsNow: best, recognition: pay, flawlessBonus: bonus };
}
