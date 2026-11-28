// "Did you know?" hints: a short card that shows the first time a new action or rule matters during your turn.
// Built on the existing just-in-time tips (tutorial.js TUT.tip): same once-only localStorage habit, same bo_tips_off master switch,
// the six old tips it covers (kick, warm, food, carry, sniff, throwtip) are handed over to it while hints are on, and every older tip follows the switch.
// All player-facing words are in the TABLE below (one line each).
// Numbers are never typed here: they come from the rules (state.rules, state.cfg), the same numbers the role card uses.
// Stacking (PR #96): above bubbles (300), below cutaways (400), so it sits at 350.
// Never shows to a computer player (a computer has no phone). In Pass & Play it shows on the phone in hand.
(function (root) {
  const SEEN = 'bo_hint_';            // + animal + '_' + id   (one per hint per animal)
  const DONE = 'bo_hints_done_';      // + animal              (a game finished in that role)
  const SWITCH = 'bo_hints';          // 'on' | 'off' | unset (unset = on for a new player, off after the first finished game)
  const TIPS_OFF = 'bo_tips_off';     // the master switch the older tips already obey
  const SHOW_MS = 15000;              // a hint leaves by itself after this long
  const OLD_TIPS = ['kick', 'warm', 'food', 'carry', 'sniff', 'throwtip'];

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  // ---- the numbers and positions every trigger reads ----
  const cheb = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
  const key = p => p[0] + ',' + p[1];
  const valid = p => Array.isArray(p) && p[0] >= 0 && p[1] >= 0;
  function modeOf(S) {
    const h = S.h3 || {};
    return !S.three ? '2' : h.team ? String(h.n || 4) : h.hunt ? '4h' : '3';
  }
  function ctxOf(S) {
    if (!S || !S.rules || !root.Roles) return null;
    const h = S.h3 || {}, kind = S.role === 'hunter' ? (S.kind || h.kind) : h.kind;
    const animal = root.Roles.animal(h.mySeat || S.role, kind);
    if (!animal) return null;
    const mode = modeOf(S), R = S.rules, c = R.cfg, m = (R.modes && R.modes[mode]) || {};
    const me = animal === 'ostrich' ? S.ostrich : animal === 'vulture' ? S.vulture : (S.hunter || null);
    return { S, h, animal, kind, mode, c, m, me: valid(me) ? me : null, cfg: S.cfg || {}, ko: (m.ko && (m.ko[animal] || m.ko.hyena)) || 0 };
  }
  const sq = n => n === 1 ? '1 square' : n + ' squares';
  // hunters the player can see right now: [{p, kind}]
  function seenHunters(x) {
    const h = x.h, out = [];
    if (Array.isArray(h.hunters)) h.hunters.forEach(q => { if (q && !q.me && valid(q.p)) out.push({ p: q.p, kind: q.kind }); });
    else if (valid(h.hunter)) out.push({ p: h.hunter, kind: h.kind || 'hunter' });
    return out;
  }
  const wrecked = S => Object.keys(S.marks || {}).some(k => S.marks[k] === 'hit' || S.marks[k] === 'stone');
  const eggsOff = (x, mine) => (x.S.eggs || []).filter(e => e && e.alive && !e.carried && valid(e.pos) && (!x.me || key(e.pos) !== key(x.me)) && (mine ? e.mine !== false : e.mine === false));
  const dom = sel => typeof document !== 'undefined' && !!document.querySelector(sel);
  const mateOf = seat => ({ o1: 'o2', o2: 'o1', v1: 'v2', v2: 'v1' })[seat] || null;
  const AIRY = ['ostrich', 'vulture', 'hyena', 'badger'], BIRDS = ['ostrich', 'vulture'], HUNT = ['hyena', 'badger'];
  const cooling = x => Math.ceil(x.c.warmth / 2);

  // ---- THE TABLE: one row per hint. animal, id, when(x) is the trigger, text(x) is the line. ----
  // Order is priority: the first row that is true and not yet seen is the one shown (at most one per turn).
  // Approved by Snack Quest Chat on Brian's say-so, 2026-11-27 ('push ahead and make decisions and merge'); Brian has not read them yet.
  // A wording change is a one-line edit here.
  const TABLE = [
    // Ostrich (classic, 3 players, Hunters, and each ostrich in the team modes)
    { animal: 'ostrich', id: 'kick', when: x => !!(x.S.can && x.S.can.kick),
      text: x => `Did you know? As the Ostrich, you can kick an animal that's 1 square away. Tap Kick to push it ${sq(x.c.kick)}${x.mode === '4h' || x.kind === 'badger' ? ` (${x.c.kickBadger} for a badger)` : ''}.` },
    { animal: 'ostrich', id: 'hunter', when: x => x.mode !== '2' && x.mode !== '4' && seenHunters(x).length > 0,
      text: x => `Did you know? You only see a hunter within ${sq(x.m.see || 2)}. If it lands on your square it catches you, and ${x.ko} catches knock you out.` },
    { animal: 'ostrich', id: 'caught', when: x => !!(x.h.lastCatch && x.h.lastCatch.bird === (x.h.mySeat || x.S.role)),
      text: x => `Did you know? When a hunter catches you, you are set down ${sq(x.cfg.scramble || 3)} away and keep your turn. ${x.ko} catches knock you out.` },
    { animal: 'ostrich', id: 'cool', when: x => eggsOff(x, true).some(e => e.coldIn <= cooling(x)),
      text: x => `Did you know? An egg goes cold if you don't stand on it for ${x.c.warmth} rounds. The number on an egg is how many rounds it has left. Walk back to warm it.` },
    { animal: 'ostrich', id: 'mateCool', when: x => !!(x.h.team && eggsOff(x, false).some(e => e.coldIn <= cooling(x))),
      text: x => `Did you know? You can warm your teammate's eggs too. Stand on one before its number runs out.` },
    { animal: 'ostrich', id: 'food', when: x => x.S.hungerLeft <= Math.ceil(x.c.food / 2),
      text: x => `Did you know? You must step on a leaf every ${x.c.food} turns or you starve. You have ${x.S.hungerLeft} turns left.` },
    { animal: 'ostrich', id: 'found', when: x => (x.S.eggs || []).some(e => e && e.alive && valid(e.pos) && x.S.marks && x.S.marks[key(e.pos)] === 'spotted'),
      text: x => `Did you know? A filled egg means the vulture found it. It stays found until you carry it to a new square.` },
    { animal: 'ostrich', id: 'carry', when: x => !!(x.S.onEgg && x.S.can && x.S.can.carry),
      text: x => `Did you know? You can carry an egg ${sq(x.c.carryWalk)} to hide it somewhere new. Tap Carry, then a square.` },
    { animal: 'ostrich', id: 'sit', when: x => !!(x.S.onEgg && x.S.can && x.S.can.sit),
      text: x => `Did you know? Tap Sit to stay on your egg and keep it warm. Anyone who can see you can see you sitting.` },
    { animal: 'ostrich', id: 'bounce', when: x => valid(x.S.vulture) && x.me && cheb(x.me, x.S.vulture) <= x.c.throwRange,
      text: x => `Did you know? A stone thrown at your square is kicked back at the vulture. Eggs on the squares next to you are not protected.` },

    // Vulture (classic, 3 players, Hunters, and each vulture in the team modes)
    { animal: 'vulture', id: 'fly', when: x => !!(x.S.fly && x.S.fly.length),
      text: x => `Did you know? Tap a square to fly up to ${sq(x.c.fly)}. Every landing sniffs for an egg ${sq(x.c.smell)} away.` },
    { animal: 'vulture', id: 'sniff', when: x => !!x.S.sniff,
      text: x => `Did you know? "Egg nearby" means an egg is within ${sq(x.c.smell)} of where you landed, but not which square. A dashed egg marks where one may be.` },
    { animal: 'vulture', id: 'mateSniff', when: x => !!(x.h.team && x.h.mateSniff),
      text: x => `Did you know? You and your teammate share every sniff. Your teammate's answer shows on your board too.` },
    { animal: 'vulture', id: 'onEgg', when: x => !!(x.me && x.S.marks && x.S.marks[key(x.me)] === 'spotted' && x.S.stones > 0),
      text: x => `Did you know? Landing on an egg finds it. Tap Throw on your own square to smash it.` },
    { animal: 'vulture', id: 'throw', when: x => x.S.stones > 0 && !!(x.S.throw && x.S.throw.length),
      text: x => `Did you know? Tap Throw to drop your stone on your square or ${sq(x.c.throwRange)} away. It wrecks the square and smashes any egg there.` },
    { animal: 'vulture', id: 'noStone', when: x => x.S.stones < 1,
      text: x => `Did you know? You are out of stones. Land on a rock pile to pick up another.` },
    { animal: 'vulture', id: 'kicked', when: x => !!(x.me && valid(x.S.ostrich) && cheb(x.me, x.S.ostrich) <= 1),
      text: x => `Did you know? An ostrich next to you can kick you ${sq(x.c.kick)} straight away from it. Fly out of its reach if you can.` },
    { animal: 'vulture', id: 'hunter', when: x => x.mode !== '2' && x.mode !== '4' && seenHunters(x).length > 0,
      text: x => `Did you know? You only see a hunter within ${sq(x.m.see || 2)}. If it lands on your square it catches you, and ${x.ko} catches knock you out.` },
    { animal: 'vulture', id: 'caught', when: x => !!(x.h.lastCatch && x.h.lastCatch.bird === (x.h.mySeat || x.S.role)),
      text: x => `Did you know? When a hunter catches you, you are set down ${sq(x.cfg.scramble || 3)} away and keep your turn. ${x.ko} catches knock you out.` },
    { animal: 'vulture', id: 'eat', when: x => x.S.hungerLeft <= Math.ceil(x.c.food / 2),
      text: x => `Did you know? The ostrich starves if it does not eat every ${x.c.food} turns. The leaf number at the top is its turns left.` },

    // Hyena and Badger (3 players, Hunters, 2 vs 2 + hunter)
    { animal: 'hyena', id: 'walk', when: x => !!(x.S.hmoves && x.S.hmoves.length),
      text: x => `Did you know? Tap a square to walk up to ${sq(x.m.walk || 2)}. Land on a bird and you catch it. ${x.ko} catches knock a bird out.` },
    { animal: 'hyena', id: 'sense', when: x => x.S.sense != null,
      text: x => `Did you know? Each time you move you learn yes or no: is a bird within ${sq(x.S.senseRange || x.m.sense || 2)}? It does not say which way. A dashed bird outline shows where one may be.` },
    { animal: 'hyena', id: 'pounce', when: x => !!x.S.pounce,
      text: x => `Did you know? You smelled a bird and missed, so you may move ${sq(x.m.pounce || 1)} more. That's a pounce. Tap Stay to skip it.` },
    { animal: 'hyena', id: 'rival', when: x => x.mode === '4h' && seenHunters(x).some(q => x.me && cheb(x.me, q.p) <= 1),
      text: x => `Did you know? If you move onto the other hunter, you push it away.` },
    { animal: 'hyena', id: 'caught', when: x => !!(x.h.lastCatch && x.h.lastCatch.ko),
      text: x => `Did you know? ${x.ko} catches knock a bird out.${x.mode === '3' && x.m.boost ? ` After a knock-out you move ${sq(x.m.boost)}, with no pounce.` : ''}` },
    { animal: 'badger', id: 'walk', when: x => !!(x.S.hmoves && x.S.hmoves.length),
      text: x => `Did you know? Tap a square to walk up to ${sq(x.m.walk || 2)}. Land on a bird and you catch it. ${x.ko} catches knock a bird out.` },
    { animal: 'badger', id: 'burrow', when: x => !x.S.burrowed,
      text: x => `Did you know? Tap Burrow to hide. Birds within ${sq(x.m.see || 2)} see where.` },
    { animal: 'badger', id: 'sense', when: x => x.S.sense != null,
      text: x => `Did you know? Each time you move you learn yes or no: is a bird within ${sq(x.S.senseRange || x.m.sense || 2)}? It does not say which way. A dashed bird outline shows where one may be.` },
    { animal: 'badger', id: 'ambush', when: x => !!(x.S.burrowed && x.S.seenBirds && x.S.seenBirds.length),
      text: x => `Did you know? A burrowed badger sees the exact square of any bird next to it.` },
    { animal: 'badger', id: 'rival', when: x => x.mode === '4h' && seenHunters(x).some(q => x.me && cheb(x.me, q.p) <= 1),
      text: x => `Did you know? If you move onto the other hunter, you push it away.` },
    { animal: 'badger', id: 'caught', when: x => !!(x.h.lastCatch && x.h.lastCatch.ko),
      text: x => `Did you know? ${x.ko} catches knock a bird out.${x.mode === '3' && x.m.boost ? ` After a knock-out you move ${sq(x.m.boost)}.` : ''}` },

    // ===== What the marks and shadings mean (first time one is on your screen; tap the mark any time to see it again) =====
    // cell: the board square it explains (a tap on a matching square shows it again). head: a header or strip piece it explains. Both are CSS selectors.
    { animal: AIRY, id: 'mLegal', kind: 'mark', cell: '.cell.legal:not(.target)', when: x => dom('#board .cell.legal:not(.target)'),
      text: x => x.animal === 'vulture' ? `Did you know? Highlighted squares are where you can fly this turn. Tap one to go there.` : `Did you know? Highlighted squares are where you can go this turn. Tap one to go there.` },
    { animal: AIRY, id: 'mYou', kind: 'mark', head: '.youtag', when: x => dom('.youtag'),
      text: x => `Did you know? The YOU tag shows which animal is yours.` },
    { animal: 'vulture', id: 'mTarget', kind: 'mark', cell: '.cell.target', when: x => dom('#board .cell.target'),
      text: x => `Did you know? Marked squares are where you can throw your stone. Tap one to throw.` },
    { animal: 'vulture', id: 'mRockCall', kind: 'mark', cell: '.cell.rockcall', when: x => dom('#board .cell.rockcall'),
      text: x => `Did you know? A glowing rock pile is where you can pick up a stone. You hold up to ${x.c.stones}.` },
    { animal: 'vulture', id: 'mDashed', kind: 'mark', cell: '.cell:has(.cmark.cm-egg:not(.is))', when: x => dom('#board .cmark.cm-egg:not(.is)'),
      text: x => `Did you know? A dashed egg in a corner means an egg may be on that square. You do not know yet.` },
    { animal: 'vulture', id: 'mFilled', kind: 'mark', cell: '.cell.spotted,.cell:has(.cmark.cm-egg.is)', when: x => dom('#board .cell.spotted, #board .cmark.cm-egg.is'),
      text: x => `Did you know? A filled egg means you found an egg on that square. It stays found until the ostrich moves it.` },
    { animal: 'vulture', id: 'mFlash', kind: 'mark', cell: '.cell.snyes,.cell.snno', when: x => dom('#board .cell.snyes, #board .cell.snno'),
      text: x => `Did you know? After you land, the squares around you flash. A yes flash means an egg is within ${sq(x.c.smell)}. A no flash means there is none.` },
    { animal: ['ostrich', 'vulture', 'hyena', 'badger'], id: 'mStripes', kind: 'mark', cell: '.cell.sense', when: x => dom('#board .cell.sense'),
      text: x => x.animal === 'vulture' ? `Did you know? Striped squares are as far as your landing sniffs: ${sq(x.c.smell)} around you.`
        : x.animal === 'ostrich' ? `Did you know? Striped squares are as far as you can see a hunter: ${sq(x.m.see || 2)} around you. Past the stripes a hunter stays hidden.`
        : `Did you know? Striped squares are as far as you can sense a bird: ${sq(x.S.senseRange || x.m.sense || 2)} around you (just the squares next to you when burrowed).` },
    { animal: BIRDS, id: 'mFog', kind: 'mark', cell: '.cell.fog', when: x => x.mode !== '2' && x.mode !== '4' && dom('#board .cell.fog'),
      text: x => `Did you know? Squares farther than ${sq(x.m.see || 2)} from you are fogged: a hunter standing there is hidden from you.` },
    { animal: 'ostrich', id: 'mEggNum', kind: 'mark', cell: '.cell:has(.wnum)', when: x => dom('#board .wnum'),
      text: x => `Did you know? The number on an egg is how many rounds it has left before it goes cold. Standing on it sets it back to ${x.c.warmth}.` },
    { animal: 'ostrich', id: 'mMyEgg', kind: 'mark', cell: '.cell:has(.ic-myegg)', when: x => dom('#board .ic-myegg'),
      text: x => `Did you know? A small egg in a corner is one of your eggs. Only you${x.h.team ? ' and your teammate' : ''} can see where they are.` },
    { animal: AIRY, id: 'mWreck', kind: 'mark', cell: '.cell.hit,.cell.stone', when: x => dom('#board .cell.hit, #board .cell.stone'),
      text: x => `Did you know? An X marks a wrecked square. It is out for good: nobody can land on it.` },
    { animal: AIRY, id: 'mFood', kind: 'mark', cell: '.cell[data-tags~="food"]', when: x => dom('#board .cell[data-tags~="food"]'),
      text: x => x.animal === 'ostrich' ? `Did you know? A leaf is food. Step on one to eat and fill your food count back up.` : `Did you know? A leaf is food for the ostrich. If it does not reach one in time, it starves.` },
    { animal: AIRY, id: 'mRock', kind: 'mark', cell: '.cell[data-tags~="rock"]', when: x => dom('#board .cell[data-tags~="rock"]'),
      text: x => x.animal === 'vulture' ? `Did you know? A rock pile gives you a stone. Land on one to pick up a stone (you hold up to ${x.c.stones}).` : `Did you know? A rock pile is where the vulture picks up a stone to throw.` },
    { animal: HUNT, id: 'mMayBird', kind: 'mark', cell: '.cell.maybird', when: x => dom('#board .cell.maybird'),
      text: x => `Did you know? A dashed bird outline marks a square where a bird may be. It is a guess from your sense, not a sighting.` },
    { animal: AIRY, id: 'mMound', kind: 'mark', cell: '.cell:has(.pc.bur)', when: x => dom('#board .pc.bur'),
      text: x => x.animal === 'badger' ? `Did you know? The mound is you, burrowed. Move to come back up.` : `Did you know? A mound is a badger that burrowed. A bird within ${sq(x.m.see || 2)} sees where it dug in.` },
    { animal: AIRY, id: 'mHearts', kind: 'mark', head: '.heart', when: x => dom('.heart'),
      text: x => `Did you know? Each heart is one catch a bird can still take. A caught bird loses a heart, and with none left it is knocked out.` },
    { animal: AIRY, id: 'mClaws', kind: 'mark', head: '.claws', when: x => dom('.claws'),
      text: x => `Did you know? Each set of scratches on a hunter is one catch it has made.` },
    { animal: AIRY, id: 'mFoodChip', kind: 'mark', head: '#stats .hh', when: x => dom('#stats .hh'),
      text: x => x.animal === 'ostrich' ? `Did you know? The leaf number at the top is how many turns you have left to eat.` : `Did you know? The leaf number at the top is how many turns the ostrich has left to eat.` },
    { animal: AIRY, id: 'mStoneChip', kind: 'mark', head: '#stats .hs', when: x => dom('#stats .hs'),
      text: x => `Did you know? The stone number at the top is the stones the vulture holds, out of the most it can hold (${x.c.stones}).` },
    { animal: AIRY, id: 'mEggChip', kind: 'mark', head: '#stats .he', when: x => dom('#stats .he'),
      text: x => `Did you know? The egg number at the top is the eggs still alive, out of the eggs at the start.` },
    { animal: AIRY, id: 'mRound', kind: 'mark', head: '#roundsLeft', when: x => x.S.round > 1,
      text: x => `Did you know? The round counter at the top shows the round out of ${x.c.rounds}. ${x.animal === 'ostrich' ? `You win if an egg is still alive at the end.` : x.animal === 'vulture' ? `If an egg lasts all ${x.c.rounds} rounds, you lose.` : `If an egg lasts all ${x.c.rounds} rounds, the hunters lose.`}` },
    { animal: AIRY, id: 'sTimer', kind: 'scene', head: '#timerToggle', when: x => x.S.showTimers !== false && x.S.clockLeft != null && x.S.clockLeft >= 0,
      text: x => `Did you know? Each turn has a timer of ${Math.round(((x.h.clockMs || x.S.clockMs || 10000)) / 1000)} seconds. When it runs out, your turn ends. Only the host can turn the timer off, with the clock button at the top.` },

    // ===== Scenarios: what is going on right now =====
    { animal: AIRY, id: 'sWait', kind: 'scene', wait: true, when: x => !x.S.myTurn && !x.S.god,
      text: x => `Did you know? When it is not your turn, the other players move. The line above the board says whose turn it is.` },
    { animal: AIRY, id: 'sBot', kind: 'scene', wait: true, when: x => !x.S.myTurn && !x.S.god && !!(x.S.ai || Object.values(x.h.seats || {}).includes('bot')),
      text: x => `Did you know? A computer player takes its turn by itself, by the same rules as you.` },
    { animal: AIRY, id: 'sCutaway', kind: 'scene', wait: true, when: x => cutSeen && !x.S.god,
      text: x => `Did you know? The short cartoon shows what just happened. The board now shows where everyone is.` },
    { animal: 'ostrich', id: 'sEggGone', kind: 'scene', when: x => (x.S.eggs || []).some(e => e && !e.alive) || x.S.lastCold > 0,
      text: x => `Did you know? A broken or cold egg is gone for good. You win if any egg is still alive after round ${x.c.rounds}.` },
    { animal: 'vulture', id: 'sEggGone', kind: 'scene', when: x => x.S.eggsLeft < (x.cfg.eggs || 0) || x.S.lastCold > 0,
      text: x => `Did you know? Every broken or cold egg counts toward your win. You win when every egg is broken or cold.` },
    { animal: AIRY, id: 'sLast', kind: 'scene', when: x => x.S.round >= x.c.rounds - 2,
      text: x => x.animal === 'ostrich' ? `Did you know? These are the last rounds. Keep one egg alive until round ${x.c.rounds} and you win.`
        : x.animal === 'vulture' ? `Did you know? Only a few rounds are left. If an egg lasts until round ${x.c.rounds}, you lose.`
        : `Did you know? Only a few rounds are left. If an egg lasts until round ${x.c.rounds}, the hunters lose.` },
    { animal: BIRDS, id: 'sMateOut', kind: 'scene', wait: true, when: x => { const m = mateOf(x.h.mySeat), b = x.h.birds; return !!(m && b && b[m] && b[m].out); },
      text: x => `Did you know? Your teammate was knocked out. You play on, and your team's goal is the same.` },
    { animal: BIRDS, id: 'sOut', kind: 'scene', wait: true, god: true, when: x => !!x.S.god,
      text: x => `Did you know? You are out, but you can keep watching. You now see the whole board.` },
  ];

  // ---- the switch ----
  const seenKey = (animal, id) => SEEN + animal + '_' + id;
  const isNew = animal => !ls.get(DONE + animal);
  // on: the player's choice if they made one, else on for a player who has not finished a game in this role.
  // bo_tips_off ('1') is the existing master off switch; it wins (the test suites set it).
  function enabled(animal) {
    if (ls.get(TIPS_OFF) === '1') return false;
    const v = ls.get(SWITCH);
    if (v === 'on') return true;
    if (v === 'off') return false;
    return animal ? isNew(animal) : true;
  }
  // what the menu label says: the choice if made, else what the next game will do for this player's role
  function labelOn() {
    const S = root.UI && UI._S && UI._S(), x = S && ctxOf(S);
    return enabled(x ? x.animal : null);
  }
  // Turning hints on starts over: every hint can show again, and the older tips and first-time guides (ui.js bo_g_*) with them.
  // Turning them off silences all of it (bo_tips_off is the older tips' switch, bo_hs_off the guides').
  function setOn(on) {
    ls.set(SWITCH, on ? 'on' : 'off');
    if (on) {
      ls.del(TIPS_OFF); ls.del('bo_hs_off');
      try { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && (k.indexOf(SEEN) === 0 || k.indexOf('bo_tip_') === 0 || k.indexOf('bo_g_') === 0)) localStorage.removeItem(k); } } catch (e) {}
    } else { ls.set(TIPS_OFF, '1'); ls.set('bo_hs_off', '1'); hide(); }
    paintSwitch();
  }
  function paintSwitch() {
    const on = labelOn(), t = on ? 'Hints on' : 'Hints off';
    ['menuHints', 'hintsBtn2'].forEach(id => { const el = document.getElementById(id); if (!el) return; el.textContent = t; el.setAttribute('aria-label', t); el.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }

  // ---- the card ----
  let el = null, hideT = null, shownTurn = null, retryT = null, cur = null;
  function css() {
    if (document.getElementById('hintsCss')) return;
    const s = document.createElement('style'); s.id = 'hintsCss';
    s.textContent = '#playhint{position:fixed;left:10px;right:10px;z-index:350;display:flex;gap:8px;align-items:flex-start;background:#fff;color:#111;border:3px solid #111;border-radius:12px;padding:8px 8px 8px 12px;font:600 15px/1.3 system-ui,sans-serif;box-shadow:0 2px 0 #111;pointer-events:none;max-width:370px;margin:0 auto}'
      + '#playhint.hidden{display:none}#playhint .hx{pointer-events:auto;flex:none;min-width:44px;min-height:44px;margin:-8px -8px -8px 0;background:transparent;border:0;font:700 22px/1 system-ui,sans-serif;color:#111;cursor:pointer}'
      + '#playhint .ht{flex:1;padding:2px 0}'
      + 'html[data-theme="bw"] #playhint,html[data-theme="bw"] #coach{background:#fff!important;color:#111!important;border-color:#111!important}' // bw.css clears backgrounds; a hint and a coach mark keep a solid fill
      ;
    document.head.appendChild(s);
  }
  function rect(sel) { const e = document.querySelector(sel); if (!e || e.classList.contains('hidden')) return null; const r = e.getBoundingClientRect(); return r.height ? r : null; }
  // Put the card where it covers no square and no button: the free space under the board, else under the buttons, else over the one-line hint above the board.
  function place() {
    const vh = window.innerHeight, h = el.offsetHeight, board = rect('#board'), act = rect('#actions'), line = rect('#msgslot');
    let top = null;
    if (board && act && act.top - board.bottom - 16 >= h) top = board.bottom + 8;
    else if (act && vh - act.bottom - 12 >= h) top = act.bottom + 8;
    else if (board && vh - board.bottom - 12 >= h && !act) top = board.bottom + 8;
    if (top == null) { top = line ? line.top : 70; el.style.maxHeight = (line ? line.height : 56) + 'px'; el.style.overflow = 'hidden'; } else { el.style.maxHeight = ''; el.style.overflow = ''; }
    el.style.top = Math.max(0, top) + 'px';
  }
  function hide() { clearTimeout(hideT); hideT = null; if (el) el.classList.add('hidden'); cur = null; }
  function show(text, id, tk, remind) {
    css();
    if (!el) {
      el = document.createElement('div'); el.id = 'playhint'; el.className = 'hidden'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
      el.innerHTML = '<div class="ht"></div><button type="button" class="hx" aria-label="Close hint">×</button>';
      document.body.appendChild(el);
      const x = el.querySelector('.hx'); let t = 0;
      x.addEventListener('touchend', e => { e.preventDefault(); t = Date.now(); hide(); }, { passive: false });
      x.addEventListener('click', e => { e.preventDefault(); if (Date.now() - t > 600) hide(); });
    }
    el.querySelector('.ht').textContent = text; el.dataset.hint = id; el.classList.remove('hidden'); place(); cur = { id, key: tk, remind: !!remind };
    clearTimeout(hideT); hideT = setTimeout(hide, SHOW_MS);
  }

  // ---- when it is a good moment ----
  function quiet() {
    const q = root.STATUS_QUEUE, st = q && q.state ? q.state() : null;
    if (st && (st.active || st.pending.length)) return false;                       // an announcement is up or waiting
    if (root.CUTAWAYS && (CUTAWAYS.flushing || (CUTAWAYS.busy && CUTAWAYS.busy()))) return false; // a cutaway is playing
    for (const sel of ['#rolecard', '#handoff', '#tut', '#rules']) { const e = document.querySelector(sel); if (e && !e.classList.contains('hidden')) return false; } // a card, the phone hand-over, the intro or the rules is up
    if (document.getElementById('surprise-go')) return false;
    return true;
  }
  function turnKey(x) { return [x.S.round, x.S.turn, x.h.mySeat || x.S.role].join(':'); }

  let cutSeen = false;      // a cutaway has played this game (the "what just happened" picture)
  const mine = (r, x) => r.animal === x.animal || (Array.isArray(r.animal) && r.animal.indexOf(x.animal) >= 0);
  const safe = (r, x) => { try { return !!r.when(x); } catch (e) { return false; } };

  // Called at the end of every paint.
  function check(S) {
    clearTimeout(retryT); retryT = null;
    if (root.CUTAWAYS && (CUTAWAYS.flushing || (CUTAWAYS.busy && CUTAWAYS.busy()))) cutSeen = true;
    const x = S && ctxOf(S);
    if (!x) return hide();
    if (S.phase === 'over') { if (!ls.get(DONE + x.animal)) ls.set(DONE + x.animal, '1'); cutSeen = false; hide(); return; }
    paintSwitch();
    if (S.phase !== 'play' || S.simple) { hide(); return; }
    const tk = turnKey(x);
    // a hint belongs to the turn it came up in
    if (cur && cur.key && cur.key !== tk && !cur.remind) hide();
    if (!enabled(x.animal)) { hide(); return; }
    if (shownTurn === tk) return;                                                   // one per turn
    // On your own turn every row is a candidate. While you wait (or watch), only the rows marked wait.
    const row = TABLE.find(r => mine(r, x) && !ls.get(seenKey(x.animal, r.id)) && (S.god ? r.god : S.myTurn ? !r.god : (r.wait || r.kind === 'mark')) && safe(r, x));
    if (!row) return;
    if (!quiet()) { retryT = setTimeout(() => { const T = root.UI && UI._S && UI._S(); if (T) check(T); }, 400); return; }
    shownTurn = tk; ls.set(seenKey(x.animal, row.id), '1'); if (row.id === 'sCutaway') cutSeen = false;
    show(row.text(x), x.animal + ':' + row.id, tk);
  }

  // Reminders: tap a mark on the board (not a square you can move to), or a counter at the top, to read its explanation again.
  // Always works, even when hints are off or the first-round hints are done. It never counts as a seen hint.
  function remind(S, row, x) { show(row.text(x), 'remind:' + row.id, null, true); setTimeout(() => { if (root.UI && UI._tip) UI._tip(null); }, 0); }
  function onTap(e) {
    const S = root.UI && UI._S && UI._S(), x = S && ctxOf(S); if (!x) return;
    const t = e.target; if (!t || !t.closest) return;
    if (t.closest('#playhint')) return;
    const cell = t.closest('#board .cell');
    let hit = null;
    if (cell) {
      if (cell.classList.contains('legal') || cell.classList.contains('target')) return;
      const ms = TABLE.filter(r => r.cell && mine(r, x) && (() => { try { return cell.matches(r.cell); } catch (er) { return false; } })());
      hit = ms.find(r => r.id !== 'mStripes' && r.id !== 'mFog') || ms[0];   // a mark on the square beats the stripes under it
    }
    else hit = TABLE.find(r => r.head && mine(r, x) && t.closest(r.head));
    if (hit) remind(S, hit, x);
  }

  // The older tips this table replaces step aside while hints are on, so one moment never shows two cards.
  function wrapTips() {
    const T = root.TUT; if (!T || !T.tip || T.tip.wrapped) return;
    const old = T.tip, wrapped = (id, text) => {
      const S = root.UI && UI._S && UI._S(), x = S && ctxOf(S);
      if (x && (!enabled(x.animal) || OLD_TIPS.indexOf(id) >= 0)) return; // hints off: no older tips either. Hints on: the table says it instead.
      return old(id, text);
    };
    wrapped.wrapped = true; T.tip = wrapped;
  }

  function wireMenus() {
    const tap = (id) => {
      const b = document.getElementById(id); if (!b || b.dataset.hw) return; b.dataset.hw = '1'; let t = 0;
      const go = () => setOn(!labelOn());
      b.addEventListener('touchend', e => { e.preventDefault(); t = Date.now(); go(); }, { passive: false });
      b.addEventListener('click', e => { e.preventDefault(); if (Date.now() - t > 600) go(); });
    };
    tap('menuHints'); tap('hintsBtn2'); paintSwitch();
    document.addEventListener('click', onTap, true);
    // the menus repaint their labels when opened
    ['moreBtn', 'homeGear'].forEach(id => { const b = document.getElementById(id); if (b) b.addEventListener('click', () => setTimeout(paintSwitch, 0)); });
  }

  const API = { TABLE, check, enabled, setOn, labelOn, hide, ctxOf, modeOf, seenKey, isNew, SWITCH, SEEN, DONE, current: () => cur && cur.id };
  root.HINTS = API;
  if (typeof document !== 'undefined') {
    wrapTips();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireMenus); else wireMenus();
  }
  if (typeof module !== 'undefined') module.exports = API;
})(typeof window === 'undefined' ? globalThis : window);
