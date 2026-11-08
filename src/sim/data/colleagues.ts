// Colleagues are people. Each fills one role. Source: 07_REMAKE_PROMPT.md section 2.5 (the
// 2026-08-06 roster), which overrides enemy.gd. Speeds are tiles per second (old px / 40).
//
// Reward per kill = HP x rate: 0.12 standard, 0.09 swarms, 0.15 for anything that needs a specific
// tool. Bosses pay a flat amount: it lands on the last wave and barely touches the economy.

import type { DamageClass } from './towers';

export interface BossDef {
  kind: 'headofcomms' | 'repairguy' | 'presenter' | 'cleaner' | 'linemanager' | 'baby';
  /** Colleague type he calls in. */
  addType: string;
  addEvery: number;
  addCount: number;
  /** Extra colleagues called in at once when he drops to 66% and 33% HP. */
  phaseBurst: number;
  /** Speed multiplier in his last phase. */
  phase3Speed: number;
  /** No Coffee comes in at all while he is on the floor (The Repair Guy). */
  blocksIncome?: boolean;
  /** Called-in colleagues appear this far along the route instead of next to him (0..1). */
  addsAt?: number;
  /** His shield fills up again at every phase change (The Presenter's loading screen). */
  shieldRecharge?: boolean;
  /** Colleagues this close to him walk this much faster (The Cleaner: "Move, I'm mopping"). */
  haste?: { radius: number; mult: number };
  /** Sweeps away tack piles this close, and mops Shredder zones he walks into (off for mopTime). */
  sweep?: { radius: number; mopTime: number };
  /** He only starts calling people in from this phase on. */
  addsFromPhase?: 2 | 3;
  /** From this phase on, towers this close to him reload this much slower (1.6 = 60% slower). */
  towerSlow?: { radius: number; mult: number; fromPhase: 1 | 2 | 3 };
  /** A crying fit every so often: every tower this close stops for a while (The Baby). */
  cry?: { every: number; duration: number; radius: number };
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
  /** Shredder zones do nothing to him (The Old Guard's archive: legally required to be kept). */
  zoneProof?: boolean;
  /** Towers within this radius stop working while he walks past (The Chatterbox). */
  silence?: number;
  /** Ignores slows, and only stuns from this tower type work on him. */
  stunOnlyFrom?: string;
  /** Share of a stun that still lands (bosses shrug most of it off). 1 = full. */
  stunResist?: number;
  /** Towers this close aim at him before anyone else (all the attention). */
  taunt?: number;
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
    stunResist: 0.4,
    scale: 1,
    accent: '#c8423b',
    model: 'headofcomms',
    armSwing: 0.4,
  },
  chatterbox: {
    id: 'chatterbox',
    name: 'The Chatterbox',
    role: 'Disruptor',
    quote: 'Did you see what happened at the party?',
    ability: 'Every tower near him stops working while he talks. Ignores slowing down: only Headphones make him stop.',
    counter: 'Headphones just out of his reach, or NOISE CANCELLING at tier 2 anywhere: he cannot talk those quiet. Or keep your towers away from his route.',
    hp: 22,
    speed: 1.875,
    focus: 5,
    rewardRate: REWARD_SPECIAL,
    silence: 2.375,
    stunOnlyFrom: 'headphones',
    scale: 1,
    accent: '#b48ce0',
    model: 'chatterbox',
    armSwing: 0.9,
  },
  oldguard: {
    id: 'oldguard',
    name: 'The Old Guard',
    role: 'Tank',
    quote: 'We tried that in 1998.',
    ability: 'Drags the archive box along. Hits under 10 bounce off it, and the Shredder may not touch it: that archive is legally required to be kept.',
    counter: 'Office Artillery breaks the box. Light hits bounce off, so do not count on Auto-Reply alone.',
    hp: 46,
    shield: 30,
    shieldMinHit: 10,
    speed: 1.25,
    focus: 8,
    rewardRate: REWARD_SPECIAL,
    zoneProof: true,
    scale: 1,
    accent: '#a9a6a0',
    model: 'oldguard',
    armSwing: 0,
  },
  boardmember: {
    id: 'boardmember',
    name: 'The Board Member',
    role: 'Immune to in-person',
    quote: 'Can everyone hear me? I am on the train.',
    ability: 'Never actually in the building: he attends on a screen. Nothing in person touches him, not even the Shredder.',
    counter: 'Write to him. Auto-Reply and everything else that is WRITTEN works. In-person towers do nothing at all.',
    hp: 40,
    speed: 1.5,
    focus: 8,
    rewardRate: REWARD_SPECIAL,
    immune: 'in_person',
    scale: 1,
    accent: '#2f3d5c',
    model: 'boardmember',
    armSwing: 0,
  },
  presenter: {
    id: 'presenter',
    name: 'The Presenter',
    role: 'Boss',
    quote: 'Can everyone see my screen?',
    ability:
      'Hides behind a loading screen that fills up again at every phase. Every few seconds he beams the next slide straight at your desk: a handful of Chasers appear right next to it.',
    counter: 'Keep something near your desk for the slides. Quick Reply builds up on him; break the loading screen again at 66% and 33%.',
    hp: 560,
    shield: 180,
    speed: 1.05,
    focus: 25,
    rewardFlat: 30,
    boss: {
      kind: 'presenter',
      addType: 'chaser',
      addEvery: 7,
      addCount: 4,
      phaseBurst: 6,
      phase3Speed: 1.5,
      addsAt: 0.82,
      shieldRecharge: true,
      intro: 'His slides land right next to your desk, and his loading screen comes back every phase.',
    },
    stunResist: 0.4,
    scale: 1,
    accent: '#3e7cc9',
    model: 'presenter',
    armSwing: 0.3,
  },
  repairguy: {
    id: 'repairguy',
    name: 'The Repair Guy',
    role: 'Boss',
    quote: 'Who touched the machine?',
    ability:
      'Here to "repair" the coffee machine. No Coffee comes in at all while he is on the floor. His toolbox stops hits under 10, and the queue for the coffee follows him in.',
    counter: 'Office Artillery breaks the toolbox. Save up before he arrives: you will not earn a thing until he is gone.',
    hp: 520,
    shield: 100,
    shieldMinHit: 10,
    speed: 1.2,
    focus: 25,
    rewardFlat: 30,
    boss: {
      kind: 'repairguy',
      addType: 'chaser',
      addEvery: 6,
      addCount: 3,
      phaseBurst: 5,
      phase3Speed: 1.6,
      blocksIncome: true,
      intro: 'No Coffee until he is gone, and light hits bounce off his toolbox. Office Artillery.',
    },
    stunResist: 0.3,
    scale: 1,
    accent: '#e67e3a',
    model: 'repairguy',
    armSwing: 0.4,
  },
  impersonator: {
    id: 'impersonator',
    name: 'The Impersonator',
    role: 'Hidden',
    quote: 'It is me, the CEO. I need gift cards.',
    ability: 'Nobody sees him coming. Your towers cannot aim at him until a Shredder zone shows him up, or a tower that can see hidden colleagues spots him.',
    counter: 'A Shredder zone on his route, then anything can hit him. Thumbtacks do not need to see him at all.',
    hp: 10,
    speed: 2.5,
    focus: 3,
    rewardRate: REWARD_SPECIAL,
    invisible: true,
    scale: 1,
    accent: '#c9a227',
    model: 'impersonator',
    armSwing: 0.6,
  },
  cleaner: {
    id: 'cleaner',
    name: 'The Cleaner',
    role: 'Boss',
    quote: "Mind the floor, it's wet.",
    ability:
      'Pushes his cart through the canteen. Everyone near him walks faster to get out of his way, he sweeps up every tack pile he passes, and he mops any Shredder zone he walks into: it stops for a few seconds.',
    counter: 'Hit him from a distance: Office Artillery, Quick Reply, Auto-Reply. Put tacks and Shredders where his crowd walks, not where he does.',
    hp: 760,
    speed: 0.95,
    focus: 25,
    rewardFlat: 30,
    boss: {
      kind: 'cleaner',
      addType: 'chaser',
      addEvery: 8,
      addCount: 3,
      phaseBurst: 6,
      phase3Speed: 1.4,
      haste: { radius: 1.8, mult: 1.4 },
      sweep: { radius: 1.4, mopTime: 6 },
      intro: 'He sweeps up your tacks, mops your Shredders and hurries everyone along. Hit him from a distance.',
    },
    stunResist: 0.4,
    scale: 1.05,
    accent: '#4a8fd6',
    model: 'cleaner',
    armSwing: 0.2,
  },
  linemanager: {
    id: 'linemanager',
    name: 'Your Line Manager',
    role: 'Boss',
    quote: 'Do you have a minute? It will not take long.',
    ability:
      'Three phases. First a stack of agenda points as a shield. At 66% he calls in peer reviewers who keep coming. At 33% he walks faster, and every tower near him reloads a lot slower while he asks how you are getting on.',
    counter: 'Break the agenda early with anything that hits hard. Keep damage away from his route for the last phase: Office Artillery from across the floor, or a barrier he has to kick.',
    hp: 720,
    shield: 180,
    speed: 0.9,
    focus: 30,
    rewardFlat: 40,
    boss: {
      kind: 'linemanager',
      addType: 'requester',
      addEvery: 8,
      addCount: 2,
      addsFromPhase: 2,
      phaseBurst: 3,
      phase3Speed: 1.5,
      towerSlow: { radius: 3.2, mult: 1.4, fromPhase: 3 },
      intro: 'He has a stack of agenda points, then peer reviewers, then questions. Hit hard early, and keep your towers out of his way at the end.',
    },
    stunResist: 0.35,
    scale: 1.1,
    accent: '#8e6fbf',
    model: 'linemanager',
    armSwing: 0.3,
  },
  coldcaller: {
    id: 'coldcaller',
    name: 'The Cold Caller',
    role: 'Immune to WRITTEN',
    quote: 'Is this a good time? Great.',
    ability: 'He does not read email. He calls. Nothing WRITTEN touches him: no Auto-Reply, no Quick Reply, no Reply All.',
    counter: 'Anything IN PERSON: Office Artillery, The Shredder, Thumbtacks, Keyboard Smash, the Office Chair.',
    hp: 24,
    speed: 2.3,
    focus: 4,
    rewardRate: REWARD_SPECIAL,
    immune: 'written',
    scale: 1,
    accent: '#3fa7a0',
    model: 'coldcaller',
    armSwing: 0.5,
  },
  baby: {
    id: 'baby',
    name: 'The Baby',
    role: 'Boss',
    quote: 'Waaaah.',
    ability:
      'Demands all the attention. Every tower near him aims at him and nobody else, and every so often he has a crying fit: all towers close by stop until it is over.',
    counter: 'Keep most of your towers out of his reach, so they keep dealing with everyone else. Office Artillery from across the house. Noise Cancelling headphones do not hear the crying.',
    hp: 950,
    speed: 0.6,
    focus: 30,
    rewardFlat: 40,
    taunt: 3.0,
    boss: {
      kind: 'baby',
      addType: 'intern',
      addEvery: 99,
      addCount: 0,
      phaseBurst: 0,
      phase3Speed: 1.4,
      cry: { every: 11, duration: 2.5, radius: 2.8 },
      intro: 'All the attention, and a crying fit every few seconds. Keep most towers out of his reach.',
    },
    stunResist: 0.4,
    scale: 0.9,
    accent: '#f2c641',
    model: 'baby',
    armSwing: 0.6,
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
