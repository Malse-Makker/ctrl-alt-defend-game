// Every model, icon and sound the data points at must exist, and be in the loader's list.
// A missing one would only show up in the browser as a grey box or silence.

import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOUNDS, typingGain, typingRate } from '../src/audio/sfx';
import { MODEL_NAMES } from '../src/render/assets';
import { COLLEAGUES } from '../src/sim/data/colleagues';
import { LEVELS } from '../src/sim/data/levels';
import { TOWERS, coreModel, modelFor, modulesFor, towerParts } from '../src/sim/data/towers';

const loaded = new Set<string>(MODEL_NAMES);

describe('assets', () => {
  it('every part of every tower is loaded and built; the core and the heroes have an icon', () => {
    for (const def of Object.values(TOWERS)) {
      const parts = towerParts(def);
      expect(parts.length, def.id).toBe(13);
      for (const m of parts) {
        expect(loaded.has(m), `${def.id}: ${m} in MODEL_NAMES`).toBe(true);
        expect(existsSync(`public/models/${m}.glb`), `${m}.glb`).toBe(true);
        if (!m.includes('_m')) expect(existsSync(`public/icons/${m}.png`), `${m}.png`).toBe(true);
      }
    }
  });

  it('the old models and floor props are gone', () => {
    for (const def of Object.values(TOWERS)) {
      for (const old of [`${def.id}_1`, `${def.id}_2`, `${def.id}_3`, `prop_${def.id}_p0`]) {
        expect(loaded.has(old), old).toBe(false);
        expect(existsSync(`public/models/${old}.glb`), `${old}.glb`).toBe(false);
      }
    }
  });

  it('every colleague and every piece of decor is loaded and built', () => {
    for (const def of Object.values(COLLEAGUES)) {
      expect(loaded.has(def.model), def.model).toBe(true);
      expect(existsSync(`public/models/${def.model}.glb`), `${def.model}.glb`).toBe(true);
      expect(existsSync(`public/icons/${def.model}.png`), `${def.model}.png`).toBe(true);
    }
    for (const level of Object.values(LEVELS)) {
      for (const d of level.decor) {
        expect(loaded.has(d.model), `${level.name}: ${d.model}`).toBe(true);
        expect(existsSync(`public/models/${d.model}.glb`), `${d.model}.glb`).toBe(true);
      }
    }
  });

  it('the projector mini-game has every picture it switches between', () => {
    for (const n of ['none', 'vga', 'pwr', 'both']) expect(existsSync(`public/ui/projector_${n}.png`), n).toBe(true);
    for (const n of ['vga', 'pwr']) expect(existsSync(`public/ui/plug_${n}.png`), n).toBe(true);
  });

  it('every sound has a file, and every sound file is one the game plays', () => {
    for (const s of SOUNDS) expect(existsSync(`public/sfx/${s}.wav`), `${s}.wav`).toBe(true);
    // A file nobody loads is a sound that was made and then forgotten.
    const known = new Set<string>(SOUNDS);
    for (const f of readdirSync('public/sfx').filter((x) => x.endsWith('.wav'))) expect(known.has(f.replace('.wav', '')), `${f} is not in SOUNDS`).toBe(true);
  });

  it('every combination is put together from the parts: a hero at tier 3 and 4, modules for the rest', () => {
    const def = TOWERS.headphones;
    expect(modelFor(def, [0, 0, 0])).toBe(coreModel(def));
    expect(modulesFor(def, [0, 0, 0])).toEqual([]);
    // 1-2-0: the core, with the module of each path in its slot.
    expect(modelFor(def, [1, 2, 0])).toBe('headphones_core');
    expect(modulesFor(def, [1, 2, 0])).toEqual([
      { path: 0, model: 'headphones_m0_1' },
      { path: 1, model: 'headphones_m1_2' },
    ]);
    // 0-2-3: the hero of the third path; its own module goes, the second path's stays.
    expect(modelFor(def, [0, 2, 3])).toBe('headphones_p2_3');
    expect(modulesFor(def, [0, 2, 3])).toEqual([{ path: 1, model: 'headphones_m1_2' }]);
    expect(modelFor(def, [4, 0, 0])).toBe('headphones_p0_4');
    expect(modulesFor(def, [4, 0, 0])).toEqual([]);
  });

  it('all 49 combinations of the 4-2-0 rule look different', () => {
    const looks = new Set<string>();
    for (let a = 0; a <= 4; a++)
      for (let b = 0; b <= 4; b++)
        for (let c = 0; c <= 4; c++) {
          const t = [a, b, c] as [number, number, number];
          const used = t.filter((x) => x > 0).length;
          if (used > 2 || t.filter((x) => x > 2).length > 1) continue;
          looks.add(`${modelFor(TOWERS.coffee, t)}+${modulesFor(TOWERS.coffee, t).map((m) => m.model).join('+')}`);
        }
    expect(looks.size).toBe(49);
  });

  it('the typing in the background speeds up and gets louder as Focus runs out', () => {
    expect(typingRate(1)).toBeGreaterThan(typingRate(0.5));
    expect(typingRate(0.5)).toBeGreaterThan(typingRate(0));
    expect(typingGain(1)).toBeGreaterThan(typingGain(0) * 3);
    // Never silent and never past the clamp.
    expect(typingGain(0)).toBeGreaterThan(0);
    expect(typingRate(5)).toBe(typingRate(1));
  });
});
