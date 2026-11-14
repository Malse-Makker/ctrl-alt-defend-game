// Colleagues are people. Each fills one role. Source: 07_REMAKE_PROMPT.md section 2.5 (the
// 2026-08-06 roster), which overrides enemy.gd. Speeds are tiles per second (old px / 40).
//
// Reward per kill = HP x rate: 0.12 standard, 0.09 swarms, 0.15 for anything that needs a specific
// tool. Bosses pay a flat amount: it lands on the last wave and barely touches the economy.

import type { DamageClass } from './towers';

export interface BossDef {
  kind: 'headofcomms' | 'repairguy' | 'presenter' | 'cleaner' | 'linemanager' | 'baby' | 'smoker' | 'consultant' | 'hrmanager' | 'projectmanager';
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
  /** Smoke around him: towers this close reach less far; and every so often he leaves a cloud. */
  smoke?: { radius: number; rangeMult: number; cloudEvery: number; cloudRadius: number; cloudTime: number };
  /**
   * The Consultant: while he is on the floor everyone else takes this share of the damage (lower
   * from phase 3) and walks this much faster. When he goes, everyone on the floor drops to `hpShare`
   * of their HP and stands still for `stun` seconds: the wave collapses.
   */
  cover?: { taken: number; taken3: number; haste: number; hpShare: number; stun: number };
  /**
   * The HR Manager's audits: every `every` seconds (`every3` from his last phase) the tower type
   * you spent the most on stops for `duration` seconds.
   */
  audit?: { every: number; every3: number; duration: number };
  /**
   * The Project Manager: the longer he is on the floor, the faster everyone walks: `perSecond`
   * more for every second, up to `max`.
   */
  rush?: { perSecond: number; max: number };
  /**
   * Your Line Manager, 360: at phase 2 and 3 an earlier boss comes back as a peer reviewer, with
   * this share of their HP.
   */
  reviewers?: { phase2: string; phase3: string; hpShare: number };
  intro: string;
}

