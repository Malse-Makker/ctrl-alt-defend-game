// The upgrade buttons say what changes in numbers. Those numbers come from computeStats.

import { describe, expect, it } from 'vitest';
import { TOWERS } from '../src/sim/data/towers';
import { upgradeDiff } from '../src/ui/statdiff';

describe('upgrade differences', () => {
  it('a bigger number says before and after', () => {
    const d = upgradeDiff(TOWERS.artillery, [0, 0, 0], 0);
    expect(d).toContainEqual({ label: 'Damage', text: '15 > 35', isNew: false });
  });

  it('a reload says seconds, shorter after', () => {
    const d = upgradeDiff(TOWERS.artillery, [0, 0, 0], 1);
    expect(d).toContainEqual({ label: 'Reload', text: '3.2s > 2.2s', isNew: false });
  });

  it('something the tower did not do before is NEW', () => {
    const d = upgradeDiff(TOWERS.artillery, [2, 0, 0], 0);
    expect(d.find((c) => c.isNew)?.text).toMatch(/stops on hit/);
    expect(upgradeDiff(TOWERS.autoreply, [0, 0, 1], 2).some((c) => c.isNew && c.text === 'sees hidden colleagues')).toBe(true);
  });

  it('a fully upgraded path changes nothing', () => {
    expect(upgradeDiff(TOWERS.artillery, [4, 0, 0], 0)).toEqual([]);
  });

  it('every damaging upgrade of a damage tower shows at least one number', () => {
    for (const def of Object.values(TOWERS)) {
      def.paths.forEach((path, p) => {
        path.tiers.forEach((tier, i) => {
          if (!tier.effect.damageAdd && !tier.effect.damageMult) return;
          const tiers: [number, number, number] = [0, 0, 0];
          tiers[p] = i;
          expect(upgradeDiff(def, tiers, p).length, `${def.id} ${tier.name}`).toBeGreaterThan(0);
        });
      });
    }
  });

  it('never prints a zero reload or a broken number', () => {
    for (const def of Object.values(TOWERS)) {
      for (let p = 0; p < 3; p++) {
        const tiers: [number, number, number] = [0, 0, 0];
        for (let i = 0; i < def.paths[p].tiers.length; i++) {
          for (const c of upgradeDiff(def, tiers, p)) {
            expect(c.text, `${def.id} p${p} t${i + 1}`).not.toMatch(/NaN|Infinity|> 0s|undefined/);
          }
          tiers[p]++;
        }
      }
    }
  });
});
