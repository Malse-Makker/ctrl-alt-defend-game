// Levels. Paths are the Godot coordinates divided by 40 (tile units); tile (x, y) has its centre at
// (x + 0.5, y + 0.5). Waves use the compact spec from the old game:
//   "intern:5@0.80 + newhire:2@1.20"  =  5 Interns 0.8 s apart, then 2 New Hires 1.2 s apart.
// The parser in waves.ts throws on anything it does not understand (no silent parse errors).

export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Decor {
  model: string;
  /** Tile rect it occupies (blocks building). */
  rect: TileRect;
  /** Rotation in quarter turns, 0 = front faces +y. */
  turn?: number;
}

/** A storing: a mini-game that pops up during the level. The game keeps running behind it. */
export interface ProjectorHazard {
  type: 'projector';
  /** Seconds of play before the first one, and between the end of one and the next. */
  first: number;
  every: number;
  /** It closes by itself after this long (auto-skip, so nobody gets stuck). */
  window: number;
  /** Coffee for solving it, plus one per second still left on the clock. */
  reward: number;
  /** What it stops while it is open for you. */
  blocks: 'building';
}

/** Lunch break: a crowd heads for the canteen at once, and everyone on the floor walks faster. */
export interface LunchHazard {
  type: 'lunch';
  first: number;
  every: number;
  /** How long the rush lasts. */
  window: number;
  /** Who comes along, in wave notation ("intern:12@0.15"). */
  swarm: string;
  /** Speed factor for everyone on the floor while it lasts. */
  haste: number;
}

/** No Internet (Work From Home): your WRITTEN towers send nothing until you reconnect. */
export interface NoInternetHazard {
  type: 'nointernet';
  first: number;
  every: number;
  window: number;
  reward: number;
}

/** Exhaust fumes (The Car Park): clouds drift in, and towers inside them reach less far. */
export interface SmokeHazard {
  type: 'smoke';
  first: number;
  every: number;
  window: number;
  /** Clouds per gust, how big, and what is left of a tower's range inside one. */
  clouds: number;
  radius: number;
  rangeMult: number;
}

export type HazardDef = ProjectorHazard | LunchHazard | NoInternetHazard | SmokeHazard;

/** How a floor looks: two floor colours (checkered), the walkway and its edge, and the walls. */
export interface LevelLook {
  floorA: string;
  floorB: string;
  walkway: string;
  edge: string;
  wall?: string;
}

export interface LevelDef {
  id: number;
  name: string;
  block: 'junior' | 'medior' | 'senior';
  intro: string;
  gimmick: string;
  size: { w: number; h: number };
  paths: { x: number; y: number }[][];
  desk: { x: number; y: number };
  decor: Decor[];
  towers: readonly string[];
  startFocus: number;
  waves: readonly string[];
  hazard?: HazardDef;
  /** Leave out for the grey office carpet. */
  look?: LevelLook;
  /** Walls inside the floor: nothing is built on them, and towers cannot shoot through them. */
  walls?: TileRect[];
}

export function startCoffee(levelId: number): number {
  return 40 + 5 * (levelId - 1);
}

