// Landing on an egg finds it in every round, including the last. A stone is what breaks an egg.
// node testlastland.js
process.env.PORT = '0'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000';
const assert = require('assert'), fs = require('fs'), B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), TT = require('./team.js');
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };

function classic(round) {
  const g = B.newGame();
  assert(B.placeEgg(g, [6, 2])); assert(B.placeEgg(g, [2, 5])); assert(B.placeEgg(g, [2, 4]));
  B.placeOstrich(g, [1, 1]); g.vulture = [4, 2]; g.turn = 'red'; g.round = round; g.eggs.forEach(e => e.lastWarm = round);
  return g;
}

ok('How to play does not say a landing breaks an egg', () => {
  const html = fs.readFileSync(__dirname + '/public/index.html', 'utf8');
  const ui = fs.readFileSync(__dirname + '/public/ui.js', 'utf8');
  assert.ok(!html.includes('landing on an egg breaks it'));
  assert.ok(ui.includes('Last round!') && ui.includes('Final ${left} rounds!'));
});

ok('2 players: the last round only finds the egg', () => {
  const g = classic(30);
  assert.ok(B.vultureFly(g, [6, 2]));
  assert.equal(g.marks['6,2'], 'spotted');
  assert.equal(g.eggs.find(e => e.pos[0] === 6).alive, true);
  assert.equal(g.lastSmash, undefined);
  assert.equal(g.phase, 'play');
});

ok('2 players: an earlier round still only finds the egg', () => {
  const g = classic(29);
  assert.ok(B.vultureFly(g, [6, 2]));
  assert.equal(g.marks['6,2'], 'spotted');
  assert.equal(g.eggs.find(e => e.pos[0] === 6).alive, true);
});

for (const mode of ['3p', 'Hunters']) {
  ok(mode + ': the last round only finds the egg', () => {
    const g = mode === '3p' ? T.newGame3('hyena', undefined, [0, 3]) : H.newHunt(undefined, [[0, 3], [8, 3]]);
    for (const p of [[2, 1], [6, 2], [3, 5]]) assert(B.placeEgg(g, p));
    if (mode === '3p') assert(T.placeOstrich3(g, [8, 5])); else assert(H.placeOstrichH(g, [7, 5]));
    g.vulture = [4, 1]; g.round = 30; g.eggs.forEach(e => e.lastWarm = 30); g.turn = 'red';
    assert.ok(mode === '3p' ? T.vultureFly3(g, [2, 1]) : H.vultureFlyH(g, [2, 1]));
    assert.equal(g.marks['2,1'], 'spotted');
    assert.equal(g.eggs[0].alive, true);
    assert.equal(g.lastSmash, undefined);
  });
}

for (const np of [4, 5]) {
  ok((np === 4 ? '2 vs 2' : '5 players') + ': the last round only finds the egg', () => {
    const g = TT.newTeam(np, np === 5 ? 'hyena' : null, undefined, [0, 3]);
    g.phase = 'play'; g.turn = 'v1'; g.round = 30;
    g.b.o1.pos = [8, 5]; g.b.o2.pos = [8, 4]; g.b.v1.pos = [4, 1]; g.b.v2.pos = [5, 6];
    g.eggs = [{ id: 0, nest: 0, pos: [2, 1], alive: true, lastWarm: 30 }, { id: 1, nest: 1, pos: [7, 4], alive: true, lastWarm: 30 }];
    assert.ok(TT.vultureFly(g, 'v1', [2, 1]));
    assert.equal(g.marks['2,1'], 'spotted');
    assert.equal(g.eggs[0].alive, true);
    assert.equal(g.lastSmash, undefined);
  });
}

console.log('PASS testlastland', n);
process.exit(0);
