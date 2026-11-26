// Which cartoon plays, and who is allowed to see it. A kick, stone, burst, or shove
// follows the view the server already sends. A catch cartoon plays on every phone;
// the slide still needs the square, and the cartoon object carries none.
process.env.PORT = '0'; process.env.BO_NOSTORE = '1'; process.env.BO_BOTMS = '900000';
const assert = require('assert'), S = require('./server'), C = require('./public/cutaways'), P = require('./public/push-motion'), { make } = require('./tests/hunter-fixtures');
const T = require('./three'), H = require('./hunt'), TT = require('./team'), B = require('./game');

assert.equal(C.seenWrap([[8, 3], [0, 3], [1, 3], [2, 3]], { cols: 9, rows: 7 }), true, 'a jump across the edge is a wrap');
assert.equal(C.seenWrap([[4, 3], [5, 3], [6, 3], [7, 3]], { cols: 9, rows: 7 }), false, 'a straight kick is not a wrap');
assert.equal(C.seenWrap([[8, 3], null, [0, 3]], { cols: 9, rows: 7 }), false, 'a hidden step is not a wrap this phone can see');
assert.equal(C.seenWrap([[4, 6], [4, 0], [4, 1]], { cols: 9, rows: 7 }), true, 'a vertical wrap counts');

function shot(f) { const o = {}; for (const r of f.roles) o[r] = f.view(r); return o; }
function ids(f, prev) { const o = {}; for (const r of f.roles) { const s = C.sceneFor(f.view(r), prev[r]); o[r] = s && s.id; } return o; }

