// Loads the Blender models (public/models/*.glb). Every model is loaded once and cloned per use;
// clones share geometry and materials, so a floor full of Interns costs one Intern in memory.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TOWERS, towerParts } from '../sim/data/towers';

export const MODEL_NAMES = [
  'intern',
  'newhire',
  'requester',
  'chaser',
  'headofcomms',
  'desk_pair',
  'plant',
  'cooler',
  'printer',
  'player_desk',
  'door',
  'chatterbox',
  'oldguard',
  'boardmember',
  'repairguy',
  'coffee_bar',
  'vending',
  'presenter',
  'projector_screen',
  'meeting_table',
  'impersonator',
  'cleaner',
  'food_counter',
  'canteen_table',
  'wet_floor',
  'fridge',
  'kitchen_counter',
  'high_table',
  'kitchen_table',
  'recycle_bins',
  'keyboard_barrier',
  'linemanager',
  'boardroom_table',
  'sideboard',
  'coldcaller',
  'baby',
  'sofa',
  'tv_stand',
  'bed',
  'bookshelf',
  'cat',
  'phonecaller',
  'smoker',
  'car',
  'van',
  'ticket_machine',
  'lamp_post',
  'glass_front',
  'glass_doors',
  'waiting_bench',
  'brochure_rack',
  'mail_slots',
  'coat_stand',
  'glass_partition',
  'lounge_wide',
  'lounge_square',
  'pillar',
  'logo_wall',
  'speed_gate',
  'lifts',
  'reception_desk',
  'security_post',
  'sculpture',
  'planter_big',
  'counter',
  'counter_sink',
  'counter_coffee',
  'counter_microwave',
  'counter_hob',
  'tall_cabinet',
  'dining_table',
  'kitchen_chair',
  'bar_table',
  'bar_stool',
  'window_bar',
  'beamer',
  'speaker',
  'whiteboard',
  'conference_table',
  'conference_chair',
  'chair_stack',
  'canteen_long',
  'salad_bar',
  'serving_counter',
  'floor_lamp',
  'trophy_cabinet',
  'nightstand',
  'wardrobe',
  'laundry_basket',
  'armchair',
  'coffee_table',
  'file_boxes',
  'car_long_blue',
  'car_long_red',
  'car_long_white',
  'van_long',
  'stairwell',
  'garage_lift',
  'tomato_shell',
  'flex_desk',
  'lockers',
  'phone_booth',
  'desk_phone',
  'reserved_sign',
  'tribune_step',
  'auditorium_seats',
  'control_desk',
  'tv_camera',
  'stage_screen',
  'glass_blinds',
  'consultant',
  'pingpong_table',
  'beanbag',
  'neon_sign',
  'moving_boxes',
  'hrmanager',
  'filing_cabinet',
  'safe',
  'complaint_box',
  'one_way_mirror',
  'server_rack',
  'server_cart',
  'cable_reel',
  'floor_cables',
  'noc_wall',
  'projectmanager',
  'finalreview',
  'lamp_desk',
  'pizza_boxes',
  'pizza',
  // Every tower's 13 parts (core, modules, heroes): src/sim/data/towers.ts, towerParts().
  ...Object.values(TOWERS).flatMap((def) => towerParts(def)),
];

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
