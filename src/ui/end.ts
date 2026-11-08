// End of round: what happened, WHAT HURT YOU (sorted by Focus lost, not by count), your towers,
// and the feedback form with one button. Reached by winning, burning out, or Give up.

import { COLLEAGUES } from '../sim/data/colleagues';
import type { Game } from '../sim/game';
import type { LevelResult } from '../meta/save';
import { sendFeedback, type RoundSummary } from '../net/api';
import { h, icon, img } from './dom';
import { UI_TEXT as T } from './text';

export interface EndActions {
  retry(): void;
  career(): void;
}

export function endScreen(game: Game, summary: RoundSummary, result: LevelResult | null, act: EndActions): HTMLElement {
  const reason = game.endReason ?? 'gaveup';
  const title = reason === 'won' ? T.endWon : reason === 'burnout' ? T.endBurnout : T.endGaveUp;
  const sub = reason === 'won' ? T.endWonSub : reason === 'burnout' ? T.endBurnoutSub : T.endGaveUpSub;

  const stars = h('div', { class: 'end-stars', attrs: { 'aria-label': `${game.stars} of 3 stars` } });
  for (let i = 1; i <= 3; i++) stars.append(icon('star', i <= game.stars ? '' : 'off'));

  const cell = (k: string, v: string) => h('div', { class: 'cell' }, h('div', { class: 'label', text: k }), h('div', { class: 'v', text: v }));
  const s = game.stats;
  const earned = Math.floor(s.coffeeFromKills + s.coffeeFromSalary + s.coffeeFromMachines);
  const grid = h(
    'div',
    { class: 'end-grid' },
    cell(T.focusLeft, `${game.focus}/${game.startFocus}`),
    cell(T.wavesSurvived, `${game.phase === 'won' ? game.totalWaves : Math.max(0, game.waveIndex - 1)}/${game.totalWaves}`),
    cell(T.coffeeEarned, String(earned)),
    cell(T.score, String(game.score)),
  );
  if (result && (result.recognition > 0 || result.flawlessBonus > 0)) {
    grid.append(cell(T.recognitionEarned, `+${result.recognition + result.flawlessBonus}`));
  }
  const promotion = result?.promoted
    ? h('div', { class: 'promotion' }, icon('briefcase'), h('div', {}, h('div', { class: 'promo-big', text: T.promoted }), h('div', { text: T.promotedLine.replace('{title}', result.promoted) })))
    : null;

  // WHAT HURT YOU
  const hurt = Object.entries(s.leakFocus).sort((a, b) => b[1] - a[1]);
  const hurtList = h('div', { class: 'hurt-list' });
  if (hurt.length === 0) {
    hurtList.append(h('div', { class: 'muted', text: T.whatHurtNone }));
  } else {
    for (const [type, focus] of hurt) {
      const def = COLLEAGUES[type];
      const n = s.leaks[type] ?? 0;
      hurtList.append(
        h(
          'div',
          { class: 'hurt-row' },
          img(`icons/${def.model}.png`, def.name),
          h('div', {}, h('div', { class: 'wrap', text: `${def.name} x${n}` }), h('div', { class: 'tip wrap', text: def.counter })),
          h('span', { class: 'loss', text: `-${focus} ${T.focus}` }),
        ),
      );
    }
  }

  // Towers
  const rows = game.towers
    .filter((t) => t.def.role !== 'economy')
    .sort((a, b) => b.stats.damage - a.stats.damage)
    .map((t) =>
      h(
        'tr',
        {},
        h('td', { text: `${t.def.name} ${t.tiers.join('-')}` }),
        h('td', { text: String(Math.round(t.stats.damage)) }),
        h('td', { text: String(t.stats.kills) }),
        h('td', { text: String(t.invested) }),
        h('td', { text: (t.stats.damage / Math.max(1, t.invested)).toFixed(1) }),
      ),
    );
  const table = rows.length
    ? h(
        'div',
        { class: 'table-wrap' },
        h(
          'table',
          { class: 'towers-table' },
          h('thead', {}, h('tr', {}, h('th', { text: 'Tower' }), h('th', { text: T.damageDealt }), h('th', { text: T.kills }), h('th', { text: T.coffee }), h('th', { text: T.perCoffee }))),
          h('tbody', {}, ...rows),
        ),
      )
    : h('div', { class: 'muted', text: '-' });

  // Feedback
  let fun = -1;
  const funBtns: HTMLButtonElement[] = [];
  const scale = h('div', { class: 'fun-scale', attrs: { role: 'group', 'aria-label': T.feedbackTitle } });
  for (let i = 0; i <= 10; i++) {
    const b = h('button', {
      class: 'btn',
      text: String(i),
      on: {
        click: () => {
          fun = i;
          funBtns.forEach((x, j) => x.classList.toggle('active', j === i));
        },
      },
    });
    funBtns.push(b);
    scale.append(b);
  }
  const comment = h('textarea', { attrs: { rows: '3', maxlength: '1500', id: 'fb-comment' } });
  const name = h('input', { type: 'text', attrs: { maxlength: '40', id: 'fb-name', autocomplete: 'nickname' } });
  const status = h('div', { class: 'status', attrs: { role: 'status', 'aria-live': 'polite' } });
  const send = h('button', { class: 'btn primary' }, icon('paper-plane'), h('span', { text: ` ${T.feedbackSend}` }));
  send.addEventListener('click', async () => {
    if (fun < 0) {
      status.className = 'status bad';
      status.textContent = T.feedbackPickScore;
      return;
    }
    send.disabled = true;
    status.className = 'status';
    status.textContent = T.feedbackSending;
    const ok = await sendFeedback(summary, fun, comment.value.trim(), name.value.trim());
    status.className = `status ${ok ? 'ok' : 'bad'}`;
    status.textContent = ok ? T.feedbackSent : T.feedbackFailed;
    send.disabled = ok;
  });

  const card = h(
    'div',
    { class: 'card wide panel' },
    h('h2', { text: title }),
    h('div', { class: 'muted', text: sub }),
    game.phase === 'won' ? stars : null,
    promotion,
    grid,
    h('div', { class: 'label', text: T.whatHurt }),
    hurtList,
    h('div', { class: 'label', text: T.yourTowers }),
    table,
    h('div', { class: 'label', text: T.feedbackTitle }),
    h('div', { class: 'faint', attrs: { style: 'font-size:12px' }, text: T.feedbackScale }),
    scale,
    h('div', { class: 'field' }, h('label', { text: T.feedbackComment, attrs: { for: 'fb-comment' } }), comment),
    h('div', { class: 'field' }, h('label', { text: T.feedbackName, attrs: { for: 'fb-name' } }), name),
    h('div', { class: 'faint', attrs: { style: 'font-size:12px' }, text: T.feedbackPrivacy }),
    h('div', { class: 'row-buttons' }, send),
    status,
    h(
      'div',
      { class: 'row-buttons' },
      h('button', { class: 'btn', on: { click: () => act.retry() } }, icon('rotate-right'), h('span', { text: ` ${T.restart}` })),
      h('button', { class: 'btn', on: { click: () => act.career() } }, icon('briefcase'), h('span', { text: ` ${T.quitToCareer}` })),
    ),
  );
  return h('div', { class: 'overlay' }, card);
}
