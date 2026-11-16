// Each phone's news uses the look for that player: green good, red bad, navy neither.
// The same words can be good on one phone and bad on another. A smash is announced once.
process.env.PORT = 0;
const assert = require('assert'), fs = require('fs'), N = require('./public/news.js');
const src = fs.readFileSync(__dirname + '/public/ui.js', 'utf8');
const css = fs.readFileSync(__dirname + '/public/news.css', 'utf8');
let n = 0;
const ok = (name, f) => { f(); n++; console.log('ok', name); };
const O = { role: 'blue' }, V = { role: 'red' };
const HY = { role: 'hunter', kind: 'hyena', h3: { mySeat: 'hyena', kind: 'hyena' } };
const BA = { role: 'hunter', kind: 'badger', h3: { mySeat: 'badger', kind: 'badger' } };
const H3 = { role: 'hunter', kind: 'hyena', h3: { mySeat: 'hunter', kind: 'hyena' } };
const O1 = { role: 'blue', h3: { mySeat: 'o1', team: true } }, O2 = { role: 'blue', h3: { mySeat: 'o2', team: true } };
const V1 = { role: 'red', h3: { mySeat: 'v1', team: true } }, V2 = { role: 'red', h3: { mySeat: 'v2', team: true } };
const tone = (text, phone) => N.tone(text, phone);
const same = (text, phone, want) => assert.equal(tone(text, phone), want, JSON.stringify(phone.role || phone) + ' «' + text + '»');

