// Shared surprise-moment policy for the Combined kick pattern, applied to every
// sudden hit: kick, catch/pounce (and the flee), knock-out, stone, egg smash,
// hidden-badger ambush, badger burst, and hunter shove.
// Browser (window.SURPRISE) and Node. No new player-facing words live here.
// "Look out!" is the beat before the cartoon. After the motion, the hit player
// gets a reading pause (1s, or 0.3s a word) and the game continues on its own.
(function (root) {
  const LOOKOUT_MS = 1000;
  const CARTOON_MS = 2000; // the approved cartoon length; the board stays frozen under it
  const STEP_MS = 600;     // real motion, 0.6s per square
  // After the motion, keep the result line up long enough to read, then continue.
  // One second is the floor; a longer line gets 0.3s a word. There is no tap.
  const WORD_MS = 300;
  const MIN_LINE_MS = 1000;
  const LOOKOUT_LINE = 'Look out!';
  const HIT_EVENTS = ['kick', 'catch', 'knockout', 'stone', 'smash', 'burst', 'shove', 'bump'];

  function wordCount(text) {
    return (String(text || '').trim().match(/\S+/g) || []).length;
  }
  function holdFor(text) {
    return Math.max(MIN_LINE_MS, wordCount(text) * WORD_MS);
  }
  function kindOf(name) {
    if (name == null || name === '') return '';
    if (name === 'ostrich' || name === 'blue' || name === 'o1' || name === 'o2') return 'ostrich';
    if (name === 'vulture' || name === 'red' || name === 'v1' || name === 'v2') return 'vulture';
    if (name === 'hunter') return 'hunter';
    return name;
  }
  function viewerSeat(S) {
    if (!S) return '';
    return (S.h3 && S.h3.mySeat) || S.role || '';
  }
  function viewerKind(S) {
    const seat = viewerSeat(S);
    if (S.role === 'hunter' || seat === 'hunter') return S.kind || (S.h3 && S.h3.kind) || seat;
    return seat;
  }
  const fresh = (a, b) => !!(a && a.seq != null && (!b || a.seq !== b.seq));
  const pointOk = p => Array.isArray(p) && p[0] >= 0 && p[1] >= 0;
  const squaresOf = (from, to, trail, moved) => {
    if (typeof moved === 'number' && moved > 0) return moved;
    if (Array.isArray(trail) && trail.filter(pointOk).length > 1) return trail.filter(pointOk).length - 1;
    if (pointOk(from) && pointOk(to)) return Math.max(1, Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1])));
    return 0;
  };

  // One record per fresh event this view is allowed to know about (the server
  // already redacted hidden squares). Never invent a destination.
  function events(S, prev) {
    const out = [];
    if (!S || !prev || !(S.phase === 'play' || (S.phase === 'over' && prev.phase === 'play'))) return out;
    const h = S.h3 || {}, oh = prev.h3 || {};
    const k = S.kick, pk = prev.kick;
    if (fresh(k, pk)) {
      // A fully redacted trail still announces the kick; it does not play a
      // cartoon or a slide this phone cannot see (and must not pause the
      // board for a picture that never appears). Mixed visible/hidden steps
      // still use the public length so the slide duration is not a tell.
      const seen = pointOk(k.to) || (Array.isArray(k.trail) && k.trail.some(pointOk));
      out.push({
        event: 'kick', seq: k.seq, by: k.by || 'blue', who: k.who, key: k.key, target: k.target,
        trail: k.trail, to: k.to, moved: k.moved, cartoon: !!seen,
        squares: seen ? squaresOf(null, k.to, k.trail, k.moved) : 0
      });
    }
    const lc = h.lastCatch, olc = oh.lastCatch;
    if (fresh(lc, olc) && (pointOk(lc.at) || lc.ko || lc.bird)) {
      const ev = lc.ko ? 'knockout' : 'catch';
      const n = squaresOf(lc.at, lc.to, null, null);
      out.push({
        event: ev, seq: lc.seq, by: lc.by || h.kind, bird: lc.bird, at: lc.at, to: lc.to,
        walked: !!lc.walked, ambush: !!lc.ambush, ko: !!lc.ko,
        // Every phone plays the animals-only cartoon. The slide length stays 0 unless this view was sent both squares.
        cartoon: true,
        squares: ev === 'catch' && !lc.ko ? n : 0
      });
    }
    const note = S.stoneNote, pnote = prev.stoneNote;
    if (fresh(note, pnote) && (note.targets || []).length) {
      const trails = note.trails || [];
      const seen = trails.some(tr => Array.isArray(tr && tr.points) && tr.points.some(pointOk));
      const sq = seen ? (trails.reduce((m, tr) => Math.max(m, squaresOf(null, null, tr.points, 2)), 0) || 2) : 0;
      const seats = trails.map(tr => tr && tr.key).filter(Boolean);
      out.push({ event: 'stone', seq: note.seq, by: note.by || 'red', targets: note.targets.slice(), seats, cartoon: true, squares: sq });
    }
    const bn = S.bumpNote, pbn = prev.bumpNote;
    if (fresh(bn, pbn)) {
      const seen = pointOk(bn.to) || (Array.isArray(bn.trail) && bn.trail.some(pointOk));
      out.push({
        event: 'bump', seq: bn.seq, by: bn.by || 'red', target: bn.target, key: bn.key, who: 'ostrich',
        to: bn.to, trail: bn.trail, cartoon: !!seen,
        squares: seen ? squaresOf(bn.from, bn.to, bn.trail, bn.moved) : 0
      });
    }
    const sm = S.smashNote, psm = prev.smashNote;
    if (fresh(sm, psm)) {
      out.push({ event: 'smash', seq: sm.seq, by: sm.by || 'red', owner: sm.owner, cartoon: true, squares: 0 });
    }
    const b = h.burst, pb = oh.burst;
    if (fresh(b, pb) && (pointOk(b.to) || (b.trail && b.trail.length) || b.n)) {
      out.push({ event: 'burst', seq: b.seq, by: 'badger', n: b.n, to: b.to, trail: b.trail, cartoon: true, squares: squaresOf(b.at, b.to, b.trail, b.n) });
    }
    const rv = h.rival, prv = oh.rival;
    if (fresh(rv, prv) && (pointOk(rv.to) || (rv.trail && rv.trail.length))) {
      const by = rv.by, target = by === 'hyena' ? 'badger' : 'hyena';
      out.push({ event: 'shove', seq: rv.seq, by, target, to: rv.to, trail: rv.trail, cartoon: true, squares: squaresOf(rv.at, rv.to, rv.trail, 2) });
    }
    return out;
  }

  function sameBeing(S, name) {
    if (name == null || name === '') return false;
    const seat = viewerSeat(S), kind = viewerKind(S), role = S.role;
    if (seat === name || role === name || kind === name) {
      // Keep going: a 2v2 teammate also has role "red"/"blue" and kind ostrich/vulture.
    }
    // In 2v2 / 5p, o1 and o2 (or v1 and v2) are different birds. Never treat a
    // teammate as the one who was hit just because they share a kind or color.
    const teamish = !!(S.team || (S.h3 && S.h3.team) || /^(o[12]|v[12])$/.test(seat) || /^(o[12]|v[12])$/.test(name));
    if (teamish) {
      if (seat === name) return true;
      if ((seat === 'hunter' || role === 'hunter') && (name === 'hunter' || name === kind)) return true;
      return false;
    }
    if (seat === name || role === name || kind === name) return true;
    const a = kindOf(seat), b = kindOf(name), c = kindOf(kind);
    if (a && a === b) return true;
    if (c && c === b) return true;
    if ((role === 'hunter' || seat === 'hunter') && (name === 'hyena' || name === 'badger' || name === 'hunter')) {
      if (name === 'hunter') return true;
      return kind === name;
    }
    return false;
  }

  function isAffected(S, ev) {
    if (!S || !ev) return false;
    const seat = viewerSeat(S), kind = viewerKind(S);
    if (ev.event === 'kick') {
      if (ev.key && sameBeing(S, ev.key)) return true;
      if (ev.target && sameBeing(S, ev.target)) return true;
      if (ev.who && sameBeing(S, ev.who)) return true;
      return false;
    }
    if (ev.event === 'catch' || ev.event === 'knockout') return sameBeing(S, ev.bird);
    if (ev.event === 'stone') return (ev.seats || []).concat(ev.targets || []).some(t => sameBeing(S, t));
    if (ev.event === 'bump') return sameBeing(S, ev.target) || sameBeing(S, ev.key);
    if (ev.event === 'smash') {
      if (ev.owner && seat === ev.owner) return true;
      // 2v2 / 5p: only the exact owner, never the teammate.
      const team = !!(S.team || (S.h3 && S.h3.team) || /^(o[12]|v[12])$/.test(seat));
      if (team) return false;
      // classic 3p / 2p: the ostrich owns the eggs; owner may be omitted for non-blue views
      if (S.role === 'blue' && (!ev.owner || ev.owner === 'blue' || ev.owner === 'ostrich')) return true;
      return false;
    }
    if (ev.event === 'burst') return sameBeing(S, 'hyena');
    if (ev.event === 'shove') return sameBeing(S, ev.target);
    return false;
  }

  function isActor(S, ev) {
    if (!S || !ev) return false;
    if (ev.event === 'kick') return sameBeing(S, ev.by || 'blue');
    if (ev.event === 'catch' || ev.event === 'knockout') return sameBeing(S, ev.by) || (S.role === 'hunter' && kindOf(ev.by) === kindOf(viewerKind(S)));
    if (ev.event === 'stone' || ev.event === 'smash' || ev.event === 'bump') return sameBeing(S, ev.by || 'red');
    if (ev.event === 'burst') return sameBeing(S, 'badger');
    if (ev.event === 'shove') return sameBeing(S, ev.by);
    return false;
  }

  // Look out! is only for the affected player, only after the action is committed
  // (this runs on a received state). It is the same 1s beat for a hidden ambush
  // and a catch in the open, so its presence is not a tell. It never plays for
  // the actor or a bystander, and never while someone is still choosing a move.
  // Skipped on purpose (listed in the PR report): dug-in, pop-out, sniff, found
  // egg, starvation, a cold egg — those are not a sudden hit from someone else,
  // and a 1s beat there could leak or confuse.
  function shouldLookOut(S, ev) {
    if (!ev || HIT_EVENTS.indexOf(ev.event) < 0) return false;
    return isAffected(S, ev) && !isActor(S, ev);
  }

  function catchText() {
    if (root.CatchText) return root.CatchText;
    if (typeof require === 'function') {
      try { return require('./catchtext'); } catch (e) { return null; }
    }
    return null;
  }
  // The sentence this phone already shows for the hit. Existing lines only.
  function lineFor(S, ev) {
    const CT = catchText();
    if (!CT || !S || !ev) return '';
    try {
      if (ev.event === 'kick') return CT.viewerEvent({ kind: 'kick', text: '' }, S) || '';
      if (ev.event === 'catch' || ev.event === 'knockout') {
        const h = S.h3 || {}, lc = h.lastCatch;
        if (!lc) return '';
        return CT.catchLine(lc, viewerSeat(S), lc.by || h.kind, CT.catchesLeft(h, lc)) || '';
      }
      if (ev.event === 'stone') return CT.viewerEvent({ kind: 'stone', text: (S.stoneNote && S.stoneNote.text) || '' }, S) || '';
      if (ev.event === 'bump') return CT.viewerEvent({ kind: 'bump', text: '' }, S) || '';
      if (ev.event === 'smash') return CT.viewerEvent({ kind: 'smash', text: '' }, S) || '';
      if (ev.event === 'burst') return CT.viewerEvent({ kind: 'burst', text: '' }, S) || '';
      if (ev.event === 'shove') return CT.viewerEvent({ kind: 'rival', text: '' }, S) || '';
    } catch (e) { return ''; }
    return '';
  }
  // A watcher may slide a hunter only while that hunter is still in this view.
  // kick.to and the hunter lists are already limited to sight (server trailView).
  function hunterStillSeen(S, ev) {
    const who = ev && ev.who;
    if (who !== 'hyena' && who !== 'badger' && who !== 'hunter') return true;
    const k = S && S.kick;
    if (k && pointOk(k.to)) return true;
    const h = (S && S.h3) || {};
    if (pointOk(h.hunter) && (!h.kind || h.kind === who || who === 'hunter')) return true;
    return (h.hunters || []).some(x => x && x.kind === who && pointOk(x.p) && !(who === 'badger' && x.burrowed));
  }
  function animMs(ev, role) {
    if (!ev) return 0;
    const look = (role === 'affected' && ev.lookout) ? LOOKOUT_MS : 0;
    const cartoon = role === 'watcher' ? 0 : (ev.cartoon ? CARTOON_MS : 0);
    const motion = Math.max(0, ev.squares || 0) * STEP_MS;
    return look + cartoon + motion;
  }

  function policy(S, prev) {
    const evs = events(S, prev);
    if (!evs.length) return null;
    // If several fire together (a stone that also smashes), give the affected
    // player the strongest treatment once, using the longest motion.
    let pick = evs[0];
    let affected = false, actor = false, lookout = false;
    for (const ev of evs) {
      const a = isAffected(S, ev), c = isActor(S, ev), lo = shouldLookOut(S, ev);
      ev.lookout = lo;
      if (a) affected = true;
      if (c) actor = true;
      if (lo) lookout = true;
      if ((a && !isAffected(S, pick)) || (ev.squares || 0) > (pick.squares || 0) || (ev.cartoon && !pick.cartoon)) pick = ev;
    }
    pick.lookout = lookout;
    // A watcher is neither the kicker nor the animal that was hit. Their kick
    // slide starts with the board, not after the cartoon. If the hunter is
    // already outside this phone's sight, there is no slide and no "near" line.
    const watchKick = pick.event === 'kick' && !affected && !actor;
    const skipSlide = watchKick && !hunterStillSeen(S, pick);
    const showCartoon = !!pick.cartoon && !watchKick;
    const motionDelay = (lookout ? LOOKOUT_MS : 0) + (showCartoon ? CARTOON_MS : 0);
    const motionMs = skipSlide ? 0 : Math.max(0, pick.squares || 0) * STEP_MS;
    const animation = motionDelay + motionMs;
    const line = affected ? lineFor(S, pick) : '';
    const readMs = affected ? holdFor(line) : 0;
    return {
      ev: pick,
      events: evs,
      affected,
      actor,
      bystander: !affected && !actor,
      lookout,
      watchSlide: watchKick && !skipSlide,
      skipSlide,
      skipNear: skipSlide,
      line,
      readMs,
      // The result line is spoken after Look out!, so this hold is the cartoon,
      // the slide, and the reading pause. It does not include the 1s beat.
      lineHold: affected ? ((showCartoon ? CARTOON_MS : 0) + motionMs + readMs) : null,
      motionDelay,
      motionMs,
      animMs: animation,
      lookoutLine: LOOKOUT_LINE
    };
  }

  // True when this phone must not play a kick slide: a watcher whose view no
  // longer contains the hunter. Uses only the redacted view.
  function skipKickSlide(S, prev) {
    const pol = policy(S, prev);
    return !!(pol && pol.skipSlide);
  }

  // How long the server should wait before starting the current player's 10s
  // clock. Bots: 0. A player who cannot see the event: 0. The affected current
  // player: the animation plus the reading pause, so the clock never runs while
  // they are still watching. Anyone else who sees it: the animation plus the
  // one-second line floor.
  function clockDelayMs(pol, opts) {
    opts = opts || {};
    if (!pol) return 0;
    if (opts.isBot) return 0;
    if (!opts.seesEvent && !pol.affected) return 0;
    if (opts.isCurrent && pol.affected) return pol.animMs + (pol.readMs || 0);
    if (opts.isCurrent) return pol.animMs + MIN_LINE_MS;
    return 0;
  }

  const api = {
    LOOKOUT_MS, CARTOON_MS, STEP_MS, WORD_MS, MIN_LINE_MS,
    LOOKOUT_LINE, HIT_EVENTS,
    wordCount, holdFor, kindOf, viewerSeat, viewerKind, events, isAffected, isActor,
    shouldLookOut, animMs, policy, clockDelayMs, squaresOf, lineFor, skipKickSlide, hunterStillSeen
  };
  if (typeof module !== 'undefined') module.exports = api;
  root.SURPRISE = api;
})(typeof window === 'undefined' ? globalThis : window);