export interface ColleagueDef {
  id: string;
  name: string;
  role: string;
  quote: string;
  ability: string;
  counter: string;
  /** The new-colleague card: what he does, one short line. Bosses use their intro instead. */
  short?: string;
  /** The new-colleague card: what helps, one short line. */
  helps?: string;
  /** Towers that answer him, shown as icons on the card. At least one is in the shop where he first turns up. */
  counters?: string[];
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
  /** Towers within this radius stop working while he walks past (The Chatterbox). */
  silence?: number;
  /** Ignores slows, and only stuns from this tower type work on him. */
  stunOnlyFrom?: string;
  /** Share of a stun that still lands (bosses shrug most of it off). 1 = full. */
  stunResist?: number;
  /** Towers this close aim at him before anyone else (all the attention). */
  taunt?: number;
  /** Takes this share of a hit from towers that hit one colleague at a time (The Speakerphone Caller: 0.5). */
  pointResist?: number;
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
    short: 'Light. There are a lot of them.',
    helps: 'Anything cheap.',
    counters: ['autoreply'],
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
    counter: 'Upgrade your Auto-Reply. A bare one is too slow for these.',
    short: 'Tougher than an Intern.',
    helps: 'Upgrade a tower instead of buying another.',
    counters: ['autoreply', 'quickreply'],
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
    counter: 'Towers that hit several at once, or one that fires fast.',
    short: 'Fast, weak, never alone.',
    helps: 'Towers that hit several at once, or one that fires fast.',
    counters: ['headphones', 'quickreply', 'selfservice', 'thumbtacks', 'delegation'],
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
    short: 'Deal with him and two Chasers come out.',
    helps: 'Hit him early. Keep something behind for the Chasers.',
    counters: ['autoreply', 'delegation', 'shredder'],
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
    counter: 'Headphones with NOISE CANCELLING (tier 2): he cannot talk them, or any tower in their range, quiet. Or keep your towers out of his earshot.',
    short: 'Towers close to him stop working.',
    helps: 'Hit him from further away. Headphones pause him; Noise Cancelling keeps the towers around them working.',
    counters: ['artillery', 'headphones'],
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
    ability: 'Drags the archive box along. Hits under 10 bounce off it, the Shredder included. Once the box is broken, anything goes.',
    counter: 'Office Artillery breaks the box. Light hits bounce off, so do not count on Auto-Reply alone.',
    short: 'Carries the archive box. Hits under 10 bounce off it.',
    helps: 'One heavy hit.',
    counters: ['artillery', 'pomodoro'],
    hp: 46,
    shield: 30,
    shieldMinHit: 10,
    speed: 1.25,
    focus: 8,
    rewardRate: REWARD_SPECIAL,
    scale: 1,
    accent: '#a9a6a0',
    model: 'oldguard',
    armSwing: 0,
  },
  boardmember: {
    id: 'boardmember',
    name: 'The Board Member',
    role: 'Immune to PHYSICAL',
    quote: 'Can everyone hear me? I am on the train.',
    ability: 'Never actually in the building: he attends on a screen. Nothing PHYSICAL touches him, not even Office Artillery.',
    counter: 'Send him something. Auto-Reply and everything else DIGITAL works. PHYSICAL towers do nothing at all.',
    short: 'Attends on a screen. PHYSICAL towers do nothing.',
    helps: 'Anything DIGITAL.',
    counters: ['autoreply', 'delegation'],
    hp: 40,
    speed: 1.5,
    focus: 8,
    rewardRate: REWARD_SPECIAL,
    immune: 'physical',
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
      'Hides behind a loading screen that fills up again at every phase. Every few seconds he beams the next slide straight at your desk: a handful of Chasers appear on the last stretch before it.',
    counter: 'Keep something near your desk for the slides: Quick Reply clears the Chasers he beams in. Office Artillery and Self-Service for him; break the loading screen again at 66% and 33%.',
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
      intro: 'His slides land on the last stretch before your desk, and his loading screen comes back every phase.',
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
    counter: 'A Shredder zone on his route, then anything can hit him. Thumbtacks, Keyboard Smash, the Office Chair and the Pomodoro Timer hit him anyway. Auto-Reply READ RECEIPTS tier 2 sees him.',
    short: 'Hidden. Towers that aim cannot see him.',
    helps: 'A Shredder zone shows him. Tacks hit him anyway.',
    counters: ['shredder', 'thumbtacks'],
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
    counter: 'Break the agenda early: anything works on it. Keep damage away from his route for the last phase: Office Artillery from across the floor, or a barrier he has to kick.',
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
  consultant: {
    id: 'consultant',
    name: 'The Consultant',
    role: 'Boss',
    quote: 'Let us take a step back and look at the bigger picture.',
    ability:
      'Brought in for the merger. While he is on the floor everyone else takes less damage and walks a bit faster: he covers for them. From his last phase he covers even more. Deal with him and the whole wave falls apart: everyone left drops to half their HP and stands there for a moment.',
    counter: 'Everything on him, the rest can wait: Office Artillery on Most HP, a Pomodoro Timer on his route. Once he is gone, mop up.',
    hp: 820,
    speed: 1.0,
    focus: 25,
    rewardFlat: 35,
    boss: {
      kind: 'consultant',
      addType: 'requester',
      addEvery: 7,
      addCount: 2,
      phaseBurst: 4,
      phase3Speed: 1.3,
      cover: { taken: 0.7, taken3: 0.5, haste: 1.15, hpShare: 0.5, stun: 1.5 },
      intro: 'He covers for everyone else. Deal with him first and the wave falls apart.',
    },
    stunResist: 0.4,
    scale: 1.1,
    accent: '#e67e3a',
    model: 'consultant',
    armSwing: 0.3,
  },
  hrmanager: {
    id: 'hrmanager',
    name: 'The HR Manager',
    role: 'Boss',
    quote: 'This is just a friendly conversation. I will be taking notes.',
    ability:
      'Does audits. Every few seconds the kind of tower you spent the most Coffee on is called in for a review and does nothing for a while. In her last phase the audits come faster. She brings New Hires for their onboarding.',
    counter: 'Do not put everything into one kind of tower. Spread it, so an audit only takes out part of your defence.',
    hp: 860,
    speed: 0.95,
    focus: 25,
    rewardFlat: 35,
    boss: {
      kind: 'hrmanager',
      addType: 'newhire',
      addEvery: 8,
      addCount: 2,
      phaseBurst: 4,
      phase3Speed: 1.3,
      audit: { every: 9, every3: 6, duration: 5 },
      intro: 'She audits the kind of tower you rely on most. Spread your Coffee over different towers.',
    },
    stunResist: 0.4,
    scale: 1.05,
    accent: '#8e6fbf',
    model: 'hrmanager',
    armSwing: 0.3,
  },
  projectmanager: {
    id: 'projectmanager',
    name: 'The Project Manager',
    role: 'Boss',
    quote: 'Where are we on this?',
    ability:
      'It is release night and he wants it live. The longer he is on the floor, the faster everyone walks, himself included, until they all run. He brings Chasers to check on progress.',
    counter: 'Deal with him fast. Everything you have on him the moment he walks in: the longer he stays, the worse it gets.',
    hp: 900,
    speed: 0.9,
    focus: 25,
    rewardFlat: 40,
    boss: {
      kind: 'projectmanager',
      addType: 'chaser',
      addEvery: 6,
      addCount: 3,
      phaseBurst: 5,
      phase3Speed: 1.2,
      rush: { perSecond: 0.025, max: 1.8 },
      intro: 'The longer he stays, the faster everything moves. Deal with him fast.',
    },
    stunResist: 0.4,
    scale: 1.05,
    accent: '#f2c641',
    model: 'projectmanager',
    armSwing: 0.4,
  },
  finalreview: {
    id: 'finalreview',
    name: 'Your Line Manager, 360',
    role: 'Final boss',
    quote: 'Do you feel stressed? Let us talk about your 360.',
    ability:
      'Your annual review, with feedback from everyone. Three phases like before: a stack of agenda points, then peer reviewers, then questions while your towers near him reload slower. At 66% The Head of Comms comes back for the review, at 33% The Presenter.',
    counter: 'Everything you have learned. Hit hard early, keep damage away from his route at the end, and keep something in reserve for the reviewers.',
    hp: 600,
    shield: 150,
    speed: 1.0,
    focus: 50,
    rewardFlat: 60,
    boss: {
      kind: 'linemanager',
      addType: 'requester',
      addEvery: 7,
      addCount: 2,
      addsFromPhase: 2,
      phaseBurst: 3,
      phase3Speed: 1.4,
      towerSlow: { radius: 3.2, mult: 1.4, fromPhase: 3 },
      reviewers: { phase2: 'headofcomms', phase3: 'presenter', hpShare: 0.2 },
      intro: 'Your 360-degree review. Earlier bosses come back as peer reviewers. Keep something in reserve.',
    },
    stunResist: 0.35,
    scale: 1.2,
    accent: '#8e6fbf',
    model: 'finalreview',
    armSwing: 0.3,
  },
  coldcaller: {
    id: 'coldcaller',
    name: 'The Cold Caller',
    role: 'Immune to DIGITAL',
    quote: 'Is this a good time? Great.',
    ability: 'He does not read email. He calls. Nothing DIGITAL touches him: no Auto-Reply, no Quick Reply, no Reply All.',
    counter: 'Anything PHYSICAL: Office Artillery, The Shredder, Thumbtacks, Keyboard Smash, the Office Chair.',
    short: 'Does not read email. DIGITAL towers do nothing.',
    helps: 'Anything PHYSICAL.',
    counters: ['artillery', 'thumbtacks', 'shredder'],
    hp: 24,
    speed: 2.3,
    focus: 4,
    rewardRate: REWARD_SPECIAL,
    immune: 'digital',
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
    counter: 'Keep most of your towers out of his reach, so they keep dealing with everyone else. A Pomodoro Timer lobs over the walls. Noise Cancelling headphones do not hear the crying.',
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
  phonecaller: {
    id: 'phonecaller',
    name: 'The Speakerphone Caller',
    role: 'Taunt',
    quote: 'Sorry, you are breaking up. Can you hear me now?',
    ability: 'Takes every call on speaker, in the middle of the floor, so everyone looks. Every tower near him aims at him first. Towers that hit one colleague at a time only do him half.',
    counter: 'Anything that hits a crowd: Reply All, Self-Service, Thumbtacks, The Shredder, Delegation. Or keep your single-target towers out of his reach.',
    short: 'Towers near him aim at him first. One-at-a-time towers do him half.',
    helps: 'Towers that hit a crowd.',
    counters: ['delegation', 'thumbtacks', 'replyall'],
    hp: 34,
    speed: 2.15,
    focus: 5,
    rewardRate: REWARD_SPECIAL,
    taunt: 2.8,
    pointResist: 0.5,
    scale: 1,
    accent: '#e67e3a',
    model: 'phonecaller',
    armSwing: 0.4,
  },
  smoker: {
    id: 'smoker',
    name: 'The Smoking Colleague',
    role: 'Boss',
    quote: 'Just popping out for a minute.',
    ability:
      'Walks through the car park in a cloud of his own smoke. Every tower near him reaches a lot less far, and wherever he stops for a puff the smoke hangs around for a while. He brings a Chatterbox along now and then.',
    counter: 'Long range and lots of it: Office Artillery does not care about smoke. Spread your towers out so a cloud never covers all of them.',
    hp: 1000,
    speed: 0.85,
    focus: 30,
    rewardFlat: 40,
    boss: {
      kind: 'smoker',
      addType: 'chatterbox',
      addEvery: 14,
      addCount: 1,
      phaseBurst: 2,
      phase3Speed: 1.35,
      smoke: { radius: 3.2, rangeMult: 0.6, cloudEvery: 6, cloudRadius: 2.2, cloudTime: 10 },
      intro: 'His smoke shortens the range of every tower near him, and it lingers. Office Artillery does not mind.',
    },
    stunResist: 0.4,
    scale: 1.1,
    accent: '#a7adb5',
    model: 'smoker',
    armSwing: 0.3,
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
