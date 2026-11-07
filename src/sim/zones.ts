// Build areas for multiplayer. The host picks a layout and puts players in its parts. The camera is
// isometric, so "top" and "bottom" are what you see on screen: a diagonal across the tile grid.
//   screen down  grows with x + y      screen right grows with x - y

export type ZoneMode = 'anywhere' | 'topbottom' | 'leftright' | 'quarters' | 'own';

export const ZONE_MODES: readonly ZoneMode[] = ['anywhere', 'topbottom', 'leftright', 'quarters', 'own'];

export const ZONE_LABELS: Record<ZoneMode, string> = {
  anywhere: 'Anywhere',
  topbottom: 'Top and bottom',
  leftright: 'Left and right',
  quarters: 'Four quarters',
  own: 'A patch each',
};

export const ZONE_NAMES: Record<ZoneMode, readonly string[]> = {
  anywhere: ['Everywhere'],
  topbottom: ['Top', 'Bottom'],
  leftright: ['Left', 'Right'],
  quarters: ['Top left', 'Top right', 'Bottom left', 'Bottom right'],
  own: ['Patch 1', 'Patch 2', 'Patch 3', 'Patch 4', 'Patch 5', 'Patch 6', 'Patch 7', 'Patch 8'],
};

export const ZONE_COLORS = ['#3fa7a0', '#e67e3a', '#b48ce0', '#f2c641', '#3e7cc9', '#e5534b', '#6fcf7f', '#e2557a'];

export function zoneCount(mode: ZoneMode, players: number): number {
  switch (mode) {
    case 'anywhere':
      return 1;
    case 'topbottom':
    case 'leftright':
      return 2;
    case 'quarters':
      return 4;
    case 'own':
      return Math.max(1, players);
  }
}

/** Zone index for every tile (row by row), or null when everyone may build anywhere. */
export function zoneMap(w: number, h: number, mode: ZoneMode, players: number): Uint8Array | null {
  if (mode === 'anywhere') return null;
  const map = new Uint8Array(w * h);
  const midDown = (w + h) / 2;
  const midRight = (w - h) / 2;
  const n = zoneCount(mode, players);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const down = x + 0.5 + (y + 0.5);
      const right = x + 0.5 - (y + 0.5);
      const bottom = down >= midDown ? 1 : 0;
      const isRight = right >= midRight ? 1 : 0;
      let z = 0;
      if (mode === 'topbottom') z = bottom;
      else if (mode === 'leftright') z = isRight;
      else if (mode === 'quarters') z = bottom * 2 + isRight;
      else {
        // Equal screen columns, left to right.
        const k = (right + h) / (w + h);
        z = Math.min(n - 1, Math.floor(k * n));
      }
      map[y * w + x] = z;
    }
  }
  return map;
}

/** Default: spread players over the zones in turn. A patch each always means one zone per player. */
export function defaultAssignment(mode: ZoneMode, players: number): number[] {
  const n = zoneCount(mode, players);
  return Array.from({ length: players }, (_, i) => (mode === 'own' ? i : i % n));
}
