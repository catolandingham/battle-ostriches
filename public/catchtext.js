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
  // A catch by the honey badger ends with one of its quotes, said to every player who sees the catch (the words live in badgerlines.js):
  // out of the burrow (lc.ambush), a bird that walked onto it (lc.walked), or a catch in the open.
  const BL = typeof module !== 'undefined' ? require('./badgerlines.js') : window.BadgerLines;
  function catchLine(lc, viewer, kind, left) {
    const line = baseLine(lc, viewer, kind, left);
    return hunterWord(kind || lc.by) === 'honey badger' ? line + ' ' + BL.catchTail(lc) : line;
  }
  function baseLine(lc, viewer, kind, left) {
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
  const API = { catchLine, catchesLeft, outLine };
  if (typeof module !== 'undefined') module.exports = API; else window.CatchText = API;
})();
