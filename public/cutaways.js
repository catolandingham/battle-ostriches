// Full-screen cartoon scenes for the big moments that have art.
// A new pair is a row in TABLE plus a file in public/art/cutaways/. Nothing else.
// The pictures play only for a player who can already see that moment. A wrapping
// kick (the path leaves one edge and comes back on the other) uses the wrap row.
(function (root) {
  const MS = 2000, REVEAL = 1500, FADE = 520;
  const TABLE = [
    // wrap is only the ostrich-kicks-hyena clip. Other pairs use their own kick picture even if the kick wraps.
    { id: 'kick-wrap', event: 'kick', by: 'ostrich', target: 'hyena', wrap: true, src: '/art/cutaways/kick-wrap.png', frames: 11 },
    { id: 'kick', event: 'kick', by: 'ostrich', target: 'hyena', wrap: false, src: '/art/cutaways/kick.png', frames: 30 },
    { id: 'kick-badger', event: 'kick', by: 'ostrich', target: 'badger', src: '/art/cutaways/kick-badger.png', frames: 30 },
    { id: 'kick-vulture', event: 'kick', by: 'ostrich', target: 'vulture', src: '/art/cutaways/kick-vulture.png', frames: 30 },
    { id: 'knockout', event: 'knockout', by: 'hyena', target: 'ostrich', src: '/art/cutaways/knockout.png', frames: 30 },
    { id: 'knockout-hyena-vulture', event: 'knockout', by: 'hyena', target: 'vulture', src: '/art/cutaways/knockout-hyena-vulture.png', frames: 30 },
    { id: 'knockout-badger-ostrich', event: 'knockout', by: 'badger', target: 'ostrich', src: '/art/cutaways/knockout-badger-ostrich.png', frames: 30 },
    { id: 'knockout-badger-vulture', event: 'knockout', by: 'badger', target: 'vulture', src: '/art/cutaways/knockout-badger-vulture.png', frames: 30 },
    { id: 'catch', event: 'catch', by: 'hyena', target: 'ostrich', src: '/art/cutaways/catch.png', frames: 30 },
    { id: 'catch-hyena-vulture', event: 'catch', by: 'hyena', target: 'vulture', src: '/art/cutaways/catch-hyena-vulture.png', frames: 30 },
    { id: 'catch-badger-ostrich', event: 'catch', by: 'badger', target: 'ostrich', src: '/art/cutaways/catch-badger-ostrich.png', frames: 30 },
    { id: 'catch-badger-vulture', event: 'catch', by: 'badger', target: 'vulture', src: '/art/cutaways/catch-badger-vulture.png', frames: 30 },
    { id: 'stone', event: 'stone', by: 'vulture', target: 'hyena', src: '/art/cutaways/stone.png', frames: 30 },
    { id: 'stone-badger', event: 'stone', by: 'vulture', target: 'badger', src: '/art/cutaways/stone-badger.png', frames: 30 },
    { id: 'burst', event: 'burst', by: 'badger', target: 'hyena', src: '/art/cutaways/burst.png', frames: 30 },
    { id: 'shove-badger-hyena', event: 'shove', by: 'badger', target: 'hyena', src: '/art/cutaways/shove-badger-hyena.png', frames: 30 },
    { id: 'shove-hyena-badger', event: 'shove', by: 'hyena', target: 'badger', src: '/art/cutaways/shove-hyena-badger.png', frames: 30 }
  ];
  const pointOk = p => Array.isArray(p) && p[0] >= 0 && p[1] >= 0;
  const anyPoint = pts => Array.isArray(pts) && pts.some(pointOk);
  const fresh = (a, b) => !!(a && a.seq != null && (!b || a.seq !== b.seq));
  function kindOf(name) {
    if (name == null || name === '') return '';
    if (name === 'ostrich' || name === 'blue' || name === 'o1' || name === 'o2') return 'ostrich';
    if (name === 'vulture' || name === 'red' || name === 'v1' || name === 'v2') return 'vulture';
    return name;
  }
  // A step that leaves the board and comes back on the far side. Sight never wraps,
  // so a phone sees this only when its own trail includes both sides of the jump.
  function seenWrap(trail, cfg) {
    if (!Array.isArray(trail)) return false;
    const cols = (cfg && cfg.cols) || 9, rows = (cfg && cfg.rows) || 7;
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i];
      if (!pointOk(a) || !pointOk(b)) continue;
      if (Math.abs(b[0] - a[0]) > cols / 2 || Math.abs(b[1] - a[1]) > rows / 2) return true;
      if (Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) > 1) return true;
    }
    return false;
  }
  function candidates(S, prev) {
    const out = [];
    if (!S || !prev || !(S.phase === 'play' || (S.phase === 'over' && prev.phase === 'play'))) return out;
    const h = S.h3 || {}, oh = prev.h3 || {};
    const k = S.kick;
    if (fresh(k, prev.kick)) {
      const seen = anyPoint(k.trail) || pointOk(k.to);
      if (seen) out.push({ event: 'kick', by: kindOf(k.by || 'ostrich'), target: kindOf(k.who), wrap: seenWrap(k.trail, S.cfg), seq: k.seq, trail: k.trail });
    }
    const lc = h.lastCatch;
    if (fresh(lc, oh.lastCatch) && pointOk(lc.at)) {
      out.push({ event: lc.ko ? 'knockout' : 'catch', by: kindOf(lc.by || h.kind), target: kindOf(lc.bird), seq: lc.seq });
    }
    const note = S.stoneNote;
    if (fresh(note, prev.stoneNote)) {
      for (const t of note.targets || []) {
        const target = kindOf(t);
        const trail = (note.trails || []).find(x => kindOf(x.key) === target);
        if (trail && anyPoint(trail.points)) out.push({ event: 'stone', by: kindOf(note.by || 'vulture'), target, seq: note.seq });
      }
    }
    const b = h.burst;
    if (fresh(b, oh.burst) && (pointOk(b.to) || anyPoint(b.trail))) out.push({ event: 'burst', by: 'badger', target: 'hyena', seq: b.seq });
    const rv = h.rival;
    if (fresh(rv, oh.rival) && (pointOk(rv.to) || anyPoint(rv.trail))) {
      const by = kindOf(rv.by);
      out.push({ event: 'shove', by, target: by === 'hyena' ? 'badger' : 'hyena', seq: rv.seq });
    }
    return out;
  }
  function sceneFor(S, prev) {
    const cs = candidates(S, prev);
    for (const row of TABLE) {
      const hit = cs.find(c => c.event === row.event && c.by === row.by && c.target === row.target && (row.wrap == null || !!row.wrap === !!c.wrap));
      if (hit) return Object.assign({ seq: hit.seq, trail: hit.trail || null }, row);
    }
    return null;
  }
  const api = { MS, REVEAL, TABLE, kindOf, seenWrap, candidates, sceneFor };
  if (typeof module !== 'undefined') module.exports = api;

  if (typeof document === 'undefined') return;
  root.CUTAWAYS = api;
  let apply = null, queue = [], busyUntil = 0, serial = 0, nextCard = null, holdEl = null;
  api.bind = fn => { apply = fn; };
  api.busy = () => busyUntil > Date.now();
  api.defer = state => { if (busyUntil > Date.now()) { queue.push(state); return true; } return false; };
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  function pieceSel(key) {
    if (key === 'blue' || /^o\d/.test(key)) return '.pc.po';
    if (key === 'red' || /^v\d/.test(key)) return '.pc.pv';
    return '.pc.ph.h' + key;
  }
  // A still picture of the board as it was, so the squares underneath can change
  // without the player seeing it until the scene shows the result.
  function snapshot(board) {
    const hold = board.cloneNode(true);
    const live = [board, ...board.querySelectorAll('*')], copy = [hold, ...hold.querySelectorAll('*')];
    const boardRect = board.getBoundingClientRect();
    const styles = live.map(n => getComputedStyle(n));
    const rects = live.map(n => n.getBoundingClientRect());
    copy.forEach((n, i) => {
      const cs = styles[i], r = rects[i];
      if (n === hold) {
        const set = (prop, value) => n.style.setProperty(prop, value, 'important');
        set('position', 'absolute'); set('margin', '0'); set('pointer-events', 'none'); set('z-index', '12'); set('overflow', 'hidden');
        set('width', boardRect.width + 'px'); set('height', boardRect.height + 'px');
        set('background-color', cs.backgroundColor); set('border-radius', cs.borderRadius); set('box-shadow', 'none');
        return;
      }
      const parent = n.parentElement, pi = copy.indexOf(parent);
      const pr = pi <= 0 ? boardRect : rects[pi];
      const set = (prop, value) => n.style.setProperty(prop, value, 'important');
      set('position', 'absolute'); set('margin', '0'); set('right', 'auto'); set('bottom', 'auto');
      set('left', (r.left - pr.left) + 'px'); set('top', (r.top - pr.top) + 'px');
      set('width', r.width + 'px'); set('height', r.height + 'px');
      set('background-color', cs.backgroundColor); set('background-image', cs.backgroundImage);
      set('opacity', cs.opacity); set('border-radius', cs.borderRadius); set('color', cs.color);
      set('visibility', cs.visibility); set('object-fit', 'contain'); set('overflow', 'visible'); set('box-shadow', cs.boxShadow); set('filter', 'none');
      set('border-top', cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor);
      set('border-right', cs.borderRightWidth + ' ' + cs.borderRightStyle + ' ' + cs.borderRightColor);
      set('border-bottom', cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor);
      set('border-left', cs.borderLeftWidth + ' ' + cs.borderLeftStyle + ' ' + cs.borderLeftColor);
    });
    hold.id = 'boardhold';
    hold.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    return hold;
  }
  function reveal() {
    const hold = document.getElementById('boardhold'); if (hold) hold.remove(); holdEl = null;
    if (root.PUSH_MOTION && PUSH_MOTION.finish) PUSH_MOTION.finish();
    const card = document.getElementById('cutaway'); if (card) card.classList.add('out');
  }
  function finish(token) {
    if (token !== serial) return;
    serial++; busyUntil = 0; reveal();
    const card = document.getElementById('cutaway'); if (card) card.remove();
    while (queue.length && !(busyUntil > Date.now())) { const s = queue.shift(); try { apply && apply(s); } catch (e) { console.error(e); } }
  }
  function stepDir(a, b, cols, rows) {
    let dx = b[0] - a[0], dy = b[1] - a[1];
    if (Math.abs(dx) > cols / 2) dx -= Math.sign(dx) * cols;
    if (Math.abs(dy) > rows / 2) dy -= Math.sign(dy) * rows;
    return [Math.sign(dx), Math.sign(dy)];
  }
  // The little board inside a wrapping kick. It follows this phone's trail,
  // including which way it left the edge, and draws no egg or hidden animal.
  function buildPath(card, scene, S) {
    const cfg = S.cfg || { cols: 9, rows: 7 }, cols = cfg.cols, rows = cfg.rows;
    const pts = (scene.trail || []).filter(pointOk);
    const box = document.createElement('div'); box.className = 'cutaway-path';
    box.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
    box.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
    for (let i = 0; i < cols * rows; i++) { const c = document.createElement('i'); if ((i % cols + (i / cols | 0)) % 2) c.className = 'alt'; box.appendChild(c); }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.classList.add('cutaway-dash');
    const xy = p => [(p[0] + 0.5) / cols * 100, (p[1] + 0.5) / rows * 100];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], wrap = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) > 1;
      const seg = (p, q) => { const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'), A = xy(p), B = xy(q); l.setAttribute('x1', A[0]); l.setAttribute('y1', A[1]); l.setAttribute('x2', B[0]); l.setAttribute('y2', B[1]); svg.appendChild(l); };
      if (!wrap) seg(a, b);
      else { const d = stepDir(a, b, cols, rows); seg(a, [a[0] + d[0], a[1] + d[1]]); seg([b[0] - d[0], b[1] - d[1]], b); }
    }
    box.appendChild(svg);
    if (pointOk(S.ostrich)) {
      const o = document.createElement('div'); o.className = 'cutaway-piece ostrich'; o.innerHTML = (root.ART && ART.ostrich) || '';
      const p = xy(S.ostrich); o.style.left = p[0] + '%'; o.style.top = p[1] + '%';
      const leg = document.createElement('i'); leg.className = 'kick-leg'; o.appendChild(leg); box.appendChild(o);
    }
    if (pts.length) {
      const h = document.createElement('div'); h.className = 'cutaway-piece hyena'; h.innerHTML = (root.ART && ART.hyena) || '';
      const p0 = xy(pts[0]); h.style.left = p0[0] + '%'; h.style.top = p0[1] + '%'; box.appendChild(h);
      const dur = 780;
      const startAt = performance.now() + Math.max(0, FADE + 40);
      const tick = now => {
        if (!h.isConnected) return;
        const t = Math.min(1, (now - startAt) / dur);
        if (pts.length === 1 || t <= 0) { h.style.left = p0[0] + '%'; h.style.top = p0[1] + '%'; }
        else {
          const segs = pts.length - 1, x = Math.min(segs - 0.0001, t * segs), i = Math.floor(x), u = x - i;
          const a = pts[i], b = pts[i + 1], wrap = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) > 1;
          let pos;
          if (!wrap) pos = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
          else {
            const d = stepDir(a, b, cols, rows);
            pos = u < 0.5 ? [a[0] + d[0] * u * 2, a[1] + d[1] * u * 2] : [b[0] - d[0] * (1 - (u - 0.5) * 2), b[1] - d[1] * (1 - (u - 0.5) * 2)];
          }
          const q = xy(pos); h.style.left = q[0] + '%'; h.style.top = q[1] + '%';
        }
        if (t < 1) requestAnimationFrame(tick);
      };
      setTimeout(() => requestAnimationFrame(tick), Math.max(0, FADE + 40));
    }
    card.appendChild(box);
  }
  function showCard(scene, S, board) {
    const stage = document.getElementById('stage'); if (!stage || !board) return;
    const old = document.getElementById('cutaway'); if (old) old.remove();
    const el = document.createElement('div'); el.id = 'cutaway'; el.className = 'cutaway'; el.dataset.scene = scene.id; el.setAttribute('aria-hidden', 'true');
    const card = document.createElement('div'); card.className = 'cutaway-card';
    const art = document.createElement('div'); art.className = 'cutaway-art';
    const frames = scene.frames || 1;
    const set = (prop, value) => art.style.setProperty(prop, value, 'important');
    set('background-image', 'url("' + scene.src + '")');
    set('background-repeat', 'no-repeat');
    set('background-color', '#fff');
    set('background-size', '100% ' + (frames * 100) + '%');
    set('background-position', '0 0');
    card.appendChild(art); el.appendChild(card);
    const b = board.getBoundingClientRect(), s = stage.getBoundingClientRect();
    el.style.left = (b.left - s.left) + 'px'; el.style.top = (b.top - s.top) + 'px'; el.style.width = b.width + 'px'; el.style.height = b.height + 'px';
    stage.appendChild(el);
    if (scene.wrap) buildPath(card, scene, S);
    const t0 = performance.now();
    const step = now => {
      if (!art.isConnected) return;
      const i = Math.min(frames - 1, Math.floor((now - t0) / 50));
      const p = frames <= 1 ? 0 : (i / (frames - 1)) * 100;
      art.style.setProperty('background-position', '0 ' + p + '%', 'important');
      if (i < frames - 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    if (scene.wrap) setTimeout(() => { if (el.isConnected) el.classList.add('show-path'); }, FADE);
  }
  api.prepare = function (S, prev, board) {
    if (!board || busyUntil > Date.now()) return;
    const scene = sceneFor(S, prev);
    const ev = (root.PUSH_MOTION && PUSH_MOTION.events(S, prev)) || [];
    if (!scene && !ev.length) return;
    const stage = document.getElementById('stage');
    if (stage && board.children.length) {
      const hold = snapshot(board);
      if (!reduced()) for (const e of ev) {
        const start = (e.points || []).find(pointOk); if (!start) continue;
        const cell = hold.children[start[1] * S.cfg.cols + start[0]];
        const pc = cell && cell.querySelector(pieceSel(e.key)); if (pc) pc.style.visibility = 'hidden';
      }
      const b = board.getBoundingClientRect(), s = stage.getBoundingClientRect();
      hold.style.left = (b.left - s.left) + 'px'; hold.style.top = (b.top - s.top) + 'px';
      const prevHold = document.getElementById('boardhold'); if (prevHold) prevHold.remove();
      stage.appendChild(hold); holdEl = hold;
    }
    busyUntil = Date.now() + MS;
    const token = ++serial;
    const cartoon = scene && !reduced();
    nextCard = cartoon ? { scene, S } : null;
    setTimeout(() => { if (token === serial) reveal(); }, cartoon ? REVEAL : MS);
    setTimeout(() => finish(token), MS);
  };
  api.play = function (S, prev, board) {
    if (nextCard) { const job = nextCard; nextCard = null; showCard(job.scene, S, board); }
    const hold = document.getElementById('boardhold'), leg = board && board.querySelector('.kick-leg');
    if (hold && leg) {
      const idx = [...board.children].indexOf(leg.closest('.cell'));
      const pc = hold.children[idx] && hold.children[idx].querySelector('.pc');
      if (pc && !pc.querySelector('.kick-leg')) pc.appendChild(leg.cloneNode(true));
    }
  };
  TABLE.forEach(row => { const im = new Image(); im.src = row.src; });
})(typeof window === 'undefined' ? globalThis : window);
