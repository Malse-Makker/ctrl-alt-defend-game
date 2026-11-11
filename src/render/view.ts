// Three.js setup: renderer, isometric orthographic camera, lights, picking and projection.
// World axes: simulation x -> Three X, simulation y -> Three Z, height is Y. 1 tile = 1 unit.

import * as THREE from 'three';

export interface Insets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const ELEVATION = THREE.MathUtils.degToRad(35.264);
const AZIMUTH = THREE.MathUtils.degToRad(45);
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 3.2;

export class View {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  readonly sun: THREE.DirectionalLight;

  private readonly dir: THREE.Vector3;
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private focus = new THREE.Vector3();
  private baseFocus = new THREE.Vector3();
  private scale = 0.02;
  private baseScale = 0.02;
  private zoom = 1;
  private bounds = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 1, 10));
  private insets: Insets = { left: 0, right: 0, top: 0, bottom: 0 };
  private width = 1;
  private height = 1;
  private readonly raycaster = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly tmp = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    this.dir = new THREE.Vector3(Math.cos(ELEVATION) * Math.sin(AZIMUTH), Math.sin(ELEVATION), Math.cos(ELEVATION) * Math.cos(AZIMUTH)).normalize();
    this.right.crossVectors(new THREE.Vector3(0, 1, 0), this.dir).normalize();
    this.up.crossVectors(this.dir, this.right).normalize();

    const hemi = new THREE.HemisphereLight(0xe4ebf5, 0x8a8f99, 2.5);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight(0xfff3e2, 3.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
  }

  /** The area the camera has to keep in view: the floor plus the wall height. */
  setBounds(w: number, h: number, height = 1.7): void {
    this.bounds = new THREE.Box3(new THREE.Vector3(-0.3, 0, -0.3), new THREE.Vector3(w + 0.3, height, h + 0.3));
    const cx = w / 2;
    const cz = h / 2;
    const span = Math.max(w, h);
    this.sun.position.set(cx - span * 0.35, span * 0.9, cz - span * 0.15);
    this.sun.target.position.set(cx, 0, cz);
    const cam = this.sun.shadow.camera;
    cam.left = -span * 0.85;
    cam.right = span * 0.85;
    cam.top = span * 0.85;
    cam.bottom = -span * 0.85;
    cam.near = 0.5;
    cam.far = span * 3;
    cam.updateProjectionMatrix();
    this.fit();
  }

  setInsets(i: Insets): void {
    this.insets = i;
    this.fit();
  }

  resize(w: number, h: number): void {
    this.width = Math.max(1, w);
    this.height = Math.max(1, h);
    this.renderer.setSize(this.width, this.height, false);
    this.fit();
  }

  /** Fit the map into the free screen area between the UI panels, keeping zoom and pan relative. */
  fit(): void {
    const corners: THREE.Vector3[] = [];
    const b = this.bounds;
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) corners.push(new THREE.Vector3(x, y, z));
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const c of corners) {
      const u = c.dot(this.right);
      const v = c.dot(this.up);
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    const availW = Math.max(120, this.width - this.insets.left - this.insets.right - 24);
    const availH = Math.max(120, this.height - this.insets.top - this.insets.bottom - 24);
    const s = Math.max((maxU - minU) / availW, (maxV - minV) / availH);
    const centerU = (minU + maxU) / 2;
    const centerV = (minV + maxV) / 2;
    const dx = (this.insets.left - this.insets.right) / 2;
    const dy = (this.insets.top - this.insets.bottom) / 2;
    const prevBaseFocus = this.baseFocus.clone();
    this.baseScale = s;
    this.baseFocus = new THREE.Vector3()
      .addScaledVector(this.right, centerU - dx * s)
      .addScaledVector(this.up, centerV + dy * s);
    // Keep the player's pan offset when the layout changes.
    const offset = this.focus.clone().sub(prevBaseFocus);
    this.focus = this.baseFocus.clone().add(prevBaseFocus.lengthSq() === 0 ? new THREE.Vector3() : offset);
    this.apply();
  }

  resetView(): void {
    this.zoom = 1;
    this.focus = this.baseFocus.clone();
    this.apply();
  }

  zoomAt(factor: number, px: number, py: number): void {
    const before = this.viewPoint(px, py);
    this.zoom = THREE.MathUtils.clamp(this.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    this.apply();
    const after = this.viewPoint(px, py);
    this.focus.add(before.sub(after));
    this.clampFocus();
    this.apply();
  }

  panBy(dxPx: number, dyPx: number): void {
    this.focus.addScaledVector(this.right, -dxPx * this.scale).addScaledVector(this.up, dyPx * this.scale);
    this.clampFocus();
    this.apply();
  }

  private clampFocus(): void {
    // Never let the office leave the screen: limit the pan to the map's own size.
    const off = this.focus.clone().sub(this.baseFocus);
    const size = this.bounds.getSize(this.tmp).length() * 0.5;
    const u = THREE.MathUtils.clamp(off.dot(this.right), -size, size);
    const v = THREE.MathUtils.clamp(off.dot(this.up), -size, size);
    this.focus = this.baseFocus.clone().addScaledVector(this.right, u).addScaledVector(this.up, v);
  }

  /** World point on the view plane under a pixel (for zooming around the cursor). */
  private viewPoint(px: number, py: number): THREE.Vector3 {
    const u = (px - this.width / 2) * this.scale;
    const v = -(py - this.height / 2) * this.scale;
    return this.focus.clone().addScaledVector(this.right, u).addScaledVector(this.up, v);
  }

  private apply(): void {
    this.scale = this.baseScale / this.zoom;
    const hw = (this.width / 2) * this.scale;
    const hh = (this.height / 2) * this.scale;
    this.camera.left = -hw;
    this.camera.right = hw;
    this.camera.top = hh;
    this.camera.bottom = -hh;
    this.camera.position.copy(this.focus).addScaledVector(this.dir, 80);
    this.camera.up.copy(this.up);
    this.camera.lookAt(this.focus);
    this.camera.near = 0.1;
    this.camera.far = 200;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  /** Screen-right as a world direction. */
  get screenRight(): THREE.Vector3 {
    return this.right.clone();
  }

  /** Pixels per world unit at the current zoom. */
  get pixelsPerUnit(): number {
    return 1 / this.scale;
  }

  /** Ground point (simulation coordinates) under a screen pixel, or on a level `height` above it. */
  groundAt(px: number, py: number, height = 0): { x: number; y: number } | null {
    const ndc = new THREE.Vector2((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    this.ground.constant = -height;
    const hit = this.raycaster.ray.intersectPlane(this.ground, this.tmp);
    this.ground.constant = 0;
    if (!hit) return null;
    return { x: hit.x, y: hit.z };
  }

  /** Screen pixel of a world point (simulation x, y and height). */
  project(x: number, y: number, height: number): { sx: number; sy: number } {
    this.tmp.set(x, height, y).project(this.camera);
    return { sx: (this.tmp.x + 1) * 0.5 * this.width, sy: (1 - this.tmp.y) * 0.5 * this.height };
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
