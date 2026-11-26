// Words for a catch, one place, for every mode (3-player, 2 vs 2, Hunters). Works in the browser (window.CatchText) and in Node.
// Rules live in three.js / hunt.js / team.js; this only turns a lastCatch into a sentence. The numbers come from the rules, never typed here.
(function () {
  const isVulture = b => b === 'red' || b === 'v1' || b === 'v2';
  const birdWord = b => isVulture(b) ? 'vulture' : b==='o1'?'Ostrich 1':b==='o2'?'Ostrich 2':'ostrich';
  const birdObject=b=>/^o[12]$/.test(b)?birdWord(b):'the '+birdWord(b);
  const hunterWord = k => k === 'badger' ? 'badger' : 'hyena';
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
  // A catch is one short sentence. The badger's saying, if any, is its own line.
  function catchLine(lc, viewer, kind, left) {
    if(!lc.ko){
      if(viewer===lc.bird){const n=lc.at&&lc.to?Math.max(Math.abs(lc.to[0]-lc.at[0]),Math.abs(lc.to[1]-lc.at[1])):0;return `You were caught and fled ${n} square${n===1?'':'s'}.`;}
      return `The ${hunterWord(kind||lc.by)} caught ${birdObject(lc.bird)}!`;
    }
    return baseLine(lc, viewer, kind, left);
  }
  function baseLine(lc, viewer, kind, left) {
    const hunter = hunterWord(kind || lc.by), bird = birdWord(lc.bird);
    if (viewer === lc.bird) {
      const line = lc.ko ? `The ${hunter} knocked you out.` : left === 1 ? "One more catch and you're out." : `${more(left)} and you're out.`;
      return lc.walked && !lc.ko ? `A hidden ${hunter} caught you!` : line;
    }
    if (viewer === 'hunter' || (lc.by && viewer === lc.by))
      return lc.ko ? `${bird[0].toUpperCase() + bird.slice(1)} knocked out!` : `Caught the ${bird}!`;
    return `The ${hunter} ${lc.ko ? 'knocked out' : 'caught'} ${birdObject(lc.bird)}.`;
  }
  // banner for a bird that is out ("The ostrich is out."; in 2 vs 2 the seat name: "Ostrich 1 is out.")
  const outLine = b => SEAT[b] ? `${SEAT[b]} is out.` : `The ${birdWord(b)} is out.`;
  // Big events other than catches, said to every player (where they happened is shown only to a player who can see that square).
  const kickWho = w => w === 'vulture' ? 'vulture' : hunterWord(w);
  function kickLine(who, moved, push) {
    const n = moved == null ? push : moved;
    if (n === 0) return 'Kick blocked.';
    return `Ostrich kicked the ${kickWho(who)} ${n} square${n === 1 ? '' : 's'} away.`;
  }
  const dugLine = () => 'The badger dug in!';
  const burstLine = b => `The badger burst out and shoved the hyena ${b.n} square${b.n === 1 ? '' : 's'}!`;
  const popOutLine = () => 'Badger popped up!';
  function rivalLine(rv) {
    return rv.by === 'badger' ? 'The badger shoved the hyena!' : 'The hyena shoved the badger!';
  }
  // The big-event lines this phone has not announced yet. seen remembers the last seq of each event ({ pop: 0, rival: 0 }, one per page).
  // A page opened mid-game (prev is null) learns where the counters are and says nothing; a new game (setup phase) starts the counters over.
  // Each item: { kind, text, square } where square is a place on the board and is null unless the view carried one (the server sends it only to a player who can see it).
  function newEvents(seen, S, prev) {
    const out = [], h = (S && S.h3) || {};
    if (!S) return out;
    if (S.phase && S.phase.startsWith('setup')) { seen.pop = seen.rival = seen.kick = seen.stone = seen.dug = seen.burst = seen.smash = seen.double = seen.lastMove = seen.time = seen.carry = 0; return out; }
    const po = h.popout, rv = h.rival, k = S.kick;
    if(S.smashNote&&S.smashNote.seq!==seen.smash){seen.smash=S.smashNote.seq;if(prev)out.push({kind:'smash',text:'The vulture smashed an egg.'});}
    const la=S.lastAction;if(prev&&h.team&&S.role==='red'&&la&&la.type==='fly'&&la.spotted&&la.seat!==h.mySeat&&JSON.stringify(la)!==JSON.stringify(prev.lastAction))out.push({kind:'teamFound',text:`${SEAT[la.seat]} found an egg.`});
    if (k && k.seq !== seen.kick) { seen.kick = k.seq; if (prev) out.push({ kind: 'kick', text: kickLine(k.who, k.moved, S.cfg && S.cfg.kickPush), square: k.to || null }); }
    const dn = h.doubleNote;
    if (dn && dn.seq !== seen.double) { seen.double = dn.seq; if (prev && dn.text) out.push({ kind: 'double', text: dn.text }); }
    for (const key of ['lastMove', 'time', 'carry']) { const n = S[key + 'Note']; if (n && n.seq !== seen[key]) { seen[key] = n.seq; if (prev && n.text) out.push({ kind: key, text: n.text }); } }
    if (S.stoneNote && S.stoneNote.seq !== seen.stone) { seen.stone = S.stoneNote.seq; if (prev) out.push({ kind: 'stone', text: S.stoneNote.text }); }
    if (h.dug && h.dug.seq !== seen.dug) { seen.dug = h.dug.seq; if (prev) out.push({ kind: 'dug', text: h.dugSeen ? 'A bird saw you dig in.' : dugLine() }); } // the server sends dug only to the badger and to a bird that saw the dig (Brian, 2026-11-16); the badger's phone is told when a bird saw it (Brian, 2026-11-15)
    if (h.burst && h.burst.seq !== seen.burst) { seen.burst = h.burst.seq; if (prev) out.push({ kind: 'burst', text: burstLine(h.burst), square: h.burst.to || null }); }
    if (po && po.seq !== seen.pop) { seen.pop = po.seq; if (prev) out.push({ kind: 'popout', text: popOutLine(), seen: !!po.seen }); }
    if (rv && rv.seq !== seen.rival) { seen.rival = rv.seq; if (prev) out.push({ kind: 'rival', text: rivalLine(rv), square: rv.to || null }); }
    return out;
  }
  // Approved interaction wording; numbered kickback and vulture-target kick extensions remain drafts.
  function viewerEvent(e,S) {
    const h=S.h3||{},seat=h.mySeat||S.role,viewer=S.role==='hunter'?(S.kind||h.kind||seat):seat;
    const name=x=>SEAT[x]?SEAT[x].toLowerCase():x==='blue'?'ostrich':x==='red'?'vulture':x;
    if(e.kind==='smash'){const n=S.smashNote;if(seat===n.by)return 'You smashed an egg!';if(S.role==='blue'&&seat===n.owner||S.role==='blue'&&!h.team)return 'The vulture smashed your egg!';if(h.team&&SEAT[n.owner])return `The vulture smashed ${SEAT[n.owner]}'s egg!`;return 'The vulture smashed an egg.';}
    if(e.kind==='double') return e.text;
    if(e.kind==='kick') {const k=S.kick,n=k.moved==null?(S.cfg||{}).kickPush:k.moved,who=kickWho(k.who),unit=n===1?'square':'squares';
      if(n===0)return e.text;
      if(seat===(k.by||'blue'))return `You kicked the ${who} ${n} ${unit}!`;
      if(viewer===(k.target|| (who==='vulture'?'red':who)))return `${SEAT[k.by]||'The ostrich'} kicked you ${n} ${unit}!`;
      return `${SEAT[k.by]||'The ostrich'} kicked the ${who} ${n} ${unit}!`; // Approved hunter-target watcher line; vulture-target variants remain draft.
    }
    if(e.kind==='stone'&&S.stoneNote&&SEAT[S.stoneNote.kicker]&&/^The ostrich (kicked the stone|bounced it back)/.test(e.text))return e.text.replace('The ostrich',SEAT[S.stoneNote.kicker]);
    if(e.kind==='stone'&&S.stoneNote&&S.stoneNote.targets&&S.stoneNote.targets.length) {
      const n=S.stoneNote,targets=n.targets.join(' and the ');
      if(seat===n.by)return `Your stone hit the ${targets}!`;
      if(n.targets.includes(viewer))return 'A stone hit you!';
      return `${SEAT[n.by]||'The vulture'}'s stone hit the ${targets}!`;
    }
    if(e.kind==='rival') {const by=h.rival.by,other=by==='hyena'?'badger':'hyena';
      if(viewer===by)return `You shoved the ${other}!`;
      if(viewer===other)return `The ${by} shoved you!`;
      return `The ${by} shoved the ${other}!`;
    }
    if(e.kind==='burst') {
      if(viewer==='badger')return `You burst out and shoved the hyena ${h.burst.n} square${h.burst.n===1?'':'s'}!`;
      if(viewer==='hyena')return `The badger burst out and shoved you ${h.burst.n} square${h.burst.n===1?'':'s'}!`;
    }
    return e.text;
  }
  // Good or bad news for the phone holding this phone, never for "who the sentence says you" about (news.css gives the colors).
  // Returns 'good', 'bad' or 'plain'. It reads who did what from the same state the words come from, so it never guesses from the wording.
  const sideOfSeat = s => /^(blue|o1|o2)$/.test(s) ? 'ostrich' : /^(red|v1|v2)$/.test(s) ? 'vulture' : 'hunter';
  const viewerOf = S => { const h = S.h3 || {}, seat = h.mySeat || S.role; return { seat, kind: S.role === 'hunter' ? (S.kind || h.kind || seat) : seat }; };
  // The line above the board for a catch. viewer is your seat, as for catchLine.
  function catchTone(lc, viewer) {
    if (viewer === lc.bird) return 'bad';
    if (viewer === 'hunter' || (lc.by && viewer === lc.by)) return 'good';
    if (sideOfSeat(viewer) === sideOfSeat(lc.bird) && sideOfSeat(viewer) !== 'hunter') return 'bad'; // the caught bird's partner
    if (sideOfSeat(viewer) === 'hunter') return 'bad'; // the other hunter got a catch you did not
    return 'plain';
  }
  // "The ostrich is out." is said to everyone but the bird itself.
  function outTone(bird, S) {
    const me = viewerOf(S).seat;
    if (sideOfSeat(me) === 'hunter') return 'good';
    return sideOfSeat(me) === sideOfSeat(bird) ? 'bad' : 'plain';
  }
  const STONE_BACK = /^(The ostrich|Ostrich \d) kicked the stone right back!/, STONE_BOUNCE = /^(The stone bounced off the leaf\.|The vulture batted it away with a rock\.)/, STONE_DEAD = /^(The stone landed softly in the leaves\.|The stone clattered back onto the rock pile\.)/;
  function eventTone(e, S) {
    const h = S.h3 || {}, v = viewerOf(S), seat = v.seat, viewer = v.kind, side = sideOfSeat(seat);
    if (e.kind === 'smash') return side === 'ostrich' ? 'bad' : side === 'vulture' ? 'good' : 'plain';
    if (e.kind === 'kick') {
      const k = S.kick, n = k.moved == null ? (S.cfg || {}).kickPush : k.moved, who = kickWho(k.who);
      if (n === 0) return seat === (k.by || 'blue') ? 'bad' : 'plain';
      if (seat === (k.by || 'blue')) return 'good';
      if (viewer === (k.target || (who === 'vulture' ? 'red' : who))) return 'bad';
      return 'plain';
    }
    if (e.kind === 'stone') {
      const n = S.stoneNote || {};
      if (n.targets && n.targets.length) { if (seat === n.by) return 'good'; if (n.targets.includes(viewer)) return 'bad'; return side === 'vulture' ? 'good' : 'plain'; }
      const t = n.text || e.text || '';
      if (STONE_BACK.test(t)) return side === 'ostrich' ? 'good' : side === 'vulture' ? 'bad' : 'plain';
      if (STONE_BOUNCE.test(t)) return side === 'vulture' ? 'bad' : side === 'ostrich' ? 'good' : 'plain';
      if (STONE_DEAD.test(t)) return side === 'vulture' ? 'bad' : 'plain';
      return 'plain';
    }
    if (e.kind === 'rival') { const by = h.rival.by, other = by === 'hyena' ? 'badger' : 'hyena'; return viewer === by ? 'good' : viewer === other ? 'bad' : 'plain'; }
    if (e.kind === 'burst') return viewer === 'badger' ? 'good' : viewer === 'hyena' ? 'bad' : 'plain';
    if (e.kind === 'popout') return side === 'hunter' ? 'plain' : 'bad';
    if (e.kind === 'dug') return h.dugSeen ? 'bad' : 'plain';
    if (e.kind === 'teamFound') return 'good';
    // Brian, 2026-11-25: the player whose clock ran out is told "Out of time." (red); every other phone gets "Time's up. Turn skipped." (navy).
    if (e.kind === 'time') return e.text === 'Out of time.' ? 'bad' : 'plain';
    return 'plain'; // double, last move, carry: facts, not good or bad
  }
  const API = { catchLine, catchesLeft, outLine, kickLine, dugLine, burstLine, popOutLine, rivalLine, newEvents, viewerEvent, catchTone, outTone, eventTone };
  if (typeof module !== 'undefined') module.exports = API; else window.CatchText = API;
})();
