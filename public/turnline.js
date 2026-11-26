// The turn line (the status bar above the board): which sentence shows, and for how long.
// Words are never made here. Every sentence comes from the code that already wrote it.
// A watcher's turn line ("Badger's turn…") stays up at least HOLD_MS so a fast turn does not flash.
// The player's own line ("Your turn…") and any other line shows at once and never waits on that hold.
(function (root) {
  const HOLD_MS = 1000;
  const WATCH = /^[^.!?…]{1,30}'s turn(…| again\.)$/;
  const isWatch = text => WATCH.test(text || '');
  // now/schedule/cancel/onchange are injectable so the unit test can run without a clock.
  // onchange(text, was) runs when a held line gives way to the newest waiting line.
  function create(opts) {
    opts = opts || {};
    const hold = opts.hold == null ? HOLD_MS : opts.hold;
    const now = opts.now || (() => Date.now());
    const schedule = opts.schedule || setTimeout, cancel = opts.cancel || clearTimeout;
    let shown = null, waiting = null, timer = null;
    const stop = () => { if (timer != null) cancel(timer); timer = null; waiting = null; };
    function fire() {
      timer = null;
      if (waiting == null) return;
      const was = shown ? shown.text : '', text = waiting;
      waiting = null; shown = { text, at: now() };
      if (opts.onchange) opts.onchange(text, was);
    }
    // Returns the text to put on screen right now.
    function show(text) {
      text = text || '';
      const t = now();
      if (!isWatch(text)) { stop(); shown = { text, at: t }; return text; }
      if (!shown || !isWatch(shown.text)) { stop(); shown = { text, at: t }; return text; }
      if (shown.text === text) { stop(); return text; }
      if (t - shown.at >= hold) { stop(); shown = { text, at: t }; return text; }
      waiting = text; // only the newest line waits, so the line is never more than HOLD_MS behind
      if (timer == null) timer = schedule(fire, Math.max(0, hold - (t - shown.at)));
      return shown.text;
    }
    return { show, current: () => (shown ? shown.text : ''), waiting: () => waiting };
  }
  // While a cartoon holds the board there are no move buttons, so a line that pairs a turn with an instruction
  // ("Your turn. Tap to move.") shows only its turn part ("Your turn."). The instruction joins it when the buttons appear.
  const holdTurn = l => (typeof l === 'string' ? l.replace(/^(Your turn( again)?\.) .*$/, '$1') : l);
  // "The vulture sees you sit." is a news line on the sitting ostrich's own phone, never the turn line.
  // sat: this view is the ostrich's and it is sitting on its own square. justSat: it was not sitting a moment ago, so a long sit says it once.
  const SIT_LINE = 'The vulture sees you sit.';
  const sat = S => !!(S && S.role === 'blue' && S.sittingAt && S.ostrich && S.sittingAt.some(q => q[0] === S.ostrich[0] && q[1] === S.ostrich[1]));
  const justSat = (S, prev) => !!prev && sat(S) && !sat(prev);
  const api = { HOLD_MS, isWatch, create, holdTurn, SIT_LINE, sat, justSat };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof document === 'undefined') return;
  root.TURNLINE = api;
  api.live = create({ onchange(text, was) {
    const hint = document.getElementById('hint'), n = hint && hint.firstChild;
    // Only swap the sentence if it is still the one this queue put up (a nudge or another line may have replaced it).
    if (n && n.nodeType === 3 && n.nodeValue === was) { n.nodeValue = text; hint.classList.toggle('empty', !text); }
  } });
})(typeof window === 'undefined' ? globalThis : window);