// --- kicks: ostrich -> hyena has art; a wrap uses the wrap scene; other targets do not ---
for (const mode of ['3p', 'Hunters', '5p']) {
  const straight = make(S, mode), g = straight.g; g.turn = straight.blue;
  if (mode === '5p') { g.b.o1.pos = [3, 3]; g.b.o2.pos = [0, 0]; g.b.v1.pos = [8, 6]; g.b.v2.pos = [0, 6]; g.h.p = [4, 3]; g.h.kind = 'hyena'; }
  else if (mode === '3p') { g.ostrich = [3, 3]; g.vulture = [8, 6]; g.three.h = [4, 3]; g.three.pounce = false; }
  else { g.ostrich = [3, 3]; g.vulture = [8, 6]; g.hunt.hs.hyena.p = [4, 3]; g.hunt.hs.badger.p = [0, 6]; g.hunt.hs.hyena.pounce = false; }
  const before = shot(straight);
  const kicked = mode === '5p' ? TT.ostrichKick(g, 'o1', [4, 3]) : mode === '3p' ? T.ostrichKick3(g, [4, 3]) : H.ostrichKickH(g, [4, 3]);
  assert.ok(kicked, mode + ' straight kick');
  const got = ids(straight, before);
  const kicker = straight.blue, hyena = mode === 'Hunters' ? 'hyena' : 'hunter';
  assert.equal(got[kicker], 'kick', mode + ' kicker sees the kick cartoon');
  assert.equal(got[hyena], 'kick', mode + ' hyena sees the kick cartoon');
  for (const r of straight.roles) if (r !== kicker && r !== hyena) {
    const view = straight.view(r), sent = !!(view.kick && ((view.kick.trail && view.kick.trail.some(p => p && p[0] >= 0)) || (view.kick.to && view.kick.to[0] >= 0)));
    if (sent) assert.ok(got[r], mode + ' ' + r + ' sees a kick the server sent');
    else assert.equal(got[r], null, mode + ' ' + r + ' is not sent the kick');
  }
  assert.equal(C.sceneFor(straight.view(kicker), before[kicker]).by, 'ostrich');
  assert.equal(C.sceneFor(straight.view(kicker), before[kicker]).target, 'hyena');

  const wrap = make(S, mode), w = wrap.g; w.turn = wrap.blue;
  if (mode === '5p') { w.b.o1.pos = [7, 3]; w.b.o2.pos = [0, 6]; w.b.v1.pos = [0, 0]; w.b.v2.pos = [4, 6]; w.h.p = [8, 3]; w.h.kind = 'hyena'; }
  else if (mode === '3p') { w.ostrich = [7, 3]; w.vulture = [0, 6]; w.three.h = [8, 3]; w.three.pounce = false; }
  else { w.ostrich = [7, 3]; w.vulture = [0, 6]; w.hunt.hs.hyena.p = [8, 3]; w.hunt.hs.badger.p = [4, 6]; w.hunt.hs.hyena.pounce = false; }
  const wbefore = shot(wrap);
  const around = mode === '5p' ? TT.ostrichKick(w, 'o1', [8, 3]) : mode === '3p' ? T.ostrichKick3(w, [8, 3]) : H.ostrichKickH(w, [8, 3]);
  assert.ok(around, mode + ' wrap kick');
  const landing = mode === '5p' ? w.h.p : mode === '3p' ? w.three.h : w.hunt.hs.hyena.p;
  assert.equal(B.wrapDist(w.cfg, [8, 3], landing), 3, mode + ' full distance ' + landing);
  const wgot = ids(wrap, wbefore);
  const kickerScene = w.lastKick.wrap ? 'kick-wrap' : 'kick';
  assert.equal(wgot[wrap.blue], kickerScene, mode + ' kicker cartoon follows the real path');
  assert.equal(wgot[hyena], w.lastKick.wrap ? 'kick-wrap' : 'kick', mode + ' hyena cartoon has no path, only the wrap flag');
  for (const r of wrap.roles) if (r !== wrap.blue && r !== hyena) {
    const view = wrap.view(r), sent = !!(view.kick && ((view.kick.trail && view.kick.trail.some(p => p && p[0] >= 0)) || (view.kick.to && view.kick.to[0] >= 0)));
    if (sent) assert.ok(wgot[r], mode + ' ' + r + ' sees a kick the server sent');
    else assert.equal(wgot[r], null, mode + ' ' + r + ' is not sent the kick');
  }
  // a bird who can see the hyena leave, but not the far side, gets the plain kick picture
  const near = make(S, mode), n = near.g; n.turn = near.blue;
  if (mode === '5p') { n.b.o1.pos = [7, 3]; n.b.o2.pos = [0, 6]; n.b.v1.pos = [8, 5]; n.b.v2.pos = [0, 0]; n.h.p = [8, 3]; n.h.kind = 'hyena'; }
  else if (mode === '3p') { n.ostrich = [7, 3]; n.vulture = [8, 5]; n.three.h = [8, 3]; }
  else { n.ostrich = [7, 3]; n.vulture = [8, 5]; n.hunt.hs.hyena.p = [8, 3]; n.hunt.hs.badger.p = [0, 0]; }
  const nbefore = shot(near);
  assert.ok(mode === '5p' ? TT.ostrichKick(n, 'o1', [8, 3]) : mode === '3p' ? T.ostrichKick3(n, [8, 3]) : H.ostrichKickH(n, [8, 3]));
  const ngot = ids(near, nbefore);
  assert.equal(ngot[near.red], ngot[near.blue], mode + ' the vulture sees the same shove picture');
}

// ostrich kicks a badger, or a vulture. A wrap of those pairs still uses that pair's picture, not the hyena wrap.
{
  const f = make(S, '3p'), g = f.g; g.turn = 'blue'; g.ostrich = [3, 3]; g.vulture = [8, 6]; g.three.kind = 'badger'; g.three.h = [4, 3]; g.three.burrowed = false;
  const prev = shot(f); assert.ok(T.ostrichKick3(g, [4, 3]));
  const got = ids(f, prev);
  assert.equal(got.blue, 'kick-badger', 'kicker sees the badger kick');
  assert.equal(got.hunter, 'kick-badger', 'badger sees its own kick');
  assert.equal(got.red, 'kick-badger', 'a far vulture still sees the badger shove');
  const around = make(S, '3p'), ag = around.g; ag.turn = 'blue'; ag.ostrich = [7, 3]; ag.vulture = [0, 6]; ag.three.kind = 'badger'; ag.three.h = [8, 3]; ag.three.burrowed = false;
  const ap = shot(around); assert.ok(T.ostrichKick3(ag, [8, 3]));
  assert.equal(C.sceneFor(around.view('blue'), ap.blue).id, 'kick-badger', 'a wrapping badger kick uses the badger picture');
  assert.notEqual(C.sceneFor(around.view('blue'), ap.blue).id, 'kick-wrap');
  const v = make(S, '3p'), vg = v.g; vg.turn = 'blue'; vg.ostrich = [3, 3]; vg.vulture = [4, 3]; vg.three.h = [8, 6];
  const vp = shot(v); assert.ok(T.ostrichKick3(vg, [4, 3]));
  assert.equal(C.sceneFor(v.view('blue'), vp.blue).id, 'kick-vulture');
  assert.equal(C.sceneFor(v.view('red'), vp.red).id, 'kick-vulture', 'the vulture sees being kicked');
  assert.equal(C.sceneFor(v.view('hunter'), vp.hunter), null, 'a far hunter does not see a kick on the vulture');
}

