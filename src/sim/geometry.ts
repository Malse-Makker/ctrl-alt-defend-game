// Geometry helpers for the simulation. Units are tiles (1 tile = 40 px in the Godot version,
// so every old pixel value divides by 40).

export interface Vec2 {
  x: number;
  y: number;
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export interface PathPoint extends Vec2 {
  dirX: number;
  dirY: number;
}

/** A walking route: a polyline that colleagues follow by distance travelled. */
export class Path {
  readonly points: readonly Vec2[];
  readonly length: number;
  private readonly cum: number[];

  constructor(points: readonly Vec2[]) {
    if (points.length < 2) throw new Error('A path needs at least two points');
    this.points = points;
    this.cum = [0];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += dist(points[i - 1], points[i]);
      this.cum.push(total);
    }
    this.length = total;
  }

  /** Position and walking direction after travelling d tiles (clamped to the path). */
  pointAt(d: number): PathPoint {
    const pts = this.points;
    if (d <= 0) return withDir(pts[0], pts[1], 0);
    if (d >= this.length) return withDir(pts[pts.length - 2], pts[pts.length - 1], 1);
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const segLen = this.cum[i] - this.cum[i - 1];
    const t = segLen === 0 ? 0 : (d - this.cum[i - 1]) / segLen;
    return withDir(pts[i - 1], pts[i], t);
  }

  distanceTo(p: Vec2): number {
    let best = Infinity;
    for (let i = 1; i < this.points.length; i++) {
      best = Math.min(best, distToSegment(p, this.points[i - 1], this.points[i]));
    }
    return best;
  }

  /** How many tiles of this path lie within radius r of p. Sampled, good enough for bots and hints. */
  coverage(p: Vec2, r: number, step = 0.1): number {
    let n = 0;
    for (let d = 0; d <= this.length; d += step) {
      const q = this.pointAt(d);
      if (dist(p, q) <= r) n++;
    }
    return n * step;
  }
}

function withDir(a: Vec2, b: Vec2, t: number): PathPoint {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: a.x + dx * t, y: a.y + dy * t, dirX: dx / len, dirY: dy / len };
}
