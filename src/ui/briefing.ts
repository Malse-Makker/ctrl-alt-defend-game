// The briefing before the day starts: only what is new. The clock does not run in the plan phase,
// so this is the one moment a player reads in peace.

import type { Briefing } from '../sim/briefing';
import { COLLEAGUES } from '../sim/data/colleagues';
import { TOWERS } from '../sim/data/towers';
import { h, icon, img } from './dom';
import { UI_TEXT as T } from './text';

export interface BriefingActions {
  close(): void;
  /** Never show this floor's briefing again. */
  hide(): void;
}

export function briefingHasNews(b: Briefing): boolean {
  return b.towers.length > 0 || b.colleagues.length > 0 || b.boss !== null || b.rule !== null;
}

function line(src: string, alt: string, name: string, text: string, need?: string): HTMLElement {
  return h(
    'div',
    { class: 'brief-line' },
    img(src, alt),
    h('div', {}, h('div', { class: 'brief-name', text: name }), h('div', { class: 'wrap', text }), need ? h('div', { class: 'brief-need wrap', text: need }) : null),
  );
}

export function briefingCard(levelName: string, b: Briefing, act: BriefingActions): HTMLElement[] {
  const out: HTMLElement[] = [
    h('div', { class: 'section-head' }, h('span', { class: 'label', text: `${T.briefing}: ${levelName}` }), h('button', { class: 'icon-btn', title: 'Close', on: { click: act.close } }, icon('xmark'))),
  ];
  if (b.towers.length) {
    out.push(h('div', { class: 'brief-head', text: T.briefNewDesk }));
    for (const id of b.towers) {
      const d = TOWERS[id];
      out.push(line(`icons/${d.models[0]}.png`, d.name, d.name, d.short));
    }
  }
  if (b.colleagues.length) {
    out.push(h('div', { class: 'brief-head', text: T.briefNewFloor }));
    for (const id of b.colleagues) {
      const c = COLLEAGUES[id];
      const needs = (c.counters ?? []).map((t) => TOWERS[t]?.name).filter(Boolean);
      out.push(line(`icons/${c.model}.png`, c.name, c.name, c.short ?? c.ability, needs.length ? `${T.briefNeeds} ${needs.join(', ')}` : undefined));
    }
  }
  if (b.rule) {
    out.push(h('div', { class: 'brief-head', text: T.briefThisFloor }));
    out.push(h('div', { class: 'wrap brief-rule', text: b.rule }));
  }
  if (b.boss) {
    const c = COLLEAGUES[b.boss];
    out.push(h('div', { class: 'brief-head', text: T.briefBoss }));
    out.push(line(`icons/${c.model}.png`, c.name, c.name, c.boss?.intro ?? c.short ?? c.ability));
  }
  out.push(
    h(
      'div',
      { class: 'row-buttons' },
      h('button', { class: 'btn small', on: { click: act.hide } }, h('span', { text: T.briefHide })),
      h('button', { class: 'btn primary small', on: { click: act.close } }, h('span', { text: T.briefOk })),
    ),
  );
  return out;
}
