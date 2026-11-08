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
/** damage: shoots. pulse: hits everyone in range every few seconds (no damage). zone: works on everyone standing in it. */
export type TowerRole = 'economy' | 'damage' | 'pulse' | 'zone';
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
  /** Damage towers: each hit stops the target for this long (bosses resist). */
  stunOnHit?: number;
  // Pulse towers (Headphones)
  /** Slow factor while slowed (lowest counts). */
  slow?: number;
  slowTimeAdd?: number;
  /** A real stun of this many seconds (highest counts). */
  stun?: number;
  /** Colleagues hit take this much extra damage from every hit while slowed. */
  vulnerableAdd?: number;
  /** Stunned colleagues take this much more damage (2 = double). */
  stunnedTakes?: number;
  /** Towers in range fire this much faster (0.8 = 20% shorter reload; lowest counts). */
  buffRate?: number;
  /** The Chatterbox cannot silence this tower. */
  silenceProof?: boolean;
  // Zone towers (The Shredder)
  dotAdd?: number;
  dotMult?: number;
  /** Damage keeps going this many seconds after leaving the zone. */
  bleed?: number;
  /** Everyone in the zone takes the full damage instead of a share. */
  unshared?: boolean;
  /** Every few seconds everyone in the zone stops for a moment. */
  stunPulse?: { every: number; duration: number };
  /** Every few seconds everyone in range loses a share of their current HP (not bosses' full share). */
  hpPulse?: { every: number; share: number; bossShare: number };
  /** Coffee for every colleague this tower deals with. */
  killCoffee?: number;
  /** Coffee at the start of every wave, for the owner. */
  waveIncome?: number;
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
  /** Reaches the whole floor (Office Artillery). */
  global?: boolean;
  /** Pulse: slow factor and how long it lasts. */
  slow?: number;
  slowTime?: number;
  /** Zone: damage per second, shared over everyone inside. */
  dot?: number;
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
  headphones: {
    id: 'headphones',
    name: 'Headphones',
    flavour: "Can't quite hear you.",
    verb: 'Every few seconds everyone in range slows right down. No damage. Proper Noise Cancelling stuns, and shuts up the Chatterbox.',
    role: 'pulse',
    unlockLevel: 2,
    accent: '#6fcf7f',
    models: ['headphones_1', 'headphones_2', 'headphones_3'],
    base: { cost: 20, range: 3.0, interval: 3.0, slow: 0.65, slowTime: 1.6 },
    paths: [
      {
        name: 'NOISE CANCELLING',
        quote: 'Blissful silence.',
        color: '#6fcf7f',
        tiers: [
          { name: 'Over-Ear', desc: 'Slows harder and for longer.', cost: 22, effect: { slow: 0.45, slowTimeAdd: 0.6, intervalMult: 0.9 } },
          {
            name: 'Noise Cancelling',
            desc: 'A real stun of 1.5 seconds. The Chatterbox cannot talk these quiet, and it is the only thing that shuts him up.',
            cost: 35,
            effect: { stun: 1.5, silenceProof: true },
          },
          { name: 'Studio Monitors', desc: 'Stuns for 2.2 seconds, more often.', cost: 80, effect: { stun: 2.2, intervalMult: 0.8 } },
          { name: 'Soundproof Booth', desc: 'Stuns for 3 seconds, and stunned colleagues take double damage.', cost: 200, effect: { stun: 3, stunnedTakes: 2 } },
        ],
      },
      {
        name: 'VOLUME',
        quote: 'Can you hear me now?',
        color: '#7fb6e3',
        tiers: [
          { name: 'Volume Up', desc: '+20% range.', cost: 15, effect: { rangeMult: 1.2 } },
          { name: 'Bass Boost', desc: 'Pulses 25% more often.', cost: 25, effect: { intervalMult: 0.75 } },
          { name: 'Party Mode', desc: 'Everyone in range walks 25% slower all the time, between pulses too.', cost: 70, effect: { slowAura: 0.75 } },
          { name: 'Open-Plan Speakers', desc: 'Half again the range, and a pulse every 1.5 seconds.', cost: 180, effect: { rangeMult: 1.5, intervalMult: 0.6 } },
        ],
      },
      {
        name: 'FOCUS MUSIC',
        quote: 'Lo-fi beats to defend your desk to.',
        color: '#b48ce0',
        tiers: [
          { name: 'Lo-fi Beats', desc: 'Colleagues it slows take +1 damage from every hit.', cost: 15, effect: { vulnerableAdd: 1 } },
          { name: 'Brown Noise', desc: 'Reveals hidden colleagues in range.', cost: 25, effect: { seesHidden: true } },
          { name: 'Deep Focus', desc: '+2 more damage from every hit on colleagues it slows.', cost: 60, effect: { vulnerableAdd: 2 } },
          { name: 'Flow State', desc: 'Towers in range fire 25% faster.', cost: 170, effect: { buffRate: 0.8 } },
        ],
      },
    ],
  },
  artillery: {
    id: 'artillery',
    name: 'Office Artillery',
    flavour: 'Ow. That actually stung.',
    verb: 'Reaches the ENTIRE floor: it does not matter where you put it. Slow to reload, one enormous hit. Breaks through shields.',
    role: 'damage',
    damageClass: 'in_person',
    unlockLevel: 2,
    accent: '#e5534b',
    models: ['artillery_1', 'artillery_2', 'artillery_3'],
    base: { cost: 25, range: 99, interval: 3.2, damage: 15, global: true },
    paths: [
      {
        name: 'HEAVY DUTY',
        quote: "It's a Swingline.",
        color: '#e5534b',
        tiers: [
          { name: 'Stapler', desc: '+20 damage.', cost: 28, effect: { damageAdd: 20 } },
          { name: 'Heavy Duty Stapler', desc: '+20 damage.', cost: 40, effect: { damageAdd: 20 } },
          { name: 'Industrial Tacker', desc: '+45 damage, and it pins the target to the carpet for a second.', cost: 85, effect: { damageAdd: 45, stunOnHit: 1 } },
          { name: 'Nail Gun', desc: '+150 damage, and it goes through two more colleagues standing behind the target.', cost: 230, effect: { damageAdd: 150, splash: 2 } },
        ],
      },
      {
        name: 'RAPID FIRE',
        quote: 'Out of staples. Again.',
        color: '#e5a04b',
        tiers: [
          { name: 'Spring Loaded', desc: 'Reloads 40% faster.', cost: 15, effect: { intervalMult: 0.7 } },
          { name: 'Double Staple', desc: 'Reloads 40% faster again.', cost: 25, effect: { intervalMult: 0.7 } },
          { name: 'Staple Spray', desc: 'Hits 3 colleagues per shot.', cost: 75, effect: { targetsAdd: 2 } },
          { name: 'Auto Stapler', desc: 'Reloads more than twice as fast.', cost: 210, effect: { intervalMult: 0.4 } },
        ],
      },
      {
        name: 'PRECISION',
        quote: 'Measure twice, staple once.',
        color: '#b48ce0',
        tiers: [
          { name: 'Reading Glasses', desc: 'Can see hidden colleagues.', cost: 15, effect: { seesHidden: true } },
          { name: 'Weak Spot', desc: '+10 damage.', cost: 25, effect: { damageAdd: 10 } },
          { name: 'Expense the Staples', desc: 'Every colleague it deals with pays 2 extra Coffee.', cost: 60, effect: { killCoffee: 2 } },
          { name: 'Supply Drop', desc: '+20 Coffee at the start of every wave, and 1 more per colleague it deals with (3 in total).', cost: 170, effect: { waveIncome: 20, killCoffee: 1 } },
        ],
      },
    ],
  },
  shredder: {
    id: 'shredder',
    name: 'The Shredder',
    flavour: 'Round filing.',
    verb: 'A zone that slows everyone in it and reveals hidden colleagues. Its damage is shared over everyone inside. It may not touch the Old Guard archive.',
    role: 'zone',
    damageClass: 'in_person',
    unlockLevel: 2,
    accent: '#3fa7a0',
    models: ['shredder_1', 'shredder_2', 'shredder_3'],
    base: { cost: 30, range: 2.375, dot: 2, slow: 0.6 },
    paths: [
      {
        name: 'CROSS-CUT',
        quote: 'Cross-cut, obviously.',
        color: '#3fa7a0',
        tiers: [
          { name: 'Paper Shredder', desc: '+3 damage per second.', cost: 30, effect: { dotAdd: 3 } },
          { name: 'Micro-Cut', desc: '+4 damage per second.', cost: 40, effect: { dotAdd: 4 } },
          { name: 'Sticky Paper', desc: 'Damage keeps going for 3 seconds after leaving the zone.', cost: 90, effect: { bleed: 3 } },
          { name: 'Industrial Shredder', desc: 'Two and a half times the damage, and everyone inside takes all of it.', cost: 230, effect: { dotMult: 2.5, unshared: true } },
        ],
      },
      {
        name: 'PAPER JAM',
        quote: 'PC LOAD LETTER.',
        color: '#e5a04b',
        tiers: [
          { name: 'Jam', desc: 'Slows harder.', cost: 20, effect: { slow: 0.45 } },
          { name: 'Bigger Bin', desc: '+25% zone size.', cost: 30, effect: { rangeMult: 1.25 } },
          { name: 'Paper Jam', desc: 'Every 6 seconds, everyone in the zone stops for a second.', cost: 80, effect: { stunPulse: { every: 6, duration: 1 } } },
          { name: 'Out of Order', desc: 'Slows to a crawl, and the zone grows again.', cost: 180, effect: { slow: 0.25, rangeMult: 1.3 } },
        ],
      },
      {
        name: 'CONFIDENTIAL',
        quote: 'For your eyes only. And the bin.',
        color: '#7fb6e3',
        tiers: [
          { name: 'Recycling', desc: 'Every colleague dealt with by the zone pays 1 extra Coffee.', cost: 15, effect: { killCoffee: 1 } },
          { name: 'Confidential Bin', desc: '+2 damage per second.', cost: 25, effect: { dotAdd: 2 } },
          { name: 'Compactor', desc: '+3 damage per second, and 2 more Coffee per colleague it deals with.', cost: 60, effect: { dotAdd: 3, killCoffee: 2 } },
          { name: 'Document Destruction', desc: 'Every 10 seconds, everyone in the zone loses a quarter of their HP (bosses 5%).', cost: 170, effect: { hpPulse: { every: 10, share: 0.25, bossShare: 0.05 } } },
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
export const SHOP_ORDER: readonly string[] = ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder'];

/** Towers that exist in the design but are not built yet, so the shop can say when they arrive. */
export const UPCOMING_TOWERS: readonly { name: string; unlockLevel: number }[] = [
  { name: 'Quick Reply', unlockLevel: 3 },
  { name: 'Thumbtacks', unlockLevel: 4 },
  { name: 'Self-Service', unlockLevel: 4 },
  { name: 'Keyboard Smash', unlockLevel: 5 },
  { name: 'Reply All', unlockLevel: 6 },
  { name: 'Delegation', unlockLevel: 7 },
  { name: 'Pomodoro Timer', unlockLevel: 8 },
  { name: 'Motivational Poster', unlockLevel: 9 },
];
