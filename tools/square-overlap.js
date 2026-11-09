// Shared check (Brian, approved full-board layout): an animal beside an egg, leaf or rock is centred, and nothing in the square overlaps.
module.exports = { SQUARE_CHECK: () => { const bad = [], seen = []; const box = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }, hit = (a, b) => a.l < b.r - 0.01 && b.l < a.r - 0.01 && a.t < b.b - 0.01 && b.t < a.b - 0.01;
  for (const c of document.querySelectorAll('#board .cell')) { const pcs = [...c.querySelectorAll(':scope>.pc')].filter(e => getComputedStyle(e).display !== 'none'); const items = [...c.querySelectorAll('.cm-egg svg, .wnum, :scope>.ic-food, :scope>.ic-rock')].filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0); if (!pcs.length || !items.length) continue;
   const cr = box(c), all = [...pcs.map(e => ['animal', e]), ...items.filter(e => !e.classList.contains('wnum')).map(e => [e.closest('.ic-food') ? 'leaf' : e.closest('.ic-rock') ? 'rock' : 'egg', e])];
   seen.push(all.map(x => x[0]).join('+'));
   for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (hit(box(all[i][1]), box(all[j][1]))) bad.push(all[i][0] + ' overlaps ' + all[j][0] + ' in square ' + [...c.parentNode.children].indexOf(c));
   for (const [k, e] of all) { const b = box(e); if (b.l < cr.l - 0.5 || b.r > cr.r + 0.5 || b.t < cr.t - 0.5 || b.b > cr.b + 0.5) bad.push(k + ' leaves its square'); }
   if (pcs.length === 1) { const b = box(pcs[0]); if (Math.abs((b.l + b.r) / 2 - (cr.l + cr.r) / 2) > 1 || Math.abs((b.t + b.b) / 2 - (cr.t + cr.b) / 2) > 1) bad.push('lone animal not centred beside its egg/leaf/rock'); }
   const n = c.querySelector('.wnum'), eg = c.querySelector('.cm-egg svg'); if (n && eg) { const a = box(n), e = box(eg), x = (a.l + a.r) / 2, y = (a.t + a.b) / 2; if (!(x > e.l && x < e.r && y > e.t && y < e.b)) bad.push('number outside its egg'); } }
  return { bad, seen }; } };
