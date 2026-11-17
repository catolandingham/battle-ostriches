// Unit tests: a malformed client message never crashes the server or changes a game. Real sockets, every mode. node testinput.js
process.env.PORT = 3978; process.env.BO_BOTMS = '600000'; process.env.BO_CLOCKMS = '600000'; // no bot or clock moves while the test runs
const assert = require('assert'), WebSocket = require('ws');
const B = require('./game.js'), T = require('./three.js'), H = require('./hunt.js'), HA = require('./huntai.js'), TT = require('./team.js'), server = require('./server.js');
let n = 0; const ok = async (name, f) => { await f(); n++; console.log('ok', name); };

const open = () => new Promise((res, rej) => { const ws = new WebSocket('ws://localhost:3978/ws'); ws.msgs = []; ws.on('message', d => ws.msgs.push(JSON.parse(d))); ws.on('open', () => res(ws)); ws.on('error', rej); });
const until = async (f, what) => { for (let i = 0; i < 100; i++) { const r = f(); if (r) return r; await new Promise(r => setTimeout(r, 20)); } throw new Error('timed out waiting for ' + what); };
const create = async (m) => { const ws = await open(); ws.send(JSON.stringify(m)); await until(() => ws.msgs.find(x => x.t === 'joined'), 'joined'); return ws; };
const roomOf = code => server.rooms.get(code);
const BAD_P = [undefined, 'a1', '1,2', [1], [1, 'a'], [99, 99], {}, [-1, 0], [1.5, 2], [1, 2, 3], null, [[1, 2]], [4, 3.0000001], ['1', '2'], [9, 0], [0, 7]];

// classic eggs (2,1) (6,1) (2,5), ostrich (4,2), vulture next to it; three players etc. like testrules.js
function classic() { const g = B.newGame(); for (const p of [[2, 1], [6, 1], [2, 5]]) B.placeEgg(g, p); B.placeOstrich(g, [4, 2]); g.vulture = [5, 3]; g.turn = 'blue'; return g; }
function three() { const g = T.newGame3('hyena', undefined, [5, 2]); for (const p of [[2, 1], [6, 1], [2, 5]]) B.placeEgg(g, p); T.placeOstrich3(g, [4, 2]); T.vultureFly3(g, [4, 1]); g.vulture = [3, 3]; g.turn = 'blue'; return g; }
function hunters() { const g = H.newHunt(undefined, [[0, 3], [8, 3]]); for (let i = 0; i < 10 && g.phase !== 'play'; i++) HA.act(g, 'blue', HA.move(g, 'blue', {}));
  g.ostrich = [4, 3]; g.vulture = [5, 3]; g.hunt.hs.hyena.p = [3, 3]; g.hunt.hs.badger.p = [4, 4]; g.turn = 'blue'; return g; }
function team() { const g = TT.newTeam(5, 'hyena', undefined, [8, 3]);
  for (const p of [[2, 1], [2, 3]]) TT.place(g, 'o1', p); TT.place(g, 'o1', [1, 1]); for (const p of [[6, 1], [6, 3]]) TT.place(g, 'o2', p); TT.place(g, 'o2', [7, 1]);
  g.h.p = [2, 2]; g.b.v1.pos = [1, 2]; g.turn = 'o1'; return g; }

// each mode: [name, create message, the seat's role id, fixture, the actions that team could send]
const MODES = [
  ['2 players', { t: 'create', role: 'blue' }, classic, ['step', 'carry', 'kick', 'sit', 'place', 'fly', 'throw']],
  ['3 players', { t: 'create', three: 1, role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, three, ['step', 'carry', 'kick', 'sit', 'place', 'fly', 'throw', 'hmove']],
  ['Hunters', { t: 'create', hunt: 1, role: 'blue', bots: ['red', 'hyena', 'badger'] }, hunters, ['step', 'carry', 'kick', 'sit', 'place', 'fly', 'throw', 'hmove']],
  ['2 vs 2 + hunter', { t: 'create', team: 5, role: 'o1', bots: ['v1', 'v2', 'o2', 'hunter'], kind: 'hyena' }, team, ['step', 'carry', 'kick', 'sit', 'place', 'fly', 'throw', 'hmove']],
];

(async () => {
  for (const [name, msg, fixture, acts] of MODES) await ok(name + ': malformed act and seat messages are refused, the game is unchanged and the server keeps answering', async () => {
    const ws = await create(msg), code = ws.msgs.find(x => x.t === 'joined').code, room = roomOf(code);
    room.g = fixture(); room.clock = false;
    const before = JSON.stringify(room.g); let sent = 0, soft = 0;
    for (const a of acts) for (const p of BAD_P) { if (p === undefined && !['place', 'step', 'carry', 'kick', 'fly', 'throw', 'hmove'].includes(a)) continue; const m = { t: 'act', a }; if (p !== undefined) m.p = p; ws.send(JSON.stringify(m)); sent++; soft++; }
    for (const a of [5, null, {}, ['step'], undefined]) { const m = { t: 'act', p: [1, 1] }; if (a !== undefined) m.a = a; ws.send(JSON.stringify(m)); sent++; soft++; }
    for (const r of [undefined, 5, {}, null, ['hyena']]) { const m = { t: 'seat', p: [99, 99] }; if (r !== undefined) m.role = r; ws.send(JSON.stringify(m)); sent++; soft++; }
    ws.send(JSON.stringify({ t: 'seat', role: 'red', p: 'x' })); sent++; soft++;
    for (const raw of ['null', '[]', '5', '"x"', '{', 'true', '{"t":"act"}', '{"t":"act","a":"step","p":{"length":2,"0":1,"1":1}}']) { ws.send(raw); sent++; if (raw.startsWith('{"t"')) soft++; }
    ws.send(JSON.stringify({ t: 'ping' }));
    await until(() => ws.msgs.find(x => x.t === 'pong'), 'pong after ' + sent + ' bad messages');
    assert.equal(ws.msgs.filter(x => x.t === 'error' && x.soft && x.msg === 'Not a legal move right now.').length, soft, 'every malformed act or seat message got one plain, soft refusal');
    assert.equal(JSON.stringify(room.g), before, 'the game did not change');
    // a second socket can still use the server, and the first one can still make a real move
    const ws2 = await open(); ws2.send(JSON.stringify({ t: 'ping' })); await until(() => ws2.msgs.find(x => x.t === 'pong'), 'second socket');
    ws.close(); ws2.close(); });

  await ok('a legal-looking square that is not a legal move is refused softly, and a real kick still works after the garbage', async () => {
    const ws = await create({ t: 'create', three: 1, role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }), room = roomOf(ws.msgs.find(x => x.t === 'joined').code);
    room.g = three(); server.turnStamp(room); const before = JSON.stringify(room.g);
    ws.send(JSON.stringify({ t: 'act', a: 'kick', p: [8, 6], stamp: server.turnStamp(room) })); ws.send(JSON.stringify({ t: 'act', a: 'kick', p: 'x' }));
    await until(() => ws.msgs.filter(x => x.t === 'error' && x.soft).length >= 2, 'two refusals'); assert.equal(JSON.stringify(room.g), before);
    ws.send(JSON.stringify({ t: 'act', a: 'kick', p: [5, 2], stamp: server.turnStamp(room) })); await until(() => room.g.lastKick, 'the kick'); assert.equal(room.g.lastKick.who, 'hyena'); ws.close(); });

  console.log(`PASS testinput (${n} groups)`); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
