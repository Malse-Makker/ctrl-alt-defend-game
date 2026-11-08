// Everything that moves: towers, colleagues, shots and the little bursts of paper. Reads the
// simulation state every frame and turns simulation events into something you can see.

import * as THREE from 'three';
import { modelFor } from '../sim/data/towers';
import { CHAIR_DIRS, type Enemy, type Game, type GameEvent, type Tower } from '../sim/game';
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
  shieldBack: THREE.Sprite | null;
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
  /** Little stars circling the head while stunned. */
  stars: THREE.Group | null;
  /** The Impersonator's own see-through materials (null for everyone you can just see). */
  ghostMats: THREE.Material[] | null;
}

interface TowerView {
  id: number;
  root: THREE.Group;
  model: THREE.Object3D;
  modelKey: string;
  pop: number;
  recoil: number;
  /** The Shredder's zone on the floor. */
  zone: THREE.Mesh | null;
  /** Shown while a Chatterbox silences the tower. */
  mute: THREE.Sprite | null;
  /** Wet floor sign while The Cleaner has mopped it. */
  wet: THREE.Object3D | null;
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
  /** The office chair's lane: a strip instead of a circle. */
  private readonly lane: THREE.Mesh;
  private barrierViews = new Map<number, THREE.Object3D>();
  readonly ghostTile: THREE.Mesh;
  private ghost: THREE.Object3D | null = null;
  /** Multiplayer: a ring in the owner's colour under every tower. Empty in single player. */
  private ownerColors: string[] = [];
  private ringGeo = new THREE.RingGeometry(0.4, 0.48, 32).rotateX(-Math.PI / 2);
  private ringMats = new Map<string, THREE.MeshBasicMaterial>();

