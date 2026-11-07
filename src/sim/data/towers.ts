// Towers are objects from your desk. Base numbers come from the Godot version (scripts/tower.gd,
// v0.88), pixels divided by 40 to get tiles. Interval is seconds between shots.
//
// UPGRADES work like Bloons TD 6 (decided 2026-11-07): three paths of four tiers. One path may go
// to tier 4, a second path to tier 2, the third stays shut (4-2-0, 2-0-4, 0-4-2 ...). Tier 3 changes
// what the tower does, tier 4 is the showpiece.
//
// BALANCE RULE: damage per Coffee rises the further you upgrade, so investing in one tower beats
// buying a second copy. Range barely grows, so a second tower is still needed to cover a second
// stretch of the floor. tests/economy.test.ts checks this.

export type DamageClass = 'written' | 'in_person';
export type TowerRole = 'economy' | 'damage';
export type TargetMode = 'first' | 'last' | 'closest' | 'farthest' | 'strongest' | 'weakest';
export type Tiers = [number, number, number];

export const MAX_TIER = 4;
/** The second path may go this far once another path is past it. */
export const SECOND_PATH_MAX = 2;

export const TARGET_MODES: readonly TargetMode[] = ['first', 'last', 'closest', 'farthest', 'strongest', 'weakest'];

export const TARGET_LABELS: Record<TargetMode, string> = {
  first: 'First',
  last: 'Last',
  closest: 'Closest',
  farthest: 'Farthest',
  strongest: 'Most HP',
  weakest: 'Least HP',
};

export const TARGET_HELP: Record<TargetMode, string> = {
  first: 'Whoever is closest to your desk.',
  last: 'Whoever just walked in.',
  closest: 'Whoever is nearest to this tower.',
  farthest: 'Whoever is furthest away, but still in range.',
  strongest: 'Whoever has the most HP left.',
  weakest: 'Whoever has the least HP left.',
};

/** What an upgrade changes. Adds are applied before multipliers; later tiers stack on earlier ones. */
export interface Effect {
  damageAdd?: number;
  damageMult?: number;
  intervalMult?: number;
  rangeMult?: number;
  targetsAdd?: number;
  /** Extra colleagues hit who stand right next to the target. */
  splash?: number;
  /** The shot jumps on to this many more colleagues after hitting. */
  bounce?: number;
  seesHidden?: boolean;
  /** Damage multiplier against bosses (the highest one owned counts). */
  bossMult?: number;
  /** Colleagues in range walk at this speed factor (the lowest one around counts). */
  slowAura?: number;
  /** Every few seconds: everyone in range loses a share of their current HP. */
  ability?: { every: number; hpShare: number; bossShare: number };
  // Economy
  coffeeAdd?: number;
  coffeeMult?: number;
  /** Brewing goes into a pot with interest instead of straight to you. Click Claim to cash it. */
  bank?: { interest: number; cap: number; perWave: number };
  /** Colleagues dealt with in range pay this much extra (0.5 = +50%). */
  tip?: number;
  /** Every colleague dealt with anywhere pays this much extra. */
  tipEverywhere?: number;
}

export interface UpgradeDef {
  name: string;
  /** What it does, in one plain line. */
  desc: string;
  cost: number;
  effect: Effect;
}

export interface PathDef {
  name: string;
  quote: string;
  color: string;
  tiers: readonly [UpgradeDef, UpgradeDef, UpgradeDef, UpgradeDef];
}

export interface TowerBase {
  cost: number;
  range: number;
  interval?: number;
  damage?: number;
  coffeeAmount?: number;
  coffeeInterval?: number;
}

export interface TowerDef {
  id: string;
  name: string;
  flavour: string;
  /** What it does, in one line. Every tower has its own verb. */
  verb: string;
  role: TowerRole;
  damageClass?: DamageClass;
  unlockLevel: number;
  base: TowerBase;
  paths: readonly [PathDef, PathDef, PathDef];
  /** Model per stage: base, mid (a path at tier 2-3), top (a path at tier 4). */
  models: readonly [string, string, string];
  accent: string;
}

