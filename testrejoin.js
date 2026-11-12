// Mid-game rejoin: a token still takes the seat; a lost token can claim only an offline human seat.
const assert = require('assert');
const WS = require('ws');
const LB = require('./lobby.js');
process.env.PORT = 3978; process.env.BO_NOSTORE = '1'; process.env.BO_CLOCKMS = '60000';
const server = require('./server.js');
const conn = () => new Promise(res => { const w = new WS('ws://localhost:3978/ws'); const q = []; w.on('message', d => q.push(JSON.parse(d.toString()))); w.on('open', () => res({ w, q, send: o => w.send(JSON.stringify(o)) })); });
const wait = (c, f, ms = 4000) => new Promise((res, rej) => { const t0 = Date.now(); const i = setInterval(() => { const m = c.q.find(f); if (m) { clearInterval(i); res(m); } else if (Date.now() - t0 > ms) { clearInterval(i); rej(new Error('timeout')); } }, 15); });
const from = c => { c.q.length = 0; };
const roomOf = code => server.rooms.get(code);
const closed = c => new Promise(res => { c.w.on('close', res); c.w.close(); });

async function startFriends(n) {
  const a = await conn(); a.send({ t: 'create', friends: 1 });
  const aj = await wait(a, m => m.t === 'joined' && m.lobby);
  const others = [];
  for (let i = 1; i < n; i++) {
    const c = await conn(); c.send({ t: 'join', code: aj.code });
    await wait(c, m => m.t === 'joined');
    others.push(c);
  }
  await wait(a, m => m.t === 'state' && m.lobby && m.state.humanCount === n);
  const roles = n === 2 ? ['blue', 'red'] : n === 3 ? ['blue', 'red', 'hyena'] : ['ostrich', 'vulture'];
  if (n === 4) {
    a.send({ t: 'lobby', a: 'bots', n: 0 });
    // 4 humans: wait until setup is 4, then claim team sides if needed
  }
  if (n >= 3) {
    a.send({ t: 'lobby', a: 'role', role: n === 3 ? 'blue' : 'ostrich' });
    others[0].send({ t: 'lobby', a: 'role', role: n === 3 ? 'red' : 'vulture' });
    if (n === 3) others[1].send({ t: 'lobby', a: 'role', role: 'hyena' });
    if (n === 4) {
      // two more people need animal sides: add 2 bots then start 2v2? We want 4 humans.
    }
  }
  await wait(a, m => m.t === 'state' && m.lobby && m.state.canStart === true, 4000).catch(() => {});
  a.send({ t: 'lobby', a: 'start' });
  const st = await wait(a, m => m.t === 'state' && !m.lobby && m.state.phase);
  const seats = { a: { c: a, token: aj.token, role: st.state.role } };
  // collect others' game states
  for (let i = 0; i < others.length; i++) {
    const ost = await wait(others[i], m => m.t === 'state' && !m.lobby && m.state.role);
    seats['p' + (i + 1)] = { c: others[i], token: (others[i].q.find(m => m.t === 'joined') || {}).token, role: ost.state.role };
  }
  return { code: aj.code, live: roomOf(aj.code), seats, a, others };
}

