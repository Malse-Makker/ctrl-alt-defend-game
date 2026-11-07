// Multiplayer rooms: a join code, up to 8 players, the host's settings, and the one Game that the
// server runs for everyone. Pure logic without sockets, so it can be tested directly.

import { randomBytes } from 'node:crypto';
import { applyCommand, type Command } from '../../src/sim/commands';
import { LEVELS } from '../../src/sim/data/levels';
import { Game, TICK, type Check, type GameEvent, type Snapshot } from '../../src/sim/game';
import { ZONE_MODES, defaultAssignment, zoneCount, zoneMap, type ZoneMode } from '../../src/sim/zones';

export const MAX_PLAYERS = 8;
export const SPEEDS = [1, 2, 4, 8];
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const PLAYER_COLORS = ['#3e7cc9', '#e5534b', '#6fcf7f', '#f2c641', '#b48ce0', '#e67e3a', '#3fa7a0', '#e2557a'];

export interface RoomSettings {
  level: number;
  maxPlayers: number;
  shared: boolean;
  zoneMode: ZoneMode;
  /** Zone per player index. */
  assign: number[];
}

export interface PlayerSlot {
  index: number;
  name: string;
  token: string;
  connected: boolean;
  lastSeen: number;
}

export type RoomPhase = 'lobby' | 'game';

export interface RoomInfo {
  code: string;
  host: number;
  phase: RoomPhase;
  settings: RoomSettings;
  players: { index: number; name: string; connected: boolean; color: string }[];
  speed: number;
  paused: boolean;
  /** Number of players the running game was started with. */
  gamePlayers: number;
}

