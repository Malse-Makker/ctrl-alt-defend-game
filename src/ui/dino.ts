// The No Internet mini-game (Work From Home): the browser's dinosaur, running while the router
// thinks about it. Jump over the cacti (Space, click or tap) and the "Reconnecting..." bar fills;
// hit one and it drops back. Full bar: back online. It closes by itself after a while, so nobody
// gets stuck; until then your WRITTEN towers send nothing.

import { h } from './dom';
import { UI_TEXT as T } from './text';

export interface DinoGame {
  el: HTMLElement;
  setTimeLeft(seconds: number): void;
  close(): void;
  /** Space jumps here, so the session must not call the next wave with it. */
  wantsSpace: true;
}

const W = 420;
const H = 130;
const GROUND = 108;
/** Seconds of clean running to fill the bar. */
const RUN_TO_FILL = 6;

export function dinoGame(onSolved: () => void, say: (msg: string) => void): DinoGame {
  const timer = h('div', { class: 'qte-timer' });
  const canvas = h('canvas', { class: 'dino-canvas', attrs: { width: String(W), height: String(H), 'aria-label': 'Jump over the cacti' } });
  const fill = h('div', { class: 'dino-fill' });
  const label = h('span', { class: 'dino-label', text: T.dinoReconnecting });
  const card = h(
    'div',
    { class: 'qte panel', attrs: { role: 'dialog', 'aria-label': 'No internet' } },
    h('div', { class: 'qte-head' }, h('span', { class: 'qte-title', text: T.dinoTitle }), timer),
    canvas,
    h('div', { class: 'dino-bar' }, fill, label),
    h('div', { class: 'qte-help', text: T.dinoHelp }),
  );
  const el = h('div', { class: 'qte-layer' }, card);
  const ctx = canvas.getContext('2d');

  // The dinosaur and the cacti, in canvas pixels.
  let y = 0;
  let vy = 0;
  let cacti: { x: number; w: number; h: number }[] = [{ x: W + 60, w: 12, h: 26 }];
  let speed = 220;
  let progress = 0;
  let flash = 0;
  let done = false;
  let last = performance.now();
  let raf = 0;

  const jump = () => {
    if (y === 0 && !done) vy = 420;
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'ArrowUp') {
      e.preventDefault();
      jump();
    }
  };
  window.addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    jump();
  });

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!done) {
      // Jumping: a simple arc.
      vy -= 1300 * dt;
      y = Math.max(0, y + vy * dt);
      if (y === 0) vy = 0;
      speed = Math.min(360, speed + 8 * dt);
      for (const c of cacti) c.x -= speed * dt;
      cacti = cacti.filter((c) => c.x > -20);
      const lastC = cacti[cacti.length - 1];
      if (!lastC || lastC.x < W - 150 - Math.random() * 140) cacti.push({ x: W + 10, w: 10 + Math.floor(Math.random() * 10), h: 20 + Math.floor(Math.random() * 14) });
      // The dinosaur stands at x 40..64, from the ground up 26 px (minus the jump).
      const hit = cacti.some((c) => c.x < 62 && c.x + c.w > 44 && y < c.h - 2);
      if (hit && flash <= 0) {
        progress = Math.max(0, progress - 0.3);
        flash = 0.6;
        cacti = cacti.filter((c) => c.x > 120);
        say(T.dinoHit);
      }
      flash = Math.max(0, flash - dt);
      if (flash <= 0) progress = Math.min(1, progress + dt / RUN_TO_FILL);
      fill.style.width = `${(progress * 100).toFixed(1)}%`;
      if (progress >= 1) {
        done = true;
        label.textContent = T.dinoBack;
        window.setTimeout(onSolved, 350);
      }
    }
    draw();
    raf = requestAnimationFrame(frame);
  };

  const draw = () => {
    if (!ctx) return;
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#535353';
    ctx.fillRect(0, GROUND, W, 2);
    // A few specks of ground.
    for (let i = 0; i < 12; i++) ctx.fillRect((i * 37 + Math.floor(performance.now() / 8)) % W, GROUND + 6 + (i % 3) * 3, 3, 1);
    // The dinosaur: body, head, eye, legs. Blinks red when it runs into something.
    const top = GROUND - 26 - y;
    ctx.fillStyle = flash > 0 ? '#e5534b' : '#535353';
    ctx.fillRect(44, top + 8, 18, 14);
    ctx.fillRect(54, top, 14, 10);
    ctx.fillRect(40, top + 10, 6, 4);
    const step = Math.floor(performance.now() / 90) % 2;
    ctx.fillRect(46, top + 22, 4, y > 0 || step ? 4 : 2);
    ctx.fillRect(56, top + 22, 4, y > 0 || !step ? 4 : 2);
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(63, top + 2, 2, 2);
    ctx.fillStyle = '#535353';
    for (const c of cacti) {
      ctx.fillRect(c.x, GROUND - c.h, c.w, c.h);
      ctx.fillRect(c.x - 4, GROUND - c.h + 8, 4, 6);
      ctx.fillRect(c.x + c.w, GROUND - c.h + 12, 4, 6);
    }
  };

  raf = requestAnimationFrame(frame);
  return {
    el,
    wantsSpace: true,
    setTimeLeft: (sec) => {
      const t = T.dinoTimer.replace('{s}', String(Math.max(0, Math.ceil(sec))));
      if (timer.textContent !== t) timer.textContent = t;
    },
    close: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      el.remove();
    },
  };
}
