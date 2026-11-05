// Tap-the-animal action ring. Legal actions only; the buttons under the board stay for keyboard and screen readers.
// North is toward the top of the board (row 0). Sense bearings name that grid; they do not point at a bird.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BORing = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const IDS = ['step', 'carry', 'sit', 'fly', 'throw', 'hstay'];
  function bearing(dx, dy) {
    if (!dx && !dy) return { key: 'here', name: 'here', dx: 0, dy: 0 };
    const ns = dy < 0 ? 'north' : dy > 0 ? 'south' : '';
    const ew = dx > 0 ? 'east' : dx < 0 ? 'west' : '';
    const name = ns && ew ? ns + ew : (ns || ew);
    const key = name.replace('north', 'N').replace('south', 'S').replace('east', 'E').replace('west', 'W');
    return { key, name, dx, dy };
  }
  // stored is localStorage bo_timers: '1' on, '0' off, missing follows the server (default on).
  function timersShown(state, stored) {
    if (stored === '0') return false;
    if (stored === '1') return true;
    return !state || state.showTimers !== false;
  }
  function legalActions(S) {
    if (!S || S.god || S.phase !== 'play' || !S.myTurn) return [];
    const C = S.cfg || {};
    if (S.role === 'hunter') {
      const k = (S.h3 && S.h3.kind) || S.kind || 'hyena';
      if (S.pounce) return [{ id: 'hstay', label: 'Stop', detail: 'Skip this extra move. You will not catch the bird.', enabled: true, run: 'hstay' }];
      if (k === 'badger') {
        if (S.burrowed) return [{ id: 'hstay', label: 'Stay', detail: 'Stay burrowed. Birds still cannot see you.', enabled: true, run: 'hstay' }];
        if (S.dig === 1) return [{ id: 'hstay', label: 'Finish', detail: 'Tough ground: stay still once more to finish the burrow.', enabled: true, run: 'hstay' }];
        return [{ id: 'hstay', label: 'Burrow', detail: 'Stay still to burrow. You usually hide at once; tough ground takes one more still turn.', enabled: true, run: 'hstay' }];
      }
      return [{ id: 'hstay', label: 'Stay', detail: 'Stay put and end your turn.', enabled: true, run: 'hstay' }];
    }
    if (S.role === 'blue') {
      const items = [{ id: 'step', label: 'Step', detail: (S.moves && S.moves.length) ? 'Move 1 square. Tap a glowing square.' : 'No square to step to.', enabled: true, mode: 'step' }];
      if (S.onEgg) {
        const carryOk = !!(S.can && S.can.carry);
        const sitOk = !!(S.can && S.can.sit);
        items.push({ id: 'carry', label: 'Carry', detail: carryOk ? 'Carry the egg 1 square.' : 'Cannot carry the egg from here.', enabled: carryOk, mode: 'carry' });
        items.push({ id: 'sit', label: 'Sit', detail: S.mustLeave ? `You sat ${C.maxSit} turns in a row. Step off this turn.` : sitOk ? `Warm the egg. ${Math.max(0, (C.maxSit || 0) - (S.sitRun || 0))} sits left.` : 'Sit only works while you stand on an egg.', enabled: sitOk, act: 'sit' });
      }
      return items;
    }
    const stones = S.stones | 0;
    return [
      { id: 'fly', label: 'Fly', detail: `Fly up to ${C.vultureFly || 2} squares. Tap a glowing square.`, enabled: true, mode: 'fly' },
      { id: 'throw', label: 'Throw', detail: stones < 1 ? 'No stone. Land on a rock pile to pick one up.' : `Throw at your square or one next to it. Stones ${stones}/${C.stones}.`, enabled: stones > 0, mode: 'throw' }
    ];
  }
  let open = false, turnKey = '';
  function clearRing() {
    const root = document.getElementById('aring');
    if (root) root.remove();
  }
  function anchor(S) {
    const board = document.getElementById('board');
    if (!board || !S) return null;
    if (S.role === 'hunter') {
      const pc = board.querySelector('.pc.ph.mine') || board.querySelector('.pc.ph:not(.rival)');
      return pc && pc.closest('.cell');
    }
    return board.querySelector('.cell[data-tags~="me"]');
  }
  function selected() {
    const b = document.querySelector('#actions button.on');
    if (!b) return '';
    const t = b.textContent.replace(/^✓\s*/, '').toLowerCase();
    if (t.startsWith('step')) return 'step';
    if (t.startsWith('carry') || t.startsWith('🥚')) return 'carry';
    if (t.startsWith('fly')) return 'fly';
    if (t.startsWith('throw')) return 'throw';
    if (t.startsWith('stop')) return 'hstay';
    return '';
  }
  function arm(el, fn) {
    let t = 0;
    el.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    el.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); t = Date.now(); fn(e); }, { passive: false });
    el.addEventListener('click', e => { e.stopPropagation(); if (Date.now() - t > 600) fn(e); });
  }
  function draw(S, cell) {
    clearRing();
    const items = legalActions(S).filter(it => IDS.includes(it.id));
    if (!items.length) { open = false; return; }
    const root = document.createElement('div');
    root.id = 'aring';
    root.setAttribute('role', 'menu');
    root.setAttribute('aria-label', 'Actions');
    const r = cell.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const radius = Math.max(56, Math.round(r.width * 1.15));
    const on = selected();
    items.forEach((it, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI / items.length);
      let x = cx + Math.cos(ang) * radius, y = cy + Math.sin(ang) * radius;
      x = Math.max(36, Math.min(window.innerWidth - 36, x));
      y = Math.max(36, Math.min(window.innerHeight - 36, y));
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'aring-btn' + (it.enabled ? '' : ' off') + (on === it.id ? ' on' : '');
      b.textContent = it.label;
      b.title = it.detail;
      b.setAttribute('role', 'menuitem');
      b.setAttribute('aria-label', it.label + '. ' + it.detail);
      if (!it.enabled) b.setAttribute('aria-disabled', 'true');
      b.style.left = x + 'px';
      b.style.top = y + 'px';
      arm(b, () => {
        if (!it.enabled) {
          const h = document.getElementById('hint');
          if (h) { h.textContent = it.detail; h.classList.remove('empty'); }
          return;
        }
        open = false;
        clearRing();
        if (!window.UI) return;
        if (it.mode) UI.setMode(it.mode);
        else if (it.act) UI.act(it.act);
        else if (it.run === 'hstay') UI.send({ t: 'act', a: 'hstay' });
      });
      root.appendChild(b);
    });
    document.body.appendChild(root);
  }
  function sync(S) {
    if (typeof document === 'undefined') return;
    refreshTimers(S);
    const key = S ? (S.round + ':' + S.turn + ':' + (S.myTurn ? 1 : 0) + ':' + (S.pounce ? 1 : 0)) : '';
    if (key !== turnKey) { turnKey = key; open = false; }
    document.querySelectorAll('.ring-tap').forEach(n => n.remove());
    const items = legalActions(S);
    const cell = items.length ? anchor(S) : null;
    if (!cell) { open = false; clearRing(); return; }
    const tap = document.createElement('button');
    tap.type = 'button';
    tap.className = 'ring-tap' + (open ? ' open' : '');
    tap.textContent = open ? '✕' : '✦';
    tap.setAttribute('aria-label', open ? 'Close actions' : 'Open actions');
    tap.setAttribute('aria-expanded', open ? 'true' : 'false');
    arm(tap, () => { open = !open; sync(S); });
    cell.appendChild(tap);
    if (open) draw(S, cell); else clearRing();
  }
  function refreshTimers(S) {
    if (typeof document === 'undefined') return;
    const on = timersShown(S, localStorage.getItem('bo_timers'));
    document.body.classList.toggle('timers-off', !on);
    const b = document.getElementById('timerToggle');
    if (!b) return;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.classList.toggle('on', on);
    b.setAttribute('aria-label', (on ? 'Turn timer and round counter on' : 'Turn timer and round counter off') + '. Hiding them does not stop the clock.');
  }
  function init() {
    const b = document.getElementById('timerToggle');
    if (b && !b.dataset.wired) {
      b.dataset.wired = '1';
      arm(b, () => {
        const on = !document.body.classList.contains('timers-off');
        localStorage.setItem('bo_timers', on ? '0' : '1');
        refreshTimers(window.UI && UI._S ? UI._S() : null);
      });
    }
    if (!document.body.dataset.ringDoc) {
      document.body.dataset.ringDoc = '1';
      document.addEventListener('click', e => {
        if (!open) return;
        if (e.target.closest && e.target.closest('#aring, .ring-tap')) return;
        open = false;
        clearRing();
        document.querySelectorAll('.ring-tap').forEach(n => { n.classList.remove('open'); n.textContent = '✦'; n.setAttribute('aria-expanded', 'false'); });
      });
      window.addEventListener('resize', () => { if (open && window.UI && UI._S) sync(UI._S()); });
    }
    refreshTimers(null);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
  return { legalActions, bearing, timersShown, sync, refreshTimers, IDS };
});
