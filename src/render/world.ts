// The static office: floor, walkway, walls, door, furniture and your desk.

import * as THREE from 'three';
import type { LevelDef } from '../sim/data/levels';
import { chairTile, type Game } from '../sim/game';
import type { Assets } from './assets';
import { PAL } from './palette';

const WALL_H = 1.6;
const WALL_T = 0.16;
/** Height of the cabinet every tower stands on (side_desk in the Blender script). */
export const TOWER_CABINET_H = 0.42;

/** How high a step on this tile lifts a tower that stands on it with its cabinet (the tribune). */
export function raiseAt(level: LevelDef, tx: number, ty: number): number {
  for (const d of level.decor) {
    if (d.raise !== undefined && tx >= d.rect.x && tx < d.rect.x + d.rect.w && ty >= d.rect.y && ty < d.rect.y + d.rect.h) return d.raise;
  }
  return 0;
}

/** The top of a worktop on this tile (kitchen counter, table, bar), or undefined on the floor. */
export function surfaceAt(level: LevelDef, tx: number, ty: number): number | undefined {
  for (const d of level.decor) {
    if (d.surface !== undefined && tx >= d.rect.x && tx < d.rect.x + d.rect.w && ty >= d.rect.y && ty < d.rect.y + d.rect.h) return d.surface;
  }
  return undefined;
}

/** Which way your desk faces: its front to the walkway, your chair behind it (chair side is +z). */
export function deskTurn(level: LevelDef): number {
  const c = chairTile(level);
  return Math.atan2(c.x - level.desk.x, c.y - level.desk.y);
}

interface GateView {
  flap: THREE.Object3D;
  x: number;
  y: number;
  /** Which way it swings open: with the people walking through. */
  sign: number;
  open: number;
}

export class World {
  readonly group = new THREE.Group();
  /**
   * Drawn while placing a tower: green on the tiles you may build on (at the height of the
   * worktop, if there is one), and a dark tint on bare floor you may not use, so you can tell
   * the two apart at a glance.
   */
  readonly buildGrid = new THREE.Group();
  readonly deskPos: THREE.Vector3;
  /** Asset clones share geometry with the loaded models and must survive a retry. */
  private readonly shared = new Set<THREE.Object3D>();
  private readonly gates: GateView[] = [];
  /** The projector and its screen (Presentation Room): they act up before the mini-game. */
  private readonly beamer: { lamp: THREE.Mesh[]; beam: THREE.Object3D[]; slide: THREE.Object3D[]; noSignal: THREE.Object3D[] } = { lamp: [], beam: [], slide: [], noSignal: [] };
  private clock = 0;
  /** Hot Desks: an empty flex desk per b tile (hidden under a tower), reserved signs, the phone. */
  private readonly flexDesks: { x: number; y: number; obj: THREE.Object3D }[] = [];
  private readonly signs: THREE.Object3D[] = [];
  private readonly reservedTint: THREE.Mesh[] = [];
  private phoneObj: THREE.Object3D | null = null;
  private assetsRef: Assets;
  /** The Merger: a stack of moving boxes per x tile, gone once cleared. */
  private readonly boxViews: { x: number; y: number; obj: THREE.Object3D }[] = [];
  /** Boardroom II: the blinds in the glass room, and how far down they are (0 up, 1 down). */
  private readonly slats: THREE.Object3D[] = [];
  private slatsDown = 0;
  /** Server Room: the racks' status lights, blinking. */
  private readonly rackLights: THREE.Object3D[] = [];

