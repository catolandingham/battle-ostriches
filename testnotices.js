// The short lines added for the last move, a skipped turn, and a carried egg.
process.env.PORT = '0'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000';
const assert = require('assert');
const B = require('./game.js'), T = require('./three.js'), S = require('./server.js'), CT = require('./public/catchtext.js');

function eggs(g) { for (const p of [[2, 1], [6, 1], [2, 5]]) assert.ok(B.placeEgg(g, p)); }

{
  const g = B.newGame(); eggs(g); assert.ok(B.placeOstrich(g, [2, 1]));
  g.turn = 'blue'; g.phase = 'play';
  assert.ok(B.ostrichStep(g, [2, 2], true));
  assert.equal(g.carryNote.text, 'Egg will drop here next turn.');
  const room = { g, players: { blue: {}, red: {} } };
  assert.equal(S.view(room, 'blue').carryNote.text, 'Egg will drop here next turn.');
  assert.equal(S.view(room, 'red').carryNote, null);
  g.turn = 'red';
  assert.ok(B.timeout(g));
  assert.equal(S.view(room, 'red').timeNote.text, 'Out of time.');
  assert.equal(S.view(room, 'blue').timeNote.text, "Time's up. Turn skipped.");
  const seen = {};
  const prev = { phase: 'play' };
  const now = { phase: 'play', carryNote: g.carryNote, timeNote: S.view(room, 'blue').timeNote };
  const ev = CT.newEvents(seen, now, prev);
  assert.ok(ev.some(e => e.text === 'Egg will drop here next turn.'));
  assert.ok(ev.some(e => e.text === "Time's up. Turn skipped."));
}

{
  const g = T.newGame3('hyena', undefined, [4, 3]);
  eggs(g); assert.ok(T.placeOstrich3(g, [2, 1]));
  g.round = 30; g.turn = 'blue'; g.phase = 'play';
  g.eggs.forEach(e => { e.lastWarm = 30; });
  assert.ok(T.ostrichAct3(g, 'sit'));
  assert.equal(g.lastMoveNote && g.lastMoveNote.text, 'Hunter gets one last move.');
  assert.equal(g.turn, 'hunter');
  const room = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null).room;
  room.g = g;
  for (const s of ['blue', 'red', 'hunter']) assert.equal(S.view3(room, s).lastMoveNote.text, 'Hunter gets one last move.');
}

console.log('PASS notices');
process.exit(0);
