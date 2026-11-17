// While the table sees "Let them in / Not them", the shot clock pauses and then continues from the time that was left.
process.env.PORT = 4033; process.env.BO_NOSTORE = '1'; process.env.BO_CLOCKMS = '10000'; process.env.BO_REJOIN_GRACE_MS = '0';
const assert = require('assert');
const WS = require('ws');
const LB = require('./lobby.js');
const server = require('./server.js');
const conn = () => new Promise(res => { const w = new WS('ws://localhost:4033/ws'); const q = []; w.on('message', d => q.push(JSON.parse(d.toString()))); w.on('open', () => res({ w, q, send: o => w.send(JSON.stringify(o)) })); });
const wait = (c, f, ms = 4000) => new Promise((res, rej) => { const t0 = Date.now(); const i = setInterval(() => { const m = c.q.find(f); if (m) { clearInterval(i); res(m); } else if (Date.now() - t0 > ms) { clearInterval(i); rej(new Error('timeout ' + JSON.stringify(c.q.slice(-3)))); } }, 15); });
const from = c => { if (c) c.q.length = 0; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const roomOf = code => server.rooms.get(code);

(async () => {
  const a = await conn(); a.send({ t: 'create', friends: 1 });
  const aj = await wait(a, m => m.t === 'joined' && m.lobby);
  const b = await conn(); b.send({ t: 'join', code: aj.code });
  const c = await conn(); c.send({ t: 'join', code: aj.code });
  await wait(a, m => m.t === 'state' && m.lobby && m.state.humanCount === 3);
  a.send({ t: 'lobby', a: 'role', role: 'blue' });
  b.send({ t: 'lobby', a: 'role', role: 'red' });
  c.send({ t: 'lobby', a: 'role', role: 'hyena' });
  await wait(a, m => m.t === 'state' && m.lobby && m.state.canStart);
  a.send({ t: 'lobby', a: 'start' });
  const started = await wait(a, m => m.t === 'state' && !m.lobby && m.state.phase);
  const room = roomOf(aj.code);
  assert.ok(room.three, '3-player game, the mode with a shot clock');
  room.g.phase = 'play'; room.g.turn = 'red';
  server.broadcast(room);
  assert.ok(room.deadline, 'the shot clock is running');
  assert.equal(room.clockAskPause, null);

  clearTimeout(room.clockT);
  const remain = 1500;
  room.deadline = Date.now() + remain;
  room.clockT = setTimeout(room.clockFire, 400);

  await new Promise(res => { a.w.on('close', res); a.w.close(); });
  await sleep(80);
  const stranger = await conn(); stranger.send({ t: 'join', code: aj.code });
  await wait(stranger, m => m.t === 'state' && m.lobby && (m.state.offline || []).some(o => o.seat === 'blue'));
  from(b); from(stranger);
  stranger.send({ t: 'claim', seat: 'blue' });
  const asked = await wait(b, m => m.t === 'state' && m.state && m.state.rejoinAsk && m.state.rejoinAsk.seat === 'blue');
  assert.equal(asked.state.rejoinAsk.title, 'Someone wants to rejoin as the ostrich.');
  assert.equal(asked.state.rejoinAsk.yes, 'Let them in');
  assert.equal(asked.state.rejoinAsk.no, 'Not them');
  assert.ok(!asked.state.rejoinAsk.body, 'the table ask has no body line');
  assert.equal(asked.state.h3.clockPaused, true);
  assert.ok(asked.state.h3.clockLeft > 1000 && asked.state.h3.clockLeft <= remain, 'frozen time shown: ' + asked.state.h3.clockLeft);
  assert.equal(asked.state.h3.clockMs, 10000, 'the 10 second clock length stays 10 seconds');
  assert.equal(room.deadline, null, 'the clock is not counting');
  const frozen = room.clockAskPause.left;
  assert.ok(frozen > 1000 && frozen <= remain, 'saved ' + frozen);

  await sleep(700);
  assert.equal(room.g.turn, 'red', 'the short timer does not end the turn while the table is being asked');
  assert.equal(room.clockAskPause.left, frozen, 'the paused time does not tick down');

  from(b);
  b.send({ t: 'claim-answer', seat: 'blue', id: asked.state.rejoinAsk.id, yes: false });
  const resumed = await wait(b, m => m.t === 'state' && m.state && !m.state.rejoinAsk && m.state.h3 && m.state.h3.clockLeft != null && !m.state.h3.clockPaused);
  const left = room.deadline - Date.now();
  assert.ok(left > 900 && left < remain + 200, 'resumes from the frozen time, not a fresh 10 seconds: ' + left);
  assert.ok(Math.abs(left - frozen) < 400, 'resumed ' + left + ' vs frozen ' + frozen);
  assert.equal(resumed.state.h3.clockMs, 10000);
  assert.equal(LB.REJOIN_WORDS.askYes, 'Let them in');

  await sleep(left + 400);
  assert.notEqual(room.g.turn, 'red', 'after the leftover time, the turn ends');
  console.log('ok the shot clock pauses for the rejoin question and then continues');

  for (const x of [b, c, stranger]) x.w.close();
  server.close();
  console.log('PASS testrejoinclock');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
