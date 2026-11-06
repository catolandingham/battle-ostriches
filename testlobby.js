// Lobby rules: role switching, dynamic join counts, bots at Start, solo bot count,
// 4-player setup choice, rematch role changes, late joiners. No live service.
const assert = require('assert');
const LB = require('./lobby.js');
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };
function humans(k, extra) {
  const list = [];
  for (let i = 0; i < k; i++) list.push({ id: 'h' + i, name: 'Player ' + (i + 1), host: i === 0, role: null, kind: null, token: 't' + i, ws: null });
  return Object.assign({ humans: list, botsWanted: 0, solo: false, setupChoice: null, recovery: null, clock: true, level: 'normal', hunterKind: null, code: 'ABCD', note: '' }, extra || {});
}
t('one friend previews 2p roles and cannot start', () => {
  const r = humans(1); LB.reconcile(r);
  const v = LB.view(r, 'h0');
  assert.equal(v.preview, '2'); assert.equal(v.canStart, false); assert.equal(v.reason, 'need');
  assert.deepEqual(v.roles.map(x => x.id), ['blue', 'red']);
});
t('role switch releases the previous role', () => {
  const r = humans(1); LB.reconcile(r);
  assert.equal(LB.claim(r, 'h0', 'red').ok, true);
  assert.equal(LB.claim(r, 'h0', 'blue').ok, true);
  assert.equal(r.humans[0].role, 'blue');
  assert.equal(LB.view(r, 'h0').roles.filter(x => x.taken).length, 1);
});
t('two humans infer ostrich vs vulture and fill both seats at start', () => {
  const r = humans(2); LB.claim(r, 'h0', 'red');
  const p = LB.plan(r);
  assert.equal(p.setup, '2');
  assert.equal(p.assignments.find(a => a.seat === 'red').human.id, 'h0');
  assert.equal(p.assignments.find(a => a.seat === 'blue').human.id, 'h1');
  assert.equal(p.botSeats.length, 0);
});
t('a taken role cannot be stolen', () => {
  const r = humans(2); LB.claim(r, 'h0', 'blue');
  assert.ok(LB.claim(r, 'h1', 'blue').error);
});
t('host is not limited to the birds', () => {
  const r = humans(2); r.botsWanted = 1; LB.reconcile(r);
  assert.equal(LB.claim(r, 'h0', 'hunter', 'badger').ok, true);
  assert.equal(LB.plan(r).assignments.find(a => a.seat === 'hunter').human.id, 'h0');
});
t('bots fill only the roles left at start', () => {
  const r = humans(2); LB.setBots(r, 1, 'h0');
  const p = LB.plan(r);
  assert.equal(p.setup, '3'); assert.deepEqual(p.botSeats, ['hunter']); assert.equal(p.kind, 'hyena');
});
t('solo bot count selects the setup', () => {
  const r = humans(1, { solo: true, botsWanted: 1 }); LB.clampBots(r);
  assert.equal(LB.plan(r).setup, '2');
  r.botsWanted = 2; LB.clampBots(r); LB.reconcile(r);
  LB.claim(r, 'h0', 'hunter', 'badger');
  const p = LB.plan(r);
  assert.equal(p.setup, '3'); assert.equal(p.kind, 'badger'); assert.deepEqual(p.botSeats.sort(), ['blue', 'red']);
  r.botsWanted = 4; LB.clampBots(r); LB.reconcile(r);
  assert.equal(LB.plan(r).setup, '5');
});
t('4 players follow the roles: birds are 2v2, hunters are Hunters', () => {
  const r = humans(4);
  assert.equal(LB.effective(r).setup, '4');
  let p = LB.plan(r);
  assert.equal(p.setup, '4');
  assert.deepEqual(p.assignments.map(a => a.seat), ['o1', 'v1', 'o2', 'v2']);
  LB.claim(r, 'h0', 'hyena'); LB.claim(r, 'h1', 'badger');
  p = LB.plan(r);
  assert.equal(p.setup, '4h');
  assert.equal(p.assignments.find(a => a.seat === 'hyena').human.id, 'h0');
  assert.equal(p.assignments.find(a => a.seat === 'badger').human.id, 'h1');
  assert.ok(LB.setChoice(r, '4', 'h0').error);
});
t('too many ostriches is recoverable and does not start', () => {
  const r = humans(4);
  LB.claim(r, 'h0', 'ostrich'); LB.claim(r, 'h1', 'ostrich'); LB.claim(r, 'h2', 'ostrich');
  const v = LB.effective(r);
  assert.equal(v.reason, 'mix');
  assert.match(v.hint, /two ostriches/);
  assert.ok(LB.plan(r).error);
});
t('6 players get a recovery choice, not a dead end', () => {
  const r = humans(6);
  assert.equal(LB.effective(r).reason, 'unsupported');
  assert.ok(LB.plan(r).error);
  LB.setRecovery(r, 'play5', 'h0');
  const p = LB.plan(r);
  assert.equal(p.setup, '5'); assert.equal(p.bench.length, 1); assert.equal(p.bench[0].id, 'h5');
});
t('turn timer defaults on and only the host changes it', () => {
  const r = humans(2);
  assert.equal(LB.view(r, 'h0').clock, true);
  assert.ok(LB.setClock(r, false, 'h1').error);
  assert.equal(LB.setClock(r, false, 'h0').ok, true);
  assert.equal(r.clock, false);
});
t('same-roles rematch keeps a full room', () => {
  const d = LB.sameOrAdapt({ humans: [{ id: 'h0', role: 'blue', host: true, token: 'a', name: 'Player 1' }, { id: 'h1', role: 'red', host: false, token: 'b', name: 'Player 2' }], bots: [], arrivals: [], hunterKind: null });
  assert.equal(d.type, 'same');
});
t('a late joiner replaces a bot on same roles', () => {
  const d = LB.sameOrAdapt({ humans: [{ id: 'h0', role: 'blue', host: true, token: 'a', name: 'Player 1' }], bots: ['red'], arrivals: [{ id: 'h1', token: 'b', name: 'Player 2' }], hunterKind: null });
  assert.equal(d.type, 'replace'); assert.equal(d.placed[0].role, 'red'); assert.deepEqual(d.bots, []);
});
t('a late joiner expands a unique setup and keeps old roles', () => {
  const d = LB.sameOrAdapt({
    humans: [{ id: 'h0', role: 'blue', host: true, token: 'a', name: 'Player 1' }, { id: 'h1', role: 'red', token: 'b', name: 'Player 2' }],
    bots: [], arrivals: [{ id: 'h2', token: 'c', name: 'Player 3' }], setupChoice: null, hunterKind: null,
  });
  assert.equal(d.type, 'expand'); assert.equal(d.plan.setup, '3');
  assert.equal(d.plan.assignments.find(a => a.seat === 'blue').human.id, 'h0');
  assert.equal(d.plan.assignments.find(a => a.seat === 'hunter').human.id, 'h2');
});
t('a late joiner that makes 4 players keeps Hunters when a hunter is already claimed', () => {
  const d = LB.sameOrAdapt({
    humans: [{ id: 'a', role: 'blue', name: 'A' }, { id: 'b', role: 'red', name: 'B' }, { id: 'c', role: 'hunter', kind: 'hyena', name: 'C' }],
    bots: [], arrivals: [{ id: 'd', name: 'Player 4' }], setupChoice: null,
  });
  assert.equal(d.type, 'expand'); assert.equal(d.plan.setup, '4h');
  assert.equal(d.plan.assignments.find(a => a.seat === 'badger').human.id, 'd');
});
t('adding computers to two birds becomes 2 vs 2 without a setup button', () => {
  const r = humans(2); LB.claim(r, 'h0', 'blue'); LB.claim(r, 'h1', 'red');
  LB.setBots(r, 2, 'h0');
  assert.equal(LB.effective(r).setup, '4');
  assert.equal(r.humans[0].role, 'o1'); assert.equal(r.humans[1].role, 'v1');
  const p = LB.plan(r);
  assert.deepEqual(p.botSeats, ['o2', 'v2']);
});