export const TOWERS: Record<string, TowerDef> = {
  coffee: {
    id: 'coffee',
    name: 'Coffee Machine',
    flavour: "It's something.",
    verb: 'Makes Coffee every 5 seconds once the day has started. Does no damage at all.',
    role: 'economy',
    unlockLevel: 1,
    accent: '#c8423b',
    models: ['coffee_1', 'coffee_2', 'coffee_3'],
    base: { cost: 20, range: 2.5, coffeeAmount: 1, coffeeInterval: 5 },
    paths: [
      {
        name: 'BREWING',
        quote: "Aaah, that's better.",
        color: '#d9a05b',
        tiers: [
          { name: 'Bigger Pot', desc: '+1 Coffee per brew.', cost: 15, effect: { coffeeAdd: 1 } },
          { name: 'Espresso Machine', desc: 'Brews 25% faster.', cost: 20, effect: { intervalMult: 0.8 } },
          { name: 'Barista Station', desc: 'Twice the Coffee per brew.', cost: 60, effect: { coffeeMult: 2 } },
          { name: 'Coffee Subscription', desc: 'Twice the Coffee again.', cost: 170, effect: { coffeeMult: 2 } },
        ],
      },
      {
        name: 'EXPENSE CLAIM',
        quote: 'Submit by the end of the quarter. Finance does not do exceptions.',
        color: '#7fb6e3',
        tiers: [
          {
            name: 'Petty Cash',
            desc: 'Brews go into a pot instead. +3 and 10% interest every wave, up to 60. Claim it yourself.',
            cost: 25,
            effect: { bank: { interest: 0.1, cap: 60, perWave: 3 } },
          },
          { name: 'Expense Report', desc: 'Pot: +5 and 15% interest per wave, up to 140.', cost: 30, effect: { bank: { interest: 0.15, cap: 140, perWave: 5 } } },
          { name: 'Corporate Card', desc: 'Pot: +8 and 20% interest per wave, up to 300.', cost: 45, effect: { bank: { interest: 0.2, cap: 300, perWave: 8 } } },
          { name: 'Offshore Account', desc: 'Pot: +12 and 25% interest per wave, up to 700.', cost: 120, effect: { bank: { interest: 0.25, cap: 700, perWave: 12 } } },
        ],
      },
      {
        name: 'VENDING',
        quote: 'Exact change only.',
        color: '#6fcf7f',
        tiers: [
          { name: 'Tip Jar', desc: 'Colleagues dealt with in range pay 25% more Coffee.', cost: 15, effect: { tip: 0.25 } },
          { name: 'Loyalty Card', desc: 'They pay 50% more, and the range grows.', cost: 25, effect: { tip: 0.25, rangeMult: 1.2 } },
          { name: 'Coffee Cart', desc: 'They pay double, and the machine brews +1.', cost: 60, effect: { tip: 0.5, coffeeAdd: 1 } },
          { name: 'Franchise', desc: 'Everyone dealt with anywhere pays 50% more. In range: +150%.', cost: 160, effect: { tip: 0.5, tipEverywhere: 0.5 } },
        ],
      },
    ],
  },
  autoreply: {
    id: 'autoreply',
    name: 'Auto-Reply',
    flavour: "I'll get back to you.",
    verb: 'Fires a reply at one colleague at a time. Cheap and steady: the benchmark for everything else.',
    role: 'damage',
    damageClass: 'written',
    unlockLevel: 1,
    accent: '#3e7cc9',
    models: ['autoreply_1', 'autoreply_2', 'autoreply_3'],
    base: { cost: 14, range: 3.375, interval: 0.45, damage: 1.4 },
    paths: [
      {
        name: 'TEMPLATES',
        quote: 'As per my last email.',
        color: '#e5a04b',
        tiers: [
          { name: 'Canned Response', desc: '+1 damage per reply.', cost: 12, effect: { damageAdd: 1 } },
          { name: 'Mail Merge', desc: '+1 damage, and each reply also hits one colleague standing next to the target.', cost: 18, effect: { damageAdd: 1, splash: 1 } },
          { name: 'Out of Office', desc: '+2 damage, and every reply bounces on to 2 more colleagues.', cost: 50, effect: { damageAdd: 2, bounce: 2 } },
          {
            name: 'Inbox Zero',
            desc: '+4 damage. Every 8 seconds, everyone in range loses half their HP (bosses 10%).',
            cost: 110,
            effect: { damageAdd: 4, ability: { every: 8, hpShare: 0.5, bossShare: 0.1 } },
          },
        ],
      },
      {
        name: 'RULES',
        quote: 'Just one more thing before I log off.',
        color: '#7fb6e3',
        tiers: [
          { name: 'Keyboard Shortcuts', desc: 'Replies 40% faster.', cost: 8, effect: { intervalMult: 0.7 } },
          { name: 'Inbox Rules', desc: 'Replies 40% faster again.', cost: 14, effect: { intervalMult: 0.7 } },
          { name: 'Auto-Forward', desc: 'Replies to 2 colleagues at once, +1 damage, and faster again.', cost: 50, effect: { targetsAdd: 1, damageAdd: 1, intervalMult: 0.75 } },
          { name: 'Filter Everything', desc: 'Replies to 4 colleagues at once, twice as fast.', cost: 130, effect: { targetsAdd: 2, intervalMult: 0.5 } },
        ],
      },
      {
        name: 'READ RECEIPTS',
        quote: "I'm going to have to loop in a few more people.",
        color: '#b48ce0',
        tiers: [
          { name: 'Read Receipt', desc: '+20% range.', cost: 8, effect: { rangeMult: 1.2 } },
          { name: 'Tracking Pixel', desc: '+10% range, and it can see colleagues nobody else can.', cost: 15, effect: { rangeMult: 1.1, seesHidden: true } },
          { name: 'CC Your Manager', desc: '+1 damage, and triple damage against bosses.', cost: 40, effect: { damageAdd: 1, bossMult: 3 } },
          { name: 'Legal Hold', desc: '+1 damage, everyone in range walks 30% slower, and four times the damage against bosses.', cost: 100, effect: { damageAdd: 1, slowAura: 0.7, bossMult: 4 } },
        ],
      },
    ],
  },
};

