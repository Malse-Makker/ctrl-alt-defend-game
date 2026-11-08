// Loads the Blender models (public/models/*.glb). Every model is loaded once and cloned per use;
// clones share geometry and materials, so a floor full of Interns costs one Intern in memory.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const MODEL_NAMES = [
  'intern',
  'newhire',
  'requester',
  'chaser',
  'headofcomms',
  'coffee_1',
  'coffee_2',
  'coffee_3',
  'autoreply_1',
  'autoreply_2',
  'autoreply_3',
  'desk_pair',
  'plant',
  'cooler',
  'printer',
  'player_desk',
  'door',
  'headphones_1',
  'headphones_2',
  'headphones_3',
  'artillery_1',
  'artillery_2',
  'artillery_3',
  'shredder_1',
  'shredder_2',
  'shredder_3',
  'chatterbox',
  'oldguard',
  'boardmember',
  'repairguy',
  'coffee_bar',
  'vending',
  'quickreply_1',
  'quickreply_2',
  'quickreply_3',
  'presenter',
  'projector_screen',
  'meeting_table',
] as const;

export class Assets {
  private readonly models = new Map<string, THREE.Object3D>();
  readonly failed: string[] = [];

  async load(onProgress?: (done: number, total: number) => void): Promise<void> {
    const loader = new GLTFLoader();
    let done = 0;
    await Promise.all(
      MODEL_NAMES.map(async (name) => {
        try {
          const gltf = await loader.loadAsync(`models/${name}.glb`);
          const root = gltf.scene;
          root.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh) {
              m.castShadow = true;
              m.receiveShadow = true;
            }
          });
          this.models.set(name, root);
        } catch (err) {
          console.error(`Model ${name} did not load`, err);
          this.failed.push(name);
        } finally {
          done++;
          onProgress?.(done, MODEL_NAMES.length);
        }
      }),
    );
  }

  /** A fresh copy of a model. Missing models become a grey box, so the game still runs. */
  clone(name: string): THREE.Object3D {
    const src = this.models.get(name);
    if (src) return src.clone(true);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), new THREE.MeshStandardMaterial({ color: 0x888888 }));
    box.position.y = 0.4;
    const g = new THREE.Group();
    g.add(box);
    return g;
  }

  /** A see-through copy for the placement preview. Materials are cloned so the real ones stay solid. */
  ghost(name: string): THREE.Object3D {
    const obj = this.clone(name);
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const cloned = mats.map((mat) => {
        const c = (mat as THREE.MeshStandardMaterial).clone();
        c.transparent = true;
        c.opacity = 0.55;
        c.depthWrite = false;
        return c;
      });
      m.material = Array.isArray(m.material) ? cloned : cloned[0];
      m.castShadow = false;
    });
    return obj;
  }
}

/** Find a named child (Blender may add ".001" suffixes). */
export function part(root: THREE.Object3D, name: string): THREE.Object3D | undefined {
  let found: THREE.Object3D | undefined;
  root.traverse((o) => {
    if (!found && (o.name === name || o.name.startsWith(name + '.') || o.name.startsWith(name + '_'))) found = o;
  });
  return found;
}
