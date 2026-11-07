// Words for a catch, one place, for every mode (3-player, 2 vs 2, Hunters). Works in the browser (window.CatchText) and in Node.
// Rules live in three.js / hunt.js / team.js; this only turns a lastCatch into a sentence. The numbers come from the rules, never typed here.
(function () {
  const isVulture = b => b === 'red' || b === 'v1' || b === 'v2';
  const birdWord = b => isVulture(b) ? 'vulture' : 'ostrich';
  const hunterWord = k => k === 'badger' || k === 'honey badger' ? 'honey badger' : 'hyena';
  const SEAT = { o1: 'Ostrich 1', o2: 'Ostrich 2', v1: 'Vulture 1', v2: 'Vulture 2' };
  const more = n => n === 1 ? 'one more catch' : n + ' more catches';
  // catches still left before the caught bird is out: the knock-out count from the view (h3.ko is a number, or {hyena, badger} in Hunters mode)
  // minus the catches the view says this bird has taken
  function catchesLeft(h3, lc) {
    const ko = typeof h3.ko === 'object' ? h3.ko[lc.by || h3.kind || 'hyena'] : h3.ko;
    const b = h3.birds && h3.birds[lc.bird];
    return Math.max(0, ko - (b ? b.catches : 0));
  }
  // viewer: your seat ('blue', 'red', 'o1'..'v2', 'hunter', 'hyena', 'badger'). kind: 'hyena' or 'badger', the animal that made the catch.
  // catchesLeft: catches the caught bird can still take after this one (ignored when lastCatch.ko).
  function catchLine(lc, viewer, kind, left) {
    const hunter = hunterWord(kind || lc.by), bird = birdWord(lc.bird);
    if (viewer === lc.bird) {
      const line = lc.ko ? `The ${hunter} knocked you out.` : `The ${hunter} caught you! Hurt: ${more(left)} and you're out.`;
      return lc.walked ? `You walked into the hidden ${hunter}! ${line}` : line;
    }
    if (viewer === 'hunter' || (lc.by && viewer === lc.by))
      return lc.ko ? `${bird[0].toUpperCase() + bird.slice(1)} knocked out!` : `Caught the ${bird}! ${left === 1 ? 'One more catch knocks' : left + ' more catches knock'} it out.`;
    return `The ${hunter} ${lc.ko ? 'knocked out' : 'caught'} the ${bird}.`;
  }
  // banner for a bird that is out ("The ostrich is out."; in 2 vs 2 the seat name: "Ostrich 1 is out.")
  const outLine = b => SEAT[b] ? `${SEAT[b]} is out.` : `The ${birdWord(b)} is out.`;
  // Big events other than catches, said to every player. Where they happened is shown only to a player who can see that square.
  const popOutLine = () => 'The honey badger came out of its burrow!';
  function rivalLine(rv) {
    const n = rv.n || 2;
    return rv.by === 'badger' ? `The honey badger ran into the hyena. Nobody is hurt. The hyena slid back ${n} squares.`
      : `The hyena ran into the honey badger. Nobody is hurt. The hyena slid back ${n} squares.`;
  }
  // The big-event lines this phone has not announced yet. seen remembers the last seq of each event ({ pop: 0, rival: 0 }, one per page).
  // A page opened mid-game (prev is null) learns where the counters are and says nothing; a new game (setup phase) starts the counters over.
  // Each item: { kind, text, square } where square is a place on the board and is null unless the view carried one (the server sends it only to a player who can see it).
  function newEvents(seen, S, prev) {
    const out = [], h = (S && S.h3) || {};
    if (!S) return out;
    if (S.phase && S.phase.startsWith('setup')) { seen.pop = seen.rival = 0; return out; }
    const po = h.popout, rv = h.rival;
    if (po && po.seq !== seen.pop) { seen.pop = po.seq; if (prev) out.push({ kind: 'popout', text: popOutLine(), seen: !!po.seen }); }
    if (rv && rv.seq !== seen.rival) { seen.rival = rv.seq; if (prev) out.push({ kind: 'rival', text: rivalLine(rv), square: rv.to || null }); }
    return out;
  }
  const API = { catchLine, catchesLeft, outLine, popOutLine, rivalLine, newEvents };
  if (typeof module !== 'undefined') module.exports = API; else window.CatchText = API;
})();
