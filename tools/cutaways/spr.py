"""Sprite library: clean high-res RGBA masters from source art (smooth anti-aliased lines)."""
import cv2, numpy as np, os, json, hashlib
from functools import lru_cache
CACHE='/workspace/bw/scenes/rebuild/cache'; os.makedirs(CACHE,exist_ok=True)
def _read(path):
    im=cv2.imread(path,cv2.IMREAD_UNCHANGED)
    if im is None: raise FileNotFoundError(path)
    if im.ndim==2: g=im.astype(np.float32)/255; a=None
    elif im.shape[2]==4:
        g=cv2.cvtColor(im[...,:3],cv2.COLOR_BGR2GRAY).astype(np.float32)/255; a=im[...,3].astype(np.float32)/255
        g=g*a+(1-a)
    else: g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)/255; a=None
    return g,a
def smoothstep(x): x=np.clip(x,0,1); return x*x*(3-2*x)
class Sprite:
    def __init__(self,name,src,flip=False,erase=(),thr=None,raw=None,crop=None,draw=None,fill_from=None,add=(),tone=False):
        self.name=name; self.src=src; self.flip=flip; self.erase=list(erase); self.crop=crop; self.draw=draw; self.add=list(add); self.tone=tone
        self.raw=src.lower().endswith('.jpg') if raw is None else raw
        self.thr=thr if thr is not None else (0.59 if self.raw else 0.5)
    def key(self):
        return hashlib.md5(json.dumps([self.src,self.flip,self.erase,self.thr,self.raw,self.crop,self.add,os.path.getmtime(self.src) if os.path.exists(self.src) else 0]+(['tone'] if self.tone else [])).encode()).hexdigest()[:10]
    @lru_cache(None)
    def base(self):
        """returns gray G (1=white) and fill F (0/1) at source res, after crop/flip/erase"""
        if self.draw is not None:
            G,F=self.draw(); return G,F
        g,a=_read(self.src)
        if self.raw:
            g=cv2.medianBlur((g*255).astype(np.uint8),3).astype(np.float32)/255
            # autocontrast-ish like the approved clean (cutoff 2%)
            lo,hi=np.percentile(g,2),np.percentile(g,98)
            if hi-lo>0.2: g=np.clip((g-lo)/(hi-lo),0,1)
        g=g.copy()
        for poly in self.erase:
            m=np.zeros(g.shape,np.uint8); cv2.fillPoly(m,[np.array(poly,np.int32)],1); g[m>0]=1.0
        for op in self.add:   # ('line', [[x,y],...], width) drawn black, in source coords (pre-crop, pre-flip)
            if op[0]=='line':
                pts=np.array(op[1],np.float32)
                big=np.ones((g.shape[0]*4,g.shape[1]*4),np.float32)
                cv2.polylines(big,[np.round(pts*4).astype(np.int32)],False,0.0,int(op[2]*4),cv2.LINE_AA)
                g=np.minimum(g,cv2.resize(big,(g.shape[1],g.shape[0]),interpolation=cv2.INTER_AREA))
        if self.crop:
            x0,y0,x1,y1=self.crop; g=g[y0:y1,x0:x1]; a=None if a is None else a[y0:y1,x0:x1]
        ink=(g<self.thr).astype(np.uint8)
        if a is not None and not self.raw:
            F=(a>0.5).astype(np.uint8)
        else:
            cl=cv2.morphologyEx(ink,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
            h,w=cl.shape; m=(1-cl).astype(np.uint8)*255
            pad=cv2.copyMakeBorder(m,1,1,1,1,cv2.BORDER_CONSTANT,value=255)
            ff=np.zeros((h+4,w+4),np.uint8); cv2.floodFill(pad,ff,(0,0),128)
            ext=(pad[1:-1,1:-1]==128); F=(~ext).astype(np.uint8)
        if self.flip: g=g[:,::-1].copy(); F=F[:,::-1].copy()
        return g,F
    def size(self):
        g,_=self.base(); return g.shape[1],g.shape[0]
    def master(self,out_w):
        """RGBA uint8 at width out_w (height proportional)"""
        out_w=int(out_w); sw,sh=self.size(); out_h=max(1,int(round(sh*out_w/sw)))
        fn=f'{CACHE}/{self.name}-{self.key()}-{out_w}.png'
        if os.path.exists(fn): return cv2.imread(fn,cv2.IMREAD_UNCHANGED)
        g,F=self.base(); f=out_w/sw
        u=max(1.0,2*f); W,H=int(round(sw*u)),int(round(sh*u))
        work=cv2.resize(g,(W,H),interpolation=cv2.INTER_CUBIC if u>1 else cv2.INTER_AREA) if u!=1 else g.copy()
        sig=0.55*u
        work=cv2.GaussianBlur(work,(0,0),sig)
        wdt=0.16
        ink=smoothstep(((self.thr+wdt)-work)/(2*wdt))
        ink=cv2.resize(ink,(out_w,out_h),interpolation=cv2.INTER_AREA)
        Fw=cv2.resize(F.astype(np.float32),(W,H),interpolation=cv2.INTER_LINEAR)
        Fw=cv2.GaussianBlur(Fw,(0,0),0.8*u); Fw=(Fw>0.5).astype(np.float32)
        Fo=cv2.resize(Fw,(out_w,out_h),interpolation=cv2.INTER_AREA)
        A=np.maximum(Fo,ink); C=np.where(A>1e-4,(A-ink)/np.maximum(A,1e-4),0)
        if self.tone:   # keep a grey fill (the egg-smash stone): fill colour from the source, ink stays black
            gf=np.where(g<self.thr+0.1,np.nan,g).astype(np.float32); fillv=np.nanmedian(gf) if np.isfinite(gf).any() else 1.0
            gt=np.where(np.isnan(gf),fillv,gf).astype(np.float32)
            T=cv2.resize(cv2.GaussianBlur(gt,(0,0),1.0),(out_w,out_h),interpolation=cv2.INTER_AREA)
            C=C*np.clip(T,0,1)
        c8=np.clip(C*255+0.5,0,255).astype(np.uint8); a8=np.clip(A*255+0.5,0,255).astype(np.uint8)
        rgba=cv2.merge([c8,c8,c8,a8]); cv2.imwrite(fn,rgba); return rgba
