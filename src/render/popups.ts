// Floating numbers and words over the 3D scene (damage, Coffee, Focus lost, "BLOCKED").
// Plain DOM elements from a pool, positioned by projecting the world point every frame.

import type { View } from './view';

interface Popup {
  el: HTMLDivElement;
  x: number;
  y: number;
  h: number;
  age: number;
  life: number;
  rise: number;
  delay: number;
}

const MAX = 70;

export class Popups {
  private live: Popup[] = [];
  private pool: HTMLDivElement[] = [];

  constructor(
    private readonly layer: HTMLElement,
    private readonly view: View,
  ) {}

  /** Show text at a world point. kind picks the CSS style: dmg, coffee, focus, info, warn. */
  spawn(text: string, x: number, y: number, h: number, kind: string, opts: { life?: number; delay?: number; icon?: string } = {}): void {
    if (this.live.length >= MAX) {
      // Drop the oldest damage number first; never drop Focus or Coffee messages.
      const i = this.live.findIndex((p) => p.el.dataset.kind === 'dmg');
      if (i < 0) return;
      this.recycle(this.live.splice(i, 1)[0]);
    }
    const el = this.pool.pop() ?? document.createElement('div');
    el.className = `popup popup-${kind}`;
    el.dataset.kind = kind;
    el.textContent = '';
    if (opts.icon) {
      const i = document.createElement('i');
      i.className = opts.icon;
      el.append(i, ' ');
    }
    el.append(text);
    el.style.opacity = '0';
    this.layer.appendChild(el);
    this.live.push({ el, x, y, h, age: 0, life: opts.life ?? 0.9, rise: kind === 'dmg' ? 26 : 38, delay: opts.delay ?? 0 });
  }

  update(dt: number): void {
    const keep: Popup[] = [];
    for (const p of this.live) {
      if (p.delay > 0) {
        p.delay -= dt;
        keep.push(p);
        continue;
      }
      p.age += dt;
      const k = p.age / p.life;
      if (k >= 1) {
        this.recycle(p);
        continue;
      }
      const s = this.view.project(p.x, p.y, p.h);
      const lift = p.rise * Math.min(1, k * 1.6);
      p.el.style.transform = `translate(-50%, -100%) translate(${s.sx.toFixed(1)}px, ${(s.sy - lift).toFixed(1)}px)`;
      p.el.style.opacity = String(k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
      keep.push(p);
    }
    this.live = keep;
  }

  private recycle(p: Popup): void {
    p.el.remove();
    this.pool.push(p.el);
  }

  clear(): void {
    for (const p of this.live) this.recycle(p);
    this.live = [];
  }
}
