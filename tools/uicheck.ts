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
    // Text taller than its box, spilling over whatever comes next (a squeezed flex child). A few
    // pixels is just a tight line-height on a big title; a whole extra line is a problem.
    if (st.display !== 'inline' && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + Math.max(8, el.clientHeight * 0.25) && st.overflowY === 'visible') {
      problems.push({ kind: 'overflow', text: label(el), detail: `text ${el.scrollHeight}px tall in a ${el.clientHeight}px box` });
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
  // Split wallets, own towers (the defaults), left and right halves. Each setting is found by the
  // option it offers, so adding a setting to the lobby does not shift these.
  const pick = (v: string) =>
    host.evaluate((value) => {
      const sel = [...document.querySelectorAll<HTMLSelectElement>('.lobby-settings select')].find((x) => [...x.options].some((o) => o.value === value));
      if (!sel) throw new Error(`No lobby setting offers ${value}`);
      sel.value = value;
      sel.dispatchEvent(new Event('change'));
    }, v);
  const defaults = await host.evaluate(() => [...document.querySelectorAll<HTMLSelectElement>('.lobby-settings select')].map((x) => x.value));
  if (!defaults.includes('split') || !defaults.includes('own')) errors.push(`mp: lobby defaults are ${defaults.join(', ')}`);
  await pick('split');
  await new Promise((r) => setTimeout(r, 300));
  await pick('leftright');
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
  await host.evaluate(() => (window as unknown as Remote).cad.session.run({ c: 'place', def: 'autoreply', tx: 3, ty: 7 }));
  await guest.evaluate(() => (window as unknown as Remote).cad.session.run({ c: 'place', def: 'autoreply', tx: 14, ty: 6 }));
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
  // The build grid while placing: green where you may build, a dark tint on floor you may not.
  await page.keyboard.press('2');
  await page.mouse.move(800, 450);
  await new Promise((r) => setTimeout(r, 400));
  total += await check(page, 'l2-build-grid', size);
  await page.keyboard.press('Escape');
  // Office Artillery: red where it cannot see past the furniture.
  await page.keyboard.press('4');
  await page.mouse.move(700, 330);
  await new Promise((r) => setTimeout(r, 400));
  total += await check(page, 'l2-blind-spots', size);
  await page.keyboard.press('Escape');
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
    // The Coffee Corner kitchen (14 x 14): the floor between the furniture.
    tryPlace('coffee', 1, 1);
    tryPlace('autoreply', 4, 3);
    tryPlace('autoreply', 9, 5);
    tryPlace('autoreply', 9, 7);
    const sh = tryPlace('shredder', 11, 3);
    const hp = tryPlace('headphones', 4, 7);
    const art = tryPlace('artillery', 0, 12);
    out.push(`on a table: ${g.place('autoreply', 6, 8).reason}`);
    if (sh) for (let i = 0; i < 3; i++) g.upgrade(sh.id, 0);
    if (hp) for (let i = 0; i < 2; i++) g.upgrade(hp.id, 0);
    if (art) for (let i = 0; i < 3; i++) g.upgrade(art.id, 0);
    return out.join(' ');
  });
  console.log(`  placed: ${placed}`);
  total += await check(page, 'l2-kitchen', size);
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

