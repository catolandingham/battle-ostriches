// Room persistence so a deploy/restart doesn't wipe live games. Uses Render Key Value (REDIS_URL) when set, else a JSON file (BO_STORE,
// default ./data/rooms.json). Rooms are saved a moment after any change and on SIGTERM; a join for an unknown code checks the store first,
// which also covers zero-downtime deploys (the old instance keeps saving until it stops).
const fs = require('fs'), path = require('path');
const SKIP = new Set(['ws', 'aiT', 'clockT', 'clockKey', 'saveT', 'clockHoldKey', 'clockFire', 'clockMsPending', 'deadline', 'lastViews', 'holdUntil', 'cardHold', 'graceT', 'clockAskPause']);
const ser = room => JSON.stringify(room, (k, v) => SKIP.has(k) ? undefined : v);
let kv = null, ready = null;
if (process.env.REDIS_URL) { try { const { createClient } = require('redis'); kv = createClient({ url: process.env.REDIS_URL }); kv.on('error', () => {}); ready = kv.connect().catch(() => { kv = null; }); } catch { kv = null; } }
const FILE = process.env.BO_STORE || path.join(__dirname, 'data', 'rooms.json');
const readFile = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } };
let fileCache = null, fileT = null;
async function save(room) {
  if (process.env.BO_NOSTORE) return; const s = ser(room);
  if (kv) { await ready; if (kv) return kv.set('bo:room:' + room.code, s, { EX: 6 * 3600 }).catch(() => {}); }
  fileCache = fileCache || readFile(); fileCache[room.code] = JSON.parse(s);
  clearTimeout(fileT); fileT = setTimeout(flushFile, 300);
}
function flushFile() { if (!fileCache) return; try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); const cut = Date.now() - 6 * 3600e3;
  for (const [c, r] of Object.entries(fileCache)) if ((r.touched || 0) < cut) delete fileCache[c]; fs.writeFileSync(FILE + '.tmp', JSON.stringify(fileCache)); fs.renameSync(FILE + '.tmp', FILE); } catch {} }
async function load(code) {
  if (process.env.BO_NOSTORE) return null;
  if (kv) { await ready; if (kv) { const s = await kv.get('bo:room:' + code).catch(() => null); return s ? JSON.parse(s) : null; } }
  const all = readFile(); return all[code] || null;
}
async function del(code) { if (kv) { await ready; if (kv) return kv.del('bo:room:' + code).catch(() => {}); } if (fileCache) delete fileCache[code]; }
module.exports = { save, load, del, flushFile, pack: ser, kind: () => kv ? 'keyvalue' : 'file:' + FILE };
