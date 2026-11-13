// The desk phone (Hot Desks): it slides in and shakes. Red hangs up and pays; green picks up, and
// then it is "Hi, do you have a minute?" and that desk is stuck on the call. The game keeps running.

import { h, icon } from './dom';
import { UI_TEXT as T } from './text';

export interface PhoneGame {
  el: HTMLElement;
  setTimeLeft(seconds: number): void;
  close(): void;
}

export function phoneGame(answer: (hangUp: boolean) => void): PhoneGame {
  const timer = h('div', { class: 'qte-timer' });
  let done = false;
  const pick = (hangUp: boolean) => {
    if (done) return;
    done = true;
    answer(hangUp);
  };
  const red = h('button', { class: 'btn phone-btn hang', title: T.phoneHangHelp, on: { click: () => pick(true) } }, icon('phone-slash'), ` ${T.phoneHang}`);
  const green = h('button', { class: 'btn phone-btn pick', title: T.phonePickHelp, on: { click: () => pick(false) } }, icon('phone'), ` ${T.phonePick}`);
  const card = h(
    'div',
    { class: 'qte panel phone-card', attrs: { role: 'dialog', 'aria-label': T.phoneTitle } },
    h('div', { class: 'qte-head' }, h('span', { class: 'qte-title', text: T.phoneTitle }), timer),
    h('div', { class: 'phone-caller' }, icon('user-tie'), h('span', { text: T.phoneCaller })),
    h('div', { class: 'phone-buttons' }, red, green),
  );
  const el = h('div', { class: 'qte-layer phone-layer' }, card);
  return {
    el,
    setTimeLeft: (sec) => {
      const t = T.phoneTimer.replace('{s}', String(Math.max(0, Math.ceil(sec))));
      if (timer.textContent !== t) timer.textContent = t;
    },
    close: () => el.remove(),
  };
}