ok('one green and one red, named in the shared stylesheet', () => {
  assert.match(css, /#1f9d3a/); assert.match(css, /#b3123f/); assert.match(css, /#1b2540/);
  assert.ok(css.includes('html[data-theme]'), 'the looks are not left to a theme');
});

ok('a catch is good for the hunter and bad for the ostrich', () => {
  same('You were caught! You fled 2 squares.', O, 'bad');
  same('Caught the ostrich!', HY, 'good');
  same('Caught the ostrich!', H3, 'good');
  same('The hyena caught the ostrich!', BA, 'bad');
  same('The hyena caught the ostrich!', V, 'plain');
  same('The hyena caught Ostrich 1!', O2, 'bad');
  same('The hyena caught Ostrich 1!', V1, 'plain');
  same('Ostrich knocked out!', HY, 'good');
  same('The badger knocked you out.', O, 'bad');
  same('The badger knocked out the ostrich.', O, 'bad');
  same('The badger knocked out the ostrich.', V, 'plain');
  same('The badger knocked you out. Thanks for the treat, stupid birds!', O, 'bad');
});

ok('a smashed or found egg is bad for the ostrich and good for the vulture', () => {
  same('You smashed an egg!', V, 'good');
  same('You smashed an egg!', V1, 'good');
  same('The vulture smashed your egg!', O, 'bad');
  same("The vulture smashed Ostrich 1's egg!", O1, 'bad');
  same("The vulture smashed Ostrich 1's egg!", O2, 'bad');
  same("The vulture smashed Ostrich 1's egg!", V2, 'good');
  same("The vulture smashed Ostrich 1's egg!", HY, 'plain');
  same('The vulture smashed an egg.', HY, 'plain');
  same('The vulture smashed an egg.', O, 'bad');
  same('Vulture found your egg!', O, 'bad');
  same('Found egg!', V, 'good');
  same('Vulture sniffed an egg.', O, 'bad');
  same('Egg nearby!', V, 'good');
  same('No egg nearby', V, 'plain');
  same('An egg went cold.', O, 'bad');
  same('An egg went cold.', V, 'good');
  same('An egg went cold.', HY, 'plain');
});

ok('the same kick, stone, or shove changes with the phone', () => {
  same('You kicked the hyena 2 squares!', O, 'good');
  same('The ostrich kicked you 2 squares!', HY, 'bad');
  same('The ostrich kicked the hyena 2 squares!', V, 'plain');
  same('Kick blocked.', O, 'bad');
  same('Kick blocked.', HY, 'plain');
  same('Your stone hit the hyena!', V, 'good');
  same('A stone hit you!', HY, 'bad');
  same("The vulture's stone hit the hyena!", V, 'good');
  same("The vulture's stone hit the hyena!", O, 'plain');
  same('The ostrich kicked the stone right back!', O, 'good');
  same('The ostrich kicked the stone right back!', V, 'bad');
  same('Ostrich 1 kicked the stone right back!', O1, 'good');
  same('Ostrich 1 kicked the stone right back!', V1, 'bad');
  same('Boing! The stone bounced off the leaf.', V, 'bad');
  same('Boing! The stone bounced off the leaf.', O, 'good');
  same('Clang! The vulture batted it away with a rock.', HY, 'plain');
  same('The stone landed softly in the leaves.', V, 'bad');
  same('The stone landed softly in the leaves.', O, 'plain');
  same('The stone clattered back onto the rock pile.', V, 'bad');
  same('You shoved the hyena!', BA, 'good');
  same('The badger shoved you!', HY, 'bad');
  same('The badger shoved the hyena!', O, 'plain');
  same('You burst out and shoved the hyena 2 squares!', BA, 'good');
  same('The badger burst out and shoved you 2 squares!', HY, 'bad');
  same('The badger burst out and shoved the hyena 2 squares!', V, 'plain');
});

ok('warnings, outs, endings, and lines that are neither', () => {
  same('Look out!', O, 'bad');
  same('Hyena near!', O, 'bad');
  same('Badger near!', V, 'bad');
  same('Bird near.', HY, 'good');
  same('Still near.', BA, 'good');
  same('Nothing near.', HY, 'plain');
  same('Pounce!', HY, 'good');
  same('Badger popped up!', O, 'bad');
  same('Badger popped up!', BA, 'plain');
  same('The badger dug in!', O, 'plain');
  same('A bird saw you dig in.', BA, 'bad');
  same('Tap to move, or Burrow. A bird will see you dig in.', BA, 'bad');
  same('Tap to move, or Burrow. No bird will see you dig in.', BA, 'good');
  same('The ostrich is out.', O, 'bad');
  same('The ostrich is out.', HY, 'good');
  same('The ostrich is out.', V, 'plain');
  same('Ostrich 1 is out.', O1, 'bad');
  same('Ostrich 1 is out.', O2, 'bad');
  same('The vulture is out.', V, 'bad');
  same('You win!', O, 'good');
  same('You lose', V, 'bad');
  same('Your team wins!', O1, 'good');
  same('Ostriches win!', O1, 'good');
  same('Ostriches win!', V1, 'bad');
  same('Vultures win!', V, 'good');
  same('Hyena wins!', HY, 'good');
  same('Hyena wins!', BA, 'bad');
  same('Hyena wins!', O, 'bad');
  same("It's a draw.", O, 'plain');
  same("It's a tie.", HY, 'plain');
  same('The vulture hunts eggs.', O, 'plain');
  same('The vulture hunts eggs. The hyena hunts birds.', HY, 'plain');
  same('Tap to go on.', O, 'plain');
  same('Missed.', O, 'good');
  same('Miss.', V, 'bad');
  same('Bounced! No egg.', V, 'bad');
  same('Kicked it back!', O, 'good');
  same('The vulture found an egg! Move it or sit on it.', O, 'bad');
  same('Found an egg. Throw on it.', V, 'good');
  same("You're on the egg!", V, 'good');
  same('Hungry! Go eat.', O, 'bad');
  same('Egg cooling. Go back.', O, 'bad');
  same('Ate the leaf. Hunger restored.', O, 'good');
  same('Sit on eggs to warm them.', O, 'plain');
});

ok('a smash is not announced a second time as Smashed!', () => {
  assert.ok(!/bt='Smashed!'/.test(src));
  assert.ok(!/ev='Smashed!'/.test(src));
  assert.ok(!/'Egg smashed\.'/.test(src));
  assert.match(src, /announced once/);
});

console.log('PASS testnews (' + n + ' groups)');
process.exit(0);
