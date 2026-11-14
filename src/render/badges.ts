// The icons from src/ui/badges.ts, drawn once each on a canvas and shared as sprite materials.
// Glyphs come from the icon font the menus already use, so a laptop here is the laptop in the shop.

import * as THREE from 'three';
import type { ColleagueBadge, TowerBadge } from '../ui/badges';

export type BadgeKind = ColleagueBadge | TowerBadge;

/** The two kinds of tower, the same colours as in the shop and the panel. */
export const CLASS_COLOR = { digital: '#4aa3ff', physical: '#d9a05b' } as const;

const FONT = '"Font Awesome 7 Free"';
const RED = '#e5534b';
const GREY = '#aab0bb';

interface Look {
  glyph: string;
  color: string;
  /** A red line through it: this does not work. */
  cross?: boolean;
  /** Text on top of the glyph (the box says how hard you have to hit). */
  label?: string;
  ring: string;
}

const LOOKS: Record<BadgeKind, Look> = {
  box: { glyph: '', color: '#c8995a', ring: '#6fb6ff' },
  hidden: { glyph: '', color: '#f6f3ea', ring: '#9a8cff' },
  taunt: { glyph: '!', color: '#1d2230', ring: '#f2c641' },
  chat: { glyph: '', color: '#f6f3ea', ring: RED },
  cry: { glyph: '', color: '#7cc4ff', ring: RED },
  net: { glyph: '', color: '#f6f3ea', cross: true, ring: RED },
  phone: { glyph: '', color: '#f6f3ea', ring: RED },
  audit: { glyph: '', color: '#f6f3ea', ring: RED },
  mop: { glyph: '', color: '#f2c641', ring: RED },
  'idle-hidden': { glyph: '', color: GREY, ring: GREY },
  'idle-sight': { glyph: '', color: GREY, ring: GREY },
};

const cache = new Map<BadgeKind, { mat: THREE.SpriteMaterial; draw: () => void }>();
let fontAsked = false;

function draw(c: HTMLCanvasElement, look: Look): void {
  const x = c.getContext('2d');
  if (!x) return;
  const n = c.width;
  x.clearRect(0, 0, n, n);
  // A dark coin with a coloured edge reads on both the light floor and a dark level.
  x.fillStyle = look.glyph === '!' ? look.ring : 'rgba(22, 26, 36, 0.88)';
  x.strokeStyle = look.ring;
  x.lineWidth = n * 0.06;
  x.beginPath();
  x.arc(n / 2, n / 2, n * 0.45, 0, Math.PI * 2);
  x.fill();
  x.stroke();
  x.fillStyle = look.color;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  if (look.glyph === '!') x.font = `900 ${n * 0.62}px system-ui, sans-serif`;
  else x.font = `900 ${n * 0.5}px ${FONT}`;
  x.fillText(look.glyph, n / 2, n / 2 + n * 0.02);
  if (look.label) {
    x.font = `800 ${n * 0.26}px system-ui, sans-serif`;
    x.fillStyle = '#1d2230';
    x.fillText(look.label, n / 2, n / 2 + n * 0.07);
  }
  if (look.cross) {
    x.strokeStyle = RED;
    x.lineWidth = n * 0.08;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(n * 0.26, n * 0.74);
    x.lineTo(n * 0.74, n * 0.26);
    x.stroke();
  }
}

export function badgeMaterial(kind: BadgeKind): THREE.SpriteMaterial {
  const hit = cache.get(kind);
  if (hit) return hit.mat;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const redraw = () => {
    draw(c, LOOKS[kind]);
    tex.needsUpdate = true;
  };
  redraw();
  cache.set(kind, { mat, draw: redraw });
  // The icon font may not be loaded yet the first time: draw everything again once it is.
  if (!fontAsked && typeof document !== 'undefined' && document.fonts) {
    fontAsked = true;
    document.fonts
      .load(`900 40px ${FONT}`)
      .then(() => {
        for (const b of cache.values()) b.draw();
      })
      .catch(() => undefined);
  }
  return mat;
}
