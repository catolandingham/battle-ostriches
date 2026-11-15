// Brian, 2026-11-15: "Timer needs its own button." The timer on/off button sits in the top bar (next to the ⋯ menu), not inside the menu. node testtimerbutton.js
const fs = require('fs'), assert = require('assert');
const html = fs.readFileSync(__dirname + '/public/index.html', 'utf8'), css = fs.readFileSync(__dirname + '/public/style.css', 'utf8') + fs.readFileSync(__dirname + '/public/ring.css', 'utf8') + fs.readFileSync(__dirname + '/public/part1.css', 'utf8');
assert.ok(/<button id="timerToggle"[\s\S]*?<\/button><button id="moreBtn"/.test(html), 'timer button sits just before the ⋯ button');
assert.ok(!/id="menuTimer"/.test(html), 'no Timer line inside the ⋯ menu');
for (const rule of css.match(/[^{}]*#timerToggle[^{}]*\{[^}]*\}/g) || []) assert.ok(!/clip:rect\(0,0,0,0\)/.test(rule), 'timer button is not hidden: ' + rule.trim().slice(0, 80));
console.log('ok timer has its own button in the top bar');