process.env.PORT = 3977; process.env.BO_NOSTORE = '1'; process.env.BO_CLOCKMS = '60000';
const server = require('./server.js');
const WS = require('ws');
const conn = () => new Promise(res => { const w = new WS('ws://localhost:3977/ws'); const q = []; w.on('message', d => q.push(JSON.parse(d.toString()))); w.on('open', () => res({ w, q, send: o => w.send(JSON.stringify(o)) })); });
const from = c => { c.from = c.q.length; };
const wait = (c, f, ms = 4000) => new Promise((res, rej) => { const t0 = Date.now(); const i = setInterval(() => { const m = c.q.slice(c.from || 0).reverse().find(f); if (m) { clearInterval(i); res(m); } else if (Date.now() - t0 > ms) { clearInterval(i); rej(new Error('timeout ' + JSON.stringify(c.q.slice(-3)))); } }, 15); });
const roomOf = code => server.rooms.get(code);

(async () => {
  const A = await conn();
  A.send({ t: 'create', friends: 1 });
  const ja = await wait(A, m => m.t === 'joined' && m.lobby);
  const code = ja.code;
  let va = await wait(A, m => m.t === 'state' && m.lobby);
  assert.equal(va.state.code, code); assert.equal(va.state.canStart, false); assert.equal(va.state.host, true);
  A.send({ t: 'lobby', a: 'role', role: 'red' });
  va = await wait(A, m => m.t === 'state' && m.lobby && m.state.roles.some(r => r.id === 'red' && r.mine));
  A.send({ t: 'lobby', a: 'role', role: 'blue' });
  va = await wait(A, m => m.t === 'state' && m.lobby && m.state.roles.some(r => r.id === 'blue' && r.mine) && !m.state.roles.some(r => r.id === 'red' && r.mine));
  assert.ok(va, 'switched to ostrich');
  const B = await conn();
  B.send({ t: 'join', code });
  const vb = await wait(B, m => m.t === 'state' && m.lobby && m.state.humanCount === 2);
  assert.equal(vb.state.setup, '2'); assert.equal(vb.state.host, false);
  B.send({ t: 'lobby', a: 'start' });
  const denied = await wait(B, m => m.t === 'error');
  assert.match(denied.msg, /host/);
  await wait(A, m => m.t === 'state' && m.lobby && m.state.humanCount === 2);
  A.send({ t: 'lobby', a: 'start' });
  const play = await wait(A, m => m.t === 'state' && !m.lobby && m.state.phase === 'setupEggs');
  assert.equal(play.state.role, 'blue'); assert.equal(play.state.joined, true);
  const playB = await wait(B, m => m.t === 'state' && !m.lobby && m.state.role === 'red');
  assert.equal(playB.state.joined, true);
  const live = roomOf(code);
  assert.deepEqual(Object.keys(live.players).sort(), ['blue', 'red']);
  assert.ok(!live.players.blue.bot && !live.players.red.bot, 'no bot left waiting for a human');
  console.log('ok ws role switch, dynamic 2p, host start');

  const C = await conn();
  C.send({ t: 'join', code });
  const full = await wait(C, m => m.t === 'error');
  assert.match(full.msg, /two players/);
  console.log('ok full game rejects a third seat');

  live.g.phase = 'over'; live.g.winner = 'blue';
  from(A);
  const D = await conn();
  D.send({ t: 'join', code });
  const bench = await wait(D, m => m.t === 'state' && m.lobby && m.state.between);
  assert.match(bench.state.note, /next game/);
  A.send({ t: 'act', a: 'rematch', how: 'same' });
  const expanded = await wait(D, m => m.t === 'state' && !m.lobby && m.state.role === 'hunter');
  assert.equal(expanded.state.h3.kind, 'hyena');
  const stillBlue = await wait(A, m => m.t === 'state' && !m.lobby && m.state.role === 'blue' && m.state.phase === 'setupEggs' && m.state.h3);
  assert.equal(stillBlue.state.role, 'blue');
  console.log('ok late joiner expands 2p into hunter and keeps roles');

  from(A);
  A.send({ t: 'act', a: 'rematch', how: 'change' });
  const back = await wait(A, m => m.t === 'state' && m.lobby && m.state.humanCount === 3 && !m.state.roles.some(r => r.mine));
  assert.equal(back.state.setup, '3');
  A.send({ t: 'lobby', a: 'role', role: 'hunter', kind: 'badger' });
  await wait(A, m => m.t === 'state' && m.lobby && m.state.roles.some(r => r.id === 'hunter' && r.mine && r.kind === 'badger'));
  from(A);
  A.send({ t: 'lobby', a: 'start' });
  const again = await wait(A, m => m.t === 'state' && !m.lobby && m.state.role === 'hunter');
  assert.equal(again.state.kind, 'badger');
  console.log('ok change roles clears claims and starts the new pick');

  const S = await conn();
  S.send({ t: 'create', solo: 1, bots: 2 });
  await wait(S, m => m.t === 'state' && m.lobby && m.state.solo && m.state.setup === '3');
  S.send({ t: 'lobby', a: 'clock', on: false });
  S.send({ t: 'lobby', a: 'level', level: 'easy' });
  S.send({ t: 'lobby', a: 'role', role: 'hunter', kind: 'hyena' });
  await wait(S, m => m.t === 'state' && m.lobby && m.state.clock === false && m.state.level === 'easy');
  S.send({ t: 'lobby', a: 'start' });
  const solo = await wait(S, m => m.t === 'state' && !m.lobby && m.state.role === 'hunter');
  const soloRoom = roomOf(solo.state.code);
  assert.equal(soloRoom.level, 'easy');
  assert.deepEqual(soloRoom.bots.sort(), ['blue', 'red']);
  assert.equal(soloRoom.g.three.kind, 'hyena');
  soloRoom.g.phase = 'play'; soloRoom.g.turn = 'red';
  server.broadcast(soloRoom);
  assert.equal(soloRoom.deadline, null, 'timer off means no shot clock');
  soloRoom.clock = true; soloRoom.clockKey = null;
  server.broadcast(soloRoom);
  assert.ok(soloRoom.deadline, 'timer on arms the shot clock');
  clearTimeout(soloRoom.clockT); clearTimeout(soloRoom.aiT);
  console.log('ok solo bot count, level, and turn timer');

  const H = await conn();
  H.send({ t: 'create', friends: 1 });
  const hj = await wait(H, m => m.t === 'joined');
  const mates = [];
  for (let i = 0; i < 3; i++) { const c = await conn(); mates.push(c); c.send({ t: 'join', code: hj.code }); await wait(c, m => m.t === 'state' && m.lobby); }
  const four = await wait(H, m => m.t === 'state' && m.lobby && m.state.humanCount === 4 && m.state.setup === '4');
  assert.ok(four.state.roles.some(r => r.id === 'hyena') && four.state.roles.some(r => r.id === 'ostrich'));
  H.send({ t: 'lobby', a: 'role', role: 'hyena' });
  await wait(H, m => m.t === 'state' && m.lobby && m.state.setup === '4h');
  mates[0].send({ t: 'lobby', a: 'role', role: 'badger' });
  await wait(H, m => m.t === 'state' && m.lobby && m.state.roles.some(r => r.id === 'badger' && r.taken && !r.mine));
  H.send({ t: 'lobby', a: 'start' });
  const hunt = await wait(H, m => m.t === 'state' && !m.lobby && m.state.role === 'hunter');
  const huntRoom = roomOf(hunt.state.code);
  assert.equal(huntRoom.hunt, true);
  assert.equal(huntRoom.players.hyena.token, hj.token);
  console.log('ok 4p roles choose Hunters without a setup step');

  console.log(n + ' lobby rule checks passed');
  server.close();
  process.exit(0);
})().catch(e => { console.error(e); try { server.close(); } catch {} process.exit(1); });