  constructor(level: LevelDef, game: Game, assets: Assets, me = 0) {
    const { w, h } = level.size;
    const g = this.group;

    // Floor slab and carpet tiles (checkered, two greys).
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, h + 0.4), new THREE.MeshStandardMaterial({ color: PAL.slab, roughness: 0.9 }));
    slab.position.set(w / 2, -0.35, h / 2);
    slab.receiveShadow = true;
    g.add(slab);

    const tileGeo = new THREE.BoxGeometry(1, 0.1, 1);
    // Every floor has its own look (kitchen tiles, meeting room carpet); the default is office grey.
    const look = level.look;
    const hard = look !== undefined && look.floorA !== PAL.carpet;
    const carpetA = new THREE.MeshStandardMaterial({ color: look?.floorA ?? PAL.carpet, roughness: hard ? 0.55 : 0.95 });
    const carpetB = new THREE.MeshStandardMaterial({ color: look?.floorB ?? PAL.carpetDark, roughness: hard ? 0.55 : 0.95 });
    const walkMat = new THREE.MeshStandardMaterial({ color: look?.walkway ?? PAL.walkway, roughness: 0.8 });
    const cells: { x: number; y: number; kind: 0 | 1 | 2 }[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        cells.push({ x, y, kind: game.isPathTile(x, y) ? 2 : (x + y) % 2 === 0 ? 0 : 1 });
      }
    }
    const mats = [carpetA, carpetB, walkMat];
    for (const kind of [0, 1, 2] as const) {
      const list = cells.filter((c) => c.kind === kind);
      const inst = new THREE.InstancedMesh(tileGeo, mats[kind], list.length);
      const m = new THREE.Matrix4();
      list.forEach((c, i) => {
        m.makeTranslation(c.x + 0.5, kind === 2 ? -0.035 : -0.05, c.y + 0.5);
        inst.setMatrixAt(i, m);
      });
      inst.receiveShadow = true;
      g.add(inst);
    }
    // Thin edge lines along the walkway make the route readable at a glance.
    this.addWalkwayEdges(level, game);

    // Back walls along x = 0 and y = 0, with a gap where each route comes in.
    const wallMat = new THREE.MeshStandardMaterial({ color: level.look?.wall ?? PAL.wall, roughness: 0.9 });
    const trimMat = new THREE.MeshStandardMaterial({ color: PAL.wallTrim, roughness: 0.9 });
    const windowMat = new THREE.MeshStandardMaterial({ color: PAL.window, roughness: 0.2, emissive: new THREE.Color(PAL.window), emissiveIntensity: 0.25 });
    // A glass front (Reception) is furniture of its own, with its own doors.
    const doors = level.look?.glassFront ? [] : level.paths.map((p) => p[0]).filter((p) => p.x < 0).map((p) => p.y);
    if (!level.look?.glassFront) this.wallAlongZ(0, h, doors, wallMat, trimMat);
    this.wallAlongX(w, wallMat, trimMat, windowMat);
    for (const dz of doors) {
      const door = assets.clone('door');
      door.position.set(-WALL_T / 2, 0, dz);
      door.rotation.y = Math.PI / 2;
      this.shared.add(door);
      g.add(door);
    }

    // Walls inside the floor (Work From Home): lower than the outer walls, so you can still see
    // over them, and with a light cap so the line reads from above.
    const capMat = new THREE.MeshStandardMaterial({ color: PAL.wallTrim, roughness: 0.8 });
    for (const r of level.walls ?? []) {
      const alongX = r.along ? r.along === 'x' : r.w >= r.h;
      const len = alongX ? r.w : r.h;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.2, 1.1, alongX ? 0.2 : len), wallMat);
      wall.position.set(r.x + r.w / 2, 0.55, r.y + r.h / 2);
      wall.castShadow = true;
      wall.receiveShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len + 0.04 : 0.26, 0.05, alongX ? 0.26 : len + 0.04), capMat);
      cap.position.set(r.x + r.w / 2, 1.12, r.y + r.h / 2);
      g.add(wall, cap);
    }

    for (const d of level.decor) {
      const obj = assets.clone(d.model);
      obj.position.set(d.rect.x + d.rect.w / 2, 0, d.rect.y + d.rect.h / 2);
      obj.rotation.y = ((d.turn ?? 0) * Math.PI) / 2;
      this.shared.add(obj);
      g.add(obj);
      this.collectBeamer(obj);
      obj.traverse((o) => {
        if (o.name.startsWith('BlindSlats') && !this.slats.includes(o)) this.slats.push(o);
        if (o.name.startsWith('RackLights') && !this.rackLights.includes(o)) this.rackLights.push(o);
      });
      const flap = obj.getObjectByName('GateFlap');
      if (flap) this.addGate(flap, obj, game);
    }

    const desk = assets.clone('player_desk');
    this.deskPos = new THREE.Vector3(level.desk.x + 0.5, 0, level.desk.y + 0.5);
    desk.position.copy(this.deskPos);
    desk.rotation.y = deskTurn(level);
    this.shared.add(desk);
    g.add(desk);

    // Empty parking bays (P): white lines round each bay, the only place you may build.
    if (level.grid) {
      const bay = (x: number, y: number) => level.grid![y]?.[x] === 'P';
      const lineMat = new THREE.MeshBasicMaterial({ color: '#e8e6e0' });
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!bay(x, y)) continue;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            if (bay(x + dx, y + dy)) continue;
            const line = new THREE.Mesh(new THREE.BoxGeometry(dx ? 0.06 : 1, 0.01, dx ? 1 : 0.06), lineMat);
            line.position.set(x + 0.5 + dx * 0.47, 0.006, y + 0.5 + dy * 0.47);
            g.add(line);
          }
        }
      }
    }
    // Flex desks (Hot Desks): an empty desk on every b tile. A tower you place takes its spot.
    this.assetsRef = assets;
    for (const b of game.boxes) {
      const obj = assets.clone('moving_boxes');
      obj.position.set(b.x + 0.5, 0, b.y + 0.5);
      obj.rotation.y = ((b.x * 7 + b.y * 3) % 4) * (Math.PI / 2);
      this.shared.add(obj);
      g.add(obj);
      this.boxViews.push({ x: b.x, y: b.y, obj });
    }
    if (level.grid) {
      level.grid.forEach((row, y) =>
        [...row].forEach((c, x) => {
          if (c !== 'b') return;
          const obj = assets.clone('flex_desk');
          obj.position.set(x + 0.5, 0, y + 0.5);
          // Face the nearest walkway, like someone working there would.
          const up = game.isPathTile(x, y - 1);
          obj.rotation.y = up ? Math.PI : 0;
          this.shared.add(obj);
          g.add(obj);
          this.flexDesks.push({ x, y, obj });
        }),
      );
    }
    // Bad wifi (the bedroom): a soft carpet, so you can see where the signal gives up.
    const wifi: { x: number; y: number }[] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (game.isBadWifi(x, y)) wifi.push({ x, y });
    if (wifi.length) {
      const mat = new THREE.MeshStandardMaterial({ color: '#8d93b8', roughness: 1, transparent: true, opacity: 0.55, depthWrite: false });
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat, wifi.length);
      const m = new THREE.Matrix4();
      wifi.forEach((c, i) => mesh.setMatrixAt(i, m.makeTranslation(c.x + 0.5, 0.003, c.y + 0.5)));
      mesh.receiveShadow = true;
      g.add(mesh);
    }
    // Tiles only some towers may use (the soup queue): painted stripes on the floor.
    const lane: { x: number; y: number }[] = [];
    const concrete: { x: number; y: number }[] = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const rule = game.ruleAt(x, y);
        if (rule === 'trap') lane.push({ x, y });
        else if (rule === 'physical') concrete.push({ x, y });
      }
    // Server Room: the cold room is white and blue, and cables run across the floor.
    const coldTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (game.isColdFloor(x, y)) coldTiles.push({ x, y });
    if (coldTiles.length) {
      const mat = new THREE.MeshStandardMaterial({ color: '#dfe9f2', roughness: 0.5 });
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2), mat, coldTiles.length);
      const m = new THREE.Matrix4();
      coldTiles.forEach((c, i) => mesh.setMatrixAt(i, m.makeTranslation(c.x + 0.5, 0.003, c.y + 0.5)));
      mesh.receiveShadow = true;
      g.add(mesh);
    }
    if (level.grid) {
      level.grid.forEach((row, y) =>
        [...row].forEach((c, x) => {
          if (c !== '~') return;
          const obj = assets.clone('floor_cables');
          obj.position.set(x + 0.5, 0.01, y + 0.5);
          this.shared.add(obj);
          g.add(obj);
        }),
      );
    }
    // The Merger: the startup's half is polished concrete.
    if (concrete.length) {
      const mat = new THREE.MeshStandardMaterial({ color: '#8f9294', roughness: 0.6 });
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat, concrete.length);
      const m = new THREE.Matrix4();
      concrete.forEach((c, i) => mesh.setMatrixAt(i, m.makeTranslation(c.x + 0.5, 0.003, c.y + 0.5)));
      mesh.receiveShadow = true;
      g.add(mesh);
    }
    if (lane.length) {
      const mat = new THREE.MeshBasicMaterial({ map: stripes(), transparent: true, opacity: 0.55, depthWrite: false });
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat, lane.length);
      const m = new THREE.Matrix4();
      lane.forEach((c, i) => mesh.setMatrixAt(i, m.makeTranslation(c.x + 0.5, 0.004, c.y + 0.5)));
      g.add(mesh);
    }
    // Build grid (hidden until a tower is picked).
    this.buildGrid.visible = false;
    g.add(this.buildGrid);
    this.gridFor = { game, me };
    this.showBuildGrid(null);
  }

  private gridFor: { game: Game; me: number };
  private gridKey: string | null = '';

  /**
   * The build grid for the tower you are placing: green where it may stand (at the height of the
   * worktop, if there is one), a dark tint on bare floor it may not use. Null hides it.
   */
  showBuildGrid(defId: string | null): void {
    this.buildGrid.visible = defId !== null;
    if (defId === null || defId === this.gridKey) return;
    this.gridKey = defId;
    const { game, me } = this.gridFor;
    const level = game.level;
    const { w, h } = level.size;
    const furnished = new Uint8Array(w * h);
    const chair = chairTile(level);
    for (const r of [...level.decor.map((d) => d.rect), ...(level.walls ?? []), { ...chair, w: 1, h: 1 }]) {
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (game.inBounds(x, y)) furnished[y * w + x] = 1;
    }
    const free: { x: number; y: number; top: number }[] = [];
    const banned: { x: number; y: number; top: number }[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (game.isPathTile(x, y)) continue;
        // Only the tiles this player may build on (multiplayer zones), so the grid shows your patch.
        if (!game.isBlockedTile(x, y) && game.mayBuildAt(me, x, y) && game.tileAllows(defId, x, y)) free.push({ x, y, top: surfaceAt(level, x, y) ?? 0 });
        else if (!furnished[y * w + x]) banned.push({ x, y, top: 0 });
      }
    }
    for (const c of [...this.buildGrid.children]) {
      this.buildGrid.remove(c);
      const mesh = c as THREE.InstancedMesh;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    const tiles = (list: { x: number; y: number; top: number }[], size: number, color: THREE.ColorRepresentation, opacity: number) => {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), mat, Math.max(1, list.length));
      mesh.count = list.length;
      const m = new THREE.Matrix4();
      list.forEach((c, i) => mesh.setMatrixAt(i, m.makeTranslation(c.x + 0.5, c.top + 0.008, c.y + 0.5)));
      mesh.renderOrder = 2;
      this.buildGrid.add(mesh);
    };
    tiles(free, 0.86, PAL.ok, 0.22);
    tiles(banned, 1, 0x1b2230, 0.28);
  }

  /** Speed gates swing open for whoever is walking through, once they have scanned their pass. */
  update(dt: number, game: Game): void {
    this.clock += dt;
    this.updateBeamer(game);
    this.updateDesks(game);
    for (const b of this.boxViews) b.obj.visible = game.isBoxes(b.x, b.y);
    // Each rack blinks at its own pace; overheating makes them all flicker.
    const hot = game.hazardOn && game.level.hazard?.type === 'overheat';
    this.rackLights.forEach((l, i) => (l.visible = Math.sin(this.clock * (hot ? 18 : 3 + (i % 5)) + i * 1.7) > -0.3));
    if (this.slats.length) {
      // A rattle before the meeting (they start coming down), then all the way down.
      const want = game.blindsDown ? 1 : game.hazardWarning ? 0.3 : 0;
      this.slatsDown += (want - this.slatsDown) * Math.min(1, dt * 4);
      for (const s of this.slats) {
        s.visible = this.slatsDown > 0.02;
        s.scale.z = Math.max(0.02, this.slatsDown);
      }
    }
    for (const gv of this.gates) {
      const through = game.enemies.some((e) => e.alive && !(e.gateHold && e.gateHold > 0) && Math.hypot(e.x - gv.x, e.y - gv.y) < 0.75);
      gv.open += ((through ? 1 : 0) - gv.open) * Math.min(1, dt * 10);
      gv.flap.rotation.y = gv.sign * gv.open * (Math.PI / 2);
    }
  }

  /**
   * Hot Desks: hide a flex desk under a tower, put a RESERVED sign and a red tint on booked desks,
   * and the desk phone where it rings (shaking) or where someone is stuck on a call (still).
   */
  private updateDesks(game: Game): void {
    if (!this.flexDesks.length) return;
    for (const d of this.flexDesks) d.obj.visible = !game.towerAt(d.x, d.y);
    game.reserved.forEach((d, i) => {
      if (!this.signs[i]) {
        const sign = this.assetsRef.clone('reserved_sign');
        this.shared.add(sign);
        this.group.add(sign);
        this.signs.push(sign);
        const tint = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: PAL.bad, transparent: true, opacity: 0.3, depthWrite: false }));
        tint.renderOrder = 2;
        this.group.add(tint);
        this.reservedTint.push(tint);
      }
      this.signs[i].visible = true;
      this.signs[i].position.set(d.x + 0.5, 0.75, d.y + 0.5);
      this.reservedTint[i].visible = true;
      this.reservedTint[i].position.set(d.x + 0.5, 0.012, d.y + 0.5);
    });
    for (let i = game.reserved.length; i < this.signs.length; i++) {
      this.signs[i].visible = false;
      this.reservedTint[i].visible = false;
    }
    const at = game.phone ?? game.stuckDesk;
    if (at && !this.phoneObj) {
      this.phoneObj = this.assetsRef.clone('desk_phone');
      this.shared.add(this.phoneObj);
      this.group.add(this.phoneObj);
    }
    if (this.phoneObj) {
      this.phoneObj.visible = at !== null;
      if (at) {
        const ringing = game.phone !== null;
        const shake = ringing ? Math.sin(this.clock * 60) * 0.12 : 0;
        this.phoneObj.position.set(at.x + 0.5, 1.05 + (ringing ? Math.abs(Math.sin(this.clock * 12)) * 0.08 : 0), at.y + 0.5);
        this.phoneObj.rotation.set(0, shake, ringing ? shake * 0.5 : 0);
      }
    }
  }

  private collectBeamer(obj: THREE.Object3D): void {
    const b = this.beamer;
    obj.traverse((o) => {
      if (o.name.startsWith('BeamerLamp')) {
        // Its own material: the lamp changes colour.
        o.traverse((c) => {
          const m = c as THREE.Mesh;
          if (!m.isMesh || b.lamp.includes(m)) return;
          m.material = (m.material as THREE.MeshStandardMaterial).clone();
          b.lamp.push(m);
        });
      } else if (o.name.startsWith('BeamerBeam')) b.beam.push(o);
      else if (o.name.startsWith('ScreenSlide')) b.slide.push(o);
      else if (o.name.startsWith('ScreenNoSignal')) {
        o.visible = false;
        b.noSignal.push(o);
      }
    });
  }

  /**
   * Normal: a green lamp, a steady beam, the slides. Three seconds before the mini-game: the lamp
   * blinks red, the beam flickers and the screen says NO SIGNAL. During it: no beam at all.
   */
  private updateBeamer(game: Game): void {
    const b = this.beamer;
    if (b.lamp.length + b.slide.length === 0) return;
    const projector = game.level.hazard?.type === 'projector';
    const warn = projector && game.hazardWarning;
    const down = projector && game.hazardOn;
    const t = this.clock;
    const blink = Math.sin(t * 22) > 0;
    for (const m of b.lamp) {
      const mat = m.material as THREE.MeshStandardMaterial;
      const red = down || (warn && blink);
      mat.color.set(red ? PAL.bad : PAL.ok);
      mat.emissive.set(red ? PAL.bad : PAL.ok);
    }
    const flicker = Math.sin(t * 37) + Math.sin(t * 13) > 0.4;
    for (const o of b.beam) o.visible = !down && (!warn || flicker);
    for (const o of b.slide) o.visible = !(warn || down);
    for (const o of b.noSignal) o.visible = warn || down;
  }

  private addGate(flap: THREE.Object3D, obj: THREE.Object3D, game: Game): void {
    obj.updateMatrixWorld(true);
    const hinge = flap.getWorldPosition(new THREE.Vector3());
    // The gate this flap closes: the nearest one on the walkway.
    let best = { d: Infinity, x: hinge.x, y: hinge.z, dir: { x: 0, y: 1 } };
    for (const gt of game.gates) {
      const d = Math.hypot(gt.x - hinge.x, gt.y - hinge.z);
      const p = game.paths[gt.pathIndex].pointAt(gt.dist);
      if (d < best.d) best = { d, x: gt.x, y: gt.y, dir: { x: p.dirX, y: p.dirY } };
    }
    // Try both ways round and keep the one that swings along with the walkers.
    let sign = 1;
    for (const s of [1, -1]) {
      flap.rotation.y = (s * Math.PI) / 2;
      flap.updateMatrixWorld(true);
      const tip = flap.localToWorld(new THREE.Vector3(0.4, 0, 0));
      if ((tip.x - hinge.x) * best.dir.x + (tip.z - hinge.z) * best.dir.y > 0) sign = s;
    }
    flap.rotation.y = 0;
    this.gates.push({ flap, x: best.x, y: best.y, sign, open: 0 });
  }

  /** Free the GPU memory of everything this floor built itself (not the shared models). */
  dispose(): void {
    const geos = new Set<THREE.BufferGeometry>();
    const mats = new Set<THREE.Material>();
    for (const child of this.group.children) {
      if (this.shared.has(child)) continue;
      child.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        geos.add(m.geometry);
        (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => mats.add(x));
      });
    }
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
  }

  private addWalkwayEdges(level: LevelDef, game: Game): void {
    const mat = new THREE.MeshStandardMaterial({ color: level.look?.edge ?? PAL.walkwayEdge, roughness: 0.8 });
    const geoX = new THREE.BoxGeometry(1, 0.03, 0.06);
    const geoZ = new THREE.BoxGeometry(0.06, 0.03, 1);
    const ms: THREE.Matrix4[] = [];
    const msZ: THREE.Matrix4[] = [];
    const { w, h } = level.size;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!game.isPathTile(x, y)) continue;
        if (!game.isPathTile(x, y - 1) && y - 1 >= 0) ms.push(new THREE.Matrix4().makeTranslation(x + 0.5, 0.0, y + 0.03));
        if (!game.isPathTile(x, y + 1) && y + 1 < h) ms.push(new THREE.Matrix4().makeTranslation(x + 0.5, 0.0, y + 0.97));
        if (!game.isPathTile(x - 1, y) && x - 1 >= 0) msZ.push(new THREE.Matrix4().makeTranslation(x + 0.03, 0.0, y + 0.5));
        if (!game.isPathTile(x + 1, y) && x + 1 < w) msZ.push(new THREE.Matrix4().makeTranslation(x + 0.97, 0.0, y + 0.5));
      }
    }
    for (const [geo, list] of [
      [geoX, ms],
      [geoZ, msZ],
    ] as const) {
      const inst = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((mm, i) => inst.setMatrixAt(i, mm));
      inst.receiveShadow = true;
      this.group.add(inst);
    }
  }

  private wallAlongZ(x: number, len: number, doorsAt: number[], wallMat: THREE.Material, trimMat: THREE.Material): void {
    // Split the wall around every door gap (1 tile wide).
    const gaps = doorsAt.map((z) => [Math.floor(z), Math.floor(z) + 1] as const).sort((a, b) => a[0] - b[0]);
    let z0 = 0;
    const pieces: [number, number][] = [];
    for (const [a, b] of gaps) {
      if (a > z0) pieces.push([z0, a]);
      z0 = b;
    }
    if (z0 < len) pieces.push([z0, len]);
    for (const [a, b] of pieces) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H, b - a), wallMat);
      wall.position.set(x - WALL_T / 2, WALL_H / 2, (a + b) / 2);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(WALL_T + 0.02, 0.08, b - a), trimMat);
      trim.position.set(x - WALL_T / 2, 0.04, (a + b) / 2);
      this.group.add(trim);
    }
    // Lintel over each door.
    for (const [a, b] of gaps) {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(WALL_T, WALL_H - 1.55, b - a), wallMat);
      lintel.position.set(x - WALL_T / 2, 1.55 + (WALL_H - 1.55) / 2, (a + b) / 2);
      this.group.add(lintel);
    }
  }

  private wallAlongX(len: number, wallMat: THREE.Material, trimMat: THREE.Material, windowMat: THREE.Material): void {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len + WALL_T, WALL_H, WALL_T), wallMat);
    wall.position.set(len / 2 - WALL_T / 2, WALL_H / 2, -WALL_T / 2);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.group.add(wall);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(len + WALL_T, 0.08, WALL_T + 0.02), trimMat);
    trim.position.set(len / 2 - WALL_T / 2, 0.04, -WALL_T / 2);
    this.group.add(trim);
    for (let x = 1.5; x < len - 1; x += 3) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.02), windowMat);
      win.position.set(x + 0.5, 0.95, 0.005);
      this.group.add(win);
    }
  }
}

/** Yellow and grey diagonal stripes: floor paint for the queue. */
function stripes(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = '#6b6f78';
  x.fillRect(0, 0, 64, 64);
  x.strokeStyle = '#f2c641';
  x.lineWidth = 10;
  for (let i = -64; i <= 128; i += 32) {
    x.beginPath();
    x.moveTo(i, 64);
    x.lineTo(i + 64, 0);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
