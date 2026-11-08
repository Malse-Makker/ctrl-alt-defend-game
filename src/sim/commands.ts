// Every action a player can take, as plain data. The single-player session and the multiplayer
// server both run them through applyCommand, so both check exactly the same rules.

import { TARGET_MODES, type TargetMode } from './data/towers';
import type { Check, Game } from './game';

export type Command =
  | { c: 'place'; def: string; tx: number; ty: number }
  | { c: 'upgrade'; id: number; path: number }
  | { c: 'sell'; id: number }
  | { c: 'claim'; id: number }
  | { c: 'target'; id: number; mode: TargetMode }
  | { c: 'dir'; id: number; dir: number }
  | { c: 'gift'; to: number; amount: number }
  | { c: 'next' }
  | { c: 'solve' };

const int = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;

/** Check the shape of a command that came in over the network. Returns null if it is junk. */
export function parseCommand(raw: unknown): Command | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  switch (o.c) {
    case 'place':
      return typeof o.def === 'string' && o.def.length <= 24 && int(o.tx, 0, 200) && int(o.ty, 0, 200) ? { c: 'place', def: o.def, tx: o.tx, ty: o.ty } : null;
    case 'upgrade':
      return int(o.id, 1, 1e9) && int(o.path, 0, 2) ? { c: 'upgrade', id: o.id, path: o.path } : null;
    case 'sell':
    case 'claim':
      return int(o.id, 1, 1e9) ? { c: o.c, id: o.id } : null;
    case 'target':
      return int(o.id, 1, 1e9) && TARGET_MODES.includes(o.mode as TargetMode) ? { c: 'target', id: o.id, mode: o.mode as TargetMode } : null;
    case 'dir':
      return int(o.id, 1, 1e9) && int(o.dir, 0, 3) ? { c: 'dir', id: o.id, dir: o.dir } : null;
    case 'gift':
      return int(o.to, 0, 7) && int(o.amount, 1, 1e6) ? { c: 'gift', to: o.to, amount: o.amount } : null;
    case 'next':
      return { c: 'next' };
    case 'solve':
      return { c: 'solve' };
    default:
      return null;
  }
}

export function applyCommand(game: Game, player: number, cmd: Command): Check {
  switch (cmd.c) {
    case 'place':
      return game.place(cmd.def, cmd.tx, cmd.ty, player);
    case 'upgrade':
      return game.upgrade(cmd.id, cmd.path, player);
    case 'sell':
      return game.sell(cmd.id, player);
    case 'claim':
      return game.claim(cmd.id, player);
    case 'target': {
      const t = game.tower(cmd.id);
      if (!t) return { ok: false, reason: 'No such tower.' };
      if (!game.canControl(t, player)) return { ok: false, reason: 'That is not your tower.' };
      game.setTargeting(cmd.id, cmd.mode, player);
      return { ok: true };
    }
    case 'dir':
      return game.setDir(cmd.id, cmd.dir, player);
    case 'gift':
      return game.gift(player, cmd.to, cmd.amount);
    case 'next':
      return game.callNextWave() ? { ok: true } : { ok: false, reason: 'No more waves to call.' };
    case 'solve':
      return game.solveHazard(player);
  }
}