(async () => {
  // ---- 2 players, friends lobby ----
  const g2 = await startFriends(2);
  const ostrich = Object.values(g2.seats).find(s => s.role === 'blue');
  const vulture = Object.values(g2.seats).find(s => s.role === 'red');
  assert.ok(ostrich && vulture, '2p seats');
  // token reconnect while the old socket is still up replaces the seat, no bench
  const still = await conn(); still.send({ t: 'join', code: g2.code, token: ostrich.token });
  const back = await wait(still, m => m.t === 'state' && !m.lobby && m.state.role === 'blue');
  assert.equal(back.state.role, 'blue');
  console.log('ok token reclaims the seat even if the old socket had not closed');
  ostrich.c = still;

  // drop the ostrich, then a tokenless join must see only that offline seat
  await closed(ostrich.c);
  await new Promise(r => setTimeout(r, 80));
  assert.equal(!!(g2.live.players.blue.ws && g2.live.players.blue.ws.readyState === 1), false);
  const lost = await conn(); lost.send({ t: 'join', code: g2.code });
  const bench = await wait(lost, m => m.t === 'state' && m.lobby && m.state.between);
  assert.equal(bench.state.note, LB.LATE_NOTE_REJOIN);
  assert.deepEqual(bench.state.offline.map(o => o.seat), ['blue']);
  assert.equal(bench.state.offline[0].action, 'Rejoin as the ostrich');
  // cannot claim the connected vulture
  from(lost); lost.send({ t: 'claim', seat: 'red' });
  const refused = await wait(lost, m => m.t === 'error');
  assert.equal(refused.msg, 'That seat is taken.');
  assert.equal(g2.live.players.red.ws && g2.live.players.red.ws.readyState === 1, true, 'vulture stays seated');
  from(lost); lost.send({ t: 'claim', seat: 'blue' });
  const seated = await wait(lost, m => m.t === 'joined' && m.role === 'blue');
  assert.equal(seated.token, g2.live.players.blue.token, 'claimer receives the seat token, so the original device can still take it back');
  const play = await wait(lost, m => m.t === 'state' && !m.lobby && m.state.role === 'blue');
  assert.equal(play.state.phase, g2.live.g.phase);
  assert.equal((g2.live.arrivals || []).length, 0, 'claimer leaves the bench');
  console.log('ok 2p lost-token rejoin claims only the offline ostrich');

  // original token still takes the seat back
  const orig = await conn(); orig.send({ t: 'join', code: g2.code, token: seated.token });
  const taken = await wait(orig, m => m.t === 'state' && !m.lobby && m.state.role === 'blue');
  assert.equal(taken.state.role, 'blue');
  console.log('ok original token can still take the seat back');

  // a late joiner while everyone is connected still waits, no reclaim buttons
  const g2b = await startFriends(2);
  const late = await conn(); late.send({ t: 'join', code: g2b.code });
  const lateBench = await wait(late, m => m.t === 'state' && m.lobby && m.state.between);
  assert.equal(lateBench.state.note, LB.LATE_NOTE);
  assert.deepEqual(lateBench.state.offline, []);
  late.send({ t: 'claim', seat: 'blue' });
  const lateNo = await wait(late, m => m.t === 'error');
  assert.equal(lateNo.msg, 'That seat is taken.');
  console.log('ok a connected late joiner cannot steal a live seat');

  // ---- 3 players ----
  const g3 = await startFriends(3);
  const hyena = Object.values(g3.seats).find(s => s.role === 'hunter');
  assert.ok(hyena, '3p hunter seat ' + Object.values(g3.seats).map(s => s.role));
  await closed(hyena.c);
  await new Promise(r => setTimeout(r, 80));
  const lost3 = await conn(); lost3.send({ t: 'join', code: g3.code });
  const b3 = await wait(lost3, m => m.t === 'state' && m.lobby && m.state.between);
  assert.deepEqual(b3.state.offline.map(o => o.action), ['Rejoin as the hyena']);
  lost3.send({ t: 'claim', seat: 'hunter' });
  const j3 = await wait(lost3, m => m.t === 'joined' && m.role === 'hunter');
  const p3 = await wait(lost3, m => m.t === 'state' && !m.lobby && m.state.role === 'hunter');
  assert.equal(p3.state.kind || g3.live.g.three.kind, 'hyena');
  console.log('ok 3p lost-token rejoin as the hyena');

  // ---- 4 players (2 vs 2): two humans + two computers, then one human drops ----
  const tA = await conn(); tA.send({ t: 'create', friends: 1 });
  const tAj = await wait(tA, m => m.t === 'joined' && m.lobby);
  const tB = await conn(); tB.send({ t: 'join', code: tAj.code });
  await wait(tA, m => m.t === 'state' && m.lobby && m.state.humanCount === 2);
  tA.send({ t: 'lobby', a: 'bots', n: 2 });
  await wait(tA, m => m.t === 'state' && m.lobby && (m.state.setup === '4' || m.state.preview === '4' || m.state.canStart));
  tA.send({ t: 'lobby', a: 'role', role: 'ostrich' });
  tB.send({ t: 'lobby', a: 'role', role: 'vulture' });
  await wait(tA, m => m.t === 'state' && m.lobby && m.state.canStart === true);
  tA.send({ t: 'lobby', a: 'start' });
  const tSt = await wait(tA, m => m.t === 'state' && !m.lobby && m.state.phase);
  await wait(tB, m => m.t === 'state' && !m.lobby && m.state.role);
  const teamRoom = roomOf(tAj.code);
  assert.ok(teamRoom.team, 'team room');
  const dropSeat = Object.entries(teamRoom.players).find(([, p]) => p && !p.bot && p.token === tAj.token)[0];
  await closed(tA);
  await new Promise(r => setTimeout(r, 80));
  const lostT = await conn(); lostT.send({ t: 'join', code: tAj.code });
  const bT = await wait(lostT, m => m.t === 'state' && m.lobby && m.state.between);
  assert.ok(bT.state.offline.length >= 1, 'team offline seats ' + JSON.stringify(bT.state.offline));
  assert.ok(bT.state.offline.every(o => !/Computer|computer/.test(o.action)));
  assert.ok(bT.state.offline.some(o => o.seat === dropSeat), 'dropped seat is offered');
  // bot seats must not be listed
  const botSeats = Object.entries(teamRoom.players).filter(([, p]) => p && p.bot).map(([s]) => s);
  assert.ok(bT.state.offline.every(o => !botSeats.includes(o.seat)), 'no bot seats offered');
  lostT.send({ t: 'claim', seat: dropSeat });
  const jT = await wait(lostT, m => m.t === 'joined' && m.role === dropSeat);
  const pT = await wait(lostT, m => m.t === 'state' && !m.lobby && (m.state.role === dropSeat || m.state.role === 'blue' || m.state.role === 'red'));
  assert.ok(pT.state.phase);
  assert.equal(teamRoom.players[dropSeat].ws && teamRoom.players[dropSeat].ws.readyState, 1);
  console.log('ok team lost-token rejoin as', dropSeat);

  // ---- old direct 2p room: offline seat is offered; all-online still refused ----
  const d1 = await conn(); d1.send({ t: 'create' });
  const d1j = await wait(d1, m => m.t === 'joined');
  const d2 = await conn(); d2.send({ t: 'join', code: d1j.code });
  await wait(d2, m => m.t === 'joined' && m.role);
  const d3 = await conn(); d3.send({ t: 'join', code: d1j.code });
  const full = await wait(d3, m => m.t === 'error');
  assert.equal(full.msg, 'That game is full and already started. Ask for a new code.');
  await closed(d1);
  await new Promise(r => setTimeout(r, 80));
  const d4 = await conn(); d4.send({ t: 'join', code: d1j.code });
  const dBench = await wait(d4, m => m.t === 'state' && m.lobby && m.state.between);
  assert.deepEqual(dBench.state.offline.map(o => o.seat), ['blue']);
  d4.send({ t: 'claim', seat: 'blue' });
  await wait(d4, m => m.t === 'joined' && m.role === 'blue');
  await wait(d4, m => m.t === 'state' && !m.lobby && m.state.role === 'blue');
  assert.equal((roomOf(d1j.code).arrivals || []).length, 0);
  console.log('ok direct 2p room offers reclaim when a seat is offline');

  server.close();
  console.log('PASS testrejoin');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
