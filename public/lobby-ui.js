// Friends / solo lobby. The board is unchanged; this only draws the room before Start and between games.
(function () {
  const $ = id => document.getElementById(id);
  const OST = '<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M6 26 L18 18 L30 22 L24 32 L10 32 Z" fill="#38d6f0" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><path d="M26 22 L28 6 L34 7" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"/><path d="M14 32 L12 38 M20 32 L22 38" stroke="#000" stroke-width="2.5"/></svg>';
  const VUL = '<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M4 18 L20 12 L36 18 L26 22 L20 32 L14 22 Z" fill="#2b3245" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><circle cx="20" cy="11" r="5" fill="#f3dfae" stroke="#000" stroke-width="2.5"/></svg>';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const art = id => {
    if (id === 'blue' || id === 'o1' || id === 'o2') return OST;
    if (id === 'red' || id === 'v1' || id === 'v2') return VUL;
    const K = window.T3UI && T3UI.KIND;
    if (id === 'hyena' && K) return K.hyena.art;
    if (id === 'badger' && K) return K.badger.art;
    if (id === 'hunter' && K) return K.hyena.art;
    return '🐾';
  };
  const label = (role, kind) => {
    if (!role) return 'Choosing';
    if (role === 'hunter') return kind === 'badger' ? 'Honey Badger' : kind === 'hyena' ? 'Hyena' : 'Hunter';
    const r = { blue: 'Ostrich', red: 'Vulture', o1: 'Ostrich 1', o2: 'Ostrich 2', v1: 'Vulture 1', v2: 'Vulture 2', hyena: 'Hyena', badger: 'Honey Badger' };
    return r[role] || role;
  };
  let gear = false, botsOpen = false, kindOpen = false, st = null;
  const send = o => window.UI && UI.send(o);
  function show(state) {
    st = state; $('lobby').classList.remove('hidden'); $('lobby').classList.add('inroom');
    $('over').classList.add('hidden'); $('homeStep').classList.add('hidden');
    $('soloStep').classList.add('hidden'); $('passStep').classList.add('hidden');
    $('roomLobby').classList.remove('hidden');
    if (state.needKind) kindOpen = true;
    draw();
  }
  function hide() { const n = $('roomLobby'); if (n) n.classList.add('hidden'); const l = $('lobby'); if (l) l.classList.remove('inroom'); }
  function draw() {
    const s = st; if (!s) return;
    const box = $('roomLobby');
    if (s.between) {
      box.innerHTML = `<div class="toolbar"><button class="linkbtn" id="lobbyHome" type="button">← Home</button></div>
        <h2>You're in</h2><p class="sub">${esc(s.note || 'The next game adds you automatically.')}</p>
        <div class="codebox"><div>Room code</div><div id="lobbyCode">${esc(s.code)}</div>
        <input id="lobbyLink" readonly value="${esc(location.origin + '/?room=' + s.code)}"></div>`;
      return;
    }
    const me = (s.humans || []).find(h => h.you);
    const setupLine = s.reason === 'choice4' ? '4 players can be 2 vs 2 or Hunters.'
      : s.reason === 'unsupported' ? (s.humanCount + ' players is more than one game. Play as 5, or wait for someone to leave.')
      : s.reason === 'need' ? (s.solo ? '' : 'Share the code. A friend joining sets the size. Or add a computer when you start.')
      : (s.setupLabel ? 'Setup: ' + s.setupLabel + (s.total ? ' · ' + s.total + ' players' : '') : '');
    const chooser = (s.reason === 'choice4' || s.setup === '4' || s.setup === '4h') ? `<div class="choose"><strong>Choose setup</strong>
      <button type="button" class="setup-opt${s.setup === '4' ? ' on' : ''}" data-setup="4"><b>2 vs 2</b><br><small>2 ostriches · 2 vultures</small></button>
      <button type="button" class="setup-opt${s.setup === '4h' ? ' on' : ''}" data-setup="4h"><b>Hunters</b><br><small>Ostrich · Vulture · Hyena · Honey Badger</small></button></div>` : '';
    const recover = s.humanCount > 5 ? `<div class="choose"><strong>Too many for one game</strong>
      <button type="button" class="setup-opt${s.recovery === 'play5' ? ' on' : ''}" data-recovery="play5"><b>Play as 5</b><br><small>First 5 play. Anyone else waits for the next opening.</small></button>
      <button type="button" class="setup-opt${s.recovery === 'wait' ? ' on' : ''}" data-recovery="wait"><b>Wait for someone to leave</b><br><small>No game until the room is 2 to 5.</small></button></div>` : '';
    const humans = (s.humans || []).map(h => `<div class="seat${h.you ? ' you' : ''}${h.bench ? ' bot' : ''}"><div><b>${esc(h.you ? 'You' : h.name)}${h.host ? ' · host' : ''}${h.bench ? ' · waiting' : ''}</b><small>${h.connected === false ? 'Reconnecting' : h.bench ? 'In when there is room' : 'In the room'}</small></div><span class="pill">${esc(label(h.role, h.kind))}</span></div>`).join('');
    const bots = s.botsWanted ? Array.from({ length: s.botsWanted }, (_, i) => `<div class="seat bot"><div><b>Computer ${i + 1}</b><small>Takes an open role at Start</small></div><span class="pill">Open</span></div>`).join('') : '';
    const roles = (s.roles || []).map(r => `<button type="button" class="rolecard${r.mine ? ' mine' : ''}${r.taken && !r.mine ? ' taken' : ''}" data-role="${esc(r.id)}" ${r.taken && !r.mine ? 'disabled' : ''}><span class="ra">${art(r.id)}</span><b>${esc(r.name)}</b><small>${esc(r.taken ? (r.mine ? 'You' : r.who) : r.sub)}</small></button>`).join('');
    const max = s.maxBots || 0;
    const adds = max ? `<div class="botpick" role="group" aria-label="Computers to add">${Array.from({ length: max + (s.solo ? 0 : 1) }, (_, i) => s.solo ? i + 1 : i).filter(n => n >= (s.solo ? 1 : 0) && n <= max).map(n => `<button type="button" data-add="${n}" class="${n === s.botsWanted ? 'on' : ''}">${s.solo ? n : (n ? '+' + n : '0')}</button>`).join('')}</div>` : '';
    const levels = (s.solo || s.botsWanted) ? `<div class="toggle"><div><b>Computer</b><div class="sub" style="text-align:left">Easy or Normal</div></div><span class="lvl"><button type="button" data-level="easy" class="${s.level === 'easy' ? 'on' : ''}">Easy</button><button type="button" data-level="normal" class="${s.level !== 'easy' ? 'on' : ''}">Normal</button></span></div>` : '';
    const share = s.solo ? '' : `<div class="codebox"><div>Room code</div><div id="lobbyCode">${esc(s.code)}</div>
      <input id="lobbyLink" readonly value="${esc(location.origin + '/?room=' + s.code)}">
      <div class="row"><button type="button" id="copyCode">Copy</button><button type="button" id="shareGo">Share</button></div></div>`;
    const startLabel = s.canStart ? 'Start game' : (s.host && s.reason === 'need' ? 'Add a computer' : 'Start game');
    box.innerHTML = `<div class="toolbar"><button class="linkbtn" id="lobbyHome" type="button">← Home</button><button class="gear" id="lobbyGear" type="button" aria-expanded="${gear}" aria-label="Settings">⚙</button></div>
      <div class="menu${gear ? '' : ' hidden'}" id="lobbyMenu"><b>Settings</b>
        <div class="toggle"><div><b>Turn timer</b><div class="sub" style="text-align:left">Optional · default on · used in 3+ player games</div></div>
          <button type="button" class="switch${s.clock ? '' : ' off'}" id="clockToggle" aria-pressed="${s.clock ? 'true' : 'false'}" aria-label="Turn timer"></button></div>
        ${levels}
      </div>
      <h2>${s.solo ? 'Your game' : 'Room ready'}</h2>
      <p class="sub">${s.solo ? 'Pick your role. Computers take the rest at Start.' : 'No seats to fill. Whoever is here is the game.'}</p>
      ${share}
      ${s.note ? `<div class="infer">${esc(s.note)}</div>` : ''}
      ${setupLine ? `<div class="${s.reason === 'choice4' || s.reason === 'unsupported' ? 'choose' : 'infer'}">${esc(setupLine)}</div>` : ''}
      ${chooser}${recover}
      <div class="players">${humans}${bots}</div>
      ${roles ? `<div class="roles" aria-label="Roles">${roles}</div>` : ''}
      ${s.showHunterKind ? `<div class="choose"><strong>Computer hunter</strong><div class="row"><button type="button" data-hkind="hyena" class="${s.hunterKind === 'badger' ? '' : 'on'}">Hyena</button><button type="button" data-hkind="badger" class="${s.hunterKind === 'badger' ? 'on' : ''}">Honey Badger</button></div></div>` : ''}
      ${s.host && max ? `<button type="button" class="big alt" id="addBotBtn">${botsOpen ? 'Hide computers' : (s.solo ? 'Change computers' : 'Add computers')}</button><div class="sheet${botsOpen || (s.host && s.reason === 'need') ? '' : ' hidden'}" id="botBox"><b>${s.solo ? 'Computers' : 'Add computer players'}</b><p class="sub">They fill open roles when you start. This is not a separate screen.</p>${adds}</div>` : ''}
      ${s.host ? `<button type="button" class="big" id="startGame"${s.canStart || s.reason === 'need' ? '' : ' disabled'}>${startLabel}</button>` : '<p class="footnote">Waiting for the host to start.</p>'}
      <p class="footnote">${s.reason === 'need' && !s.solo ? 'Invite says join this room — no role spoiler in the code.' : 'You can switch roles until Start.'}</p>
      <div class="sheet${kindOpen ? '' : ' hidden'}" id="kindSheet"><b>Which hunter?</b>
        <button type="button" data-kind="hyena"><b>Hyena</b> — Pounce · 2 catches</button>
        <button type="button" data-kind="badger"><b>Honey Badger</b> — Burrow · 1 catch</button>
        <button type="button" class="linkbtn" id="kindCancel">Cancel</button></div>`;
  }
  document.addEventListener('click', e => {
    const root = $('roomLobby'); if (!root || root.classList.contains('hidden') || !root.contains(e.target)) return;
    const home = e.target.closest('#lobbyHome'); if (home) { UI.menu(); return; }
    const gearBtn = e.target.closest('#lobbyGear'); if (gearBtn) { gear = !gear; draw(); return; }
    const clock = e.target.closest('#clockToggle'); if (clock && st && st.host) { send({ t: 'lobby', a: 'clock', on: !st.clock }); return; }
    const lvl = e.target.closest('[data-level]'); if (lvl && st && st.host) { send({ t: 'lobby', a: 'level', level: lvl.dataset.level }); return; }
    const add = e.target.closest('[data-add]'); if (add && st && st.host) { send({ t: 'lobby', a: 'bots', n: +add.dataset.add }); return; }
    const setup = e.target.closest('[data-setup]'); if (setup && st && st.host) { send({ t: 'lobby', a: 'setup', setup: setup.dataset.setup }); return; }
    const rec = e.target.closest('[data-recovery]'); if (rec && st && st.host) { send({ t: 'lobby', a: 'recovery', mode: rec.dataset.recovery }); return; }
    const hk = e.target.closest('[data-hkind]'); if (hk && st && st.host) { send({ t: 'lobby', a: 'kind', kind: hk.dataset.hkind }); return; }
    const cancel = e.target.closest('#kindCancel'); if (cancel) { kindOpen = false; draw(); return; }
    const kind = e.target.closest('[data-kind]'); if (kind) { kindOpen = false; send({ t: 'lobby', a: 'role', role: 'hunter', kind: kind.dataset.kind }); return; }
    const role = e.target.closest('[data-role]'); if (role && !role.disabled) {
      if (role.dataset.role === 'hunter') { kindOpen = true; draw(); return; }
      send({ t: 'lobby', a: 'role', role: role.dataset.role }); return;
    }
    const addBtn = e.target.closest('#addBotBtn'); if (addBtn) { botsOpen = !botsOpen; draw(); return; }
    const start = e.target.closest('#startGame'); if (start && st && st.host) {
      if (st.reason === 'need') { botsOpen = true; draw(); return; }
      if (st.canStart) send({ t: 'lobby', a: 'start' });
      return;
    }
    const copy = e.target.closest('#copyCode'); if (copy) { const v = $('lobbyLink').value; navigator.clipboard && navigator.clipboard.writeText(v); copy.textContent = 'Copied'; return; }
    const share = e.target.closest('#shareGo'); if (share) { const u = $('lobbyLink').value; if (navigator.share) navigator.share({ title: 'Battle Ostriches', text: 'Join my game. Code ' + st.code, url: u }).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(u); return; }
  });
  window.LobbyUI = { show, hide, get: () => st };
})();
