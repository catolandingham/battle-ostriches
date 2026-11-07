// Pre-game lobby: joined humans set the size, setup is inferred, bots fill open roles at Start.
// Does not touch combat, dig odds, or badger speed. Game objects are built by server.js from a plan.
const SETUPS = {
  '2': { seats: ['blue', 'red'], label: 'Ostrich vs Vulture' },
  '3': { seats: ['blue', 'red', 'hunter'], label: 'Hunter' },
  '4': { seats: ['o1', 'v1', 'o2', 'v2'], label: '2 vs 2' },
  '4h': { seats: ['blue', 'red', 'hyena', 'badger'], label: 'Hunters' },
  '5': { seats: ['o1', 'v1', 'o2', 'v2', 'hunter'], label: '2 vs 2 + hunter' },
};
const META = {
  blue: { name: 'Ostrich', sub: 'hide eggs' },
  red: { name: 'Vulture', sub: 'hunt eggs' },
  hunter: { name: 'Hunter', sub: 'Hyena or Honey Badger' },
  o1: { name: 'Ostrich 1', sub: 'team ostrich' },
  o2: { name: 'Ostrich 2', sub: 'team ostrich' },
  v1: { name: 'Vulture 1', sub: 'team vulture' },
  v2: { name: 'Vulture 2', sub: 'team vulture' },
  hyena: { name: 'Hyena', sub: 'Pounce · 2 catches' },
  badger: { name: 'Honey Badger', sub: 'Burrow · 2 catches' },
};
const PREFER = {
  blue: ['blue', 'o1', 'o2'], o1: ['o1', 'blue', 'o2'], o2: ['o2', 'blue', 'o1'],
  red: ['red', 'v1', 'v2'], v1: ['v1', 'red', 'v2'], v2: ['v2', 'red', 'v1'],
  hyena: ['hyena', 'hunter'], badger: ['badger', 'hunter'],
};
function prefer(role, kind) {
  if (role === 'hunter') return kind === 'badger' ? ['hunter', 'badger', 'hyena'] : ['hunter', 'hyena', 'badger'];
  return PREFER[role] || [];
}
// Four players: no separate setup step. Nobody on Hyena or Honey Badger means 2 vs 2.
// Anyone on Hyena or Honey Badger means Hunters. Empty seats fill in seat order at Start
// (Ostrich 1, Vulture 1, Ostrich 2, Vulture 2, or Ostrich, Vulture, Hyena, Honey Badger).
// A computer hunter in a 3- or 5-player game is a Hyena unless the host picked Honey Badger.
const ANIMAL = {
  ostrich: { name: 'Ostrich', sub: 'hide eggs', seats4: ['o1', 'o2'], seats4h: ['blue'] },
  vulture: { name: 'Vulture', sub: 'hunt eggs', seats4: ['v1', 'v2'], seats4h: ['red'] },
  hyena: { name: 'Hyena', sub: 'Pounce · 2 catches', seats4: [], seats4h: ['hyena'] },
  badger: { name: 'Honey Badger', sub: 'Burrow · 2 catches', seats4: [], seats4h: ['badger'] },
};
function animalOf(h) {
  if (!h) return null;
  if (h.role === 'hyena' || h.role === 'badger') return h.role;
  if (h.role === 'hunter') return h.kind === 'badger' ? 'badger' : (h.kind === 'hyena' ? 'hyena' : (h.animal === 'badger' || h.animal === 'hyena' ? h.animal : null));
  if (h.role === 'blue' || h.role === 'o1' || h.role === 'o2') return 'ostrich';
  if (h.role === 'red' || h.role === 'v1' || h.role === 'v2') return 'vulture';
  if (h.animal === 'ostrich' || h.animal === 'vulture' || h.animal === 'hyena' || h.animal === 'badger') return h.animal;
  return null;
}
function shownAnimal(h) {
  const a = animalOf(h);
  return a === 'ostrich' ? 'Ostrich' : a === 'vulture' ? 'Vulture' : a === 'hyena' ? 'Hyena' : a === 'badger' ? 'Honey Badger' : 'Choosing';
}
function countAnimals(humans) {
  const c = { ostrich: [], vulture: [], hyena: [], badger: [] };
  for (const h of humans || []) { const a = animalOf(h); if (a && c[a]) c[a].push(h); }
  return c;
}
function missingBirds(c) {
  const m = [];
  if (!c.ostrich.length) m.push('ostrich');
  if (!c.vulture.length) m.push('vulture');
  return m;
}
function birdComputerHint(missing, add) {
  if (!missing.length || add < 1) return 'Add a computer for the open bird.';
  const names = missing.length === 2 ? 'ostrich and the vulture' : missing[0];
  return 'Add ' + add + ' computer' + (add === 1 ? '' : 's') + ' for the ' + names + '.';
}
function fourMode(humans) {
  const counts = { ostrich: 0, vulture: 0, hyena: 0, badger: 0 };
  for (const h of humans || []) { const a = animalOf(h); if (a) counts[a]++; }
  const hunters = counts.hyena + counts.badger > 0;
  if (hunters) {
    if (counts.hyena > 1 || counts.badger > 1) return { ok: false, setup: '4h', counts, hint: 'Only one Hyena and one Honey Badger. Switch the extra player.' };
    if (counts.ostrich > 1) return { ok: false, setup: '4h', counts, hint: 'Hunters has one ostrich. Switch the extra player, or leave Hyena and Honey Badger to play 2 vs 2.' };
    if (counts.vulture > 1) return { ok: false, setup: '4h', counts, hint: 'Hunters has one vulture. Switch the extra player, or leave Hyena and Honey Badger to play 2 vs 2.' };
    return { ok: true, setup: '4h', counts, hint: 'Hunters' };
  }
  if (counts.ostrich > 2) return { ok: false, setup: '4', counts, hint: '2 vs 2 has two ostriches. Switch one to Vulture, or pick Hyena or Honey Badger for Hunters.' };
  if (counts.vulture > 2) return { ok: false, setup: '4', counts, hint: '2 vs 2 has two vultures. Switch one to Ostrich, or pick Hyena or Honey Badger for Hunters.' };
  return { ok: true, setup: '4', counts, hint: '2 vs 2' };
}
function infer(total, humans) {
  if (total < 2) return { ok: false, reason: 'need' };
  if (total === 2) return { ok: true, setup: '2' };
  if (total === 3) return { ok: true, setup: '3' };
  if (total === 4) {
    const m = fourMode(humans || []);
    return m.ok ? { ok: true, setup: m.setup, hint: m.hint } : { ok: false, reason: 'mix', setup: m.setup, hint: m.hint };
  }
  if (total === 5) return { ok: true, setup: '5' };
  return { ok: false, reason: 'unsupported' };
}
function maxBots(room) {
  const n = room.humans.length;
  if (n > 5) return 0;
  return room.solo ? Math.min(4, 5 - n) : 5 - n;
}
function clampBots(room) {
  if (room.humans.length > 5) { room.botsWanted = 0; return; }
  const max = maxBots(room);
  if (room.solo) room.botsWanted = Math.max(1, Math.min(max, room.botsWanted || 1));
  else room.botsWanted = Math.max(0, Math.min(max, room.botsWanted || 0));
}
// How many bodies the next game would have, and which setup that implies.
function effective(room) {
  const nH = room.humans.length;
  if (nH > 5) {
    if (room.recovery === 'play5') return { humans: room.humans.slice(0, 5), bench: room.humans.slice(5), bots: 0, total: 5, ...infer(5) };
    return { humans: room.humans, bench: [], bots: 0, total: nH, ok: false, reason: 'unsupported' };
  }
  let bots = room.botsWanted | 0;
  const max = maxBots(room);
  bots = room.solo ? Math.max(1, Math.min(max, bots || 1)) : Math.max(0, Math.min(max, bots));
  const total = nH + bots, inf = infer(total, room.humans);
  const counted = countAnimals(room.humans);
  const twoHunters = counted.hyena.length > 0 && counted.badger.length > 0;
  if (twoHunters && total < 4) {
    const add = 4 - total;
    return { humans: room.humans, bench: [], bots, total, ok: false, reason: 'need', preview: '4h',
      hint: birdComputerHint(missingBirds(counted), add) };
  }
  if ((counted.hyena.length || counted.badger.length) && !twoHunters && total < 3) {
    const missing = missingBirds(counted);
    const open = room.humans.filter(h => !animalOf(h)).length;
    const add = Math.max(0, missing.length - open);
    const hint = open && missing.length > 1
      ? 'Choose Ostrich or Vulture, or add computers for the birds.'
      : birdComputerHint(missing, add || (3 - total));
    return { humans: room.humans, bench: [], bots, total, ok: false, reason: 'need', preview: '3', hint };
  }
  if ((counted.hyena.length && counted.badger.length) && total === 5) {
    return { humans: room.humans, bench: [], bots, total, ok: false, reason: 'mix', preview: '5',
      hint: 'Five players have one hunter. One player keeps Hyena or Honey Badger.' };
  }
  if (!inf.ok && inf.reason === 'need' && !room.solo) inf.preview = '2';
  return { humans: room.humans, bench: [], bots, total, ...inf };
}
function seatsNow(room) {
  const p = effective(room), id = p.ok ? p.setup : (p.reason === 'mix' ? p.setup : p.preview);
  return id ? SETUPS[id].seats.slice() : [];
}
function seatOptions(setup, animal) {
  const spec = ANIMAL[animal];
  if (!spec) return [];
  if (setup === '4') return spec.seats4.slice();
  if (setup === '4h') return spec.seats4h.slice();
  return [];
}
// Place claimed animals on concrete seats. People who do not fit keep their animal and lose the seat.
function placeClaimed(humans, setup) {
  const used = {};
  if (setup !== '4' && setup !== '4h') return used;
  for (const h of humans) {
    const options = seatOptions(setup, animalOf(h));
    const seat = options.find(s => !used[s]);
    if (seat) {
      used[seat] = h; h.role = seat;
      h.animal = animalOf(h);
      h.kind = h.animal === 'hyena' || h.animal === 'badger' ? h.animal : null;
    } else if (animalOf(h)) h.role = null;
  }
  return used;
}
function isHost(room, hid) {
  const h = (room.humans || []).find(x => x.id === hid);
  return !!(h && h.host);
}
// Keep a claimed animal when the setup changes. Concrete seats are reassigned to match.
function reconcile(room) {
  const p = effective(room);
  const setup = p.ok ? p.setup : (p.reason === 'mix' ? p.setup : p.preview);
  const bench = new Set((p.bench || []).map(h => h.id));
  for (const h of room.humans) if (!h.animal) h.animal = animalOf(h);
  if (setup === '4' || setup === '4h') {
    for (const h of room.humans) if (bench.has(h.id)) { h.role = null; h.animal = null; h.kind = null; }
    placeClaimed(room.humans.filter(h => !bench.has(h.id)), setup);
    return;
  }
  const seats = setup ? SETUPS[setup].seats.slice() : [];
  if (!seats.length) return;
  const used = new Set();
  for (const h of room.humans) {
    if (bench.has(h.id)) { h.role = null; h.animal = null; h.kind = null; continue; }
    let role = h.role && seats.includes(h.role) && !used.has(h.role) ? h.role : null;
    if (!role && (h.role || h.animal)) role = prefer(h.role || (h.animal === 'hyena' || h.animal === 'badger' ? 'hunter' : h.animal === 'ostrich' ? 'blue' : h.animal === 'vulture' ? 'red' : null), h.kind).find(s => seats.includes(s) && !used.has(s)) || null;
    if (!role) {
      const kept = animalOf(h);
      if (kept === 'hyena' || kept === 'badger') { h.role = null; h.kind = kept; h.animal = kept; continue; }
      h.role = null; h.kind = null; h.animal = null; continue;
    }
    used.add(role); h.role = role;
    if (role === 'hyena' || role === 'badger') h.kind = role;
    else if (role !== 'hunter') h.kind = null;
    else if (h.kind !== 'hyena' && h.kind !== 'badger') h.kind = null;
    h.animal = animalOf(h);
  }
}
function claim(room, hid, role, kind) {
  const me = room.humans.find(h => h.id === hid);
  if (!me) return { error: 'You are not in this room.' };
  const p = effective(room);
  if ((p.bench || []).some(h => h.id === hid)) return { error: 'This game is full. You will join when there is room.' };
  const animal = role === 'ostrich' || role === 'vulture' || role === 'hyena' || role === 'badger' ? role
    : role === 'blue' || role === 'o1' || role === 'o2' ? 'ostrich'
    : role === 'red' || role === 'v1' || role === 'v2' ? 'vulture' : null;
  if (role === 'hyena' || role === 'badger') {
    const same = room.humans.find(h => h !== me && animalOf(h) === role);
    if (same) return { error: 'Taken by ' + same.name + '. Choose another bird or hunter.' };
    const otherHunter = room.humans.find(h => h !== me && (animalOf(h) === 'hyena' || animalOf(h) === 'badger'));
    const bodies = room.humans.length + (room.botsWanted | 0);
    if (otherHunter && bodies !== 2 && bodies !== 4) return { error: 'Taken by ' + otherHunter.name + '. Choose another bird or hunter.' };
    me.animal = role;
    me.kind = role;
    me.role = null;
    reconcile(room);
    return { ok: true };
  }
  const four = p.total === 4 || p.reason === 'mix';
  if (four && animal && role !== 'hunter') {
    me.animal = animal;
    me.kind = animal === 'hyena' || animal === 'badger' ? animal : null;
    me.role = null;
    reconcile(room);
    const mode = fourMode(room.humans.filter(h => !(p.bench || []).some(b => b.id === h.id)));
    if (!mode.ok && me.role == null && animalOf(me) === animal) return { ok: true, hint: mode.hint };
    return { ok: true };
  }
  const seats = seatsNow(room);
  if (!seats.length) {
    return { error: p.reason === 'unsupported' ? 'Choose how to continue before picking roles.' : 'Waiting for enough players.' };
  }
  if (!seats.includes(role)) return { error: 'That role is not in this setup.' };
  const other = room.humans.find(h => h !== me && h.role === role);
  if (other) return { error: 'Taken by ' + other.name + '. Choose another bird or hunter.' };
  if (kind && kind !== 'hyena' && kind !== 'badger') kind = null;
  me.role = role;
  if (role === 'hunter') {
    me.kind = kind === 'badger' ? 'badger' : 'hyena';
    room.hunterKind = me.kind;
  } else if (role === 'hyena' || role === 'badger') me.kind = role;
  else me.kind = null;
  me.animal = animalOf(me);
  return { ok: true, needKind: role === 'hunter' && me.kind !== 'hyena' && me.kind !== 'badger' };
}
function hostOnly(room, hid) { return isHost(room, hid) ? null : { error: 'Only the host can do that.' }; }
function setBots(room, n, hid) {
  const e = hostOnly(room, hid); if (e) return e;
  room.botsWanted = Math.max(0, n | 0); clampBots(room); reconcile(room); return { ok: true };
}
function setChoice() {
  return { error: 'Pick a role. Hyena or Honey Badger plays Hunters. Ostriches and vultures alone play 2 vs 2.' };
}
function setRecovery(room, mode, hid) {
  const e = hostOnly(room, hid); if (e) return e;
  if (mode !== 'play5' && mode !== 'wait') return { error: 'Pick a way forward.' };
  room.recovery = mode; reconcile(room); return { ok: true };
}
function setClock(room, on, hid) {
  const e = hostOnly(room, hid); if (e) return e;
  room.clock = !!on; return { ok: true };
}
function setLevel(room, level, hid) {
  const e = hostOnly(room, hid); if (e) return e;
  room.level = level === 'easy' ? 'easy' : 'normal'; return { ok: true };
}
function setHunterKind(room, kind, hid) {
  const e = hostOnly(room, hid); if (e) return e;
  if (kind !== 'hyena' && kind !== 'badger') return { error: 'Pick hyena or honey badger.' };
  room.hunterKind = kind;
  const h = room.humans.find(x => x.id === hid && x.role === 'hunter');
  if (h) h.kind = kind;
  return { ok: true };
}
const PICK_FIRST = 'Pick your animal first.';
// Assign every playing human a seat, then bots take what is left. Mutates roles.
// Each human who gets a seat without choosing one is marked picked: true; humans who chose get picked: false.
// A solo room never starts without the player's pick. opts.preview skips that refusal so the lobby can
// show who the computers would be (the caller restores the humans afterwards).
function plan(room, opts) {
  const p = effective(room);
  if (!p.ok) {
    if (p.reason === 'mix') return { error: p.hint };
    if (p.reason === 'unsupported') return { error: 'Too many players for one game. Play as 5, or wait for someone to leave.' };
    return { error: 'Add a computer or wait for a friend.' };
  }
  if (room.solo && !(opts && opts.preview) && room.humans.some(h => !animalOf(h))) return { error: PICK_FIRST };
  if (p.setup === '4' || p.setup === '4h') placeClaimed(p.humans.filter(h => !(p.bench || []).includes(h)), p.setup);
  const seats = SETUPS[p.setup].seats.slice(), bench = new Set((p.bench || []).map(h => h.id));
  const playing = room.humans.filter(h => !bench.has(h.id)), taken = {};
  for (const h of playing) {
    if (h.role && seats.includes(h.role) && !taken[h.role]) {
      if (h.role === 'hunter' && h.kind !== 'hyena' && h.kind !== 'badger') return { error: 'Pick hyena or honey badger for the hunter.' };
      taken[h.role] = h;
    }
  }
  const stuck = playing.filter(h => animalOf(h) && taken[h.role] !== h);
  if (stuck.length) return { error: p.hint || 'Those roles do not fit. Switch someone, then start.' };
  const open = seats.filter(s => !taken[s]);
  for (const h of playing) {
    if (taken[h.role] === h) { h.picked = false; continue; }
    const seat = open.shift();
    if (!seat) return { error: 'Not enough roles.' };
    h.role = seat; h.picked = true;
    if (seat === 'hunter') h.kind = room.hunterKind === 'badger' || room.hunterKind === 'hyena' ? room.hunterKind : 'hyena';
    else if (seat === 'hyena' || seat === 'badger') h.kind = seat;
    else h.kind = null;
    h.animal = animalOf(h);
    taken[seat] = h;
  }
  const botSeats = seats.filter(s => !taken[s]);
  let kind = null;
  if (p.setup === '3' || p.setup === '5') {
    const hunter = taken.hunter;
    kind = hunter && (hunter.kind === 'hyena' || hunter.kind === 'badger') ? hunter.kind : (room.hunterKind === 'badger' ? 'badger' : 'hyena');
  }
  return {
    ok: true, setup: p.setup, kind, bench: p.bench || [],
    assignments: seats.map(s => taken[s] ? { seat: s, human: taken[s] } : { seat: s, bot: true }),
    botSeats,
  };
}
function animalCards(humans, setup, hid) {
  const capOf = id => (id === 'ostrich' || id === 'vulture') ? (setup === '4h' ? 1 : 2) : 1;
  return ['ostrich', 'vulture', 'hyena', 'badger'].map(id => {
    const holders = humans.filter(h => animalOf(h) === id);
    const mine = holders.some(h => h.id === hid);
    const cap = capOf(id);
    return {
      id, name: ANIMAL[id].name, sub: holders.length ? holders.map(h => h.name).join(', ') : ANIMAL[id].sub,
      taken: holders.length >= cap && !mine, takenBy: holders.length >= cap && !mine ? 'Taken by ' + holders.map(h => h.name).join(', ') : '', mine, who: holders.map(h => h.name).join(', '),
      cap, holders: holders.length, over: holders.length > cap, kind: id === 'hyena' || id === 'badger' ? id : null,
    };
  });
}
// Run plan() as a preview and put every human back exactly as they were, so looking at the lobby never seats or marks anyone.
function previewPlan(room, fn) {
  const snap = room.humans.map(h => ({ role: h.role, kind: h.kind, animal: h.animal, had: Object.prototype.hasOwnProperty.call(h, 'picked'), picked: h.picked }));
  try {
    const planned = plan(room, { preview: true });
    return fn(planned && planned.ok ? planned : null);
  } finally {
    room.humans.forEach((h, i) => {
      h.role = snap[i].role; h.kind = snap[i].kind; h.animal = snap[i].animal;
      if (snap[i].had) h.picked = snap[i].picked; else delete h.picked;
    });
  }
}
function computerSeatNames(room) {
  return previewPlan(room, planned => {
    if (!planned) return [];
    const label = { blue: 'Ostrich', red: 'Vulture', o1: 'Ostrich', o2: 'Ostrich', v1: 'Vulture', v2: 'Vulture', hyena: 'Hyena', badger: 'Honey Badger' };
    return planned.botSeats.map(s => s === 'hunter' ? (planned.kind === 'badger' ? 'Honey Badger' : 'Hyena') : (label[s] || s));
  });
}
// The animal Start would give this player if they pick nothing ('Ostrich', 'Vulture', 'Hyena' or 'Honey Badger'), or ''.
function animalStartGives(room, me) {
  return previewPlan(room, planned => {
    if (!planned || !planned.assignments.some(a => a.human === me)) return '';
    return shownAnimal(me);
  });
}
function view(room, hid) {
  const p = effective(room), setupId = p.ok ? p.setup : (p.reason === 'mix' ? p.setup : (p.preview || null));
  const seats = setupId && setupId !== '4' && setupId !== '4h' ? SETUPS[setupId].seats : [];
  const me = room.humans.find(h => h.id === hid);
  const playingHumans = p.humans.filter(h => !(p.bench || []).includes(h));
  const playing = new Set(playingHumans.map(h => h.id));
  const seatCard = id => {
    const h = room.humans.find(x => x.role === id && playing.has(x.id));
    const mine = !!(h && h.id === hid);
    const takenBy = h && !mine ? 'Taken by ' + h.name : '';
    return { id, name: META[id].name, sub: mine ? 'YOU' : (takenBy || META[id].sub), taken: !!takenBy, takenBy, who: '', mine, kind: h ? h.kind : null };
  };
  const hunterCards = () => {
    const holder = playingHumans.find(x => animalOf(x) === 'hyena' || animalOf(x) === 'badger');
    const kind = holder ? animalOf(holder) : null;
    const bodies = room.humans.length + (room.botsWanted | 0);
    const singleSeat = bodies !== 2 && bodies !== 4;
    return ['hyena', 'badger'].map(id => {
      const mine = !!(holder && holder.id === hid && kind === id);
      const blocked = !!(holder && holder.id !== hid && (kind === id || singleSeat));
      const takenBy = blocked ? 'Taken by ' + holder.name : '';
      return { id, name: id === 'badger' ? 'Honey Badger' : 'Hyena', kind: id,
        mine, taken: blocked, takenBy, who: '', sub: mine ? 'YOU' : (takenBy || 'Open') };
    });
  };
  let roles = (setupId === '4' || setupId === '4h') ? animalCards(playingHumans, setupId, hid)
    : (setupId === '3' || setupId === '5')
      ? seats.filter(id => id !== 'hunter').map(seatCard).concat(hunterCards())
      : seats.map(seatCard);
  if (setupId === '2' && !room.solo && room.humans.length >= 2) roles = roles.concat(hunterCards());
  const needKind = !!(me && me.role === 'hunter' && me.kind !== 'hyena' && me.kind !== 'badger');
  const host = !!(me && me.host);
  const needPick = !!(room.solo && host && p.ok && !animalOf(me));
  const canStart = host && p.ok && !needKind && !needPick;
  const alone = !room.solo && p.reason === 'need';
  const youAre = me && animalOf(me) ? 'YOU ARE ' + shownAnimal(me) : 'Choose an animal';
  const choose = me && !animalOf(me) && roles.some(r => r.taken) ? 'Choose another bird or hunter.' : '';
  const status = needPick ? PICK_FIRST
    : p.hint ? p.hint
    : choose ? choose
    : alone ? 'Just you. Pick Ostrich or Vulture. A friend joins with this code, or add a computer. Start needs 2.'
    : (setupId && SETUPS[setupId] ? SETUPS[setupId].label : '');
  const people = room.humans.length;
  const gives = canStart && !room.solo && !animalOf(me) ? animalStartGives(room, me) : '';
  const startLabel = !p.ok ? 'Start game'
    : gives ? 'Start · you\'ll be the ' + gives
    : (!room.solo && people === 1 && p.bots > 0) ? 'Start with computers'
    : (people >= 2 && p.bots === 0) ? 'Start · ' + people + ' people'
    : 'Start game';
  return {
    lobby: true, code: room.code, solo: !!room.solo, between: false, note: room.note || '',
    you: me ? me.name : '', host, clock: room.clock !== false, level: room.level === 'easy' ? 'easy' : 'normal',
    humans: room.humans.map(h => ({
      id: h.id, name: h.name, you: h.id === hid, host: !!h.host, connected: !!(h.ws && h.ws.readyState === 1),
      role: playing.has(h.id) ? (h.role || null) : null, animal: playing.has(h.id) ? animalOf(h) : null, kind: h.kind || null,
      shown: playing.has(h.id) ? shownAnimal(h) : 'Waiting',
      bench: !!(p.bench && p.bench.includes(h)),
    })),
    botsWanted: p.bots, maxBots: maxBots(room), total: p.total, humanCount: room.humans.length,
    setup: p.ok ? p.setup : null, preview: setupId, setupLabel: status,
    reason: p.ok ? null : p.reason, hint: needPick ? PICK_FIRST : p.reason === 'mix' ? p.hint : (p.hint || choose), recovery: room.recovery || null, roles, startLabel, youAre,
    computers: p.bots > 0 ? computerSeatNames(room).join(', ') : '',
    hunterKind: room.hunterKind || null,
    showHunterKind: (setupId === '3' || setupId === '5') && p.bots > 0 && !room.humans.some(h => animalOf(h) === 'hyena' || animalOf(h) === 'badger'),
    needKind, canStart,
  };
}
function benchView(room, a) {
  const running = !!(a.late && room.g && room.g.phase !== 'over');
  return {
    lobby: true, between: true, code: room.code, solo: false, you: a.name, host: false,
    note: running ? "You're in. This game is already running. You'll play in the next one." : 'You are in the room. The next game adds you.', clock: room.clock !== false, level: room.level || 'normal',
    humans: [], roles: [], canStart: false, reason: null, botsWanted: 0, maxBots: 0, total: 0,
  };
}
// After a game: fold late joiners into the same setup when that is unique, otherwise back to the lobby.
function sameOrAdapt(state) {
  const arrivals = (state.arrivals || []).map(h => ({ ...h, role: null, kind: null, host: false }));
  if (!arrivals.length) return { type: 'same' };
  const bots = (state.bots || []).slice(), left = arrivals.slice(), placed = [];
  while (left.length && bots.length) {
    const human = left.shift(), seat = bots.shift();
    human.role = seat;
    human.kind = seat === 'hyena' || seat === 'badger' ? seat : seat === 'hunter' ? (state.hunterKind === 'badger' ? 'badger' : 'hyena') : null;
    placed.push(human);
  }
  if (!left.length) return { type: 'replace', placed, bots };
  const all = (state.humans || []).map(h => ({ ...h })).concat(placed, left);
  const inf = infer(all.length, all);
  if (!inf.ok) {
    const note = inf.reason === 'mix' ? inf.hint : 'Someone joined. This group is bigger than one game supports.';
    return { type: 'lobby', reason: inf.reason, humans: all, note };
  }
  if (inf.setup === '5' && all.filter(h => { const a = animalOf(h); return a === 'hyena' || a === 'badger'; }).length > 1) {
    return { type: 'lobby', reason: 'mix', humans: all, note: 'Five players have one hunter. Pick who keeps Hyena or Honey Badger.' };
  }
  const fake = { solo: false, humans: all, botsWanted: 0, setupChoice: null, recovery: null, hunterKind: state.hunterKind || null, clock: true, level: 'normal' };
  reconcile(fake);
  const p = plan(fake);
  if (p.error) return { type: 'lobby', reason: 'need', humans: all, note: p.error };
  return { type: 'expand', plan: p };
}
module.exports = {
  SETUPS, META, ANIMAL, infer, fourMode, animalOf, maxBots, clampBots, effective, seatsNow, isHost, reconcile, claim,
  setBots, setChoice, setRecovery, setClock, setLevel, setHunterKind, plan, view, benchView, sameOrAdapt,
};
