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
    if (state && state.clockStopped) return false;
    if (stored === '0') return false;
    if (stored === '1') return true;
    return !state || state.showTimers !== false;
  }
  // On-animal actions only. Stepping and flying are the glowing squares, so they are not listed unless the player is in another mode and needs a way back.
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
      if (S.onEgg && S.can && S.can.carry) items.push({ id: 'carry', label: 'Carry', detail: 'Carry the egg 1 square.', enabled: true, mode: 'carry' });
      if (S.onEgg && S.can && S.can.sit) items.push({ id: 'sit', label: 'Sit', detail: `Warm the egg. ${Math.max(0, (C.maxSit || 0) - (S.sitRun || 0))} sits left.`, enabled: true, act: 'sit' });
      return items;
    }
    const items = [];
    const stones = S.stones | 0;
    if (mode === 'throw') items.push({ id: 'fly', label: 'Fly', detail: 'Tap a glowing square to fly.', enabled: true, mode: 'fly' });
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
    const board = document.getElementById('board');
    const r = cell.getBoundingClientRect();
    const br = board ? board.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    const colW = 104, pillH = 44, gap = 8;
    const colH = items.length * pillH + (items.length - 1) * gap;
    const spaceR = br.right - r.right, spaceL = r.left - br.left;
    let left = spaceR >= spaceL ? r.right + 8 : r.left - colW - 8;
    left = Math.max(br.left + 4, Math.min(left, br.right - colW - 4));
    let top = r.top + r.height / 2 - colH / 2;
    top = Math.max(br.top + 4, Math.min(top, br.bottom - colH - 4));
    const overlaps = left < r.right - 4 && left + colW > r.left + 4 && top < r.bottom - 4 && top + colH > r.top + 4;
    if (overlaps) {
      const above = r.top - br.top >= br.bottom - r.bottom;
      top = above ? r.top - colH - 8 : r.bottom + 8;
      top = Math.max(8, Math.min(top, window.innerHeight - colH - 8));
      left = Math.max(br.left + 4, Math.min(r.left + r.width / 2 - colW / 2, br.right - colW - 4));
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
    tap.style.pointerEvents = 'none';
    const tr = tap.getBoundingClientRect();
    const under = document.elementFromPoint(tr.left + tr.width / 2, tr.top + tr.height / 2);
    tap.style.pointerEvents = '';
    const other = under && under.closest && under.closest('.cell');
    if (other && other !== cell && other.classList.contains('legal')) tap.classList.add('above');
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
  return { legalActions, omittedNotes, showSniffPop, hunterAlerts, hunterNearLabel, seenHunterKinds, bearing, timersShown, sync, refreshTimers, IDS };
});
