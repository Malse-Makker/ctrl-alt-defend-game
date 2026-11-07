// Towers are objects from your desk. Numbers come from the Godot version (scripts/tower.gd,
// v0.88), with pixels divided by 40 to get tiles. Interval is seconds between shots.
//
// BALANCE RULE: damage per Coffee must RISE with every upgrade level, so upgrading always beats
// buying a second copy. Range barely grows, so a second tower is still needed to cover a second
// stretch of the floor. tests/economy.test.ts checks this.

export type DamageClass = 'written' | 'in_person';
export type TowerRole = 'economy' | 'damage';
export type SidePath = 'overtime' | 'escalation';
export type TargetMode = 'first' | 'last' | 'closest' | 'farthest' | 'strongest' | 'weakest';

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

export interface TowerLevelDef {
  name: string;
  flavour: string;
  cost: number;
  range?: number;
  interval?: number;
  damage?: number;
  coffeeAmount?: number;
  coffeeInterval?: number;
}

export interface TowerDef {
  id: string;
  name: string;
  /** What it does, in one line. Every tower has its own verb. */
  verb: string;
  role: TowerRole;
  damageClass?: DamageClass;
  unlockLevel: number;
  sidePaths: boolean;
  levels: readonly [TowerLevelDef, TowerLevelDef, TowerLevelDef];
  /** Model file per upgrade level, in public/models. */
  models: readonly [string, string, string];
  accent: string;
}

export const SIDE_PATHS: Record<SidePath, { label: string; quote: string; steps: [string, string] }> = {
  overtime: {
    label: 'OVERTIME',
    quote: 'Just one more thing before I log off.',
    steps: ['20% faster', '+20% range'],
  },
  escalation: {
    label: 'ESCALATION',
    quote: "I'm going to have to loop in a few more people.",
    steps: ['+1 target per shot', '+25% damage'],
  },
};

export const TOWERS: Record<string, TowerDef> = {
  coffee: {
    id: 'coffee',
    name: 'Coffee Machine',
    verb: 'Makes Coffee every 5 seconds once the day has started. Does no damage at all.',
    role: 'economy',
    unlockLevel: 1,
    sidePaths: false,
    accent: '#c8423b',
    models: ['coffee_1', 'coffee_2', 'coffee_3'],
    levels: [
      { name: 'Coffee Machine', flavour: "It's something.", cost: 20, coffeeAmount: 1, coffeeInterval: 5 },
      { name: 'Espresso Machine', flavour: "Aaah, that's better.", cost: 20, coffeeAmount: 2, coffeeInterval: 5 },
      { name: 'Barista Station', flavour: 'Finally, some good coffee.', cost: 30, coffeeAmount: 4, coffeeInterval: 5 },
    ],
  },
  autoreply: {
    id: 'autoreply',
    name: 'Auto-Reply',
    verb: 'Fires a reply at one colleague at a time. Cheap and steady: the benchmark for everything else.',
    role: 'damage',
    damageClass: 'written',
    unlockLevel: 1,
    sidePaths: true,
    accent: '#3e7cc9',
    models: ['autoreply_1', 'autoreply_2', 'autoreply_3'],
    levels: [
      { name: 'Auto-Reply', flavour: "I'll get back to you.", cost: 14, range: 3.375, interval: 0.45, damage: 1.4 },
      { name: 'Out of Office', flavour: 'Currently unavailable. Forever.', cost: 12, range: 3.55, interval: 0.4, damage: 2.4 },
      { name: 'Inbox Zero', flavour: 'Nothing left to answer.', cost: 25, range: 3.75, interval: 0.32, damage: 4.0 },
    ],
  },
};

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
