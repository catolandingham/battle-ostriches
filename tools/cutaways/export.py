"""Build every cutaway: sprite WebPs + public/cutaway-scenes.js in the repo copy, and preview sheets."""
import sys, os, json, math, io, glob, numpy as np, cv2
sys.path.insert(0,'/workspace/bw/scenes/rebuild/tools')
import scenes as SC, render as R
from PIL import Image
REPO='/workspace/bw/scenes/rebuild/repo'; ARTDIR=REPO+'/public/art/cutaways'
PREV='/workspace/bw/scenes/rebuild/previews'; os.makedirs(PREV,exist_ok=True)
only=sys.argv[1].split(',') if len(sys.argv)>1 and sys.argv[1]!='all' else None
noart='--noart' in sys.argv
canv={}
for sid,(fn,rect) in SC.SCENES.items():
    canv[sid]=R.to_canvas(rect, fn())
widths=R.need_widths(list(canv.values()))
problems={}
for sid,cv in canv.items():
    b=R.bounds_report(sid,cv)
    if b: problems[sid]=b
print('OUT OF CARD:',str(problems)[:4000])
if not noart:
    os.makedirs(ARTDIR,exist_ok=True)
    for f in glob.glob(ARTDIR+'/*.png')+glob.glob(ARTDIR+'/*.webp'): os.remove(f)
    sizes={}
    for n,w in sorted(widths.items()):
        m=SC.SP[n].master(w)
        im=Image.fromarray(cv2.cvtColor(m,cv2.COLOR_BGRA2RGBA))
        p=f'{ARTDIR}/{n}.webp'; im.save(p,'WEBP',lossless=True,method=6); sizes[n]=os.path.getsize(p)
    json.dump(sizes,open(PREV+'/sizes.json','w'),indent=1)
# scene data
out={'w':R.CW,'h':R.CH,'sprites':{n:'/art/cutaways/'+n+'.webp' for n in sorted(widths)},'scenes':{}}
for sid,cv in canv.items():
    names=sorted({l[0] for ls in cv for l in ls})
    steps=[]
    for ls in cv:
        st=[]
        for (n,X,Y,S,rot,a) in ls:
            sw,sh=SC.SP[n].size(); row=[names.index(n),round(X,2),round(Y,2),round(sw*S,2),round(sh*S,2)]
            if rot or a<1: row+= [round(rot,2)]
            if a<1: row+=[round(a,3)]
            st.append(row)
        steps.append(st)
    out['scenes'][sid]={'sprites':names,'steps':steps}
js=('// Made by tools/cutaways/export.py from the approved scene art. Do not edit by hand.\n'
    '// Each scene: the drawings it uses, then one list of drawings per 50 ms step:\n'
    '// [drawing, x, y, width, height, turn (degrees, counter-clockwise), opacity], on a 336 x 412 card.\n'
    '(function (root) {\n  const ART = '+json.dumps(out,separators=(',',':'))+';\n'
    "  if (typeof module !== 'undefined') module.exports = ART;\n  if (root) root.CUTAWAY_ART = ART;\n"
    "})(typeof window === 'undefined' ? null : window);\n")
open(REPO+'/public/cutaway-scenes.js','w').write(js)
print('scene data bytes',len(js))
# previews
for sid,cv in canv.items():
    if only and sid not in only: continue
    d=f'{PREV}/{sid}'; os.makedirs(d,exist_ok=True)
    thumbs=[]
    for fi,ls in enumerate(cv):
        o=(R.render_frame(ls,widths)*255).astype(np.uint8); cv2.imwrite(f'{d}/{fi:02d}.png',o)
        t=cv2.resize(o,(168,206),interpolation=cv2.INTER_AREA); t=cv2.copyMakeBorder(t,1,1,1,1,cv2.BORDER_CONSTANT,value=0)
        cv2.putText(t,str(fi),(4,14),cv2.FONT_HERSHEY_SIMPLEX,0.4,0,1); thumbs.append(t)
    while len(thumbs)%10: thumbs.append(np.full_like(thumbs[0],128))
    rows=[np.hstack(thumbs[i:i+10]) for i in range(0,len(thumbs),10)]
    cv2.imwrite(f'{PREV}/sheet_{sid}.png',np.vstack(rows))
print('done')
