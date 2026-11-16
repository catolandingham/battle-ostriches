// Mid-game rejoin. A matching token sits back down silently.
// A lost token never receives that token, and cannot kick whoever holds the seat.
const assert = require('assert');
const WS = require('ws');
const LB = require('./lobby.js');
process.env.PORT = 3978; process.env.BO_NOSTORE = '1'; process.env.BO_CLOCKMS = '60000';
delete process.env.BO_REJOIN_GRACE_MS;
const server = require('./server.js');
const conn = () => new Promise(res => { const w = new WS('ws://localhost:3978/ws'); const q = []; w.on('message', d => q.push(JSON.parse(d.toString()))); w.on('open', () => res({ w, q, send: o => w.send(JSON.stringify(o)) })); });
const wait = (c, f, ms = 4000) => new Promise((res, rej) => { const t0 = Date.now(); const i = setInterval(() => { const m = c.q.find(f); if (m) { clearInterval(i); res(m); } else if (Date.now() - t0 > ms) { clearInterval(i); rej(new Error('timeout ' + JSON.stringify(c.q.slice(-4)))); } }, 15); });
const from = c => { if (c) c.q.length = 0; };
const roomOf = code => server.rooms.get(code);
const closed = c => new Promise(res => { c.w.on('close', res); c.w.close(); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const live = p => !!(p && p.ws && p.ws.readyState === 1);

function pastGrace(room, seat) {
  const p = room.players[seat];
  p.goneAt = Date.now() - LB.rejoinGraceMs() - 5000;
  if (p.graceT) { clearTimeout(p.graceT); p.graceT = null; }
}

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
  if (n >= 3) {
    a.send({ t: 'lobby', a: 'role', role: n === 3 ? 'blue' : 'ostrich' });
    others[0].send({ t: 'lobby', a: 'role', role: n === 3 ? 'red' : 'vulture' });
    if (n === 3) others[1].send({ t: 'lobby', a: 'role', role: 'hyena' });
  }
  await wait(a, m => m.t === 'state' && m.lobby && m.state.canStart === true, 4000).catch(() => {});
  a.send({ t: 'lobby', a: 'start' });
  const st = await wait(a, m => m.t === 'state' && !m.lobby && m.state.phase);
  const seats = { a: { c: a, token: aj.token, role: st.state.role } };
  for (let i = 0; i < others.length; i++) {
    const ost = await wait(others[i], m => m.t === 'state' && !m.lobby && m.state.role);
    seats['p' + (i + 1)] = { c: others[i], token: (others[i].q.find(m => m.t === 'joined') || {}).token, role: ost.state.role };
  }
  return { code: aj.code, live: roomOf(aj.code), seats, a, others };
}

// holder is a connected human who must allow the claim. Omit holder when nobody else is connected.
async function claimSeat(claimer, holder, seat) {
  from(claimer); if (holder) from(holder);
  claimer.send({ t: 'claim', seat });
  if (holder) {
    const asked = await wait(holder, m => m.t === 'state' && m.state && m.state.rejoinAsk && m.state.rejoinAsk.seat === seat);
    const waiting = await wait(claimer, m => m.t === 'state' && m.lobby && m.state && m.state.note === LB.REJOIN_WORDS.waiting);
    assert.equal(waiting.state.ask.seat, seat);
    assert.equal(asked.state.rejoinAsk.title, LB.askLine(waiting.state.ask.label));
    holder.send({ t: 'claim-answer', seat, id: asked.state.rejoinAsk.id, yes: true });
  }
  const joined = await wait(claimer, m => m.t === 'joined' && m.role === seat);
  await wait(claimer, m => m.t === 'state' && !m.lobby && m.state && m.state.phase);
  return joined;
}

(async () => {
  assert.equal(LB.rejoinGraceMs(), 60000);

  const g2 = await startFriends(2);
  const ostrich = Object.values(g2.seats).find(s => s.role === 'blue');
  const vulture = Object.values(g2.seats).find(s => s.role === 'red');
  assert.ok(ostrich && vulture, '2p seats');
  const original = ostrich.token;

  const still = await conn(); still.send({ t: 'join', code: g2.code, token: original });
  const back = await wait(still, m => m.t === 'state' && !m.lobby && m.state.role === 'blue');
  assert.equal(back.state.role, 'blue');
  assert.equal(g2.live.players.blue.token, original, 'a matching token keeps its own token');
  console.log('ok token reclaims the seat even if the old socket had not closed');
  ostrich.c = still;

  await closed(ostrich.c);
  await sleep(80);
  assert.equal(live(g2.live.players.blue), false);
  assert.ok(LB.seatInGrace(g2.live.players.blue), 'disconnect starts the grace');
  const early = await conn(); early.send({ t: 'join', code: g2.code });
  const earlyBench = await wait(early, m => m.t === 'state' && m.lobby && m.state.between);
  assert.equal(earlyBench.state.note, LB.LATE_NOTE);
  assert.deepEqual(earlyBench.state.offline, []);
  from(early); early.send({ t: 'claim', seat: 'blue' });
  const earlyNo = await wait(early, m => m.t === 'error');
  assert.equal(earlyNo.msg, 'That seat is taken.');
  const during = await conn(); during.send({ t: 'join', code: g2.code, token: original });
  const duringSeat = await wait(during, m => m.t === 'state' && !m.lobby && m.state.role === 'blue');
  assert.equal(duringSeat.state.role, 'blue');
  assert.equal(g2.live.players.blue.token, original);
  assert.equal(live(g2.live.players.blue), true);
  console.log('ok grace holds the seat for the original token only');
  ostrich.c = during;

  await closed(ostrich.c);
  await sleep(80);
  pastGrace(g2.live, 'blue');
  const lost = await conn(); lost.send({ t: 'join', code: g2.code });
  const lostJoin = await wait(lost, m => m.t === 'joined' && m.lobby);
  const bench = await wait(lost, m => m.t === 'state' && m.lobby && m.state.between && (m.state.offline || []).some(o => o.seat === 'blue'));
  assert.equal(bench.state.note, LB.LATE_NOTE_REJOIN);
  assert.equal(bench.state.note, 'This game already started. Tap your animal to come back.');
  assert.deepEqual(bench.state.offline.map(o => o.seat), ['blue']);
  assert.equal(bench.state.offline[0].action, 'Rejoin as the ostrich');
  assert.equal(bench.state.offline[0].confirm, 'Rejoin as the ostrich?');
  from(lost); lost.send({ t: 'claim', seat: 'red' });
  const refused = await wait(lost, m => m.t === 'error');
  assert.equal(refused.msg, 'That seat is taken.');
  assert.equal(live(g2.live.players.red), true, 'vulture stays seated');
  const seated = await claimSeat(lost, vulture.c, 'blue');
  assert.notEqual(seated.token, original, 'the claimer gets a new token');
  assert.equal(g2.live.players.blue.token, seated.token);
  assert.ok((g2.live.players.blue.retired || []).includes(original));
  assert.equal(live(g2.live.players.blue), true);
  assert.ok(!(g2.live.arrivals || []).some(a => a.token === lostJoin.token), 'claimer leaves the bench');
  console.log('ok 2p lost-token rejoin claims only the offline ostrich, with a new token');

  const held = g2.live.players.blue.ws;
  const kick = await conn(); kick.send({ t: 'join', code: g2.code, token: original });
  const kicked = await wait(kick, m => m.t === 'error');
  assert.equal(kicked.msg, 'That seat is taken.');
  assert.equal(g2.live.players.blue.ws, held, 'the connected claimer is not kicked');
  assert.equal(g2.live.players.blue.token, seated.token);
  assert.ok(!kick.q.some(m => m.t === 'joined' && m.role === 'blue'));
  console.log('ok the original token cannot kick a connected claimer');

  await closed(lost);
  await sleep(40);
  pastGrace(g2.live, 'blue');
  const sneak = await conn(); sneak.send({ t: 'join', code: g2.code, token: original });
  const sn = await wait(sneak, m => m.t === 'state' && m.lobby && m.state.between);
  assert.equal(g2.live.players.blue.token, seated.token, 'an offline claimer keeps the seat token');
  assert.equal(live(g2.live.players.blue), false);
  assert.ok(!sneak.q.some(m => m.t === 'state' && !m.lobby && m.state && m.state.role === 'blue'));
  assert.ok((sn.state.offline || []).some(o => o.seat === 'blue'));
  console.log('ok a retired token does not take the seat back while the claimer is offline');

  const g2b = await startFriends(2);
  const late = await conn(); late.send({ t: 'join', code: g2b.code });
  const lateBench = await wait(late, m => m.t === 'state' && m.lobby && m.state.between);
  assert.equal(lateBench.state.note, LB.LATE_NOTE);
  assert.deepEqual(lateBench.state.offline, []);
  late.send({ t: 'claim', seat: 'blue' });
  const lateNo = await wait(late, m => m.t === 'error');
  assert.equal(lateNo.msg, 'That seat is taken.');
  console.log('ok a connected late joiner cannot steal a live seat');

  process.env.BO_REJOIN_GRACE_MS = '0';
  const g2c = await startFriends(2);
  const o2 = Object.values(g2c.seats).find(s => s.role === 'blue');
  const v2 = Object.values(g2c.seats).find(s => s.role === 'red');
  await closed(o2.c);
  await sleep(80);
  const c1 = await conn(); c1.send({ t: 'join', code: g2c.code });
  const c2 = await conn(); c2.send({ t: 'join', code: g2c.code });
  await wait(c1, m => m.t === 'state' && m.lobby && (m.state.offline || []).some(o => o.seat === 'blue'));
  await wait(c2, m => m.t === 'state' && m.lobby && (m.state.offline || []).some(o => o.seat === 'blue'));
  from(c1); from(c2); from(v2.c);
  c1.send({ t: 'claim', seat: 'blue' });
  c2.send({ t: 'claim', seat: 'blue' });
  const loser = await wait(c2, m => m.t === 'error' || (m.t === 'state' && m.lobby && m.state && m.state.note === LB.REJOIN_WORDS.waiting));
  const winner = await wait(c1, m => m.t === 'error' || (m.t === 'state' && m.lobby && m.state && m.state.note === LB.REJOIN_WORDS.waiting));
  const bad = loser.t === 'error' ? c2 : c1;
  const good = loser.t === 'error' ? c1 : c2;
  assert.equal((loser.t === 'error' ? loser : winner).msg, 'That seat is taken.');
  assert.equal((g2c.live.rejoinAsks || []).length, 1, 'one pending claim');
  const ask = g2c.live.rejoinAsks[0];
  const asked = good === c1 ? winner : loser;
  assert.equal(asked.state.note, LB.REJOIN_WORDS.waiting);
  v2.c.send({ t: 'claim-answer', seat: 'blue', id: ask.id, yes: false });
  const denied = await wait(good, m => m.t === 'state' && m.lobby && m.state && m.state.note === LB.LATE_NOTE_REJOIN && (m.state.offline || []).some(o => o.seat === 'blue'));
  assert.ok(denied);
  assert.equal(g2c.live.players.blue.token, o2.token, 'a refusal leaves the original token');
  assert.equal(live(g2c.live.players.blue), false);
  from(bad); bad.send({ t: 'claim', seat: 'blue' });
  const badWait = await wait(bad, m => m.t === 'state' && m.lobby && m.state && m.state.note === LB.REJOIN_WORDS.waiting);
  assert.equal(badWait.state.ask.seat, 'blue');
  from(good); good.send({ t: 'claim', seat: 'blue' });
  const blocked = await wait(good, m => m.t === 'error');
  assert.equal(blocked.msg, 'That seat is taken.');
  v2.c.send({ t: 'claim-answer', seat: 'blue', id: g2c.live.rejoinAsks[0].id, yes: true });
  const won = await wait(bad, m => m.t === 'joined' && m.role === 'blue');
  assert.notEqual(won.token, o2.token);
  assert.equal(g2c.live.players.blue.token, won.token);
  assert.equal(live(g2c.live.players.blue), true);
  assert.ok(!good.q.some(m => m.t === 'joined' && m.role === 'blue'), 'the losing claim does not sit down');
  console.log('ok concurrent claims: one ask, a refusal, then the other person cannot kick the winner');

  const g3 = await startFriends(3);
  const hyena = Object.values(g3.seats).find(s => s.role === 'hunter');
  const bird = Object.values(g3.seats).find(s => s.role === 'blue');
  assert.ok(hyena, '3p hunter seat ' + Object.values(g3.seats).map(s => s.role));
  await closed(hyena.c);
  await sleep(80);
  const lost3 = await conn(); lost3.send({ t: 'join', code: g3.code });
  const b3 = await wait(lost3, m => m.t === 'state' && m.lobby && m.state.between);
  assert.deepEqual(b3.state.offline.map(o => o.action), ['Rejoin as the hyena']);
  const j3 = await claimSeat(lost3, bird.c, 'hunter');
  assert.notEqual(j3.token, hyena.token);
  const heldH = g3.live.players.hunter.ws;
  const oldH = await conn(); oldH.send({ t: 'join', code: g3.code, token: hyena.token });
  const oldNo = await wait(oldH, m => m.t === 'error');
  assert.equal(oldNo.msg, 'That seat is taken.');
  assert.equal(g3.live.players.hunter.ws, heldH);
  assert.ok(!oldH.q.some(m => m.t === 'joined' && m.role === 'hunter'));
  console.log('ok 3p lost-token rejoin as the hyena does not hand over the token');

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
  await wait(tA, m => m.t === 'state' && !m.lobby && m.state.phase);
  await wait(tB, m => m.t === 'state' && !m.lobby && m.state.role);
  const teamRoom = roomOf(tAj.code);
  assert.ok(teamRoom.team, 'team room');
  const dropSeat = Object.entries(teamRoom.players).find(([, p]) => p && !p.bot && p.token === tAj.token)[0];
  const botSeats = Object.entries(teamRoom.players).filter(([, p]) => p && p.bot).map(([s]) => s);
  assert.ok(botSeats.length >= 1);
  await closed(tA);
  await sleep(80);
  const lostT = await conn(); lostT.send({ t: 'join', code: tAj.code });
  const bT = await wait(lostT, m => m.t === 'state' && m.lobby && m.state.between);
  assert.ok(bT.state.offline.length >= 1);
  assert.ok(bT.state.offline.every(o => !/Computer|computer/.test(o.action)));
  assert.ok(bT.state.offline.some(o => o.seat === dropSeat));
  assert.ok(bT.state.offline.every(o => !botSeats.includes(o.seat)), 'no bot seats offered');
  from(lostT); lostT.send({ t: 'claim', seat: botSeats[0] });
  const botNo = await wait(lostT, m => m.t === 'error');
  assert.equal(botNo.msg, 'That seat is taken.');
  assert.equal(teamRoom.players[botSeats[0]].bot, true, 'the computer keeps its seat');
  const jT = await claimSeat(lostT, tB, dropSeat);
  assert.notEqual(jT.token, tAj.token);
  assert.equal(teamRoom.players[dropSeat].token, jT.token);
  assert.equal(live(teamRoom.players[dropSeat]), true);
  console.log('ok team lost-token rejoin as', dropSeat, 'leaves the computers alone');

  const ai = await conn(); ai.send({ t: 'create', ai: 'normal' });
  const aij = await wait(ai, m => m.t === 'joined' && m.role === 'blue');
  const aiRoom = roomOf(aij.code);
  assert.equal(aiRoom.players.red.bot, true);
  const fullAi = await conn(); fullAi.send({ t: 'join', code: aij.code });
  const fullMsg = await wait(fullAi, m => m.t === 'error');
  assert.equal(fullMsg.msg, 'That game is full and already started. Ask for a new code.');
  await closed(ai);
  await sleep(80);
  const aiLost = await conn(); aiLost.send({ t: 'join', code: aij.code });
  const aiBench = await wait(aiLost, m => m.t === 'state' && m.lobby && m.state.between);
  assert.deepEqual(aiBench.state.offline.map(o => o.seat), ['blue']);
  from(aiLost); aiLost.send({ t: 'claim', seat: 'red' });
  const aiNo = await wait(aiLost, m => m.t === 'error');
  assert.equal(aiNo.msg, 'That seat is taken.');
  assert.equal(aiRoom.players.red.bot, true);
  const aiJoin = await claimSeat(aiLost, null, 'blue');
  assert.notEqual(aiJoin.token, aij.token);
  assert.equal(aiRoom.players.blue.token, aiJoin.token);
  assert.ok((aiRoom.players.blue.retired || []).includes(aij.token));
  const heldAi = aiRoom.players.blue.ws;
  const aiOld = await conn(); aiOld.send({ t: 'join', code: aij.code, token: aij.token });
  const aiOldNo = await wait(aiOld, m => m.t === 'error');
  assert.equal(aiOldNo.msg, 'That seat is taken.');
  assert.equal(aiRoom.players.blue.ws, heldAi);
  assert.ok(!aiOld.q.some(m => m.t === 'joined' && m.role === 'blue'));
  assert.equal(aiRoom.players.red.bot, true);
  console.log('ok an AI seat cannot be claimed, and the new human token is not the old one');

  const d1 = await conn(); d1.send({ t: 'create' });
  const d1j = await wait(d1, m => m.t === 'joined');
  const d2 = await conn(); d2.send({ t: 'join', code: d1j.code });
  await wait(d2, m => m.t === 'joined' && m.role);
  const d3 = await conn(); d3.send({ t: 'join', code: d1j.code });
  const full = await wait(d3, m => m.t === 'error');
  assert.equal(full.msg, 'That game is full and already started. Ask for a new code.');
  await closed(d1);
  await sleep(80);
  const d4 = await conn(); d4.send({ t: 'join', code: d1j.code });
  const dBench = await wait(d4, m => m.t === 'state' && m.lobby && m.state.between);
  assert.deepEqual(dBench.state.offline.map(o => o.seat), ['blue']);
  const dJoin = await claimSeat(d4, d2, 'blue');
  assert.notEqual(dJoin.token, d1j.token);
  assert.equal(roomOf(d1j.code).players.blue.token, dJoin.token);
  const heldD = roomOf(d1j.code).players.blue.ws;
  const dOld = await conn(); dOld.send({ t: 'join', code: d1j.code, token: d1j.token });
  const dOldNo = await wait(dOld, m => m.t === 'error');
  assert.equal(dOldNo.msg, 'That seat is taken.');
  assert.equal(roomOf(d1j.code).players.blue.ws, heldD);
  assert.ok(!dOld.q.some(m => m.t === 'joined' && m.role === 'blue'));
  console.log('ok direct 2p room offers reclaim when a seat is offline, without giving away the token');

  server.close();
  console.log('PASS testrejoin');
  process.exit(0);
})().catch(e => { console.error(e); try { server.close(); } catch (err) {} process.exit(1); });