const L1: LevelDef = {
  id: 1,
  name: 'Open-Plan Office',
  block: 'junior',
  intro: 'Your first day with a desk of your own. Everyone in the building knows where it is.',
  gimmick: 'A simple S-bend. Learn that Coffee and damage have to grow together.',
  size: { w: 21, h: 11 },
  paths: [
    [
      { x: -1.5, y: 2.5 },
      { x: 7.5, y: 2.5 },
      { x: 7.5, y: 7.5 },
      { x: 14.5, y: 7.5 },
      { x: 14.5, y: 3.5 },
      { x: 20.0, y: 3.5 },
    ],
  ],
  desk: { x: 20, y: 3 },
  decor: [
    { model: 'plant', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { model: 'printer', rect: { x: 10, y: 0, w: 1, h: 1 } },
    { model: 'cooler', rect: { x: 17, y: 0, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 0, y: 10, w: 1, h: 1 } },
    { model: 'desk_pair', rect: { x: 2, y: 9, w: 2, h: 2 } },
    { model: 'desk_pair', rect: { x: 17, y: 8, w: 2, h: 2 } },
    { model: 'plant', rect: { x: 20, y: 0, w: 1, h: 1 } },
  ],
  towers: ['coffee', 'autoreply'],
  startFocus: 100,
  // Godot v0.88 table, translated: Notification -> Intern, Question -> New Hire,
  // User Story -> Requester, All-Hands Meeting -> Head of Comms. Tuned with tools/balance.ts.
  waves: [
    'intern:5@0.80',
    'intern:7@0.75',
    'intern:9@0.70',
    'intern:12@0.60',
    'intern:9@0.70 + newhire:2@1.20',
    'intern:9@0.60 + newhire:3@1.10',
    'intern:10@0.55 + newhire:4@1.00',
    'intern:11@0.50 + newhire:5@1.00',
    'intern:10@0.50 + newhire:5@0.90 + requester:1@1.50',
    'intern:11@0.45 + newhire:6@0.90 + requester:1@1.50',
    'intern:12@0.45 + newhire:6@0.90 + requester:2@1.40',
    'intern:14@0.40 + newhire:7@0.85 + requester:2@1.30',
    'intern:12@0.40 + newhire:8@0.80 + requester:3@1.30',
    'intern:16@0.38 + newhire:9@0.80 + requester:3@1.20',
    'intern:14@0.36 + newhire:10@0.75 + requester:4@1.20',
    'intern:18@0.35 + newhire:11@0.72 + requester:4@1.10',
    'intern:18@0.33 + newhire:12@0.70 + requester:5@1.10',
    'intern:22@0.32 + newhire:13@0.68 + requester:5@1.00',
    'intern:24@0.30 + newhire:14@0.65 + requester:6@1.00',
    'intern:28@0.28 + newhire:16@0.62 + requester:7@0.95',
    'headofcomms:1@2.00 + intern:8@0.60',
  ],
};

const L2: LevelDef = {
  id: 2,
  name: 'Coffee Corner',
  block: 'junior',
  intro: 'The office kitchen. One good coffee machine, one queue, and everyone is in a hurry.',
  gimmick: 'A small square kitchen with long straight stretches: speed and crowd control. Headphones, Office Artillery and The Shredder arrive.',
  size: { w: 14, h: 14 },
  paths: [
    [
      { x: -1.5, y: 11.5 },
      { x: 10.5, y: 11.5 },
      { x: 10.5, y: 6.5 },
      { x: 3.5, y: 6.5 },
      { x: 3.5, y: 2.5 },
      { x: 13.0, y: 2.5 },
    ],
  ],
  desk: { x: 13, y: 2 },
  decor: [
    { model: 'fridge', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { model: 'kitchen_counter', rect: { x: 1, y: 0, w: 4, h: 1 } },
    { model: 'coffee_bar', rect: { x: 5, y: 0, w: 3, h: 1 } },
    { model: 'vending', rect: { x: 9, y: 0, w: 1, h: 1 } },
    { model: 'cooler', rect: { x: 11, y: 0, w: 1, h: 1 } },
    { model: 'high_table', rect: { x: 7, y: 3, w: 2, h: 2 } },
    { model: 'kitchen_table', rect: { x: 5, y: 8, w: 2, h: 2 } },
    { model: 'recycle_bins', rect: { x: 0, y: 4, w: 1, h: 1 }, turn: 1 },
    { model: 'plant', rect: { x: 13, y: 13, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 0, y: 13, w: 1, h: 1 } },
  ],
  // Kitchen tiles, with a dark anti-slip mat as the walkway.
  look: { floorA: '#e7e2d6', floorB: '#d5cfc1', walkway: '#6f7c8a', edge: '#4f5a66', wall: '#eef0ee' },
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder'],
  startFocus: 100,
  // Godot v0.88 table, translated: Notification -> Intern, Question -> New Hire, Thread and
  // Nudge -> Chaser, Micro-manager and User Story -> Requester, Printer -> Board Member,
  // Kletskous -> Chatterbox, Out of Order -> The Repair Guy. Tuned with tools/balance.ts.
  waves: [
    'intern:10@0.65 + newhire:3@1.10',
    'intern:12@0.60 + newhire:3@1.10',
    'intern:10@0.60 + chaser:8@0.30 + newhire:2@1.10',
    'chaser:10@0.26 + newhire:5@1.00 + intern:2@0.60',
    'requester:1@2.00 + intern:10@0.60 + newhire:3@1.00 + chaser:2@0.30',
    'boardmember:1@2.00 + intern:10@0.60 + newhire:3@1.00',
    'oldguard:1@2.00 + chaser:10@0.24 + intern:4@0.60',
    'chatterbox:1@2.00 + intern:12@0.55 + newhire:4@1.00 + chaser:4@0.24',
    'chaser:14@0.20 + requester:2@1.60 + newhire:4@0.95 + intern:2@0.55',
    'chaser:14@0.20 + chatterbox:1@2.00 + newhire:7@0.90',
    'chaser:12@0.20 + oldguard:1@2.00 + boardmember:1@2.00 + intern:3@0.55',
    'requester:3@1.50 + intern:14@0.50 + newhire:4@0.95 + chaser:3@0.20',
    'chaser:16@0.18 + chatterbox:2@1.80 + newhire:6@0.90 + requester:1@1.50 + intern:2@0.50',
    'chaser:16@0.18 + requester:3@1.40 + newhire:5@0.90 + boardmember:1@2.00',
    'chaser:16@0.17 + oldguard:2@1.80 + newhire:2@0.90 + intern:2@0.50',
    'chatterbox:2@1.80 + requester:4@1.30 + intern:16@0.45 + newhire:5@0.85',
    'chaser:20@0.15 + requester:4@1.30 + boardmember:2@1.80 + newhire:4@0.85',
    'chaser:20@0.15 + chatterbox:2@1.70 + oldguard:2@1.70 + newhire:2@0.85 + intern:4@0.45',
    'chaser:20@0.14 + requester:5@1.20 + boardmember:2@1.70 + newhire:4@0.80 + intern:6@0.45',
    'intern:18@0.40 + newhire:7@0.80 + chatterbox:2@1.60 + oldguard:2@1.60',
    'chaser:22@0.13 + requester:4@1.20 + chatterbox:2@1.60 + oldguard:2@1.50 + boardmember:2@1.60',
    'repairguy:1@2.00 + chaser:7@0.16',
  ],
};

const L3: LevelDef = {
  id: 3,
  name: 'Meeting Room',
  block: 'junior',
  intro: 'A meeting that could have been an email, and everyone is invited. They come in waves.',
  gimmick: 'A comb: swarms against area damage. Quick Reply arrives, and someone has to connect the projector.',
  size: { w: 21, h: 12 },
  paths: [
    [
      { x: -1.5, y: 10.5 },
      { x: 4.5, y: 10.5 },
      { x: 4.5, y: 3.5 },
      { x: 10.5, y: 3.5 },
      { x: 10.5, y: 10.5 },
      { x: 16.5, y: 10.5 },
      { x: 16.5, y: 3.5 },
      { x: 20.0, y: 3.5 },
    ],
  ],
  desk: { x: 20, y: 3 },
  decor: [
    { model: 'projector_screen', rect: { x: 5, y: 0, w: 3, h: 1 } },
    { model: 'meeting_table', rect: { x: 12, y: 0, w: 3, h: 2 } },
    { model: 'plant', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 20, y: 11, w: 1, h: 1 } },
    { model: 'cooler', rect: { x: 18, y: 0, w: 1, h: 1 } },
    { model: 'printer', rect: { x: 0, y: 6, w: 1, h: 1 } },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply'],
  startFocus: 100,
  // Meeting room carpet: a deep blue.
  look: { floorA: '#5f6f8c', floorB: '#58678a', walkway: '#d8c9ab', edge: '#b9a888' },
  hazard: { type: 'projector', first: 45, every: 40, window: 10, reward: 5, blocks: 'building' },
  // Godot v0.88 table (Thread -> Chaser, Question -> New Hire, User Story -> Requester), rebuilt
  // into a smooth curve with the same introductions. Tuned with tools/balance.ts.
  waves: [
    'intern:10@0.70 + newhire:2@1.20',
    'intern:13@0.65 + newhire:3@1.10',
    'chaser:12@0.22 + intern:9@0.60 + newhire:2@1.00',
    'intern:8@0.60 + newhire:6@1.00',
    'oldguard:1@2.00 + intern:6@0.65 + newhire:1@1.00',
    'chaser:16@0.18 + intern:8@0.60 + newhire:4@1.00',
    'intern:10@0.55 + newhire:4@1.00 + requester:2@1.50 + chaser:2@0.20',
    'oldguard:1@2.00 + chaser:20@0.14 + newhire:1@1.00',
    'chaser:30@0.12 + newhire:6@0.90',
    'intern:13@0.50 + newhire:4@0.95 + oldguard:1@2.00',
    'chaser:34@0.11 + requester:4@1.40',
    'oldguard:2@1.80 + intern:14@0.50 + chaser:2@0.20',
    'chaser:30@0.11 + newhire:7@0.90 + requester:2@1.40 + intern:2@0.50',
    'intern:16@0.45 + oldguard:2@1.70 + newhire:1@0.90 + chaser:6@0.15',
    'chaser:40@0.10 + newhire:8@0.85 + intern:3@0.50 + requester:2@1.30',
    'oldguard:2@1.60 + requester:4@1.20 + intern:14@0.45',
    'chaser:36@0.10 + intern:18@0.42 + newhire:8@0.80 + requester:2@1.20',
    'oldguard:3@1.50 + chaser:18@0.10 + requester:3@1.20',
    'intern:20@0.40 + newhire:10@0.75 + oldguard:2@1.50 + chaser:10@0.12',
    'chaser:44@0.09 + oldguard:3@1.40 + requester:4@1.10',
    'presenter:1@2.00 + chaser:12@0.14',
  ],
};

const L4: LevelDef = {
  id: 4,
  name: 'Canteen',
  block: 'junior',
  intro: 'Everyone eats at twelve. The queue for the soup winds all the way round the canteen.',
  gimmick: 'A long spiral round the tables, with wet floor where you cannot build. Thumbtacks and Self-Service arrive, and so does lunch.',
  size: { w: 21, h: 12 },
  paths: [
    [
      { x: -1.5, y: 10.5 },
      { x: 18.5, y: 10.5 },
      { x: 18.5, y: 1.5 },
      { x: 2.5, y: 1.5 },
      { x: 2.5, y: 7.5 },
      { x: 14.5, y: 7.5 },
      { x: 14.5, y: 4.5 },
      { x: 7.0, y: 4.5 },
    ],
  ],
  desk: { x: 6, y: 4 },
  decor: [
    { model: 'food_counter', rect: { x: 7, y: 0, w: 4, h: 1 } },
    { model: 'vending', rect: { x: 12, y: 0, w: 1, h: 1 } },
    { model: 'canteen_table', rect: { x: 19, y: 3, w: 2, h: 2 } },
    { model: 'canteen_table', rect: { x: 19, y: 7, w: 2, h: 2 } },
    { model: 'canteen_table', rect: { x: 0, y: 2, w: 2, h: 2 } },
    { model: 'plant', rect: { x: 0, y: 11, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 20, y: 0, w: 1, h: 1 } },
    { model: 'cooler', rect: { x: 0, y: 6, w: 1, h: 1 } },
    { model: 'wet_floor', rect: { x: 8, y: 5, w: 1, h: 1 } },
    { model: 'wet_floor', rect: { x: 11, y: 6, w: 1, h: 1 } },
    { model: 'wet_floor', rect: { x: 6, y: 8, w: 1, h: 1 } },
    { model: 'wet_floor', rect: { x: 12, y: 9, w: 1, h: 1 } },
    { model: 'wet_floor', rect: { x: 16, y: 5, w: 1, h: 1 } },
    { model: 'wet_floor', rect: { x: 10, y: 2, w: 1, h: 1 } },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice'],
  startFocus: 100,
  // Canteen vinyl, light and easy to mop.
  look: { floorA: '#c9d3d6', floorB: '#bcc7cb', walkway: '#e0cfa9', edge: '#bba67c', wall: '#ece8de' },
  hazard: { type: 'lunch', first: 70, every: 70, window: 8, swarm: 'intern:12@0.15', haste: 1.3 },
  // No Godot table to translate (the old Canteen used colleagues that are gone); built on the
  // Meeting Room curve with The Impersonator from wave 4. Tuned with tools/balance.ts.
  waves: [
    'intern:12@0.65 + newhire:3@1.10',
    'intern:12@0.60 + newhire:3@1.00 + chaser:4@0.25',
    'chaser:14@0.20 + intern:10@0.55 + newhire:2@1.00',
    'impersonator:3@1.40 + intern:10@0.60 + newhire:4@1.00',
    'oldguard:1@2.00 + intern:10@0.60 + chaser:4@0.20',
    'chaser:20@0.16 + impersonator:4@1.00 + intern:10@0.55',
    'intern:12@0.50 + newhire:4@0.95 + requester:2@1.50 + chaser:4@0.20',
    'oldguard:1@2.00 + chaser:20@0.14 + impersonator:3@0.90',
    'chaser:30@0.12 + newhire:7@0.90',
    'impersonator:6@0.80 + intern:12@0.50 + oldguard:1@2.00',
    'chaser:34@0.11 + requester:4@1.40 + impersonator:2@0.80',
    'oldguard:2@1.80 + intern:16@0.48 + chaser:4@0.20',
    'chaser:32@0.11 + newhire:8@0.85 + impersonator:5@0.70',
    'intern:18@0.45 + oldguard:2@1.70 + requester:2@1.30',
    'chaser:42@0.10 + newhire:10@0.80 + impersonator:5@0.70',
    'oldguard:2@1.60 + requester:4@1.20 + intern:20@0.42',
    'impersonator:10@0.55 + chaser:36@0.10 + newhire:12@0.75',
    'oldguard:3@1.50 + chaser:22@0.10 + requester:4@1.20',
    'intern:24@0.40 + newhire:14@0.72 + impersonator:8@0.60 + chaser:24@0.11',
    'chaser:46@0.09 + oldguard:3@1.40 + requester:4@1.10',
    'oldguard:3@1.30 + impersonator:10@0.50 + newhire:12@0.70 + chaser:10@0.10',
    'cleaner:1@2.00 + chaser:14@0.14',
  ],
};

const L5: LevelDef = {
  id: 5,
  name: 'Boardroom',
  block: 'junior',
  intro: 'The board meets today. Everyone walks the long way round the table to get to you.',
  gimmick: 'A loop round the boardroom table. The specials arrive: Keyboard Smash and the Office Chair, one each. And Your Line Manager wants a word.',
  size: { w: 21, h: 12 },
  paths: [
    [
      { x: -1.5, y: 9.5 },
      { x: 3.5, y: 9.5 },
      { x: 3.5, y: 1.5 },
      { x: 17.5, y: 1.5 },
      { x: 17.5, y: 9.5 },
      { x: 10.5, y: 9.5 },
      { x: 10.5, y: 11.0 },
    ],
  ],
  desk: { x: 10, y: 11 },
  decor: [
    { model: 'boardroom_table', rect: { x: 6, y: 4, w: 9, h: 3 } },
    { model: 'projector_screen', rect: { x: 8, y: 0, w: 3, h: 1 } },
    { model: 'sideboard', rect: { x: 12, y: 0, w: 2, h: 1 } },
    { model: 'plant', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 20, y: 0, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 20, y: 11, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 0, y: 11, w: 1, h: 1 } },
    { model: 'cooler', rect: { x: 20, y: 5, w: 1, h: 1 } },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair'],
  startFocus: 100,
  // Dark wood, and a burgundy runner where everyone walks.
  look: { floorA: '#6b5644', floorB: '#634f3e', walkway: '#8f3b33', edge: '#6d2b25', wall: '#e7e1d5' },
  // A smooth curve of about 10% per wave, with Board Members (only WRITTEN hurts them) from wave 7.
  waves: [
    'intern:14@0.65 + newhire:3@1.10',
    'intern:12@0.60 + newhire:3@1.00 + chaser:6@0.25',
    'chaser:15@0.20 + intern:10@0.55 + newhire:2@1.00',
    'impersonator:3@1.40 + intern:10@0.60 + newhire:4@1.00 + chaser:2@0.25',
    'oldguard:1@2.00 + intern:10@0.60 + chaser:6@0.20',
    'chatterbox:1@2.00 + intern:12@0.55 + newhire:5@0.95 + chaser:6@0.20',
    'boardmember:1@2.00 + intern:12@0.50 + newhire:5@0.95 + chaser:4@0.20',
    'oldguard:1@2.00 + chaser:20@0.14 + impersonator:4@0.90',
    'chaser:30@0.12 + newhire:7@0.90 + intern:6@0.50',
    'chatterbox:2@1.80 + intern:14@0.50 + oldguard:1@2.00 + newhire:2@0.90 + chaser:5@0.15',
    'chaser:34@0.11 + requester:4@1.40 + boardmember:1@2.00 + intern:2@0.50',
    'oldguard:2@1.80 + intern:16@0.48 + chaser:6@0.20 + impersonator:3@0.80',
    'chaser:32@0.11 + newhire:8@0.85 + impersonator:5@0.70 + boardmember:1@2.00',
    'intern:18@0.45 + oldguard:2@1.70 + requester:3@1.30 + chatterbox:1@1.80',
    'chaser:46@0.10 + newhire:10@0.80 + impersonator:5@0.70 + boardmember:1@2.00',
    'oldguard:2@1.60 + requester:4@1.20 + intern:20@0.42 + chatterbox:1@1.80 + newhire:3@0.80',
    'impersonator:10@0.55 + chaser:36@0.10 + newhire:12@0.75 + boardmember:2@1.80',
    'oldguard:3@1.50 + chaser:24@0.10 + requester:4@1.20 + chatterbox:2@1.60 + newhire:2@0.80',
    'intern:24@0.40 + newhire:18@0.70 + impersonator:8@0.60 + chaser:24@0.11 + boardmember:1@1.80',
    'chaser:48@0.09 + oldguard:3@1.40 + requester:5@1.10 + boardmember:2@1.60',
    'oldguard:4@1.30 + impersonator:10@0.50 + newhire:8@0.70 + chaser:12@0.10 + chatterbox:2@1.50 + boardmember:1@1.60',
    'linemanager:1@2.00 + newhire:6@0.80',
  ],
};

const L6: LevelDef = {
  id: 6,
  name: 'Work From Home',
  block: 'medior',
  intro: 'You thought working from home would be quiet. Your colleagues found the address.',
  gimmick: 'A spiral through your house, with walls your towers cannot see through. The internet keeps dropping out. Reply All arrives, and so does The Cold Caller.',
  size: { w: 18, h: 14 },
  paths: [
    [
      { x: -1.5, y: 12.5 },
      { x: 16.5, y: 12.5 },
      { x: 16.5, y: 1.5 },
      { x: 1.5, y: 1.5 },
      { x: 1.5, y: 9.5 },
      { x: 13.5, y: 9.5 },
      { x: 13.5, y: 4.5 },
      { x: 5.5, y: 4.5 },
      { x: 5.5, y: 7.0 },
    ],
  ],
  desk: { x: 5, y: 7 },
  walls: [
    { x: 3, y: 11, w: 10, h: 1 },
    { x: 15, y: 3, w: 1, h: 7 },
    { x: 4, y: 2, w: 9, h: 1 },
  ],
  decor: [
    { model: 'sofa', rect: { x: 4, y: 10, w: 2, h: 1 } },
    { model: 'tv_stand', rect: { x: 8, y: 10, w: 2, h: 1 } },
    { model: 'plant', rect: { x: 11, y: 10, w: 1, h: 1 } },
    { model: 'fridge', rect: { x: 14, y: 2, w: 1, h: 1 } },
    { model: 'kitchen_counter', rect: { x: 14, y: 4, w: 1, h: 4 }, turn: 1 },
    { model: 'bed', rect: { x: 2, y: 5, w: 2, h: 2 } },
    { model: 'bookshelf', rect: { x: 12, y: 8, w: 1, h: 1 } },
    { model: 'cat', rect: { x: 8, y: 6, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 17, y: 13, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 0, y: 0, w: 1, h: 1 } },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall'],
  startFocus: 100,
  // Oak floorboards, and a green runner in the hall.
  look: { floorA: '#b98d5f', floorB: '#ad8256', walkway: '#6f8f7a', edge: '#56705f', wall: '#ece6da' },
  hazard: { type: 'nointernet', first: 60, every: 55, window: 12, reward: 6 },
  // Medior: 15 waves that start where the junior floors left off and climb about 15% a wave.
  // The Cold Caller (only IN PERSON hurts him) from wave 3.
  waves: [
    'intern:16@0.50 + newhire:3@0.95 + chaser:4@0.20',
    'intern:14@0.48 + newhire:4@0.90 + chaser:4@0.20',
    'chaser:12@0.16 + coldcaller:1@1.10 + newhire:5@0.85',
    'oldguard:1@2.00 + intern:12@0.45 + coldcaller:1@1.00 + chaser:3@0.18',
    'impersonator:4@0.80 + newhire:6@0.80 + coldcaller:2@1.00 + chaser:4@0.18',
    'boardmember:1@1.60 + coldcaller:3@0.95 + intern:16@0.42 + chaser:10@0.14',
    'oldguard:1@1.60 + chatterbox:2@1.60 + coldcaller:3@0.95 + intern:14@0.42',
    'chaser:40@0.10 + coldcaller:3@0.90 + newhire:8@0.75',
    'requester:4@1.00 + boardmember:2@1.50 + coldcaller:4@0.85 + impersonator:4@0.60 + chaser:10@0.12',
    'oldguard:2@1.40 + coldcaller:5@0.85 + intern:20@0.38 + chaser:12@0.12',
    'chaser:50@0.09 + newhire:12@0.65 + coldcaller:5@0.80 + chatterbox:1@1.50',
    'oldguard:2@1.30 + requester:4@0.95 + coldcaller:6@0.80 + impersonator:5@0.55 + newhire:5@0.70',
    'boardmember:3@1.30 + coldcaller:7@0.75 + newhire:14@0.60 + chaser:40@0.09',
    'oldguard:2@1.20 + coldcaller:7@0.70 + requester:5@0.90 + chaser:34@0.09 + newhire:8@0.65',
    'baby:1@2.00 + newhire:6@0.70 + coldcaller:3@0.80',
  ],
};

const L7: LevelDef = {
  id: 7,
  name: 'The Car Park',
  block: 'medior',
  intro: 'Everyone parks underground. Everyone also walks past your car on the way in.',
  gimmick: 'A wide switchback between parked cars, with lanes along the walls. Exhaust fumes cut your range. Delegation arrives, and The Phone Caller wants all the attention.',
  size: { w: 22, h: 14 },
  paths: [
    [
      { x: -1.5, y: 1.5 },
      { x: 20.5, y: 1.5 },
      { x: 20.5, y: 5.5 },
      { x: 2.5, y: 5.5 },
      { x: 2.5, y: 9.5 },
      { x: 20.5, y: 9.5 },
      { x: 20.5, y: 12.5 },
      { x: 10.0, y: 12.5 },
    ],
  ],
  desk: { x: 9, y: 12 },
  decor: [
    { model: 'car', rect: { x: 4, y: 3, w: 2, h: 1 } },
    { model: 'van', rect: { x: 8, y: 3, w: 2, h: 1 } },
    { model: 'car', rect: { x: 12, y: 3, w: 2, h: 1 } },
    { model: 'car', rect: { x: 16, y: 3, w: 2, h: 1 } },
    { model: 'car', rect: { x: 6, y: 7, w: 2, h: 1 } },
    { model: 'car', rect: { x: 10, y: 7, w: 2, h: 1 } },
    { model: 'van', rect: { x: 14, y: 7, w: 2, h: 1 } },
    { model: 'car', rect: { x: 18, y: 7, w: 2, h: 1 } },
    { model: 'car', rect: { x: 13, y: 11, w: 2, h: 1 } },
    { model: 'car', rect: { x: 2, y: 13, w: 2, h: 1 } },
    { model: 'van', rect: { x: 15, y: 13, w: 2, h: 1 } },
    { model: 'ticket_machine', rect: { x: 0, y: 3, w: 1, h: 1 } },
    { model: 'lamp_post', rect: { x: 21, y: 0, w: 1, h: 1 } },
    { model: 'lamp_post', rect: { x: 0, y: 11, w: 1, h: 1 } },
    { model: 'lamp_post', rect: { x: 21, y: 13, w: 1, h: 1 } },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall', 'delegation'],
  startFocus: 100,
  // Asphalt, a green walkway for pedestrians, white edge lines, concrete walls.
  look: { floorA: '#50555c', floorB: '#4b5057', walkway: '#4f8a63', edge: '#e9e6df', wall: '#c9c6bf' },
  hazard: { type: 'smoke', first: 40, every: 45, window: 14, clouds: 2, radius: 2.4, rangeMult: 0.55 },
  // Medior: about 15% a wave, a bit heavier than Work From Home. The Phone Caller from wave 3.
  waves: [
    'intern:18@0.48 + newhire:3@0.95 + chaser:6@0.20',
    'intern:14@0.46 + newhire:4@0.90 + coldcaller:1@1.20 + chaser:5@0.20',
    'chaser:15@0.15 + phonecaller:1@1.20 + newhire:5@0.85 + intern:6@0.45',
    'oldguard:1@2.00 + intern:12@0.45 + phonecaller:1@1.10 + coldcaller:1@1.00 + chaser:3@0.18',
    'impersonator:4@0.80 + newhire:7@0.80 + phonecaller:2@1.00 + chaser:9@0.16',
    'boardmember:1@1.60 + coldcaller:2@0.95 + phonecaller:2@1.00 + intern:16@0.42 + chaser:10@0.14',
    'oldguard:1@1.60 + chatterbox:2@1.60 + phonecaller:2@0.95 + coldcaller:2@0.95 + intern:14@0.42',
    'chaser:40@0.10 + phonecaller:3@0.90 + newhire:9@0.75',
    'requester:4@1.00 + boardmember:2@1.50 + phonecaller:3@0.85 + impersonator:5@0.60 + chaser:21@0.12',
    'oldguard:2@1.40 + phonecaller:4@0.85 + coldcaller:3@0.85 + intern:20@0.38',
    'chaser:50@0.09 + newhire:12@0.65 + phonecaller:4@0.80 + coldcaller:3@0.80',
    'oldguard:2@1.30 + requester:5@0.95 + phonecaller:5@0.80 + coldcaller:4@0.80 + impersonator:5@0.55',
    'boardmember:3@1.30 + phonecaller:6@0.75 + newhire:15@0.60 + chaser:40@0.09 + chatterbox:2@1.40',
    'oldguard:3@1.20 + phonecaller:6@0.70 + requester:6@0.90 + chaser:40@0.09 + coldcaller:3@0.80',
    'smoker:1@2.00 + newhire:8@0.70 + phonecaller:3@0.80',
  ],
};

export const LEVELS: Record<number, LevelDef> = { 1: L1, 2: L2, 3: L3, 4: L4, 5: L5, 6: L6, 7: L7 };

/** All fifteen level names, so the level select can show what is coming. */
export const LEVEL_NAMES: readonly string[] = [
  'Open-Plan Office',
  'Coffee Corner',
  'Meeting Room',
  'Canteen',
  'Boardroom',
  'Work From Home',
  'The Car Park',
  'Hot Desks',
  'Town Hall',
  'Boardroom II',
  'HR Room',
  'The Merger',
  'Server Room',
  'Release Night',
  'Boardroom III',
];
