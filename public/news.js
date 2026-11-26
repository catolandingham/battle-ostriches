// Good news, bad news, or neither, for the player holding this phone. news.css turns it into green, red or navy (the same in every theme except Black and white).
// This file does not choose words. It only says how each existing line feels to each animal. The lines about a catch, a kick, a stone, a shove and a smash
// are judged in catchtext.js, next to their words, because who did it matters. Everything else is here: a plain table, one row per line.
// Columns: [ostrich, vulture, hunter]. g = good, b = bad, p = plain (navy).
(function (root) {
  const G = 'good', B = 'bad', P = 'plain';
  const LINES = {
    // sniff pops and the banner
    'Vulture found your egg!': [B, P, P], 'Found egg!': [P, G, P], 'Vulture sniffed an egg.': [B, P, P], 'Egg nearby!': [P, G, P], 'No egg nearby': [P, P, P],
    'An egg went cold.': [B, G, P],
    // Brian, 2026-11-25: only the ostrich sees "You ate." and it is good news for her. (Out of time. is judged in catchtext.js, from whose clock ran out.)
    'You ate.': [G, P, P],
    // the hunters' sense, the near warnings, the pounce, the hit warning
    'Bird near.': [P, P, G], 'Still near.': [P, P, G], 'Nothing near.': [P, P, P], 'Pounce!': [P, P, G],
    'Hyena near!': [B, B, P], 'Badger near!': [B, B, P], 'Look out!': [B, B, B],
    // the vulture's squares: a teammate's sniff
    'Egg near': [P, G, P], 'No egg': [P, P, P]
  };
  // Lines that start the one-line hint under the board. The hint may go on with "Your turn. Tap to move."
  const HINTS = [
    ['The vulture found an egg! Move it or sit on it.', B, P, P], ['Kicked it back!', G, P, P], ['Missed.', G, P, P], ['Hungry! Go eat.', B, P, P], ['Egg cooling. Go back.', B, P, P], ['The vulture sees you sit.', B, P, P],
    ['Found an egg. Throw on it.', P, G, P], ['Found it. Get a stone first.', P, G, P], ["You're on the egg!", P, G, P], ['Miss.', P, B, P], ['Bounced!', P, B, P]
  ];
  const sideIndex = S => { const r = S && S.role; return r === 'blue' ? 0 : r === 'red' ? 1 : 2; };
  const seatSide = s => /^(blue|o1|o2)$/.test(s) ? 'blue' : /^(red|v1|v2)$/.test(s) ? 'red' : 'hunter';
  // 'good' | 'bad' | 'plain' for a fixed line on this phone. A line that is not in the table is plain.
  function tone(text, S) {
    const t = String(text || '').replace(/\s+/g, ' ').trim(), row = LINES[t];
    return row ? row[sideIndex(S)] : P;
  }
  // The hint is a news line only when it starts with one of the lines above. The badger's dig-in warning is the other news in a hint.
  function hintTone(text, S) {
    const t = String(text || '').replace(/\s+/g, ' ').trim(), i = sideIndex(S);
    for (const row of HINTS) if (t.indexOf(row[0]) === 0) return row[1 + i];
    if (t.indexOf('A bird will see you dig in.') >= 0) return B;
    if (t.indexOf('No bird will see you dig in.') >= 0) return G;
    return P;
  }
  // The end title: green for the winner, red for everyone else. A draw, a tie, a left game and a shared phone keep the plain card.
  function endTone(S) {
    const w = S && S.winner;
    if (!w || w === 'none' || S.pass || S.winBy === 'left') return '';
    const h = S.h3 || {}, me = seatSide(h.mySeat || S.role);
    const mine = w === 'hunter' ? me === 'hunter' : w === 'hyena' || w === 'badger' ? (h.mySeat || S.role) === w : seatSide(w) === me;
    return mine ? G : B;
  }
  const cls = t => t === G ? 'news-good' : t === B ? 'news-bad' : t === P ? 'news-plain' : '';
  const api = { tone, hintTone, endTone, cls, LINES, HINTS };
  if (typeof module !== 'undefined') module.exports = api; else root.News = api;
})(typeof window === 'undefined' ? globalThis : window);
