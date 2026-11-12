// The tile grid of a floor: one letter per tile, as drawn in the level design
// (docs: LEVELDESIGN.md, "Tegelsoorten"). It decides where you may build and what blocks sight;
// the walkway itself still comes from the path waypoints, and the furniture models from `decor`.

/** Letters you may build on. Some only for certain towers (worked out per level as they arrive). */
const BUILD = new Set(['.', 'o', 'L', 'b', 'P', '^', '*', 'k', 'f', 'a', 'p']);
/** Letters that block sight: walls and all furniture, tall or low (the maker, v0.18.0). Glass does not. */
const SIGHT = new Set(['#', 'H', 'R', 't', 'w', 'x']);
/**
 * Letters you may build on with only some towers: the soup queue in the Canteen (n) takes
 * Thumbtacks only, you scatter those on the floor anyway. The value is the tower role allowed.
 */
export const ONLY: Record<string, string> = { n: 'trap' };
/** Letters on the walkway: entrance, walkway, gate, door, your desk. */
const WALKWAY = new Set(['=', 'S', 'G', 'd', 'D']);
/** Every letter the grid may use. Anything else is a typo in a level. */
const KNOWN = new Set([...BUILD, ...SIGHT, ...WALKWAY, '-', 't', 'g', 'B', 'm', 'w', 'x', 'n', '~']);

export interface GridInfo {
  /** 1 where a tower may stand (if nothing else is in the way). */
  build: Uint8Array;
  /** 1 where sight is blocked. */
  sight: Uint8Array;
  /** Tiles with a gate: colleagues stop there to scan their pass. */
  gates: { x: number; y: number }[];
  /** Per tile: the only tower role allowed there (see ONLY), or '' for any. */
  only: string[];
}

export function parseGrid(grid: readonly string[], w: number, h: number): GridInfo {
  if (grid.length !== h) throw new Error(`Grid has ${grid.length} rows, the floor is ${h} high`);
  const build = new Uint8Array(w * h);
  const sight = new Uint8Array(w * h);
  const gates: { x: number; y: number }[] = [];
  const only: string[] = new Array(w * h).fill('');
  grid.forEach((row, y) => {
    if (row.length !== w) throw new Error(`Grid row ${y} has ${row.length} tiles, the floor is ${w} wide`);
    for (let x = 0; x < w; x++) {
      const c = row[x];
      if (!KNOWN.has(c)) throw new Error(`Unknown tile '${c}' at ${x},${y}`);
      if (BUILD.has(c) || ONLY[c]) build[y * w + x] = 1;
      if (ONLY[c]) only[y * w + x] = ONLY[c];
      if (SIGHT.has(c)) sight[y * w + x] = 1;
      if (c === 'G') gates.push({ x, y });
    }
  });
  return { build, sight, gates, only };
}

/** Is this letter part of the walkway? (Used to check a grid against its path.) */
export function isWalkwayLetter(c: string): boolean {
  return WALKWAY.has(c);
}
