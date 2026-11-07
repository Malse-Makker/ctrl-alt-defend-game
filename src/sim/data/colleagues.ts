// Colleagues are people. Each fills one role. Source: 07_REMAKE_PROMPT.md section 2.5 (the
// 2026-08-06 roster), which overrides enemy.gd. Speeds are tiles per second (old px / 40).
//
// Reward per kill = HP x rate: 0.12 standard, 0.09 swarms, 0.15 for anything that needs a specific
// tool. Bosses pay a flat amount: it lands on the last wave and barely touches the economy.

import type { DamageClass } from './towers';

export interface BossDef {
  kind: 'headofcomms';
  /** Colleague type he calls in. */
  addType: string;
  addEvery: number;
  addCount: number;
  /** Extra colleagues called in at once when he drops to 66% and 33% HP. */
  phaseBurst: number;
  /** Speed multiplier in his last phase. */
  phase3Speed: number;
  intro: string;
}

export interface ColleagueDef {
  id: string;
  name: string;
  role: string;
  quote: string;
  ability: string;
  counter: string;
  hp: number;
  speed: number;
  focus: number;
  rewardRate?: number;
  rewardFlat?: number;
  shield?: number;
  /** Hits below this bounce off the shield and do nothing. */
  shieldMinHit?: number;
  immune?: DamageClass;
  /** Cannot be targeted until revealed, unless the tower can see hidden colleagues. */
  invisible?: boolean;
  split?: { into: string; count: number };
  boss?: BossDef;
  /** Visual scale and the one loud colour that makes him readable on a busy floor. */
  scale: number;
  accent: string;
  model: string;
  /** How much the arms swing while walking (0 for people carrying something in both hands). */
  armSwing: number;
}

export const REWARD_STANDARD = 0.12;
export const REWARD_SWARM = 0.09;
export const REWARD_SPECIAL = 0.15;

export const COLLEAGUES: Record<string, ColleagueDef> = {
  intern: {
    id: 'intern',
    name: 'The Intern',
    role: 'Normal, light',
    quote: 'Is this the right floor?',
    ability: 'Just there. And there are a lot of them. Some bosses call more in.',
    counter: 'Any cheap damage tower. One Auto-Reply handles a few.',
    hp: 4,
    speed: 2.625,
    focus: 1,
    rewardRate: REWARD_STANDARD,
    scale: 1,
    accent: '#f2c641',
    model: 'intern',
    armSwing: 0.6,
  },
  newhire: {
    id: 'newhire',
    name: 'The New Hire',
    role: 'Normal, heavy',
    quote: 'Sorry, where do I find...?',
    ability: 'Lasts a lot longer than an Intern. Keeps asking for directions.',
    counter: 'Upgrade your Auto-Reply. Level 1 is too slow for these.',
    hp: 12,
    speed: 2.0,
    focus: 2,
    rewardRate: REWARD_STANDARD,
    scale: 1,
    accent: '#3fa7a0',
    model: 'newhire',
    armSwing: 0,
  },
  chaser: {
    id: 'chaser',
    name: 'The Chaser',
    role: 'Fast, weak, many',
    quote: 'Just bumping this up your inbox.',
    ability: 'Very fast and never alone. Gone past your towers before they finish a sentence.',
    counter: 'More shots per second, or more targets per shot (ESCALATION).',
    hp: 3,
    speed: 4.75,
    focus: 1,
    rewardRate: REWARD_SWARM,
    scale: 1,
    accent: '#e2557a',
    model: 'chaser',
    armSwing: 0.9,
  },
  requester: {
    id: 'requester',
    name: 'The Requester',
    role: 'Splitter',
    quote: 'Can we just tweak one thing?',
    ability: 'When you deal with him, two Chasers come out of the conversation.',
    counter: 'Hit him early, with towers further down the route ready for the two halves.',
    hp: 16,
    speed: 2.0,
    focus: 3,
    rewardRate: REWARD_STANDARD,
    split: { into: 'chaser', count: 2 },
    scale: 1,
    accent: '#e67e3a',
    model: 'requester',
    armSwing: 0,
  },
  headofcomms: {
    id: 'headofcomms',
    name: 'The Head of Comms',
    role: 'Boss',
    quote: 'This could have been an email.',
    ability:
      'Keeps calling Interns into the meeting wherever he is standing. They walk in front of him and soak up your shots. At 66% and 33% HP he calls everyone at once, and in his last phase he walks a lot faster.',
    counter: 'Put a few towers on Most HP so they ignore the Interns, and keep damage on the back half of the route.',
    hp: 600,
    speed: 1.0,
    focus: 20,
    rewardFlat: 22,
    boss: {
      kind: 'headofcomms',
      addType: 'intern',
      addEvery: 4,
      addCount: 2,
      phaseBurst: 6,
      phase3Speed: 1.8,
      intro: 'His Interns walk in front of him and take your shots. Set a few towers to Most HP.',
    },
    scale: 1,
    accent: '#c8423b',
    model: 'headofcomms',
    armSwing: 0.4,
  },
};

export function killReward(def: ColleagueDef): number {
  if (def.rewardFlat !== undefined) return def.rewardFlat;
  return def.hp * (def.rewardRate ?? REWARD_STANDARD);
}

/** HP including everything that comes out when he goes down. The unit for balance numbers. */
export function hpEquivalent(id: string): number {
  const def = COLLEAGUES[id];
  if (!def) throw new Error(`Unknown colleague: ${id}`);
  let hp = def.hp + (def.shield ?? 0);
  if (def.split) hp += def.split.count * hpEquivalent(def.split.into);
  return hp;
}
