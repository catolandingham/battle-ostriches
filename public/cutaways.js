// Full-screen cartoon scenes for the big moments that have art, including the vulture smashing an egg.
// A new pair is a row in TABLE plus its drawings and steps in public/cutaway-scenes.js
// (made by tools/cutaways/export.py; see tools/cutaways/README.md). Nothing else.
// A kick, a stone, a burst, or a shove plays only for a player who can already see
// that moment. A catch, and the knock-out picture, plays on every phone: the drawing
// is the two animals and carries no square, so it does not show where the hunter was,
// where the bird landed, or whether a badger was buried. A wrapping
// kick (the path leaves one edge and comes back on the other) uses the wrap row.
(function (root) {
  const MS = 2000, REVEAL = 1500, STEP = 50;
  // The wrap shows the kick, then the little board: it fades in at WRAP_FADE and the hyena
  // travels the path from WRAP_GO until the card leaves.
  const WRAP_FADE = 650, WRAP_GO = 900, WRAP_RUN = 600; // the kick fades to white, then the board fades in: never both at once
  const TABLE = [
    // wrap is only the ostrich-kicks-hyena clip. Other pairs use their own kick picture even if the kick wraps.
    { id: 'kick-wrap', event: 'kick', by: 'ostrich', target: 'hyena', wrap: true },
    { id: 'kick', event: 'kick', by: 'ostrich', target: 'hyena', wrap: false },
    { id: 'kick-badger', event: 'kick', by: 'ostrich', target: 'badger' },
    { id: 'kick-vulture', event: 'kick', by: 'ostrich', target: 'vulture' },
    { id: 'knockout', event: 'knockout', by: 'hyena', target: 'ostrich' },
    { id: 'knockout-hyena-vulture', event: 'knockout', by: 'hyena', target: 'vulture' },
    { id: 'knockout-badger-ostrich', event: 'knockout', by: 'badger', target: 'ostrich' },
    { id: 'knockout-badger-vulture', event: 'knockout', by: 'badger', target: 'vulture' },
    { id: 'catch', event: 'catch', by: 'hyena', target: 'ostrich' },
    { id: 'catch-hyena-vulture', event: 'catch', by: 'hyena', target: 'vulture' },
    { id: 'catch-badger-ostrich', event: 'catch', by: 'badger', target: 'ostrich' },
    { id: 'catch-badger-vulture', event: 'catch', by: 'badger', target: 'vulture' },
    // the vulture's stone smashes an egg (Brian's pick 5a). It comes before the stone rows: a stone that smashes an egg shows the egg.
    { id: 'egg-smash', event: 'smash', by: 'vulture', target: 'egg' },
    { id: 'stone', event: 'stone', by: 'vulture', target: 'hyena' },
    { id: 'stone-badger', event: 'stone', by: 'vulture', target: 'badger' },
    { id: 'burst', event: 'burst', by: 'badger', target: 'hyena' },
    { id: 'shove-badger-hyena', event: 'shove', by: 'badger', target: 'hyena' },
    { id: 'shove-hyena-badger', event: 'shove', by: 'hyena', target: 'badger' }
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
    // The square (lc.at) is only on phones that may see the hunter. The cartoon does not use it.
    if (fresh(lc, oh.lastCatch) && (lc.bird || lc.ko)) {
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
    const sm = S.smashNote; // every player is told about a smashed egg, so every player sees it
    if (fresh(sm, prev.smashNote)) out.push({ event: 'smash', by: 'vulture', target: 'egg', seq: sm.seq });
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
  // After a surprise hold, only the latest deferred state is applied (the board
  // should show the current truth). Intermediate packets are dropped so we do not
  // replay a mid-hold turn as a snap.
  function flushStates(queue) { return queue && queue.length ? [queue[queue.length - 1]] : []; }
  const api = { MS, REVEAL, TABLE, kindOf, seenWrap, candidates, sceneFor, flushStates, flushing: false };
  if (typeof module !== 'undefined') module.exports = api;

  if (typeof document === 'undefined') return;
  root.CUTAWAYS = api;
  let apply = null, queue = [], busyUntil = 0, serial = 0, nextCard = null, holdEl = null;
  api.bind = fn => { apply = fn; };
  api.busy = () => busyUntil > Date.now();
  // true while the egg-smash cartoon is about to play or playing: smash.js then skips its own little egg-crack on the board
  api.smashCartoon = () => !!((nextCard && nextCard.scene.id === 'egg-smash') || document.querySelector('#cutaway[data-scene="egg-smash"]'));
  api.defer = state => { if (busyUntil > Date.now()) { queue.push(state); return true; } return false; };
  api.policy = null;
  function hideGo() {
    const el = document.getElementById('surprise-go'); if (el) el.remove();
  }
  api.dismiss = function () {
    hideGo();
    finish(serial);
  };
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
    // Take the cartoon away in one step. A slide-off leaves the white sheet
    // behind as a blank card, and the board (plus any real motion) should be
    // what comes back.
    const card = document.getElementById('cutaway'); if (card) card.remove();
    const hold = document.getElementById('boardhold'); if (hold) hold.remove(); holdEl = null;
    document.documentElement.classList.add('surprise-slide');
    if (root.PUSH_MOTION && PUSH_MOTION.go) PUSH_MOTION.go();
  }
  function emitSurpriseDone() {
    try { if (window.UI && UI.send) UI.send({ t: 'surprise-done' }); } catch (e) {}
  }
  function finish(token) {
    if (token !== serial) return;
    serial++; busyUntil = 0; hideGo();
    const hold = document.getElementById('boardhold'); if (hold) hold.remove(); holdEl = null;
    const card = document.getElementById('cutaway'); if (card) card.remove();
    document.documentElement.classList.remove('cutaway-up');
    document.documentElement.classList.remove('surprise-slide');
    // Drop the held event line before the queued states paint, so the next line is not stuck behind it.
    try { if (api.onDone) api.onDone(); } catch (e) {}
    emitSurpriseDone();
    const pending = queue.splice(0);
    const last = api.flushStates(pending)[0];
    if (!last || !apply) return;
    // A move made during the hold must not appear as a snap at the landing of
    // the slide we just played. Mark this apply so push-motion can slide each
    // visible piece from where the hold left it to where it is now.
    api.flushing = true;
    try { apply(last); } catch (e) { console.error(e); }
    finally { api.flushing = false; }
  }
  function stepDir(a, b, cols, rows) {
    let dx = b[0] - a[0], dy = b[1] - a[1];
    if (Math.abs(dx) > cols / 2) dx -= Math.sign(dx) * cols;
    if (Math.abs(dy) > rows / 2) dy -= Math.sign(dy) * rows;
    return [Math.sign(dx), Math.sign(dy)];
  }
  // The little board inside a wrapping kick. It follows this phone's trail,
  // including which way it left the edge, and draws no egg or hidden animal.
  // The kicked hyena is the same cartoon drawing as the kick, so it stays sharp.
  function buildPath(card, scene, S) {
    const cfg = S.cfg || { cols: 9, rows: 7 }, cols = cfg.cols, rows = cfg.rows;
    const pts = (scene.trail || []).filter(pointOk);
    const box = document.createElement('div'); box.className = 'cutaway-path';
    // square squares, centred on the card
    const bw = 88, bh = bw * rows / cols * (ART_W / ART_H);
    box.style.cssText = 'left:' + (100 - bw) / 2 + '%;width:' + bw + '%;top:' + (100 - bh) / 2 + '%;height:' + bh + '%';
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
    const cw = 100 / cols, ch = 100 / rows;
    if (pointOk(S.ostrich)) {
      const o = document.createElement('div'); o.className = 'cutaway-piece ostrich'; o.innerHTML = (root.ART && ART.ostrich) || '';
      const p = xy(S.ostrich); o.style.left = p[0] + '%'; o.style.top = p[1] + '%'; o.style.width = cw * 1.1 + '%'; o.style.height = ch * 1.1 + '%';
      box.appendChild(o);
    }
    if (pts.length) {
      const art = root.CUTAWAY_ART, src = art && art.sprites && art.sprites.hf;
      const h = document.createElement('div'); h.className = 'cutaway-piece hyena flier';
      h.style.width = cw * 2.2 + '%'; h.style.height = ch * 2.2 + '%';
      h.innerHTML = src ? '<img class="aimg" src="' + src + '" alt="" draggable="false">' : ((root.ART && ART.hyena) || '');
      const d0 = pts.length > 1 ? stepDir(pts[0], pts[1], cols, rows) : [1, 0];
      const face = d => { h.style.transform = 'translate(-50%,-50%)' + (src && d[0] < 0 ? ' scaleX(-1)' : ''); };
      face(d0);
      const p0 = xy(pts[0]); h.style.left = p0[0] + '%'; h.style.top = p0[1] + '%'; box.appendChild(h);
      const startAt = performance.now() + WRAP_GO;
      const tick = now => {
        if (!h.isConnected) return;
        const t = Math.min(1, Math.max(0, (now - startAt) / WRAP_RUN));
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        if (pts.length === 1 || t <= 0) { h.style.left = p0[0] + '%'; h.style.top = p0[1] + '%'; }
        else {
          const segs = pts.length - 1, x = Math.min(segs - 0.0001, e * segs), i = Math.floor(x), u = x - i;
          const a = pts[i], b = pts[i + 1], wrap = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) > 1;
          let pos;
          const d = stepDir(a, b, cols, rows); face(d);
          if (!wrap) pos = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
          else pos = u < 0.5 ? [a[0] + d[0] * u * 2, a[1] + d[1] * u * 2] : [b[0] - d[0] * (1 - (u - 0.5) * 2), b[1] - d[1] * (1 - (u - 0.5) * 2)];
          const q = xy(pos); h.style.left = q[0] + '%'; h.style.top = q[1] + '%';
        }
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    card.appendChild(box);
  }
  // Drawings load once, after the game has started, so the first scene never waits on them.
  const images = {};
  function picture(name) {
    const art = root.CUTAWAY_ART; if (!art || !art.sprites[name]) return null;
    if (!images[name]) { const im = new Image(); im.decoding = 'async'; im.src = art.sprites[name]; images[name] = im; }
    return images[name];
  }
  function preload() { const art = root.CUTAWAY_ART; if (art) for (const n in art.sprites) picture(n); }
  // The card keeps the drawings' own shape (ART_W x ART_H, never stretched). Its top is the
  // board's top, so the line above the board stays in view. The action bar is hidden
  // while the card is up, so the card uses the whole screen below the board's top and
  // stays as wide as the board. A short screen may shrink it; a white sheet behind it
  // still covers the board so a piece cannot peek out at the side.
  const ART_W = 336, ART_H = 412, EDGE = 3, SHADOW_X = 8, SHADOW_Y = 11;
  function cardBox(board, stage) {
    const b = board.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 844;
    const floor = vh - 8;
    const room = Math.max(160, floor - b.top - SHADOW_Y);
    let w = b.width, h = (w - 2 * EDGE) * ART_H / ART_W + 2 * EDGE;
    if (h > room) { h = room; w = (h - 2 * EDGE) * ART_W / ART_H + 2 * EDGE; }
    return {
      left: b.left - s.left + (b.width - w) / 2, top: b.top - s.top, w, h,
      boardLeft: b.left - s.left, boardTop: b.top - s.top, boardW: b.width, boardH: b.height
    };
  }
  function drawStep(ctx, scene, i) {
    const steps = scene.steps, st = steps[Math.min(steps.length - 1, i)];
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(ctx.canvas.width / ART_W, 0, 0, ctx.canvas.height / ART_H, 0, 0);
    let ready = true;
    for (const L of st) {
      const im = picture(scene.sprites[L[0]]);
      if (!im || !im.complete || !im.naturalWidth) { ready = false; continue; }
      const x = L[1], y = L[2], w = L[3], h = L[4], rot = L[5] || 0, a = L.length > 6 ? L[6] : 1;
      ctx.globalAlpha = a;
      if (rot) { ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(-rot * Math.PI / 180); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); }
      else ctx.drawImage(im, x, y, w, h);
    }
    ctx.globalAlpha = 1;
    return ready;
  }
  function showCard(scene, S, board) {
    const stage = document.getElementById('stage'); if (!stage || !board) return;
    const old = document.getElementById('cutaway'); if (old) old.remove();
    const data = root.CUTAWAY_ART && CUTAWAY_ART.scenes[scene.id]; if (!data) return;
    const el = document.createElement('div'); el.id = 'cutaway'; el.className = 'cutaway'; el.dataset.scene = scene.id; el.setAttribute('aria-hidden', 'true');
    const box = cardBox(board, stage);
    const sheetW = Math.max(box.boardW, box.w + SHADOW_X), sheetH = Math.max(box.boardH, box.h + SHADOW_Y);
    el.style.left = box.boardLeft + 'px'; el.style.top = box.boardTop + 'px'; el.style.width = sheetW + 'px'; el.style.height = sheetH + 'px';
    const sheet = document.createElement('div'); sheet.className = 'cutaway-sheet';
    sheet.style.cssText = 'position:absolute;left:0;top:0;width:' + box.boardW + 'px;height:' + box.boardH + 'px;background:#fff;z-index:0;pointer-events:none';
    el.appendChild(sheet);
    const card = document.createElement('div'); card.className = 'cutaway-card';
    card.style.left = Math.max(0, (box.boardW - box.w) / 2) + 'px'; card.style.top = '0'; card.style.zIndex = '1';
    card.style.width = box.w + 'px'; card.style.height = box.h + 'px';
    const art = document.createElement('canvas'); art.className = 'cutaway-art';
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    art.width = Math.round((box.w - 2 * EDGE) * dpr); art.height = Math.round((box.h - 2 * EDGE) * dpr);
    card.appendChild(art); el.appendChild(card);
    stage.appendChild(el);
    document.documentElement.classList.add('cutaway-up');
    const ctx = art.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (scene.wrap) buildPath(card, scene, S);
    const t0 = performance.now(), last = data.steps.length - 1;
    let shown = -1, whole = false;
    const step = now => {
      if (!art.isConnected) return;
      const i = Math.min(last, Math.max(0, Math.floor((now - t0) / STEP)));
      if (i !== shown || !whole) { whole = drawStep(ctx, data, i); shown = i; }
      if (i < last || !whole) requestAnimationFrame(step);
    };
    step(t0);
    if (scene.wrap) setTimeout(() => { if (el.isConnected) el.classList.add('show-path'); }, WRAP_FADE);
  }
  api.prepare = function (S, prev, board) {
    if (!board || busyUntil > Date.now()) return;
    const scene = sceneFor(S, prev);
    // A follow-up walk flushed after a surprise is just a slide, not a new
    // cartoon. Starting a hold here would hide the piece for 2s with no copy.
    if (api.flushing && !scene) return;
    const ev = (root.PUSH_MOTION && PUSH_MOTION.events(S, prev)) || [];
    const pol = (root.SURPRISE && SURPRISE.policy) ? SURPRISE.policy(S, prev) : null;
    api.policy = pol;
    // Watchers play a kick on the board. The cartoon must not cover that slide,
    // and a hunter who has already left sight gets neither.
    const watcherKick = !!(pol && pol.ev && pol.ev.event === 'kick' && !pol.affected && !pol.actor);
    const useScene = scene && !watcherKick;
    if (!useScene && !ev.length) return;
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
    const cartoon = useScene && !reduced();
    const motionDelay = pol ? pol.motionDelay : (cartoon ? REVEAL : MS);
    const motionMs = pol ? pol.motionMs : 0;
    // A finished game does not add a reading pause on top of the cartoon.
    const ended = !!(S && S.phase === 'over');
    const readMs = (pol && pol.affected && !ended) ? (pol.readMs || 0) : 0;
    const total = motionDelay + motionMs + readMs;
    busyUntil = Date.now() + total;
    const token = ++serial;
    nextCard = cartoon ? { scene, S, delay: pol && pol.lookout ? ((root.SURPRISE && SURPRISE.LOOKOUT_MS) || 1000) : 0 } : null;
    setTimeout(() => { if (token === serial) reveal(); }, motionDelay);
    setTimeout(() => { if (token === serial) finish(token); }, total);
  };
  api.play = function (S, prev, board) {
    if (nextCard) {
      const job = nextCard; nextCard = null;
      const wait = job.delay || 0;
      if (wait) setTimeout(() => { if (document.getElementById('boardhold') || document.documentElement.classList.contains('cutaway-up')) showCard(job.scene, S, board); }, wait);
      else showCard(job.scene, S, board);
    }
    const hold = document.getElementById('boardhold'), leg = board && board.querySelector('.kick-leg');
    if (hold && leg) {
      const idx = [...board.children].indexOf(leg.closest('.cell'));
      const pc = hold.children[idx] && hold.children[idx].querySelector('.pc');
      if (pc && !pc.querySelector('.kick-leg')) pc.appendChild(leg.cloneNode(true));
    }
  };
  if (document.readyState === 'complete') setTimeout(preload, 1500); else window.addEventListener('load', () => setTimeout(preload, 1500));
})(typeof window === 'undefined' ? globalThis : window);
