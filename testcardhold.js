// The shot clock waits while a player's role card is open.
process.env.PORT = 3979; process.env.BO_NOSTORE = '1'; process.env.BO_CLOCKMS = '10000';
const assert = require('assert');
const server = require('./server.js');
const room = { cardHold: { red: true }, players: { red: {} }, g: { phase: 'play', turn: 'red' } };
const delay = server.clockDelayFor(room, () => ({ phase: 'play', role: 'red' }), 'red');
assert.ok(delay >= 60000, 'an open card holds the shot clock, saw ' + delay);
const clear = { cardHold: {}, players: { red: {} }, g: { phase: 'play', turn: 'red' } };
const plain = server.clockDelayFor(clear, () => ({ phase: 'play', role: 'red' }), 'red');
assert.ok(plain < 60000, 'no card, no long hold, saw ' + plain);
server.close();
console.log('PASS testcardhold');
process.exit(0);
