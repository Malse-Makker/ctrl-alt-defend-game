// Visual check in a real browser: opens the game in headless Chrome (software WebGL), plays through
// the screens at several window sizes, saves screenshots and reports text that overlaps, sticks out
// of its box or falls off the screen. No unit test sees that; it went wrong three times in the
// Godot version.
//
//   npx tsx tools/uicheck.ts [--url http://127.0.0.1:5173/] [--out shots] [--sizes 1920x1080,1280x720]
//
// Needs a dev or preview server running, and Google Chrome (CHROME=/path/to/chrome to override).
// The multiplayer flow (--mp, --mp-only) opens two pages; the one behind gets no animation frames,
// so its waits poll on a timer instead.

import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer, { type Page } from 'puppeteer-core';

const args = process.argv.slice(2);
const arg = (name: string, def: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
const URL_ = arg('--url', 'http://127.0.0.1:5173/');
const OUT = arg('--out', 'shots');
const SIZES = arg('--sizes', '1920x1080,1366x768,1024x700').split(',').map((s) => s.split('x').map(Number) as [number, number]);
const CHROME = process.env.CHROME ?? execSync('command -v google-chrome-stable || command -v google-chrome || command -v chromium', { shell: '/bin/sh' }).toString().trim();

mkdirSync(OUT, { recursive: true });

// Runs before the page: tsx (esbuild) wraps functions in __name(), so functions sent to the page
// need it to exist. And a fresh save with round stats switched off and sound muted, so a check
// against the live site never ends up in the playtest data.
const SETUP = `window.__name = (f) => f;
try {
  localStorage.setItem('ctrl-alt-defend.save.v1', JSON.stringify({ v: 1, settings: { shareStats: false, volume: 0, sfx: 0, damageNumbers: true } }));
} catch (e) {}`;

interface Problem {
  kind: string;
  text: string;
  detail: string;
}

/** Runs inside the page. Looks only at the top layer (an open overlay or screen hides the HUD). */
function uiProblems(): Problem[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ui = document.getElementById('ui')!;
  const layers = ui.querySelectorAll('.overlay, .screen');
  const root = (layers.length ? layers[layers.length - 1] : ui) as HTMLElement;
  const clipRect = (el: Element): DOMRect | null => {
    let r = el.getBoundingClientRect();
    let x0 = r.left;
    let y0 = r.top;
    let x1 = r.right;
    let y1 = r.bottom;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const st = getComputedStyle(p);
      if (st.overflowX !== 'visible' || st.overflowY !== 'visible') {
        const pr = p.getBoundingClientRect();
        x0 = Math.max(x0, pr.left);
        y0 = Math.max(y0, pr.top);
        x1 = Math.min(x1, pr.right);
        y1 = Math.min(y1, pr.bottom);
      }
    }
    if (x1 - x0 < 1 || y1 - y0 < 1) return null;
    r = new DOMRect(x0, y0, x1 - x0, y1 - y0);
    return r;
  };
  const els = [...root.querySelectorAll<HTMLElement>('*')].filter((el) => {
    if (el.closest('.banner, .toasts, .popup, [hidden]')) return false;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) return false;
    return [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0);
  });
  const problems: Problem[] = [];
  const label = (el: HTMLElement) => (el.textContent ?? '').trim().slice(0, 40);
  const vis: { el: HTMLElement; r: DOMRect }[] = [];
  for (const el of els) {
    const full = el.getBoundingClientRect();
    if (full.width === 0 || full.height === 0) continue;
    const r = clipRect(el);
    if (!r) continue;
    vis.push({ el, r });
    if (r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1 || r.top < -1) {
      problems.push({ kind: 'offscreen', text: label(el), detail: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}` });
    }
    const st = getComputedStyle(el);
    if (st.display !== 'inline' && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && st.overflowX === 'visible') {
      problems.push({ kind: 'overflow', text: label(el), detail: `text ${el.scrollWidth}px in a ${el.clientWidth}px box` });
    }
    // Text cut off by its own box (ellipsis-free clipping).
    if (st.overflowX === 'hidden' && el.scrollWidth > el.clientWidth + 1) {
      problems.push({ kind: 'clipped', text: label(el), detail: `text ${el.scrollWidth}px in a ${el.clientWidth}px box` });
    }
  }
  for (let i = 0; i < vis.length; i++) {
    for (let j = i + 1; j < vis.length; j++) {
      const a = vis[i];
      const b = vis[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const hh = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > 2 && hh > 2) problems.push({ kind: 'overlap', text: `${label(a.el)} | ${label(b.el)}`, detail: `${Math.round(w)}x${Math.round(hh)}px` });
    }
  }
  return problems;
}

async function check(page: Page, name: string, size: string): Promise<number> {
  await new Promise((r) => setTimeout(r, 350));
  const file = join(OUT, `${size}-${name}.png`);
  await page.screenshot({ path: file as `${string}.png` });
  const problems = await page.evaluate(uiProblems);
  const status = problems.length ? `${problems.length} problem(s)` : 'ok';
  console.log(`  ${name.padEnd(14)} ${status.padEnd(14)} ${file}`);
  for (const p of problems.slice(0, 12)) console.log(`      ${p.kind}: "${p.text}" (${p.detail})`);
  return problems.length;
}

async function clickText(page: Page, text: string): Promise<void> {
  const ok = await page.evaluate((t) => {
    const el = [...document.querySelectorAll<HTMLButtonElement>('#ui button')].find((b) => (b.textContent ?? '').includes(t) && !b.disabled);
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!ok) throw new Error(`No button with text "${text}"`);
}

type Cad = {
  session: {
    game: {
      place(d: string, x: number, y: number): { ok: boolean };
      towers: { id: number; x: number; y: number }[];
      coffee: number;
      upgrade(id: number, path: number): unknown;
      claim(id: number): unknown;
      runFor(s: number): void;
      phase: string;
      giveUp(): void;
    };
    selected: number | null;
    speed: number;
  };
};

/** Two players: host opens a lobby, guest joins with the link, both build in their own half. */
async function mpFlow(browser: import('puppeteer-core').Browser, errors: string[]): Promise<number> {
  const size = '1600x900';
  console.log(`\n${size} (multiplayer: host and guest)`);
  let total = 0;
  const open = async () => {
    const p = await browser.newPage();
    p.on('pageerror', (e) => errors.push(`mp: ${String(e)}`));
    p.on('console', (m) => {
      if (m.type() === 'error' && !/502|Bad Gateway/.test(m.text())) errors.push(`mp: ${m.text()}`);
    });
    await p.setViewport({ width: 1600, height: 900 });
    await p.evaluateOnNewDocument(SETUP);
    return p;
  };
  const host = await open();
  await host.goto(URL_, { waitUntil: 'networkidle0' });
  await host.waitForFunction(() => document.querySelector('#ui .menu-buttons'), { timeout: 30000, polling: 250 });
  await clickText(host, 'Play together');
  await host.type('#mp-name', 'Hostess');
  await clickText(host, 'Host a game');
  await host.waitForFunction(() => document.querySelector('.big-code'), { timeout: 10000, polling: 250 });
  const code = await host.$eval('.big-code', (el) => el.textContent ?? '');
  // Split wallets, left and right halves.
  await host.evaluate(() => {
    const sels = [...document.querySelectorAll<HTMLSelectElement>('.lobby-settings select')];
    const set = (sel: HTMLSelectElement, v: string) => {
      sel.value = v;
      sel.dispatchEvent(new Event('change'));
    };
    set(sels[2], 'split');
  });
  await new Promise((r) => setTimeout(r, 300));
  await host.evaluate(() => {
    const sels = [...document.querySelectorAll<HTMLSelectElement>('.lobby-settings select')];
    sels[3].value = 'leftright';
    sels[3].dispatchEvent(new Event('change'));
  });
  const guest = await open();
  await guest.goto(`${URL_}?join=${code}`, { waitUntil: 'networkidle0' });
  await guest.waitForFunction(() => document.querySelector('#mp-name'), { timeout: 30000, polling: 250 });
  await guest.type('#mp-name', 'Guest');
  await clickText(guest, 'Join');
  await guest.waitForFunction(() => document.querySelectorAll('.lobby-player').length === 2, { timeout: 10000, polling: 250 });
  await host.waitForFunction(() => document.querySelectorAll('.lobby-player').length === 2, { timeout: 10000, polling: 250 });
  await host.bringToFront();
  total += await check(host, 'mp-lobby-host', size);
  await guest.bringToFront();
  total += await check(guest, 'mp-lobby-guest', size);
  await host.bringToFront();
  await clickText(host, 'Start the day');
  try {
    await Promise.all([host, guest].map((p) => p.waitForFunction(() => document.querySelector('.hud'), { timeout: 10000, polling: 250 })));
  } catch (e) {
    for (const [name, p] of [['host', host], ['guest', guest]] as const) {
      await p.screenshot({ path: join(OUT, `mp-stuck-${name}.png`) as `${string}.png` });
      console.log(`  ${name} sees: ${(await p.evaluate(() => document.getElementById('ui')?.innerText ?? '')).replace(/\s+/g, ' ').slice(0, 300)}`);
    }
    throw e;
  }
  await new Promise((r) => setTimeout(r, 500));
  type Remote = { cad: { session: { run(c: unknown): void } } };
  await host.evaluate(() => (window as unknown as Remote).cad.session.run({ c: 'place', def: 'autoreply', tx: 6, ty: 3 }));
  await guest.evaluate(() => (window as unknown as Remote).cad.session.run({ c: 'place', def: 'autoreply', tx: 13, ty: 6 }));
  await host.keyboard.press('Space');
  await new Promise((r) => setTimeout(r, 2500));
  const towers = await guest.evaluate(() => (window as unknown as { cad: { session: { game: { towers: { owner: number }[] } } } }).cad.session.game.towers.map((t) => t.owner));
  console.log(`  towers seen by the guest, by owner: ${JSON.stringify(towers)}`);
  if (towers.length !== 2) total += 1;
  await host.bringToFront();
  total += await check(host, 'mp-game-host', size);
  await guest.bringToFront();
  total += await check(guest, 'mp-game-guest', size);
  await host.close();
  await guest.close();
  return total;
}

/** Level 2: all the new towers, the first Chatterbox, The Repair Guy, and the new tower panels. */
async function level2Flow(browser: import('puppeteer-core').Browser, errors: string[]): Promise<number> {
  const size = '1600x900';
  console.log(`\n${size} (level 2)`);
  let total = 0;
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`l2: ${String(e)}`));
  await page.setViewport({ width: 1600, height: 900 });
  await page.evaluateOnNewDocument(SETUP.replace("v: 1, settings:", "v: 1, stars: { '1': 3 }, seenColleagues: [], settings:"));
  await page.goto(URL_, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#ui .menu-buttons'), { timeout: 30000 });
  await clickText(page, 'Clock in');
  total += await check(page, 'l2-career', size);
  await clickText(page, 'Coffee Corner');
  await page.waitForFunction(() => document.querySelector('.hud'));
  type G = {
    coffee: number;
    place(d: string, x: number, y: number): { ok: boolean; reason?: string; tower?: { id: number } };
    upgrade(id: number, p: number): { ok: boolean };
    start(): void;
    step(): void;
    phase: string;
    waveIndex: number;
    enemies: { type: string; def: { boss?: unknown } }[];
    events: { t: string }[];
    drainEvents(): { t: string }[];
    towers: { id: number; defId: string }[];
  };
  const placed = await page.evaluate(() => {
    const s = (window as unknown as { cad: { session: { game: G; selected: number | null } } }).cad.session;
    const g = s.game;
    g.coffee = 3000;
    const out: string[] = [];
    const tryPlace = (d: string, x: number, y: number) => {
      const r = g.place(d, x, y);
      out.push(`${d}@${x},${y}:${r.ok ? 'ok' : r.reason}`);
      return r.tower;
    };
    tryPlace('autoreply', 7, 5);
    tryPlace('autoreply', 9, 4);
    tryPlace('autoreply', 14, 4);
    const sh = tryPlace('shredder', 7, 7);
    const hp = tryPlace('headphones', 10, 3);
    const art = tryPlace('artillery', 18, 5);
    if (sh) for (let i = 0; i < 3; i++) g.upgrade(sh.id, 0);
    if (hp) for (let i = 0; i < 2; i++) g.upgrade(hp.id, 0);
    if (art) for (let i = 0; i < 3; i++) g.upgrade(art.id, 0);
    return out.join(' ');
  });
  console.log(`  placed: ${placed}`);
  await page.keyboard.press('Space');
  const ff = (stop: string) =>
    page.evaluate((what) => {
      const g = (window as unknown as { cad: { session: { game: G } } }).cad.session.game;
      const end = 60 * 600;
      for (let i = 0; i < end && g.phase === 'running'; i++) {
        g.step();
        if (what === 'chatter' && g.enemies.some((e) => e.type === 'chatterbox')) break;
        if (what === 'boss' && g.enemies.some((e) => e.def.boss)) break;
      }
      const keep = g.drainEvents().filter((e) => e.t === 'end' || e.t === 'wave');
      g.events.push(...keep.slice(-2));
      return `${g.phase} wave ${g.waveIndex}`;
    }, stop);
  console.log(`  ${await ff('chatter')}`);
  await new Promise((r) => setTimeout(r, 1500));
  total += await check(page, 'l2-chatterbox', size);
  for (const def of ['shredder', 'headphones', 'artillery']) {
    await page.evaluate((d) => {
      const s = (window as unknown as { cad: { session: { game: G; selected: number | null } } }).cad.session;
      s.selected = s.game.towers.find((t) => t.defId === d)?.id ?? null;
    }, def);
    total += await check(page, `l2-panel-${def}`, size);
  }
  await page.keyboard.press('Escape');
  console.log(`  ${await ff('boss')}`);
  await new Promise((r) => setTimeout(r, 1500));
  total += await check(page, 'l2-boss', size);
  await page.close();
  return total;
}

/** Level 3: the projector mini-game (both ways of plugging in), then The Presenter. */
async function level3Flow(browser: import('puppeteer-core').Browser, errors: string[]): Promise<number> {
  const size = '1600x900';
  console.log(`\n${size} (level 3)`);
  let total = 0;
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`l3: ${String(e)}`));
  await page.setViewport({ width: 1600, height: 900 });
  await page.evaluateOnNewDocument(SETUP.replace("v: 1, settings:", "v: 1, stars: { '1': 3, '2': 3 }, seenColleagues: [], settings:"));
  await page.goto(URL_, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#ui .menu-buttons'), { timeout: 30000 });
  await clickText(page, 'Clock in');
  await clickText(page, 'Meeting Room');
  await page.waitForFunction(() => document.querySelector('.hud'));
  type G = {
    coffee: number;
    focus: number;
    time: number;
    hazardOn: boolean;
    hazardUntil: number;
    hazardSolved: number[];
    level: { size: { w: number; h: number } };
    place(d: string, x: number, y: number): { ok: boolean; reason?: string; tower?: { id: number } };
    upgrade(id: number, p: number): { ok: boolean };
    step(): void;
    phase: string;
    waveIndex: number;
    enemies: { type: string; def: { boss?: unknown } }[];
    events: { t: string }[];
    drainEvents(): { t: string }[];
    towers: { id: number; defId: string }[];
  };
  const placed = await page.evaluate(() => {
    const g = (window as unknown as { cad: { session: { game: G } } }).cad.session.game;
    g.coffee = 4000;
    const want = ['quickreply', 'quickreply', 'autoreply', 'shredder', 'headphones', 'artillery'];
    let n = 0;
    for (let y = 2; y < g.level.size.h && n < want.length; y += 2)
      for (let x = 1; x < g.level.size.w && n < want.length; x += 3) {
        const r = g.place(want[n], x, y);
        if (r.ok && r.tower) {
          for (let i = 0; i < 3; i++) g.upgrade(r.tower.id, 0);
          n++;
        }
      }
    return `${n} towers`;
  });
  console.log(`  placed: ${placed}`);
  await page.keyboard.press('Space');
  const ff = (stop: string) =>
    page.evaluate((what) => {
      const g = (window as unknown as { cad: { session: { game: G } } }).cad.session.game;
      for (let i = 0; i < 60 * 900 && g.phase === 'running'; i++) {
        g.step();
        g.focus = Math.max(g.focus, 50);
        if (what === 'hazard' && g.hazardOn) {
          g.hazardUntil = g.time + 600;
          break;
        }
        if (what === 'boss' && g.enemies.some((e) => e.def.boss)) break;
      }
      const keep = g.drainEvents().filter((e) => e.t === 'end' || e.t === 'wave' || e.t === 'hazard');
      g.events.push(...keep.slice(-3));
      return `${g.phase} wave ${g.waveIndex} t=${Math.round(g.time)}`;
    }, stop);
  console.log(`  ${await ff('hazard')}`);
  await page.waitForSelector('.qte', { timeout: 5000 });
  total += await check(page, 'l3-projector', size);
  const refused = await page.evaluate(() => {
    const g = (window as unknown as { cad: { session: { game: G } } }).cad.session.game;
    return g.place('autoreply', 1, 1).reason ?? 'placed anyway';
  });
  console.log(`  building while it is on: ${refused}`);
  // VGA by clicking, power by dragging.
  await page.click('.qte-plug.plug-vga');
  await page.click('.qte-port.port-vga');
  total += await check(page, 'l3-one-cable', size);
  const centre = async (sel: string) => {
    const b = (await (await page.$(sel))!.boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const from = await centre('.qte-plug.plug-pwr');
  const to = await centre('.qte-port.port-pwr');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8);
  await page.mouse.up();
  await page.waitForSelector('.xp-window', { timeout: 3000 });
  total += await check(page, 'l3-settings', size);
  await clickText(page, 'Extend these displays');
  const before = await page.evaluate(() => (window as unknown as { cad: { session: { game: G } } }).cad.session.game.coffee);
  await clickText(page, 'Duplicate desktop');
  await page.waitForFunction(() => !document.querySelector('.qte'), { timeout: 3000 });
  const after = await page.evaluate(() => {
    const g = (window as unknown as { cad: { session: { game: G } } }).cad.session.game;
    return { coffee: g.coffee, solved: g.hazardSolved, on: g.hazardOn };
  });
  console.log(`  solved: ${JSON.stringify(after.solved)} on=${after.on} coffee +${Math.round(after.coffee - before)}`);
  if (!after.solved.includes(0) || after.on) errors.push('l3: projector was not solved');
  await new Promise((r) => setTimeout(r, 400));
  total += await check(page, 'l3-fixed', size);
  await page.evaluate(() => {
    const s = (window as unknown as { cad: { session: { game: G; selected: number | null } } }).cad.session;
    s.selected = s.game.towers.find((t) => t.defId === 'quickreply')?.id ?? null;
  });
  total += await check(page, 'l3-panel-qr', size);
  await page.keyboard.press('Escape');
  console.log(`  ${await ff('boss')}`);
  await new Promise((r) => setTimeout(r, 1500));
  total += await check(page, 'l3-boss', size);
  await page.close();
  return total;
}

/** Level 4: Thumbtacks and Self-Service panels, The Impersonator, the lunch break, The Cleaner. */
async function level4Flow(browser: import('puppeteer-core').Browser, errors: string[]): Promise<number> {
  const size = '1600x900';
  console.log(`\n${size} (level 4)`);
  let total = 0;
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`l4: ${String(e)}`));
  await page.setViewport({ width: 1600, height: 900 });
  await page.evaluateOnNewDocument(SETUP.replace("v: 1, settings:", "v: 1, stars: { '1': 3, '2': 3, '3': 3 }, seenColleagues: [], settings:"));
  await page.goto(URL_, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#ui .menu-buttons'), { timeout: 30000 });
  await clickText(page, 'Clock in');
  await clickText(page, 'Canteen');
  await page.waitForFunction(() => document.querySelector('.hud'));
  type G = {
    coffee: number;
    focus: number;
    time: number;
    hazardOn: boolean;
    piles: unknown[];
    level: { size: { w: number; h: number } };
    place(d: string, x: number, y: number): { ok: boolean; reason?: string; tower?: { id: number } };
    upgrade(id: number, p: number): { ok: boolean };
    step(): void;
    phase: string;
    waveIndex: number;
    enemies: { type: string; def: { boss?: unknown } }[];
    events: { t: string }[];
    drainEvents(): { t: string }[];
    towers: { id: number; defId: string; mopped: number }[];
  };
  const placed = await page.evaluate(() => {
    const g = (window as unknown as { cad: { session: { game: G } } }).cad.session.game;
    g.coffee = 5000;
    // Spots inside the spiral, next to the walkway.
    const want: [string, number, number, number][] = [
      ['thumbtacks', 9, 6, 0],
      ['thumbtacks', 17, 6, 1],
      ['selfservice', 13, 5, 0],
      ['shredder', 4, 8, 0],
      ['autoreply', 10, 9, 0],
      ['autoreply', 5, 3, 0],
      ['artillery', 20, 10, 0],
      ['quickreply', 4, 5, 0],
    ];
    const out: string[] = [];
    for (const [d, x, y, p] of want) {
      const r = g.place(d, x, y);
      out.push(`${d}@${x},${y}:${r.ok ? 'ok' : r.reason}`);
      if (r.tower) for (let i = 0; i < 2; i++) g.upgrade(r.tower.id, p);
    }
    return out.join(' ');
  });
  console.log(`  placed: ${placed}`);
  total += await check(page, 'l4-built', size);
  await page.keyboard.press('Space');
  const ff = (stop: string) =>
    page.evaluate((what) => {
      const g = (window as unknown as { cad: { session: { game: G } } }).cad.session.game;
      for (let i = 0; i < 60 * 900 && g.phase === 'running'; i++) {
        g.step();
        g.focus = Math.max(g.focus, 50);
        if (what === 'hidden' && g.enemies.some((e) => e.type === 'impersonator') && g.piles.length > 3) break;
        if (what === 'lunch' && g.hazardOn) break;
        if (what === 'boss' && g.enemies.some((e) => e.def.boss)) break;
        if (what === 'mop' && g.towers.some((t) => t.mopped > 0)) break;
      }
      const keep = g.drainEvents().filter((e) => e.t === 'end' || e.t === 'wave' || e.t === 'hazard');
      g.events.push(...keep.slice(-2));
      return `${g.phase} wave ${g.waveIndex} t=${Math.round(g.time)} piles=${g.piles.length}`;
    }, stop);
  console.log(`  ${await ff('hidden')}`);
  await new Promise((r) => setTimeout(r, 900));
  total += await check(page, 'l4-impersonator', size);
  for (const def of ['thumbtacks', 'selfservice']) {
    await page.evaluate((d) => {
      const s = (window as unknown as { cad: { session: { game: G; selected: number | null } } }).cad.session;
      s.selected = s.game.towers.find((t) => t.defId === d)?.id ?? null;
    }, def);
    total += await check(page, `l4-panel-${def}`, size);
  }
  await page.keyboard.press('Escape');
  console.log(`  ${await ff('lunch')}`);
  await new Promise((r) => setTimeout(r, 600));
  total += await check(page, 'l4-lunch', size);
  console.log(`  ${await ff('boss')}`);
  console.log(`  ${await ff('mop')}`);
  await page.evaluate(() => {
    const s = (window as unknown as { cad: { session: { game: G; selected: number | null } } }).cad.session;
    s.selected = s.game.towers.find((t) => t.defId === 'shredder')?.id ?? null;
  });
  await new Promise((r) => setTimeout(r, 900));
  total += await check(page, 'l4-boss', size);
  await page.close();
  return total;
}

/** Run the multiplayer flow; on any failure, save what every open page shows before rethrowing. */
async function mpFlowLogged(browser: import('puppeteer-core').Browser, errors: string[]): Promise<number> {
  try {
    return await mpFlow(browser, errors);
  } catch (e) {
    const pages = await browser.pages();
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      if (p.url() === 'about:blank') continue;
      await p.bringToFront();
      await p.screenshot({ path: join(OUT, `mp-fail-${i}.png`) as `${string}.png` }).catch(() => {});
      const text = await p.evaluate(() => document.getElementById('ui')?.innerText ?? '').catch(() => '');
      console.log(`  page ${i} (${p.url()}) shows: ${text.replace(/\s+/g, ' ').slice(0, 260)}`);
    }
    throw e;
  }
}

class Done extends Error {}

async function run(): Promise<void> {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--mute-audio'],
  });
  let total = 0;
  const errors: string[] = [];
  try {
    if (args.includes('--l2-only')) {
      total += await level2Flow(browser, errors);
      throw new Done();
    }
    if (args.includes('--l4-only')) {
      total += await level4Flow(browser, errors);
      throw new Done();
    }
    if (args.includes('--l3-only')) {
      total += await level3Flow(browser, errors);
      throw new Done();
    }
    if (args.includes('--mp-only')) {
      total += await mpFlowLogged(browser, errors);
      throw new Done();
    }
    for (const [w, hgt] of SIZES) {
      const size = `${w}x${hgt}`;
      console.log(`\n${size}`);
      const page = await browser.newPage();
      page.on('pageerror', (e) => errors.push(`${size}: ${String(e)}`));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`${size}: ${m.text()}`);
      });
      await page.setViewport({ width: w, height: hgt });
      await page.evaluateOnNewDocument(SETUP);
      await page.goto(URL_, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => document.querySelector('#ui .menu-buttons'), { timeout: 30000 });
      total += await check(page, 'menu', size);
      await clickText(page, 'Clock in');
      total += await check(page, 'career', size);
      await clickText(page, 'Open-Plan Office');
      await page.waitForFunction(() => document.querySelector('.hud'));
      total += await check(page, 'plan', size);
      // Build a little, start, and fast-forward a few waves.
      await page.evaluate(() => {
        const g = (window as unknown as { cad: Cad }).cad.session.game;
        g.coffee = 600;
        g.place('autoreply', 6, 3);
        g.place('autoreply', 8, 6);
        g.place('autoreply', 13, 6);
        g.place('coffee', 4, 6);
        const t = g.towers[0];
        g.upgrade(t.id, 0);
        g.upgrade(t.id, 0);
        g.upgrade(t.id, 0);
        g.upgrade(t.id, 1);
        const m = g.towers[3];
        g.upgrade(m.id, 1);
        g.upgrade(m.id, 1);
      });
      await page.keyboard.press('Space');
      await new Promise((r) => setTimeout(r, 2500));
      total += await check(page, 'running', size);
      await page.evaluate(() => {
        const s = (window as unknown as { cad: Cad }).cad.session;
        s.selected = s.game.towers[0].id;
      });
      total += await check(page, 'tower-panel', size);
      await page.evaluate(() => {
        const s = (window as unknown as { cad: Cad }).cad.session;
        s.selected = s.game.towers[3].id;
      });
      total += await check(page, 'bank-panel', size);
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      total += await check(page, 'pause', size);
      await clickText(page, 'Settings');
      await page.waitForSelector('.overlay .settings-card');
      total += await check(page, 'settings-ingame', size);
      await clickText(page, 'Back');
      await page.waitForFunction(() => !document.querySelector('.overlay .settings-card'));
      await clickText(page, 'Give up');
      total += await check(page, 'confirm', size);
      await clickText(page, 'Yes, go home');
      await page.waitForFunction(() => document.querySelector('.overlay .fun-scale'), { timeout: 10000 });
      total += await check(page, 'end', size);
      await page.close();
    }
    // Second flow, largest size only: fast-forward to the boss, then win.
    const [w, hgt] = SIZES[0];
    const size = `${w}x${hgt}`;
    console.log(`\n${size} (boss and win)`);
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(`${size}: ${String(e)}`));
    await page.setViewport({ width: w, height: hgt });
    await page.evaluateOnNewDocument(SETUP);
    await page.goto(URL_, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.querySelector('#ui .menu-buttons'), { timeout: 30000 });
    await clickText(page, 'Clock in');
    await clickText(page, 'Open-Plan Office');
    await page.waitForFunction(() => document.querySelector('.hud'));
    // Fast-forward in the simulation itself; keep only the events the screens react to, so a
    // whole level of shots does not land on the renderer in one frame.
    const ff = (untilBoss: boolean) =>
      page.evaluate((boss) => {
        const g = (window as unknown as { cad: Cad }).cad.session.game as unknown as Cad['session']['game'] & {
          start(): void;
          step(): void;
          enemies: { def: { boss?: unknown } }[];
          events: { t: string }[];
          drainEvents(): { t: string }[];
          time: number;
        };
        if (g.phase === 'plan') {
          g.coffee = 2000;
          const spots = [[6, 3], [8, 6], [13, 6], [15, 4], [6, 1], [9, 8], [16, 6], [12, 8]];
          for (const [x, y] of spots) g.place('autoreply', x, y);
          for (const t of g.towers) {
            for (let i = 0; i < 4; i++) g.upgrade(t.id, 0);
            g.upgrade(t.id, 1);
            g.upgrade(t.id, 1);
          }
          g.start();
        }
        const end = g.time + 900;
        while (g.phase === 'running' && g.time < end) {
          g.step();
          if (boss && g.enemies.some((e) => e.def.boss)) break;
        }
        const keep = g.drainEvents().filter((e) => e.t === 'end' || e.t === 'wave');
        g.events.push(...keep.slice(-3));
        return g.phase;
      }, untilBoss);
    await ff(true);
    await new Promise((r) => setTimeout(r, 1200));
    total += await check(page, 'boss', size);
    await ff(false);
    await page.waitForFunction(() => document.querySelector('.overlay .fun-scale'), { timeout: 10000 });
    total += await check(page, 'won', size);
    await page.close();

    total += await level2Flow(browser, errors);
    total += await level3Flow(browser, errors);
    total += await level4Flow(browser, errors);
    if (args.includes('--mp')) total += await mpFlowLogged(browser, errors);
  } catch (e) {
    if (!(e instanceof Done)) throw e;
  } finally {
    await browser.close();
  }
  if (errors.length) {
    console.log('\nBrowser errors:');
    for (const e of errors) console.log('  ' + e);
  }
  console.log(`\n${total} UI problem(s), ${errors.length} browser error(s)`);
  process.exit(total + errors.length > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
