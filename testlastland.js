// Last round: a vulture that lands on an egg breaks it. Earlier rounds only find it. Every mode.
// node testlastland.js
process.env.PORT = '0'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000';
const assert = require('assert'), fs = require('fs'), B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), TT = require('./team.js'),
  AI = require('./ai.js'), CT = require('./public/catchtext.js'), S = require('./server.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const LINE = 'In the last round, landing on an egg breaks it.';
const smashLine = (v) => CT.viewerEvent({ kind: 'smash', text: 'The vulture smashed an egg.' }, v);
const has = (v, p) => JSON.stringify(v).includes(p[0] + ',' + p[1]);
const dead = (g, p) => { const e = g.eggs.find(x => x.pos && x.pos[0] === p[0] && x.pos[1] === p[1]); return e && e.alive === false; };

function classic(round) {
  const g = B.newGame();
  assert(B.placeEgg(g, [6, 2])); assert(B.placeEgg(g, [2, 5])); assert(B.placeEgg(g, [2, 4]));
  B.placeOstrich(g, [1, 1]); g.vulture = [4, 2]; g.turn = 'red'; g.round = round; g.eggs.forEach(e => e.lastWarm = round);
  return g;
}
function room2(g) { return { g, code: 'ZZ', players: { blue: {}, red: {} }, ai: 'bot' }; }

ok('How to play says the last round breaks an egg, in one short line', () => {
  const html = fs.readFileSync(__dirname + '/public/index.html', 'utf8');
  assert.ok(html.includes('<li>' + LINE + '</li>'), 'the sentence is its own How to play line');
  assert.ok(!/[-–—→]/.test(LINE), LINE);
  assert.ok(!/honey|red|blue|green|yellow|orange|purple|gray|grey|white|black/i.test(LINE));
});

ok('2 players: an earlier round still only finds the egg', () => {
  const g = classic(29), stones = g.stones;
  assert.ok(B.vultureFly(g, [6, 2]));
  assert.equal(g.marks['6,2'], 'spotted'); assert.equal(g.eggs.find(e => e.pos[0] === 6).alive, true);
  assert.equal(g.lastSmash, undefined); assert.deepEqual(g.lastAction.spotted, [6, 2]);
  assert.equal(g.stones, stones); assert.equal(g.phase, 'play'); assert.equal(g.turn, 'blue');
  assert.equal(B.sniffAnnounce(g, 'red'), 'Found egg!');
});

ok('2 players: the last round breaks the egg, spends no stone, and keeps the smash lines', () => {
  const g = classic(30), stones = 0; g.stones = 0;
  assert.ok(B.vultureFly(g, [6, 2]));
  assert.equal(dead(g, [6, 2]), true); assert.equal(g.marks['6,2'], 'hit'); assert.equal(g.marks['6,2'] === 'spotted', false);
  assert.equal(g.lastAction.spotted, undefined); assert.deepEqual(g.lastAction.smashed, [6, 2]);
  assert.equal(g.lastSmash.by, 'red'); assert.equal(g.lastSmash.owner, 'blue');
  assert.equal(g.stones, stones, 'a landing break does not use a stone');
  assert.equal(g.phase, 'play'); assert.equal(g.turn, 'blue'); assert.equal(g.winner, null);
  assert.equal(g.eggs.filter(e => e.alive).length, 2);
  assert.equal(B.sniffAnnounce(g, 'red'), 'No egg nearby', 'the broken egg is not announced as a find');
  assert.equal(AI.redView(g).marks['6,2'], 'hit'); assert.equal(AI.redView(g).marks['2,5'], undefined);
  assert.deepEqual(AI.redView(g).lastAction.smashed, [6, 2]); assert.equal(AI.redView(g).lastAction.spotted, null);
  const room = room2(g), red = S.view(room, 'red'), blue = S.view(room, 'blue');
  assert.equal(smashLine(red), 'You smashed an egg!');
  assert.equal(smashLine(blue), 'The vulture smashed your egg!');
  assert.ok(!has(red, [2, 5]) && !has(red, [2, 4]), 'the vulture is not shown the eggs it did not break');
});

ok('2 players: landing beside an egg in the last round only sniffs, and the last egg wins', () => {
  const g = classic(30); g.vulture = [5, 4];
  assert.ok(B.vultureFly(g, [4, 4])); // next to nothing; [2,4] is 2 away
  assert.equal(g.lastSmash, undefined); assert.equal(g.eggs.every(e => e.alive), true); assert.equal(g.marks['4,4'], undefined);
  const near = classic(30); near.eggs[1].pos = [6, 3]; // [6,3] is next to the landing [6,2]
  assert.ok(B.vultureFly(near, [6, 2]));
  assert.equal(dead(near, [6, 2]), true); assert.equal(near.eggs.find(e => e.pos[0] === 6 && e.pos[1] === 3).alive, true);
  assert.equal(B.sniffAnnounce(near, 'red'), 'Egg nearby!'); assert.equal(near.marks['6,3'], undefined);
  const last = classic(30); last.eggs.forEach(e => { if (e.pos[0] !== 6) e.alive = false; });
  assert.ok(B.vultureFly(last, [6, 2]));
  assert.equal(last.phase, 'over'); assert.equal(last.winner, 'red'); assert.equal(last.winBy, 'smashed'); assert.equal(last.turn, 'red');
  const guard = classic(30); guard.ostrich = [6, 2]; guard.turn = 'red';
  assert.equal(B.vultureFly(guard, [6, 2]), false); assert.equal(guard.eggs.every(e => e.alive), true);
});

function birdGame(round, mode) {
  if (mode === '3p') {
    const g = T.newGame3('hyena', undefined, [0, 3]);
    for (const p of [[2, 1], [6, 2], [3, 5]]) assert(B.placeEgg(g, p));
    assert(T.placeOstrich3(g, [8, 5])); g.vulture = [4, 1]; g.round = round; g.eggs.forEach(e => e.lastWarm = round); g.turn = 'red';
    return g;
  }
  const g = H.newHunt(undefined, [[0, 3], [8, 3]]);
  for (const p of [[2, 1], [6, 2], [3, 5]]) assert(B.placeEgg(g, p));
  assert(H.placeOstrichH(g, [7, 5])); g.vulture = [4, 1]; g.round = round; g.eggs.forEach(e => e.lastWarm = round); g.turn = 'red';
  return g;
}
function flyBird(g, mode) { return mode === '3p' ? T.vultureFly3(g, [2, 1]) : H.vultureFlyH(g, [2, 1]); }

for (const mode of ['3p', 'Hunters']) {
  ok(mode + ': an earlier round still only finds the egg', () => {
    const g = birdGame(29, mode);
    assert.ok(flyBird(g, mode));
    assert.equal(g.marks['2,1'], 'spotted'); assert.equal(g.eggs[0].alive, true); assert.equal(g.lastSmash, undefined);
    assert.equal(g.phase, 'play'); assert.equal(g.turn, 'blue');
  });
  ok(mode + ': the last round breaks the egg and does not tell a hunter where the others are', () => {
    const g = birdGame(30, mode), stones = g.stones;
    assert.ok(flyBird(g, mode));
    assert.equal(g.eggs[0].alive, false); assert.equal(g.marks['2,1'], 'hit'); assert.equal(g.lastAction.spotted, undefined);
    assert.deepEqual(g.lastAction.smashed, [2, 1]); assert.equal(g.lastSmash.by, 'red'); assert.equal(g.lastSmash.owner, 'blue');
    assert.equal(g.stones, stones); assert.equal(g.phase, 'play'); assert.equal(g.turn, 'blue');
    assert.equal(g.eggs.filter(e => e.alive).length, 2);
    assert.equal(B.sniffAnnounce(g, 'red'), 'No egg nearby');
    const room = mode === '3p'
      ? S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null).room
      : S.createH({ role: 'badger', bots: ['blue', 'red', 'hyena'] }, null).room;
    room.g = g;
    const view = mode === '3p' ? (r => S.view3(room, r)) : (r => S.viewH(room, r));
    const red = view('red'), blue = view('blue');
    assert.equal(smashLine(red), 'You smashed an egg!');
    assert.equal(smashLine(blue), 'The vulture smashed your egg!');
    const hunters = mode === '3p' ? ['hunter'] : ['hyena', 'badger'];
    for (const seat of hunters) {
      const v = view(seat), wire = JSON.parse(JSON.stringify(v));
      assert.equal(v.marks['2,1'], 'stone', 'the broken square is the public wreck');
      assert.ok(!Object.values(v.marks).includes('spotted'));
      assert.equal(wire.eggs, undefined); assert.equal(v.lastAction, null); assert.equal(v.sniff, null);
      assert.equal(v.smashNote.owner, null);
      assert.equal(smashLine(v), 'The vulture smashed an egg.');
      for (const p of [[6, 2], [3, 5], [8, 5], [7, 5], [4, 1]]) assert.ok(!has(v, p), seat + ' must not see ' + p);
    }
    const win = birdGame(30, mode); win.eggs.forEach((e, i) => { if (i) e.alive = false; });
    assert.ok(flyBird(win, mode));
    assert.equal(win.phase, 'over'); assert.equal(win.winner, 'red'); assert.equal(win.winBy, 'smashed');
    assert.equal(win.endWhy, 'The vulture smashed every egg.');
  });
}

