// The hint for a throw tap that is not a legal square. Works in the browser (window.THROW_TAP) and in Node.
// Team games leave the teammate's square off the throw list on purpose. Within throw reach that tap
// says "Your teammate is there." (Brian, 2026-11-16). Out of reach stays "Too far." No stone stays
// "No stone. Go to rocks."
(function (root) {
  const pointOk = p => Array.isArray(p) && p[0] >= 0 && p[1] >= 0;
  function mateInReach(S, p) {
    const h = S && S.h3;
    if (!h || !h.team || S.role !== 'red' || !pointOk(p) || !pointOk(S.vulture)) return false;
    const range = S.cfg && S.cfg.throwRange != null ? S.cfg.throwRange : 1;
    if (Math.max(Math.abs(p[0] - S.vulture[0]), Math.abs(p[1] - S.vulture[1])) > range) return false;
    return (h.pieces || []).some(q => q && q.mate && q.type === 'v' && pointOk(q.p) && q.p[0] === p[0] && q.p[1] === p[1]);
  }
  function miss(S, p) {
    if (!S || (S.stones | 0) < 1) return 'No stone. Go to rocks.';
    if (mateInReach(S, p)) return 'Your teammate is there.';
    return 'Too far.';
  }
  const api = { miss, mateInReach };
  if (typeof module !== 'undefined') module.exports = api;
  root.THROW_TAP = api;
})(typeof window === 'undefined' ? globalThis : window);
