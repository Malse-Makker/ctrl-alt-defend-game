// "Who is who": every colleague you have met and every tower, with what helps against whom.
// Reachable from the career screen and the pause menu, so the counter is there between levels too.

import { COLLEAGUES, type ColleagueDef } from '../sim/data/colleagues';
import { LEVELS } from '../sim/data/levels';
import { TOWERS, type TowerDef } from '../sim/data/towers';
import { firstLevelOf, typesIn } from '../sim/briefing';
import { colleagueBadges, type ColleagueBadge } from './badges';
import { h, icon, img } from './dom';
import { UI_TEXT as T } from './text';

export interface ColleagueEntry {
  def: ColleagueDef;
  seen: boolean;
  /** Floors whose waves bring him in. */
  floors: number[];
  first: number | null;
}

/** Every colleague, in the order you meet them, bosses at the end of their floor. */
export function colleagueEntries(seen: readonly string[]): ColleagueEntry[] {
  const ids = Object.keys(LEVELS)
    .map(Number)
    .sort((a, b) => a - b);
  const floors = new Map<string, number[]>();
  for (const id of ids) for (const t of typesIn(id)) floors.set(t, [...(floors.get(t) ?? []), id]);
  return Object.values(COLLEAGUES)
    .filter((c) => floors.has(c.id))
    .map((def) => ({ def, seen: seen.includes(def.id), floors: floors.get(def.id) ?? [], first: firstLevelOf(def.id) }))
    .sort((a, b) => (a.first ?? 99) - (b.first ?? 99) || Number(!!a.def.boss) - Number(!!b.def.boss));
}

/** 2, 3, 4, 5, 7 reads as "2 to 5, 7". */
export function floorList(floors: number[]): string {
  const runs: string[] = [];
  let i = 0;
  while (i < floors.length) {
    let j = i;
    while (j + 1 < floors.length && floors[j + 1] === floors[j] + 1) j++;
    runs.push(j - i >= 2 ? `${floors[i]} to ${floors[j]}` : floors.slice(i, j + 1).join(', '));
    i = j + 1;
  }
  return runs.join(', ');
}

/** The colleagues a tower is a named answer to. */
export function goodAgainst(towerId: string): ColleagueDef[] {
  return Object.values(COLLEAGUES).filter((c) => !c.boss && c.counters?.includes(towerId));
}

const BADGE_GLYPH: Record<ColleagueBadge, { icon: string; cross: boolean; help: string }> = {
  'no-digital': { icon: 'laptop', cross: true, help: T.badgeNoDigital },
  'no-physical': { icon: 'hand', cross: true, help: T.badgeNoPhysical },
  box: { icon: 'box', cross: false, help: T.badgeBox },
  hidden: { icon: 'eye-slash', cross: false, help: T.badgeHidden },
  taunt: { icon: 'exclamation', cross: false, help: T.badgeTaunt },
};

/** The icons from over their heads, small, for lists and cards. */
export function badgeIcons(def: ColleagueDef): HTMLElement | null {
  const kinds = colleagueBadges(def, def.shield ?? 0, false);
  if (kinds.length === 0) return null;
  return h(
    'span',
    { class: 'cbadges' },
    ...kinds.map((k) => h('span', { class: `cbadge ${k}${BADGE_GLYPH[k].cross ? ' cross' : ''}`, title: BADGE_GLYPH[k].help }, icon(BADGE_GLYPH[k].icon))),
  );
}

function towerChip(def: TowerDef): HTMLElement {
  return h('span', { class: 'card-tower', title: def.short }, img(`icons/${def.models[0]}.png`, def.name), h('span', { text: def.name }));
}

function colleagueRow(e: ColleagueEntry): HTMLElement {
  if (!e.seen) {
    return h(
      'div',
      { class: 'alm-row unseen' },
      img(`icons/${e.def.model}.png`, ''),
      h('div', {}, h('div', { class: 'tp-name', text: T.almanacUnseen }), h('div', { class: 'faint', text: e.first ? T.almanacFirst.replace('{n}', String(e.first)) : '' })),
    );
  }
  const counters = (e.def.counters ?? []).filter((id) => TOWERS[id]).map((id) => TOWERS[id]);
  return h(
    'div',
    { class: 'alm-row' },
    img(`icons/${e.def.model}.png`, e.def.name),
    h(
      'div',
      { class: 'alm-body' },
      h('div', { class: 'alm-title' }, h('span', { class: 'tp-name', text: e.def.name }), badgeIcons(e.def)),
      h('div', { class: 'wrap', text: e.def.boss ? e.def.boss.intro : (e.def.short ?? e.def.ability) }),
      h('div', { class: 'counter wrap', text: e.def.helps ?? e.def.counter }),
      counters.length ? h('div', { class: 'card-towers' }, ...counters.map(towerChip)) : null,
      h('div', { class: 'faint', text: `${T.almanacFloors}: ${floorList(e.floors)}` }),
    ),
  );
}

function towerRow(def: TowerDef, seen: readonly string[], open: boolean): HTMLElement {
  if (!open) {
    return h(
      'div',
      { class: 'alm-row unseen' },
      img(`icons/${def.models[0]}.png`, ''),
      h('div', {}, h('div', { class: 'tp-name', text: def.name }), h('div', { class: 'faint', text: `${T.lockedAt} ${def.unlockLevel}` })),
    );
  }
  const good = goodAgainst(def.id).filter((c) => seen.includes(c.id));
  return h(
    'div',
    { class: 'alm-row' },
    img(`icons/${def.models[0]}.png`, def.name),
    h(
      'div',
      { class: 'alm-body' },
      h('div', { class: 'alm-title' }, h('span', { class: 'tp-name', text: def.name }), def.damageClass ? h('span', { class: `dmg-class ${def.damageClass}` }, icon(def.damageClass === 'digital' ? 'laptop' : 'hand'), ` ${def.damageClass === 'digital' ? T.digital : T.physical}`) : null),
      h('div', { class: 'wrap', text: def.verb }),
      good.length ? h('div', { class: 'counter wrap', text: `${T.shopInfoGood}: ${good.map((c) => c.name).join(', ')}` }) : null,
    ),
  );
}

/** The page body: two tabs, colleagues first. `highest` is the highest floor you may play. */
export function almanacBody(seen: readonly string[], highest: number): HTMLElement {
  const list = h('div', { class: 'alm-list' });
  const tabs = h('div', { class: 'targets alm-tabs', attrs: { role: 'tablist' } });
  const buttons = new Map<string, HTMLElement>();
  const show = (which: 'colleagues' | 'towers') => {
    for (const [key, b] of buttons) {
      b.classList.toggle('active', key === which);
      b.setAttribute('aria-selected', String(key === which));
    }
    if (which === 'colleagues') list.replaceChildren(...colleagueEntries(seen).map(colleagueRow));
    else list.replaceChildren(...Object.values(TOWERS).sort((a, b) => a.unlockLevel - b.unlockLevel).map((d) => towerRow(d, seen, d.unlockLevel <= highest)));
  };
  for (const [key, label] of [
    ['colleagues', T.almanacColleagues],
    ['towers', T.almanacTowers],
  ] as const) {
    const b = h('button', { class: 'btn', text: label, attrs: { role: 'tab' }, on: { click: () => show(key) } });
    buttons.set(key, b);
    tabs.append(b);
  }
  show('colleagues');
  return h('div', { class: 'almanac' }, h('div', { class: 'muted wrap', text: T.almanacIntro }), tabs, list);
}
