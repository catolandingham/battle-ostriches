// The badger's sayings, in their own bubble. They never enter the status queue.
// Each line stays up about a second, or 0.3s a word when that is longer (the same
// reading rule as the status line). A saying queued for a turn that has already
// changed is dropped and not shown. Works in the browser (window.BADGER_BUBBLE) and in Node.
(function (root) {
  function words(text) { return (String(text || '').trim().match(/\S+/g) || []).length; }
  function holdMs(text) { return Math.max(1000, words(text) * 300); }
  function turnKey(S) {
    if (!S) return '';
    const extra = S.h3 && S.h3.extra ? ':x' : '';
    return (S.round == null ? '' : S.round) + ':' + (S.turn || '') + extra;
  }
  function create({ show, hide, schedule, cancel }) {
    let pending = [], active = null, timer = null, turn = null;
    function clearTimer() { if (timer != null) { cancel(timer); timer = null; } }
    function pump() {
      timer = null;
      if (active) return;
      while (pending.length && pending[0].turn !== turn) pending.shift();
      if (!pending.length) return;
      active = pending.shift();
      show(active);
      timer = schedule(() => { const done = active; active = null; hide(done); pump(); }, holdMs(active.text));
    }
    return {
      note(S) {
        const key = turnKey(S);
        if (key === turn) return;
        turn = key;
        pending = pending.filter(item => item.turn === key);
        if (active && active.turn !== key) { clearTimer(); const done = active; active = null; hide(done); }
        if (!active && pending.length && timer == null) timer = schedule(pump, 0);
      },
      add(text, S) {
        const key = turnKey(S);
        if (!text || key !== turn) return false;
        pending.push({ text, turn: key });
        if (!active && timer == null) timer = schedule(pump, 0);
        return true;
      },
      state: () => ({ active, pending: pending.slice(), turn })
    };
  }
  const api = { create, holdMs, turnKey, words };
  if (typeof module !== 'undefined') module.exports = api;
  root.BADGER_BUBBLE = api;
})(typeof window === 'undefined' ? globalThis : window);
