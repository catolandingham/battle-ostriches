// Which picture goes under a start-of-game card (tutorial.js). Every line a card 2 or card 3 can carry (roles.js) maps to one topic by a keyword,
// and each topic has one real B&W board picture in public/tut/start/ (made by tools/shoot-start-cards.js). A line that matches nothing gets the
// fallback picture, so the box is never empty. The test e2e-start-cards.js checks that every file exists.
(function () {
  const TOPICS = ['tap', 'eggs', 'eat', 'catch', 'knockout', 'pounce', 'boost', 'burrow', 'tie', 'warm', 'share'];
  // first match wins
  const KEYS = [
    ['warm', /warm your teammate/i], ['share', /share found eggs/i], ['tie', /same number of knock-outs|you tie/i],
    ['boost', /after a knock-out/i], ['burrow', /burrow/i], ['pounce', /you smell/i],
    ['catch', /gets to your square|knocks out 1/i], ['knockout', /knock a bird out/i],
    ['eggs', /egg/i], ['eat', /eat in time|doesn't eat/i], ['tap', /tap a lit square/i],
  ];
  const FALLBACK = 'tap';
  function pick(line) { const k = KEYS.find(x => x[1].test(line || '')); return k ? k[0] : FALLBACK; }
  const src = line => '/tut/start/' + pick(line) + '.png';
  const API = { TOPICS, pick, src, FALLBACK };
  if (typeof module !== 'undefined') module.exports = API; else window.StartArt = API;
})();