// The cartoon record is the animals only. A phone that was not sent a square must not find one here.
function cartoonLeaks(scene) {
  const blob = JSON.stringify(scene);
  return /"at"|"to"|"trail":\[|burrow/.test(blob);
}
function assertEverySeatCartoon(f, prev, id) {
  for (const r of f.roles) {
    const now = f.view(r), scene = C.sceneFor(now, prev[r]), lc = now.h3.lastCatch;
    assert.equal(scene && scene.id, id, f.g.n ? id + ' ' + r : id + ' ' + r);
    assert.equal(scene.trail, null, r + ' cartoon has no path');
    assert.equal(cartoonLeaks(scene), false, r + ' cartoon names no square or burrow');
    const slide = P.events(now, prev[r]).some(e => e.key === lc.bird);
    const maySlide = now.role !== 'hunter' && !lc.ko && Array.isArray(lc.at) && Array.isArray(lc.to);
    assert.equal(slide, maySlide, r + ' slides only with both squares');
  }
}
// --- catches: the cartoon on every phone; the slide only where the square was sent ---
for (const mode of ['3p', 'Hunters', '5p']) {
  const f = make(S, mode), g = f.g;
  if (mode === '5p') { g.turn = 'hunter'; g.h.p = [3, 3]; g.h.pounce = false; g.h.kind = 'hyena'; g.b.o1.pos = [4, 3]; g.b.o2.pos = [0, 0]; g.b.v1.pos = [8, 6]; g.b.v2.pos = [0, 6]; }
  else if (mode === '3p') { g.turn = 'hunter'; g.three.h = [3, 3]; g.three.pounce = false; g.ostrich = [4, 3]; g.vulture = [8, 6]; }
  else { g.turn = 'hyena'; g.hunt.hs.hyena.p = [3, 3]; g.hunt.hs.hyena.pounce = false; g.hunt.hs.badger.p = [0, 6]; g.ostrich = [4, 3]; g.vulture = [8, 6]; }
  const prev = shot(f);
  const moved = mode === '5p' ? TT.hunterMove(g, [4, 3]) : mode === '3p' ? T.hunterMove(g, [4, 3]) : H.hunterMove(g, [4, 3]);
  assert.ok(moved, mode + ' catch');
  assertEverySeatCartoon(f, prev, 'catch');
  const hyena = mode === 'Hunters' ? 'hyena' : 'hunter';
  assert.ok(Array.isArray(f.view(f.blue).h3.lastCatch.at), mode + ' caught bird still receives the square');
  assert.ok(Array.isArray(f.view(hyena).h3.lastCatch.at), mode + ' catching hunter still receives the square');
  assert.equal(f.view(hyena).h3.lastCatch.to, null, mode + ' hunter is not told the landing');
  for (const r of f.roles) {
    const v = f.view(r);
    if (r !== f.blue && r !== hyena) assert.equal(v.h3.lastCatch.at, null, mode + ' ' + r + ' is not sent the catch square');
    if (v.role !== 'hunter' && !v.god) assert.equal(v.h3.burrowed, false, mode + ' ' + r + ' is not told a burrow');
  }

  const ko = make(S, mode), kg = ko.g;
  if (mode === '5p') { kg.b.o1.catches = 1; kg.turn = 'hunter'; kg.h.p = [3, 3]; kg.h.pounce = false; kg.h.kind = 'hyena'; kg.b.o1.pos = [4, 3]; kg.b.o2.pos = [0, 0]; kg.b.v1.pos = [8, 6]; kg.b.v2.pos = [0, 6]; }
  else if (mode === '3p') { kg.three.birds.blue.catches = 1; kg.turn = 'hunter'; kg.three.h = [3, 3]; kg.three.pounce = false; kg.ostrich = [4, 3]; kg.vulture = [8, 6]; }
  else { kg.hunt.birds.blue.catches = 1; kg.turn = 'hyena'; kg.hunt.hs.hyena.p = [3, 3]; kg.hunt.hs.hyena.pounce = false; kg.hunt.hs.badger.p = [0, 6]; kg.ostrich = [4, 3]; kg.vulture = [8, 6]; }
  const kp = shot(ko);
  assert.ok(mode === '5p' ? TT.hunterMove(kg, [4, 3]) : mode === '3p' ? T.hunterMove(kg, [4, 3]) : H.hunterMove(kg, [4, 3]), mode + ' knockout');
  assertEverySeatCartoon(ko, kp, 'knockout');
}

// badger catches, and a hyena catching a vulture. Every phone gets the picture. Squares stay filtered.
{
  const f = make(S, '3p'), g = f.g; g.three.kind = 'badger'; g.turn = 'hunter'; g.three.h = [3, 3]; g.three.burrowed = false; g.three.pounce = false; g.ostrich = [4, 3]; g.vulture = [8, 6];
  const prev = shot(f); assert.ok(T.hunterMove(g, [4, 3]));
  assertEverySeatCartoon(f, prev, 'catch-badger-ostrich');
  assert.equal(f.view('red').h3.lastCatch.at, null, 'far vulture is not sent the catch square');
  assert.equal(f.view('red').h3.hunter, null, 'far vulture still cannot see the badger');
  const hunters = make(S, 'Hunters'), hg = hunters.g; hg.turn = 'badger'; hg.hunt.hs.badger.p = [3, 3]; hg.hunt.hs.badger.burrowed = false; hg.hunt.hs.badger.pounce = false; hg.hunt.hs.hyena.p = [8, 6]; hg.ostrich = [4, 3]; hg.vulture = [0, 0];
  const hp = shot(hunters); assert.ok(H.hunterMove(hg, [4, 3]));
  assertEverySeatCartoon(hunters, hp, 'catch-badger-ostrich');
  assert.equal(hunters.view('hyena').h3.lastCatch.at, null, 'the other hunter is not sent the catch square');
  assert.equal(hunters.view('hyena').h3.lastCatch.to, null, 'the other hunter is not sent the landing');
  assert.equal(hunters.view('red').h3.lastCatch.at, null, 'far vulture is not sent that catch square');
  const hv = make(S, 'Hunters'), vg = hv.g; vg.turn = 'hyena'; vg.hunt.hs.hyena.p = [3, 3]; vg.hunt.hs.hyena.pounce = false; vg.hunt.hs.badger.p = [0, 6]; vg.vulture = [4, 3]; vg.ostrich = [8, 6];
  const vp = shot(hv); assert.ok(H.hunterMove(vg, [4, 3]));
  assertEverySeatCartoon(hv, vp, 'catch-hyena-vulture');
  assert.equal(hv.view('blue').h3.lastCatch.at, null, 'far ostrich is not sent the catch square');
  assert.equal(hv.view('badger').h3.lastCatch.at, null, 'far badger is not sent that catch square');
  assert.equal(hv.view('badger').h3.burrowed, false, 'the other hunter is not shown as a burrow on this phone');
  // last heart: the knockout picture replaces the catch picture, still on every phone
  const ko = make(S, 'Hunters'), kg = ko.g; kg.hunt.birds.red.catches = 1; kg.turn = 'badger'; kg.hunt.hs.badger.p = [3, 3]; kg.hunt.hs.badger.burrowed = false; kg.hunt.hs.badger.pounce = false; kg.hunt.hs.hyena.p = [8, 0]; kg.vulture = [4, 3]; kg.ostrich = [0, 6];
  const kp = shot(ko); assert.ok(H.hunterMove(kg, [4, 3]));
  assertEverySeatCartoon(ko, kp, 'knockout-badger-vulture');
  assert.equal(ko.view('blue').h3.lastCatch.at, null);
  assert.equal(ko.view('hyena').h3.lastCatch.at, null);
  const ko2 = make(S, '3p'), k2 = ko2.g; k2.three.kind = 'badger'; k2.three.birds.blue.catches = 1; k2.turn = 'hunter'; k2.three.h = [3, 3]; k2.three.burrowed = false; k2.three.pounce = false; k2.ostrich = [4, 3]; k2.vulture = [8, 6];
  const k2p = shot(ko2); assert.ok(T.hunterMove(k2, [4, 3]));
  assertEverySeatCartoon(ko2, k2p, 'knockout-badger-ostrich');
  assert.equal(ko2.view('red').h3.lastCatch.at, null);
  const ko3 = make(S, 'Hunters'), k3 = ko3.g; k3.hunt.birds.red.catches = 1; k3.turn = 'hyena'; k3.hunt.hs.hyena.p = [3, 3]; k3.hunt.hs.hyena.pounce = false; k3.hunt.hs.badger.p = [8, 6]; k3.vulture = [4, 3]; k3.ostrich = [0, 0];
  const k3p = shot(ko3); assert.ok(H.hunterMove(k3, [4, 3]));
  assertEverySeatCartoon(ko3, k3p, 'knockout-hyena-vulture');
  assert.equal(ko3.view('blue').h3.lastCatch.at, null);
  assert.equal(ko3.view('badger').h3.lastCatch.at, null);
}
// 5 players: a buried badger's catch. Every seat gets the same animals-only cartoon. Far seats still lack the square, the landing path, and the burrow.
{
  const f = make(S, '5p'), g = f.g;
  g.h.kind = 'badger'; g.h.burrowed = true; g.h.p = [3, 3]; g.turn = 'hunter'; g.h.pounce = false;
  g.b.o1.pos = [4, 3]; g.b.o2.pos = [0, 0]; g.b.v1.pos = [8, 6]; g.b.v2.pos = [0, 6];
  const prev = shot(f); assert.ok(TT.hunterMove(g, [4, 3])); assert.equal(g.lastCatch.ambush, true);
  assertEverySeatCartoon(f, prev, 'catch-badger-ostrich');
  for (const r of ['o2', 'v1', 'v2']) {
    const v = f.view(r);
    assert.equal(v.h3.lastCatch.at, null, r + ' ambush catch square stays hidden');
    assert.equal(v.h3.hunter, null, r + ' still cannot see the badger');
    assert.equal(v.h3.burrowed, false, r + ' is not told the burrow');
    assert.equal(P.events(v, prev[r]).some(e => e.key === 'o1'), false, r + ' does not slide the scramble');
  }
  assert.ok(Array.isArray(f.view('o1').h3.lastCatch.at) && Array.isArray(f.view('o1').h3.lastCatch.to), 'the caught ostrich still has both squares');
  assert.equal(f.view('hunter').h3.lastCatch.to, null, 'the badger is not told where the ostrich landed');
}

// --- stone: vulture -> hyena only, and only for a phone that can see the hyena move ---
for (const mode of ['3p', 'Hunters', '5p']) {
  const f = make(S, mode), g = f.g; g.turn = f.red;
  if (mode === '5p') { g.b.v1.pos = [3, 3]; g.b.v2.pos = [0, 0]; g.b.o1.pos = [8, 6]; g.b.o2.pos = [0, 6]; g.h.p = [4, 3]; g.h.kind = 'hyena'; g.b.v1.stones = 1; }
  else if (mode === '3p') { g.vulture = [3, 3]; g.ostrich = [8, 6]; g.three.h = [4, 3]; g.stones = 1; }
  else { g.vulture = [3, 3]; g.ostrich = [8, 6]; g.hunt.hs.hyena.p = [4, 3]; g.hunt.hs.badger.p = [0, 0]; g.stones = 1; }
  const prev = shot(f);
  const thrown = mode === '5p' ? TT.vultureThrow(g, 'v1', [4, 3]) : mode === '3p' ? T.vultureThrow3(g, [4, 3]) : H.vultureThrowH(g, [4, 3]);
  assert.ok(thrown, mode + ' stone');
  const got = ids(f, prev), hyena = mode === 'Hunters' ? 'hyena' : 'hunter';
  assert.equal(got[f.red], 'stone', mode + ' vulture sees the stone cartoon');
  assert.equal(got[hyena], 'stone', mode + ' hyena sees the stone cartoon');
  for (const r of f.roles) if (r !== f.red && r !== hyena) {
    const view = f.view(r), trails = (view.stoneNote && view.stoneNote.trails) || [];
    const sent = trails.some(t => t.card || (t.points && t.points.some(p => p && p[0] >= 0)));
    if (sent) assert.ok(got[r], mode + ' ' + r + ' sees a stone the server sent');
    else assert.equal(got[r], null, mode + ' ' + r + ' is not sent the stone');
  }
  const miss = make(S, mode), mg = miss.g; mg.turn = miss.red;
  if (mode === '5p') { mg.b.v1.pos = [3, 3]; mg.h.kind = 'badger'; mg.h.p = [4, 3]; mg.b.v1.stones = 1; mg.b.o1.pos = [8, 0]; mg.b.o2.pos = [0, 6]; mg.b.v2.pos = [0, 0]; }
  else if (mode === '3p') { mg.vulture = [3, 3]; mg.three.kind = 'badger'; mg.three.h = [4, 3]; mg.three.burrowed = false; mg.ostrich = [8, 0]; mg.stones = 1; }
  else { mg.vulture = [3, 3]; mg.hunt.hs.badger.p = [4, 3]; mg.hunt.hs.badger.burrowed = false; mg.hunt.hs.hyena.p = [0, 0]; mg.ostrich = [8, 0]; mg.stones = 1; }
  const mp = shot(miss);
  assert.ok(mode === '5p' ? TT.vultureThrow(mg, 'v1', [4, 3]) : mode === '3p' ? T.vultureThrow3(mg, [4, 3]) : H.vultureThrowH(mg, [4, 3]), mode + ' stone on a badger');
  const mgot = ids(miss, mp), badger = mode === 'Hunters' ? 'badger' : 'hunter';
  assert.equal(mgot[miss.red], 'stone-badger', mode + ' vulture sees the badger stone');
  assert.equal(mgot[badger], 'stone-badger', mode + ' badger sees the stone');
  for (const r of miss.roles) if (r !== miss.red && r !== badger) {
    const view = miss.view(r), trails = (view.stoneNote && view.stoneNote.trails) || [];
    const sent = trails.some(t => t.card || (t.points && t.points.some(p => p && p[0] >= 0)));
    if (sent) assert.ok(mgot[r], mode + ' ' + r + ' sees a badger stone the server sent');
    else assert.equal(mgot[r], null, mode + ' ' + r + ' is not sent the badger stone');
  }
}

// --- burst: badger shoves the hyena, only for phones that can see the hyena ---
{
  const f = make(S, 'Hunters'), g = f.g;
  g.turn = 'badger'; g.hunt.hs.badger.p = [4, 3]; g.hunt.hs.badger.burrowed = true; g.hunt.hs.badger.pounce = false;
  g.hunt.hs.hyena.p = [4, 3]; g.hunt.hs.hyena.came = { to: [4, 3], dir: [1, 0] };
  g.ostrich = [0, 0]; g.vulture = [0, 6];
  const prev = shot(f); assert.ok(H.hunterBurst(g), 'burst');
  const got = ids(f, prev);
  assert.equal(got.badger, 'burst', 'badger sees the burst cartoon');
  assert.equal(got.hyena, 'burst', 'hyena sees the burst cartoon');
  assert.equal(got.blue, 'burst', 'a far ostrich still sees the burst picture');
  assert.equal(got.red, 'burst', 'a far vulture still sees the burst picture');
  const near = make(S, 'Hunters'), ng = near.g;
  ng.turn = 'badger'; ng.hunt.hs.badger.p = [4, 3]; ng.hunt.hs.badger.burrowed = true; ng.hunt.hs.badger.pounce = false;
  ng.hunt.hs.hyena.p = [4, 3]; ng.hunt.hs.hyena.came = { to: [4, 3], dir: [1, 0] };
  ng.ostrich = [4, 5]; ng.vulture = [0, 0];
  const np = shot(near); assert.ok(H.hunterBurst(ng));
  assert.equal(C.sceneFor(near.view('blue'), np.blue).id, 'burst', 'an ostrich who can see the hyena sees the burst');
  assert.equal(C.sceneFor(near.view('red'), np.red).id, 'burst', 'a far vulture still sees the burst picture');
}

// classic and 2 vs 2: the ostrich kicking a vulture uses that picture. A wrap still uses it, not the hyena wrap.
{
  const g = B.newGame(); for (const p of [[2, 1], [6, 1], [2, 5]]) assert.ok(B.placeEgg(g, p)); assert.ok(B.placeOstrich(g, [3, 3]));
  g.turn = 'blue'; g.vulture = [4, 3]; g.ostrich = [3, 3];
  const room = { code: 'CLSC', g, players: { blue: {}, red: {} }, ai: null, pass: false, settings: {} };
  const prev = { blue: S.view(room, 'blue'), red: S.view(room, 'red') };
  assert.ok(B.ostrichKick(g, [4, 3]));
  assert.equal(C.sceneFor(S.view(room, 'blue'), prev.blue).id, 'kick-vulture', 'classic kicker');
  assert.equal(C.sceneFor(S.view(room, 'red'), prev.red).id, 'kick-vulture', 'classic vulture');
  const w = B.newGame(); for (const p of [[2, 1], [6, 1], [2, 5]]) assert.ok(B.placeEgg(w, p)); assert.ok(B.placeOstrich(w, [7, 3]));
  w.turn = 'blue'; w.ostrich = [7, 3]; w.vulture = [8, 3];
  const wr = { code: 'WRAP', g: w, players: { blue: {}, red: {} }, ai: null, pass: false, settings: {} };
  const wp = { blue: S.view(wr, 'blue'), red: S.view(wr, 'red') };
  assert.ok(B.ostrichKick(w, [8, 3]));
  assert.equal(C.sceneFor(S.view(wr, 'blue'), wp.blue).id, 'kick-vulture', 'a wrapping kick on the vulture stays the vulture picture');
  const t = S.createT({ team: 4, role: 'o1', bots: ['v1', 'v2', 'o2'] }, null).room; const tg = t.g;
  tg.phase = 'play'; tg.turn = 'o1'; tg.b.o1.pos = [3, 3]; tg.b.o2.pos = [0, 0]; tg.b.v1.pos = [4, 3]; tg.b.v2.pos = [8, 6];
  const tp = {}; for (const r of ['o1', 'o2', 'v1', 'v2']) tp[r] = S.viewT(t, r);
  assert.ok(TT.ostrichKick(tg, 'o1', [4, 3]));
  for (const r of ['o1', 'v1']) assert.equal(C.sceneFor(S.viewT(t, r), tp[r]).id, 'kick-vulture', '2 vs 2 ' + r);
  assert.equal(C.sceneFor(S.viewT(t, 'v2'), tp.v2).id, 'kick-vulture', 'birds see the kicked vulture');
}

// hunters meeting: the mover's shove picture, only for phones that can see it
{
  const push = (by) => {
    const f = make(S, 'Hunters'), g = f.g;
    const other = by === 'badger' ? 'hyena' : 'badger';
    g.turn = by; g.hunt.hs[by].p = [3, 3]; g.hunt.hs[by].burrowed = false; g.hunt.hs[by].pounce = false;
    g.hunt.hs[other].p = [4, 3]; g.hunt.hs[other].burrowed = false;
    g.ostrich = [0, 0]; g.vulture = [0, 6];
    const prev = shot(f);
    assert.ok(H.hunterMove(g, [4, 3]), by + ' shove');
    return { f, prev, got: ids(f, prev) };
  };
  const badger = push('badger');
  assert.equal(badger.got.badger, 'shove-badger-hyena');
  assert.equal(badger.got.hyena, 'shove-badger-hyena');
  assert.equal(badger.got.blue, 'shove-badger-hyena', 'a far ostrich sees the shove');
  assert.equal(badger.got.red, 'shove-badger-hyena', 'a far vulture sees the shove');
  const hyena = push('hyena');
  assert.equal(hyena.got.hyena, 'shove-hyena-badger');
  assert.equal(hyena.got.badger, 'shove-hyena-badger');
  assert.equal(hyena.got.blue, 'shove-hyena-badger');
  assert.equal(hyena.got.red, 'shove-hyena-badger');
}

// the same view twice is not a second scene
{
  const f = make(S, '3p'), g = f.g; g.turn = 'blue'; g.ostrich = [3, 3]; g.vulture = [8, 6]; g.three.h = [4, 3];
  const prev = shot(f); assert.ok(T.ostrichKick3(g, [4, 3]));
  const mid = shot(f); assert.equal(C.sceneFor(mid.blue, prev.blue).id, 'kick');
  assert.equal(C.sceneFor(f.view('blue'), mid.blue), null, 'a repeat of the same kick does not play again');
}

// --- egg smash: every player is told an egg was smashed, so every player sees the egg-smash cartoon; a miss shows none ---
for (const mode of ['3p', 'Hunters', '5p']) {
  const f = make(S, mode), g = f.g;
  if (mode === '5p') { g.turn = 'v1'; g.b.v1.pos = [2, 2]; g.h.p = [8, 6]; }
  else { g.turn = 'red'; g.vulture = [2, 2]; g.stones = 1; if (mode === '3p') g.three.h = [8, 6]; else { g.hunt.hs.hyena.p = [8, 6]; g.hunt.hs.badger.p = [8, 0]; } }
  const before = shot(f);
  const ok = mode === '5p' ? TT.vultureThrow(g, 'v1', [2, 1]) : mode === '3p' ? T.vultureThrow3(g, [2, 1]) : H.vultureThrowH(g, [2, 1]);
  assert.ok(ok, mode + ' throw'); assert.equal(g.lastAction.result, 'hit', mode + ' the stone hit the egg');
  const got = ids(f, before);
  for (const r of f.roles) assert.equal(got[r], 'egg-smash', mode + ' ' + r + ' sees the egg smash');
  const mid = shot(f);
  for (const r of f.roles) assert.equal(C.sceneFor(f.view(r), mid[r]), null, mode + ' the same smash does not play twice');
  const m = make(S, mode), mg = m.g;
  if (mode === '5p') { mg.turn = 'v1'; mg.b.v1.pos = [3, 3]; mg.h.p = [8, 6]; } else { mg.turn = 'red'; mg.vulture = [3, 3]; mg.stones = 1; if (mode === '3p') mg.three.h = [8, 6]; else { mg.hunt.hs.hyena.p = [8, 6]; mg.hunt.hs.badger.p = [8, 0]; } }
  const mb = shot(m);
  assert.ok(mode === '5p' ? TT.vultureThrow(mg, 'v1', [4, 4]) : mode === '3p' ? T.vultureThrow3(mg, [4, 4]) : H.vultureThrowH(mg, [4, 4]));
  for (const r of m.roles) assert.equal(C.sceneFor(m.view(r), mb[r]), null, mode + ' a miss has no egg-smash cartoon');
}
{ // the two-player game too
  const room = { code: 'EGG2', g: B.newGame(), players: {} };
  {
    const g = room.g;
    for (const p of [[2, 1], [6, 1], [2, 5]]) B.placeEgg(g, p);
    if (g.phase === 'setupOstrich') B.placeOstrich(g, [6, 5]);
    g.phase = 'play'; g.turn = 'red'; g.vulture = [2, 2]; g.stones = 1;
    const vb = S.view(room, 'blue'), vr = S.view(room, 'red');
    assert.ok(B.vultureThrow(g, [2, 1])); assert.equal(g.lastAction.result, 'hit');
    assert.equal(C.sceneFor(S.view(room, 'blue'), vb).id, 'egg-smash', '2-player ostrich sees the egg smash');
    assert.equal(C.sceneFor(S.view(room, 'red'), vr).id, 'egg-smash', '2-player vulture sees the egg smash');
  }
}

S.close();
// every scene in the table has its drawings: steps of 50 ms, each drawing a file in public/art/cutaways, inside the 336 x 412 card
{
  const fs = require('fs'), path = require('path'), ART = require('./public/cutaway-scenes');
  assert.equal(ART.w, 336); assert.equal(ART.h, 412);
  for (const name in ART.sprites) assert.ok(fs.existsSync(path.join(__dirname, 'public', ART.sprites[name])), 'drawing file for ' + name);
  for (const id of C.TABLE.map(r => r.id)) {
    const sc = ART.scenes[id]; assert.ok(sc, 'drawings for ' + id);
    // the stone kick-back cartoons run longer (Brian, 2026-11-25: a longer throw), within the 2 s the board is held (testbouncecartoon.js)
    if (/^bounce-/.test(id)) assert.ok(sc.steps.length >= 30 && sc.steps.length <= 40, id + ' step count');
    else assert.equal(sc.steps.length, id === 'kick-wrap' ? 14 : 30, id + ' step count');
    for (const st of sc.steps) for (const l of st) {
      assert.ok(sc.sprites[l[0]] && ART.sprites[sc.sprites[l[0]]], id + ' uses a known drawing');
      assert.ok(l[3] > 0 && l[4] > 0, id + ' layer has a size');
    }
  }
}

console.log('PASS cutaway scenes: mapping and who may see them, including a wrap and the egg smash, and every scene has its drawings');
process.exit(0);
