// Rooms survive a server restart (SIGTERM -> saved -> new process restores on join), and a truly lost game shows "Game was reset".
const { spawn } = require('child_process'), WS = require('ws'), assert = require('assert'), fs = require('fs');
const FILE = '/tmp/bo-restore-test.json'; try { fs.unlinkSync(FILE); } catch {}
const up = () => new Promise(res => { const p = spawn('node', ['server.js'], { env: { ...process.env, PORT: 3991, BO_STORE: FILE } }); p.stdout.on('data', d => /localhost/.test(d) && res(p)); });
const conn = () => new Promise(res => { const w = new WS('ws://localhost:3991/ws'); const q = []; w.on('message', d => q.push(JSON.parse(d))); w.on('open', () => res({ w, q, send: o => w.send(JSON.stringify(o)) })); });
const wait = (q, f, ms = 3000) => new Promise((res, rej) => { const t0 = Date.now(); const i = setInterval(() => { const m = q.find(f); if (m) { clearInterval(i); res(m); } else if (Date.now() - t0 > ms) { clearInterval(i); rej(new Error('timeout')); } }, 20); });
(async () => {
  let p = await up(); const a = await conn(); a.send({ t: 'create', role: 'blue' }); const j = await wait(a.q, m => m.t === 'joined');
  const b = await conn(); b.send({ t: 'join', code: j.code }); const jb = await wait(b.q, m => m.t === 'joined');
  a.send({ t: 'act', a: 'egg', p: [2, 2] }); await new Promise(r => setTimeout(r, 400));
  p.kill('SIGTERM'); await new Promise(r => p.on('exit', r)); assert.ok(fs.existsSync(FILE), 'saved on SIGTERM');
  p = await up(); const a2 = await conn(); a2.send({ t: 'join', code: j.code, token: j.token });
  const st = await wait(a2.q, m => m.t === 'state' || m.t === 'error'); assert.equal(st.t, 'state', 'restored after restart: ' + JSON.stringify(st).slice(0, 120));
  const v = st.state || st; assert.equal((v.eggs || []).length, 1, 'egg kept'); console.log('ok restored', j.code, 'role', jb.role);
  const a3 = await conn(); a3.send({ t: 'join', code: 'ZZZZ', token: 'x' }); const e = await wait(a3.q, m => m.t === 'error'); assert.ok(e.gone, 'gone flag'); console.log('ok gone flag');
  p.kill('SIGKILL'); console.log('PASS testrestore'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
