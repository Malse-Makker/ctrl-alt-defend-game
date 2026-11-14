// Small icons over heads and towers that say what does not work. Pure: which icon goes where.
// The drawing is in src/render/badges.ts.

import { COLLEAGUES, type ColleagueDef } from '../sim/data/colleagues';
import { TOWERS, type TowerDef } from '../sim/data/towers';
import type { Game, IdleReason, Tower } from '../sim/game';
import { UI_TEXT as T } from './text';

/** Over a colleague: what he shrugs off, or why towers act strangely around him. */
export type ColleagueBadge = 'box' | 'hidden' | 'taunt';

/** Over a tower: why it is quiet (six reasons), or why it hits nothing (grey). */
export type TowerBadge = 'chat' | 'cry' | 'net' | 'phone' | 'audit' | 'mop' | 'idle-hidden' | 'idle-sight';

export function colleagueBadges(def: ColleagueDef, shield: number, revealed: boolean): ColleagueBadge[] {
  const out: ColleagueBadge[] = [];
  if (def.box && shield > 0) out.push('box');
  if (def.invisible && !revealed) out.push('hidden');
  if (def.taunt !== undefined) out.push('taunt');
  return out;
}

export function towerBadge(t: Pick<Tower, 'silenced' | 'quiet' | 'mopped' | 'idle'> & { def: Pick<TowerDef, 'damageClass'> }): TowerBadge | null {
  if (t.silenced && t.quiet) return t.quiet;
  if (t.mopped > 0) return 'mop';
  if (t.idle === 'hidden') return 'idle-hidden';
  if (t.idle === 'sight') return 'idle-sight';
  return null;
}

/** The status line at the top of the tower panel: the same icon as over the tower, and why. */
export interface TowerStatus {
  icon: string;
  tone: 'bad' | 'warn';
  text: string;
}

/** Font Awesome names for the badges over towers (the glyphs in src/render/badges.ts). */
const BADGE_ICON: Record<TowerBadge, string> = {
  chat: 'comment-slash',
  cry: 'droplet',
  net: 'wifi',
  phone: 'phone',
  audit: 'clipboard-list',
  mop: 'broom',
  'idle-hidden': 'eye-slash',
  'idle-sight': 'road-barrier',
};

const QUIET_NOTE: Record<NonNullable<Tower['quiet']>, string> = {
  chat: T.silencedNote,
  cry: T.hushedNote,
  net: T.offlineNote,
  phone: T.phoneNote,
  audit: T.auditNote,
};

/**
 * Why this tower is not doing its job, most pressing first: stopped outright, hitting nothing,
 * then the floor working against it (smoke, wifi, cold, dark). Null when it is fine.
 */
export function towerStatus(g: Pick<Game, 'rangeFactor' | 'slowWifi' | 'isCold' | 'isLit'>, t: Tower): TowerStatus | null {
  const badge = towerBadge(t);
  if (t.silenced) return { icon: BADGE_ICON[badge ?? 'chat'], tone: 'bad', text: QUIET_NOTE[t.quiet ?? 'chat'] };
  if (t.mopped > 0) return { icon: BADGE_ICON.mop, tone: 'bad', text: T.moppedNote };
  if (t.idle && badge) return { icon: BADGE_ICON[badge], tone: 'warn', text: idleNote(t.idle, COLLEAGUES[t.idleWho ?? '']?.name ?? '') };
  if (g.rangeFactor(t) < 1) return { icon: 'smog', tone: 'bad', text: T.smokedNote };
  if (g.slowWifi(t)) return { icon: 'wifi', tone: 'bad', text: T.wifiNote };
  if (g.isCold(t.tx, t.ty)) return { icon: 'snowflake', tone: 'bad', text: T.coldNote };
  if (!g.isLit(t.tx, t.ty) && t.def.role !== 'economy' && !t.def.base.global) return { icon: 'moon', tone: 'bad', text: T.darkNote };
  return null;
}

/** The line in the tower panel for a tower that hits nothing. */
export function idleNote(reason: IdleReason, name: string): string {
  if (reason === 'hidden') return T.idleHidden.replace('{name}', name);
  return T.idleSight;
}

/** A colleague with a rule of his own: plain numbers (fast, tough) need no hint. */
function isSpecial(def: ColleagueDef): boolean {
  return !!(def.box || def.invisible || def.silence || def.taunt !== undefined || def.pointResist || def.stunOnlyFrom);
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
