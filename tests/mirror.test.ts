// A lone module on a tower's flank is shown on the side that faces the camera.

import { describe, expect, it } from 'vitest';
import { mirrorLook } from '../src/render/mirror';

// The game camera looks from +x, +z (azimuth 45 degrees): the floor direction towards it.
const CAM = { x: Math.SQRT1_2, z: Math.SQRT1_2 };
const turns = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

/** Where the module ends up on the floor, after the turn and the optional mirror. */
function towardsCamera(slotX: number, rotY: number): number {
  const x = mirrorLook(slotX, rotY, CAM.x, CAM.z) ? -slotX : slotX;
  return x * Math.cos(rotY) * CAM.x - x * Math.sin(rotY) * CAM.z;
}

describe('mirrored looks', () => {
  it('a flank module never ends up on the far side, whichever way the tower turns', () => {
    for (const rotY of turns) for (const slotX of [0.33, -0.33, 0.24, -0.4]) {
      expect(towardsCamera(slotX, rotY)).toBeGreaterThan(0);
    }
  });

  it('a module already on the near side stays where it is', () => {
    expect(mirrorLook(0.33, 0, CAM.x, CAM.z)).toBe(false);
    expect(mirrorLook(-0.33, 0, CAM.x, CAM.z)).toBe(true);
    expect(mirrorLook(0.33, Math.PI, CAM.x, CAM.z)).toBe(true);
  });

  it('modules in the middle (on top, in front) are never mirrored', () => {
    for (const rotY of turns) expect(mirrorLook(0, rotY, CAM.x, CAM.z)).toBe(false);
    for (const rotY of turns) expect(mirrorLook(0.05, rotY, CAM.x, CAM.z)).toBe(false);
  });
});
