// A few full bot games on the rules (sim3 / simteam / simhunt) plus one live
// 3-player server game with three computers, to make sure the surprise clock
// hold cannot stall a table of bots (bots have clock delay 0).
process.env.PORT = '0';
process.env.BO_NOSTORE = '1';
process.env.BO_BOTMS = '15';
process.env.BO_CLOCKMS = '8000';
const assert = require('assert');
const play3 = require('./sim3');
const S = require('./server');
const T = require('./three');

const t0 = Date.now();
for (const kind of ['hyena', 'badger']) {
  for (let i = 0; i < 3; i++) {
    const g = play3(kind);
    assert.ok(g.phase === 'over' || g.round >= 30, kind + ' game ' + i + ' ended: ' + g.phase + ' r' + g.round);
  }
}
const playT = require('./simteam').play;
const playH = require('./simhunt').play;
assert.ok(playT(4).w, '4p ended');
assert.ok(playT(5, 'hyena').w, '5p ended');
assert.ok(playH().w, 'hunters ended');

const room = S.create3({ role: 'blue', bots: ['red', 'hunter'], kind: 'hyena' }, null).room;
room.bots = ['blue', 'red', 'hunter'];
if (room.players.blue) room.players.blue.bot = true; else room.players.blue = { ws: null, token: 'bot', bot: true };
S.broadcast(room);
const deadline = Date.now() + 45000;
function wait() {
  return new Promise((resolve, reject) => {
    const tick = () => {
      const g = room.g;
      if (g.phase === 'over') return resolve(g);
      if (Date.now() > deadline) return reject(new Error('bot server game stalled at ' + g.phase + ' turn ' + g.turn + ' round ' + g.round + ' hold=' + room.clockHoldKey));
      setTimeout(tick, 40);
    };
    tick();
  });
}
wait().then(g => {
  assert.equal(g.phase, 'over');
  assert.ok(!room.clockHoldKey, 'clock hold is not left hanging after the game');
  const ms = Date.now() - t0;
  clearTimeout(room.clockT); clearTimeout(room.aiT);
  S.close();
  console.log('PASS bot sims: 3p hyena/badger rules games, and a live all-bot server game ended in', ms, 'ms as', g.winner);
  process.exit(0);
}).catch(e => {
  clearTimeout(room.clockT); clearTimeout(room.aiT);
  try { S.close(); } catch (err) {}
  console.error(e);
  process.exit(1);
});
