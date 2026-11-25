// Sense stripes: which squares are within how far this player's own piece senses, drawn as stripes (sense-stripes.css).
// zone(S, mode) gives { c: centre square, r: range } or null. It uses only this player's own view and numbers the game already has:
//   vulture: smell range (S.cfg.smellRange), while choosing where to fly
//   ostrich in a hunter game (S.h3): how far a bird sees a hunter (2, the same distance the fog edge uses). A 2-player ostrich has no sense, so no stripes
//   hunter: its sense range (S.h3.senseRange); a buried hunter only sees the squares next to it (1)
// Stripes show distance only. They never mark an egg, a hidden piece or an answer.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SENSE_ZONE = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const SEE = 2; // a bird sees a hunter this far (hunter games only)
  const onBoard = p => !!(p && p[0] >= 0 && p[1] >= 0);
  function zone(S, mode) {
    if (!S || S.phase !== 'play' || !S.myTurn || S.god || S.simple) return null;
    if (S.role === 'red') return onBoard(S.vulture) && mode !== 'throw' && S.cfg && S.cfg.smellRange > 0 ? { c: S.vulture, r: S.cfg.smellRange } : null;
    if (S.role === 'blue') return S.h3 && onBoard(S.ostrich) && mode !== 'kick' ? { c: S.ostrich, r: SEE } : null;
    if (S.role === 'hunter') return S.h3 && onBoard(S.hunter) && S.h3.senseRange > 0 ? { c: S.hunter, r: S.burrowed ? 1 : S.h3.senseRange } : null;
    return null;
  }
  // every square key "x,y" inside the zone (king-move distance, clipped to the board)
  function squares(cfg, z) {
    const out = [];
    if (!z) return out;
    for (let y = 0; y < cfg.rows; y++) for (let x = 0; x < cfg.cols; x++) if (Math.max(Math.abs(x - z.c[0]), Math.abs(y - z.c[1])) <= z.r) out.push(x + ',' + y);
    return out;
  }
  return { zone, squares, SEE };
});