/** Level 5: the specials (one each, the chair's arrows), keyboards on the walkway, Your Line Manager. */
async function level5Flow(browser: import('puppeteer-core').Browser, errors: string[]): Promise<number> {
  const size = '1600x900';
  console.log(`\n${size} (level 5)`);
  let total = 0;
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`l5: ${String(e)}`));
  await page.setViewport({ width: 1600, height: 900 });
  await page.evaluateOnNewDocument(SETUP.replace("v: 1, settings:", "v: 1, stars: { '1': 3, '2': 3, '3': 3, '4': 3 }, recognition: 80, smokes: 1, seenColleagues: [], settings:"));
  await page.goto(URL_, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#ui .menu-buttons'), { timeout: 30000 });
  await clickText(page, 'Clock in');
  // The Recognition shop: buy a perk and a Smoke Break, then back to work.
  await clickText(page, 'Recognition shop');
  await page.waitForSelector('.perk-list');
  total += await check(page, 'l5-shop', size);
  await page.evaluate(() => {
    const perk = [...document.querySelectorAll('.perk')].find((p) => p.textContent?.includes('Startup Budget'));
    perk?.querySelector<HTMLButtonElement>('button')?.click();
    const smoke = [...document.querySelectorAll('.perk')].find((p) => p.textContent?.includes('Smoke Break'));
    smoke?.querySelector<HTMLButtonElement>('button')?.click();
  });
  const left = await page.evaluate(() => document.querySelector('.screen-head .mono')?.textContent ?? '?');
  if (left !== '38') errors.push(`l5: Recognition after buying is ${left}, expected 38`);
  await clickText(page, 'Back');
  await clickText(page, 'Boardroom');
  await page.waitForFunction(() => document.querySelector('.hud'));
  type G = {
    coffee: number;
    focus: number;
    time: number;
    barriers: unknown[];
    place(d: string, x: number, y: number): { ok: boolean; reason?: string; tower?: { id: number } };
    upgrade(id: number, p: number): { ok: boolean };
    step(): void;
    phase: string;
    waveIndex: number;
    enemies: { type: string; def: { boss?: unknown } }[];
    events: { t: string }[];
    drainEvents(): { t: string }[];
    towers: { id: number; defId: string; rolling: number }[];
  };
  const placed = await page.evaluate(() => {
    const g = (window as unknown as { cad: { session: { game: G } } }).cad.session.game;
    g.coffee = 5000;
    const want: [string, number, number, number][] = [
      ['keyboardsmash', 5, 3, 1],
      ['autoreply', 5, 7, 0],
      ['autoreply', 16, 3, 0],
      ['quickreply', 12, 8, 0],
      ['artillery', 19, 10, 0],
      ['selfservice', 9, 2, 0],
      ['thumbtacks', 15, 8, 0],
    ];
    const out: string[] = [];
    for (const [d, x, y, p] of want) {
      const r = g.place(d, x, y);
      out.push(`${d}@${x},${y}:${r.ok ? 'ok' : r.reason}`);
      if (r.tower) for (let i = 0; i < 2; i++) g.upgrade(r.tower.id, p);
    }
    out.push(`second keyboard: ${g.place('keyboardsmash', 16, 7).reason}`);
    return out.join(' ');
  });
  console.log(`  placed: ${placed}`);
  // The chair is placed by hand, so its panel and arrows open by themselves.
  await page.evaluate(() => {
    const s = (window as unknown as { cad: { session: { pick(d: string): void } } }).cad.session;
    s.pick('chair');
  });
  // A screen point over tile (2, 5), asked from the view each time: the camera refits whenever
  // the panels change size, so a point worked out earlier can be stale.
  const tilePoint = () =>
    page.evaluate(() => {
      const cad = (window as unknown as { cad: { view: { project(x: number, y: number, h: number): { sx: number; sy: number } } } }).cad;
      const p = cad.view.project(2.5, 5.5, 0);
      return { x: p.sx, y: p.sy };
    });
  let pt = await tilePoint();
  await page.mouse.move(pt.x, pt.y);
  await new Promise((r) => setTimeout(r, 400));
  total += await check(page, 'l5-chair-ghost', size);
  pt = await tilePoint();
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.click(pt.x, pt.y);
  await new Promise((r) => setTimeout(r, 300));
  const chairPanel = await page.waitForSelector('.chair-dirs', { timeout: 3000 }).then(() => true).catch(() => false);
  if (!chairPanel) errors.push('l5: the chair panel with arrows did not open after placing it');
  total += await check(page, 'l5-chair-panel', size);
  await page.click('.chair-dirs button[aria-label="Roll down-right"]').catch(() => errors.push('l5: no down-right arrow'));
  await page.keyboard.press('Space');
  const ff = (stop: string) =>
    page.evaluate((what) => {
      const g = (window as unknown as { cad: { session: { game: G } } }).cad.session.game;
      for (let i = 0; i < 60 * 900 && g.phase === 'running'; i++) {
        g.step();
        g.focus = Math.max(g.focus, 50);
        if (what === 'keyboard' && g.barriers.length > 0 && g.towers.some((t) => t.defId === 'chair' && t.rolling !== 0)) break;
        if (what === 'boss' && g.enemies.some((e) => e.def.boss)) break;
      }
      const keep = g.drainEvents().filter((e) => e.t === 'end' || e.t === 'wave');
      g.events.push(...keep.slice(-2));
      return `${g.phase} wave ${g.waveIndex} t=${Math.round(g.time)} keyboards=${g.barriers.length}`;
    }, stop);
  console.log(`  ${await ff('keyboard')}`);
  await new Promise((r) => setTimeout(r, 300));
  total += await check(page, 'l5-keyboard', size);
  await page.evaluate(() => {
    const s = (window as unknown as { cad: { session: { game: G; selected: number | null } } }).cad.session;
    s.selected = s.game.towers.find((t) => t.defId === 'keyboardsmash')?.id ?? null;
  });
  total += await check(page, 'l5-panel-keyboard', size);
  await page.keyboard.press('Escape');
  const smokeBtn = await page.evaluate(() => document.querySelector('.topbar .smoke:not([hidden])')?.textContent ?? 'missing');
  if (!/Smoke break \(2\)/.test(smokeBtn)) errors.push(`l5: smoke button shows ${smokeBtn}`);
  console.log(`  ${await ff('boss')}`);
  await new Promise((r) => setTimeout(r, 1500));
  total += await check(page, 'l5-boss', size);
  // Win it: the first time through level 5 is a promotion.
  console.log(`  ${await ff('end')}`);
  await page.waitForFunction(() => document.querySelector('.overlay .fun-scale'), { timeout: 15000 });
  const promoted = await page.evaluate(() => document.querySelector('.promotion')?.textContent ?? 'missing');
  if (!/PROMOTED/.test(promoted)) errors.push(`l5: no promotion on the end screen (${promoted})`);
  total += await check(page, 'l5-won', size);
  await page.close();
  return total;
}

