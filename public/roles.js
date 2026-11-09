// The role card: what each animal's player reads once, before their first turn. One place for every word on it.
// Works in the browser (window.Roles) and in Node. Numbers are never typed here: they come from the rules (CONFIG in game.js,
// T3 in three.js, TH in hunt.js, TM in team.js). In Node, rulesFromModules() reads those modules. The server puts the same object on
// every player's view (view.rules), and the phone passes it back in. Only plain numbers go in it (no start squares, nothing hidden).
(function () {
  // The card's modes are the lobby's: '2' classic, '3' ostrich + vulture + hunter, '4' 2 vs 2, '4h' Hunters, '5' 2 vs 2 + hunter.
  function rulesFromModules() {
    const B = require('../game.js'), T = require('../three.js'), H = require('../hunt.js'), M = require('../team.js'), C = B.CONFIG;
    const pick = (t, mode) => Object.assign({ ko: { hyena: t.ko.hyena, badger: t.ko.badger }, sense: t.sense, see: t.see, walk: t.walk, pounce: t.pounce }, mode ? { goal: B.HUNTER_GOAL(mode) } : {});
    return {
      cfg: { eggs: C.eggs, rounds: C.rounds, warmth: C.warmth, food: C.food, stones: C.stones, fly: C.vultureFly, throwRange: C.throwRange, smell: C.smellRange, walk: C.ostrichWalk, carryWalk: C.carryWalk, kick: C.kickPush, kickBadger: C.kickPushBadger },
      modes: { '3': pick(T.T3, '3'), '4h': pick(H.TH), '4': pick(M.TM), '5': pick(M.TM, '5') },
    };
  }

  const PICKED = 'We picked this animal for you.';
  const HUNTERS = { hyena: 'hyena', badger: 'badger' };
  const BIRD_SEAT = { blue: 'ostrich', o1: 'ostrich', o2: 'ostrich', red: 'vulture', v1: 'vulture', v2: 'vulture' };

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
  // Every card is a title and 4 short lines (goal first), no "lose" line: the goal's opposite is the way to lose, and How to play says the rest.
  // Kick, Carry and the stone bounce are taught the first time each becomes possible. Numbers come from the rules; no word names a color or a look.
  function ostrich(mode, kind, R) {
    const c = R.cfg, team = mode === '4' || mode === '5', hunt = mode === '3' || mode === '4h' || mode === '5';
    const hl = hunt ? birdHunterLose(mode, kind, R) : [];
    const ko = hunt && R.modes[mode] ? (mode === '4h' ? R.modes[mode].ko.hyena : R.modes[mode].ko[kind] || R.modes[mode].ko.hyena) : 0;
    const move = `Move ${c.walk} squares. ${c.carryWalk} with an egg.`;
    if (team) return { title: 'You are an Ostrich', goal: `Keep 1 team egg alive for ${c.rounds} rounds.`,
      moves: [move, 'Either ostrich can warm any egg.', `Eat every ${c.food} turns.`], lose: '', picture: 'ostrich' };
    return { title: 'You are the Ostrich', goal: hunt ? `Keep 1 egg alive. Out after ${ko} catches.` : `Keep 1 egg alive for ${c.rounds} rounds.`,
      moves: [move, `Stand on each egg every ${c.warmth} rounds.`, `Eat every ${c.food} turns.`], lose: '', picture: 'ostrich' };
  }

  function vulture(mode, kind, R) {
    const c = R.cfg, team = mode === '4' || mode === '5', hunt = mode === '3' || mode === '4h' || mode === '5';
    const ko = hunt && R.modes[mode] ? (mode === '4h' ? R.modes[mode].ko.hyena : R.modes[mode].ko[kind] || R.modes[mode].ko.hyena) : 0;
    const fly = team ? `Fly ${c.fly} squares. You share sniffs with your partner.` : `Fly ${c.fly} squares. Each landing sniffs for eggs.`;
    return { title: team ? 'You are a Vulture' : 'You are the Vulture', goal: team ? `Break every egg by round ${c.rounds}.` : hunt ? `Break every egg. Out after ${ko} catches.` : `Break every egg by round ${c.rounds}.`,
      moves: [fly, 'Land on rocks to get a stone.', 'Throw at your square or next to it.'], lose: '', picture: 'vulture' };
  }

  // The hunter's goal, from the setting HUNTER_GOAL (game.js) for the mode: 'all', 'first' or 'catches'
  function hunterGoal(mode, m, c) {
    const g = m.goal || { kind: 'all' };
    if (mode === '5') return g.kind === 'first' ? 'Knock out an ostrich and a vulture.' : 'Knock out every bird.';
    if (g.kind === 'catches') return `Make ${g.n} catches.`;
    return g.kind === 'first' ? 'Knock out one bird.' : 'Knock out both birds.';
  }
  function hunter(who, mode, R) {
    const m = R.modes[mode] || R.modes['3'], other = who === 'hyena' ? 'badger' : 'hyena';
    const goal = mode === '4h' ? `Knock out more birds than the ${other}.` : hunterGoal(mode, m, R.cfg);
    const outline = 'The outline shows where a bird may be.';
    if (who === 'hyena') return { title: 'You are the Hyena', goal, moves: [`Move ${m.walk} squares.`, outline, `Missed? Move ${m.pounce} more.`], lose: '', picture: 'hyena' };
    return { title: 'You are the Badger', goal, moves: [`Move ${m.walk} squares.`, outline, 'Stay still to hide underground.'], lose: '', picture: 'badger' };
  }

  // role: 'blue' 'red' 'hunter' (the phone's role), or a seat ('o1' 'v2' 'hyena' 'badger'). kind: the hunter's animal ('hyena' or 'badger'),
  // the hunter in the game for a bird. mode: '2' '3' '4' '4h' '5'. rules: defaults to the rules modules (Node only).
  function roleCard(role, kind, mode, rules) {
    const R = rules || rulesFromModules(), a = animal(role, kind);
    if (!a) return null;
    const m = String(mode || '2'), card = a === 'ostrich' ? ostrich(m, kind, R) : a === 'vulture' ? vulture(m, kind, R) : hunter(a, m, R);
    return Object.assign({ animal: a, id: cardId(role, kind, m) }, card);
  }
  // localStorage key tail, one per animal + hunter + mode: a phone sees each card once
  function cardId(role, kind, mode) {
    const a = animal(role, kind);
    const m = String(mode || '2'), bird = a === 'ostrich' || a === 'vulture';
    return [a, bird && m === '3' && HUNTERS[kind] ? kind : '', m].join('_'); // only the 3-player bird cards change with the hunter
  }

  const API = { roleCard, cardId, huntLine, kickList, animal, rulesFromModules, PICKED };
  if (typeof module !== 'undefined') module.exports = API; else window.Roles = API;
})();
