"""Build site/glyphs/ from a poems JSON file. Only poems with public: true are included.
Usage: python3 tools/make_glyphs.py /path/to/poems.json
Letters come out at one fixed size (CAP world units) no matter how long the line is,
sampled densely from the solid interior of each stroke so they read crisply."""
import json,re,sys,os,textwrap
import numpy as np
from PIL import Image,ImageDraw,ImageFont
HERE=os.path.dirname(__file__);OUT=os.path.join(HERE,'..','site','glyphs')
FONT=os.path.join(HERE,'..','site','SourceSerif4.ttf')
PX=96          # raster size in pixels
CAP=0.085      # world units per raster em (sets on-screen letter size)
DENS=0.2      # points per inked pixel at PX
MAXN=7000
WRAP=46       # longer lines wrap so letter size never shrinks
rng=np.random.default_rng(11)
font=ImageFont.truetype(FONT,PX)
def points(lines):
    lh=int(PX*1.3);w=max(int(font.getlength(l)) for l in lines)+8;h=lh*len(lines)+8
    im=Image.new('L',(w,h),0);d=ImageDraw.Draw(im)
    for i,l in enumerate(lines):d.text((4,4+i*lh),l,font=font,fill=255)
    a=np.array(im)>140;ys,xs=np.nonzero(a)
    n=int(min(MAXN,max(800,len(xs)*DENS)))
    idx=rng.choice(len(xs),n,replace=n>len(xs))
    x=xs[idx]+rng.uniform(-.5,.5,n);y=ys[idx]+rng.uniform(-.5,.5,n)
    s=CAP/PX;return np.stack([(x-w/2)*s,-(y-h/2)*s],1)
def main(src):
    P=[p for p in json.load(open(src)) if p.get('public') in (True,'True','true')]
    os.makedirs(OUT,exist_ok=True)
    for f in os.listdir(OUT):os.remove(os.path.join(OUT,f))
    allg=[];man=[]
    for p in P:
        st=[s for s in re.split(r'\n\s*\n',p['text']) if s.strip()];gs=[]
        for s in st:
            ls=[w for l in s.split('\n') if l.strip() for w in textwrap.wrap(l.strip(),WRAP)]
            for i in range(0,len(ls),4):gs.append((ls[i:i+4],points(ls[i:i+4])))
        allg.append((p,gs))
    scale=max(float(np.abs(g).max()) for _,gs in allg for _,g in gs)*1.001
    for p,gs in allg:
        off=0;groups=[];buf=[]
        for lines,g in gs:
            q=np.round(g/scale*32767).astype('<i2');buf.append(q)
            groups.append({'lines':lines,'offset':off,'count':len(q)});off+=len(q)
        fn=f"glyphs/{p['id']}.bin";np.concatenate(buf).tofile(os.path.join(OUT,os.path.basename(fn)))
        man.append({'id':p['id'],'section':p.get('section'),'file':fn,'groups':groups})
    json.dump({'scale':round(scale,5),'poems':man},open(os.path.join(OUT,'manifest.json'),'w'))
    print(len(man),'poems; scale',scale,'max points',max(g['count'] for m in man for g in m['groups']))
if __name__=='__main__':main(sys.argv[1])
