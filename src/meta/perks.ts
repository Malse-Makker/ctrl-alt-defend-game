// The Recognition shop: perks bought between floors with what you earned on them. They only
// count in your own game; online everyone starts the same.

import type { GameOptions } from '../sim/game';
import { store, type SaveData } from './save';

export type PerkId = 'startup' | 'caffeine' | 'bulk' | 'smoke';

export interface PerkDef {
  id: PerkId;
  name: string;
  desc: string;
  cost: number;
  /** Bought one at a time and used up (Smoke Break); the others are yours for good. */
  consumable?: boolean;
  icon: string;
}

export const PERKS: readonly PerkDef[] = [
  { id: 'startup', name: 'Startup Budget', desc: '+15 Coffee at the start of every floor.', cost: 30, icon: 'sack-dollar' },
  { id: 'caffeine', name: 'Extra Caffeine', desc: '+10 Focus on every floor.', cost: 30, icon: 'mug-hot' },
  { id: 'bulk', name: 'Bulk Discount', desc: 'Every tower and upgrade costs 10% less.', cost: 55, icon: 'tags' },
  { id: 'smoke', name: 'Smoke Break', desc: 'Use it in the middle of a floor: +15 Focus, up to what you started with. Gone once used.', cost: 12, consumable: true, icon: 'smoking' },
];

/** Focus a Smoke Break gives back. */
export const SMOKE_FOCUS = 15;

/** What your perks do to a new game of your own. */
export function perkOptions(save: SaveData): Pick<GameOptions, 'extraCoffee' | 'extraFocus' | 'costMult'> {
  const has = (id: PerkId) => save.perks.includes(id);
  return {
    extraCoffee: has('startup') ? 15 : 0,
    extraFocus: has('caffeine') ? 10 : 0,
    costMult: has('bulk') ? 0.9 : 1,
  };
}

/** Buy a perk with Recognition. Returns why not, or null when it worked. */
export function buyPerk(save: SaveData, id: PerkId): string | null {
  const perk = PERKS.find((p) => p.id === id);
  if (!perk) return 'No such perk.';
  if (!perk.consumable && save.perks.includes(id)) return 'You have that one already.';
  if (save.recognition < perk.cost) return 'Not enough Recognition yet. Stars on your floors earn it.';
  save.recognition -= perk.cost;
  if (perk.consumable) save.smokes += 1;
  else save.perks.push(id);
  store(save);
  return null;
}
