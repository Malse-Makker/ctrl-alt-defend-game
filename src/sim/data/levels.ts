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

/** A wall: a rect of tiles. A single tile is drawn along x unless `along` says otherwise. */
export interface WallRect extends TileRect {
  along?: 'x' | 'y';
}

export interface Decor {
  model: string;
  /** Tile rect it occupies (blocks building, unless the floor has a grid: then the grid decides). */
  rect: TileRect;
  /** Rotation in quarter turns, 0 = front faces +y. */
  turn?: number;
  /** A worktop you may build on: the height of its top. Towers stand on it without their cabinet. */
  surface?: number;
  /** A step you may build on (the tribune): towers stand on it with their cabinet, this much higher. */
  raise?: number;
  /** Something people walk through (a door): it may stand on the walkway. */
  walkThrough?: boolean;
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

/** No Internet (Work From Home): your DIGITAL towers send nothing until you reconnect. */
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

/**
 * The desk phone (Hot Desks): it rings on a flex desk. Hang up (red) and you get Coffee. Pick up
 * (green) or let it ring, and that desk is stuck on the call: the tower on it does nothing for a while.
 */
export interface PhoneHazard {
  type: 'phone';
  first: number;
  every: number;
  /** Seconds it rings before it counts as ignored. */
  window: number;
  reward: number;
  /** Seconds the desk is stuck on the call. */
  block: number;
}

/** The fire alarm (Town Hall): everyone stops where they are, then rushes to the front. */
export interface FireAlarmHazard {
  type: 'firealarm';
  first: number;
  every: number;
  /** Seconds everyone stands still, then seconds they rush at `haste` times their speed. */
  freeze: number;
  rush: number;
  haste: number;
}

/** The blinds (Boardroom II): the glass room around the table goes dark while the board meets. */
export interface BlindsHazard {
  type: 'blinds';
  first: number;
  every: number;
  /** Seconds the blinds stay down, and the seconds of warning (the rattle) before they come down. */
  window: number;
  warn: number;
}

/** The HR form (HR Room): fill it in. While it is open for you, you cannot upgrade anything. */
export interface FormHazard {
  type: 'form';
  first: number;
  every: number;
  window: number;
  reward: number;
}

/**
 * Overheating (Server Room): the cooling fails. For a while the room is not cold (towers fire at
 * full speed), but the racks give off smoke: towers in a cloud reach less far.
 */
export interface OverheatHazard {
  type: 'overheat';
  first: number;
  every: number;
  window: number;
  clouds: number;
  radius: number;
  rangeMult: number;
}

/**
 * Pizza (Release Night): the delivery guy leaves a pizza on a free tile. Click it in time: Coffee,
 * and the spot is lit for a while (the box lid glows).
 */
export interface PizzaHazard {
  type: 'pizza';
  first: number;
  every: number;
  window: number;
  reward: number;
  /** Seconds the pizza's spot stays lit, and how far the light reaches. */
  light: number;
  radius: number;
}

export type HazardDef = ProjectorHazard | LunchHazard | NoInternetHazard | SmokeHazard | PhoneHazard | FireAlarmHazard | BlindsHazard | FormHazard | OverheatHazard | PizzaHazard;

/** How a floor looks: two floor colours (checkered), the walkway and its edge, and the walls. */
export interface LevelLook {
  floorA: string;
  floorB: string;
  walkway: string;
  edge: string;
  wall?: string;
  /** The wall along x = 0 is a glass front, drawn by the decor (with its own doors). */
  glassFront?: boolean;
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
  /**
   * Server Room: a closed room. Towers inside only reach colleagues inside, towers outside only
   * those outside; towers that reach the whole floor (Office Artillery, Pomodoro Timer) anywhere.
   */
  closedZone?: TileRect;
  /** Town Hall: every wave comes in through all the entrances at once, one colleague each in turn. */
  splitPaths?: boolean;
  /** Hot Desks: this many empty flex desks (b) are reserved at the start of every wave. */
  reserve?: number;
  /** The boss comes back heavier: its HP times this (Head of Comms on Hot Desks, x1.8). */
  bossHpMult?: number;
  /** Leave out for the grey office carpet. */
  look?: LevelLook;
  /** Walls inside the floor: nothing is built on them, and towers cannot shoot through them. */
  walls?: WallRect[];
  /**
   * One letter per tile (see src/sim/grid.ts). When a floor has one, it alone decides where you
   * may build and what blocks sight; `decor` is then only the furniture you see.
   */
  grid?: readonly string[];
}

/** A run of one-tile pieces (counter segments, stools): `n` of them from (x, y), along x or y. */
function run(model: string, x: number, y: number, n: number, along: 'x' | 'y', extra: Omit<Decor, 'model' | 'rect'> = {}): Decor[] {
  return Array.from({ length: n }, (_, i) => ({ model, rect: { x: along === 'x' ? x + i : x, y: along === 'y' ? y + i : y, w: 1, h: 1 }, ...extra }));
}

export function startCoffee(levelId: number): number {
  return 40 + 5 * (levelId - 1);
}

const L1: LevelDef = {
  id: 1,
  name: 'Reception',
  block: 'junior',
  intro: 'Your first day. Everyone signs in at reception, goes through the gates, and comes straight to your desk.',
  gimmick: 'Past the reception desk, then through the speed gates in the glass wall. Everyone stops at the gates to scan their pass: a good place for your first Auto-Reply.',
  size: { w: 20, h: 12 },
  paths: [
    [
      { x: -1.5, y: 9.5 },
      { x: 4.5, y: 9.5 },
      { x: 4.5, y: 3.5 },
      { x: 10.5, y: 3.5 },
      { x: 10.5, y: 7.5 },
      { x: 15.5, y: 7.5 },
      { x: 15.5, y: 3.5 },
      { x: 18.0, y: 3.5 },
    ],
  ],
  desk: { x: 18, y: 3 },
  // After the level design (docs/leveldesign, level 1), reworked with the maker (2026-11-12): the
  // hall (left) and the offices (right) are split by a glass wall, and the only way through is
  // the speed gates. Everyone walks past the reception desk to sign in first. The lifts are on
  // the office side, behind the gates.
  grid: [
    'g.ttt.HHH.tt.g..t.tt',
    'g.....----..Hg......',
    'g.t...tttt...g......',
    'g...=======..H.===D-',
    'g...=.....=..H.=....',
    'g.H.=.ttt.=..g.=.tt.',
    'g...=.ttt.=..t.=.tt.',
    'g...=.....===G==....',
    'gt..=......HHt......',
    'S====..tt....g......',
    'gt.....tt.HHHgttHHHH',
    'gt.........HHgttHHHH',
  ],
  decor: [
    ...run('glass_front', 0, 0, 9, 'y', { turn: 1 }),
    ...run('glass_front', 0, 10, 2, 'y', { turn: 1 }),
    { model: 'glass_doors', rect: { x: 0, y: 9, w: 1, h: 1 }, turn: 1, walkThrough: true },
    { model: 'coat_stand', rect: { x: 1, y: 10, w: 1, h: 1 } },
    { model: 'waiting_bench', rect: { x: 2, y: 0, w: 3, h: 1 } },
    { model: 'mail_slots', rect: { x: 6, y: 0, w: 3, h: 1 } },
    { model: 'reception_desk', rect: { x: 6, y: 2, w: 4, h: 1 } },
    { model: 'brochure_rack', rect: { x: 10, y: 0, w: 2, h: 1 } },
    { model: 'lounge_wide', rect: { x: 6, y: 5, w: 3, h: 2 } },
    { model: 'lounge_square', rect: { x: 7, y: 9, w: 2, h: 2 } },
    { model: 'pillar', rect: { x: 2, y: 5, w: 1, h: 1 } },
    { model: 'pillar', rect: { x: 12, y: 1, w: 1, h: 1 } },
    { model: 'pillar', rect: { x: 10, y: 10, w: 1, h: 1 } },
    { model: 'security_post', rect: { x: 11, y: 8, w: 2, h: 1 }, turn: 2 },
    { model: 'sculpture', rect: { x: 11, y: 10, w: 2, h: 2 } },
    { model: 'plant', rect: { x: 2, y: 2, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 1, y: 8, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 1, y: 11, w: 1, h: 1 } },
    // The glass wall with the logo and the speed gates.
    ...run('glass_partition', 13, 0, 3, 'y', { turn: 1 }),
    { model: 'logo_wall', rect: { x: 13, y: 3, w: 1, h: 2 }, turn: 3 },
    { model: 'glass_partition', rect: { x: 13, y: 5, w: 1, h: 1 }, turn: 1 },
    { model: 'speed_gate', rect: { x: 13, y: 6, w: 1, h: 1 }, turn: 3 },
    { model: 'speed_gate', rect: { x: 13, y: 8, w: 1, h: 1 }, turn: 1 },
    ...run('glass_partition', 13, 9, 3, 'y', { turn: 1 }),
    // The offices behind the gates.
    { model: 'printer', rect: { x: 16, y: 0, w: 1, h: 1 } },
    { model: 'cooler', rect: { x: 18, y: 0, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 19, y: 0, w: 1, h: 1 } },
    { model: 'desk_pair', rect: { x: 17, y: 5, w: 2, h: 2 } },
    { model: 'planter_big', rect: { x: 14, y: 10, w: 2, h: 2 } },
    { model: 'lifts', rect: { x: 16, y: 10, w: 4, h: 2 }, turn: 2 },
  ],
  // Light marble with a dark brown runner.
  look: { floorA: '#e9e6df', floorB: '#dedad1', walkway: '#5b4336', edge: '#3d2c22', wall: '#f2f0ea', glassFront: true },
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
  gimmick: 'A small kitchen with a lot of furniture in it. You build on the bit of floor that is left. Headphones, Office Artillery and The Shredder arrive.',
  size: { w: 14, h: 14 },
  paths: [
    [
      { x: -1.5, y: 11.5 },
      { x: 10.5, y: 11.5 },
      { x: 10.5, y: 6.5 },
      { x: 3.5, y: 6.5 },
      { x: 3.5, y: 2.5 },
      { x: 12.0, y: 2.5 },
    ],
  ],
  desk: { x: 12, y: 2 },
  // The level design (docs/leveldesign, level 2), after the maker's review: towers with a cabinet
  // of their own do not go on a kitchen counter. You build on the floor, and the kitchen is full
  // enough that the good spots by the bends are scarce.
  grid: [
    'HttttttttttttH',
    't....w.w....tH',
    't..=========D-',
    'H..=........tt',
    'H..=.ttttttt.t',
    '...=........tt',
    't..========..t',
    't....ttt..=t.t',
    'ttt.ttttt.=.tt',
    '.tt.ttttt.=..t',
    't....ttt..=.tt',
    'S==========..t',
    '.ttttttttttttt',
    'tttttttttttttt',
  ],
  decor: [
    { model: 'fridge', rect: { x: 0, y: 0, w: 1, h: 1 } },
    ...run('counter', 0, 1, 2, 'y', { turn: 1 }),
    { model: 'counter', rect: { x: 1, y: 0, w: 1, h: 1 } },
    { model: 'counter_sink', rect: { x: 2, y: 0, w: 1, h: 1 } },
    ...run('counter', 3, 0, 2, 'x'),
    ...run('counter_coffee', 5, 0, 3, 'x'),
    { model: 'counter', rect: { x: 8, y: 0, w: 1, h: 1 } },
    { model: 'counter_microwave', rect: { x: 9, y: 0, w: 1, h: 1 } },
    ...run('counter', 10, 0, 3, 'x'),
    { model: 'tall_cabinet', rect: { x: 13, y: 0, w: 1, h: 2 }, turn: 3 },
    // Someone always spills by the coffee machines.
    { model: 'wet_floor', rect: { x: 5, y: 1, w: 1, h: 1 } },
    { model: 'wet_floor', rect: { x: 7, y: 1, w: 1, h: 1 } },
    { model: 'recycle_bins', rect: { x: 12, y: 1, w: 1, h: 1 } },
    ...run('vending', 0, 3, 2, 'y', { turn: 1 }),
    { model: 'cooler', rect: { x: 12, y: 3, w: 1, h: 1 }, turn: 3 },
    { model: 'counter', rect: { x: 13, y: 3, w: 1, h: 1 }, turn: 3 },
    ...run('counter_hob', 13, 4, 2, 'y', { turn: 3 }),
    ...run('counter', 13, 6, 5, 'y', { turn: 3 }),
    { model: 'bar_table', rect: { x: 6, y: 4, w: 1, h: 1 } },
    { model: 'bar_table', rect: { x: 10, y: 4, w: 1, h: 1 } },
    ...[5, 7, 9, 11].map((x) => ({ model: 'bar_stool', rect: { x, y: 4, w: 1, h: 1 } })),
    { model: 'plant', rect: { x: 8, y: 4, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 12, y: 5, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 0, y: 6, w: 1, h: 1 } },
    { model: 'sofa', rect: { x: 0, y: 7, w: 1, h: 2 }, turn: 1 },
    { model: 'canteen_table', rect: { x: 1, y: 8, w: 2, h: 2 } },
    { model: 'recycle_bins', rect: { x: 0, y: 10, w: 1, h: 1 }, turn: 1 },
    { model: 'dining_table', rect: { x: 5, y: 8, w: 3, h: 2 } },
    ...run('kitchen_chair', 5, 7, 3, 'x'),
    ...run('kitchen_chair', 5, 10, 3, 'x', { turn: 2 }),
    ...run('kitchen_chair', 4, 8, 2, 'y', { turn: 1 }),
    ...run('kitchen_chair', 8, 8, 2, 'y', { turn: 3 }),
    { model: 'plant', rect: { x: 11, y: 7, w: 1, h: 1 } },
    { model: 'bar_table', rect: { x: 12, y: 8, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 12, y: 10, w: 1, h: 1 } },
    { model: 'recycle_bins', rect: { x: 13, y: 11, w: 1, h: 1 }, turn: 3 },
    ...run('bar_stool', 1, 12, 12, 'x'),
    { model: 'plant', rect: { x: 13, y: 12, w: 1, h: 1 } },
    ...run('window_bar', 1, 13, 13, 'x', { turn: 2 }),
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
  name: 'Presentation Room',
  block: 'junior',
  intro: 'You are giving the presentation. Everyone has a laptop open, and nobody is looking at you.',
  gimmick: 'They wind through the rows of tables towards you. The projector acts up, but it warns you three seconds early. Quick Reply arrives.',
  size: { w: 21, h: 12 },
  paths: [
    [
      { x: -1.5, y: 10.5 },
      { x: 19.5, y: 10.5 },
      { x: 19.5, y: 7.5 },
      { x: 1.5, y: 7.5 },
      { x: 1.5, y: 4.5 },
      { x: 16.5, y: 4.5 },
      { x: 16.5, y: 3.0 },
    ],
  ],
  desk: { x: 16, y: 2 },
  // The level design (docs/leveldesign, level 3). The maker's call: no laptop spots, you build
  // on the floor like everywhere else.
  grid: [
    't..HHHHHHHHHHHH...HHt',
    't....................',
    '................Dt...',
    '.........t......=...t',
    '.================....',
    '.=.tttttt..tttttt....',
    '.=.tttttt..tttttt....',
    '.===================.',
    '..ttttttt..ttttttt.=.',
    '..ttttttt..ttttttt.=.',
    'S===================.',
    't.ttt...tt....HHH...t',
  ],
  decor: [
    { model: 'plant', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { model: 'cooler', rect: { x: 0, y: 1, w: 1, h: 1 }, turn: 1 },
    { model: 'whiteboard', rect: { x: 3, y: 0, w: 3, h: 1 } },
    { model: 'bookshelf', rect: { x: 6, y: 0, w: 1, h: 1 } },
    { model: 'speaker', rect: { x: 7, y: 0, w: 1, h: 1 } },
    { model: 'projector_screen', rect: { x: 8, y: 0, w: 3, h: 1 } },
    { model: 'speaker', rect: { x: 11, y: 0, w: 1, h: 1 } },
    { model: 'bookshelf', rect: { x: 12, y: 0, w: 1, h: 1 } },
    { model: 'tall_cabinet', rect: { x: 13, y: 0, w: 2, h: 1 } },
    ...run('bookshelf', 18, 0, 2, 'x'),
    { model: 'plant', rect: { x: 20, y: 0, w: 1, h: 1 } },
    // Your laptop, next to the lectern, facing you.
    { model: 'conference_table', rect: { x: 17, y: 2, w: 1, h: 1 }, turn: 3 },
    { model: 'beamer', rect: { x: 9, y: 3, w: 1, h: 1 }, turn: 2 },
    { model: 'plant', rect: { x: 20, y: 3, w: 1, h: 1 } },
    ...run('conference_table', 3, 5, 6, 'x'),
    ...run('conference_table', 11, 5, 6, 'x'),
    ...run('conference_chair', 3, 6, 6, 'x', { turn: 2 }),
    ...run('conference_chair', 11, 6, 6, 'x', { turn: 2 }),
    ...run('conference_table', 2, 8, 7, 'x'),
    ...run('conference_table', 11, 8, 7, 'x'),
    ...run('conference_chair', 2, 9, 7, 'x', { turn: 2 }),
    ...run('conference_chair', 11, 9, 7, 'x', { turn: 2 }),
    { model: 'plant', rect: { x: 0, y: 11, w: 1, h: 1 } },
    { model: 'coffee_bar', rect: { x: 2, y: 11, w: 3, h: 1 }, turn: 2 },
    ...run('chair_stack', 8, 11, 2, 'x'),
    ...run('bookshelf', 14, 11, 3, 'x', { turn: 2 }),
    { model: 'plant', rect: { x: 20, y: 11, w: 1, h: 1 } },
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
  gimmick: 'A long spiral round the tables, and a queue for the soup where only Thumbtacks may go. Thumbtacks and Self-Service arrive, and so does lunch.',
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
  // The level design (docs/leveldesign, level 4). n: the queue for the soup, Thumbtacks only.
  grid: [
    'tt..........HH......t',
    '..=================..',
    't.=.ttttttttt.....=..',
    't.=......w......H.=tt',
    't.=...D========.H.=tt',
    '..=.tttttttt..=.H.=..',
    't.=...w....w..=.H.=..',
    '..=============...=tt',
    '....tttt..tttt..w.=tt',
    '...nnnnnnnnnnnnn..=..',
    'S==================..',
    't...HHHHHHHHHH...w...',
  ],
  decor: [
    { model: 'plant', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { model: 'cooler', rect: { x: 1, y: 0, w: 1, h: 1 } },
    ...run('vending', 12, 0, 2, 'x'),
    { model: 'plant', rect: { x: 20, y: 0, w: 1, h: 1 } },
    { model: 'recycle_bins', rect: { x: 0, y: 2, w: 1, h: 1 }, turn: 1 },
    { model: 'plant', rect: { x: 0, y: 3, w: 1, h: 1 } },
    { model: 'cooler', rect: { x: 0, y: 4, w: 1, h: 1 }, turn: 1 },
    { model: 'plant', rect: { x: 0, y: 6, w: 1, h: 1 } },
    ...run('canteen_long', 4, 2, 9, 'x'),
    ...run('canteen_long', 4, 5, 8, 'x'),
    ...run('canteen_long', 4, 8, 4, 'x'),
    ...run('canteen_long', 10, 8, 4, 'x'),
    ...run('salad_bar', 16, 3, 4, 'y', { turn: 3 }),
    { model: 'canteen_table', rect: { x: 19, y: 3, w: 2, h: 2 } },
    { model: 'canteen_table', rect: { x: 19, y: 7, w: 2, h: 2 } },
    { model: 'wet_floor', rect: { x: 9, y: 3, w: 1, h: 1 } },
    { model: 'wet_floor', rect: { x: 6, y: 6, w: 1, h: 1 } },
    { model: 'wet_floor', rect: { x: 11, y: 6, w: 1, h: 1 } },
    { model: 'wet_floor', rect: { x: 16, y: 8, w: 1, h: 1 } },
    { model: 'wet_floor', rect: { x: 17, y: 11, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 0, y: 11, w: 1, h: 1 } },
    ...run('serving_counter', 4, 11, 10, 'x', { turn: 2 }),
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice'],
  startFocus: 100,
  // Canteen vinyl, light and easy to mop.
  look: { floorA: '#c9d3d6', floorB: '#bcc7cb', walkway: '#e0cfa9', edge: '#bba67c', wall: '#ece8de' },
  hazard: { type: 'lunch', first: 70, every: 70, window: 8, swarm: 'intern:12@0.15', haste: 1.3 },
  // No Godot table to translate (the old Canteen used colleagues that are gone); built on the
  // Presentation Room curve with The Impersonator from wave 4. Tuned with tools/balance.ts.
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
      { x: 10.5, y: 10.0 },
    ],
  ],
  desk: { x: 10, y: 10 },
  // The level design (docs/leveldesign, level 5), with your desk one tile up from the edge so
  // your chair fits behind it. Levels 10 and 15 come back to this room.
  grid: [
    't.......HHHHH.ttt..HH',
    '...===============.HH',
    '...=.............=.HH',
    't..=.H.........H.=...',
    't..=..ttttttttt..=...',
    't..=..ttttttttt..=...',
    't..=..ttttttttt..=..t',
    'H..=.............=...',
    '...=.............=...',
    'S===......========...',
    '..........D.......H..',
    't...tttt.....HHHH...t',
  ],
  decor: [
    { model: 'plant', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { model: 'speaker', rect: { x: 8, y: 0, w: 1, h: 1 } },
    { model: 'projector_screen', rect: { x: 9, y: 0, w: 3, h: 1 } },
    { model: 'speaker', rect: { x: 12, y: 0, w: 1, h: 1 } },
    { model: 'sideboard', rect: { x: 14, y: 0, w: 2, h: 1 } },
    { model: 'plant', rect: { x: 16, y: 0, w: 1, h: 1 } },
    // The wall cabinet: open to the front of the floor, so you see the books.
    ...run('bookshelf', 19, 0, 3, 'y', { turn: 1 }),
    ...run('bookshelf', 20, 0, 3, 'y', { turn: 1 }),
    { model: 'sideboard', rect: { x: 0, y: 3, w: 1, h: 2 }, turn: 1 },
    { model: 'sideboard', rect: { x: 0, y: 5, w: 1, h: 2 }, turn: 1 },
    { model: 'trophy_cabinet', rect: { x: 0, y: 7, w: 1, h: 1 }, turn: 1 },
    { model: 'floor_lamp', rect: { x: 5, y: 3, w: 1, h: 1 } },
    { model: 'floor_lamp', rect: { x: 15, y: 3, w: 1, h: 1 } },
    { model: 'boardroom_table', rect: { x: 6, y: 4, w: 9, h: 3 } },
    { model: 'plant', rect: { x: 20, y: 6, w: 1, h: 1 } },
    { model: 'floor_lamp', rect: { x: 18, y: 10, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 0, y: 11, w: 1, h: 1 } },
    { model: 'waiting_bench', rect: { x: 4, y: 11, w: 3, h: 1 } },
    { model: 'plant', rect: { x: 7, y: 11, w: 1, h: 1 } },
    ...run('trophy_cabinet', 13, 11, 4, 'x'),
    { model: 'plant', rect: { x: 20, y: 11, w: 1, h: 1 } },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair'],
  startFocus: 100,
  // Dark wood, and a burgundy runner where everyone walks.
  look: { floorA: '#6b5644', floorB: '#634f3e', walkway: '#8f3b33', edge: '#6d2b25', wall: '#e7e1d5' },
  // A smooth curve of about 10% per wave, with Board Members (only DIGITAL hurts them) from wave 7.
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
  gimmick: 'Your colleagues walk through your house: in at the front door, through the living room and the kitchen, to your home office. Walls block sight. The wifi in the bedroom is bad, and the internet keeps dropping out. Reply All arrives, and so does The Cold Caller.',
  size: { w: 18, h: 14 },
  paths: [
    [
      { x: -1.5, y: 12.5 },
      { x: 3.5, y: 12.5 },
      { x: 3.5, y: 8.5 },
      { x: 7.5, y: 8.5 },
      { x: 7.5, y: 12.5 },
      { x: 12.5, y: 12.5 },
      { x: 12.5, y: 8.5 },
      { x: 16.5, y: 8.5 },
      { x: 16.5, y: 1.5 },
      { x: 11.5, y: 1.5 },
      { x: 11.5, y: 3.0 },
    ],
  ],
  desk: { x: 11, y: 3 },
  // The level design (docs/leveldesign, level 6): four rooms. Bedroom top left (f: bad wifi),
  // home office top right, living room bottom left, kitchen bottom right.
  grid: [
    'ffffffHHH#t.HHH..t',
    'ttttfffff#.======.',
    'fttffffff..=....=.',
    'fttffffff#.D.tt.=.',
    'ffffffftf#t.t...=.',
    'fffffffff#......=.',
    '####.###########=#',
    't........#H.....=t',
    '...=====.#H.=====.',
    '.t.=ttt=H#..=.....',
    'H..=.t.=H#..=ttt.t',
    'H..=...=.#t.=ttt.t',
    'S===...======....t',
    '....ttt..#...ttttH',
  ],
  walls: [
    { x: 0, y: 6, w: 4, h: 1 },
    { x: 5, y: 6, w: 11, h: 1 },
    { x: 17, y: 6, w: 1, h: 1 },
    { x: 9, y: 0, w: 1, h: 2 },
    { x: 9, y: 3, w: 1, h: 3 },
    { x: 9, y: 7, w: 1, h: 5 },
    { x: 9, y: 13, w: 1, h: 1, along: 'y' },
  ],
  decor: [
    // Bedroom.
    { model: 'nightstand', rect: { x: 0, y: 1, w: 1, h: 1 } },
    { model: 'bed', rect: { x: 1, y: 1, w: 2, h: 2 } },
    { model: 'nightstand', rect: { x: 3, y: 1, w: 1, h: 1 } },
    { model: 'sideboard', rect: { x: 1, y: 3, w: 2, h: 1 } },
    ...run('wardrobe', 6, 0, 3, 'x'),
    { model: 'laundry_basket', rect: { x: 7, y: 4, w: 1, h: 1 } },
    // Home office.
    { model: 'printer', rect: { x: 10, y: 0, w: 1, h: 1 } },
    ...run('bookshelf', 12, 0, 3, 'x'),
    { model: 'plant', rect: { x: 17, y: 0, w: 1, h: 1 } },
    ...run('file_boxes', 13, 3, 2, 'x'),
    { model: 'file_boxes', rect: { x: 10, y: 4, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 12, y: 4, w: 1, h: 1 } },
    // Living room.
    { model: 'plant', rect: { x: 0, y: 7, w: 1, h: 1 } },
    { model: 'armchair', rect: { x: 1, y: 9, w: 1, h: 1 } },
    { model: 'sofa', rect: { x: 4, y: 9, w: 3, h: 1 } },
    { model: 'coffee_table', rect: { x: 5, y: 10, w: 1, h: 1 } },
    ...run('bookshelf', 8, 9, 2, 'y', { turn: 3 }),
    ...run('bookshelf', 0, 10, 2, 'y', { turn: 1 }),
    { model: 'tv_stand', rect: { x: 4, y: 13, w: 3, h: 1 }, turn: 2 },
    // Kitchen.
    { model: 'tall_cabinet', rect: { x: 10, y: 7, w: 1, h: 2 }, turn: 1 },
    { model: 'plant', rect: { x: 17, y: 7, w: 1, h: 1 } },
    { model: 'dining_table', rect: { x: 13, y: 10, w: 3, h: 2 } },
    { model: 'recycle_bins', rect: { x: 10, y: 11, w: 1, h: 1 }, turn: 1 },
    ...run('counter', 17, 10, 3, 'y', { turn: 3 }),
    ...run('counter', 13, 13, 4, 'x', { turn: 2 }),
    { model: 'fridge', rect: { x: 17, y: 13, w: 1, h: 1 }, turn: 3 },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall'],
  startFocus: 100,
  // Oak floorboards, and a green runner in the hall.
  look: { floorA: '#b98d5f', floorB: '#ad8256', walkway: '#6f8f7a', edge: '#56705f', wall: '#ece6da' },
  hazard: { type: 'nointernet', first: 60, every: 55, window: 12, reward: 6 },
  // Medior: 15 waves that start where the junior floors left off and climb about 15% a wave.
  // The Cold Caller (only PHYSICAL hurts him) from wave 3.
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
  gimmick: 'An underground car park at scale: a car is two tiles wide and three long. You can only build in an empty bay. Exhaust fumes cut your range. Delegation arrives, and The Phone Caller wants all the attention.',
  size: { w: 26, h: 17 },
  paths: [
    [
      { x: -1.5, y: 1.5 },
      { x: 24.5, y: 1.5 },
      { x: 24.5, y: 7.5 },
      { x: 1.5, y: 7.5 },
      { x: 1.5, y: 13.5 },
      { x: 24.0, y: 13.5 },
    ],
  ],
  desk: { x: 24, y: 13 },
  // The level design (docs/leveldesign, level 7). P: an empty bay, the only place you may build.
  // Your desk sits one tile in from the edge, so the chair fits behind it, by the lifts.
  grid: [
    '--------------------------',
    'S========================-',
    '------------------------=-',
    '---ttPPHH-ttttPP-HHPPtt-=t',
    '---ttPPHHHttttPPHHHPPtt-=-',
    '---ttPPHH-ttttPP-HHPPtt-=-',
    '------------------------=-',
    '-========================-',
    '-=------------------------',
    '-=-ttHHPP-ttPPtt-ttHHPP---',
    '-=-ttHHPPHttPPttHttHHPP---',
    '-=-ttHHPP-ttPPtt-ttHHPP---',
    '-=------------------------',
    '-=======================D-',
    'HH-PPtttt-PPHHtt-PPttHH--H',
    'HH-PPttttHPPHHttHPPttHH--H',
    'HH-PPtttt-PPHHtt-PPttHH--H',
  ],
  decor: [
    { model: 'car_long_blue', rect: { x: 3, y: 3, w: 2, h: 3 }, turn: 1 },
    { model: 'van_long', rect: { x: 7, y: 3, w: 2, h: 3 }, turn: 1 },
    { model: 'pillar', rect: { x: 9, y: 4, w: 1, h: 1 } },
    { model: 'car_long_red', rect: { x: 10, y: 3, w: 2, h: 3 }, turn: 1 },
    { model: 'car_long_white', rect: { x: 12, y: 3, w: 2, h: 3 }, turn: 3 },
    { model: 'pillar', rect: { x: 16, y: 4, w: 1, h: 1 } },
    { model: 'van_long', rect: { x: 17, y: 3, w: 2, h: 3 }, turn: 3 },
    { model: 'car_long_blue', rect: { x: 21, y: 3, w: 2, h: 3 }, turn: 3 },
    { model: 'ticket_machine', rect: { x: 25, y: 3, w: 1, h: 1 }, turn: 3 },
    { model: 'car_long_red', rect: { x: 3, y: 9, w: 2, h: 3 }, turn: 1 },
    { model: 'van_long', rect: { x: 5, y: 9, w: 2, h: 3 }, turn: 1 },
    { model: 'pillar', rect: { x: 9, y: 10, w: 1, h: 1 } },
    { model: 'car_long_white', rect: { x: 10, y: 9, w: 2, h: 3 }, turn: 3 },
    { model: 'car_long_blue', rect: { x: 14, y: 9, w: 2, h: 3 }, turn: 1 },
    { model: 'pillar', rect: { x: 16, y: 10, w: 1, h: 1 } },
    { model: 'car_long_red', rect: { x: 17, y: 9, w: 2, h: 3 }, turn: 3 },
    { model: 'van_long', rect: { x: 19, y: 9, w: 2, h: 3 }, turn: 3 },
    { model: 'stairwell', rect: { x: 0, y: 14, w: 2, h: 3 } },
    { model: 'car_long_white', rect: { x: 5, y: 14, w: 2, h: 3 }, turn: 1 },
    { model: 'car_long_blue', rect: { x: 7, y: 14, w: 2, h: 3 }, turn: 3 },
    { model: 'pillar', rect: { x: 9, y: 15, w: 1, h: 1 } },
    { model: 'van_long', rect: { x: 12, y: 14, w: 2, h: 3 }, turn: 1 },
    { model: 'car_long_red', rect: { x: 14, y: 14, w: 2, h: 3 }, turn: 3 },
    { model: 'pillar', rect: { x: 16, y: 15, w: 1, h: 1 } },
    { model: 'car_long_white', rect: { x: 19, y: 14, w: 2, h: 3 }, turn: 1 },
    { model: 'van_long', rect: { x: 21, y: 14, w: 2, h: 3 }, turn: 3 },
    { model: 'garage_lift', rect: { x: 25, y: 14, w: 1, h: 3 }, turn: 3 },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall', 'delegation'],
  startFocus: 100,
  // Asphalt, a green walkway for pedestrians, white edge lines, concrete walls.
  look: { floorA: '#50555c', floorB: '#4b5057', walkway: '#4f8a63', edge: '#e9e6df', wall: '#c9c6bf' },
  hazard: { type: 'smoke', first: 40, every: 45, window: 14, clouds: 2, radius: 2.4, rangeMult: 0.55 },
  // Medior: about 15% a wave, The Phone Caller from wave 3. On the 26x17 car park (v0.23.0) every
  // count is 85% of the old garage: you build in bays only, two tiles off the walkway.
  waves: [
    'intern:15@0.48 + newhire:3@0.95 + chaser:5@0.20',
    'intern:12@0.46 + newhire:3@0.90 + coldcaller:1@1.20 + chaser:4@0.20',
    'chaser:13@0.15 + phonecaller:1@1.20 + newhire:4@0.85 + intern:5@0.45',
    'oldguard:1@2.00 + intern:10@0.45 + phonecaller:1@1.10 + coldcaller:1@1.00 + chaser:3@0.18',
    'impersonator:3@0.80 + newhire:6@0.80 + phonecaller:2@1.00 + chaser:8@0.16',
    'boardmember:1@1.60 + coldcaller:2@0.95 + phonecaller:2@1.00 + intern:14@0.42 + chaser:9@0.14',
    'oldguard:1@1.60 + chatterbox:2@1.60 + phonecaller:2@0.95 + coldcaller:2@0.95 + intern:12@0.42',
    'chaser:34@0.10 + phonecaller:3@0.90 + newhire:8@0.75',
    'requester:3@1.00 + boardmember:2@1.50 + phonecaller:3@0.85 + impersonator:4@0.60 + chaser:18@0.12',
    'oldguard:2@1.40 + phonecaller:3@0.85 + coldcaller:3@0.85 + intern:17@0.38',
    'chaser:43@0.09 + newhire:10@0.65 + phonecaller:3@0.80 + coldcaller:3@0.80',
    'oldguard:2@1.30 + requester:4@0.95 + phonecaller:4@0.80 + coldcaller:3@0.80 + impersonator:4@0.55',
    'boardmember:3@1.30 + phonecaller:5@0.75 + newhire:13@0.60 + chaser:34@0.09 + chatterbox:2@1.40',
    'oldguard:3@1.20 + phonecaller:5@0.70 + requester:5@0.90 + chaser:34@0.09 + coldcaller:3@0.80',
    'smoker:1@2.00 + newhire:7@0.70 + phonecaller:3@0.80',
  ],
};

const L8: LevelDef = {
  id: 8,
  name: 'Hot Desks',
  block: 'medior',
  intro: 'Nobody has a desk of their own any more. Everyone wants the one by the window.',
  gimmick: 'A zigzag through rows of flex desks. You can only build on a desk, and every wave a few are reserved. The desk phone rings. The Pomodoro Timer arrives, and The Head of Comms is back, heavier.',
  size: { w: 20, h: 12 },
  paths: [
    [
      { x: -1.5, y: 1.5 },
      { x: 17.5, y: 1.5 },
      { x: 17.5, y: 4.5 },
      { x: 2.5, y: 4.5 },
      { x: 2.5, y: 7.5 },
      { x: 17.5, y: 7.5 },
      { x: 17.5, y: 10.5 },
      { x: 18.0, y: 10.5 },
    ],
  ],
  desk: { x: 18, y: 10 },
  // The level design (docs/leveldesign, level 8). b: a flex desk, the only place you may build.
  // Your desk sits one tile in from the edge so the chair fits behind it.
  grid: [
    't------------------t',
    'S=================--',
    '---bbbbbb-bbbbbb-=-H',
    '---bbbbbb-bbbbbb-=-H',
    '--================-H',
    'H-=-bbbbb--bbbbb---H',
    'H-=-bbbbb--bbbbb---H',
    'H-================-H',
    'H--bbbbbb-bbbbbb-=-H',
    '---bbbbbb-bbbbbb-=--',
    '-----------------=D-',
    '-----HH---HH-HH-----',
  ],
  decor: [
    { model: 'plant', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 19, y: 0, w: 1, h: 1 } },
    ...run('lockers', 19, 2, 7, 'y', { turn: 3 }),
    ...run('lockers', 0, 5, 4, 'y', { turn: 1 }),
    { model: 'phone_booth', rect: { x: 5, y: 11, w: 2, h: 1 } },
    { model: 'phone_booth', rect: { x: 10, y: 11, w: 2, h: 1 } },
    { model: 'printer', rect: { x: 13, y: 11, w: 1, h: 1 } },
    { model: 'lockers', rect: { x: 14, y: 11, w: 1, h: 1 } },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall', 'delegation', 'pomodoro'],
  startFocus: 100,
  // Carpet tiles in two greys, and a blue walkway.
  look: { floorA: '#8c939c', floorB: '#848b94', walkway: '#4a6d94', edge: '#3a5675', wall: '#e3e1dc' },
  hazard: { type: 'phone', first: 50, every: 45, window: 6, reward: 5, block: 15 },
  reserve: 3,
  bossHpMult: 1.8,
  // Medior, a step up from The Car Park. The Head of Comms comes back with 1.8x his HP.
  waves: [
    'intern:18@0.48 + newhire:4@0.90 + chaser:6@0.20',
    'intern:14@0.46 + newhire:5@0.85 + coldcaller:1@1.20 + chaser:6@0.18',
    'chaser:18@0.15 + phonecaller:1@1.20 + newhire:5@0.85 + intern:8@0.45',
    'oldguard:2@1.80 + intern:12@0.45 + coldcaller:2@1.00 + chaser:4@0.18',
    'impersonator:4@0.80 + newhire:8@0.80 + phonecaller:2@1.00 + chaser:10@0.16',
    'boardmember:2@1.60 + coldcaller:2@0.95 + intern:18@0.42 + chaser:12@0.14',
    'oldguard:2@1.60 + chatterbox:2@1.60 + phonecaller:2@0.95 + requester:3@1.00 + intern:14@0.42',
    'chaser:44@0.10 + phonecaller:3@0.90 + newhire:10@0.75',
    'requester:5@1.00 + boardmember:2@1.50 + coldcaller:3@0.85 + impersonator:5@0.60 + chaser:20@0.12',
    'oldguard:3@1.40 + phonecaller:3@0.85 + coldcaller:3@0.85 + intern:22@0.38',
    'chaser:54@0.09 + newhire:12@0.65 + phonecaller:4@0.80 + chatterbox:2@1.50',
    'oldguard:3@1.30 + requester:5@0.95 + boardmember:2@1.30 + impersonator:6@0.55 + newhire:6@0.70',
    'boardmember:3@1.30 + phonecaller:5@0.75 + newhire:16@0.60 + chaser:40@0.09 + coldcaller:3@0.80',
    'oldguard:4@1.20 + phonecaller:5@0.70 + requester:6@0.90 + chaser:44@0.09 + coldcaller:4@0.80',
    'headofcomms:1@2.00 + newhire:10@0.70 + chaser:20@0.12',
  ],
};

const L9: LevelDef = {
  id: 9,
  name: 'Town Hall',
  block: 'medior',
  intro: 'The whole company in the auditorium. Everyone comes in at the back, and everyone ends up at the front.',
  gimmick: 'Two entrances that meet in front of the stage, and both are busy every wave. Towers on the tribune steps reach further. The fire alarm goes off now and then. The Motivational Poster arrives, and The Repair Guy is back, heavier.',
  size: { w: 22, h: 14 },
  paths: [
    [
      { x: -1.5, y: 1.5 },
      { x: 5.5, y: 1.5 },
      { x: 5.5, y: 9.5 },
      { x: 10.5, y: 9.5 },
      { x: 10.5, y: 11.0 },
    ],
    [
      { x: 23.5, y: 1.5 },
      { x: 16.5, y: 1.5 },
      { x: 16.5, y: 9.5 },
      { x: 10.5, y: 9.5 },
      { x: 10.5, y: 11.0 },
    ],
  ],
  splitPaths: true,
  desk: { x: 10, y: 11 },
  // The level design (docs/leveldesign, level 9). ^: a tribune step, +25% range. The middle aisle
  // and the stage stay clear (-). Your desk sits one tile up so the chair fits behind it.
  grid: [
    '......tt.HHHH.tt......',
    'S=====..........=====S',
    '.....=tttt--tttt=.....',
    'tttt.=^^^^--^^^^=.tttt',
    '^^^^.=tttt--tttt=.^^^^',
    'tttt.=^^^^--^^^^=.tttt',
    '^^^^.=tttt--tttt=.^^^^',
    'tttt.=^^^^--^^^^=.tttt',
    '.....=....--....=.....',
    '.....============.....',
    '..H------.=.------.H..',
    '...------.D.tt----....',
    '...------...------....',
    '......HHHHHHHHHH......',
  ],
  decor: [
    { model: 'control_desk', rect: { x: 6, y: 0, w: 2, h: 1 } },
    { model: 'tall_cabinet', rect: { x: 9, y: 0, w: 2, h: 1 } },
    { model: 'tall_cabinet', rect: { x: 11, y: 0, w: 2, h: 1 } },
    ...run('tv_camera', 14, 0, 2, 'x'),
    ...[2, 4, 6].flatMap((y) => [...run('auditorium_seats', 6, y, 4, 'x'), ...run('auditorium_seats', 12, y, 4, 'x')]),
    ...[3, 5, 7].flatMap((y) => [...run('auditorium_seats', 0, y, 4, 'x'), ...run('auditorium_seats', 18, y, 4, 'x')]),
    ...[3, 5, 7].flatMap((y) => [...run('tribune_step', 6, y, 4, 'x', { raise: 0.18 }), ...run('tribune_step', 12, y, 4, 'x', { raise: 0.18 })]),
    ...[4, 6].flatMap((y) => [...run('tribune_step', 0, y, 4, 'x', { raise: 0.18 }), ...run('tribune_step', 18, y, 4, 'x', { raise: 0.18 })]),
    { model: 'speaker', rect: { x: 2, y: 10, w: 1, h: 1 } },
    { model: 'speaker', rect: { x: 19, y: 10, w: 1, h: 1 } },
    // The lectern on the stage, next to your desk.
    ...run('conference_table', 12, 11, 2, 'x', { turn: 2 }),
    { model: 'stage_screen', rect: { x: 6, y: 13, w: 10, h: 1 }, turn: 2 },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall', 'delegation', 'pomodoro', 'poster'],
  startFocus: 100,
  // Auditorium carpet, and a red runner down the aisles.
  look: { floorA: '#3e4a63', floorB: '#3a455d', walkway: '#8f3b33', edge: '#6d2b25', wall: '#d8d3c8' },
  hazard: { type: 'firealarm', first: 60, every: 60, freeze: 2, rush: 6, haste: 1.4 },
  bossHpMult: 1.8,
  // Medior, two entrances busy at once. The Repair Guy comes back with 1.8x his HP.
  waves: [
    'intern:20@0.40 + newhire:4@0.85 + chaser:6@0.18',
    'intern:16@0.40 + newhire:6@0.80 + coldcaller:2@1.00 + chaser:6@0.16',
    'chaser:20@0.13 + phonecaller:2@1.00 + newhire:6@0.80 + intern:8@0.40',
    'oldguard:1@1.60 + intern:14@0.40 + coldcaller:2@0.90 + chaser:6@0.16',
    'impersonator:5@0.70 + newhire:8@0.75 + phonecaller:2@0.90 + chaser:12@0.14',
    'boardmember:1@1.40 + coldcaller:3@0.85 + intern:20@0.38 + chaser:12@0.13',
    'oldguard:1@1.40 + chatterbox:2@1.40 + phonecaller:3@0.85 + requester:4@0.90 + intern:14@0.38',
    'chaser:48@0.09 + phonecaller:3@0.80 + newhire:12@0.70',
    'requester:5@0.90 + boardmember:2@1.30 + coldcaller:3@0.80 + impersonator:6@0.55 + chaser:22@0.11',
    'oldguard:2@1.30 + phonecaller:4@0.80 + coldcaller:4@0.80 + intern:24@0.34',
    'chaser:58@0.08 + newhire:14@0.60 + phonecaller:4@0.75 + chatterbox:2@1.40',
    'oldguard:2@1.20 + requester:6@0.85 + boardmember:2@1.20 + impersonator:6@0.50 + newhire:8@0.65',
    'boardmember:2@1.20 + phonecaller:6@0.70 + newhire:18@0.55 + chaser:44@0.08 + coldcaller:4@0.75',
    'oldguard:2@1.10 + phonecaller:6@0.65 + requester:7@0.85 + chaser:48@0.08 + coldcaller:4@0.75',
    'repairguy:1@2.00 + newhire:12@0.60 + chaser:24@0.10',
  ],
};

const L10: LevelDef = {
  id: 10,
  name: 'Boardroom II',
  block: 'medior',
  intro: 'The same boardroom. The board had a glass room built round the table, with blinds for when it gets serious.',
  gimmick: 'The loop from the Boardroom, with a glass room round the table. Every half minute the blinds come down for ten seconds: nobody sees through the glass, either way. Your Line Manager wants another word, a longer one.',
  size: { w: 21, h: 12 },
  paths: [
    [
      { x: -1.5, y: 9.5 },
      { x: 3.5, y: 9.5 },
      { x: 3.5, y: 1.5 },
      { x: 17.5, y: 1.5 },
      { x: 17.5, y: 9.5 },
      { x: 10.5, y: 9.5 },
      { x: 10.5, y: 10.0 },
    ],
  ],
  desk: { x: 10, y: 10 },
  // The level design (docs/leveldesign, level 10): level 5 plus the glass room (B), with a door
  // at the bottom. Your desk one tile up from the edge, as in level 5.
  grid: [
    't.......HHHHH.ttt..HH',
    '...===============.HH',
    '...=BBBBBBBBBBBBB=.HH',
    't..=BH.........HB=...',
    't..=B.ttttttttt.B=H..',
    't..=B.ttttttttt.B=.tt',
    't..=B.ttttttttt.B=.tt',
    'H..=B...........B=...',
    '...=BBBBBB.BBBBBB=...',
    'S===......========...',
    '..........D.......H..',
    't...tttt.....HHHH...t',
  ],
  decor: [
    { model: 'plant', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { model: 'speaker', rect: { x: 8, y: 0, w: 1, h: 1 } },
    { model: 'projector_screen', rect: { x: 9, y: 0, w: 3, h: 1 } },
    { model: 'speaker', rect: { x: 12, y: 0, w: 1, h: 1 } },
    { model: 'sideboard', rect: { x: 14, y: 0, w: 2, h: 1 } },
    { model: 'plant', rect: { x: 16, y: 0, w: 1, h: 1 } },
    ...run('bookshelf', 19, 0, 3, 'y', { turn: 1 }),
    ...run('bookshelf', 20, 0, 3, 'y', { turn: 1 }),
    { model: 'sideboard', rect: { x: 0, y: 3, w: 1, h: 2 }, turn: 1 },
    { model: 'sideboard', rect: { x: 0, y: 5, w: 1, h: 2 }, turn: 1 },
    { model: 'trophy_cabinet', rect: { x: 0, y: 7, w: 1, h: 1 }, turn: 1 },
    { model: 'floor_lamp', rect: { x: 5, y: 3, w: 1, h: 1 } },
    { model: 'floor_lamp', rect: { x: 15, y: 3, w: 1, h: 1 } },
    { model: 'boardroom_table', rect: { x: 6, y: 4, w: 9, h: 3 } },
    // The glass room, blinds and all.
    ...run('glass_blinds', 4, 2, 13, 'x'),
    ...run('glass_blinds', 4, 8, 6, 'x'),
    ...run('glass_blinds', 11, 8, 6, 'x'),
    ...run('glass_blinds', 4, 3, 5, 'y', { turn: 1 }),
    ...run('glass_blinds', 16, 3, 5, 'y', { turn: 1 }),
    { model: 'sculpture', rect: { x: 18, y: 4, w: 1, h: 1 } },
    ...run('window_bar', 19, 5, 2, 'y', { turn: 1 }),
    ...run('bar_stool', 20, 5, 2, 'y'),
    { model: 'floor_lamp', rect: { x: 18, y: 10, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 0, y: 11, w: 1, h: 1 } },
    { model: 'waiting_bench', rect: { x: 4, y: 11, w: 3, h: 1 } },
    { model: 'plant', rect: { x: 7, y: 11, w: 1, h: 1 } },
    ...run('trophy_cabinet', 13, 11, 4, 'x'),
    { model: 'plant', rect: { x: 20, y: 11, w: 1, h: 1 } },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall', 'delegation', 'pomodoro', 'poster'],
  startFocus: 100,
  look: { floorA: '#6b5644', floorB: '#634f3e', walkway: '#8f3b33', edge: '#6d2b25', wall: '#e7e1d5' },
  hazard: { type: 'blinds', first: 30, every: 20, window: 10, warn: 2 },
  bossHpMult: 1.4,
  // The medior finale: the Boardroom's own 22 waves at 85% of the count, its boss 1.4x heavier. The glass room
  // right by the walkway and the blinds make the same room a lot harder (measured, see HANDOFF).
  waves: [
    'intern:12@0.65 + newhire:3@1.10',
    'intern:10@0.60 + newhire:3@1.00 + chaser:5@0.25',
    'chaser:13@0.20 + intern:9@0.55 + newhire:2@1.00',
    'impersonator:3@1.40 + intern:9@0.60 + newhire:3@1.00 + chaser:2@0.25',
    'oldguard:1@2.00 + intern:9@0.60 + chaser:5@0.20',
    'chatterbox:1@2.00 + intern:10@0.55 + newhire:4@0.95 + chaser:5@0.20',
    'boardmember:1@2.00 + intern:10@0.50 + newhire:4@0.95 + chaser:3@0.20',
    'oldguard:1@2.00 + chaser:17@0.14 + impersonator:3@0.90',
    'chaser:26@0.12 + newhire:6@0.90 + intern:5@0.50',
    'chatterbox:2@1.80 + intern:12@0.50 + oldguard:1@2.00 + newhire:2@0.90 + chaser:4@0.15',
    'chaser:29@0.11 + requester:3@1.40 + boardmember:1@2.00 + intern:2@0.50',
    'oldguard:2@1.80 + intern:14@0.48 + chaser:5@0.20 + impersonator:3@0.80',
    'chaser:27@0.11 + newhire:7@0.85 + impersonator:4@0.70 + boardmember:1@2.00',
    'intern:15@0.45 + oldguard:2@1.70 + requester:3@1.30 + chatterbox:1@1.80',
    'chaser:39@0.10 + newhire:9@0.80 + impersonator:4@0.70 + boardmember:1@2.00',
    'oldguard:2@1.60 + requester:3@1.20 + intern:17@0.42 + chatterbox:1@1.80 + newhire:3@0.80',
    'impersonator:9@0.55 + chaser:31@0.10 + newhire:10@0.75 + boardmember:2@1.80',
    'oldguard:3@1.50 + chaser:20@0.10 + requester:3@1.20 + chatterbox:2@1.60 + newhire:2@0.80',
    'intern:20@0.40 + newhire:15@0.70 + impersonator:7@0.60 + chaser:20@0.11 + boardmember:1@1.80',
    'chaser:41@0.09 + oldguard:3@1.40 + requester:4@1.10 + boardmember:2@1.60',
    'oldguard:3@1.30 + impersonator:9@0.50 + newhire:7@0.70 + chaser:10@0.10 + chatterbox:2@1.50 + boardmember:1@1.60',
    'linemanager:1@2.00 + newhire:5@0.80',
  ],
};

const L11: LevelDef = {
  id: 11,
  name: 'The Merger',
  block: 'senior',
  intro: 'Two companies become one. Nobody has unpacked yet.',
  gimmick: 'The old company on the left takes DIGITAL towers only, the startup on the right PHYSICAL ones. Moving boxes in the middle: clear a stack for 40 Coffee and anything goes there. Two entrances, one per company. The Consultant was brought in for the merger.',
  size: { w: 22, h: 13 },
  paths: [
    [
      { x: -1.5, y: 2.5 },
      { x: 7.5, y: 2.5 },
      { x: 7.5, y: 7.5 },
      { x: 10.5, y: 7.5 },
      { x: 10.5, y: 11.0 },
    ],
    [
      { x: 23.5, y: 2.5 },
      { x: 14.5, y: 2.5 },
      { x: 14.5, y: 7.5 },
      { x: 10.5, y: 7.5 },
      { x: 10.5, y: 11.0 },
    ],
  ],
  splitPaths: true,
  desk: { x: 10, y: 11 },
  // The level design (docs/leveldesign, level 11). a: the old company, DIGITAL only. p: the
  // startup, PHYSICAL only. x: moving boxes. Your desk one tile up so the chair fits behind it.
  grid: [
    'atttaHHaaxxxxppptttppp',
    'aaaaaaaaaxxxxppppppppp',
    'S=======axxxxp=======S',
    'aaaaaaa=axxxxp=ppppppp',
    'aatttaa=axxxxp=ptttppp',
    'aatttaa=axxxxp=ptttppH',
    'Haaaaaa=a....p=ppppppH',
    'Haaaaaa========ppppppp',
    'aaaaaaaaa.=xxppppppppp',
    'attttaaaxx=xxppppttppp',
    'attttaaaxx=xxHpppttppp',
    'aaaaaaaaxxDxxHpppptttp',
    'taaaaaaaxx-xxHpppppppt',
  ],
  decor: [
    // The old company: desk islands and the archive.
    { model: 'printer', rect: { x: 1, y: 0, w: 1, h: 1 } },
    ...run('file_boxes', 2, 0, 2, 'x'),
    ...run('bookshelf', 5, 0, 2, 'x'),
    ...[4, 5].flatMap((y) => run('flex_desk', 2, y, 3, 'x', y === 4 ? { turn: 2 } : {})),
    ...[9, 10].flatMap((y) => run('flex_desk', 1, y, 4, 'x', y === 9 ? { turn: 2 } : {})),
    ...run('bookshelf', 0, 6, 2, 'y', { turn: 1 }),
    { model: 'plant', rect: { x: 0, y: 12, w: 1, h: 1 } },
    // The startup: a bar, ping-pong, bean bags and a neon sign.
    { model: 'coffee_bar', rect: { x: 16, y: 0, w: 3, h: 1 } },
    { model: 'pingpong_table', rect: { x: 16, y: 4, w: 3, h: 2 } },
    { model: 'neon_sign', rect: { x: 21, y: 5, w: 1, h: 2 }, turn: 3 },
    ...[9, 10].flatMap((y) => run('beanbag', 17, y, 2, 'x')),
    ...run('bookshelf', 13, 10, 3, 'y', { turn: 3 }),
    { model: 'sofa', rect: { x: 18, y: 11, w: 2, h: 1 }, turn: 2 },
    { model: 'beanbag', rect: { x: 20, y: 11, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 21, y: 12, w: 1, h: 1 } },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall', 'delegation', 'pomodoro', 'poster'],
  startFocus: 100,
  // The old company's blue carpet as the base; the startup gets its concrete drawn over it.
  look: { floorA: '#4f6a8f', floorB: '#4a6487', walkway: '#d8c9ab', edge: '#b9a888', wall: '#e3e1dc' },
  // Senior: the Hot Desks curve at 85% of the count with half the Old Guards (two short lanes at
  // once, half your towers per company; measured, see HANDOFF), and The Consultant at the end.
  waves: [
    'intern:15@0.48 + newhire:3@0.90 + chaser:5@0.20',
    'intern:12@0.46 + newhire:4@0.85 + coldcaller:1@1.20 + chaser:5@0.18',
    'chaser:15@0.15 + phonecaller:1@1.20 + newhire:4@0.85 + intern:7@0.45',
    'oldguard:1@1.80 + intern:10@0.45 + coldcaller:2@1.00 + chaser:3@0.18',
    'impersonator:3@0.80 + newhire:7@0.80 + phonecaller:2@1.00 + chaser:9@0.16',
    'boardmember:2@1.60 + coldcaller:2@0.95 + intern:15@0.42 + chaser:10@0.14',
    'oldguard:1@1.60 + chatterbox:2@1.60 + phonecaller:2@0.95 + requester:3@1.00 + intern:12@0.42',
    'chaser:37@0.10 + phonecaller:3@0.90 + newhire:9@0.75',
    'requester:4@1.00 + boardmember:2@1.50 + coldcaller:3@0.85 + impersonator:4@0.60 + chaser:17@0.12',
    'oldguard:1@1.40 + phonecaller:3@0.85 + coldcaller:3@0.85 + intern:19@0.38',
    'chaser:46@0.09 + newhire:10@0.65 + phonecaller:3@0.80 + chatterbox:2@1.50',
    'oldguard:1@1.30 + requester:4@0.95 + boardmember:2@1.30 + impersonator:5@0.55 + newhire:5@0.70',
    'boardmember:3@1.30 + phonecaller:4@0.75 + newhire:14@0.60 + chaser:34@0.09 + coldcaller:3@0.80',
    'oldguard:2@1.20 + phonecaller:4@0.70 + requester:5@0.90 + chaser:37@0.09 + coldcaller:3@0.80',
    'consultant:1@2.00 + requester:5@0.90 + chaser:20@0.10',
  ],
};

const L12: LevelDef = {
  id: 12,
  name: 'HR Room',
  block: 'senior',
  intro: 'The HR department. After the merger comes the reorganisation.',
  gimmick: 'The tightest floor yet: an archive full of filing cabinets, an observation room behind a one-way mirror, and the interview room where it ends at your desk. Towers in the observation room see through the mirror; nobody sees them. HR sends forms, and while you fill one in you cannot upgrade. The HR Manager does audits.',
  size: { w: 18, h: 12 },
  paths: [
    [
      { x: -1.5, y: 10.5 },
      { x: 5.5, y: 10.5 },
      { x: 5.5, y: 1.5 },
      { x: 14.5, y: 1.5 },
      { x: 14.5, y: 8.0 },
    ],
  ],
  desk: { x: 14, y: 8 },
  // The level design (docs/leveldesign, level 12). m: the one-way mirror, see-through from the
  // observation room (west of it) only.
  grid: [
    't.ttt...HHHH.HHH.t',
    '.....==========...',
    '.HHH.=.#######=###',
    '.....=.#...m..=HH#',
    '.HHH.=.#..tm..=..#',
    '.....=.#..tm..=..#',
    '.HHH.=.#..tm..=..#',
    '.....=.#...m..=tt#',
    '.HHH.=.#...mt.Dtt#',
    '.....=.#t..m.....#',
    'S=====.###########',
    '.......tttt..HH.tt',
  ],
  walls: [
    { x: 7, y: 2, w: 7, h: 1 },
    { x: 15, y: 2, w: 3, h: 1 },
    { x: 7, y: 3, w: 1, h: 7 },
    { x: 17, y: 3, w: 1, h: 7 },
    { x: 7, y: 10, w: 11, h: 1 },
  ],
  decor: [
    { model: 'plant', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { model: 'printer', rect: { x: 2, y: 0, w: 1, h: 1 } },
    ...run('file_boxes', 3, 0, 2, 'x'),
    ...run('filing_cabinet', 8, 0, 4, 'x'),
    { model: 'safe', rect: { x: 13, y: 0, w: 1, h: 1 } },
    ...run('filing_cabinet', 14, 0, 2, 'x'),
    { model: 'plant', rect: { x: 17, y: 0, w: 1, h: 1 } },
    // The archive: rows of filing cabinets with narrow gaps.
    ...[2, 4, 6, 8].flatMap((y) => run('filing_cabinet', 1, y, 3, 'x', { turn: 2 })),
    // The observation room: a table, a camera, the mirror.
    ...run('conference_table', 10, 4, 3, 'y', { turn: 1 }),
    { model: 'tv_camera', rect: { x: 8, y: 9, w: 1, h: 1 }, turn: 1 },
    ...run('one_way_mirror', 11, 3, 7, 'y', { turn: 1 }),
    // The interview room.
    ...run('filing_cabinet', 15, 3, 2, 'x'),
    { model: 'conference_chair', rect: { x: 12, y: 8, w: 1, h: 1 }, turn: 1 },
    { model: 'canteen_table', rect: { x: 15, y: 7, w: 2, h: 2 } },
    // The corridor at the front.
    { model: 'waiting_bench', rect: { x: 7, y: 11, w: 3, h: 1 } },
    { model: 'complaint_box', rect: { x: 10, y: 11, w: 1, h: 1 } },
    { model: 'printer', rect: { x: 13, y: 11, w: 1, h: 1 } },
    { model: 'filing_cabinet', rect: { x: 14, y: 11, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 16, y: 11, w: 1, h: 1 } },
    { model: 'cooler', rect: { x: 17, y: 11, w: 1, h: 1 } },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall', 'delegation', 'pomodoro', 'poster'],
  startFocus: 100,
  // HR grey carpet, and a beige corridor.
  look: { floorA: '#8b8f8a', floorB: '#848883', walkway: '#c9b48f', edge: '#a99572', wall: '#e3e1dc' },
  hazard: { type: 'form', first: 50, every: 50, window: 12, reward: 6 },
  // Senior: the Hot Desks curve on the tightest floor yet, and The HR Manager at the end.
  waves: [
    'intern:18@0.48 + newhire:4@0.90 + chaser:6@0.20',
    'intern:14@0.46 + newhire:5@0.85 + coldcaller:1@1.20 + chaser:6@0.18',
    'chaser:18@0.15 + phonecaller:1@1.20 + newhire:5@0.85 + intern:8@0.45',
    'oldguard:2@1.80 + intern:12@0.45 + coldcaller:2@1.00 + chaser:4@0.18',
    'impersonator:4@0.80 + newhire:8@0.80 + phonecaller:2@1.00 + chaser:10@0.16',
    'boardmember:2@1.60 + coldcaller:2@0.95 + intern:18@0.42 + chaser:12@0.14',
    'oldguard:2@1.60 + chatterbox:2@1.60 + phonecaller:2@0.95 + requester:3@1.00 + intern:14@0.42',
    'chaser:44@0.10 + phonecaller:3@0.90 + newhire:10@0.75',
    'requester:5@1.00 + boardmember:2@1.50 + coldcaller:3@0.85 + impersonator:5@0.60 + chaser:20@0.12',
    'oldguard:3@1.40 + phonecaller:3@0.85 + coldcaller:3@0.85 + intern:22@0.38',
    'chaser:54@0.09 + newhire:12@0.65 + phonecaller:4@0.80 + chatterbox:2@1.50',
    'oldguard:3@1.30 + requester:5@0.95 + boardmember:2@1.30 + impersonator:6@0.55 + newhire:6@0.70',
    'boardmember:3@1.30 + phonecaller:5@0.75 + newhire:16@0.60 + chaser:40@0.09 + coldcaller:3@0.80',
    'oldguard:4@1.20 + phonecaller:5@0.70 + requester:6@0.90 + chaser:44@0.09 + coldcaller:4@0.80',
    'hrmanager:1@2.00 + newhire:10@0.70 + chaser:24@0.10',
  ],
};

const L13: LevelDef = {
  id: 13,
  name: 'Server Room',
  block: 'senior',
  intro: 'The server room. Cold, loud, and the only door into the NOC.',
  gimmick: 'One long, straight run through the server room. It is cold in there: towers fire at half speed. The room is closed: towers inside only reach colleagues inside, towers outside only those outside; Office Artillery and the Pomodoro Timer reach anywhere. Now and then the cooling fails. The Cleaner is back, heavier, and he is not careful with your cables.',
  size: { w: 34, h: 9 },
  paths: [
    [
      { x: -1.5, y: 4.5 },
      { x: 32.0, y: 4.5 },
    ],
  ],
  desk: { x: 32, y: 4 },
  closedZone: { x: 6, y: 0, w: 23, h: 9 },
  // The level design (docs/leveldesign, level 13). k: the cold room. ~: cables (you may build
  // there). Your desk one tile in from the edge so the chair fits behind it.
  grid: [
    '##############################tHHH',
    '######RRRRRRRRRRRtRRRRRRRRRRR#.HHH',
    '.t...#kkkkkkkkkkkt~~~~kkkkkkk#....',
    '.....#kkkkkkkkkkkkkkkkkkkkkkk#....',
    'S====d=======================d==D.',
    '.....#kkkkkkkkkkkkkkkkkkkkkkk#....',
    '..tt.#kkkkkkkkkkkkkkkkkkkkkkk#.ttt',
    '######RRRRRRRRRRRRRRRRRRRRRRR#.ttt',
    '##############################....',
  ],
  walls: [
    { x: 0, y: 0, w: 30, h: 1 },
    { x: 0, y: 8, w: 30, h: 1 },
    { x: 0, y: 1, w: 6, h: 1 },
    { x: 0, y: 7, w: 6, h: 1 },
    { x: 5, y: 2, w: 1, h: 2 },
    { x: 5, y: 5, w: 1, h: 2 },
    { x: 29, y: 1, w: 1, h: 3 },
    { x: 29, y: 5, w: 1, h: 3 },
  ],
  decor: [
    // The corridor: a cable reel and boxes of cables.
    { model: 'cable_reel', rect: { x: 1, y: 2, w: 1, h: 1 } },
    ...run('file_boxes', 2, 6, 2, 'x'),
    // The racks, and the empty one with the new server waiting on its cart.
    ...run('server_rack', 6, 1, 11, 'x'),
    { model: 'file_boxes', rect: { x: 17, y: 1, w: 1, h: 1 } },
    { model: 'server_cart', rect: { x: 17, y: 2, w: 1, h: 1 } },
    ...run('server_rack', 18, 1, 11, 'x'),
    ...run('server_rack', 6, 7, 23, 'x', { turn: 2 }),
    // The NOC.
    { model: 'plant', rect: { x: 30, y: 0, w: 1, h: 1 } },
    { model: 'noc_wall', rect: { x: 31, y: 0, w: 3, h: 2 } },
    ...[6, 7].flatMap((y) => run('flex_desk', 31, y, 3, 'x', y === 6 ? { turn: 2 } : {})),
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall', 'delegation', 'pomodoro', 'poster'],
  startFocus: 100,
  // Grey corridor carpet; the cold room gets its white-blue floor drawn over it.
  look: { floorA: '#6b7079', floorB: '#666b74', walkway: '#3a4a5c', edge: '#2c3846', wall: '#c9ccd1' },
  hazard: { type: 'overheat', first: 45, every: 45, window: 12, clouds: 3, radius: 2.4, rangeMult: 0.55 },
  bossHpMult: 1.9,
  // Senior: the Hot Desks curve with half the Old Guards, one long straight run through the cold,
  // and The Cleaner at 1.9x his HP (measured, see HANDOFF).
  waves: [
    'intern:18@0.48 + newhire:4@0.90 + chaser:6@0.20',
    'intern:14@0.46 + newhire:5@0.85 + coldcaller:1@1.20 + chaser:6@0.18',
    'chaser:18@0.15 + phonecaller:1@1.20 + newhire:5@0.85 + intern:8@0.45',
    'oldguard:1@1.80 + intern:12@0.45 + coldcaller:2@1.00 + chaser:4@0.18',
    'impersonator:4@0.80 + newhire:8@0.80 + phonecaller:2@1.00 + chaser:10@0.16',
    'boardmember:2@1.60 + coldcaller:2@0.95 + intern:18@0.42 + chaser:12@0.14',
    'oldguard:1@1.60 + chatterbox:2@1.60 + phonecaller:2@0.95 + requester:3@1.00 + intern:14@0.42',
    'chaser:44@0.10 + phonecaller:3@0.90 + newhire:10@0.75',
    'requester:5@1.00 + boardmember:2@1.50 + coldcaller:3@0.85 + impersonator:5@0.60 + chaser:20@0.12',
    'oldguard:1@1.40 + phonecaller:3@0.85 + coldcaller:3@0.85 + intern:22@0.38',
    'chaser:54@0.09 + newhire:12@0.65 + phonecaller:4@0.80 + chatterbox:2@1.50',
    'oldguard:1@1.30 + requester:5@0.95 + boardmember:2@1.30 + impersonator:6@0.55 + newhire:6@0.70',
    'boardmember:3@1.30 + phonecaller:5@0.75 + newhire:16@0.60 + chaser:40@0.09 + coldcaller:3@0.80',
    'oldguard:2@1.20 + phonecaller:5@0.70 + requester:6@0.90 + chaser:44@0.09 + coldcaller:4@0.80',
    'cleaner:1@2.00 + chaser:20@0.10 + newhire:8@0.70',
  ],
};

const L14: LevelDef = {
  id: 14,
  name: 'Release Night',
  block: 'senior',
  intro: 'Release night. The office is dark, the deploy is running, and there is pizza.',
  gimmick: 'A long winding run through the dark office. Only the desk lamps give light: towers in the dark reach 40% less far. Now and then a pizza turns up: grab it in time for Coffee and a bit of extra light. The Project Manager wants it live, and the longer he stays, the faster everything moves.',
  size: { w: 22, h: 12 },
  paths: [
    [
      { x: -1.5, y: 10.5 },
      { x: 4.5, y: 10.5 },
      { x: 4.5, y: 2.5 },
      { x: 9.5, y: 2.5 },
      { x: 9.5, y: 8.5 },
      { x: 14.5, y: 8.5 },
      { x: 14.5, y: 2.5 },
      { x: 19.5, y: 2.5 },
      { x: 19.5, y: 10.5 },
      { x: 20.0, y: 10.5 },
    ],
  ],
  desk: { x: 20, y: 10 },
  // The level design (docs/leveldesign, level 14). *: in the light of a desk lamp. Your desk one
  // tile in from the edge so the chair fits behind it.
  grid: [
    'HHHH..tt..HHH..***..HH',
    'HH........***.......HH',
    '....======....======..',
    '****=....=....=....=tt',
    '*tt*=....=....=....=tt',
    '*tt*=....=****=....=..',
    '****=****=*tt*=....=t.',
    '....=*tt*=****=****=t.',
    '....=*tt*======*tt*=..',
    '....=****......*tt*=..',
    'S====..........****=D.',
    'ttt...tttttt..HHH.....',
  ],
  decor: [
    { model: 'whiteboard', rect: { x: 0, y: 0, w: 3, h: 1 } },
    { model: 'bookshelf', rect: { x: 3, y: 0, w: 1, h: 1 } },
    ...run('server_rack', 0, 1, 2, 'x'),
    ...run('pizza_boxes', 6, 0, 2, 'x'),
    // The deploy screen under the strip light.
    { model: 'noc_wall', rect: { x: 10, y: 0, w: 3, h: 1 } },
    ...run('vending', 20, 0, 2, 'x'),
    ...run('fridge', 20, 1, 2, 'x'),
    // Desks with a lamp at every bend.
    ...[4, 5].flatMap((y) => run('lamp_desk', 1, y, 2, 'x')),
    ...[7, 8].flatMap((y) => run('lamp_desk', 6, y, 2, 'x')),
    ...run('lamp_desk', 11, 6, 2, 'x'),
    ...[8, 9].flatMap((y) => run('lamp_desk', 16, y, 2, 'x')),
    // Where the team spends the night.
    ...[3, 4].flatMap((y) => run('beanbag', 20, y, 2, 'x')),
    ...run('pizza_boxes', 20, 6, 2, 'y'),
    ...run('beanbag', 0, 11, 3, 'x'),
    ...run('flex_desk', 6, 11, 6, 'x', { turn: 2 }),
    ...run('server_rack', 14, 11, 3, 'x', { turn: 2 }),
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall', 'delegation', 'pomodoro', 'poster'],
  startFocus: 100,
  // The office at night: dark carpet, a dim walkway.
  look: { floorA: '#2f333b', floorB: '#2b2f36', walkway: '#4a4f5c', edge: '#3a3e48', wall: '#5a5e66' },
  hazard: { type: 'pizza', first: 40, every: 40, window: 8, reward: 5, light: 20, radius: 1.5 },
  // Senior: the Hot Desks curve at 70% of the count (in the dark most of your towers reach less
  // far; measured, see HANDOFF), and The Project Manager at the end.
  waves: [
    'intern:13@0.48 + newhire:3@0.90 + chaser:4@0.20',
    'intern:10@0.46 + newhire:4@0.85 + coldcaller:1@1.20 + chaser:4@0.18',
    'chaser:13@0.15 + phonecaller:1@1.20 + newhire:4@0.85 + intern:6@0.45',
    'oldguard:1@1.80 + intern:8@0.45 + coldcaller:1@1.00 + chaser:3@0.18',
    'impersonator:3@0.80 + newhire:6@0.80 + phonecaller:1@1.00 + chaser:7@0.16',
    'boardmember:1@1.60 + coldcaller:1@0.95 + intern:13@0.42 + chaser:8@0.14',
    'oldguard:1@1.60 + chatterbox:1@1.60 + phonecaller:1@0.95 + requester:2@1.00 + intern:10@0.42',
    'chaser:31@0.10 + phonecaller:2@0.90 + newhire:7@0.75',
    'requester:4@1.00 + boardmember:1@1.50 + coldcaller:2@0.85 + impersonator:4@0.60 + chaser:14@0.12',
    'oldguard:2@1.40 + phonecaller:2@0.85 + coldcaller:2@0.85 + intern:15@0.38',
    'chaser:38@0.09 + newhire:8@0.65 + phonecaller:3@0.80 + chatterbox:1@1.50',
    'oldguard:2@1.30 + requester:4@0.95 + boardmember:1@1.30 + impersonator:4@0.55 + newhire:4@0.70',
    'boardmember:2@1.30 + phonecaller:4@0.75 + newhire:11@0.60 + chaser:28@0.09 + coldcaller:2@0.80',
    'oldguard:3@1.20 + phonecaller:4@0.70 + requester:4@0.90 + chaser:31@0.09 + coldcaller:3@0.80',
    'projectmanager:1@2.00 + newhire:7@0.70 + chaser:17@0.10',
  ],
};

const L15: LevelDef = {
  id: 15,
  name: 'Boardroom III',
  block: 'senior',
  intro: 'The same boardroom, for the third time. The most important meeting of the year, and the board came in through the back.',
  gimmick: 'The glass room from Boardroom II, with the blinds coming down every 20 seconds now. A second entrance on the right: both streams meet for the last stretch. Your Line Manager has your 360-degree review, and earlier bosses come back to give feedback.',
  size: { w: 21, h: 12 },
  paths: [
    [
      { x: -1.5, y: 9.5 },
      { x: 3.5, y: 9.5 },
      { x: 3.5, y: 1.5 },
      { x: 17.5, y: 1.5 },
      { x: 17.5, y: 9.5 },
      { x: 10.5, y: 9.5 },
      { x: 10.5, y: 10.0 },
    ],
    [
      { x: 22.5, y: 5.5 },
      { x: 17.5, y: 5.5 },
      { x: 17.5, y: 9.5 },
      { x: 10.5, y: 9.5 },
      { x: 10.5, y: 10.0 },
    ],
  ],
  splitPaths: true,
  desk: { x: 10, y: 10 },
  // The level design (docs/leveldesign, level 15): level 10 plus a back door on the right and a
  // champagne bar. Your desk one tile up from the edge, as in levels 5 and 10.
  grid: [
    't.......HHHHH.ttt..HH',
    '...===============.HH',
    '...=BBBBBBBBBBBBB=.HH',
    't..=BH.........HB=H.t',
    't..=B.ttttttttt.B=...',
    't..=B.ttttttttt.B===S',
    't..=B.ttttttttt.B=...',
    'H..=B...........B=.tt',
    '...=BBBBBB.BBBBBB=.tt',
    'S===......========...',
    '..........D.......H..',
    't...tttt.....HHHH...t',
  ],
  decor: [
    { model: 'plant', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { model: 'speaker', rect: { x: 8, y: 0, w: 1, h: 1 } },
    { model: 'projector_screen', rect: { x: 9, y: 0, w: 3, h: 1 } },
    { model: 'speaker', rect: { x: 12, y: 0, w: 1, h: 1 } },
    { model: 'sideboard', rect: { x: 14, y: 0, w: 2, h: 1 } },
    { model: 'plant', rect: { x: 16, y: 0, w: 1, h: 1 } },
    ...run('bookshelf', 19, 0, 3, 'y', { turn: 1 }),
    ...run('bookshelf', 20, 0, 3, 'y', { turn: 1 }),
    { model: 'sideboard', rect: { x: 0, y: 3, w: 1, h: 2 }, turn: 1 },
    { model: 'sideboard', rect: { x: 0, y: 5, w: 1, h: 2 }, turn: 1 },
    { model: 'trophy_cabinet', rect: { x: 0, y: 7, w: 1, h: 1 }, turn: 1 },
    { model: 'floor_lamp', rect: { x: 5, y: 3, w: 1, h: 1 } },
    { model: 'floor_lamp', rect: { x: 15, y: 3, w: 1, h: 1 } },
    { model: 'boardroom_table', rect: { x: 6, y: 4, w: 9, h: 3 } },
    ...run('glass_blinds', 4, 2, 13, 'x'),
    ...run('glass_blinds', 4, 8, 6, 'x'),
    ...run('glass_blinds', 11, 8, 6, 'x'),
    ...run('glass_blinds', 4, 3, 5, 'y', { turn: 1 }),
    ...run('glass_blinds', 16, 3, 5, 'y', { turn: 1 }),
    // More art, and a champagne bar by the back door.
    { model: 'sculpture', rect: { x: 18, y: 3, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 20, y: 3, w: 1, h: 1 } },
    ...run('window_bar', 19, 7, 2, 'y', { turn: 1 }),
    ...run('bar_stool', 20, 7, 2, 'y'),
    { model: 'floor_lamp', rect: { x: 18, y: 10, w: 1, h: 1 } },
    { model: 'plant', rect: { x: 0, y: 11, w: 1, h: 1 } },
    { model: 'waiting_bench', rect: { x: 4, y: 11, w: 3, h: 1 } },
    { model: 'plant', rect: { x: 7, y: 11, w: 1, h: 1 } },
    ...run('trophy_cabinet', 13, 11, 4, 'x'),
    { model: 'plant', rect: { x: 20, y: 11, w: 1, h: 1 } },
  ],
  towers: ['coffee', 'autoreply', 'headphones', 'artillery', 'shredder', 'quickreply', 'thumbtacks', 'selfservice', 'keyboardsmash', 'chair', 'replyall', 'delegation', 'pomodoro', 'poster'],
  startFocus: 100,
  look: { floorA: '#6b5644', floorB: '#634f3e', walkway: '#8f3b33', edge: '#6d2b25', wall: '#e7e1d5' },
  hazard: { type: 'blinds', first: 20, every: 10, window: 10, warn: 2 },
  // The finale: the Boardroom's 22 waves through two doors at once, and your 360-degree review.
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
    'finalreview:1@2.00 + newhire:8@0.80',
  ],
};

export const LEVELS: Record<number, LevelDef> = { 1: L1, 2: L2, 3: L3, 4: L4, 5: L5, 6: L6, 7: L7, 8: L8, 9: L9, 10: L10, 11: L11, 12: L12, 13: L13, 14: L14, 15: L15 };

/** All fifteen level names, so the level select can show what is coming. */
export const LEVEL_NAMES: readonly string[] = [
  'Reception',
  'Coffee Corner',
  'Presentation Room',
  'Canteen',
  'Boardroom',
  'Work From Home',
  'The Car Park',
  'Hot Desks',
  'Town Hall',
  'Boardroom II',
  'The Merger',
  'HR Room',
  'Server Room',
  'Release Night',
  'Boardroom III',
];
