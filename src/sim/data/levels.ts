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
  intro: 'The queue for the good machine. Long straight stretches, and everyone is in a hurry.',
  gimmick: 'Speed and crowd control on long straights. Headphones, Office Artillery and The Shredder arrive.',
  size: { w: 21, h: 12 },
  paths: [
    [
      { x: -1.5, y: 6.5 },
      { x: 8.5, y: 6.5 },
      { x: 8.5, y: 2.5 },
      { x: 15.5, y: 2.5 },
      { x: 15.5, y: 10.5 },
      { x: 20.0, y: 10.5 },
    ],
  ],
  desk: { x: 20, y: 10 },
  decor: [
    { model: 'coffee_bar', rect: { x: 3, y: 0, w: 3, h: 1 } },
    { model: 'vending', rect: { x: 11, y: 0, w: 1, h: 1 } },
    { model: 'vending', rect: { x: 12, y: 0, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 0, y: 11, w: 1, h: 1 } },
    { model: 'cooler', rect: { x: 18, y: 0, w: 1, h: 1 } },
    { model: 'desk_pair', rect: { x: 2, y: 9, w: 2, h: 2 } },
    { model: 'desk_pair', rect: { x: 10, y: 8, w: 2, h: 2 } },
    { model: 'plant', rect: { x: 20, y: 0, w: 1, h: 1 } },
  ],
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

export const LEVELS: Record<number, LevelDef> = { 1: L1, 2: L2 };

/** All fifteen level names, so the level select can show what is coming. */
export const LEVEL_NAMES: readonly string[] = [
  'Open-Plan Office',
  'Coffee Corner',
  'Meeting Room',
  'Canteen',
  'Boardroom',
  'Work From Home',
  'The Parking',
  'The Flexplek',
  'Town Hall',
  'Boardroom II',
  'HR Room',
  'The Merger',
  'Server Room',
  'Release Night',
  'Boardroom III',
];
