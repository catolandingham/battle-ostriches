// The role card: what each animal's player reads once, before their first turn. One place for every word on it.
// Works in the browser (window.Roles) and in Node. Numbers are never typed here: they come from the rules (CONFIG in game.js,
// T3 in three.js, TH in hunt.js, TM in team.js). In Node, rulesFromModules() reads those modules. The server puts the same object on
// every player's view (view.rules), and the phone passes it back in. Only plain numbers go in it (no start squares, nothing hidden).
(function () {
  // The card's modes are the lobby's: '2' classic, '3' ostrich + vulture + hunter, '4' 2 vs 2, '4h' Hunters, '5' 2 vs 2 + hunter.
  function rulesFromModules() {
    const B = require('../game.js'), T = require('../three.js'), H = require('../hunt.js'), M = require('../team.js'), C = B.CONFIG;
    const pick = (t) => ({ ko: { hyena: t.ko.hyena, badger: t.ko.badger }, sense: t.sense });
    return {
      cfg: { eggs: C.eggs, rounds: C.rounds, warmth: C.warmth, food: C.food, stones: C.stones, fly: C.vultureFly, throwRange: C.throwRange, smell: C.smellRange, walk: C.ostrichWalk, carryWalk: C.carryWalk, kick: C.kickPush },
      modes: { '3': pick(T.T3), '4h': pick(H.TH), '4': pick(M.TM), '5': pick(M.TM) },
    };
  }

  const PICKED = 'We picked this animal for you.';
  const HUNTERS = { hyena: 'hyena', badger: 'honey badger' };
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
    if (mode === '4h' || !HUNTERS[kind]) return [`the hyena catches you ${times(ko.hyena)}`, `the honey badger catches you ${times(ko.badger)}`];
    return [`the ${HUNTERS[kind]} catches you ${times(ko[kind])}`];
  }
  // "You lose if A, B, or C."
  const loseList = (lead, items) => `${lead} if ${items.length < 2 ? items[0] : items.length === 2 && !/ or /.test(items.join('|')) ? items.join(' or ') : items.slice(0, -1).join(', ') + ', or ' + items[items.length - 1]}.`;

  // The animals an ostrich can kick in this mode, named only if they are in the game: "a vulture", "a vulture or hyena", "a vulture, hyena or honey badger"
  function kickList(mode, kind) {
    const m = String(mode || '2'), names = ['vulture'];
    if (m === '4h') names.push('hyena', 'honey badger'); else if ((m === '3' || m === '5')) names.push(HUNTERS[kind] || 'hunter');
    return 'a ' + (names.length < 2 ? names[0] : names.slice(0, -1).join(', ') + ' or ' + names[names.length - 1]);
  }
  const kickLine = (mode, kind, c) => `Kick: push ${kickList(mode, kind)} next to you back ${c.kick} squares. Not while carrying an egg.`;
  // One line for the start of a game and for How to play: who hunts what, naming only the animals in the game.
  function huntLine(mode, kind) {
    const m = String(mode || '2');
    if (m === '2') return 'The vulture hunts eggs.';
    if (m === '4') return 'The vultures hunt eggs.';
    if (m === '4h') return 'The vulture hunts eggs. The hyena and honey badger hunt birds.';
    return `The ${m === '5' ? 'vultures hunt' : 'vulture hunts'} eggs. The ${HUNTERS[kind] || 'hyena or honey badger'} hunts birds.`;
  }
  function ostrich(mode, kind, R) {
    const c = R.cfg, team = mode === '4' || mode === '5', hunt = mode === '3' || mode === '4h' || mode === '5';
    const hl = hunt ? birdHunterLose(mode, kind, R) : [];
    if (team) return {
      title: 'You are an Ostrich',
      goal: `Goal: Keep at least one of your team's eggs alive for ${c.rounds} rounds.`,
      moves: [`Walk up to ${squares(c.walk)} (${c.carryWalk} if you carry an egg), or sit on an egg to keep it warm. Either ostrich can warm any egg.`,
        kickLine(mode, kind, c),
        `An egg goes cold if no ostrich visits it within ${c.warmth} rounds.`,
        `Eat at a green leaf at least every ${c.food} turns.`],
      lose: 'Your team loses if every egg is smashed or cold.',
      picture: 'ostrich',
    };
    return {
      title: 'You are the Ostrich',
      goal: `Goal: Keep one of your ${c.eggs} eggs alive for ${c.rounds} rounds.`,
      moves: [`Walk up to ${squares(c.walk)} (${c.carryWalk} if you carry an egg), or sit on an egg to keep it warm.`,
        kickLine(mode, kind, c),
        `Visit each egg within ${c.warmth} rounds or it goes cold.`,
        `Eat at a green leaf at least every ${c.food} turns.`],
      lose: loseList('You lose', ['every egg is smashed or cold', 'you starve'].concat(hl)),
      picture: 'ostrich',
    };
  }

  function vulture(mode, kind, R) {
    const c = R.cfg, team = mode === '4' || mode === '5', hunt = mode === '3' || mode === '4h' || mode === '5';
    const hl = hunt ? birdHunterLose(mode, kind, R) : [];
    const moves = [`Fly up to ${c.fly} squares. Each landing tells you if an egg is within ${c.smell} square${c.smell === 1 ? '' : 's'}.`,
      `Land on a gray rock pile to pick up a stone. You hold ${c.stones} stone${c.stones === 1 ? '' : 's'}.`,
      `Throw a stone at a square within ${c.throwRange} of you, even your own. It smashes an egg there.`];
    if (team) {
      moves[0] += ' Your teammate sees your sniffs.';
      return { title: 'You are a Vulture', goal: `Goal: You and your teammate smash every egg before round ${c.rounds} ends.`, moves,
        lose: `Your team loses if an egg is still alive after round ${c.rounds}.`, picture: 'vulture' };
    }
    return { title: 'You are the Vulture', goal: `Goal: Smash every egg before round ${c.rounds} ends.`, moves,
      lose: loseList('You lose', [`an egg is still alive after round ${c.rounds}`].concat(hl)), picture: 'vulture' };
  }

  function hunter(who, mode, R) {
    const c = R.cfg, m = R.modes[mode] || R.modes['3'], n = m.ko[who], other = who === 'hyena' ? 'honey badger' : 'hyena';
    const goal = mode === '4h' ? `Goal: Knock out more birds than the ${other} before round ${c.rounds} ends.`
      : mode === '5' ? `Goal: Knock out at least one ostrich and one vulture before round ${c.rounds} ends.`
      : `Goal: Knock out both birds before round ${c.rounds} ends.`;
    const lose = mode === '4h' ? `You lose if a bird wins first, or if the ${other} knocks out more birds than you.`
      : mode === '5' ? 'You lose if the ostriches or the vultures win first.' : 'You lose if a bird wins first.';
    const sense = `When a bird is within ${m.sense} squares, rose dots show the squares where it may be.`;
    if (who === 'hyena') return {
      title: 'You are the Hyena', goal,
      moves: [`Move 1 square a turn. ${sense}`,
        'Pounce: When rose dots show a bird is near, you get one extra square after your move. Land on the bird to catch it.',
        `A bird is out after ${catches(n)}.`],
      lose, picture: 'hyena' };
    return {
      title: 'You are the Honey Badger', goal,
      moves: [`Move 1 square a turn. ${sense} Land on a bird to catch it.`,
        'Burrow: Stay still to dig in. Birds cannot see you, and you see any bird next to you. Moving pops you up.',
        `A bird is out after ${catches(n)}.`],
      lose, picture: 'badger' };
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
