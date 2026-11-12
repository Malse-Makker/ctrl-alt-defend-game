import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { Room, cleanName } from '../server/mp/rooms';
import { startMpServer } from '../server/mp/server';

describe('rooms', () => {
  it('fills up to the maximum, with unique and clean names', () => {
    const r = new Room('ABCDE', { maxPlayers: 3 });
    expect('slot' in r.join('Sam')).toBe(true);
    const second = r.join('Sam');
    expect('slot' in second && second.slot.name).toBe('Sam 2');
    expect('slot' in r.join('<b>\u0001x</b>')).toBe(true);
    expect(r.join('Late')).toEqual({ error: 'That game is full.' });
    expect(cleanName('   ')).toBe('Colleague');
    expect(cleanName('a'.repeat(50)).length).toBe(20);
  });

  it('defaults to everyone their own wallet with split income, and their own towers', () => {
    const r = new Room('ABCDE');
    expect(r.settings.shared).toBe(false);
    expect(r.settings.ownTowers).toBe(true);
    r.join('Host');
    expect(r.updateSettings(0, { ownTowers: 'yes' })).toMatch(/Bad tower setting/);
    expect(r.updateSettings(0, { ownTowers: false })).toBeNull();
    expect(r.settings.ownTowers).toBe(false);
  });

  it('only the host changes settings, and the checks hold', () => {
    const r = new Room('ABCDE');
    r.join('Host');
    r.join('Guest');
    expect(r.updateSettings(1, { shared: false })).toMatch(/Only the host/);
    expect(r.updateSettings(0, { maxPlayers: 1 })).toMatch(/more people/);
    expect(r.updateSettings(0, { maxPlayers: 9 })).toMatch(/1 to 8/);
    expect(r.updateSettings(0, { level: 99 })).toMatch(/does not exist/);
    expect(r.updateSettings(0, { zoneMode: 'topbottom' })).toBeNull();
    expect(r.settings.assign).toEqual([0, 1]);
    expect(r.updateSettings(0, { assign: [1, 1] })).toBeNull();
    expect(r.updateSettings(0, { assign: [2, 0] })).toMatch(/Bad zone/);
  });

  it('leaving the lobby frees the seat and renumbers; leaving a game keeps it and passes the host on', () => {
    const r = new Room('ABCDE');
    r.join('A');
    r.join('B');
    r.join('C');
    r.leave(0);
    expect(r.players.map((p) => [p.index, p.name])).toEqual([
      [0, 'B'],
      [1, 'C'],
    ]);
    expect(r.host).toBe(0);
    expect(r.start(0)).toBeNull();
    r.disconnect(0);
    expect(r.players.length).toBe(2);
    expect(r.host).toBe(1);
    const back = r.rejoin(r.players[0].token);
    expect(back?.connected).toBe(true);
  });

  it('starts a game with the lobby settings and keeps the host in charge of waves', () => {
    const r = new Room('ABCDE');
    r.join('A');
    r.join('B');
    r.updateSettings(0, { shared: false, zoneMode: 'leftright' });
    r.start(0);
    const g = r.game!;
    expect(g.players).toBe(2);
    expect(g.sharedWallet).toBe(false);
    expect(g.zones).not.toBeNull();
    expect(r.command(1, { c: 'next' }).reason).toMatch(/Only the host/);
    expect(r.command(0, { c: 'next' }).ok).toBe(true);
    // One tick never jumps more than 0.25 s, so a hiccup on the server does not skip half a wave.
    r.tick(1);
    expect(g.time).toBeCloseTo(0.25, 1);
    for (let i = 0; i < 3; i++) r.tick(0.25);
    expect(g.time).toBeGreaterThan(0.95);
    const update = r.takeUpdate()!;
    expect(update.s.waveIndex).toBe(1);
    expect(update.e.some((e) => e.t === 'wave')).toBe(true);
  });
});

describe('the multiplayer server', () => {
  let srv: ReturnType<typeof startMpServer>;
  let url = '';

  beforeAll(async () => {
    srv = startMpServer({ port: 0, allowedOrigins: ['http://test.local'], rate: 20 });
    await new Promise<void>((r) => (srv.server.listening ? r() : srv.server.once('listening', () => r())));
    url = `ws://127.0.0.1:${(srv.server.address() as AddressInfo).port}/mp`;
  });

  afterAll(async () => {
    await srv.close();
  });

  function client(origin = 'http://test.local') {
    const ws = new WebSocket(url, { origin });
    const inbox: Record<string, unknown>[] = [];
    ws.on('message', (d) => inbox.push(JSON.parse(d.toString())));
    const until = async (pred: (m: Record<string, unknown>) => boolean, ms = 3000) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        const hit = inbox.find(pred);
        if (hit) return hit;
        await new Promise((r) => setTimeout(r, 15));
      }
      throw new Error('timed out waiting for a message');
    };
    const open = new Promise<void>((r, j) => {
      ws.once('open', () => r());
      ws.once('error', j);
    });
    return { ws, inbox, until, open, send: (m: unknown) => ws.send(JSON.stringify(m)) };
  }

  it('refuses sockets from other websites', async () => {
    const evil = client('https://evil.example');
    await expect(evil.open).rejects.toThrow();
  });

  it('lets two players create, join, start and build in a split-wallet game', async () => {
    const host = client();
    const guest = client();
    await Promise.all([host.open, guest.open]);
    host.send({ t: 'create', name: 'Host', settings: { shared: false, maxPlayers: 2 } });
    const joined = (await host.until((m) => m.t === 'joined')) as { code: string; you: number };
    expect(joined.you).toBe(0);
    guest.send({ t: 'join', code: joined.code.toLowerCase(), name: 'Guest' });
    const gj = (await guest.until((m) => m.t === 'joined')) as { you: number };
    expect(gj.you).toBe(1);

    guest.send({ t: 'start' });
    await guest.until((m) => m.t === 'refused');
    host.send({ t: 'start' });
    await host.until((m) => m.t === 'room' && (m.room as { phase: string }).phase === 'game');

    guest.send({ t: 'cmd', c: { c: 'place', def: 'autoreply', tx: 9, ty: 4 } });
    guest.send({ t: 'cmd', c: { c: 'place', def: 'autoreply', tx: 7.5, ty: 3 } });
    const update = (await host.until(
      (m) => m.t === 'update' && (m.s as { towers: unknown[] }).towers.length === 1,
    )) as { s: { towers: { owner: number }[]; wallets: number[] } };
    expect(update.s.towers[0].owner).toBe(1);
    expect(update.s.wallets).toEqual([40, 26]);
    await guest.until((m) => m.t === 'refused' && /make sense/.test(String(m.reason)));

    host.ws.close();
    guest.ws.close();
  });

  it('a game code that does not exist gets a clear answer', async () => {
    const c = client();
    await c.open;
    c.send({ t: 'join', code: 'ZZZZZ', name: 'X' });
    const e = await c.until((m) => m.t === 'error');
    expect(String(e.reason)).toMatch(/No game with that code/);
    c.ws.close();
  });
});
