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
  badger: { name: 'Honey Badger', sub: 'Burrow · 1 catch' },
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
function infer(total, choice) {
  if (total < 2) return { ok: false, reason: 'need' };
  if (total === 2) return { ok: true, setup: '2' };
  if (total === 3) return { ok: true, setup: '3' };
  if (total === 4) return choice === '4' || choice === '4h' ? { ok: true, setup: choice } : { ok: false, reason: 'choice4' };
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
  const total = nH + bots, inf = infer(total, room.setupChoice);
  if (!inf.ok && inf.reason === 'need' && !room.solo) inf.preview = '2';
  return { humans: room.humans, bench: [], bots, total, ...inf };
}
function seatsNow(room) {
  const p = effective(room), id = p.ok ? p.setup : p.preview;
  return id ? SETUPS[id].seats.slice() : [];
}
function isHost(room, hid) {
  const h = (room.humans || []).find(x => x.id === hid);
  return !!(h && h.host);
}
// Keep a claimed role when the setup changes; drop it when it no longer maps.
function reconcile(room) {
  const seats = seatsNow(room);
  if (!seats.length) return;
  const p = effective(room), bench = new Set((p.bench || []).map(h => h.id)), used = new Set();
  for (const h of room.humans) {
    if (bench.has(h.id)) { h.role = null; h.kind = null; continue; }
    let role = h.role && seats.includes(h.role) && !used.has(h.role) ? h.role : null;
    if (!role && h.role) role = prefer(h.role, h.kind).find(s => seats.includes(s) && !used.has(s)) || null;
    if (!role) { h.role = null; h.kind = null; continue; }
    used.add(role); h.role = role;
    if (role === 'hyena' || role === 'badger') h.kind = role;
    else if (role !== 'hunter') h.kind = null;
    else if (h.kind !== 'hyena' && h.kind !== 'badger') h.kind = null;
  }
}
function claim(room, hid, role, kind) {
  const seats = seatsNow(room);
  if (!seats.length) {
    const p = effective(room);
    return { error: p.reason === 'choice4' ? 'Choose 2 vs 2 or Hunters first.' : p.reason === 'unsupported' ? 'Choose how to continue before picking roles.' : 'Waiting for enough players.' };
  }
  if (!seats.includes(role)) return { error: 'That role is not in this setup.' };
  const me = room.humans.find(h => h.id === hid);
  if (!me) return { error: 'You are not in this room.' };
  const p = effective(room);
  if ((p.bench || []).some(h => h.id === hid)) return { error: 'This game is full. You will join when there is room.' };
  const other = room.humans.find(h => h !== me && h.role === role);
  if (other) return { error: 'That role is taken.' };
  if (kind && kind !== 'hyena' && kind !== 'badger') kind = null;
  me.role = role;
  if (role === 'hunter') {
    if (kind) me.kind = kind;
    else if (me.kind !== 'hyena' && me.kind !== 'badger') me.kind = null;
    if (me.kind) room.hunterKind = me.kind;
  } else if (role === 'hyena' || role === 'badger') me.kind = role;
  else me.kind = null;
  return { ok: true, needKind: role === 'hunter' && me.kind !== 'hyena' && me.kind !== 'badger' };
}
function hostOnly(room, hid) { return isHost(room, hid) ? null : { error: 'Only the host can do that.' }; }
function setBots(room, n, hid) {
  const e = hostOnly(room, hid); if (e) return e;
  room.botsWanted = Math.max(0, n | 0); clampBots(room); reconcile(room); return { ok: true };
}
function setChoice(room, choice, hid) {
  const e = hostOnly(room, hid); if (e) return e;
  if (choice !== '4' && choice !== '4h') return { error: 'Pick 2 vs 2 or Hunters.' };
  room.setupChoice = choice; reconcile(room); return { ok: true };
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
// Assign every playing human a seat, then bots take what is left. Mutates roles.
function plan(room) {
  const p = effective(room);
  if (!p.ok) {
    if (p.reason === 'choice4') return { error: 'Choose 2 vs 2 or Hunters.' };
    if (p.reason === 'unsupported') return { error: 'Too many players for one game. Play as 5, or wait for someone to leave.' };
    return { error: 'Add a computer or wait for a friend.' };
  }
  const seats = SETUPS[p.setup].seats.slice(), bench = new Set((p.bench || []).map(h => h.id));
  const playing = room.humans.filter(h => !bench.has(h.id)), taken = {};
  for (const h of playing) {
    if (h.role && seats.includes(h.role) && !taken[h.role]) {
      if (h.role === 'hunter' && h.kind !== 'hyena' && h.kind !== 'badger') return { error: 'Pick hyena or honey badger for the hunter.' };
      taken[h.role] = h;
    }
  }
  const open = seats.filter(s => !taken[s]);
  for (const h of playing) {
    if (taken[h.role] === h) continue;
    const seat = open.shift();
    if (!seat) return { error: 'Not enough roles.' };
    h.role = seat;
    if (seat === 'hunter') h.kind = room.hunterKind === 'badger' || room.hunterKind === 'hyena' ? room.hunterKind : 'hyena';
    else if (seat === 'hyena' || seat === 'badger') h.kind = seat;
    else h.kind = null;
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
function view(room, hid) {
  const p = effective(room), setupId = p.ok ? p.setup : (p.preview || null);
  const seats = setupId ? SETUPS[setupId].seats : [], me = room.humans.find(h => h.id === hid);
  const playing = new Set(p.humans.filter(h => !(p.bench || []).includes(h)).map(h => h.id));
  const roles = seats.map(id => {
    const h = room.humans.find(x => x.role === id && playing.has(x.id));
    return { id, name: META[id].name, sub: META[id].sub, taken: !!h, who: h ? h.name : '', mine: !!(h && h.id === hid), kind: h ? h.kind : null };
  });
  const needKind = !!(me && me.role === 'hunter' && me.kind !== 'hyena' && me.kind !== 'badger');
  const host = !!(me && me.host);
  const canStart = host && p.ok && !needKind;
  return {
    lobby: true, code: room.code, solo: !!room.solo, between: false, note: room.note || '',
    you: me ? me.name : '', host, clock: room.clock !== false, level: room.level === 'easy' ? 'easy' : 'normal',
    humans: room.humans.map(h => ({
      id: h.id, name: h.name, you: h.id === hid, host: !!h.host, connected: !!(h.ws && h.ws.readyState === 1),
      role: playing.has(h.id) ? (h.role || null) : null, kind: h.kind || null, bench: !!(p.bench && p.bench.includes(h)),
    })),
    botsWanted: p.bots, maxBots: maxBots(room), total: p.total, humanCount: room.humans.length,
    setup: p.ok ? p.setup : null, preview: setupId, setupLabel: setupId ? SETUPS[setupId].label : '',
    reason: p.ok ? null : p.reason, recovery: room.recovery || null, roles, hunterKind: room.hunterKind || null,
    showHunterKind: (setupId === '3' || setupId === '5') && !roles.some(r => r.id === 'hunter' && r.taken),
    needKind, canStart,
  };
}
function benchView(room, a) {
  return {
    lobby: true, between: true, code: room.code, solo: false, you: a.name, host: false,
    note: 'You are in the room. The next game adds you.', clock: room.clock !== false, level: room.level || 'normal',
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
  const inf = infer(all.length, state.setupChoice);
  if (!inf.ok) {
    const note = inf.reason === 'choice4'
      ? 'Someone joined. Four players can be 2 vs 2 or Hunters.'
      : 'Someone joined. This group is bigger than one game supports.';
    return { type: 'lobby', reason: inf.reason, humans: all, note };
  }
  const fake = { solo: false, humans: all, botsWanted: 0, setupChoice: state.setupChoice || null, recovery: null, hunterKind: state.hunterKind || null, clock: true, level: 'normal' };
  reconcile(fake);
  const p = plan(fake);
  if (p.error) return { type: 'lobby', reason: 'need', humans: all, note: p.error };
  return { type: 'expand', plan: p };
}
module.exports = {
  SETUPS, META, infer, maxBots, clampBots, effective, seatsNow, isHost, reconcile, claim,
  setBots, setChoice, setRecovery, setClock, setLevel, setHunterKind, plan, view, benchView, sameOrAdapt,
};
