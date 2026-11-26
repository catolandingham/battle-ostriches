// Good, bad or neither, for the phone holding it (public/news.js and public/catchtext.js). One row of the table per check. No words are chosen here.
const A = require('assert'), CT = require('./public/catchtext.js'), N = require('./public/news.js');
const ost = { role: 'blue', h3: { mySeat: 'blue' } }, vul = { role: 'red', h3: { mySeat: 'red' } }, hun = k => ({ role: 'hunter', kind: k, h3: { mySeat: k === 'hyena' || k === 'badger' ? k : 'hunter', kind: k } });
const team = (seat, role) => ({ role, h3: { team: true, mySeat: seat } });
const ev = (kind, S, extra) => CT.eventTone(Object.assign({ kind, text: '' }, extra || {}), S);
// smash: ostrich red, vulture green, hunter navy
A.equal(ev('smash', ost), 'bad'); A.equal(ev('smash', vul), 'good'); A.equal(ev('smash', hun('hyena')), 'plain'); A.equal(ev('smash', team('o2', 'blue')), 'bad'); A.equal(ev('smash', team('v2', 'red')), 'good');
// a catch: the bird caught red, the hunter who caught green, a rival hunter red, the partner red, the other side navy
const lc = { bird: 'blue', by: 'hyena' };
A.equal(CT.catchTone(lc, 'blue'), 'bad'); A.equal(CT.catchTone(lc, 'hunter'), 'good'); A.equal(CT.catchTone(lc, 'hyena'), 'good'); A.equal(CT.catchTone(lc, 'badger'), 'bad'); A.equal(CT.catchTone(lc, 'red'), 'plain');
A.equal(CT.catchTone({ bird: 'o1', by: 'hyena' }, 'o2'), 'bad'); A.equal(CT.catchTone({ bird: 'o1', by: 'hyena' }, 'v1'), 'plain');
// a bird is out: its partner red, a hunter green, the other side navy
A.equal(CT.outTone('o1', team('o2', 'blue')), 'bad'); A.equal(CT.outTone('o1', hun('hyena')), 'good'); A.equal(CT.outTone('o1', team('v1', 'red')), 'plain');
// a kick: the kicker green, the one kicked red, a blocked kick red for the kicker only, everyone else navy
const kick = (S, k) => Object.assign({}, S, { kick: k });
A.equal(ev('kick', kick(ost, { by: 'blue', who: 'hyena', moved: 2 })), 'good');
A.equal(ev('kick', kick(hun('hyena'), { by: 'blue', who: 'hyena', moved: 2 })), 'bad');
A.equal(ev('kick', kick(vul, { by: 'blue', who: 'hyena', moved: 2 })), 'plain');
A.equal(ev('kick', kick(ost, { by: 'blue', who: 'hyena', moved: 0 })), 'bad');
A.equal(ev('kick', kick(vul, { by: 'blue', who: 'hyena', moved: 0 })), 'plain');
// a stone: the thrower green, the one hit red, other vultures green, everyone else navy
const stone = (S, n) => Object.assign({}, S, { stoneNote: n });
A.equal(ev('stone', stone(vul, { by: 'red', targets: ['hyena'], text: '' })), 'good');
A.equal(ev('stone', stone(hun('hyena'), { by: 'red', targets: ['hyena'], text: '' })), 'bad');
A.equal(ev('stone', stone(hun('badger'), { by: 'red', targets: ['hyena'], text: '' })), 'plain');
A.equal(ev('stone', stone(ost, { by: 'red', targets: ['hyena'], text: '' })), 'plain');
const back = 'The ostrich kicked the stone right back!', boing = 'The stone bounced off the leaf.', soft = 'The stone landed softly in the leaves.';
for (const [t, o, v, h] of [[back, 'good', 'bad', 'plain'], [boing, 'good', 'bad', 'plain'], ['The vulture batted it away with a rock.', 'good', 'bad', 'plain'], [soft, 'plain', 'bad', 'plain'], ['The stone clattered back onto the rock pile.', 'plain', 'bad', 'plain']])
  { A.equal(ev('stone', stone(ost, { by: 'red', targets: [], text: t })), o, t + ' ostrich'); A.equal(ev('stone', stone(vul, { by: 'red', targets: [], text: t })), v, t + ' vulture'); A.equal(ev('stone', stone(hun('hyena'), { by: 'red', targets: [], text: t })), h, t + ' hunter'); }
