// The multiplayer server: WebSockets on /mp, rooms with join codes, and the game loop. The
// simulation is the same code the browser runs in single player (src/sim), so the rules can never
// differ between the two.
//
// Protocol: JSON messages with a "t" field.
//   client -> server: create, join, rejoin, settings, start, cmd, speed, pause, giveup, lobby, leave, ping
//   server -> client: joined, room, update (snapshot + events), refused, error, pong

import { createServer, type IncomingMessage, type Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { parseCommand } from '../../src/sim/commands';
import { Room, randomCode } from './rooms';

export interface MpOptions {
  port: number;
  /** Origins allowed to open a socket (stops other sites from using a visitor's browser). Empty = any. */
  allowedOrigins: string[];
  maxRooms?: number;
  /** Snapshots per second. */
  rate?: number;
}

interface Conn {
  ws: WebSocket;
  room: Room | null;
  /** The seat token: survives index changes when someone leaves the lobby, and allows rejoining. */
  token: string;
  tokens: number;
  lastRefill: number;
  alive: boolean;
}

const MAX_MESSAGE = 8 * 1024;

export function startMpServer(opts: MpOptions): { server: Server; rooms: Map<string, Room>; close(): Promise<void> } {
  const rooms = new Map<string, Room>();
  const conns = new Set<Conn>();
  const maxRooms = opts.maxRooms ?? 100;
  const rate = opts.rate ?? 10;

  const server = createServer((req, res) => {
    if (req.url === '/mp/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, rooms: rooms.size, players: conns.size }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE });

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const origin = req.headers.origin ?? '';
    if (!req.url?.startsWith('/mp') || (opts.allowedOrigins.length > 0 && !opts.allowedOrigins.includes(origin))) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  const send = (c: Conn, msg: unknown) => {
    if (c.ws.readyState === c.ws.OPEN) c.ws.send(JSON.stringify(msg));
  };

  /** A connection's seat number, looked up by token (indexes shift when someone leaves the lobby). */
  const indexOf = (c: Conn): number => c.room?.players.find((p) => p.token === c.token)?.index ?? -1;

  const broadcastRoom = (room: Room) => {
    const info = room.info();
    for (const c of conns) if (c.room === room) send(c, { t: 'room', room: info, you: indexOf(c) });
  };

  const attach = (c: Conn, room: Room, token: string) => {
    c.room = room;
    c.token = token;
    send(c, { t: 'joined', code: room.code, you: indexOf(c), token, room: room.info() });
    broadcastRoom(room);
  };

  const detach = (c: Conn) => {
    const room = c.room;
    if (!room) return;
    const index = indexOf(c);
    c.room = null;
    if (index >= 0) room.disconnect(index);
    broadcastRoom(room);
  };

  wss.on('connection', (ws: WebSocket) => {
    const c: Conn = { ws, room: null, token: '', tokens: 60, lastRefill: Date.now(), alive: true };
    conns.add(c);
    ws.on('pong', () => (c.alive = true));
    ws.on('message', (data, isBinary) => {
      // Token bucket: 30 messages a second, bursts up to 60. Anything beyond is dropped.
      const now = Date.now();
      c.tokens = Math.min(60, c.tokens + ((now - c.lastRefill) / 1000) * 30);
      c.lastRefill = now;
      if (c.tokens < 1 || isBinary) return;
      c.tokens -= 1;
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;
      const refuse = (reason: string) => send(c, { t: 'refused', reason });
      const fail = (reason: string) => send(c, { t: 'error', reason });

      // Messages that do not need a room yet.
      switch (msg.t) {
        case 'ping':
          send(c, { t: 'pong' });
          return;
        case 'create': {
          if (c.room) return refuse('You are already in a game.');
          if (rooms.size >= maxRooms) return fail('The office is full right now. Try again later.');
          let code = randomCode();
          while (rooms.has(code)) code = randomCode();
          const r = new Room(code);
          const joined = r.join(msg.name);
          if ('error' in joined) return fail(joined.error);
          rooms.set(code, r);
          if (msg.settings && typeof msg.settings === 'object') {
            const e = r.updateSettings(0, msg.settings);
            if (e) refuse(e);
          }
          attach(c, r, joined.slot.token);
          return;
        }
        case 'join': {
          if (c.room) return refuse('You are already in a game.');
          const code = typeof msg.code === 'string' ? msg.code.toUpperCase().trim() : '';
          const r = rooms.get(code);
          if (!r) return fail('No game with that code. Check it with the host.');
          const joined = r.join(msg.name);
          if ('error' in joined) return fail(joined.error);
          attach(c, r, joined.slot.token);
          return;
        }
        case 'rejoin': {
          if (c.room) return;
          const code = typeof msg.code === 'string' ? msg.code.toUpperCase().trim() : '';
          const r = rooms.get(code);
          const slot = r?.rejoin(msg.token);
          if (!r || !slot) return fail('Could not get back into that game.');
          // An older socket still holding this seat (a stale tab) lets go of it.
          for (const other of conns) if (other !== c && other.room === r && other.token === slot.token) other.room = null;
          attach(c, r, slot.token);
          return;
        }
      }

      const room = c.room;
      if (!room) return refuse('Join a game first.');
      const me = indexOf(c);
      let err: string | null = null;
      switch (msg.t) {
        case 'settings':
          err = room.updateSettings(me, msg.settings);
          break;
        case 'start':
          err = room.start(me);
          break;
        case 'speed':
          err = room.setSpeed(me, msg.speed);
          break;
        case 'pause':
          err = room.setPaused(me, msg.paused);
          break;
        case 'giveup':
          err = room.giveUp(me);
          break;
        case 'lobby':
          err = room.backToLobby(me);
          break;
        case 'leave':
          detach(c);
          return;
        case 'cmd': {
          const cmd = parseCommand(msg.c);
          if (!cmd) return refuse('That did not make sense to the server.');
          const r = room.command(me, cmd);
          if (!r.ok) refuse(r.reason ?? 'Not possible.');
          return;
        }
        default:
          return;
      }
      if (err) refuse(err);
      else broadcastRoom(room);
    });
    ws.on('close', () => {
      detach(c);
      conns.delete(c);
    });
    ws.on('error', () => ws.close());
  });

  // The game loop: step every running room, send updates `rate` times a second.
  let last = Date.now();
  let sinceSend = 0;
  const loop = setInterval(() => {
    const now = Date.now();
    const dt = (now - last) / 1000;
    last = now;
    sinceSend += dt;
    const sendNow = sinceSend >= 1 / rate;
    if (sendNow) sinceSend = 0;
    for (const [code, room] of rooms) {
      room.tick(dt);
      if (sendNow && room.phase === 'game') {
        const update = room.takeUpdate();
        if (update) {
          const payload = JSON.stringify({ t: 'update', s: update.s, e: update.e, speed: room.speed, paused: room.paused });
          for (const c of conns) if (c.room === room && c.ws.readyState === c.ws.OPEN) c.ws.send(payload);
        }
      }
      // Clean up: nobody connected for 2 minutes, or a lobby untouched for 30.
      const idle = now - room.lastActivity;
      if ((room.connectedCount === 0 && idle > 120_000) || (room.phase === 'lobby' && idle > 1_800_000)) {
        rooms.delete(code);
        for (const c of conns) if (c.room === room) c.room = null;
      }
    }
  }, 1000 / 60);

  // Drop sockets that stop answering pings.
  const heartbeat = setInterval(() => {
    for (const c of conns) {
      if (!c.alive) {
        c.ws.terminate();
        continue;
      }
      c.alive = false;
      c.ws.ping();
    }
  }, 30_000);

  server.listen(opts.port);
  return {
    server,
    rooms,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(loop);
        clearInterval(heartbeat);
        for (const c of conns) c.ws.terminate();
        wss.close();
        server.close(() => resolve());
      }),
  };
}
