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
/**
 * damage: shoots. pulse: hits everyone in range every few seconds (no damage). zone: works on
 * everyone standing in it. trap: drops piles on the walkway that hit whoever walks over them.
 * smash: slams the walkway and leaves a barrier. chair: rolls down a straight lane and back.
 */
export type TowerRole = 'economy' | 'damage' | 'pulse' | 'zone' | 'trap' | 'smash' | 'chair';
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

/** Thumbtacks do not aim: the mode picks which part of the walkway in range gets the piles. */
export const TRAP_TARGET_MODES: readonly TargetMode[] = ['first', 'last', 'closest', 'farthest', 'strongest'];

export const TRAP_TARGET_LABELS: Partial<Record<TargetMode, string>> = {
  first: 'Near desk',
  last: 'Near door',
  closest: 'Close by',
  farthest: 'Far out',
  strongest: 'Anywhere',
};

export const TRAP_TARGET_HELP: Partial<Record<TargetMode, string>> = {
  first: 'Piles land on the stretch of its range closest to your desk.',
  last: 'Piles land on the stretch of its range closest to the door.',
  closest: 'Piles land right next to it.',
  farthest: 'Piles land as far away as it reaches.',
  strongest: 'Piles land anywhere in range.',
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
  /** Pulse towers: each pulse pushes colleagues back this many tiles (bosses a fifth; highest counts). */
  knockback?: number;
  /** Every few seconds: everyone in range loses a share of their current HP. */
  ability?: { every: number; hpShare: number; bossShare: number };
  // Economy
  coffeeAdd?: number;
  coffeeMult?: number;
  /** Brewing goes into a pot with interest instead of straight to you. Click Claim to cash it. */
  bank?: { interest: number; cap: number; perWave: number; claimAll?: boolean };
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
  // Ramping towers (Quick Reply)
  /** Extra damage per hit on the same target (0.06 = +6% each time). */
  rampAdd?: number;
  /** Highest damage multiplier the ramp reaches (highest counts). */
  rampMax?: number;
  /** Share of the ramp kept when switching to a new target (highest counts). */
  rampKeep?: number;
  /** Each hit slows the target a little for a moment. */
  slowOnHit?: { mult: number; time: number };
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
  // Trap towers (Thumbtacks)
  /** More tacks in every pile: each tack hits one colleague. */
  pierceAdd?: number;
  /** Piles stay on the floor this much longer (2 = twice as long). */
  pileLifeMult?: number;
  /** Extra piles per drop. */
  pilesAdd?: number;
  /** Hits get through a shield no matter how light they are (the Old Guard's archive box). */
  ignoresMinHit?: boolean;
  /** Reply All: a wider circle around the target. */
  aoeMult?: number;
  // Keyboard Smash
  /** Bigger slam. */
  radiusMult?: number;
  barrierHpAdd?: number;
  barrierHpMult?: number;
  barrierTimeAdd?: number;
  /** Colleagues pushing against the barrier take this much damage per second. */
  barrierThorns?: number;
  /** Every smash comes twice. */
  doubleSmash?: boolean;
  // The office chair
  chairHpAdd?: number;
  chairHpMult?: number;
  /** Extra tiles of lane. */
  rangeAdd?: number;
  speedMult?: number;
  /** It also hits colleagues on the way back. */
  rollBack?: boolean;
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
  /** Keyboard Smash: slam radius, and the barrier it leaves (HP and seconds). */
  smashRadius?: number;
  barrierHp?: number;
  barrierTime?: number;
  /** Office chair: how much it can plough through per run, and how fast it rolls (tiles/s). */
  chairHp?: number;
  rollSpeed?: number;
  /** How many colleagues one shot hits (Self-Service answers everyone around it). */
  targets?: number;
  /** Reply All: everyone within this distance of the target is hit too, as many as there are. */
  aoe?: number;
  /** Trap: tacks per pile, and how long a pile stays on the floor. */
  pierce?: number;
  pileLife?: number;
  /** Quick Reply: damage builds up per hit on the same target, to this multiplier. */
  ramp?: { add: number; max: number };
  interval?: number;
  damage?: number;
  coffeeAmount?: number;
  coffeeInterval?: number;
  /** Reaches the whole floor (Office Artillery). */
  global?: boolean;
  /** Pulse: slow factor and how long it lasts (a zone: how long the slow lingers after leaving). */
  slow?: number;
  slowTime?: number;
  /** Pulse: everyone in range stops this long (bosses resist). */
  stun?: number;
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
  /** A special: everyone gets one of these at most. */
  special?: boolean;
  /**
   * Each path's own look at tier 3 and tier 4, like Bloons. Optional: a tower without them falls
   * back to `models`. Only one path can pass tier 2 (the 4-2-0 rule), so the choice is clear.
   */
  pathModels?: readonly [readonly [string, string], readonly [string, string], readonly [string, string]];
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
          {
            name: 'Offshore Account',
            desc: 'Pot: +12 and 25% interest per wave, up to 700. Claiming it empties every pot of yours at once.',
            cost: 120,
            effect: { bank: { interest: 0.25, cap: 700, perWave: 12, claimAll: true } },
          },
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
    verb: 'Every few seconds everyone in range just stops for a moment. No damage, no slowing: a pause. Noise Cancelling stops them for longer, and cannot be talked quiet by the Chatterbox.',
    role: 'pulse',
    unlockLevel: 2,
    accent: '#6fcf7f',
    models: ['headphones_1', 'headphones_2', 'headphones_3'],
    base: { cost: 20, range: 3.0, interval: 3.5, stun: 0.6 },
    paths: [
      {
        name: 'NOISE CANCELLING',
        quote: 'Blissful silence.',
        color: '#6fcf7f',
        tiers: [
          { name: 'Over-Ear', desc: 'Everyone stops for 0.9 seconds.', cost: 22, effect: { stun: 0.9 } },
          {
            name: 'Noise Cancelling',
            desc: 'Everyone stops for 1.2 seconds, and the Chatterbox cannot talk these quiet.',
            cost: 35,
            effect: { stun: 1.2, silenceProof: true },
          },
          { name: 'Studio Monitors', desc: 'Stops everyone for 1.8 seconds, a bit more often.', cost: 80, effect: { stun: 1.8, intervalMult: 0.85 } },
          { name: 'Soundproof Booth', desc: 'Stops everyone for 2.5 seconds, and stopped colleagues take double damage.', cost: 200, effect: { stun: 2.5, stunnedTakes: 2 } },
        ],
      },
      {
        name: 'VOLUME',
        quote: 'Can you hear me now?',
        color: '#7fb6e3',
        tiers: [
          { name: 'Volume Up', desc: '+20% range.', cost: 15, effect: { rangeMult: 1.2 } },
          { name: 'Bass Boost', desc: 'Pulses 33% more often.', cost: 25, effect: { intervalMult: 0.75 } },
          { name: 'Drop the Bass', desc: 'Every pulse also pushes colleagues back half a tile (bosses barely move).', cost: 70, effect: { knockback: 0.5 } },
          { name: 'Open-Plan Speakers', desc: 'Half again the range, a pulse every 1.6 seconds, and a full tile of push-back.', cost: 180, effect: { rangeMult: 1.5, intervalMult: 0.6, knockback: 1.0 } },
        ],
      },
      {
        name: 'FOCUS MUSIC',
        quote: 'Lo-fi beats to defend your desk to.',
        color: '#b48ce0',
        tiers: [
          { name: 'Lo-fi Beats', desc: 'Colleagues it stops take +1 damage from every hit for a few seconds.', cost: 15, effect: { vulnerableAdd: 1 } },
          { name: 'Brown Noise', desc: 'Reveals hidden colleagues in range.', cost: 25, effect: { seesHidden: true } },
          { name: 'Deep Focus', desc: 'Towers in range fire 25% faster.', cost: 60, effect: { buffRate: 0.8 } },
          { name: 'Flow State', desc: 'Towers in range fire 50% faster, and stopped colleagues take +2 more damage per hit.', cost: 170, effect: { buffRate: 0.67, vulnerableAdd: 2 } },
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
    verb: 'A zone that grinds down everyone in it and reveals hidden colleagues. Its damage is shared over everyone inside, so it shines against a few big ones. It does not slow anyone until you jam it. It may not touch the Old Guard archive.',
    role: 'zone',
    damageClass: 'in_person',
    unlockLevel: 2,
    accent: '#3fa7a0',
    models: ['shredder_1', 'shredder_2', 'shredder_3'],
    pathModels: [
      ['shredder_p0_3', 'shredder_p0_4'],
      ['shredder_p1_3', 'shredder_p1_4'],
      ['shredder_p2_3', 'shredder_p2_4'],
    ],
    base: { cost: 30, range: 2.375, dot: 3, slowTime: 0.25 },
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
          { name: 'Jam', desc: 'Everyone in the zone slows to 60%.', cost: 20, effect: { slow: 0.6 } },
          { name: 'Bigger Bin', desc: '+25% zone size, and slows to 50%.', cost: 30, effect: { rangeMult: 1.25, slow: 0.5 } },
          { name: 'Paper Trail', desc: 'Whoever walks out of the zone stays slowed for another 3 seconds.', cost: 80, effect: { slowTimeAdd: 2.75 } },
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
  quickreply: {
    id: 'quickreply',
    name: 'Quick Reply',
    flavour: 'Two words. Efficient.',
    verb: 'Every reply on the SAME colleague hits harder than the last, up to double. Switch target and it starts over. Hopeless against a swarm, relentless against one big problem.',
    role: 'damage',
    damageClass: 'written',
    unlockLevel: 3,
    accent: '#8fa0b4',
    models: ['quickreply_1', 'quickreply_2', 'quickreply_3'],
    base: { cost: 16, range: 2.875, interval: 0.13, damage: 0.5, ramp: { add: 0.06, max: 2 } },
    paths: [
      {
        name: 'KEEP TYPING',
        quote: 'Typing...',
        color: '#8fa0b4',
        tiers: [
          { name: '"OK"', desc: '+0.5 damage, and it builds up faster.', cost: 18, effect: { damageAdd: 0.5, rampAdd: 0.04 } },
          { name: 'Thumbs-Up', desc: '+0.5 damage, and it builds up to three times the damage.', cost: 35, effect: { damageAdd: 0.5, rampMax: 3 } },
          { name: 'Seen', desc: '+1 damage, and it keeps half its build-up when it switches to someone new.', cost: 80, effect: { damageAdd: 1, rampKeep: 0.5 } },
          { name: 'Typing Forever', desc: '+2.5 damage, and it builds up to five times the damage.', cost: 200, effect: { damageAdd: 2.5, rampMax: 5 } },
        ],
      },
      {
        name: 'SHORTCUTS',
        quote: 'Ctrl+Enter. Sent.',
        color: '#7fb6e3',
        tiers: [
          { name: 'Ctrl+Enter', desc: 'Replies 40% faster.', cost: 9, effect: { intervalMult: 0.7 } },
          { name: 'Text Expander', desc: 'Replies 40% faster again.', cost: 20, effect: { intervalMult: 0.7 } },
          { name: 'Reply in Thread', desc: '+0.5 damage, and it replies to 2 colleagues at once. The build-up stays on the first one.', cost: 65, effect: { targetsAdd: 1, damageAdd: 0.5 } },
          { name: 'Autocomplete', desc: 'Replies twice as fast.', cost: 180, effect: { intervalMult: 0.5 } },
        ],
      },
      {
        name: 'EMOJI',
        quote: 'Reacted with a thumbs-up.',
        color: '#f2c641',
        tiers: [
          { name: 'Reaction', desc: '+20% range.', cost: 12, effect: { rangeMult: 1.2 } },
          { name: 'Eyes Emoji', desc: 'Can see hidden colleagues.', cost: 20, effect: { seesHidden: true } },
          { name: 'Thumbs-Down', desc: 'Two and a half times the damage against bosses.', cost: 55, effect: { bossMult: 2.5 } },
          { name: 'Party Parrot', desc: 'Every reply slows the target a little, and three and a half times the damage against bosses.', cost: 160, effect: { slowOnHit: { mult: 0.85, time: 0.6 }, bossMult: 3.5 } },
        ],
      },
    ],
  },
  thumbtacks: {
    id: 'thumbtacks',
    name: 'Thumbtacks',
    flavour: 'Somebody dropped the box.',
    verb: 'Drops piles of tacks on the walkway. Every tack hits one colleague, the pile stays until it runs out or gets old. Tacks do not care whether they can see you.',
    role: 'trap',
    damageClass: 'in_person',
    unlockLevel: 4,
    accent: '#d24b4b',
    models: ['thumbtacks_1', 'thumbtacks_2', 'thumbtacks_3'],
    base: { cost: 22, range: 2.0, interval: 1.7, damage: 2, pierce: 5, pileLife: 22 },
    paths: [
      {
        name: 'SHARPER',
        quote: 'Mind your step.',
        color: '#d24b4b',
        tiers: [
          { name: 'Brass Tacks', desc: '+1 damage per tack.', cost: 10, effect: { damageAdd: 1 } },
          { name: 'Push Pins', desc: '+3 tacks in every pile.', cost: 25, effect: { pierceAdd: 3 } },
          { name: 'Drawing Pins', desc: '+3 damage per tack, and tacks get through any shield.', cost: 70, effect: { damageAdd: 3, ignoresMinHit: true } },
          { name: 'Tack Carpet', desc: '+2 damage, +10 tacks in every pile, and piles last twice as long.', cost: 220, effect: { damageAdd: 2, pierceAdd: 10, pileLifeMult: 2 } },
        ],
      },
      {
        name: 'SUPPLY',
        quote: 'Who ordered ten thousand?',
        color: '#d9a05b',
        tiers: [
          { name: 'Desk Drawer', desc: 'Drops 33% faster.', cost: 10, effect: { intervalMult: 0.75 } },
          { name: 'Spilled Box', desc: 'Drops 33% faster again.', cost: 24, effect: { intervalMult: 0.75 } },
          { name: 'Bulk Order', desc: 'Every drop is two piles, and +2 tacks in every pile.', cost: 65, effect: { pilesAdd: 1, pierceAdd: 2 } },
          { name: 'Supply Closet', desc: 'Drops twice as fast, and +2 tacks in every pile.', cost: 200, effect: { intervalMult: 0.5, pierceAdd: 2 } },
        ],
      },
      {
        name: 'HEALTH AND SAFETY',
        quote: 'Nobody filled in the risk assessment.',
        color: '#f2c641',
        tiers: [
          { name: 'Longer Reach', desc: '+25% range: it drops piles further away.', cost: 10, effect: { rangeMult: 1.25 } },
          { name: 'Glue Dots', desc: 'Every tack also slows its colleague for a moment.', cost: 22, effect: { slowOnHit: { mult: 0.6, time: 0.8 } } },
          { name: 'Upturned Plug', desc: 'Every tack stops its colleague for a moment, and bosses take double.', cost: 60, effect: { stunOnHit: 0.3, bossMult: 2 } },
          { name: 'Risk Assessment', desc: '+3 damage, bosses take four times as much, and every tack stops its colleague longer.', cost: 180, effect: { damageAdd: 3, bossMult: 4, stunOnHit: 0.5 } },
        ],
      },
    ],
  },
  selfservice: {
    id: 'selfservice',
    name: 'Self-Service',
    flavour: 'Have you tried the portal?',
    verb: 'Answers EVERYONE in a small circle around it at once, as many as there are. Weak against one colleague, great when they bunch up.',
    role: 'damage',
    damageClass: 'written',
    unlockLevel: 4,
    accent: '#3fa7a0',
    models: ['selfservice_1', 'selfservice_2', 'selfservice_3'],
    base: { cost: 25, range: 1.6, interval: 0.8, damage: 1.0, targets: 99 },
    paths: [
      {
        name: 'KNOWLEDGE BASE',
        quote: 'Have you checked the FAQ?',
        color: '#3fa7a0',
        tiers: [
          { name: 'Send the FAQ', desc: '+1 damage.', cost: 14, effect: { damageAdd: 1 } },
          { name: 'Send the Wiki', desc: '+1 damage and +15% range.', cost: 28, effect: { damageAdd: 1, rangeMult: 1.15 } },
          { name: 'Send to Service Desk', desc: '+3 damage.', cost: 75, effect: { damageAdd: 3 } },
          { name: 'Knowledge Base', desc: '+6 damage, and it finds hidden colleagues.', cost: 230, effect: { damageAdd: 6, seesHidden: true } },
        ],
      },
      {
        name: 'CHATBOT',
        quote: "Sorry, I didn't understand that.",
        color: '#7fb6e3',
        tiers: [
          { name: 'Canned Response', desc: 'Answers 33% faster.', cost: 12, effect: { intervalMult: 0.75 } },
          { name: 'Chatbot', desc: 'Answers 33% faster again.', cost: 26, effect: { intervalMult: 0.75 } },
          { name: 'Ticket Queue', desc: 'Answers twice as fast, and +0.5 damage.', cost: 70, effect: { intervalMult: 0.5, damageAdd: 0.5 } },
          { name: 'AI Assistant', desc: 'Answers twice as fast again, and +2 damage.', cost: 210, effect: { intervalMult: 0.5, damageAdd: 2 } },
        ],
      },
      {
        name: 'PORTAL',
        quote: 'Please log in to continue.',
        color: '#8fa0b4',
        tiers: [
          { name: 'Pinned Post', desc: '+20% range.', cost: 10, effect: { rangeMult: 1.2 } },
          { name: 'Read the Manual', desc: 'Everyone it answers slows down for a moment.', cost: 22, effect: { slowOnHit: { mult: 0.7, time: 0.6 } } },
          { name: 'Search Bar', desc: 'Finds hidden colleagues, and +15% range.', cost: 55, effect: { seesHidden: true, rangeMult: 1.15 } },
          { name: 'Closed as Resolved', desc: '+2 damage, and +1 Coffee for every colleague it deals with.', cost: 180, effect: { damageAdd: 2, killCoffee: 1 } },
        ],
      },
    ],
  },
  keyboardsmash: {
    id: 'keyboardsmash',
    name: 'Keyboard Smash',
    flavour: 'ASDFGHJKL.',
    verb: 'Special, one each. Every few seconds it slams the walkway in front of the first colleague, hitting everyone around, and leaves the keyboard lying across the walkway. Nobody gets past until they have kicked it out of the way.',
    role: 'smash',
    damageClass: 'in_person',
    unlockLevel: 5,
    special: true,
    accent: '#e5534b',
    models: ['keyboardsmash_1', 'keyboardsmash_2', 'keyboardsmash_3'],
    base: { cost: 60, range: 2.2, interval: 8, damage: 8, smashRadius: 1.2, barrierHp: 30, barrierTime: 5 },
    paths: [
      {
        name: 'SLAM',
        quote: 'Have you tried turning it off and on again?',
        color: '#e5534b',
        tiers: [
          { name: 'Mechanical Keys', desc: '+6 slam damage.', cost: 30, effect: { damageAdd: 6 } },
          { name: 'Rage Quit', desc: 'The slam reaches 40% further.', cost: 40, effect: { radiusMult: 1.4 } },
          { name: 'Ctrl+Z', desc: 'Everyone slammed stops for 1.5 seconds.', cost: 90, effect: { stunOnHit: 1.5 } },
          { name: 'Keyboard Warrior', desc: '+25 slam damage, and bosses take three times as much.', cost: 250, effect: { damageAdd: 25, bossMult: 3 } },
        ],
      },
      {
        name: 'CAPS LOCK',
        quote: 'WHY IS EVERYONE SHOUTING',
        color: '#7fb6e3',
        tiers: [
          { name: 'Wrist Rest', desc: 'The barrier takes 20 more kicks.', cost: 20, effect: { barrierHpAdd: 20 } },
          { name: 'Ergonomic', desc: 'The barrier stays 4 seconds longer.', cost: 35, effect: { barrierTimeAdd: 4 } },
          { name: 'Sharp Keycaps', desc: 'Kicking the barrier hurts: 4 damage a second, and it takes twice the kicks.', cost: 90, effect: { barrierThorns: 4, barrierHpMult: 2 } },
          { name: 'Server Rack', desc: 'Three times the kicks, and it stays 8 seconds longer.', cost: 220, effect: { barrierHpMult: 3, barrierTimeAdd: 8 } },
        ],
      },
      {
        name: 'SHORTCUTS',
        quote: 'Ctrl+Alt+Defend.',
        color: '#f2c641',
        tiers: [
          { name: 'Hotkeys', desc: 'Smashes 33% more often.', cost: 15, effect: { intervalMult: 0.75 } },
          { name: 'Macro', desc: 'Smashes 33% more often again, and reaches 20% further.', cost: 35, effect: { intervalMult: 0.75, rangeMult: 1.2 } },
          { name: 'Autorepeat', desc: 'Every smash comes twice.', cost: 95, effect: { doubleSmash: true } },
          { name: 'Any Key', desc: 'Smashes twice as often.', cost: 240, effect: { intervalMult: 0.5 } },
        ],
      },
    ],
  },
  chair: {
    id: 'chair',
    name: 'Office Chair',
    flavour: 'Wheee.',
    verb: 'Special, one each. Rolls in a straight line you choose, knocking into every colleague on the way. Every knock costs it as much as it deals; empty, or at the end of its lane, it rolls back and goes again.',
    role: 'chair',
    damageClass: 'in_person',
    unlockLevel: 5,
    special: true,
    accent: '#3e7cc9',
    models: ['chair_1', 'chair_2', 'chair_3'],
    base: { cost: 45, range: 5, interval: 2.5, damage: 5, chairHp: 20, rollSpeed: 6 },
    paths: [
      {
        name: 'RAMMING',
        quote: 'Coming through.',
        color: '#e5534b',
        tiers: [
          { name: 'Gas Lift', desc: '+3 damage per knock.', cost: 20, effect: { damageAdd: 3 } },
          { name: 'Armrests', desc: '+4 damage per knock.', cost: 35, effect: { damageAdd: 4 } },
          { name: 'Executive Chair', desc: 'Knocks colleagues a tile back.', cost: 80, effect: { knockback: 1 } },
          { name: 'Racing Chair', desc: '+10 damage, three times as much to bosses, and it rolls faster.', cost: 220, effect: { damageAdd: 10, bossMult: 3, speedMult: 1.5 } },
        ],
      },
      {
        name: 'ROLLING',
        quote: 'Who waxed the floor?',
        color: '#7fb6e3',
        tiers: [
          { name: 'Smooth Castors', desc: '+2 tiles of lane.', cost: 15, effect: { rangeAdd: 2 } },
          { name: 'Polished Floor', desc: '+2 tiles of lane, and it rolls faster.', cost: 30, effect: { rangeAdd: 2, speedMult: 1.3 } },
          { name: 'Swivel', desc: 'It knocks into colleagues on the way back too.', cost: 85, effect: { rollBack: true } },
          { name: 'Office Olympics', desc: '+4 tiles of lane, and it rests half as long between runs.', cost: 200, effect: { rangeAdd: 4, intervalMult: 0.5 } },
        ],
      },
      {
        name: 'STURDY',
        quote: 'Built to last a reorganisation.',
        color: '#6fcf7f',
        tiers: [
          { name: 'Cushion', desc: '+15 HP per run.', cost: 15, effect: { chairHpAdd: 15 } },
          { name: 'Steel Frame', desc: '+20 HP per run.', cost: 30, effect: { chairHpAdd: 20 } },
          { name: 'Ergonomic', desc: '+20 HP, and it gets through any shield.', cost: 80, effect: { chairHpAdd: 20, ignoresMinHit: true } },
          { name: 'Throne', desc: 'Three times the HP, and everyone it knocks stops for half a second.', cost: 210, effect: { chairHpMult: 3, stunOnHit: 0.5 } },
        ],
      },
    ],
  },
  replyall: {
    id: 'replyall',
    name: 'Reply All',
    flavour: 'Adding a few more people.',
    verb: 'Slow, but every email lands on everyone standing near the colleague it was meant for. The bigger the crowd, the better.',
    role: 'damage',
    damageClass: 'written',
    unlockLevel: 6,
    accent: '#e2557a',
    models: ['replyall_1', 'replyall_2', 'replyall_3'],
    base: { cost: 26, range: 3.0, interval: 1.4, damage: 3, aoe: 0.9 },
    paths: [
      {
        name: 'URGENT',
        quote: 'Marked as high importance.',
        color: '#e5534b',
        tiers: [
          { name: 'High Priority', desc: '+2 damage.', cost: 15, effect: { damageAdd: 2 } },
          { name: 'Read Receipt', desc: '+3 damage.', cost: 35, effect: { damageAdd: 3 } },
          { name: 'URGENT', desc: '+7 damage, and it gets through any shield.', cost: 100, effect: { damageAdd: 7, ignoresMinHit: true } },
          { name: 'Escalated', desc: '+16 damage, and bosses take double.', cost: 260, effect: { damageAdd: 16, bossMult: 2 } },
        ],
      },
      {
        name: 'THREAD',
        quote: 'Re: Re: Re: Fwd:',
        color: '#7fb6e3',
        tiers: [
          { name: 'Reply', desc: 'Sends 33% more often.', cost: 12, effect: { intervalMult: 0.75 } },
          { name: 'Reply Again', desc: 'Sends 33% more often again.', cost: 25, effect: { intervalMult: 0.75 } },
          { name: 'Reply Storm', desc: 'Two emails at once, to two different colleagues, a bit faster and +1 damage.', cost: 90, effect: { targetsAdd: 1, intervalMult: 0.85, damageAdd: 1 } },
          { name: 'Infinite Loop', desc: 'Sends twice as often.', cost: 230, effect: { intervalMult: 0.5 } },
        ],
      },
      {
        name: 'EVERYONE',
        quote: 'Looping in the wider team.',
        color: '#e2557a',
        tiers: [
          { name: 'CC the Team', desc: 'Lands 30% wider.', cost: 15, effect: { aoeMult: 1.3 } },
          { name: 'Distribution List', desc: 'Lands 30% wider again.', cost: 30, effect: { aoeMult: 1.3 } },
          { name: 'Company-Wide Email', desc: 'Everyone it hits slows down while they read it, and it lands a bit wider.', cost: 90, effect: { slowOnHit: { mult: 0.65, time: 1.2 }, aoeMult: 1.2 } },
          { name: 'All Staff', desc: 'Lands twice as wide, and +6 damage.', cost: 240, effect: { aoeMult: 2, damageAdd: 6 } },
        ],
      },
    ],
  },

};

/** Model for the current upgrades: base, mid (a path at 2), then the leading path's own tier 3 / 4 look. */
export function modelFor(def: TowerDef, tiers: Tiers): string {
  const top = Math.max(...tiers);
  if (top >= 3 && def.pathModels) return def.pathModels[tiers.indexOf(top)][top >= 4 ? 1 : 0];
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
export const SHOP_ORDER: readonly string[] = ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall'];

/** Towers that exist in the design but are not built yet, so the shop can say when they arrive. */
export const UPCOMING_TOWERS: readonly { name: string; unlockLevel: number }[] = [
  { name: 'Delegation', unlockLevel: 7 },
  { name: 'Pomodoro Timer', unlockLevel: 8 },
  { name: 'Motivational Poster', unlockLevel: 9 },
];