/** Level 6: the house with walls, the No Internet dinosaur (Space jumps, not next wave), The Baby. */
async function level6Flow(browser: import('puppeteer-core').Browser, errors: string[]): Promise<number> {
  const size = '1600x900';
  console.log(`\n${size} (level 6)`);
  let total = 0;
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`l6: ${String(e)}`));
  await page.setViewport({ width: 1600, height: 900 });
  await page.evaluateOnNewDocument(SETUP.replace("v: 1, settings:", "v: 1, stars: { '1': 3, '2': 3, '3': 3, '4': 3, '5': 3 }, seenColleagues: [], settings:"));
  await page.goto(URL_, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#ui .menu-buttons'), { timeout: 30000 });
  await clickText(page, 'Clock in');
  await clickText(page, 'Work From Home');
  await page.waitForFunction(() => document.querySelector('.hud'));
  type G = {
    coffee: number;
    focus: number;
    time: number;
    hazardOn: boolean;
    hazardUntil: number;
    waveIndex: number;
    phase: string;
    place(d: string, x: number, y: number): { ok: boolean; reason?: string; tower?: { id: number } };
    upgrade(id: number, p: number): { ok: boolean };
    step(): void;
    enemies: { type: string; def: { boss?: unknown } }[];
    events: { t: string }[];
    drainEvents(): { t: string }[];
    towers: { id: number; defId: string; quiet: string | null }[];
  };
  const placed = await page.evaluate(() => {
    const g = (window as unknown as { cad: { session: { game: G } } }).cad.session.game;
    g.coffee = 5000;
    const want: [string, number, number][] = [
      ['autoreply', 7, 10],
      ['replyall', 9, 6],
      ['thumbtacks', 3, 8],
      ['artillery', 0, 13],
      ['autoreply', 14, 11],
      ['keyboardsmash', 11, 3],
    ];
    const out = want.map(([d, x, y]) => {
      const r = g.place(d, x, y);
      if (r.tower) for (let i = 0; i < 2; i++) g.upgrade(r.tower.id, 0);
      return `${d}@${x},${y}:${r.ok ? 'ok' : r.reason}`;
    });
    out.push(`on a wall: ${g.place('autoreply', 5, 11).reason}`);
    return out.join(' ');
  });
  console.log(`  placed: ${placed}`);
  total += await check(page, 'l6-house', size);
  await page.keyboard.press('Space');
  const ff = (stop: string) =>
    page.evaluate((what) => {
      const g = (window as unknown as { cad: { session: { game: G } } }).cad.session.game;
      for (let i = 0; i < 60 * 900 && g.phase === 'running'; i++) {
        g.step();
        g.focus = Math.max(g.focus, 50);
        if (what === 'offline' && g.hazardOn) {
          g.hazardUntil = g.time + 600;
          break;
        }
        if (what === 'boss' && g.enemies.some((e) => e.def.boss)) break;
      }
      const keep = g.drainEvents().filter((e) => e.t === 'end' || e.t === 'wave' || e.t === 'hazard');
      g.events.push(...keep.slice(-3));
      return `${g.phase} wave ${g.waveIndex} t=${Math.round(g.time)}`;
    }, stop);
  console.log(`  ${await ff('offline')}`);
  await page.waitForSelector('.dino-canvas', { timeout: 5000 });
  const before = await page.evaluate(() => (window as unknown as { cad: { session: { game: G } } }).cad.session.game.waveIndex);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Space');
    await new Promise((r) => setTimeout(r, 300));
  }
  const after = await page.evaluate(() => (window as unknown as { cad: { session: { game: G } } }).cad.session.game.waveIndex);
  if (after !== before) errors.push(`l6: Space called a wave while the dinosaur was running (${before} -> ${after})`);
  const offline = await page.evaluate(() => (window as unknown as { cad: { session: { game: G } } }).cad.session.game.towers.filter((t) => t.quiet === 'net').length);
  if (offline === 0) errors.push('l6: no tower went offline during the outage');
  total += await check(page, 'l6-offline', size);
  // Reconnect (the solve command, as the full bar would) and carry on.
  await page.evaluate(() => (window as unknown as { cad: { session: { run(c: { c: string }): void } } }).cad.session.run({ c: 'solve' }));
  await page.waitForFunction(() => !document.querySelector('.dino-canvas'), { timeout: 3000 });
  console.log(`  ${await ff('boss')}`);
  await new Promise((r) => setTimeout(r, 1500));
  total += await check(page, 'l6-boss', size);
  await page.close();
  return total;
}

