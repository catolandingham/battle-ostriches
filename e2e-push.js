// Actual server catch, actual phone renderer, one-second motion + redacted hunter + reduced-motion trail.
const {spawnSync}=require('child_process'),assert=require('assert'),path=require('path');
const r=spawnSync(process.execPath,['tools/shots-real-play.js',path.join(__dirname,'shots/push-real'),'catch'],{cwd:__dirname,encoding:'utf8',timeout:90000});
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');assert.equal(r.status,0,r.error&&r.error.message||'real catch motion failed');
console.log('PASS actual caught-bird phone motion, exact notices, privacy, static reduced-motion trail');
