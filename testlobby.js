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
t('lobby role lines say the catch counts the rules use (both hunters 2)', () => {
  const T3 = require('./three.js').T3, TH = require('./hunt.js').TH, TM = require('./team.js').TM;
  for (const ko of [T3.ko, TH.ko, TM.ko]) assert.equal(ko.badger, ko.hyena);
  assert.equal(LB.META.badger.sub, 'Burrow · ' + T3.ko.badger + ' catches'); assert.equal(LB.ANIMAL.badger.sub, 'Burrow · ' + T3.ko.badger + ' catches');
  assert.equal(LB.META.hyena.sub, 'Pounce · ' + T3.ko.hyena + ' catches'); assert.equal(LB.ANIMAL.hyena.sub, 'Pounce · ' + T3.ko.hyena + ' catches');
});
t('one friend previews 2p roles and cannot start', () => {
  const r = humans(1); LB.reconcile(r);
  const v = LB.view(r, 'h0');
  assert.equal(v.preview, '2'); assert.equal(v.canStart, false); assert.equal(v.reason, 'need');
  assert.deepEqual(v.roles.map(x => x.id), ['blue', 'red']);
  assert.match(v.setupLabel, /add a computer/);
  assert.match(v.setupLabel, /Start needs 2/);
  assert.equal(v.startLabel, 'Start game');
  LB.claim(r, 'h0', 'blue');
  assert.equal(LB.view(r, 'h0').humans[0].shown, 'Ostrich');
  assert.equal(LB.claim(r, 'h0', 'red').ok, true);
  const switched = LB.view(r, 'h0');
  assert.equal(switched.humans[0].shown, 'Vulture');
  assert.equal(switched.youAre, 'YOU ARE Vulture');
  assert.equal(switched.roles.find(x => x.id === 'red').mine, true);
  assert.equal(switched.roles.find(x => x.id === 'blue').mine, false);
});
t('two computers replace the nested hunter card with Hyena and Badger', () => {
  const r = humans(1);
  LB.setBots(r, 2, 'h0');
  const ids = LB.view(r, 'h0').roles.map(x => x.id);
  assert.deepEqual(ids, ['blue', 'red', 'hyena', 'badger']);
  assert.equal(LB.claim(r, 'h0', 'hyena').ok, true);
  assert.equal(LB.view(r, 'h0').youAre, 'YOU ARE Hyena');
  assert.equal(LB.claim(r, 'h0', 'badger').ok, true);
  const now = LB.view(r, 'h0');
  assert.equal(now.youAre, 'YOU ARE Badger');
  assert.equal(now.humans[0].shown, 'Badger');
  assert.equal(now.roles.find(x => x.id === 'badger').mine, true);
  assert.equal(now.roles.find(x => x.id === 'hyena').mine, false);
  assert.equal(now.canStart, true);
});
t('one friend starts with computers once a computer is added', () => {
  const r = humans(1); LB.setBots(r, 1, 'h0'); LB.claim(r, 'h0', 'blue');
  const v = LB.view(r, 'h0');
  assert.equal(v.canStart, true); assert.equal(v.setup, '2');
  assert.equal(v.startLabel, 'Start with computers');
  const two = humans(2); LB.claim(two, 'h0', 'blue');
  const w = LB.view(two, 'h0');
  assert.equal(w.canStart, true); assert.equal(w.setup, '2'); assert.equal(w.startLabel, 'Start · 2 people');
});
t('role switch releases the previous role', () => {
  const r = humans(1); LB.reconcile(r);
  assert.equal(LB.claim(r, 'h0', 'red').ok, true);
  assert.equal(LB.claim(r, 'h0', 'blue').ok, true);
  assert.equal(r.humans[0].role, 'blue');
  assert.equal(LB.view(r, 'h0').roles.filter(x => x.mine).length, 1);
  assert.equal(LB.view(r, 'h0').roles.filter(x => x.taken).length, 0);
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
  const r = humans(1, { solo: true, botsWanted: 1 }); LB.clampBots(r); LB.claim(r, 'h0', 'blue');
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
t('two humans can both be hunters once two computers take the birds', () => {
  const r = humans(2);
  assert.equal(LB.claim(r, 'h0', 'hyena').ok, true);
  assert.equal(LB.claim(r, 'h1', 'badger').ok, true);
  const blocked = LB.view(r, 'h0');
  assert.match(blocked.hint, /Add 2 computers for the ostrich and the vulture/);
  assert.equal(blocked.canStart, false);
  assert.equal(blocked.showHunterKind, false);
  LB.setBots(r, 2, 'h0');
  const v = LB.view(r, 'h0');
  assert.equal(v.canStart, true);
  assert.equal(v.setup, '4h');
  assert.equal(v.computers, 'Ostrich, Vulture');
  const p = LB.plan(r);
  assert.equal(p.assignments.find(a => a.seat === 'hyena').human.id, 'h0');
  assert.equal(p.assignments.find(a => a.seat === 'badger').human.id, 'h1');
  assert.deepEqual(p.botSeats.sort(), ['blue', 'red']);
});
t('a taken bird says who has it and points at another animal', () => {
  const r = humans(2);
  LB.claim(r, 'h0', 'blue');
  const g = LB.view(r, 'h1');
  const ostrich = g.roles.find(x => x.id === 'blue');
  assert.equal(ostrich.taken, true);
  assert.equal(ostrich.takenBy, 'Taken by Player 1');
  assert.equal(g.hint, 'Choose another bird or hunter.');
  assert.match(LB.claim(r, 'h1', 'blue').error, /Taken by Player 1/);
});
t('three humans do not show a computer hunter when nobody is a computer', () => {
  const r = humans(3);
  LB.claim(r, 'h0', 'blue'); LB.claim(r, 'h1', 'red'); LB.claim(r, 'h2', 'hyena');
  const v = LB.view(r, 'h0');
  assert.equal(v.setup, '3');
  assert.equal(v.showHunterKind, false);
  assert.equal(v.computers, '');
  const badger = v.roles.find(x => x.id === 'badger');
  assert.equal(badger.takenBy, 'Taken by Player 3');
  assert.equal(v.startLabel, 'Start · 3 people');
});
t('two ostrich claims in a four-player room both keep a seat', () => {
  const r = humans(4);
  LB.claim(r, 'h0', 'ostrich'); LB.claim(r, 'h2', 'ostrich');
  LB.claim(r, 'h1', 'vulture'); LB.claim(r, 'h3', 'vulture');
  const p = LB.plan(r);
  assert.equal(p.setup, '4');
  assert.equal(p.assignments.find(a => a.seat === 'o1').human.id, 'h0');
  assert.equal(p.assignments.find(a => a.seat === 'o2').human.id, 'h2');
  assert.equal(p.botSeats.length, 0);
});
t('adding computers to two birds becomes 2 vs 2 without a setup button', () => {
  const r = humans(2); LB.claim(r, 'h0', 'blue'); LB.claim(r, 'h1', 'red');
  LB.setBots(r, 2, 'h0');
  assert.equal(LB.effective(r).setup, '4');
  assert.equal(r.humans[0].role, 'o1'); assert.equal(r.humans[1].role, 'v1');
  const p = LB.plan(r);
  assert.deepEqual(p.botSeats, ['o2', 'v2']);
});

// ---- T7: the game never picks your animal without saying so ----
const PICK = 'Pick your animal first.';
t('solo with two computers and no pick: Start is off, the reason is shown, and plan refuses', () => {
  const r = humans(1, { solo: true, botsWanted: 2 }); LB.clampBots(r); LB.reconcile(r);
  const v = LB.view(r, 'h0');
  assert.equal(v.canStart, false);
  assert.equal(v.hint, PICK); assert.equal(v.setupLabel, PICK);
  assert.equal(v.youAre, 'Choose an animal');
  assert.deepEqual(LB.plan(r), { error: PICK });
  assert.equal(r.humans[0].role, null, 'a refused start seats nobody');
  assert.ok(!('picked' in r.humans[0]), 'a refused start marks nobody');
  for (const n of [1, 3, 4]) { r.botsWanted = n; LB.clampBots(r); LB.reconcile(r); assert.equal(LB.view(r, 'h0').canStart, false, n + ' computers'); assert.equal(LB.plan(r).error, PICK); }
});
t('solo with one computer and no pick is also held until a pick', () => {
  const r = humans(1, { solo: true, botsWanted: 1 }); LB.clampBots(r);
  assert.equal(LB.view(r, 'h0').canStart, false);
  assert.equal(LB.view(r, 'h0').hint, PICK);
  LB.claim(r, 'h0', 'red');
  const v = LB.view(r, 'h0');
  assert.equal(v.canStart, true); assert.notEqual(v.hint, PICK); assert.notEqual(v.setupLabel, PICK);
});
t('solo, Badger and two computers: the host plays the badger and picked is false', () => {
  const r = humans(1, { solo: true, botsWanted: 2 }); LB.clampBots(r); LB.reconcile(r);
  assert.equal(LB.claim(r, 'h0', 'badger').ok, true);
  const v = LB.view(r, 'h0');
  assert.equal(v.canStart, true); assert.equal(v.youAre, 'YOU ARE Badger');
  assert.notEqual(v.hint, PICK);
  const p = LB.plan(r);
  assert.equal(p.ok, true); assert.equal(p.setup, '3'); assert.equal(p.kind, 'badger');
  const mine = p.assignments.find(a => a.human === r.humans[0]);
  assert.equal(mine.seat, 'hunter'); assert.equal(r.humans[0].kind, 'badger');
  assert.equal(LB.animalOf(r.humans[0]), 'badger');
  assert.equal(r.humans[0].picked, false);
  assert.deepEqual(p.botSeats.sort(), ['blue', 'red']);
});
t('friends room, host has not picked: Start says which animal they will be, and plan marks picked', () => {
  const r = humans(2);
  const v = LB.view(r, 'h0');
  assert.equal(v.canStart, true);
  assert.equal(v.startLabel, "Start · you'll be the Ostrich");
  assert.notEqual(v.hint, PICK);
  assert.equal(LB.view(r, 'h1').startLabel, 'Start · 2 people', 'a guest has no Start button, so the label is the old one');
  assert.ok(r.humans.every(h => !('picked' in h) && h.role === null && h.animal == null), 'viewing seats nobody');
  const p = LB.plan(r);
  assert.equal(p.ok, true);
  assert.equal(r.humans[0].role, 'blue'); assert.equal(r.humans[0].picked, true);
  assert.equal(r.humans[1].role, 'red'); assert.equal(r.humans[1].picked, true);
});
t('friends room: the label follows what plan would give, and a pick removes it', () => {
  const r = humans(2);
  LB.claim(r, 'h1', 'blue');
  assert.equal(LB.view(r, 'h0').startLabel, "Start · you'll be the Vulture");
  LB.claim(r, 'h0', 'red');
  assert.equal(LB.view(r, 'h0').startLabel, 'Start · 2 people');
  const one = humans(1, { botsWanted: 1 }); LB.clampBots(one);
  assert.equal(LB.view(one, 'h0').startLabel, "Start · you'll be the Ostrich");
  LB.claim(one, 'h0', 'red');
  assert.equal(LB.view(one, 'h0').startLabel, 'Start with computers');
  const hunt = humans(1, { botsWanted: 2 }); LB.clampBots(hunt);
  assert.equal(LB.view(hunt, 'h0').startLabel, "Start · you'll be the Ostrich");
  const four = humans(4);
  LB.claim(four, 'h1', 'blue'); LB.claim(four, 'h2', 'hyena'); LB.claim(four, 'h3', 'badger');
  assert.equal(LB.view(four, 'h0').startLabel, "Start · you'll be the Vulture");
});
t('plan marks picked true only for humans seated without their own pick', () => {
  const r = humans(3);
  LB.claim(r, 'h1', 'blue');
  const p = LB.plan(r);
  assert.equal(p.ok, true);
  assert.equal(r.humans[1].picked, false);
  assert.equal(r.humans[0].picked, true); assert.equal(r.humans[2].picked, true);
  const roles = r.humans.map(h => h.role).sort();
  assert.deepEqual(roles, ['blue', 'hunter', 'red']);
});
t('viewing the lobby never marks or seats anyone', () => {
  const rooms = [humans(2), humans(3, { botsWanted: 1 }), humans(1, { solo: true, botsWanted: 2 }), humans(4)];
  for (const r of rooms) {
    LB.clampBots(r); LB.reconcile(r);
    const before = JSON.stringify(r.humans);
    for (const h of r.humans) LB.view(r, h.id);
    assert.equal(JSON.stringify(r.humans), before);
    assert.ok(r.humans.every(h => !('picked' in h)), 'no picked key after viewing');
  }
  const r = humans(2); LB.plan(r); r.humans[0].picked = true;
  LB.view(r, 'h0'); assert.equal(r.humans[0].picked, true, 'a real mark survives a view');
  assert.equal(r.humans[1].picked, true);
  const q = humans(2); q.humans[0].picked = false; q.humans[0].role = 'blue';
  LB.view(q, 'h0'); assert.equal(q.humans[0].picked, false);
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
  from(A); from(B);
  A.send({ t: 'lobby', a: 'start' });
  const play = await wait(A, m => m.t === 'state' && !m.lobby && m.state.phase === 'setupEggs');
  assert.equal(play.state.role, 'blue'); assert.equal(play.state.joined, true);
  const playB = await wait(B, m => m.t === 'state' && !m.lobby && m.state.role === 'red');
  assert.equal(playB.state.joined, true);
  const seq = c => c.q.slice(c.from).filter(m => m.t !== 'pong').map(m => m.t + (m.lobby ? ':lobby' : '') + (m.state && m.state.phase ? ':' + m.state.phase : ''));
  assert.deepEqual(seq(A), ['joined', 'state:setupEggs'], 'host start packets are joined then the game, not a lobby state');
  assert.deepEqual(seq(B), ['joined', 'state:setupEggs'], 'guest start packets are joined then the game, not a lobby state');
  assert.equal(A.w.readyState, 1); assert.equal(B.w.readyState, 1);
  const live = roomOf(code);
  assert.deepEqual(Object.keys(live.players).sort(), ['blue', 'red']);
  assert.ok(!live.players.blue.bot && !live.players.red.bot, 'no bot left waiting for a human');
  console.log('ok ws role switch, dynamic 2p, host start');

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

  roomOf(code).g.phase = 'over'; // Change roles is on the end screen
  from(A);
  A.send({ t: 'act', a: 'rematch', how: 'change' });
  const back = await wait(A, m => m.t === 'state' && m.lobby && m.state.humanCount === 3 && !m.state.roles.some(r => r.mine));
  assert.equal(back.state.setup, '3');
  A.send({ t: 'lobby', a: 'role', role: 'hunter', kind: 'badger' });
  await wait(A, m => m.t === 'state' && m.lobby && m.state.roles.some(r => r.id === 'badger' && r.mine) && /YOU ARE Badger/.test(m.state.youAre));
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
  clearTimeout(soloRoom.clockT); soloRoom.clockKey = null;
  S.send({ t: 'lobby', a: 'clock', on: false });
  const stopped = await wait(S, m => m.t === 'state' && !m.lobby && m.state.clockStopped === true && m.state.host === true);
  assert.equal(roomOf(stopped.state.code).deadline, null);
  S.send({ t: 'lobby', a: 'clock', on: true });
  const resumed = await wait(S, m => m.t === 'state' && m.state.clockStopped === false && m.state.h3 && m.state.h3.clockLeft > 0);
  assert.equal(resumed.state.h3.clockMs, 10000);
  assert.equal(roomOf(resumed.state.code).clock, true);
  clearTimeout(roomOf(resumed.state.code).clockT); clearTimeout(roomOf(resumed.state.code).aiT);
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

  const P = await conn();
  P.send({ t: 'create', friends: 1 });
  const pj = await wait(P, m => m.t === 'joined' && m.lobby);
  P.send({ t: 'lobby', a: 'bots', n: 1 });
  await wait(P, m => m.t === 'state' && m.lobby && m.state.botsWanted === 1);
  from(P); P.send({ t: 'lobby', a: 'start' });
  const pst = await wait(P, m => m.t === 'state' && !m.lobby && m.state.role);
  assert.equal(pst.state.picked, true, 'Start seated the host without a pick, and the game view says so');
  assert.equal(roomOf(pj.code).roster.find(x => !x.bot).picked, true);
  const Q = await conn();
  Q.send({ t: 'create', friends: 1 });
  const qj = await wait(Q, m => m.t === 'joined' && m.lobby);
  Q.send({ t: 'lobby', a: 'bots', n: 1 });
  Q.send({ t: 'lobby', a: 'role', role: 'red' });
  await wait(Q, m => m.t === 'state' && m.lobby && m.state.botsWanted === 1 && m.state.roles.some(r => r.id === 'red' && r.mine));
  Q.send({ t: 'lobby', a: 'start' });
  const qst = await wait(Q, m => m.t === 'state' && !m.lobby && m.state.role);
  assert.equal(qst.state.role, 'red'); assert.equal(qst.state.picked, false, 'a chosen animal is not marked');
  const SO = await conn();
  SO.send({ t: 'create', solo: 1, bots: 2 });
  const sj = await wait(SO, m => m.t === 'joined' && m.lobby);
  const sl = await wait(SO, m => m.t === 'state' && m.lobby);
  assert.equal(sl.state.canStart, false); assert.equal(sl.state.hint, PICK);
  from(SO); SO.send({ t: 'lobby', a: 'start' });
  const refused = await wait(SO, m => m.t === 'error');
  assert.equal(refused.msg, PICK);
  assert.equal(roomOf(sj.code).lobby, true, 'a stale client cannot start a solo room without a pick');
  SO.send({ t: 'lobby', a: 'role', role: 'badger' });
  await wait(SO, m => m.t === 'state' && m.lobby && m.state.canStart === true);
  SO.send({ t: 'lobby', a: 'start' });
  const sg = await wait(SO, m => m.t === 'state' && !m.lobby && m.state.role === 'hunter');
  assert.equal(sg.state.kind, 'badger'); assert.equal(sg.state.picked, false);
  console.log('ok T7 picked reaches the game view, and solo refuses a start with no pick');

  // ---- T5: a friend who types the code mid-game waits for the next game (Nov 4 playtest, A11) ----
  const LATE = "You're in. This game is already running. You'll play in the next one.";
  const twoPlayers = async () => {
    const a = await conn(); a.send({ t: 'create', friends: 1 });
    const aj = await wait(a, m => m.t === 'joined' && m.lobby);
    const b = await conn(); b.send({ t: 'join', code: aj.code });
    await wait(a, m => m.t === 'state' && m.lobby && m.state.humanCount === 2);
    a.send({ t: 'lobby', a: 'start' });
    await wait(a, m => m.t === 'state' && !m.lobby && m.state.phase === 'setupEggs');
    await wait(b, m => m.t === 'state' && !m.lobby && m.state.phase === 'setupEggs');
    return { a, b, code: aj.code, live: roomOf(aj.code) };
  };
  const quiet = c => c.q.filter(m => m.t !== 'pong').length;
  const lateJoin = async (g) => {
    const na = quiet(g.a), nb = quiet(g.b), turn = g.live.g.turn, phase = g.live.g.phase;
    const c = await conn(); c.send({ t: 'join', code: g.code });
    const joined = await wait(c, m => m.t === 'joined');
    assert.equal(joined.lobby, true); assert.equal(joined.role, null);
    const bench = await wait(c, m => m.t === 'state' && m.lobby && m.state.between);
    assert.equal(bench.state.note, LATE);
    assert.equal(bench.state.canStart, false); assert.equal(bench.state.host, false);
    await new Promise(r => setTimeout(r, 250));
    assert.equal(quiet(g.a), na, 'the first player gets no message when a friend waits'); assert.equal(quiet(g.b), nb, 'the second player gets no message either');
    assert.equal(g.live.g.turn, turn); assert.equal(g.live.g.phase, phase); assert.equal(g.live.g.eggs.length, 0, 'the game was not reset');
    assert.equal(g.live.arrivals.length, 1);
    return { c, token: joined.token };
  };
  const keepPlaying = async (g) => {
    from(g.a); g.a.send({ t: 'act', a: 'egg', p: [2, 2] });
    const st = await wait(g.a, m => m.t === 'state' && !m.lobby && m.state.eggs && m.state.eggs.length === 1);
    assert.equal(st.state.eggs.length, 1);
  };

  const g1 = await twoPlayers();
  const late1 = await lateJoin(g1);
  await keepPlaying(g1);
  // nobody can reset a running game: a waiting friend's game actions are ignored, and a player's rematch waits for the end
  const phaseBefore = g1.live.g.phase;
  late1.c.send({ t: 'act', a: 'rematch', how: 'change' }); late1.c.send({ t: 'act', a: 'rematch', how: 'same' });
  from(g1.a); g1.a.send({ t: 'act', a: 'rematch', how: 'change' });
  const early = await wait(g1.a, m => m.t === 'error');
  assert.match(early.msg, /Not a legal move/);
  assert.equal(g1.live.g.phase, phaseBefore, 'the running game was not reset'); assert.ok(!g1.live.lobby, 'still in the game, not the lobby');
  console.log('ok T5 a waiting friend or an early rematch cannot reset a running game');

  // a waiting friend who reloads the page is still recognised, with the same note
  late1.c.w.close();
  const c1b = await conn(); c1b.send({ t: 'join', code: g1.code, token: late1.token });
  const reloaded = await wait(c1b, m => m.t === 'state' && m.lobby && m.state.between);
  assert.equal(reloaded.state.note, LATE); assert.equal(g1.live.arrivals.length, 1, 'reloading did not add a second arrival');
  console.log('ok T5 mid-game joiner waits on the bench, players unaffected, reload recognised');

  g1.live.g.phase = 'over'; g1.live.g.winner = 'blue';
  from(g1.a); from(c1b);
  g1.a.send({ t: 'act', a: 'rematch', how: 'change' });
  const roomView = await wait(g1.a, m => m.t === 'state' && m.lobby && m.state.humanCount === 3);
  assert.equal(roomView.state.setup, '3');
  await wait(c1b, m => m.t === 'state' && m.lobby && m.state.humanCount === 3);
  console.log('ok T5 Change roles shows the mid-game joiner in the room');

  const g2 = await twoPlayers();
  const late2 = await lateJoin(g2);
  g2.live.g.phase = 'over'; g2.live.g.winner = 'red';
  g2.a.send({ t: 'act', a: 'rematch', how: 'same' });
  const seated = await wait(late2.c, m => m.t === 'state' && !m.lobby && m.state.role === 'hunter');
  assert.equal(seated.state.phase, 'setupEggs');
  await wait(g2.a, m => m.t === 'state' && !m.lobby && m.state.role === 'blue' && m.state.h3);
  console.log('ok T5 Same roles seats the mid-game joiner');

  const o1 = await conn(); o1.send({ t: 'create' });
  const oj = await wait(o1, m => m.t === 'joined');
  const o2 = await conn(); o2.send({ t: 'join', code: oj.code });
  await wait(o2, m => m.t === 'joined' && m.role);
  const o3 = await conn(); o3.send({ t: 'join', code: oj.code });
  const refusal = await wait(o3, m => m.t === 'error');
  assert.equal(refusal.msg, 'That game is full and already started. Ask for a new code.');
  assert.equal((roomOf(oj.code).arrivals || []).length, 0);
  console.log('ok T5 an old direct room keeps its refusal with the clearer message');

  console.log(n + ' lobby rule checks passed');
  server.close();
  process.exit(0);
})().catch(e => { console.error(e); try { server.close(); } catch {} process.exit(1); });
