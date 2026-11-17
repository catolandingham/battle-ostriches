// The role card: what each animal's player reads once, before their first turn. One place for every word on it.
// Works in the browser (window.Roles) and in Node. Numbers are never typed here: they come from the rules (CONFIG in game.js,
// T3 in three.js, TH in hunt.js, TM in team.js). In Node, rulesFromModules() reads those modules. The server puts the same object on
// every player's view (view.rules), and the phone passes it back in. Only plain numbers go in it (no start squares, nothing hidden).
(function () {
  // The card's modes are the lobby's: '2' classic, '3' ostrich + vulture + hunter, '4' 2 vs 2, '4h' Hunters, '5' 2 vs 2 + hunter.
  function rulesFromModules() {
    const B = require('../game.js'), T = require('../three.js'), H = require('../hunt.js'), M = require('../team.js'), C = B.CONFIG;
    const pick = (t, mode) => Object.assign({ ko: { hyena: t.ko.hyena, badger: t.ko.badger }, sense: t.sense, see: t.see, walk: t.walk, pounce: t.pounce }, t.double != null ? { double: t.double } : {}, mode ? { goal: B.HUNTER_GOAL(mode) } : {});
    return {
      cfg: { eggs: C.eggs, rounds: C.rounds, warmth: C.warmth, food: C.food, stones: C.stones, fly: C.vultureFly, throwRange: C.throwRange, smell: C.smellRange, walk: C.ostrichWalk, carryWalk: C.carryWalk, kick: C.kickPush, kickBadger: C.kickPushBadger },
      modes: { '3': pick(T.T3, '3'), '4h': pick(H.TH), '4': pick(M.TM), '5': pick(M.TM, '5') },
    };
  }

  const PICKED = 'We picked this animal for you.';
  const HUNTERS = { hyena: 'hyena', badger: 'badger' };
  const BIRD_SEAT = { blue: 'ostrich', o1: 'ostrich', o2: 'ostrich', red: 'vulture', v1: 'vulture', v2: 'vulture' };
  const MODE_TITLE = { '2': 'Classic', '3': '3 players', '4': '2 vs 2', '4h': 'Hunters', '5': '2 vs 2 + hunter' };

  // 'hyena' or 'badger' when the card is a hunter's, 'ostrich' or 'vulture' when it is a bird's, else null
  function animal(role, kind) {
    if (role === 'hyena' || role === 'badger') return role;
    if (role === 'hunter') return kind === 'badger' ? 'badger' : 'hyena';
    return BIRD_SEAT[role] || null;
  }
  const squares = (n) => n === 1 ? '1 square' : n + ' squares';
  const times = (n) => n === 1 ? 'once' : n + ' times';
  const catches = (n) => n === 1 ? '1 catch' : n + ' catches';

  // How the hunters can end a bird, said to the bird, as a list. kind is the hunter in the game ('hyena' or 'badger'), if the phone knows it.
  function birdHunterLose(mode, kind, R) {
    const ko = R.modes[mode] && R.modes[mode].ko;
    if (!ko) return [];
    if ((mode === '4h' || !HUNTERS[kind]) && ko.hyena === ko.badger) return [`a hunter catches you ${times(ko.hyena)}`];
    if (mode === '4h' || !HUNTERS[kind]) return [`the hyena catches you ${times(ko.hyena)}`, `the badger catches you ${times(ko.badger)}`];
    return [`the ${HUNTERS[kind]} catches you ${times(ko[kind])}`];
  }
  // "You lose if A, B, or C."
  const loseList = (lead, items) => `${lead} if ${items.length < 2 ? items[0] : items.length === 2 && !/ or /.test(items.join('|')) ? items.join(' or ') : items.slice(0, -1).join(', ') + ', or ' + items[items.length - 1]}.`;

  // The animals an ostrich can kick in this mode, named only if they are in the game: "a vulture", "a vulture or hyena", "a vulture, hyena or badger"
  function kickList(mode, kind) {
    const m = String(mode || '2'), names = ['vulture'];
    if (m === '4h') names.push('hyena', 'badger'); else if ((m === '3' || m === '5')) names.push(HUNTERS[kind] || 'hunter');
    return 'a ' + (names.length < 2 ? names[0] : names.slice(0, -1).join(', ') + ' or ' + names[names.length - 1]);
  }
  const kickLine = (mode, kind, c) => `Kick: push ${kickList(mode, kind)} next to you away ${c.kick} squares${/badger/.test(kickList(mode, kind)) ? ` (${c.kickBadger} for a badger)` : ''}. Not while carrying.`;
  // One line for the start of a game and for How to play: who hunts what, naming only the animals in the game.
  function huntLine(mode, kind) {
    const m = String(mode || '2');
    if (m === '2') return 'The vulture hunts eggs.';
    if (m === '4') return 'The vultures hunt eggs.';
    if (m === '4h') return 'The vulture hunts eggs. The hyena and badger hunt birds.';
    return `The ${m === '5' ? 'vultures hunt' : 'vulture hunts'} eggs. The ${HUNTERS[kind] || 'hyena or badger'} hunts birds.`;
  }

  function cardOf(title, picture, lines) {
    const extra = picture === 'ostrich'
      ? 'A vulture may land on you only while you carry. The egg drops and is found.'
      : picture === 'vulture'
        ? 'You may land on an ostrich that is carrying. The egg drops and you find it.'
        : '';
    const all = extra ? lines.concat(extra) : lines;
    return { title, picture, goal: all[0] || '', moves: all.slice(1), lines: all, lose: '' };
  }
  function koFor(mode, kind, R) {
    const ko = R.modes[mode] && R.modes[mode].ko;
    if (!ko) return 0;
    if (HUNTERS[kind]) return ko[kind] || ko.hyena;
    return ko.hyena;
  }
  function hunterGoalObj(mode, R) {
    return (R.modes[mode] && R.modes[mode].goal) || { kind: 'all', n: 0 };
  }
  // 3-player goal line: 'all' (Brian, 2026-11-15, rule clash R5: "you win when knocking out both birds") or 'catches:N'.
  function goalLine(mode, R, you) {
    const g = hunterGoalObj(mode, R);
    if (g.kind === 'catches') return you ? `You win at ${g.n} catches.` : `The hunter wins at ${g.n} catches.`;
    return you ? 'You win when both birds are out.' : 'The hunter wins when both birds are out.';
  }
  function doubleTurns(mode, R) {
    const n = R.modes[mode] && R.modes[mode].double;
    return n != null ? n : 2;
  }

  // Start-of-game reminder: a mode title, "You are…", then the approved lines for that seat.
  // Numbers come from the rules; no word names a color or a look.
  function ostrich(mode, kind, R) {
    const c = R.cfg, ko = koFor(mode, kind, R), n = hunterGoalObj(mode, R).n, d = doubleTurns(mode, R);
    if (mode === '5') return cardOf('You are an Ostrich.', 'ostrich', [
      `Keep at least 1 egg alive for ${c.rounds} rounds.`,
      'You can help warm your teammate\'s eggs, but don\'t forget to eat.',
      `If a hunter gets to your square, they catch you. ${ko} catches knock you out.`,
      'You lose if no egg is left, or the hunter knocks out 1 ostrich and 1 vulture.',
    ]);
    if (mode === '4') return cardOf('You are an Ostrich.', 'ostrich', [
      `Keep at least 1 egg alive for ${c.rounds} rounds.`,
      'You can help warm your teammate\'s eggs, but don\'t forget to eat.',
      'You lose if every egg is broken or goes cold.',
    ]);
    if (mode === '4h') return cardOf('You are the Ostrich.', 'ostrich', [
      `Keep at least 1 egg alive for ${c.rounds} rounds.`,
      `If a hunter gets to your square, they catch you. ${ko} catches knock you out.`,
      'You lose if every egg is broken or goes cold, or if you don\'t eat in time.',
      'Both hunters hunt you.',
    ]);
    if (mode === '3') return cardOf('You are the Ostrich.', 'ostrich', [
      `Keep at least 1 egg alive for ${c.rounds} rounds.`,
      `If a hunter gets to your square, they catch you. ${ko} catches knock you out.`,
      'You lose if every egg is broken or goes cold, or if you don\'t eat in time.',
      goalLine(mode, R, false),
      `When the hunter knocks a bird out, they always take ${d} turns in a row. The hyena can pounce only on the first.`,
    ]);
    return cardOf('You are the Ostrich.', 'ostrich', [
      `Keep at least 1 egg alive for ${c.rounds} rounds.`,
      'You lose if every egg is broken or goes cold, or if you don\'t eat in time.',
    ]);
  }

  function vulture(mode, kind, R) {
    const c = R.cfg, ko = koFor(mode, kind, R), n = hunterGoalObj(mode, R).n, d = doubleTurns(mode, R);
    if (mode === '5') return cardOf('You are a Vulture.', 'vulture', [
      'You win if every egg is broken or goes cold.',
      'You share found eggs with your teammate.',
      `If a hunter gets to your square, they catch you. ${ko} catches knock you out.`,
      `You lose if an egg lasts ${c.rounds} rounds, or the hunter knocks out 1 ostrich and 1 vulture.`,
    ]);
    if (mode === '4') return cardOf('You are a Vulture.', 'vulture', [
      'You win if every egg is broken or goes cold, or if both ostriches are out.',
      'You share found eggs with your teammate.',
      `You lose if an egg lasts ${c.rounds} rounds.`,
    ]);
    if (mode === '4h') return cardOf('You are the Vulture.', 'vulture', [
      'You win if every egg is broken or goes cold.',
      `If a hunter gets to your square, they catch you. ${ko} catches knock you out.`,
      `You lose if an egg lasts ${c.rounds} rounds.`,
      'Both hunters hunt you.',
    ]);
    if (mode === '3') return cardOf('You are the Vulture.', 'vulture', [
      'You win if every egg is broken or goes cold.',
      `If a hunter gets to your square, they catch you. ${ko} catches knock you out.`,
      `You lose if an egg lasts ${c.rounds} rounds.`,
      goalLine(mode, R, false),
      `When the hunter knocks a bird out, they always take ${d} turns in a row. The hyena can pounce only on the first.`,
    ]);
    return cardOf('You are the Vulture.', 'vulture', [
      'You win if every egg is broken or goes cold.',
      'You also win if the ostrich doesn\'t eat in time.',
      `You lose if an egg lasts ${c.rounds} rounds.`,
    ]);
  }

  function hunter(who, mode, R) {
    const c = R.cfg, m = R.modes[mode] || R.modes['3'];
    const ko = (m.ko && ((HUNTERS[who] && m.ko[who]) || m.ko.hyena)) || 0;
    const other = who === 'hyena' ? 'badger' : 'hyena';
    const n = (m.goal && m.goal.n) || hunterGoalObj(mode, R).n;
    const d = doubleTurns(mode, R);
    const step = m.pounce === 1 ? '1 more square' : (m.pounce || 1) + ' more squares';
    const pounceLine = `When you smell a bird and miss, you smell again and may move ${step}.`;
    const burrowLine = `Tap Burrow to hide. Birds within ${m.see || 2} squares see where.`; // Brian, 2026-11-15
    let lines;
    if (mode === '4h') {
      lines = [
        `Hunters win when both birds are out. You win if you knocked out more birds than the ${other}.`,
      ];
      lines.push(who === 'hyena' ? pounceLine : burrowLine);
      lines.push(`${ko} catches knock a bird out. If you have the same number of knock-outs, whoever got more catches wins. Same catches? You tie.`);
      lines.push(`You lose if an egg lasts ${c.rounds} rounds, or every egg is broken.`);
    } else if (mode === '5') {
      lines = [
        'You win by knocking out 1 ostrich and 1 vulture.',
      ];
      lines.push(who === 'hyena' ? pounceLine : burrowLine);
      lines.push(`${ko} catches knock a bird out.`);
      lines.push(`You lose if an egg lasts ${c.rounds} rounds, or every egg is broken.`);
    } else if (who === 'hyena') {
      lines = [
        goalLine(mode, R, true),
        `${ko} catches knock a bird out.`,
        pounceLine,
        `When you knock a bird out, you always take ${d} turns in a row. You can pounce only on the first.`,
        `You lose if an egg lasts ${c.rounds} rounds, or every egg is broken.`,
      ];
    } else {
      lines = [
        goalLine(mode, R, true),
        `${ko} catches knock a bird out.`,
        `After you knock a bird out, you always take ${d} turns in a row.`,
        burrowLine,
        `You lose if an egg lasts ${c.rounds} rounds, or every egg is broken.`,
      ];
    }
    return cardOf(who === 'hyena' ? 'You are the Hyena.' : 'You are the Badger.', who, lines);
  }

  // role: 'blue' 'red' 'hunter' (the phone's role), or a seat ('o1' 'v2' 'hyena' 'badger'). kind: the hunter's animal ('hyena' or 'badger'),
  // the hunter in the game for a bird. mode: '2' '3' '4' '4h' '5'. rules: defaults to the rules modules (Node only).
  function roleCard(role, kind, mode, rules) {
    const R = rules || rulesFromModules(), a = animal(role, kind);
    if (!a) return null;
    const m = String(mode || '2'), card = a === 'ostrich' ? ostrich(m, kind, R) : a === 'vulture' ? vulture(m, kind, R) : hunter(a, m, R);
    return Object.assign({ animal: a, id: cardId(role, kind, m), mode: MODE_TITLE[m] || 'Classic' }, card);
  }
  // localStorage key tail, one per animal + hunter + mode: a phone sees each card once
  function cardId(role, kind, mode) {
    const a = animal(role, kind);
    const m = String(mode || '2'), bird = a === 'ostrich' || a === 'vulture';
    const base = [a, bird && m === '3' && HUNTERS[kind] ? kind : '', m].join('_'); // only the 3-player bird cards change with the hunter
    // P2 wording: a phone that already closed the old card should be shown this one.
    const revised = (a === 'hyena' && (m === '3' || m === '4h' || m === '5')) || (bird && m === '3');
    const id = m === '3' ? base + '_r5' : revised ? base + '_p2' : base; // R5 changed every 3-player card: show it once more
    return bird ? id + '_c' : id; // the carry landing line: show the bird card once more
  }

  const API = { roleCard, cardId, huntLine, kickList, animal, rulesFromModules, PICKED };
  if (typeof module !== 'undefined') module.exports = API; else window.Roles = API;
})();