// a shove between the hunters, a burst, a pop-up, a dig-in
const riv = S => Object.assign({}, S, { h3: Object.assign({}, S.h3, { rival: { by: 'badger' } }) });
A.equal(ev('rival', riv(hun('badger'))), 'good'); A.equal(ev('rival', riv(hun('hyena'))), 'bad'); A.equal(ev('rival', riv(ost)), 'plain'); A.equal(ev('rival', riv(vul)), 'plain');
A.equal(ev('burst', hun('badger')), 'good'); A.equal(ev('burst', hun('hyena')), 'bad'); A.equal(ev('burst', ost), 'plain');
A.equal(ev('popout', ost), 'bad'); A.equal(ev('popout', vul), 'bad'); A.equal(ev('popout', hun('badger')), 'plain');
A.equal(ev('dug', Object.assign({}, hun('badger'), { h3: { mySeat: 'badger', kind: 'badger', dugSeen: true } })), 'bad'); A.equal(ev('dug', ost), 'plain');
A.equal(ev('double', ost), 'plain'); A.equal(ev('lastMove', ost), 'plain');
// fixed lines
const T = (t, S) => N.tone(t, S);
A.equal(T('Vulture found your egg!', ost), 'bad'); A.equal(T('Vulture sniffed an egg.', ost), 'bad'); A.equal(T('Found egg!', vul), 'good'); A.equal(T('Egg nearby!', vul), 'good'); A.equal(T('No egg nearby', vul), 'plain');
A.equal(T('An egg went cold.', ost), 'bad'); A.equal(T('An egg went cold.', vul), 'good'); A.equal(T('An egg went cold.', hun('hyena')), 'plain');
A.equal(T('Hyena near!', ost), 'bad'); A.equal(T('Badger near!', vul), 'bad'); A.equal(T('Bird near.', hun('hyena')), 'good'); A.equal(T('Still near.', hun('hyena')), 'good'); A.equal(T('Pounce!', hun('hyena')), 'good'); A.equal(T('Nothing near.', hun('hyena')), 'plain');
A.equal(T('Look out!', ost), 'bad'); A.equal(T('You ate.', ost), 'good'); A.equal(T('You ate.', vul), 'plain'); A.equal(T('You ate.', hun('hyena')), 'plain'); A.equal(T('Egg near', vul), 'good'); A.equal(T('No egg', vul), 'plain');
A.equal(T('The vulture hunts eggs.', ost), 'plain'); A.equal(T('Some line nobody listed', ost), 'plain');
// the hint: only a line that is news changes color; the turn prompt after it does not matter
const HT = (t, S) => N.hintTone(t, S);
A.equal(HT('Kicked it back! Your turn. Tap to move.', ost), 'good'); A.equal(HT('Missed. Your turn. Tap to move.', ost), 'good'); A.equal(HT('The vulture found an egg! Move it or sit on it.', ost), 'bad');
A.equal(HT('Hungry! Go eat.', ost), 'bad'); A.equal(HT('Egg cooling. Go back.', ost), 'bad'); A.equal(HT('The vulture sees you sit.', ost), 'bad');
A.equal(HT('Found an egg. Throw on it.', vul), 'good'); A.equal(HT('Found it. Get a stone first.', vul), 'good'); A.equal(HT("You're on the egg!", vul), 'good'); A.equal(HT('Miss. Your turn. Tap to fly.', vul), 'bad'); A.equal(HT('Bounced! No egg.', vul), 'bad'); A.equal(HT('Bounced! Egg under ostrich.', vul), 'bad');
A.equal(HT('Tap to move, or Burrow. A bird will see you dig in.', hun('badger')), 'bad'); A.equal(HT('Tap to move, or Burrow. No bird will see you dig in.', hun('badger')), 'good');
A.equal(HT('Your turn. Tap to move.', ost), 'plain'); A.equal(HT("Vulture's turn…", ost), 'plain'); A.equal(HT('Sit on eggs to warm them.', ost), 'plain');
// the end title
const end = (S, winner, extra) => N.endTone(Object.assign({}, S, { winner }, extra || {}));
A.equal(end(ost, 'blue'), 'good'); A.equal(end(ost, 'red'), 'bad'); A.equal(end(ost, 'hunter'), 'bad'); A.equal(end(hun('hyena'), 'hunter'), 'good'); A.equal(end(vul, 'red'), 'good');
A.equal(end(team('o1', 'blue'), 'blue'), 'good'); A.equal(end(team('v1', 'red'), 'blue'), 'bad'); A.equal(end(hun('hyena'), 'hyena'), 'good'); A.equal(end(hun('badger'), 'hyena'), 'bad'); A.equal(end(ost, 'hyena'), 'bad');
A.equal(end(ost, 'none'), ''); A.equal(end(ost, 'blue', { pass: true }), ''); A.equal(end(ost, 'blue', { winBy: 'left' }), '');
// Brian, 2026-11-25: "Out of time." is red on the phone whose clock ran out; every other phone gets "Time's up. Turn skipped." in navy. Checked on the real views.
{
  process.env.PORT = '0'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000';
  const B = require('./game.js'), T3 = require('./three.js'), SV = require('./server.js');
  const toneFor = (view, g) => { const seen = {}; const ev = CT.newEvents(seen, Object.assign({ phase: 'play' }, view), { phase: 'play' }).find(e => e.kind === 'time'); return ev && { text: ev.text, tone: CT.eventTone(ev, view) }; };
  A.equal(CT.eventTone({ kind: 'time', text: 'Out of time.' }, ost), 'bad'); A.equal(CT.eventTone({ kind: 'time', text: "Time's up. Turn skipped." }, vul), 'plain');
  { // 2 players: the vulture ran out
    const g = B.newGame(); for (const p of [[2, 1], [6, 1], [2, 5]]) A.ok(B.placeEgg(g, p)); A.ok(B.placeOstrich(g, [2, 1])); g.turn = 'red'; g.phase = 'play'; A.ok(B.timeout(g));
    const room = { g, players: { blue: {}, red: {} } };
    A.deepEqual(toneFor(SV.view(room, 'red')), { text: 'Out of time.', tone: 'bad' }); A.deepEqual(toneFor(SV.view(room, 'blue')), { text: "Time's up. Turn skipped.", tone: 'plain' });
  }
  { // 3 players: the ostrich ran out; the vulture and the hunter are navy
    const g = T3.newGame3('hyena', undefined, [4, 3]); for (const p of [[2, 1], [6, 1], [2, 5]]) A.ok(B.placeEgg(g, p)); A.ok(T3.placeOstrich3(g, [2, 1])); g.turn = 'blue'; g.phase = 'play'; A.ok(T3.timeout(g));
    const room = SV.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null).room; room.g = g;
    A.deepEqual(toneFor(SV.view3(room, 'blue')), { text: 'Out of time.', tone: 'bad' });
    for (const s of ['red', 'hunter']) A.deepEqual(toneFor(SV.view3(room, s)), { text: "Time's up. Turn skipped.", tone: 'plain' });
  }
}
console.log('PASS news: good, bad and neither for every animal on the lines that are news');
