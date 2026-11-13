// Small icons over heads and towers that say what does not work. Pure: which icon goes where.
// The drawing is in src/render/badges.ts.

import { COLLEAGUES, type ColleagueDef } from '../sim/data/colleagues';
import { TOWERS, type DamageClass, type TowerDef } from '../sim/data/towers';
import type { Game, IdleReason, Tower } from '../sim/game';
import { UI_TEXT as T } from './text';

/** Over a colleague: what he shrugs off, or why towers act strangely around him. */
export type ColleagueBadge = 'no-digital' | 'no-physical' | 'box' | 'hidden' | 'taunt';

/** Over a tower: why it is quiet (six reasons), or why it hits nothing (grey). */
export type TowerBadge = 'chat' | 'cry' | 'net' | 'phone' | 'audit' | 'mop' | 'idle-digital' | 'idle-physical' | 'idle-hidden' | 'idle-sight';

export function colleagueBadges(def: ColleagueDef, shield: number, revealed: boolean): ColleagueBadge[] {
  const out: ColleagueBadge[] = [];
  if (def.immune === 'digital') out.push('no-digital');
  if (def.immune === 'physical') out.push('no-physical');
  if (def.shieldMinHit !== undefined && shield > 0) out.push('box');
  if (def.invisible && !revealed) out.push('hidden');
  if (def.taunt !== undefined) out.push('taunt');
  return out;
}

export function towerBadge(t: Pick<Tower, 'silenced' | 'quiet' | 'mopped' | 'idle'> & { def: Pick<TowerDef, 'damageClass'> }): TowerBadge | null {
  if (t.silenced && t.quiet) return t.quiet;
  if (t.mopped > 0) return 'mop';
  if (t.idle === 'immune') return t.def.damageClass === 'physical' ? 'idle-physical' : 'idle-digital';
  if (t.idle === 'hidden') return 'idle-hidden';
  if (t.idle === 'sight') return 'idle-sight';
  return null;
}

/** The line in the tower panel for a tower that hits nothing. */
export function idleNote(reason: IdleReason, cls: DamageClass | undefined, name: string): string {
  if (reason === 'immune') return (cls === 'digital' ? T.idleDigital : T.idlePhysical).replace('{name}', name);
  if (reason === 'hidden') return T.idleHidden.replace('{name}', name);
  return T.idleSight;
}

/** A colleague with a rule of his own: plain numbers (fast, tough) need no hint. */
function isSpecial(def: ColleagueDef): boolean {
  return !!(def.immune || def.shieldMinHit !== undefined || def.invisible || def.silence || def.taunt !== undefined || def.pointResist || def.stunOnlyFrom);
}

/**
 * A colleague with a counter reached your desk and nothing on the floor answers him: say what
 * would, once per colleague per round. Not to a player who is already losing (under a quarter
 * of their Focus), and not with tips off.
 */
export function leakHint(g: Pick<Game, 'towers' | 'level' | 'focus' | 'startFocus'>, type: string, done: ReadonlySet<string>, tips: boolean): string | null {
  const def = COLLEAGUES[type];
  if (!tips || !def || def.boss || !def.counters?.length || !isSpecial(def) || done.has(type)) return null;
  if (g.focus < g.startFocus * 0.25) return null;
  if (g.towers.some((t) => def.counters!.includes(t.defId))) return null;
  const can = def.counters.filter((id) => TOWERS[id] && g.level.towers.includes(id));
  if (can.length === 0) return null;
  const names = can.map((id) => TOWERS[id].name);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
  return T.leakHint.replace('{name}', def.name).replace('{towers}', list);
}
