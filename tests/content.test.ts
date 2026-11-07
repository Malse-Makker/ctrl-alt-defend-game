// Content checks: things the Godot version got wrong at least once.

import { describe, expect, it } from 'vitest';
import { COLLEAGUES } from '../src/sim/data/colleagues';
import { LEVELS, LEVEL_NAMES } from '../src/sim/data/levels';
import { TARGET_HELP, TARGET_LABELS, TOWERS } from '../src/sim/data/towers';
import { Game } from '../src/sim/game';
import { Path } from '../src/sim/geometry';
import { parseWave } from '../src/sim/waves';
import { UI_TEXT } from '../src/ui/text';

function allStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => allStrings(x, out));
  return out;
}

describe('player-facing text', () => {
  const texts = allStrings([TOWERS, COLLEAGUES, LEVELS, LEVEL_NAMES, TARGET_LABELS, TARGET_HELP, UI_TEXT]);

  it('has no em-dashes or en-dashes', () => {
    const bad = texts.filter((t) => /[–—]/.test(t));
    expect(bad).toEqual([]);
  });

  it('is plain ASCII, so the font can always draw it (no emoji, no fancy quotes)', () => {
    const bad = texts.filter((t) => /[^\x20-\x7e\n]/.test(t));
    expect(bad).toEqual([]);
  });
});

describe('wave specs', () => {
  it('parse strictly', () => {
    expect(parseWave('intern:5@0.80 + newhire:2@1.20')).toEqual([
      { type: 'intern', count: 5, interval: 0.8 },
      { type: 'newhire', count: 2, interval: 1.2 },
    ]);
    for (const bad of ['intern:5@', 'intern5@1', 'ghost:1@1', 'intern:5@0.8*2', 'intern:0@1', '']) {
      expect(() => parseWave(bad), bad).toThrow();
    }
  });
});

describe('levels', () => {
  for (const level of Object.values(LEVELS)) {
    describe(`L${level.id} ${level.name}`, () => {
      it('every wave parses and the last wave has the boss', () => {
        const waves = level.waves.map(parseWave);
        expect(waves.length).toBeGreaterThanOrEqual(15);
        const last = waves[waves.length - 1];
        expect(last.some((g) => COLLEAGUES[g.type].boss)).toBe(true);
      });

      it('only uses towers that exist and are unlocked by now', () => {
        for (const id of level.towers) {
          expect(TOWERS[id], id).toBeDefined();
          expect(TOWERS[id].unlockLevel).toBeLessThanOrEqual(level.id);
        }
      });

      it('routes end at your desk and stay inside the office after the door', () => {
        for (const pts of level.paths) {
          const path = new Path(pts);
          const end = pts[pts.length - 1];
          expect(Math.hypot(end.x - (level.desk.x + 0.5), end.y - (level.desk.y + 0.5))).toBeLessThanOrEqual(0.75);
          for (const p of pts.slice(1)) {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThanOrEqual(level.size.w);
            expect(p.y).toBeLessThanOrEqual(level.size.h);
          }
          expect(path.length).toBeGreaterThan(10);
        }
      });

      it('furniture never stands on the walkway', () => {
        const g = new Game(level);
        for (const d of level.decor) {
          for (let y = d.rect.y; y < d.rect.y + d.rect.h; y++) {
            for (let x = d.rect.x; x < d.rect.x + d.rect.w; x++) {
              expect(g.isPathTile(x, y), `${d.model} at ${x},${y}`).toBe(false);
              expect(g.inBounds(x, y)).toBe(true);
            }
          }
        }
      });

      it('has enough room to build next to the walkway', () => {
        const g = new Game(level);
        let spots = 0;
        for (let y = 0; y < level.size.h; y++) {
          for (let x = 0; x < level.size.w; x++) if (g.canPlace('autoreply', x, y).ok || g.canPlace('autoreply', x, y).reason === 'Not enough Coffee.') spots++;
        }
        expect(spots).toBeGreaterThan(30);
      });
    });
  }
});
