// Writes eggs.html: every egg the board and buttons use (your egg with its countdown, found egg, "is here" and dashed "may be here"
// corner marks, the Carry button icon) at real board size, on the default theme's plain and lit squares. Render: node tools/icon-tests/shot.js eggs.html out.png
const fs = require('fs'), path = require('path'), P = path.join(__dirname, '../../public/');
const ui = fs.readFileSync(P + 'ui.js', 'utf8'), t3 = fs.readFileSync(P + 'three-ui.js', 'utf8');
const C = n => eval(ui.match(new RegExp('const ' + n + "=('[^\\n]*?</svg>')"))[1]);
const EGGD = t3.match(/EGGD='([^']+)'/)[1], two = d => '<path class="mk-d" pathLength="100" d="' + d + '"/><path class="mk" pathLength="100" d="' + d + '"/>';
const cm = cls => `<i class="cmark cm-egg ${cls}"><svg viewBox="0 0 40 40">${two(EGGD)}</svg></i>`;
const bird=`<div class="pc po">${C('OST')}</div>`;
const own=n=>`<span class="ic ic-myegg">${cm('is')}<b class="wnum${n<=2?' low':''}">${n}</b></span>`;
const rows = [['own egg, 1',own(1)],['own egg, 14',own(14)],['found egg',`<span class="ic ic-spot">${cm('is')}</span>`],
 ['egg is here',cm('is')],['egg may be here',cm('open')],['own + bird, 1',own(1)+bird],['own + bird, 14',own(14)+bird],
 ['found + bird',`<span class="ic ic-spot">${cm('is')}</span>`+bird],['may be + bird',cm('open')+bird],
 ['carried + bird',`<span class="carry">${cm('is')}</span><span class="wnum">14</span>`+bird],
 ['Carry button icon',`<span style="font-size:17px">${C('CARRYIC')}</span>`]];
const css = ['style','themes','themes2','themes3','squares','signals','vocab','three','part1','bw','egg-layout'].map(c => `<link rel=stylesheet href="../../public/${c}.css">`).join('');
fs.writeFileSync(path.join(__dirname, 'eggs.html'), `<!doctype html><html data-theme="bw"><meta charset=utf-8>${css}<style>html,body{background:#fff!important;color:#000!important}body{margin:10px;font:13px sans-serif}
#board{display:block!important;position:static!important;width:auto!important;height:auto!important;aspect-ratio:auto!important}.irow{position:static!important;display:flex!important;gap:4px;margin:4px 0;align-items:center}
#board .cell{position:relative;width:38px;height:38px;flex:none;display:flex;align-items:center;justify-content:center}.ilab{width:150px;display:block;position:static}#board .ic{position:absolute;inset:8%;display:block}#board .ic svg{width:100%;height:100%}</style>
<body><b>plain square | lit square (real size)</b><div id=board>${rows.map(([n, h]) => `<div class="irow"><span class="ilab">${n}</span><div class="cell" data-eggtest="${n}">${h}</div><div class="cell legal" data-eggtest="${n}">${h}</div></div>`).join('')}</div></body></html>`);
console.log('wrote eggs.html');
