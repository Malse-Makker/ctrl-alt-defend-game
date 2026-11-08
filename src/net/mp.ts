// The browser side of multiplayer: one WebSocket to /mp, messages in and out, and getting back
// into the same seat after a wifi hiccup (the seat token lives in sessionStorage, per tab).

import type { Command } from '../sim/commands';
import type { GameEvent, Snapshot } from '../sim/game';
import type { ZoneMode } from '../sim/zones';

export interface RoomSettings {
  level: number;
  maxPlayers: number;
  shared: boolean;
  ownTowers: boolean;
  zoneMode: ZoneMode;
  assign: number[];
}

export interface RoomInfo {
  code: string;
  host: number;
  phase: 'lobby' | 'game';
  settings: RoomSettings;
  players: { index: number; name: string; connected: boolean; color: string }[];
  speed: number;
  paused: boolean;
  gamePlayers: number;
}

export type ServerMsg =
  | { t: 'joined'; code: string; you: number; token: string; room: RoomInfo }
  | { t: 'room'; room: RoomInfo; you: number }
  | { t: 'update'; s: Snapshot; e: GameEvent[]; speed: number; paused: boolean }
  | { t: 'refused'; reason: string }
  | { t: 'error'; reason: string }
  | { t: 'pong' };

const SEAT_KEY = 'ctrl-alt-defend.seat';

function socketUrl(): string {
  const u = new URL('mp', document.baseURI);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return u.toString();
}

export class MpClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<(m: ServerMsg) => void>();
  private closedByUs = false;
  private retry = 0;
  private ping: number | undefined;
  code = '';
  token = '';
  you = -1;
  room: RoomInfo | null = null;
  onStatus: (s: 'connecting' | 'open' | 'lost') => void = () => {};

  on(fn: (m: ServerMsg) => void): () => void {
    this.handlers.add(fn);
    return () => this.handlers.delete(fn);
  }

  /** Open the socket; resolves once connected. */
  connect(): Promise<void> {
    this.closedByUs = false;
    return new Promise((resolve, reject) => {
      this.onStatus('connecting');
      let ws: WebSocket;
      try {
        ws = new WebSocket(socketUrl());
      } catch (e) {
        reject(e);
        return;
      }
      this.ws = ws;
      ws.onopen = () => {
        this.retry = 0;
        this.onStatus('open');
        window.clearInterval(this.ping);
        this.ping = window.setInterval(() => this.send({ t: 'ping' }), 20_000);
        resolve();
      };
      ws.onerror = () => reject(new Error('Could not reach the multiplayer server.'));
      ws.onmessage = (ev) => {
        let m: ServerMsg;
        try {
          m = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (m.t === 'joined') {
          this.code = m.code;
          this.token = m.token;
          this.you = m.you;
          this.room = m.room;
          try {
            sessionStorage.setItem(SEAT_KEY, JSON.stringify({ code: m.code, token: m.token }));
          } catch {
            // No storage: rejoining after a reload will not work, playing still does.
          }
        } else if (m.t === 'room') {
          this.room = m.room;
          this.you = m.you;
        }
        for (const h of this.handlers) h(m);
      };
      ws.onclose = () => {
        window.clearInterval(this.ping);
        if (this.closedByUs) return;
        this.onStatus('lost');
        // Try to get back into the same seat: 1, 2, 4, 8 seconds, then every 10.
        const wait = Math.min(10_000, 1000 * 2 ** this.retry++);
        window.setTimeout(() => {
          if (this.closedByUs) return;
          this.connect()
            .then(() => {
              if (this.code && this.token) this.send({ t: 'rejoin', code: this.code, token: this.token });
            })
            .catch(() => {});
        }, wait);
      };
    });
  }

  send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  create(name: string, settings: Partial<RoomSettings>): void {
    this.send({ t: 'create', name, settings });
  }

  join(code: string, name: string): void {
    this.send({ t: 'join', code, name });
  }

  /** After a page reload in the same tab: try the seat we had. */
  rejoinSaved(): boolean {
    try {
      const raw = sessionStorage.getItem(SEAT_KEY);
      if (!raw) return false;
      const { code, token } = JSON.parse(raw) as { code: string; token: string };
      if (typeof code !== 'string' || typeof token !== 'string') return false;
      this.code = code;
      this.token = token;
      this.send({ t: 'rejoin', code, token });
      return true;
    } catch {
      return false;
    }
  }

  settings(patch: Partial<RoomSettings>): void {
    this.send({ t: 'settings', settings: patch });
  }

  command(c: Command): void {
    this.send({ t: 'cmd', c });
  }

  close(): void {
    this.closedByUs = true;
    window.clearInterval(this.ping);
    this.send({ t: 'leave' });
    try {
      sessionStorage.removeItem(SEAT_KEY);
    } catch {
      // nothing to forget
    }
    this.ws?.close();
    this.ws = null;
    this.room = null;
    this.code = '';
    this.token = '';
    this.you = -1;
  }

  get isHost(): boolean {
    return this.room !== null && this.room.host === this.you;
  }
}