/** Model for the current upgrades: base, mid (any path at 2-3), top (any path at 4). */
export function modelFor(def: TowerDef, tiers: Tiers): string {
  const top = Math.max(...tiers);
  return def.models[top >= 4 ? 2 : top >= 2 ? 1 : 0];
}

/** Why a path cannot go up (or null if it can). Pure, so the UI and the server agree. */
export function pathBlock(tiers: Tiers, path: number): string | null {
  if (tiers[path] >= MAX_TIER) return 'This path is complete.';
  const next = [...tiers] as Tiers;
  next[path]++;
  if (next.filter((t) => t > 0).length > 2) return 'Two paths are already in use on this tower.';
  if (next.filter((t) => t > SECOND_PATH_MAX).length > 1) return `Only one path can go past tier ${SECOND_PATH_MAX}.`;
  return null;
}

/** All upgrades bought so far, in path order, each tier once. */
export function boughtEffects(def: TowerDef, tiers: Tiers): Effect[] {
  const out: Effect[] = [];
  def.paths.forEach((p, i) => {
    for (let t = 0; t < tiers[i]; t++) out.push(p.tiers[t].effect);
  });
  return out;
}

/** The full tower order in the shop (unlock order). Later towers get added here. */
export const SHOP_ORDER: readonly string[] = ['coffee', 'autoreply'];

/** Towers that exist in the design but are not built yet, so the shop can say when they arrive. */
export const UPCOMING_TOWERS: readonly { name: string; unlockLevel: number }[] = [
  { name: 'Headphones', unlockLevel: 2 },
  { name: 'Office Artillery', unlockLevel: 2 },
  { name: 'The Shredder', unlockLevel: 2 },
  { name: 'Quick Reply', unlockLevel: 3 },
  { name: 'Thumbtacks', unlockLevel: 4 },
  { name: 'Self-Service', unlockLevel: 4 },
  { name: 'Keyboard Smash', unlockLevel: 5 },
  { name: 'Reply All', unlockLevel: 6 },
  { name: 'Delegation', unlockLevel: 7 },
  { name: 'Pomodoro Timer', unlockLevel: 8 },
  { name: 'Motivational Poster', unlockLevel: 9 },
];
