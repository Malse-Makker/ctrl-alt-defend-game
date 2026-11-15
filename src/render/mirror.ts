// A tower faces the walkway, so the side a module sits on can end up facing away from the camera.
// With one module on the tower we mirror the whole look so that module is on the camera's side.

/**
 * Whether to mirror a look (scale x by -1) so a module at `slotX` (the model's own x) faces the
 * camera. `rotY` is the tower's turn, (toCamX, toCamZ) the floor direction towards the camera.
 * Modules near the middle (front, back or on top) stay as they are.
 */
export function mirrorLook(slotX: number, rotY: number, toCamX: number, toCamZ: number): boolean {
  if (Math.abs(slotX) < 0.1) return false;
  // The model's +x after the turn, on the floor.
  const side = toCamX * Math.cos(rotY) - toCamZ * Math.sin(rotY);
  return slotX * side < -1e-6;
}
