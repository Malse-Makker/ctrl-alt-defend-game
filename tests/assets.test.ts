// Every model, icon and sound the data points at must exist, and be in the loader's list.
// A missing one would only show up in the browser as a grey box or silence.

import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOUNDS } from '../src/audio/sfx';
import { MODEL_NAMES } from '../src/render/assets';
import { COLLEAGUES } from '../src/sim/data/colleagues';
import { LEVELS } from '../src/sim/data/levels';
import { TOWERS, modelFor, type TowerDef } from '../src/sim/data/towers';

const loaded = new Set<string>(MODEL_NAMES);
const towerModels = (def: TowerDef) => [...def.models, ...(def.pathModels ?? []).flat()];

describe('assets', () => {
  it('every tower model is loaded, built and has an icon', () => {
    for (const def of Object.values(TOWERS)) {
      for (const m of towerModels(def)) {
        expect(loaded.has(m), `${def.id}: ${m} in MODEL_NAMES`).toBe(true);
        expect(existsSync(`public/models/${m}.glb`), `${m}.glb`).toBe(true);
        expect(existsSync(`public/icons/${m}.png`), `${m}.png`).toBe(true);
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

  it('every sound has a file', () => {
    for (const s of SOUNDS) expect(existsSync(`public/sfx/${s}.wav`), `${s}.wav`).toBe(true);
  });

  it('a tower takes on the look of its leading path at tier 3 and 4', () => {
    const def = {
      ...TOWERS.shredder,
      pathModels: [
        ['a3', 'a4'],
        ['b3', 'b4'],
        ['c3', 'c4'],
      ],
    } as TowerDef;
    expect(modelFor(def, [0, 0, 0])).toBe(def.models[0]);
    expect(modelFor(def, [2, 1, 0])).toBe(def.models[1]);
    expect(modelFor(def, [2, 3, 0])).toBe('b3');
    expect(modelFor(def, [0, 2, 4])).toBe('c4');
    // Without its own looks a tower keeps the old base / mid / top models.
    expect(modelFor(TOWERS.autoreply, [4, 2, 0])).toBe(TOWERS.autoreply.models[2]);
  });
});
