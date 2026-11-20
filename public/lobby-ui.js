// Friends / solo lobby. The board is unchanged; this only draws the room before Start and between games.
(function () {
  const $ = id => document.getElementById(id);
  const OST = ART.ostrich;
  const VUL = ART.vulture;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const art = id => {
    if (id === 'blue' || id === 'o1' || id === 'o2' || id === 'ostrich') return OST;
    if (id === 'red' || id === 'v1' || id === 'v2' || id === 'vulture') return VUL;
    const K = window.T3UI && T3UI.KIND;
    if (id === 'hyena' && K) return K.hyena.art;
    if (id === 'badger' && K) return K.badger.art;
    if (id === 'hunter' && K) return K.hyena.art;
    return '🐾';
  };
  const label = (role, kind) => {
    if (!role) return 'Choosing';
    if (role === 'hunter') return kind === 'badger' ? 'Badger' : kind === 'hyena' ? 'Hyena' : 'Hunter';
    const r = { blue: 'Ostrich', red: 'Vulture', o1: 'Ostrich 1', o2: 'Ostrich 2', v1: 'Vulture 1', v2: 'Vulture 2', hyena: 'Hyena', badger: 'Badger' };
    return r[role] || role;
  };
  let gear = false, botsOpen = false, kindOpen = false, st = null, pendingClaim = null;
  const send = o => window.UI && UI.send(o);
  function show(state) {
    if (!st || st.code !== state.code || state.ask) pendingClaim = null;
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
    const link = esc(location.origin + '/?room=' + s.code);
    if (s.between) {
      const words = s.rejoinWords || {};
      const offline = s.offline || [];
      let mid;
      if (pendingClaim && offline.some(o => o.seat === pendingClaim)) {
        const o = offline.find(x => x.seat === pendingClaim);
        const body = words.confirmBody ? `<p class="statusline">${esc(words.confirmBody)}</p>` : '';
        mid = `<p class="sub">${esc(o.confirm || o.action + '?')}</p>
          ${body}
          <div class="row rejoinrow">
            <button type="button" class="big" id="claimYes">${esc(words.confirmYes || 'Rejoin')}</button>
            <button type="button" class="big alt" id="claimNo">${esc(words.confirmNo || 'Not me')}</button>
          </div>`;
      } else {
        const btns = offline.map(o => `<button type="button" class="big alt rejoin" data-claim="${esc(o.seat)}">${esc(o.action)}</button>`).join('');
        mid = `<p class="sub">${esc(s.note || 'The next game adds you.')}</p>${btns ? `<div class="rejoinlist">${btns}</div>` : ''}`;
      }
      box.innerHTML = `<div class="toolbar"><button class="linkbtn" id="lobbyHome" type="button">← Home</button></div>
        <h2>You're in</h2>${mid}
        <div class="codebox"><div id="lobbyCode" aria-label="Room code ${esc(s.code)}">${esc(s.code)}</div>
        <button type="button" id="shareGo" aria-label="Share room ${esc(s.code)}">Share</button>
        <input id="lobbyLink" class="visually-hidden" readonly tabindex="0" aria-label="Room link" value="${link}"></div>
        <p id="copyStatus" class="visually-hidden" aria-live="polite"></p>`;
      return;
    }
    const who = (s.humans || []).map(h => {
      const role = h.shown || label(h.animal || h.role, h.kind);
      return `<li><b>${esc(h.you ? 'You' : h.name)}</b>${h.host ? ' · host' : ''}${h.bench ? ' · waiting' : ''}<span>${esc(role)}</span></li>`;
    }).join('');
    const roles = (s.roles || []).map(r => `<button type="button" class="rolecard${r.mine ? ' mine' : ''}${r.over ? ' over' : ''}${r.taken ? ' taken' : ''}" data-role="${esc(r.id)}" aria-pressed="${r.mine ? 'true' : 'false'}" ${r.taken ? 'disabled' : ''}><span class="ra">${art(r.id)}</span><b>${esc(r.name)}</b><small>${esc(r.mine ? 'YOU' : (r.takenBy || r.who || r.sub))}</small></button>`).join('');
    const max = s.maxBots || 0;
    const levels = (s.solo || s.botsWanted) ? `<div class="lvl"><span>Computer</span><button type="button" data-level="easy" class="${s.level === 'easy' ? 'on' : ''}">Easy</button><button type="button" data-level="normal" class="${s.level !== 'easy' ? 'on' : ''}">Normal</button></div>` : '';
    const sound = (window.SFX && SFX.muted) ? 'Sound off' : 'Sound on';
    const status = s.hint || s.note || (s.reason === 'unsupported' ? 'Too many players for one game.' : (!s.solo && s.setupLabel ? s.setupLabel : ''));
    const recover = s.humanCount > 5 ? `<div class="choose"><button type="button" class="setup-opt${s.recovery === 'play5' ? ' on' : ''}" data-recovery="play5"><b>Play as 5</b><br><small>First 5 play. The rest wait.</small></button>
      <button type="button" class="setup-opt${s.recovery === 'wait' ? ' on' : ''}" data-recovery="wait"><b>Wait</b><br><small>Until the room is 2 to 5.</small></button></div>` : '';
    const share = s.solo ? '' : `<div class="codebox"><div id="lobbyCode" aria-label="Room code ${esc(s.code)}">${esc(s.code)}</div>
      <button type="button" id="shareGo" aria-label="Share room ${esc(s.code)}">Share</button>
      <input id="lobbyLink" class="visually-hidden" readonly tabindex="0" aria-label="Room link" value="${link}"></div>
      <p id="copyStatus" class="visually-hidden" aria-live="polite"></p>`;
    const bots = s.host && max ? `<div class="botstep"><span id="botLabel">Computers</span><button type="button" id="botMinus" aria-label="Fewer computers" ${s.botsWanted <= (s.solo ? 1 : 0) ? 'disabled' : ''}>−</button><b id="botCount" aria-live="polite">${s.botsWanted}</b><button type="button" id="botPlus" aria-label="More computers" ${s.botsWanted >= max ? 'disabled' : ''}>+</button></div>` : '';
    // Until a second player (a friend or a computer) is in, show only the code, Share and the seats: you, and one open seat with "+ Computer".
    // The animal choice and Start appear once someone is in.
    if (!s.solo && s.host && (s.humans || []).length + (s.botsWanted || 0) < 2) {
      const mine = (s.humans || []).map(h => `<li><span class="seatwho"><b>${esc(h.you ? 'You' : h.name)}</b>${h.host ? ' · host' : ''}</span></li>`).join('');
      box.innerHTML = `<div class="toolbar"><button class="linkbtn" id="lobbyHome" type="button">← Home</button><button class="gear" id="lobbyGear" type="button" aria-expanded="${gear}" aria-controls="lobbyMenu" aria-label="More">⚙</button></div>
      <div class="menu${gear ? '' : ' hidden'}" id="lobbyMenu" role="group" aria-label="Help and settings">
        <button type="button" data-tool="rules">How to play</button>
        <button type="button" data-tool="sound">${sound}</button>
        <button type="button" data-tool="theme">Theme</button>
        <div class="toggle"><span>Turn timer</span><button type="button" class="switch${s.clock ? '' : ' off'}" id="clockToggle" aria-pressed="${s.clock ? 'true' : 'false'}" aria-label="Turn timer ${s.clock ? 'on' : 'off'}"></button></div>
      </div>
      ${share}
      <ul class="who seats" aria-label="Roster">${mine}<li class="openseat"><span class="opentxt">Open seat</span>${max ? '<button type="button" id="botPlus" class="addcomp">+ Computer</button>' : ''}</li></ul>`;
      return;
    }
    box.innerHTML = `<div class="toolbar"><button class="linkbtn" id="lobbyHome" type="button">← Home</button><button class="gear" id="lobbyGear" type="button" aria-expanded="${gear}" aria-controls="lobbyMenu" aria-label="More">⚙</button></div>
      <div class="menu${gear ? '' : ' hidden'}" id="lobbyMenu" role="group" aria-label="Help and settings">
        <button type="button" data-tool="rules">How to play</button>
        <button type="button" data-tool="sound">${sound}</button>
        <button type="button" data-tool="theme">Theme</button>
        <div class="toggle"><span>Turn timer</span><button type="button" class="switch${s.clock ? '' : ' off'}" id="clockToggle" aria-pressed="${s.clock ? 'true' : 'false'}" aria-label="Turn timer ${s.clock ? 'on' : 'off'}"></button></div>
        ${levels}
      </div>
      ${share}
      <p class="youare" role="status">${esc(s.youAre || 'Choose an animal')}</p>
      ${status ? `<p class="statusline" role="status">${esc(status)}</p>` : ''}
      <ul class="who" aria-label="Roster">${who}</ul>
      ${recover}
      ${roles ? `<div class="roles" aria-label="Roles">${roles}</div>` : ''}
      ${s.computers ? `<p class="statusline">Computers: ${esc(s.computers)}</p>` : ''}
      ${s.showHunterKind ? `<p class="statusline">Computer hunter, if nobody claims it</p><div class="row hunterkind"><button type="button" data-hkind="hyena" class="${s.hunterKind === 'badger' ? '' : 'on'}" aria-pressed="${s.hunterKind === 'badger' ? 'false' : 'true'}">Hyena<small>When you miss, move 1 more.</small></button><button type="button" data-hkind="badger" class="${s.hunterKind === 'badger' ? 'on' : ''}" aria-pressed="${s.hunterKind === 'badger' ? 'true' : 'false'}">Badger</button></div>` : ''}
      ${bots}
      ${s.host ? `<button type="button" class="big" id="startGame"${s.canStart ? '' : ' disabled'}>${esc(s.startLabel || 'Start game')}</button>` : '<p class="footnote">Waiting for the host to start.</p>'}`;
  }
  document.addEventListener('click', e => {
    const root = $('roomLobby'); if (!root || root.classList.contains('hidden') || !root.contains(e.target)) return;
    const home = e.target.closest('#lobbyHome'); if (home) { UI.menu(); return; }
    const claimBtn = e.target.closest('[data-claim]'); if (claimBtn) { pendingClaim = claimBtn.dataset.claim; draw(); return; }
    const yes = e.target.closest('#claimYes'); if (yes && pendingClaim) { send({ t: 'claim', seat: pendingClaim }); return; }
    const no = e.target.closest('#claimNo'); if (no) { pendingClaim = null; draw(); return; }
    const gearBtn = e.target.closest('#lobbyGear'); if (gearBtn) { gear = !gear; draw(); return; }
    const clock = e.target.closest('#clockToggle'); if (clock && st && st.host) { send({ t: 'lobby', a: 'clock', on: !st.clock }); return; }
    const lvl = e.target.closest('[data-level]'); if (lvl && st && st.host) { send({ t: 'lobby', a: 'level', level: lvl.dataset.level }); return; }
    const minus = e.target.closest('#botMinus'); if (minus && st && st.host && !minus.disabled) { send({ t: 'lobby', a: 'bots', n: st.botsWanted - 1 }); return; }
    const plus = e.target.closest('#botPlus'); if (plus && st && st.host && !plus.disabled) { send({ t: 'lobby', a: 'bots', n: st.botsWanted + 1 }); return; }
    const tool = e.target.closest('[data-tool]'); if (tool) {
      if (tool.dataset.tool === 'rules' && window.UI) UI.rules();
      else if (tool.dataset.tool === 'sound') { const b = $('muteBtn2'); if (b) b.click(); else if (window.SFX) SFX.toggle(); draw(); }
      else if (tool.dataset.tool === 'theme' && window.THEME) THEME.next();
      return;
    }
    const rec = e.target.closest('[data-recovery]'); if (rec && st && st.host) { send({ t: 'lobby', a: 'recovery', mode: rec.dataset.recovery }); return; }
    const hk = e.target.closest('[data-hkind]'); if (hk && st && st.host) { send({ t: 'lobby', a: 'kind', kind: hk.dataset.hkind }); return; }
    const role = e.target.closest('[data-role]'); if (role && !role.disabled) {
      const id = role.dataset.role;
      send({ t: 'lobby', a: 'role', role: id, kind: id === 'hyena' || id === 'badger' ? id : undefined }); return;
    }
    const start = e.target.closest('#startGame'); if (start && st && st.host && st.canStart && !start.disabled) { send({ t: 'lobby', a: 'start' }); return; }
    const share = e.target.closest('#shareGo'); if (share) {
      const url = $('lobbyLink') ? $('lobbyLink').value : location.origin + '/?room=' + st.code;
      const say = msg => { const n = $('copyStatus'); if (n) n.textContent = msg; share.textContent = msg; setTimeout(() => { if (st) share.textContent = 'Share'; }, 1600); };
      if (navigator.share) navigator.share({ title: 'Battle Ostriches', text: 'Join my game. Code ' + st.code, url }).catch(err => { if (err && err.name === 'AbortError') return; if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => say('Link copied')); });
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => say('Link copied'));
      else { const input = $('lobbyLink'); if (input) { input.focus(); input.select(); } say('Copy the link'); }
      return;
    }
  });
  function fail() { pendingClaim = null; if (st) draw(); }
  window.LobbyUI = { show, hide, fail, get: () => st };
})();
