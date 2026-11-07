// The static office: floor, walkway, walls, door, furniture and your desk.

import * as THREE from 'three';
import type { LevelDef } from '../sim/data/levels';
import type { Game } from '../sim/game';
import type { Assets } from './assets';
import { PAL } from './palette';

const WALL_H = 1.6;
const WALL_T = 0.16;

export class World {
  readonly group = new THREE.Group();
  /** Tiles you could build on, drawn while placing a tower. */
  readonly buildGrid: THREE.InstancedMesh;
  readonly deskPos: THREE.Vector3;
  /** Asset clones share geometry with the loaded models and must survive a retry. */
  private readonly shared = new Set<THREE.Object3D>();

  constructor(level: LevelDef, game: Game, assets: Assets, me = 0) {
    const { w, h } = level.size;
    const g = this.group;

    // Floor slab and carpet tiles (checkered, two greys).
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, h + 0.4), new THREE.MeshStandardMaterial({ color: PAL.slab, roughness: 0.9 }));
    slab.position.set(w / 2, -0.35, h / 2);
    slab.receiveShadow = true;
    g.add(slab);

    const tileGeo = new THREE.BoxGeometry(1, 0.1, 1);
    const carpetA = new THREE.MeshStandardMaterial({ color: PAL.carpet, roughness: 0.95 });
    const carpetB = new THREE.MeshStandardMaterial({ color: PAL.carpetDark, roughness: 0.95 });
    const walkMat = new THREE.MeshStandardMaterial({ color: PAL.walkway, roughness: 0.8 });
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
    const wallMat = new THREE.MeshStandardMaterial({ color: PAL.wall, roughness: 0.9 });
    const trimMat = new THREE.MeshStandardMaterial({ color: PAL.wallTrim, roughness: 0.9 });
    const windowMat = new THREE.MeshStandardMaterial({ color: PAL.window, roughness: 0.2, emissive: new THREE.Color(PAL.window), emissiveIntensity: 0.25 });
    const doors = level.paths.map((p) => p[0]).filter((p) => p.x < 0).map((p) => p.y);
    this.wallAlongZ(0, h, doors, wallMat, trimMat);
    this.wallAlongX(w, wallMat, trimMat, windowMat);
    for (const dz of doors) {
      const door = assets.clone('door');
      door.position.set(-WALL_T / 2, 0, dz);
      door.rotation.y = Math.PI / 2;
      this.shared.add(door);
      g.add(door);
    }

    for (const d of level.decor) {
      const obj = assets.clone(d.model);
      obj.position.set(d.rect.x + d.rect.w / 2, 0, d.rect.y + d.rect.h / 2);
      obj.rotation.y = ((d.turn ?? 0) * Math.PI) / 2;
      this.shared.add(obj);
      g.add(obj);
    }

    const desk = assets.clone('player_desk');
    this.deskPos = new THREE.Vector3(level.desk.x + 0.5, 0, level.desk.y + 0.5);
    desk.position.copy(this.deskPos);
    const last = level.paths[0][level.paths[0].length - 1];
    const prev = level.paths[0][level.paths[0].length - 2];
    // The chair faces the arriving colleagues: they walk up behind you while you work.
    desk.rotation.y = Math.atan2(-(last.x - prev.x), -(last.y - prev.y));
    this.shared.add(desk);
    g.add(desk);

    // Build grid (hidden until a tower is picked).
    const gridMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false });
    const gridGeo = new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2);
    const free: { x: number; y: number }[] = [];
    // Only the tiles this player may build on (multiplayer zones), so the grid shows your patch.
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!game.isPathTile(x, y) && !game.isBlockedTile(x, y) && game.mayBuildAt(me, x, y)) free.push({ x, y });
    this.buildGrid = new THREE.InstancedMesh(gridGeo, gridMat, free.length);
    const m = new THREE.Matrix4();
    free.forEach((c, i) => {
      m.makeTranslation(c.x + 0.5, 0.006, c.y + 0.5);
      this.buildGrid.setMatrixAt(i, m);
    });
    this.buildGrid.visible = false;
    g.add(this.buildGrid);
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
    const mat = new THREE.MeshStandardMaterial({ color: PAL.walkwayEdge, roughness: 0.8 });
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