export function randomCode(): string {
  const bytes = randomBytes(5);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** Names come from strangers: printable ASCII only, trimmed, never empty. */
export function cleanName(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.replace(/[^\x20-\x7e]/g, '').trim().slice(0, 20) : '';
  return s || 'Colleague';
}

export class Room {
  readonly code: string;
  host = 0;
  phase: RoomPhase = 'lobby';
  players: PlayerSlot[] = [];
  settings: RoomSettings;
  game: Game | null = null;
  speed = 1;
  paused = false;
  lastActivity = Date.now();
  private acc = 0;
  private pendingEvents: GameEvent[] = [];
  private gamePlayers = 0;

  constructor(code: string, settings: Partial<RoomSettings> = {}) {
    this.code = code;
    this.settings = {
      level: 1,
      maxPlayers: 4,
      shared: true,
      zoneMode: 'anywhere',
      assign: [],
      ...settings,
    };
  }

  get connectedCount(): number {
    return this.players.filter((p) => p.connected).length;
  }

  join(rawName: unknown, now = Date.now()): { slot: PlayerSlot } | { error: string } {
    if (this.phase !== 'lobby') return { error: 'That game has already started. Ask the host to go back to the lobby.' };
    if (this.players.length >= this.settings.maxPlayers) return { error: 'That game is full.' };
    const slot: PlayerSlot = {
      index: this.players.length,
      name: this.uniqueName(cleanName(rawName)),
      token: randomBytes(16).toString('hex'),
      connected: true,
      lastSeen: now,
    };
    this.players.push(slot);
    this.fixAssignment();
    this.lastActivity = now;
    return { slot };
  }

  private uniqueName(name: string): string {
    let n = name;
    let i = 2;
    while (this.players.some((p) => p.name === n)) n = `${name.slice(0, 17)} ${i++}`;
    return n;
  }

  rejoin(token: unknown, now = Date.now()): PlayerSlot | null {
    if (typeof token !== 'string') return null;
    const slot = this.players.find((p) => p.token === token);
    if (!slot) return null;
    slot.connected = true;
    slot.lastSeen = now;
    this.lastActivity = now;
    return slot;
  }

  disconnect(index: number, now = Date.now()): void {
    const slot = this.players[index];
    if (!slot) return;
    slot.connected = false;
    slot.lastSeen = now;
    // The two-minute clean-up clock starts when people leave, not at the last click.
    this.lastActivity = now;
    if (this.phase === 'lobby') this.removeFromLobby(index);
    this.passHostIfGone();
  }

  /** Leaving the lobby frees the seat; leaving a running game keeps the towers (and the seat). */
  leave(index: number, now = Date.now()): void {
    this.disconnect(index, now);
  }

  private removeFromLobby(index: number): void {
    this.players.splice(index, 1);
    this.players.forEach((p, i) => (p.index = i));
    if (this.host === index) this.host = 0;
    else if (this.host > index) this.host--;
    this.settings.assign.splice(index, 1);
    this.fixAssignment();
  }

  private passHostIfGone(): void {
    if (this.players[this.host]?.connected) return;
    const next = this.players.find((p) => p.connected);
    if (next) this.host = next.index;
  }

  private fixAssignment(): void {
    const n = zoneCount(this.settings.zoneMode, this.players.length);
    const def = defaultAssignment(this.settings.zoneMode, this.players.length);
    this.settings.assign = this.players.map((_, i) => {
      if (this.settings.zoneMode === 'own') return i;
      const a = this.settings.assign[i];
      return Number.isInteger(a) && a >= 0 && a < n ? a : def[i];
    });
  }

  updateSettings(by: number, patch: unknown): string | null {
    if (by !== this.host) return 'Only the host can change the settings.';
    if (this.phase !== 'lobby') return 'The game is already running.';
    if (!patch || typeof patch !== 'object') return 'Bad settings.';
    const p = patch as Record<string, unknown>;
    if ('level' in p) {
      if (typeof p.level !== 'number' || !LEVELS[p.level]) return 'That level does not exist yet.';
      this.settings.level = p.level;
    }
    if ('maxPlayers' in p) {
      const m = p.maxPlayers;
      if (typeof m !== 'number' || !Number.isInteger(m) || m < 1 || m > MAX_PLAYERS) return 'Players must be 1 to 8.';
      if (m < this.players.length) return 'There are already more people in the lobby.';
      this.settings.maxPlayers = m;
    }
    if ('shared' in p) {
      if (typeof p.shared !== 'boolean') return 'Bad money setting.';
      this.settings.shared = p.shared;
    }
    if ('zoneMode' in p) {
      if (!ZONE_MODES.includes(p.zoneMode as ZoneMode)) return 'Unknown build area layout.';
      this.settings.zoneMode = p.zoneMode as ZoneMode;
      this.settings.assign = [];
    }
    if ('assign' in p) {
      const a = p.assign;
      const n = zoneCount(this.settings.zoneMode, this.players.length);
      if (!Array.isArray(a) || a.length !== this.players.length || !a.every((x) => Number.isInteger(x) && x >= 0 && x < n)) return 'Bad zone assignment.';
      this.settings.assign = [...a];
    }
    this.fixAssignment();
    this.lastActivity = Date.now();
    return null;
  }

  start(by: number, seed = Math.floor(Math.random() * 1e9)): string | null {
    if (by !== this.host) return 'Only the host can start the day.';
    if (this.phase !== 'lobby') return 'Already running.';
    const level = LEVELS[this.settings.level];
    if (!level) return 'That level does not exist yet.';
    const n = this.players.length;
    this.gamePlayers = n;
    const g = new Game(level, { seed, players: n, sharedWallet: this.settings.shared || n === 1 });
    g.setZones(zoneMap(level.size.w, level.size.h, this.settings.zoneMode, n), this.settings.zoneMode === 'anywhere' ? [] : this.settings.assign);
    this.game = g;
    this.phase = 'game';
    this.speed = 1;
    this.paused = false;
    this.acc = 0;
    this.pendingEvents = [];
    this.lastActivity = Date.now();
    return null;
  }

  backToLobby(by: number): string | null {
    if (by !== this.host) return 'Only the host can do that.';
    this.phase = 'lobby';
    this.game = null;
    // Players who left during the game lose their seat now.
    for (let i = this.players.length - 1; i >= 0; i--) if (!this.players[i].connected) this.removeFromLobby(i);
    this.passHostIfGone();
    return null;
  }

  command(by: number, cmd: Command): Check {
    if (!this.game || this.phase !== 'game') return { ok: false, reason: 'The game is not running.' };
    if (by >= this.gamePlayers) return { ok: false, reason: 'You joined after the start.' };
    if (cmd.c === 'next' && by !== this.host) return { ok: false, reason: 'Only the host calls the next wave.' };
    this.lastActivity = Date.now();
    return applyCommand(this.game, by, cmd);
  }

  setSpeed(by: number, speed: unknown): string | null {
    if (by !== this.host) return 'Only the host sets the speed.';
    if (typeof speed !== 'number' || !SPEEDS.includes(speed)) return 'Unknown speed.';
    this.speed = speed;
    return null;
  }

  setPaused(by: number, paused: unknown): string | null {
    if (by !== this.host) return 'Only the host can pause.';
    this.paused = paused === true;
    return null;
  }

  giveUp(by: number): string | null {
    if (by !== this.host) return 'Only the host can give up for everyone.';
    this.game?.giveUp();
    return null;
  }

  /** Advance the game by real seconds (times the speed). Events pile up until taken. */
  tick(realDt: number): void {
    const g = this.game;
    if (!g || this.phase !== 'game' || this.paused || g.over) {
      if (g) this.pendingEvents.push(...g.drainEvents());
      return;
    }
    if (g.phase === 'plan') return;
    this.acc += Math.min(realDt, 0.25) * this.speed;
    let n = 0;
    while (this.acc >= TICK && n < 120) {
      g.step(TICK);
      this.acc -= TICK;
      n++;
    }
    this.pendingEvents.push(...g.drainEvents());
  }

  /** What goes out to every player: the state plus everything that happened since last time. */
  takeUpdate(): { s: Snapshot; e: GameEvent[] } | null {
    if (!this.game) return null;
    this.pendingEvents.push(...this.game.drainEvents());
    const e = this.pendingEvents;
    this.pendingEvents = [];
    return { s: this.game.toSnapshot(), e };
  }

  info(): RoomInfo {
    return {
      code: this.code,
      host: this.host,
      phase: this.phase,
      settings: { ...this.settings, assign: [...this.settings.assign] },
      players: this.players.map((p) => ({ index: p.index, name: p.name, connected: p.connected, color: PLAYER_COLORS[p.index % PLAYER_COLORS.length] })),
      speed: this.speed,
      paused: this.paused,
      gamePlayers: this.gamePlayers,
    };
  }
}
