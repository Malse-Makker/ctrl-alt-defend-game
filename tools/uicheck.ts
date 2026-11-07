// Visual check in a real browser: opens the game in headless Chrome (software WebGL), plays through
// the screens at several window sizes, saves screenshots and reports text that overlaps, sticks out
// of its box or falls off the screen. No unit test sees that; it went wrong three times in the
// Godot version.
//
//   npx tsx tools/uicheck.ts [--url http://127.0.0.1:5173/] [--out shots] [--sizes 1920x1080,1280x720]
//
// Needs a dev or preview server running, and Google Chrome (CHROME=/path/to/chrome to override).

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
      upgrade(id: number): unknown;
      buySide(id: number, p: string): unknown;
      runFor(s: number): void;
      phase: string;
      giveUp(): void;
    };
    selected: number | null;
    speed: number;
  };
};

async function run(): Promise<void> {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--mute-audio'],
  });
  let total = 0;
  const errors: string[] = [];
  try {
    for (const [w, hgt] of SIZES) {
      const size = `${w}x${hgt}`;
      console.log(`\n${size}`);
      const page = await browser.newPage();
      page.on('pageerror', (e) => errors.push(`${size}: ${String(e)}`));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`${size}: ${m.text()}`);
      });
      await page.setViewport({ width: w, height: hgt });
      // tsx (esbuild) wraps functions in __name(); functions sent to the page need it to exist.
      await page.evaluateOnNewDocument('window.__name = (f) => f; try { localStorage.clear(); } catch (e) {}');
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
        g.coffee = 400;
        g.place('autoreply', 6, 3);
        g.place('autoreply', 8, 6);
        g.place('autoreply', 13, 6);
        g.place('coffee', 4, 6);
        const t = g.towers[0];
        g.upgrade(t.id);
        g.buySide(t.id, 'escalation');
      });
      await page.keyboard.press('Space');
      await new Promise((r) => setTimeout(r, 2500));
      total += await check(page, 'running', size);
      await page.evaluate(() => {
        const s = (window as unknown as { cad: Cad }).cad.session;
        s.selected = s.game.towers[0].id;
      });
      total += await check(page, 'tower-panel', size);
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      total += await check(page, 'pause', size);
      await clickText(page, 'Give up');
      total += await check(page, 'confirm', size);
      await clickText(page, 'Yes, go home');
      await page.waitForFunction(() => document.querySelector('.overlay .fun-scale'), { timeout: 10000 });
      total += await check(page, 'end', size);
      await page.close();
    }
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
