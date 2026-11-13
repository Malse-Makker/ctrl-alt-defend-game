// Progress and settings, kept in this browser only (localStorage). Every access is wrapped:
// private windows and blocked storage must never break the game, they just forget.

import { RECOGNITION_FLAWLESS, recognitionForStars } from '../sim/economy';

export interface Settings {
  volume: number;
  sfx: number;
  damageNumbers: boolean;
  shareStats: boolean;
  /** The typing in the background. */
  ambience: number;
  /** Cards and hints that explain things. Off for players who know the floor. */
  tips: boolean;
  /** Icons over colleagues who shrug something off. */
  labels: boolean;
}

export interface SaveData {
  v: 1;
  playerId: string;
  stars: Record<string, number>;
  flawless: Record<string, boolean>;
  recognition: number;
  /** Recognition shop: perks owned for good, and Smoke Breaks in your pocket. */
  perks: string[];
  smokes: number;
  seenColleagues: string[];
  /** Colleagues whose card already stopped the game once. Reset tips empties it. */
  tipsSeen: string[];
  /** Floors whose briefing the player asked not to see again. */
  briefingsHidden: number[];
  hintsDone: string[];
  lastSeenVersion: string;
  /** Name used in multiplayer lobbies. */
  mpName: string;
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
    perks: [],
    smokes: 0,
    seenColleagues: [],
    tipsSeen: [],
    briefingsHidden: [],
    hintsDone: [],
    lastSeenVersion: '',
    mpName: '',
    settings: { volume: 0.8, sfx: 0.8, damageNumbers: true, shareStats: true, ambience: 0.5, tips: true, labels: true },
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
      // Saves from before tips: whoever already met a colleague has had his card.
      tipsSeen: Array.isArray(d.tipsSeen) ? d.tipsSeen : Array.isArray(d.seenColleagues) ? [...d.seenColleagues] : [],
      briefingsHidden: Array.isArray(d.briefingsHidden) ? d.briefingsHidden.filter((n): n is number => typeof n === 'number') : [],
      perks: Array.isArray(d.perks) ? d.perks.filter((p): p is string => typeof p === 'string') : [],
      smokes: typeof d.smokes === 'number' && d.smokes >= 0 ? Math.floor(d.smokes) : 0,
      playerId: typeof d.playerId === 'string' && /^[0-9a-f]{16}$/.test(d.playerId) ? d.playerId : base.playerId,
    };
  } catch {
    return base;
  }
}

/** Show every explanation again, as for a new player. Progress stays. */
export function resetTips(s: SaveData): void {
  s.tipsSeen = [];
  s.briefingsHidden = [];
  s.hintsDone = [];
  s.settings.tips = true;
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
  /** The first time you finish level 5, 10 or 15: your new job title. */
  promoted: string | null;
}

/** Promotions: finish the last floor of a block for the first time. */
export const PROMOTIONS: Record<number, string> = { 5: 'Medior', 10: 'Senior', 15: 'Specialist' };

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
  const promoted = before === 0 && best > 0 ? (PROMOTIONS[levelId] ?? null) : null;
  return { starsBefore: before, starsNow: best, recognition: pay, flawlessBonus: bonus, promoted };
}