async function level7Flow(browser: import('puppeteer-core').Browser, errors: string[]): Promise<number> {
  const size = '1600x900';
  console.log(`\n${size} (level 7)`);
  let total = 0;
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`l7: ${String(e)}`));
  await page.setViewport({ width: 1600, height: 900 });
  await page.evaluateOnNewDocument(SETUP.replace("v: 1, settings:", "v: 1, stars: { '1': 3, '2': 3, '3': 3, '4': 3, '5': 3, '6': 3 }, seenColleagues: [], settings:"));
  await page.goto(URL_, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('#ui .menu-buttons'), { timeout: 30000 });
  await clickText(page, 'Clock in');
  await clickText(page, 'The Car Park');
  await page.waitForFunction(() => document.querySelector('.hud'));
  type G = {
    coffee: number;
    focus: number;
    time: number;
    hazardOn: boolean;
    waveIndex: number;
    phase: string;
    smoke: unknown[];
    place(d: string, x: number, y: number): { ok: boolean; reason?: string; tower?: { id: number } };
    upgrade(id: number, p: number): { ok: boolean };
    rangeFactor(t: unknown): number;
    step(): void;
    enemies: { type: string; def: { boss?: unknown } }[];
    events: { t: string }[];
    drainEvents(): { t: string }[];
    towers: { id: number; defId: string }[];
  };
  const placed = await page.evaluate(() => {
    const g = (window as unknown as { cad: { session: { game: G } } }).cad.session.game;
    g.coffee = 5000;
    const want: [string, number, number][] = [
      ['autoreply', 4, 2],
      ['delegation', 10, 4],
      ['delegation', 5, 8],
      ['replyall', 12, 6],
      ['thumbtacks', 1, 6],
      ['artillery', 0, 0],
      ['autoreply', 16, 10],
      ['autoreply', 7, 11],
    ];
    const out = want.map(([d, x, y]) => {
      const r = g.place(d, x, y);
      if (r.tower) for (let i = 0; i < 2; i++) g.upgrade(r.tower.id, 0);
      return `${d}@${x},${y}:${r.ok ? 'ok' : r.reason}`;
    });
    out.push(`on a car: ${g.place('autoreply', 4, 3).reason}`);
    return out.join(' ');
  });
  console.log(`  placed: ${placed}`);
  total += await check(page, 'l7-park', size);
  await page.keyboard.press('Space');
  const ff = (stop: string) =>
    page.evaluate((what) => {
      const g = (window as unknown as { cad: { session: { game: G } } }).cad.session.game;
      for (let i = 0; i < 60 * 900 && g.phase === 'running'; i++) {
        g.step();
        g.focus = Math.max(g.focus, 50);
        if (what === 'smoke' && g.hazardOn && g.smoke.length > 0) break;
        if (what === 'boss' && g.enemies.some((e) => e.def.boss)) break;
      }
      const keep = g.drainEvents().filter((e) => e.t === 'end' || e.t === 'wave' || e.t === 'hazard');
      g.events.push(...keep.slice(-3));
      return `${g.phase} wave ${g.waveIndex} t=${Math.round(g.time)} clouds=${g.smoke.length}`;
    }, stop);
  console.log(`  ${await ff('smoke')}`);
  // Select a tower in the smoke: its panel must say so.
  const smoked = await page.evaluate(() => {
    const s = (window as unknown as { cad: { session: { game: G; select(id: number): void } } }).cad.session;
    // The clouds land where they like; if none caught a tower, drift one over the first.
    if (!s.game.towers.some((x) => s.game.rangeFactor(x) < 1)) {
      const first = s.game.towers[0] as unknown as { x: number; y: number };
      (s.game.smoke as { x: number; y: number; r: number; mult: number; life: number }[]).push({ x: first.x, y: first.y, r: 2, mult: 0.55, life: 10 });
    }
    const t = s.game.towers.find((x) => s.game.rangeFactor(x) < 1)!;
    s.select(t.id);
    return t.defId;
  });
  await page.waitForFunction(() => [...document.querySelectorAll('.status')].some((e) => e.textContent?.startsWith('In the smoke')), { timeout: 3000 }).catch(() => errors.push(`l7: no smoke note on the ${smoked} panel`));
  await new Promise((r) => setTimeout(r, 800));
  total += await check(page, 'l7-smoke', size);
  console.log(`  ${await ff('boss')}`);
  await new Promise((r) => setTimeout(r, 1500));
  total += await check(page, 'l7-boss', size);
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
    if (args.includes('--l6-only')) {
      total += await level6Flow(browser, errors);
      throw new Done();
    }
    if (args.includes('--l7-only')) {
      total += await level7Flow(browser, errors);
      throw new Done();
    }
    if (args.includes('--l5-only')) {
      total += await level5Flow(browser, errors);
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
      await clickText(page, "What's new");
      await page.waitForSelector('.screen-head');
      total += await check(page, 'whats-new', size);
      // The Back button at the top, not the one at the bottom of the long page.
      await page.click('.screen-head button');
      await page.waitForFunction(() => document.querySelector('#ui .menu-buttons'));
      await clickText(page, 'Clock in');
      total += await check(page, 'career', size);
      await clickText(page, 'Reception');
      await page.waitForFunction(() => document.querySelector('.hud'));
      total += await check(page, 'plan', size);
      // Build a little, start, and fast-forward a few waves.
      await page.evaluate(() => {
        const g = (window as unknown as { cad: Cad }).cad.session.game;
        g.coffee = 600;
        g.place('autoreply', 5, 4);
        g.place('autoreply', 9, 5);
        g.place('autoreply', 14, 6);
        g.place('coffee', 2, 6);
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
      // Offshore Account: the Claim all button shows up in the top bar.
      await page.evaluate(() => {
        const s = (window as unknown as { cad: Cad }).cad.session;
        const m = s.game.towers[3];
        s.game.coffee = 2000;
        for (let i = 0; i < 3; i++) s.game.upgrade(m.id, 1);
        (m as unknown as { pot: number }).pot = 42;
      });
      const shown = await page
        .waitForFunction(() => /Claim all 42/.test(document.querySelector<HTMLButtonElement>('.topbar .claim-all:not([hidden])')?.textContent ?? ''), { timeout: 5000, polling: 100 })
        .then(() => true)
        .catch(() => false);
      if (!shown) errors.push(`claim all button missing at ${size}`);
      total += await check(page, 'claim-all', size);
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      total += await check(page, 'pause', size);
      await clickText(page, 'Resume');
      await page.click('button[aria-label="Go home"]');
      await page.waitForSelector('.overlay');
      total += await check(page, 'go-home', size);
      await clickText(page, 'Keep working');
      await page.keyboard.press('Escape');
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
    await clickText(page, 'Reception');
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
    total += await level5Flow(browser, errors);
    total += await level6Flow(browser, errors);
    total += await level7Flow(browser, errors);
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