function teamGame(np, round) {
  const g = TT.newTeam(np, np === 5 ? 'hyena' : null, undefined, [0, 3]);
  g.phase = 'play'; g.turn = 'v1'; g.round = round;
  g.b.o1.pos = [8, 5]; g.b.o2.pos = [8, 4]; g.b.v1.pos = [4, 1]; g.b.v2.pos = [5, 6];
  if (g.h) g.h.p = [0, 3];
  g.eggs = [
    { id: 0, nest: 0, pos: [2, 1], alive: true, lastWarm: round },
    { id: 1, nest: 0, pos: [6, 2], alive: true, lastWarm: round },
    { id: 2, nest: 1, pos: [3, 5], alive: true, lastWarm: round },
    { id: 3, nest: 1, pos: [7, 4], alive: true, lastWarm: round },
  ];
  g.b.v1.stones = 0;
  return g;
}

for (const np of [4, 5]) {
  const name = np === 4 ? '2 vs 2' : '2 vs 2 + hunter';
  ok(name + ': an earlier round still only finds the egg', () => {
    const g = teamGame(np, 29);
    assert.ok(TT.vultureFly(g, 'v1', [2, 1]));
    assert.equal(g.marks['2,1'], 'spotted'); assert.equal(g.eggs[0].alive, true); assert.equal(g.lastSmash, undefined);
    assert.equal(g.phase, 'play'); assert.equal(g.turn, 'o1');
  });
  ok(name + ': the last round breaks that ostrich\'s egg and hides the rest', () => {
    const g = teamGame(np, 30);
    assert.ok(TT.vultureFly(g, 'v1', [2, 1]));
    assert.equal(g.eggs[0].alive, false); assert.equal(g.marks['2,1'], 'hit'); assert.equal(g.lastAction.spotted, undefined);
    assert.deepEqual(g.lastAction.smashed, [2, 1]); assert.equal(g.lastSmash.by, 'v1'); assert.equal(g.lastSmash.owner, 'o1');
    assert.equal(g.b.v1.stones, 0); assert.equal(g.phase, 'play'); assert.equal(g.turn, 'o1');
    assert.equal(g.sniffs.v1.yes, false); assert.equal(g.sniffKeeps.v1, null);
    assert.equal(g.eggs.filter(e => e.alive).length, 3);
    const room = S.createT({ team: np, role: 'o1', bots: np === 5 ? ['v1', 'v2', 'o2', 'hunter'] : ['v1', 'v2', 'o2'], kind: 'hyena' }, null).room;
    room.g = g;
    const view = r => S.viewT(room, r);
    assert.equal(smashLine(view('v1')), 'You smashed an egg!');
    assert.equal(smashLine(view('o1')), 'The vulture smashed your egg!');
    assert.equal(smashLine(view('o2')), "The vulture smashed Ostrich 1's egg!");
    assert.equal(smashLine(view('v2')), "The vulture smashed Ostrich 1's egg!");
    const v2 = view('v2');
    assert.equal(v2.marks['2,1'], 'hit'); assert.equal(v2.eggs, undefined);
    for (const p of [[6, 2], [3, 5], [7, 4]]) assert.ok(!has(v2, p), 'v2 must not see ' + p);
    if (np === 5) {
      const hv = view('hunter'), wire = JSON.parse(JSON.stringify(hv));
      assert.equal(hv.marks['2,1'], 'stone'); assert.ok(!Object.values(hv.marks).includes('spotted'));
      assert.equal(wire.eggs, undefined); assert.equal(hv.lastAction, null); assert.equal(hv.sniff, null);
      assert.equal(hv.smashNote.owner, 'o1');
      assert.equal(smashLine(hv), "The vulture smashed Ostrich 1's egg!");
      for (const p of [[6, 2], [3, 5], [7, 4], [8, 5], [8, 4], [4, 1], [5, 6]]) assert.ok(!has(hv, p), 'hunter must not see ' + p);
    }
    g.turn = 'v2'; g.b.v2.pos = [6, 4];
    assert.ok(TT.vultureFly(g, 'v2', [7, 4]));
    assert.equal(g.eggs[3].alive, false); assert.equal(g.marks['7,4'], 'hit'); assert.equal(g.lastSmash.by, 'v2'); assert.equal(g.lastSmash.owner, 'o2');
    const last = teamGame(np, 30); last.eggs.forEach((e, i) => { if (i) e.alive = false; });
    assert.ok(TT.vultureFly(last, 'v1', [2, 1]));
    assert.equal(last.phase, 'over'); assert.equal(last.winner, 'red'); assert.equal(last.winBy, 'smashed');
    assert.equal(last.endWhy, 'The vultures smashed every egg.');
  });
}

S.close();
console.log('PASS testlastland', n);
process.exit(0);
