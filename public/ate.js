// After this bird eats a leaf: who may see the sign, the words, and the food-counter rise.
// The number on the food chip is already public. The badge and the line are only for the bird that ate.
(function (root) {
  const LINE = 'You ate.';
  // One digit at a time, long enough to see on a phone. A one-step rise still holds the old number first.
  const STEP_MS = 90;
  const MIN_MS = 700;
  // The line stays up through the longest refill (1 to 15 is about 1.3s) and a moment after the new number lands.
  const LINE_MS = 4500;

  function seatOf(S) { return (S && S.h3 && S.h3.mySeat) || (S && S.role) || ''; }
  function isOstrich(S) {
    if (!S || S.role === 'hunter') return false;
    const seat = seatOf(S);
    if (S.h3 && S.h3.team) return seat === 'o1' || seat === 'o2';
    return S.role === 'blue';
  }
  // This phone's bird is the one that ate. A teammate, the vulture, and a hunter are not.
  function ateAction(S) {
    const la = S && S.lastAction;
    if (!la || !la.ate || !isOstrich(S)) return false;
    if (la.seat && la.seat !== seatOf(S)) return false;
    return true;
  }
  function stamp(la) {
    if (!la) return '';
    return [la.type || '', la.seat || '', la.ate ? 1 : 0].join('|');
  }
  // True only on the update where this bird's leaf-eat arrives, including an eat that was already full.
  function justAte(prev, S) {
    if (!prev || !ateAction(S)) return false;
    if (ateAction(prev) && stamp(prev.lastAction) === stamp(S.lastAction)) return false;
    return true;
  }
  // The badge stays until this bird's next turn. `showing` is the flag already stored for this seat.
  function badgeOn(showing, prev, S) {
    if (!S || S.phase === 'over' || !isOstrich(S)) return false;
    if (justAte(prev, S)) return true;
    if (!showing) return false;
    if (S.myTurn && (!prev || !prev.myTurn)) return false;
    return true;
  }
  // Every integer from the old food number to the new one. Empty when the number did not rise.
  function steps(from, to) {
    from |= 0; to |= 0;
    if (!(to > from)) return [];
    const s = [];
    for (let n = from; n <= to; n++) s.push(n);
    return s;
  }
  function gapFor(nSteps, stepMs, minMs) {
    if (nSteps < 2) return 0;
    return Math.max(stepMs, Math.ceil(minMs / (nSteps - 1)));
  }
  // Counts a live number up. A later paint must call hold() so a redraw cannot skip to the end.
  // `element` may be a node or a function that returns the current node (the header is rebuilt on each paint).
  function createPlayer(opts) {
    opts = opts || {};
    const schedule = opts.schedule || setTimeout, cancel = opts.cancel || clearTimeout;
    const stepMs = opts.stepMs == null ? STEP_MS : opts.stepMs;
    const minMs = opts.minMs == null ? MIN_MS : opts.minMs;
    const onShow = opts.onShow;
    let timer = null, shown = null, target = null, gen = 0;
    function live() {
      const e = opts.element;
      return typeof e === 'function' ? e() : e;
    }
    function write(n) {
      shown = n;
      const el = live();
      if (el) el.textContent = String(n | 0);
      const up = target != null && shown < target;
      if (onShow) onShow(shown, up);
    }
    function clear() { if (timer != null) cancel(timer); timer = null; }
    function play(from, to) {
      from |= 0; to |= 0;
      if (!(to > from)) return { played: false, shown: shown };
      const start = shown != null && shown < to && shown >= from ? shown : from;
      const seq = steps(start, to);
      if (seq.length < 2) { target = null; write(to); return { played: false, shown: to, steps: seq, gap: 0 }; }
      target = to;
      const my = ++gen;
      clear();
      write(seq[0]);
      const gap = gapFor(seq.length, stepMs, minMs);
      let i = 1;
      const tick = () => {
        timer = null;
        if (my !== gen) return;
        write(seq[i]);
        i++;
        if (i < seq.length) timer = schedule(tick, gap);
        else target = null;
      };
      timer = schedule(tick, gap);
      return { played: true, shown: seq[0], steps: seq, gap: gap };
    }
    function hold() {
      if (shown != null && target != null && shown < target) write(shown);
      return shown;
    }
    function rising() { return target != null && shown != null && shown < target; }
    function state() { return { shown: shown, target: target, rising: rising() }; }
    function reset() { clear(); gen++; shown = null; target = null; if (onShow) onShow(shown, false); }
    return { play: play, hold: hold, rising: rising, state: state, reset: reset };
  }

  const api = {
    LINE: LINE, STEP_MS: STEP_MS, MIN_MS: MIN_MS, LINE_MS: LINE_MS,
    seatOf: seatOf, isOstrich: isOstrich, ateAction: ateAction, justAte: justAte, badgeOn: badgeOn,
    steps: steps, gapFor: gapFor, createPlayer: createPlayer
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ATE = api;
})(typeof window === 'undefined' ? globalThis : window);
