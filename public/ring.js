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
  function arrowGlyph(dx, dy) {
    const x = Math.sign(dx), y = Math.sign(dy);
    return { '0,-1': '↑', '1,-1': '↗', '1,0': '→', '1,1': '↘', '0,1': '↓', '-1,1': '↙', '-1,0': '←', '-1,-1': '↖' }[x + ',' + y] || '';
  }
  // stored is localStorage bo_timers: '1' on, '0' off, missing follows the server (default on).
  function timersShown(state, stored) {
    if (state && state.clockStopped) return false;
    if (stored === '0') return false;
    if (stored === '1') return true;
    return !state || state.showTimers !== false;
  }
  // Step and Fly stay on the ring so the default action can be selected. The glowing squares still do the move.
  function legalActions(S, mode) {
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
      const items = [];
      if (mode === 'carry') items.push({ id: 'step', label: 'Move', detail: 'Tap a glowing square to step.', enabled: true, mode: 'step' });
      else if ((S.moves || []).length) items.push({ id: 'step', label: 'Step', detail: 'Step is selected. Tap a glowing square.', enabled: true, mode: 'step' });
      if (S.onEgg && S.can && S.can.carry) items.push({ id: 'carry', label: 'Carry', detail: 'Carry the egg 1 square.', enabled: true, mode: 'carry' });
      if (S.onEgg && S.can && S.can.sit) items.push({ id: 'sit', label: 'Sit', detail: `Warm the egg. ${Math.max(0, (C.maxSit || 0) - (S.sitRun || 0))} sits left.`, enabled: true, act: 'sit' });
      return items;
    }
    const items = [];
    const stones = S.stones | 0;
    items.push({ id: 'fly', label: 'Fly', detail: 'Fly is selected. Tap a glowing square.', enabled: true, mode: 'fly' });
    if (stones > 0) items.push({ id: 'throw', label: 'Throw', detail: `Throw at your square or one next to it. Stones ${stones}/${C.stones}.`, enabled: true, mode: 'throw' });
    return items;
  }
  function omittedNotes(S) {
    if (!S || S.god || S.phase !== 'play' || !S.myTurn) return [];
    const notes = [];
    if (S.role === 'blue' && S.mustLeave) notes.push('Sit is used up. Step off this turn.');
    if (S.role === 'red' && (S.stones | 0) < 1) notes.push('No stone. Land on a rock pile to pick one up.');
    return notes;
  }
  function hunterNearLabel(kind) { return kind === 'badger' ? 'HONEY BADGER NEAR' : 'HYENA NEAR'; }
  function hunterAlerts(prevKinds, nowKinds) {
    const prev = new Set(prevKinds || []);
    return (nowKinds || []).filter(k => k && !prev.has(k));
  }
  function seenHunterKinds(S) {
    if (!S || S.phase !== 'play' || S.god || S.role === 'hunter' || !S.h3) return [];
    const h = S.h3, me = h.mySeat || S.role, b = h.birds && h.birds[me];
    if (b && b.out) return [];
    if (h.hunt) return (h.hunters || []).filter(x => x && !x.me && x.p && x.p[0] >= 0 && !(x.kind === 'badger' && x.burrowed)).map(x => x.kind);
    if (h.hunter && h.hunter[0] >= 0 && !(h.kind === 'badger' && h.burrowed)) return [h.kind || 'hyena'];
    return [];
  }
  function showSniffPop(blue, yes, found) {
    if (found) return true;
    if (blue && !yes) return false;
    return true;
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
    const items = legalActions(S, selected()).filter(it => IDS.includes(it.id) && it.enabled);
    if (!items.length) { open = false; return; }
    const root = document.createElement('div');
    root.id = 'aring';
    root.setAttribute('role', 'menu');
    root.setAttribute('aria-label', 'Actions');
    root.style.pointerEvents = 'none';
    const board = document.getElementById('board');
    const r = cell.getBoundingClientRect();
    const br = board ? board.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    const colW = 104, pillH = 44, gap = 8;
    const colH = items.length * pillH + (items.length - 1) * gap;
    const vw = window.innerWidth, vh = window.innerHeight;
    const blocksMove = (x, y, w, h) => {
      const nodes = document.querySelectorAll('#board .cell.legal');
      for (const n of nodes) {
        const b = n.getBoundingClientRect();
        if (x < b.right - 0.5 && x + w > b.left + 0.5 && y < b.bottom - 0.5 && y + h > b.top + 0.5) return true;
      }
      return x < r.right - 0.5 && x + w > r.left + 0.5 && y < r.bottom - 0.5 && y + h > r.top + 0.5;
    };
    const spots = [
      [br.right + 8, r.top],
      [br.left - colW - 8, r.top],
      [br.left, br.bottom + 8],
      [vw - colW - 8, br.bottom + 8],
      [4, br.top - colH - 8],
      [vw - colW - 8, 4],
      [4, vh - colH - 8],
    ];
    let left = 4, top = 4, placed = false;
    for (const [x0, y0] of spots) {
      const x = Math.max(4, Math.min(x0, vw - colW - 4));
      const y = Math.max(4, Math.min(y0, vh - colH - 4));
      if (!blocksMove(x, y, colW, colH)) { left = x; top = y; placed = true; break; }
    }
    if (!placed) {
      open = false;
      const tap = cell.querySelector('.ring-tap');
      if (tap) {
        tap.classList.remove('open');
        const word = tap.querySelector('.ring-word');
        if (word) word.textContent = 'Actions';
        tap.setAttribute('aria-label', 'Actions');
        tap.setAttribute('aria-expanded', 'false');
      }
      return;
    }
    const on = selected();
    items.forEach((it, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'aring-btn' + (on === it.id ? ' on' : '');
      b.textContent = it.label;
      b.title = it.detail;
      b.setAttribute('role', 'menuitem');
      b.setAttribute('aria-label', it.label + '. ' + it.detail);
      b.style.left = left + 'px';
      b.style.top = (top + i * (pillH + gap)) + 'px';
      b.style.width = colW + 'px';
      b.style.pointerEvents = 'auto';
      arm(b, () => {
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
    const items = legalActions(S, selected());
    const cell = items.length ? anchor(S) : null;
    if (!cell) { open = false; clearRing(); return; }
    const tap = document.createElement('button');
    tap.type = 'button';
    tap.className = 'ring-tap' + (open ? ' open' : '');
    tap.innerHTML = `<span class="ring-word">${open ? 'Close' : 'Actions'}</span>`;
    tap.setAttribute('aria-label', open ? 'Close actions' : 'Actions');
    tap.setAttribute('aria-expanded', open ? 'true' : 'false');
    arm(tap, () => { open = !open; sync(S); });
    cell.appendChild(tap);
    const cr = cell.getBoundingClientRect(), tr = tap.getBoundingClientRect();
    if (tr.left < cr.left - 1 || tr.right > cr.right + 1 || tr.top < cr.top - 1 || tr.bottom > cr.bottom + 1) tap.remove();
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
        document.querySelectorAll('.ring-tap').forEach(n => { n.classList.remove('open'); const w = n.querySelector('.ring-word'); if (w) w.textContent = 'Actions'; n.setAttribute('aria-label', 'Actions'); n.setAttribute('aria-expanded', 'false'); });
      });
      window.addEventListener('resize', () => { if (open && window.UI && UI._S) sync(UI._S()); });
    }
    refreshTimers(null);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
  return { legalActions, omittedNotes, showSniffPop, hunterAlerts, hunterNearLabel, seenHunterKinds, bearing, arrowGlyph, timersShown, sync, refreshTimers, IDS };
});
