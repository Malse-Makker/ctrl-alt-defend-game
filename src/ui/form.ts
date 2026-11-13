// The HR form (HR Room): three pages, a box to tick on each, and a signature at the end. While it
// is open you cannot upgrade anything. The game keeps running behind it.

import { h } from './dom';
import { UI_TEXT as T } from './text';

export interface FormGame {
  el: HTMLElement;
  setTimeLeft(seconds: number): void;
  close(): void;
}

export function formGame(onSigned: () => void): FormGame {
  const timer = h('div', { class: 'qte-timer' });
  const body = h('div', { class: 'qte-body form-body' });
  const card = h(
    'div',
    { class: 'qte panel form-card', attrs: { role: 'dialog', 'aria-label': T.formTitle } },
    h('div', { class: 'qte-head' }, h('span', { class: 'qte-title', text: T.formTitle }), timer),
    body,
  );
  const el = h('div', { class: 'qte-layer form-layer' }, card);
  let page = 0;
  const show = (): void => {
    body.replaceChildren();
    const last = page === T.formPages.length - 1;
    const tick = h('input', { attrs: { type: 'checkbox', id: `form-tick-${page}` } }) as HTMLInputElement;
    const next = h('button', {
      class: 'btn primary',
      text: last ? T.formSign : T.formNext,
      on: {
        click: () => {
          if (!tick.checked) {
            next.classList.add('shake');
            setTimeout(() => next.classList.remove('shake'), 300);
            return;
          }
          if (last) onSigned();
          else {
            page++;
            show();
          }
        },
      },
    }) as HTMLButtonElement;
    body.append(
      h('div', { class: 'faint', text: `${T.formPage} ${page + 1} / ${T.formPages.length}` }),
      h('p', { class: 'wrap form-text', text: T.formPages[page] }),
      h('label', { class: 'form-tick', attrs: { for: `form-tick-${page}` } }, tick, h('span', { text: T.formTick })),
      next,
    );
  };
  show();
  return {
    el,
    setTimeLeft: (sec) => {
      const t = T.formTimer.replace('{s}', String(Math.max(0, Math.ceil(sec))));
      if (timer.textContent !== t) timer.textContent = t;
    },
    close: () => el.remove(),
  };
}
