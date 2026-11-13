// The card that says who a colleague is and what beats him. Short on purpose: what he does, what
// helps, and the towers that help. The long text and the numbers sit behind "More".

import type { ColleagueDef } from '../sim/data/colleagues';
import { TOWERS } from '../sim/data/towers';
import { h, icon, img } from './dom';
import { UI_TEXT as T } from './text';

/** Seconds left on a card that closes by itself. Real seconds, and nothing passes while paused. */
export function cardCountdown(left: number, dt: number, paused: boolean): number {
  if (left <= 0 || paused) return left;
  return Math.max(0, left - dt);
}

export interface CardOptions {
  /** Label at the top: "New colleague" or his role. */
  label: string;
  close(): void;
  /** Set when the game waits for the player: shows the "Got it" button. */
  gotIt?: () => void;
}

export function colleagueCard(def: ColleagueDef, opt: CardOptions): HTMLElement[] {
  const parts = buildCard(def, opt);
  return parts.filter((p): p is HTMLElement => p !== null);
}

function buildCard(def: ColleagueDef, opt: CardOptions): (HTMLElement | null)[] {
  const short = def.short ?? def.ability;
  const helps = def.helps ?? def.counter;
  const towers = (def.counters ?? []).filter((id) => TOWERS[id]);
  const details = h(
    'div',
    { class: 'card-details' },
    h('div', { class: 'quote wrap', text: `"${def.quote}"` }),
    h('div', { class: 'wrap', text: def.ability }),
    h('div', { class: 'counter wrap', text: def.counter }),
    h(
      'div',
      { class: 'kv' },
      h('span', { class: 'k', text: 'HP' }),
      h('span', { class: 'v', text: String(def.hp) }),
      def.shield ? h('span', { class: 'k shield-k', text: 'Shield' }) : null,
      def.shield ? h('span', { class: 'v shield-v', text: String(def.shield) }) : null,
      h('span', { class: 'k', text: 'Speed' }),
      h('span', { class: 'v', text: def.speed.toFixed(1) }),
      h('span', { class: 'k', text: T.cardFocus }),
      h('span', { class: 'v', text: String(def.focus) }),
    ),
  );
  details.hidden = true;
  const more = h('button', { class: 'btn small', text: T.cardMore });
  more.addEventListener('click', () => {
    details.hidden = !details.hidden;
    more.textContent = details.hidden ? T.cardMore : T.cardLess;
  });
  return [
    h('div', { class: 'section-head' }, h('span', { class: 'label', text: opt.label }), h('button', { class: 'icon-btn', title: 'Close', on: { click: opt.close } }, icon('xmark'))),
    h('div', { class: 'card-who' }, img(`icons/${def.model}.png`, def.name), h('div', { class: 'tp-name', text: def.name })),
    h('div', { class: 'card-does wrap', text: short }),
    h('div', { class: 'counter wrap', text: helps }),
    towers.length
      ? h(
          'div',
          { class: 'card-towers' },
          ...towers.map((id) => h('span', { class: 'card-tower', title: TOWERS[id].verb }, img(`icons/${TOWERS[id].models[0]}.png`, TOWERS[id].name), h('span', { text: TOWERS[id].name }))),
        )
      : null,
    details,
    h(
      'div',
      { class: 'row-buttons' },
      more,
      opt.gotIt ? h('button', { class: 'btn primary small', on: { click: opt.gotIt } }, h('span', { text: T.cardGotIt })) : null,
    ),
  ];
}
