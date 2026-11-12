// Shared check (S2): an animal beside an egg sits down-right at about 60%. Beside a leaf or rock it sits up-left at about 64%.
// Overlap means drawn ink touching (plus a ~2% gap), not the empty corners of the boxes.
// Returns a Promise so callers always await it.
module.exports = {
  SQUARE_CHECK: async () => {
    const bad = [], seen = [], sizes = [];
    const box = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };

    const inkOf = async (el, cr, W, H) => {
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      const img = el.matches && el.matches('img') ? el : el.querySelector && el.querySelector('img.aimg, img');
      const svg = el.matches && el.matches('svg') ? el : el.querySelector && el.querySelector('svg');
      const host = (el.classList && el.classList.contains('pc')) ? el : (img || svg);
      if (!host) return null;
      const r = host.getBoundingClientRect();
      const dx = r.left - cr.left, dy = r.top - cr.top;
      const drawSvg = async (node, w, h) => {
        const clone = node.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('width', String(w));
        clone.setAttribute('height', String(h));
        const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }));
        await new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => { ctx.drawImage(i, dx, dy, w, h); URL.revokeObjectURL(url); res(); };
          i.onerror = () => { URL.revokeObjectURL(url); rej(new Error('svg draw')); };
          i.src = url;
        });
      };
      if (img) {
        try {
          if (!img.complete || !img.naturalWidth) await new Promise(res => { img.onload = res; setTimeout(res, 800); });
          ctx.drawImage(img, dx, dy, r.width, r.height);
        } catch (_) {
          try {
            const text = await (await fetch(img.currentSrc || img.src)).text();
            const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }));
            await new Promise((res, rej) => {
              const i = new Image();
              i.onload = () => { ctx.drawImage(i, dx, dy, r.width, r.height); URL.revokeObjectURL(url); res(); };
              i.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img fetch')); };
              i.src = url;
            });
          } catch (_) { return null; }
        }
      } else if (svg) {
        try { await drawSvg(svg, r.width, r.height); } catch (_) { return null; }
      } else return null;
      const data = ctx.getImageData(0, 0, W, H).data;
      const mask = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) {
        const o = i * 4;
        if (data[o + 3] > 40 && (data[o] + data[o + 1] + data[o + 2]) / 3 < 160) mask[i] = 1;
      }
      return mask;
    };

    const dilate = (mask, W, H, gap) => {
      if (!mask || gap <= 0) return mask;
      const out = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!mask[y * W + x]) continue;
        for (let dy = -gap; dy <= gap; dy++) for (let dx = -gap; dx <= gap; dx++) {
          if (dx * dx + dy * dy > gap * gap) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H) out[ny * W + nx] = 1;
        }
      }
      return out;
    };

    const inkHit = (a, b) => { if (!a || !b) return false; for (let i = 0; i < a.length; i++) if (a[i] && b[i]) return true; return false; };

    for (const c of document.querySelectorAll('#board .cell')) {
      const pcs = [...c.querySelectorAll(':scope>.pc')].filter(e => getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden');
      const items = [...c.querySelectorAll('.cm-egg svg, .wnum, :scope>.ic-food, :scope>.ic-rock')].filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0);
      if (!pcs.length || !items.length) continue;
      const cr = c.getBoundingClientRect(), W = Math.max(1, Math.round(cr.width)), H = Math.max(1, Math.round(cr.height));
      const gap = Math.max(1, Math.round(W * 0.02));
      const marks = items.filter(e => !e.classList.contains('wnum'));
      const kindOf = e => e.closest && e.closest('.ic-food') ? 'leaf' : e.closest && e.closest('.ic-rock') ? 'rock' : 'egg';
      const all = [...pcs.map(e => ['animal', e]), ...marks.map(e => [kindOf(e), e])];
      seen.push(all.map(x => x[0]).join('+'));
      const hasEgg = all.some(x => x[0] === 'egg');
      const hasCorner = all.some(x => x[0] === 'leaf' || x[0] === 'rock');

      // Stay inside the square (boxes).
      for (const [k, e] of all) {
        const b = box(e);
        if (b.l < cr.left - 0.5 || b.r > cr.right + 0.5 || b.t < cr.top - 0.5 || b.b > cr.bottom + 0.5) bad.push(k + ' leaves its square');
      }

      // One animal tucks away from the corner mark. Egg is top-left, so the animal sits down-right. A leaf or rock tucks bottom-right, so the animal sits up-left.
      if (pcs.length === 1) {
        const b = box(pcs[0]);
        const mx = (b.l + b.r) / 2, my = (b.t + b.b) / 2;
        const cx = (cr.left + cr.right) / 2, cy = (cr.top + cr.bottom) / 2;
        const frac = b.w / cr.width;
        sizes.push(+frac.toFixed(3));
        if (hasEgg && (frac < 0.55 || frac > 0.70 || mx <= cx || my <= cy)) bad.push('animal with egg should be about 60% and down-right (' + frac.toFixed(2) + ')');
        if (!hasEgg && hasCorner && (frac < 0.60 || frac > 0.72 || mx >= cx || my >= cy)) bad.push('animal with leaf/rock should be about 64% and up-left (' + frac.toFixed(2) + ')');
      } else {
        for (const pc of pcs) sizes.push(+(box(pc).w / cr.width).toFixed(3));
      }

      // Number sits inside its egg.
      const n = c.querySelector('.wnum'), eg = c.querySelector('.cm-egg svg');
      if (n && eg) {
        const a = box(n), e = box(eg), x = (a.l + a.r) / 2, y = (a.t + a.b) / 2;
        if (!(x > e.l && x < e.r && y > e.t && y < e.b)) bad.push('number outside its egg');
      }

      // Ink non-overlap (dilate animal ink by the gap so lines keep a small clear space).
      const layers = [];
      for (const [k, e] of all) {
        const mask = await inkOf(e, cr, W, H);
        layers.push([k, k === 'animal' ? dilate(mask, W, H, gap) : mask]);
      }
      for (let i = 0; i < layers.length; i++) for (let j = i + 1; j < layers.length; j++) {
        if (inkHit(layers[i][1], layers[j][1])) bad.push(layers[i][0] + ' ink overlaps ' + layers[j][0] + ' in square ' + [...c.parentNode.children].indexOf(c));
      }
    }
    return { bad, seen, sizes };
  }
};
