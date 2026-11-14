// What each tower throws, so you can tell from the shots who is firing at whom. Pure: the meshes
// are built in actors.ts from these looks.

export type ProjectileKind = 'envelope' | 'bubble' | 'ticket' | 'pinkmail' | 'folder' | 'staple';

const BY_TOWER: Record<string, ProjectileKind> = {
  autoreply: 'envelope',
  quickreply: 'bubble',
  selfservice: 'ticket',
  replyall: 'pinkmail',
  delegation: 'folder',
  artillery: 'staple',
};

export function projectileFor(defId: string | undefined): ProjectileKind {
  return (defId && BY_TOWER[defId]) || 'envelope';
}

/** Body and trim colour, size (x, y, z) of each kind. */
export const PROJECTILE_LOOK: Record<ProjectileKind, { body: string; trim: string | null; size: [number, number, number] }> = {
  envelope: { body: '#f6f3ea', trim: '#3e7cc9', size: [0.2, 0.02, 0.13] },
  bubble: { body: '#ffffff', trim: '#8fa0b4', size: [0.14, 0.04, 0.09] },
  ticket: { body: '#3fa7a0', trim: '#f6f3ea', size: [0.1, 0.012, 0.16] },
  pinkmail: { body: '#e2557a', trim: '#ffffff', size: [0.2, 0.02, 0.13] },
  folder: { body: '#f2c641', trim: '#d9a05b', size: [0.18, 0.03, 0.14] },
  staple: { body: '#c8ccd2', trim: null, size: [0.22, 0.04, 0.05] },
};
