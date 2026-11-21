// The badger's sayings, in their own bubble. They never enter the status queue.
// Each line stays up about a second, or 0.3s a word when that is longer (the same
// reading rule as the status line). A saying already queued still plays if the
// turn changes before it reaches the screen: the kick quote waits behind the
// first-burrow line, and the computer's next move must not eat it. A new saying
// is only taken for the turn on screen now. One already on screen finishes its
// reading time. Works in the browser (window.BADGER_BUBBLE) and in Node.
(function (root) {
  function words(text) { return (String(text || '').trim().match(/\S+/g) || []).length; }
  function holdMs(text) { return Math.max(1000, words(text) * 300); }
  function turnKey(S) {
    if (!S) return '';
    const extra = S.h3 && S.h3.extra ? ':x' : '';
    return (S.round == null ? '' : S.round) + ':' + (S.turn || '') + extra;
  }
  function create({ show, hide, schedule, cancel, blocked }) {
    let pending = [], active = null, timer = null, turn = null;
    function pump() {
      timer = null;
      if (active) return;
      if (blocked && blocked()) return;
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
        // Keep the queue. The line on screen finishes, then the ones waiting play.
        if (!active && pending.length && timer == null) pump();
      },
      add(text, S) {
        const key = turnKey(S);
        if (!text || key !== turn) return false;
        pending.push({ text, turn: key });
        if (!active && timer == null) pump();
        return true;
      },
      // A status line needs the screen. Park this saying and play it again, whole.
      pause() {
        if (!active) return false;
        if (timer != null && cancel) cancel(timer);
        timer = null;
        const item = active;
        active = null;
        hide(item);
        pending.unshift(item);
        return true;
      },
      resume() { if (!active && timer == null) pump(); },
      state: () => ({ active, pending: pending.slice(), turn })
    };
  }
  const api = { create, holdMs, turnKey, words };
  if (typeof module !== 'undefined') module.exports = api;
  root.BADGER_BUBBLE = api;
})(typeof window === 'undefined' ? globalThis : window);
