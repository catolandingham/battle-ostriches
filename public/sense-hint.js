// The hunter's "bird may be here" cloud. Sense is a yes or no, not a direction.
// The distance is the same one the rules use: king-moves, not around the edge.
// One bird left: the new cloud is only the squares that fit the earlier yes as well.
// The earlier cloud is grown by how far that bird could have walked, so a real move is not left out.
// Two birds: a yes only means one of them is close. The older yes may have been the other bird,
// so the cloud stays the whole new area. Cutting it would sometimes hide the bird that is there.
(function (root) {
  function cheb(a, b) { return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])); }
  function disk(cfg, at, range) {
    const out = [];
    if (!cfg || !at || at[0] < 0) return out;
    for (let y = 0; y < cfg.rows; y++) for (let x = 0; x < cfg.cols; x++) {
      if (x === at[0] && y === at[1]) continue;
      if (cheb(at, [x, y]) <= range) out.push([x, y]);
    }
    return out;
  }
  function dilate(cfg, pts, m) {
    if (!m) return pts.map(p => p.slice());
    const keep = new Set();
    for (const p of pts) {
      for (let y = 0; y < cfg.rows; y++) for (let x = 0; x < cfg.cols; x++) {
        if (cheb(p, [x, y]) <= m) keep.add(x + ',' + y);
      }
    }
    return [...keep].map(s => s.split(',').map(Number));
  }
  const key = p => p[0] + ',' + p[1];
  function living(S) {
    const b = S && S.h3 && S.h3.birds;
    if (!b) return 2;
    return Object.keys(b).filter(k => b[k] && !b[k].out).length;
  }
  function moveBudget(S) {
    const cfg = (S && S.cfg) || {};
    const fly = cfg.vultureFly == null ? 2 : cfg.vultureFly;
    const walk = cfg.ostrichWalk == null ? 2 : cfg.ostrichWalk;
    const b = S && S.h3 && S.h3.birds;
    if (!b) return Math.max(fly, walk);
    let m = 0;
    for (const [k, v] of Object.entries(b)) {
      if (!v || v.out) continue;
      const isV = k === 'red' || /^v/.test(k);
      m = Math.max(m, isV ? fly : walk);
    }
    return m;
  }
  // narrow is true only when one bird is left and there was an earlier yes.
  function hintSquares(cfg, spec) {
    const range = spec.range == null ? 2 : spec.range;
    if (!spec.yes || !spec.at) return [];
    let cur = disk(cfg, spec.at, range);
    if (!spec.narrow || !spec.earlier || !spec.earlier.yes) return cur;
    const base = spec.earlier.squares && spec.earlier.squares.length ? spec.earlier.squares : disk(cfg, spec.earlier.at, range);
    const grown = dilate(cfg, base, spec.move || 0);
    const have = new Set(grown.map(key));
    return cur.filter(p => have.has(key(p)));
  }
  function update(memory, S) {
    if (!S || S.phase !== 'play' || S.sense == null || !S.hunter) return { squares: [], memory: null };
    if (memory && S.senseSeq != null && S.senseSeq < memory.seq) memory = null;
    const range = (S.h3 && S.h3.senseRange) || 2;
    if (memory && memory.seq === S.senseSeq) return { squares: S.sense ? memory.shown : [], memory };
    const one = living(S) <= 1;
    const earlier = memory && memory.yes ? memory : null;
    const narrow = !!(one && earlier);
    const move = S.pounce ? 0 : moveBudget(S);
    const squares = hintSquares(S.cfg, { at: S.hunter, yes: !!S.sense, range, earlier, move, narrow });
    const shown = S.sense ? squares : [];
    return { squares: shown, memory: { seq: S.senseSeq, at: S.hunter.slice(), yes: !!S.sense, squares: shown, shown } };
  }
  const api = { cheb, disk, dilate, hintSquares, living, moveBudget, update };
  if (typeof module !== 'undefined') module.exports = api;
  root.SENSE_HINT = api;
})(typeof window === 'undefined' ? globalThis : window);
