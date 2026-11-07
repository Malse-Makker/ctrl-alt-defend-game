// Everything that moves: towers, colleagues, shots and the little bursts of paper. Reads the
// simulation state every frame and turns simulation events into something you can see.

import * as THREE from 'three';
import type { Enemy, Game, GameEvent, Tower } from '../sim/game';
import { part, type Assets } from './assets';
import { PAL } from './palette';

interface EnemyView {
  id: number;
  /** Position only. The body inside it turns; the HP bar must not. */
  root: THREE.Group;
  body: THREE.Group;
  model: THREE.Object3D;
  legs: THREE.Object3D[];
  arms: THREE.Object3D[];
  armSwing: number;
  hpBack: THREE.Sprite;
  hpFill: THREE.Sprite;
  shieldFill: THREE.Sprite | null;
  barWidth: number;
  barY: number;
  walk: number;
  heading: number;
  squash: number;
  /** Real seconds until the death animation starts (the shot is still flying). */
  dieIn: number | null;
  dying: number;
  leaking: number;
  lastX: number;
  lastY: number;
  vx: number;
  vy: number;
  boss: boolean;
}

interface TowerView {
  id: number;
  root: THREE.Group;
  model: THREE.Object3D;
  level: number;
  pop: number;
  recoil: number;
}

interface Shot {
  mesh: THREE.Group;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
}

interface Scrap {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
}

const HP_W = 0.62;
/** People are drawn a bit larger than a tile so they read on a busy floor. */
const PERSON_SCALE = 1.25;

export class Actors {
  readonly group = new THREE.Group();
  private enemies = new Map<number, EnemyView>();
  private towers = new Map<number, TowerView>();
  private shots: Shot[] = [];
  private scraps: Scrap[] = [];
  private shotPool: THREE.Group[] = [];
  private scrapGeo = new THREE.PlaneGeometry(0.09, 0.12);
  private scrapMats = new Map<string, THREE.MeshStandardMaterial>();
  private readonly hpBackMat = new THREE.SpriteMaterial({ color: PAL.hpBack, depthTest: false });
  private readonly hpMats = {
    ok: new THREE.SpriteMaterial({ color: PAL.hpFill, depthTest: false }),
    low: new THREE.SpriteMaterial({ color: PAL.hpLow, depthTest: false }),
    crit: new THREE.SpriteMaterial({ color: PAL.hpCrit, depthTest: false }),
    shield: new THREE.SpriteMaterial({ color: PAL.shield, depthTest: false }),
  };
  private readonly envGeo = new THREE.BoxGeometry(0.2, 0.02, 0.13);
  private readonly envMat = new THREE.MeshStandardMaterial({ color: PAL.envelope, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.35 });
  private readonly flapGeo = new THREE.BoxGeometry(0.2, 0.024, 0.04);
  private readonly flapMat = new THREE.MeshStandardMaterial({ color: PAL.envelopeFlap });
  readonly rangeRing: THREE.Mesh;
  readonly ghostTile: THREE.Mesh;
  private ghost: THREE.Object3D | null = null;
  private ghostKey = '';

  /** Screen-right direction in world space, so HP bars line up on screen. */
  private readonly camRight: THREE.Vector3;