  setOwnerColors(colors: string[]): void {
    this.ownerColors = colors;
  }
  private ghostKey = '';
  /** Every tack on the floor, as one instanced mesh: a few coloured heads per pile. */
  private readonly tacks: THREE.InstancedMesh;
  private static readonly TACK_COLORS = ['#d24b4b', '#3e7cc9', '#f2c641', '#6fcf7f', '#e9e6df'].map((c) => new THREE.Color(c));

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
    // A unit strip from the origin along +z, scaled to the lane's length when shown.
    this.lane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false }),
    );
    this.lane.visible = false;
    this.lane.renderOrder = 2;
    this.group.add(this.lane);

    this.ghostTile = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: PAL.ok, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    this.ghostTile.visible = false;
    this.ghostTile.renderOrder = 3;
    this.group.add(this.ghostTile);
    const tackGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.035, 8);
    this.tacks = new THREE.InstancedMesh(tackGeo, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 }), 2400);
    this.tacks.count = 0;
    this.tacks.frustumCulled = false;
    this.group.add(this.tacks);
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

  /** Show the chair's lane from (x, y) in direction (dx, dy), or hide it with null. */
  showLane(x: number | null, y: number, dx: number, dy: number, length: number, color = '#ffffff'): void {
    if (x === null || length <= 0) {
      this.lane.visible = false;
      return;
    }
    this.lane.visible = true;
    this.lane.position.set(x, 0.025, y);
    this.lane.rotation.y = Math.atan2(dx, dy);
    this.lane.scale.set(1.1, 1, length + 0.5);
    (this.lane.material as THREE.MeshBasicMaterial).color.set(color);
  }

  showRange(x: number | null, y: number, r: number, color = '#ffffff'): void {
    // Office Artillery reaches the whole floor: no ring to draw.
    if (x === null || r <= 0 || !Number.isFinite(r) || r > 50) {
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
      if (v.modelKey !== modelFor(t.def, t.tiers)) this.swapModel(v, t);
      v.pop = Math.max(0, v.pop - dt * 4);
      v.recoil = Math.max(0, v.recoil - dt * 6);
      const s = 1 + Math.sin(v.pop * Math.PI) * 0.18;
      v.model.scale.set(s, s * (1 - v.recoil * 0.06), s);
      if (t.def.role === 'zone') {
        if (!v.zone) {
          v.zone = this.makeZone();
          this.group.add(v.zone);
          v.zone.position.set(t.x, 0.015, t.y);
        }
        v.zone.scale.setScalar(game.liveStats(t).range);
        (v.zone.material as THREE.MeshBasicMaterial).opacity = t.silenced || t.mopped > 0 ? 0.05 : 0.16 + Math.sin(this.clock * 6) * 0.03;
      }
      if (t.def.role === 'chair') {
        // Out along its lane and back, spinning as it goes.
        const d = CHAIR_DIRS[t.dir] ?? CHAIR_DIRS[0];
        v.model.position.set(d.x * t.roll, 0, d.y * t.roll);
        v.model.rotation.y = Math.atan2(d.x, d.y) + (t.rolling !== 0 ? t.roll * 1.6 : 0);
      }
      if (t.mopped > 0 && !v.wet) {
        v.wet = this.assets.clone('wet_floor');
        v.wet.scale.setScalar(0.7);
        v.wet.position.set(0.32, 0, 0.32);
        v.root.add(v.wet);
      }
      if (v.wet) v.wet.visible = t.mopped > 0;
      if (t.silenced && !v.mute) {
        v.mute = new THREE.Sprite(this.muteMat());
        v.mute.scale.set(0.42, 0.42, 1);
        v.mute.position.set(0, 1.25, 0);
        v.mute.renderOrder = 12;
        v.root.add(v.mute);
      }
      if (v.mute) v.mute.visible = t.silenced;
    }
    this.clock += dt;
    for (const [id, v] of this.towers) {
      if (!game.tower(id)) {
        this.group.remove(v.root);
        if (v.zone) this.group.remove(v.zone);
        this.towers.delete(id);
      }
    }
    this.syncTacks(game);
    this.syncBarriers(game);
    this.updateShots(dt);
    this.updateScraps(dt);
    this.updatePulses(dt);
  }

  /** Keyboards across the walkway, lying crosswise. They sink a little as they get kicked. */
  private syncBarriers(game: Game): void {
    const seen = new Set<number>();
    for (const b of game.barriers) {
      seen.add(b.id);
      let obj = this.barrierViews.get(b.id);
      if (!obj) {
        obj = this.assets.clone('keyboard_barrier');
        this.barrierViews.set(b.id, obj);
        this.group.add(obj);
        this.burst(b.x, 0.3, b.y, 8, '#2a2d33');
      }
      obj.position.set(b.x, 0.02, b.y);
      obj.rotation.y = Math.atan2(b.dirX, b.dirY);
      const k = Math.max(0.35, b.hp / Math.max(1, b.maxHp));
      obj.scale.set(1, k, 1);
    }
    for (const [id, obj] of this.barrierViews) {
      if (seen.has(id)) continue;
      this.group.remove(obj);
      this.barrierViews.delete(id);
      this.burst(obj.position.x, 0.2, obj.position.z, 6, '#a7adb5');
    }
  }

  private syncTacks(game: Game): void {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();
    let n = 0;
    const cap = this.tacks.instanceMatrix.count;
    for (const p of game.piles) {
      // Five heads per pile at most, fewer as the tacks get used up. Spread from the pile id.
      const heads = Math.max(1, Math.ceil((p.pierce / Math.max(1, p.maxPierce)) * Math.min(7, 3 + p.maxPierce / 3)));
      for (let i = 0; i < heads && n < cap; i++) {
        const a = (p.id * 2.399 + i * 2.1) % (Math.PI * 2);
        const r = 0.06 + ((p.id * 7 + i * 13) % 10) * 0.02;
        pos.set(p.x + Math.cos(a) * r, 0.03, p.y + Math.sin(a) * r);
        m.compose(pos, q, one);
        this.tacks.setMatrixAt(n, m);
        this.tacks.setColorAt(n, Actors.TACK_COLORS[(p.id + i) % Actors.TACK_COLORS.length]);
        n++;
      }
    }
    this.tacks.count = n;
    this.tacks.instanceMatrix.needsUpdate = true;
    if (this.tacks.instanceColor) this.tacks.instanceColor.needsUpdate = true;
  }

  onEvent(ev: GameEvent, game: Game): void {
    switch (ev.t) {
      case 'shot': {
        if (ev.kind === 'tack') {
          // Stepped on: no projectile, just a hop.
          const v = this.enemies.get(ev.enemyId);
          if (v) {
            v.squash = Math.max(v.squash, 1.2);
            if (ev.killed) v.dieIn = 0;
          }
          if (ev.result === 'hit') this.burst(ev.tx, 0.15, ev.ty, 2, '#d24b4b');
          break;
        }
        const travel = ev.travel;
        const staple = game.tower(ev.towerId)?.defId === 'artillery';
        this.fireShot(ev.fx, ev.fy, ev.tx, ev.ty, travel, staple ? 'staple' : 'reply');
        if (staple) this.burst(ev.tx, 0.5, ev.ty, 5, '#a7adb5');
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
      case 'tacks': {
        const t = game.tower(ev.towerId);
        if (t) this.fireShot(t.x, t.y, ev.x, ev.y, Math.hypot(ev.x - t.x, ev.y - t.y) / 9, 'staple');
        break;
      }
      case 'swept': {
        const v = this.enemies.get(ev.enemyId);
        if (v) this.burst(v.root.position.x, 0.2, v.root.position.z, 6, '#c8b98a');
        break;
      }
      case 'kill': {
        const v = this.enemies.get(ev.enemyId);
        if (v && v.dieIn === null) v.dieIn = ev.delay;
        break;
      }
      case 'ability':
        this.pulse(ev.x, ev.y, ev.range, '#bfe2ff');
        break;
      case 'cry':
        this.pulse(ev.x, ev.y, ev.radius, '#e2557a');
        break;
      case 'smash':
        this.pulse(ev.x, ev.y, ev.radius, '#e5534b');
        this.burst(ev.x, 0.3, ev.y, 10, '#f2c641');
        this.burst(ev.x, 0.3, ev.y, 8, '#3e7cc9');
        break;
      case 'pulse':
        this.pulse(ev.x, ev.y, ev.range, ev.stun ? '#f2c641' : '#6fcf7f');
        break;
      case 'placed':
      case 'upgraded': {
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
    const modelKey = modelFor(t.def, t.tiers);
    const model = this.assets.clone(modelKey);
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
    // A chair turns with its lane (in sync); everything else faces the walkway.
    root.rotation.y = t.def.role === 'chair' ? 0 : Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
    const color = this.ownerColors[t.owner];
    if (color) {
      let mat = this.ringMats.get(color);
      if (!mat) {
        mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
        this.ringMats.set(color, mat);
      }
      const ring = new THREE.Mesh(this.ringGeo, mat);
      ring.position.y = 0.012;
      ring.renderOrder = 1;
      root.add(ring);
    }
    this.group.add(root);
    const v: TowerView = { id: t.id, root, model, modelKey, pop: 1, recoil: 0, zone: null, mute: null, wet: null };
    this.towers.set(t.id, v);
    return v;
  }

  private swapModel(v: TowerView, t: Tower): void {
    v.root.remove(v.model);
    v.modelKey = modelFor(t.def, t.tiers);
    v.model = this.assets.clone(v.modelKey);
    v.root.add(v.model);
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
    // A shield is a bright blue bar on top of the HP bar, so it reads at a glance.
    let shieldFill: THREE.Sprite | null = null;
    let shieldBack: THREE.Sprite | null = null;
    if (e.maxShield > 0) {
      const sh = boss ? 0.08 : 0.06;
      const sy = barY + (boss ? 0.12 : 0.09);
      shieldBack = new THREE.Sprite(this.hpBackMat);
      shieldBack.center.set(0, 0.5);
      shieldBack.scale.set(barWidth + 0.04, sh + 0.03, 1);
      shieldBack.position.copy(this.camRight).multiplyScalar(-(barWidth + 0.04) / 2).setY(sy);
      shieldBack.renderOrder = 10;
      shieldFill = new THREE.Sprite(this.hpMats.shield);
      shieldFill.center.set(0, 0.5);
      shieldFill.scale.set(barWidth, sh, 1);
      shieldFill.position.copy(this.camRight).multiplyScalar(-barWidth / 2).setY(sy);
      shieldFill.renderOrder = 11;
      root.add(shieldBack, shieldFill);
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
      shieldBack,
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
      stars: null,
      ghostMats: null,
    };
    if (e.def.invisible) {
      // His own copy of the materials, so he can fade without fading every other model.
      const mats: THREE.Material[] = [];
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const list = (Array.isArray(m.material) ? m.material : [m.material]).map((mat) => {
          const c = mat.clone();
          c.transparent = true;
          mats.push(c);
          return c;
        });
        m.material = Array.isArray(m.material) ? list : list[0];
      });
      v.ghostMats = mats;
    }
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
    // Stunned: three little stars circle the head.
    if (e.stunTime > 0 && !v.stars) {
      v.stars = new THREE.Group();
      const geo = new THREE.OctahedronGeometry(0.05);
      const mat = new THREE.MeshBasicMaterial({ color: '#f2c641' });
      for (let i = 0; i < 3; i++) {
        const st = new THREE.Mesh(geo, mat);
        st.position.set(Math.cos((i * Math.PI * 2) / 3) * 0.2, 0, Math.sin((i * Math.PI * 2) / 3) * 0.2);
        v.stars.add(st);
      }
      v.stars.position.y = v.barY - 0.12;
      v.root.add(v.stars);
    }
    if (v.stars) {
      v.stars.visible = e.stunTime > 0;
      v.stars.rotation.y += dt * 6;
    }
    // Hidden colleagues are a faint shimmer until something shows them up.
    const hidden = v.ghostMats !== null && !e.revealed;
    if (v.ghostMats) for (const m of v.ghostMats) m.opacity = hidden ? 0.28 : 1;
    // HP bar: only when hurt (bosses always).
    const ratio = Math.max(0, e.hp / e.maxHp);
    const hurt = !hidden && (ratio < 0.999 || v.boss || e.maxShield > 0);
    v.hpBack.visible = hurt;
    v.hpFill.visible = hurt && ratio > 0;
    v.hpFill.scale.x = Math.max(0.001, v.barWidth * ratio);
    v.hpFill.material = ratio > 0.5 ? this.hpMats.ok : ratio > 0.25 ? this.hpMats.low : this.hpMats.crit;
    if (v.shieldFill) {
      v.shieldFill.visible = !hidden && e.shield > 0;
      if (v.shieldBack) v.shieldBack.visible = v.shieldFill.visible;
      v.shieldFill.scale.x = Math.max(0.001, v.barWidth * (e.shield / Math.max(1, e.maxShield)));
    }
  }

  private animateGone(v: EnemyView, dt: number): void {
    if (v.leaking > 0) {
      v.leaking += dt;
      const k = Math.min(1, v.leaking / 0.35);
      v.model.scale.setScalar(Math.max(0.001, (1 - k) * PERSON_SCALE));
      v.hpBack.visible = v.hpFill.visible = false;
      if (v.shieldFill) v.shieldFill.visible = false;
      if (v.shieldBack) v.shieldBack.visible = false;
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
      if (v.shieldBack) v.shieldBack.visible = false;
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

  private pulses: { mesh: THREE.Mesh; t: number; r: number }[] = [];

  private clock = 0;
  private muteMaterial: THREE.SpriteMaterial | null = null;

  /** A speech bubble with a line through it, drawn once on a canvas. */
  private muteMat(): THREE.SpriteMaterial {
    if (this.muteMaterial) return this.muteMaterial;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d')!;
    x.fillStyle = '#f6f3ea';
    x.beginPath();
    x.ellipse(32, 28, 24, 18, 0, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.moveTo(20, 40);
    x.lineTo(14, 56);
    x.lineTo(30, 44);
    x.fill();
    x.strokeStyle = '#e5534b';
    x.lineWidth = 7;
    x.beginPath();
    x.moveTo(12, 50);
    x.lineTo(52, 8);
    x.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.muteMaterial = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    return this.muteMaterial;
  }

  private makeZone(): THREE.Mesh {
    const zone = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#3fa7a0', transparent: true, opacity: 0.16, depthWrite: false }),
    );
    const edge = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#3fa7a0', transparent: true, opacity: 0.6, depthWrite: false }),
    );
    zone.add(edge);
    zone.renderOrder = 1;
    return zone;
  }

  /** Inbox Zero and Headphones: a ring that sweeps out over everyone it just hit. */
  private pulse(x: number, y: number, r: number, color: string): void {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    mesh.position.set(x, 0.05, y);
    mesh.renderOrder = 4;
    this.group.add(mesh);
    this.pulses.push({ mesh, t: 0, r });
  }

  private updatePulses(dt: number): void {
    const keep: typeof this.pulses = [];
    for (const p of this.pulses) {
      p.t += dt;
      const k = Math.min(1, p.t / 0.45);
      p.mesh.scale.setScalar(0.2 + k * p.r);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
      if (k >= 1) {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      } else keep.push(p);
    }
    this.pulses = keep;
  }

  private staplePool: THREE.Group[] = [];
  private readonly stapleGeo = new THREE.BoxGeometry(0.22, 0.04, 0.05);
  private readonly stapleMat = new THREE.MeshStandardMaterial({ color: '#c8ccd2', metalness: 0.8, roughness: 0.3 });

  private fireShot(fx: number, fy: number, tx: number, ty: number, dur: number, kind: 'reply' | 'staple' = 'reply'): void {
    const pool = kind === 'staple' ? this.staplePool : this.shotPool;
    let mesh = pool.pop();
    if (!mesh) {
      mesh = new THREE.Group();
      mesh.userData.kind = kind;
      if (kind === 'staple') {
        mesh.add(new THREE.Mesh(this.stapleGeo, this.stapleMat));
      } else {
        const env = new THREE.Mesh(this.envGeo, this.envMat);
        const flap = new THREE.Mesh(this.flapGeo, this.flapMat);
        flap.position.set(0, 0.012, -0.045);
        mesh.add(env, flap);
      }
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
        (s.mesh.userData.kind === 'staple' ? this.staplePool : this.shotPool).push(s.mesh);
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
    for (const v of this.towers.values()) {
      this.group.remove(v.root);
      if (v.zone) this.group.remove(v.zone);
    }
    for (const s of this.shots) this.group.remove(s.mesh);
    for (const s of this.scraps) this.group.remove(s.mesh);
    this.enemies.clear();
    this.towers.clear();
    this.shots = [];
    this.scraps = [];
    this.tacks.count = 0;
    for (const obj of this.barrierViews.values()) this.group.remove(obj);
    this.barrierViews.clear();
    this.lane.visible = false;
  }
}
