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
  'thumbtacks_1',
  'thumbtacks_2',
  'thumbtacks_3',
  'selfservice_1',
  'selfservice_2',
  'selfservice_3',
  'impersonator',
  'cleaner',
  'food_counter',
  'canteen_table',
  'wet_floor',
  'shredder_p0_3',
  'shredder_p0_4',
  'shredder_p1_3',
  'shredder_p1_4',
  'shredder_p2_3',
  'shredder_p2_4',
  'fridge',
  'kitchen_counter',
  'high_table',
  'kitchen_table',
  'recycle_bins',
  'keyboardsmash_1',
  'keyboardsmash_2',
  'keyboardsmash_3',
  'chair_1',
  'chair_2',
  'chair_3',
  'keyboard_barrier',
  'linemanager',
  'boardroom_table',
  'sideboard',
  'replyall_1',
  'replyall_2',
  'replyall_3',
  'coldcaller',
  'baby',
  'sofa',
  'tv_stand',
  'bed',
  'bookshelf',
  'cat',
  'delegation_1',
  'delegation_2',
  'delegation_3',
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
  'pomodoro_1',
  'pomodoro_2',
  'pomodoro_3',
  'tomato_shell',
  'flex_desk',
  'lockers',
  'phone_booth',
  'desk_phone',
  'reserved_sign',
  'poster_1',
  'poster_2',
  'poster_3',
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
