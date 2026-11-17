// Whose-turn line on the phone. The board and the buttons follow the live state.
// This only decides which sentence the status bar shows, and for how long.
// No new player words: every sentence here is one the phone already used.
(function (root) {
  const HOLD_MS = 1000;
  // Kept so the sitting sentence is not rewritten. The status bar no longer uses it;
  // sitting stays the eye already drawn on the ostrich's square.
  const SIT_LINE = 'The vulture sees you sit.';
  const BN = { blue: 'Ostrich', red: 'Vulture', hunter: 'Hunter', hyena: 'Hyena', badger: 'Badger' };
  const TEAM = { o1: 'Ostrich 1', o2: 'Ostrich 2', v1: 'Vulture 1', v2: 'Vulture 2' };

  function turnName(S, r) {
    if (!S) return '';
    r = r == null ? S.turn : r;
    if (r === 'hunter') {
      const k = S.h3 && S.h3.kind;
      return k === 'badger' ? 'Badger' : k === 'hyena' ? 'Hyena' : 'Hunter';
    }
    if (r === 'hyena' || r === 'badger') return BN[r];
    if (S.h3 && S.h3.team && TEAM[r]) return TEAM[r];
    return BN[r] || '';
  }
  // The line a watcher reads while it is someone else's turn. Sitting never replaces it.
  function watchLine(S) {
    if (!S || S.phase !== 'play') return '';
    const name = turnName(S);
    if (!name) return '';
    if (S.turn === 'hunter' && S.h3 && S.h3.extra) return name + "'s turn again.";
    return name + "'s turn…";
  }
  function digWarn(S) { return S && S.sense ? 'A bird will see you dig in.' : 'No bird will see you dig in.'; }
  // The short line for this phone's own turn, used while a cartoon is still up
  // (the full hint, with its buttons, is drawn when the board is allowed to update).
  function ownLine(S) {
    if (!S || S.phase !== 'play' || !S.myTurn) return '';
    const seat = (S.h3 && S.h3.mySeat) || S.role;
    const hunter = S.role === 'hunter' || seat === 'hunter' || seat === 'hyena' || seat === 'badger';
    if (hunter) {
      const k = S.kind || (S.h3 && S.h3.kind) || (seat === 'hyena' || seat === 'badger' ? seat : '');
      if (S.pounce) return 'When you miss, move 1 more square.';
      if (S.h3 && S.h3.extra) return 'Your turn again. Tap to move.';
      if (k === 'badger' && !S.burrowed) return 'Tap to move, or Burrow. ' + digWarn(S);
      return 'Your turn. Tap to move. ' + (S.sense ? '' : 'No bird near.');
    }
    if (S.role === 'red' || seat === 'v1' || seat === 'v2') return S.stones < 1 ? 'No stone. Go to rocks.' : 'Your turn. Tap to fly.';
    return 'Your turn. Tap to move.';
  }
  function isWatch(text) { return /'s turn…$/.test(text || '') || /'s turn again\.$/.test(text || ''); }
  function isOwn(text) { return /^Your turn\b/.test(text || ''); }
  // What the clock should show from this state. Display only: a turn whose
  // countdown has not started yet still shows the full clock, paused, so the
  // player sees it the moment the turn is theirs.
  function clockFace(S) {
    if (!S || S.phase !== 'play' || !S.h3 || S.showTimers === false) return null;
    if (S.h3.clockLeft != null) return { left: S.h3.clockLeft, paused: !!S.h3.clockPaused, mine: !!S.myTurn };
    if (S.myTurn && S.h3.clockMs) return { left: S.h3.clockMs, paused: true, mine: true };
    return null;
  }
  // Each other animal's turn line stays up for at least `hold` ms. Your own
  // "Your turn" (and any line that is not a turn line) shows immediately.
  // Nothing here delays a move or a tap; callers keep playing on the real state.
  function create(opts) {
    opts = opts || {};
    const hold = opts.hold == null ? HOLD_MS : opts.hold;
    const now = opts.now || function () { return Date.now(); };
    const schedule = opts.schedule || setTimeout;
    const cancel = opts.cancel || clearTimeout;
    const onchange = opts.onchange || null;
    let shown = null, wait = [], timer = null;
    function clearTimer() { if (timer != null) cancel(timer); timer = null; }
    function arm(ms) {
      clearTimer();
      timer = schedule(function () {
        timer = null;
        if (!wait.length) return;
        const text = wait.shift();
        shown = { text: text, at: now(), own: false };
        if (wait.length) arm(hold);
        if (onchange) onchange(text);
      }, ms);
    }
    function show(text, o) {
      o = o || {};
      const t = now();
      const own = !!o.own || isOwn(text);
      // Your own turn, and any line that is not "X's turn…", shows at once.
      // That does not wait out the previous animal's second.
      if (own || (text && !isWatch(text))) {
        clearTimer();
        wait = [];
        shown = { text: text || '', at: t, own: own };
        return shown.text;
      }
      if (!text) {
        if (shown && isWatch(shown.text) && t - shown.at < hold) return shown.text;
        clearTimer();
        wait = [];
        shown = { text: '', at: t, own: false };
        return '';
      }
      if (!shown || !isWatch(shown.text)) {
        shown = { text: text, at: t, own: false };
        wait = [];
        arm(hold);
        return text;
      }
      if (shown.text === text && !wait.length) return shown.text;
      if (wait.length && wait[wait.length - 1] === text) return shown.text;
      if (t - shown.at >= hold && !wait.length) {
        shown = { text: text, at: t, own: false };
        arm(hold);
        return text;
      }
      wait.push(text);
      if (timer == null) arm(Math.max(0, hold - (t - shown.at)));
      return shown.text;
    }
    return {
      show: show,
      current: function () { return shown ? shown.text : ''; },
      pending: function () { return wait.slice(); }
    };
  }

  const api = { HOLD_MS: HOLD_MS, SIT_LINE: SIT_LINE, turnName: turnName, watchLine: watchLine, ownLine: ownLine, isWatch: isWatch, isOwn: isOwn, clockFace: clockFace, create: create };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof document === 'undefined') return;
  root.TURNLINE = api;
  api.live = create({
    onchange: function (text) {
      const hint = document.getElementById('hint');
      if (!hint) return;
      hint.textContent = text || '';
      hint.classList.toggle('empty', !text);
    }
  });
})(typeof window === 'undefined' ? globalThis : window);