  constructor(
    private readonly assets: Assets,
    camRight: THREE.Vector3,
  ) {
    this.camRight = camRight.clone().setY(0).normalize();
    const ringGeo = new THREE.RingGeometry(0.97, 1, 72).rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
    this.rangeRing = new THREE.Mesh(ringGeo, ringMat);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 72).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false }),
    );
    this.rangeRing.add(disc);
    this.rangeRing.visible = false;
    this.rangeRing.renderOrder = 2;
    this.group.add(this.rangeRing);

    this.ghostTile = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: PAL.ok, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    this.ghostTile.visible = false;
    this.ghostTile.renderOrder = 3;
    this.group.add(this.ghostTile);
  }

  // ------------------------------------------------------------- placement preview

  showGhost(model: string | null, tx: number, ty: number, ok: boolean, range: number): void {
    if (!model) {
      if (this.ghost) this.ghost.visible = false;
      this.ghostTile.visible = false;
      this.rangeRing.visible = false;
      return;
    }
    if (this.ghostKey !== model) {
      if (this.ghost) this.group.remove(this.ghost);
      this.ghost = this.assets.ghost(model);
      this.ghostKey = model;
      this.group.add(this.ghost);
    }
    this.ghost!.visible = true;
    this.ghost!.position.set(tx + 0.5, 0, ty + 0.5);
    this.ghostTile.visible = true;
    this.ghostTile.position.set(tx + 0.5, 0.01, ty + 0.5);
    (this.ghostTile.material as THREE.MeshBasicMaterial).color.set(ok ? PAL.ok : PAL.bad);
    this.showRange(range > 0 ? tx + 0.5 : null, ty + 0.5, range, ok ? '#ffffff' : PAL.bad);
  }

  showRange(x: number | null, y: number, r: number, color = '#ffffff'): void {
    if (x === null || r <= 0) {
      this.rangeRing.visible = false;
      return;
    }
    this.rangeRing.visible = true;
    this.rangeRing.position.set(x, 0.02, y);
    this.rangeRing.scale.setScalar(r);
    (this.rangeRing.material as THREE.MeshBasicMaterial).color.set(color);
  }

  // ------------------------------------------------------------- sync with the simulation

  sync(game: Game, prev: Map<number, { x: number; y: number }>, alpha: number, dt: number): void {
    const seen = new Set<number>();
    for (const e of game.enemies) {
      seen.add(e.id);
      let v = this.enemies.get(e.id);
      if (!v) v = this.addEnemy(e);
      const p = prev.get(e.id);
      const x = p ? p.x + (e.x - p.x) * alpha : e.x;
      const y = p ? p.y + (e.y - p.y) * alpha : e.y;
      this.placeEnemy(v, e, x, y, dt);
    }
    // Colleagues the simulation removed: either dealt with (death animation) or leaked.
    for (const [id, v] of this.enemies) {
      if (seen.has(id)) continue;
      if (v.dieIn === null && v.leaking === 0 && v.dying === 0) {
        // Removed without an event we saw (should not happen): fade quietly.
        v.dieIn = 0;
      }
      this.animateGone(v, dt);
    }
    for (const t of game.towers) {
      let v = this.towers.get(t.id);
      if (!v) v = this.addTower(t, game);
      if (v.level !== t.level) this.swapModel(v, t);
      v.pop = Math.max(0, v.pop - dt * 4);
      v.recoil = Math.max(0, v.recoil - dt * 6);
      const s = 1 + Math.sin(v.pop * Math.PI) * 0.18;
      v.model.scale.set(s, s * (1 - v.recoil * 0.06), s);
    }
    for (const [id, v] of this.towers) {
      if (!game.tower(id)) {
        this.group.remove(v.root);
        this.towers.delete(id);
      }
    }
    this.updateShots(dt);
    this.updateScraps(dt);
  }

  onEvent(ev: GameEvent, game: Game): void {
    switch (ev.t) {
      case 'shot': {
        const travel = ev.travel;
        this.fireShot(ev.fx, ev.fy, ev.tx, ev.ty, travel);
        const tv = this.towers.get(ev.towerId);
        if (tv) tv.recoil = 1;
        const v = this.enemies.get(ev.enemyId);
        if (v) {
          v.squash = Math.max(v.squash, 1);
          if (ev.killed) v.dieIn = travel;
        }
        break;
      }
      case 'leak': {
        const v = this.enemies.get(ev.enemyId);
        if (v) v.leaking = 0.001;
        break;
      }
      case 'kill': {
        const v = this.enemies.get(ev.enemyId);
        if (v && v.dieIn === null) v.dieIn = ev.delay;
        break;
      }
      case 'placed':
      case 'upgraded':
      case 'side': {
        const t = game.tower(ev.towerId);
        if (!t) break;
        const v = this.towers.get(t.id) ?? this.addTower(t, game);
        v.pop = 1;
        break;
      }
      default:
        break;
    }
  }

  // ------------------------------------------------------------- towers

  private addTower(t: Tower, game: Game): TowerView {
    const root = new THREE.Group();
    root.position.set(t.x, 0, t.y);
    const model = this.assets.clone(t.def.models[t.level - 1]);
    root.add(model);
    // Face the nearest bit of walkway, snapped to a quarter turn so desks line up with the grid.
    let best = { d: Infinity, x: t.x, y: t.y + 1 };
    for (const path of game.paths) {
      for (let d = 0; d <= path.length; d += 0.25) {
        const p = path.pointAt(d);
        const dd = Math.hypot(p.x - t.x, p.y - t.y);
        if (dd < best.d) best = { d: dd, x: p.x, y: p.y };
      }
    }
    const angle = Math.atan2(best.x - t.x, best.y - t.y);
    root.rotation.y = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
    this.group.add(root);
    const v: TowerView = { id: t.id, root, model, level: t.level, pop: 1, recoil: 0 };
    this.towers.set(t.id, v);
    return v;
  }

  private swapModel(v: TowerView, t: Tower): void {
    v.root.remove(v.model);
    v.model = this.assets.clone(t.def.models[t.level - 1]);
    v.root.add(v.model);
    v.level = t.level;
    v.pop = 1;
  }

  // ------------------------------------------------------------- colleagues

  private addEnemy(e: Enemy): EnemyView {
    const root = new THREE.Group();
    const body = new THREE.Group();
    const model = this.assets.clone(e.def.model);
    model.scale.setScalar(e.def.scale * PERSON_SCALE);
    model.userData.accent = e.def.accent;
    body.add(model);
    root.add(body);
    const box = new THREE.Box3().setFromObject(model);
    const top = Math.max(0.6, box.max.y);
    const boss = e.def.boss !== undefined;
    const barWidth = boss ? HP_W * 1.8 : HP_W;
    const barY = top + 0.22;
    const hpBack = new THREE.Sprite(this.hpBackMat);
    hpBack.center.set(0, 0.5);
    hpBack.scale.set(barWidth + 0.04, boss ? 0.13 : 0.1, 1);
    hpBack.position.copy(this.camRight).multiplyScalar(-(barWidth + 0.04) / 2).setY(barY);
    hpBack.renderOrder = 10;
    const hpFill = new THREE.Sprite(this.hpMats.ok);
    hpFill.center.set(0, 0.5);
    hpFill.scale.set(barWidth, boss ? 0.09 : 0.06, 1);
    hpFill.position.copy(this.camRight).multiplyScalar(-barWidth / 2).setY(barY);
    hpFill.renderOrder = 11;
    root.add(hpBack, hpFill);
    let shieldFill: THREE.Sprite | null = null;
    if (e.maxShield > 0) {
      shieldFill = new THREE.Sprite(this.hpMats.shield);
      shieldFill.center.set(0, 0.5);
      shieldFill.scale.set(barWidth, 0.04, 1);
      shieldFill.position.copy(this.camRight).multiplyScalar(-barWidth / 2).setY(barY + 0.09);
      shieldFill.renderOrder = 11;
      root.add(shieldFill);
    }
    const legs = ['LegL', 'LegR'].map((n) => part(model, n)).filter((x): x is THREE.Object3D => !!x);
    const arms = ['ArmL', 'ArmR'].map((n) => part(model, n)).filter((x): x is THREE.Object3D => !!x);
    const v: EnemyView = {
      id: e.id,
      root,
      body,
      model,
      legs,
      arms,
      armSwing: e.def.armSwing,
      hpBack,
      hpFill,
      shieldFill,
      barWidth,
      barY,
      walk: Math.random() * 6,
      heading: Math.atan2(e.dirX, e.dirY),
      squash: 0,
      dieIn: null,
      dying: 0,
      leaking: 0,
      lastX: e.x,
      lastY: e.y,
      vx: 0,
      vy: 0,
      boss,
    };
    // Arms rest in whatever pose Blender gave them (holding a phone, a megaphone).
    for (const a of arms) a.userData.rest = a.rotation.x;
    root.position.set(e.x, 0, e.y);
    body.rotation.y = v.heading;
    // A colleague who appears mid-route (split, called in) pops in instead of teleporting.
    if (e.isAdd) model.scale.setScalar(0.01);
    this.group.add(root);
    this.enemies.set(e.id, v);
    return v;
  }

  private placeEnemy(v: EnemyView, e: Enemy, x: number, y: number, dt: number): void {
    if (dt > 0) {
      v.vx = (x - v.lastX) / dt;
      v.vy = (y - v.lastY) / dt;
    }
    const moved = Math.hypot(x - v.lastX, y - v.lastY);
    v.lastX = x;
    v.lastY = y;
    v.root.position.set(x, 0, y);
    const want = Math.atan2(e.dirX, e.dirY);
    let d = want - v.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    v.heading += d * Math.min(1, dt * 12);
    v.body.rotation.y = v.heading;
    v.walk += moved * 7;
    const swing = Math.sin(v.walk);
    if (v.legs[0]) v.legs[0].rotation.x = swing * 0.55;
    if (v.legs[1]) v.legs[1].rotation.x = -swing * 0.55;
    v.arms.forEach((a, i) => {
      a.rotation.x = (a.userData.rest as number) + (i === 0 ? -swing : swing) * v.armSwing * 0.6;
    });
    const target = e.def.scale * PERSON_SCALE;
    const cur = v.model.scale.x;
    const grown = cur < target ? Math.min(target, cur + dt * 4) : target;
    v.squash = Math.max(0, v.squash - dt * 7);
    const sq = v.squash * 0.12;
    v.model.scale.set(grown * (1 + sq), grown * (1 - sq), grown * (1 + sq));
    v.model.position.y = Math.abs(Math.cos(v.walk)) * 0.035;
    // HP bar: only when hurt (bosses always).
    const ratio = Math.max(0, e.hp / e.maxHp);
    const hurt = ratio < 0.999 || v.boss || e.shield < e.maxShield;
    v.hpBack.visible = hurt;
    v.hpFill.visible = hurt && ratio > 0;
    v.hpFill.scale.x = Math.max(0.001, v.barWidth * ratio);
    v.hpFill.material = ratio > 0.5 ? this.hpMats.ok : ratio > 0.25 ? this.hpMats.low : this.hpMats.crit;
    if (v.shieldFill) {
      v.shieldFill.visible = e.shield > 0;
      v.shieldFill.scale.x = Math.max(0.001, v.barWidth * (e.shield / Math.max(1, e.maxShield)));
    }
  }

  private animateGone(v: EnemyView, dt: number): void {
    if (v.leaking > 0) {
      v.leaking += dt;
      const k = Math.min(1, v.leaking / 0.35);
      v.model.scale.setScalar(Math.max(0.001, (1 - k) * PERSON_SCALE));
      v.hpBack.visible = v.hpFill.visible = false;
      if (k >= 1) this.removeEnemy(v);
      return;
    }
    if (v.dieIn !== null && v.dieIn > 0) {
      // The shot is still in the air: keep walking.
      v.dieIn -= dt;
      v.lastX += v.vx * dt;
      v.lastY += v.vy * dt;
      v.root.position.set(v.lastX, 0, v.lastY);
      return;
    }
    if (v.dying === 0) {
      v.dying = 0.0001;
      this.burst(v.root.position.x, v.root.position.y + 0.5, v.root.position.z, v.boss ? 26 : 9, this.accentOf(v));
      v.hpBack.visible = v.hpFill.visible = false;
      if (v.shieldFill) v.shieldFill.visible = false;
    }
    v.dying += dt;
    const k = Math.min(1, v.dying / 0.28);
    v.model.rotation.x = -k * 1.2;
    v.model.scale.setScalar(Math.max(0.001, (1 - k * k) * PERSON_SCALE));
    if (k >= 1) this.removeEnemy(v);
  }

  private accentOf(v: EnemyView): string {
    return (v.model.userData.accent as string) ?? '#f6f3ea';
  }

  private removeEnemy(v: EnemyView): void {
    this.group.remove(v.root);
    this.enemies.delete(v.id);
  }

  // ------------------------------------------------------------- shots and scraps

  private fireShot(fx: number, fy: number, tx: number, ty: number, dur: number): void {
    let mesh = this.shotPool.pop();
    if (!mesh) {
      mesh = new THREE.Group();
      const env = new THREE.Mesh(this.envGeo, this.envMat);
      const flap = new THREE.Mesh(this.flapGeo, this.flapMat);
      flap.position.set(0, 0.012, -0.045);
      mesh.add(env, flap);
    }
    mesh.visible = true;
    this.group.add(mesh);
    this.shots.push({ mesh, fx, fy, tx, ty, t: 0, dur: Math.max(0.05, dur) });
  }

  private updateShots(dt: number): void {
    const keep: Shot[] = [];
    for (const s of this.shots) {
      s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      const x = s.fx + (s.tx - s.fx) * k;
      const y = s.fy + (s.ty - s.fy) * k;
      const h = 0.75 + (0.45 - 0.75) * k + Math.sin(k * Math.PI) * 0.35;
      s.mesh.position.set(x, h, y);
      s.mesh.rotation.y = Math.atan2(s.tx - s.fx, s.ty - s.fy);
      s.mesh.rotation.z = Math.sin(s.t * 20) * 0.3;
      if (k >= 1) {
        this.group.remove(s.mesh);
        this.shotPool.push(s.mesh);
        this.burst(s.tx, 0.5, s.ty, 2, '#f6f3ea');
      } else keep.push(s);
    }
    this.shots = keep;
  }

  private burst(x: number, y: number, z: number, n: number, color: string): void {
    if (this.scraps.length > 240) return;
    let mat = this.scrapMats.get(color);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.9 });
      this.scrapMats.set(color, mat);
    }
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.scrapGeo, i % 3 === 0 ? this.paperMat() : mat);
      mesh.position.set(x, y, z);
      const a = Math.random() * Math.PI * 2;
      const sp = 0.8 + Math.random() * 1.6;
      this.scraps.push({
        mesh,
        vel: new THREE.Vector3(Math.cos(a) * sp, 1.5 + Math.random() * 2, Math.sin(a) * sp),
        spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 0.6 + Math.random() * 0.4,
      });
      this.group.add(mesh);
    }
  }

  private paperMatCache: THREE.MeshStandardMaterial | null = null;
  private paperMat(): THREE.MeshStandardMaterial {
    if (!this.paperMatCache) this.paperMatCache = new THREE.MeshStandardMaterial({ color: '#f6f3ea', side: THREE.DoubleSide });
    return this.paperMatCache;
  }

  private updateScraps(dt: number): void {
    const keep: Scrap[] = [];
    for (const s of this.scraps) {
      s.life -= dt;
      s.vel.y -= 6 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      if (s.mesh.position.y < 0.02) {
        s.mesh.position.y = 0.02;
        s.vel.set(0, 0, 0);
      }
      s.mesh.rotation.x += s.spin.x * dt;
      s.mesh.rotation.y += s.spin.y * dt;
      if (s.life <= 0) this.group.remove(s.mesh);
      else keep.push(s);
    }
    this.scraps = keep;
  }

  enemyScreenAnchor(id: number): THREE.Vector3 | null {
    const v = this.enemies.get(id);
    return v ? new THREE.Vector3(v.root.position.x, v.barY, v.root.position.z) : null;
  }

  clear(): void {
    for (const v of this.enemies.values()) this.group.remove(v.root);
    for (const v of this.towers.values()) this.group.remove(v.root);
    for (const s of this.shots) this.group.remove(s.mesh);
    for (const s of this.scraps) this.group.remove(s.mesh);
    this.enemies.clear();
    this.towers.clear();
    this.shots = [];
    this.scraps = [];
  }
}
