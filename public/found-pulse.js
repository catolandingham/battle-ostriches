// A newly found egg (the filled "is here" egg) pulses briefly the first time it shows on the board, and in How to play's found-egg picture.
(function () {
  const SEL = '.cell .ic-spot .cmark.cm-egg.is svg, .cell.spotted .ic-myegg .cmark.cm-egg.is svg';
  let seen = new Set();
  const key = el => { const c = el.closest('.cell'); return c ? [...c.parentNode.children].indexOf(c) : -1; };
  function scan(root, fresh) {
    const now = new Set();
    root.querySelectorAll(SEL).forEach(el => { const k = key(el); now.add(k); if (fresh || !seen.has(k)) { el.classList.remove('justfound'); void el.offsetWidth; el.classList.add('justfound'); } });
    return now;
  }
  function start() {
    const board = document.getElementById('board');
    if (board) new MutationObserver(() => { const n = scan(board, false); seen = n; }).observe(board, { childList: true, subtree: true });
    const how = document.getElementById('howPics');
    if (how) new MutationObserver(() => scan(how, true)).observe(how, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
