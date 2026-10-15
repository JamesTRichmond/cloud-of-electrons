import json, math, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
rng=np.random.default_rng(7)
FONT="/workspace/coe/modeler/SourceSerif4.ttf"
N=4000
def shape(kind,n=N):
    if kind=="haze":
        p=rng.normal(0,0.45,(n,3)); p[:,1]*=0.6
    elif kind=="lattice":
        g=np.linspace(-0.5,0.5,6); pts=np.array([[x,y,z] for x in g for y in g for z in g])
        p=pts[rng.integers(0,len(pts),n)]+rng.normal(0,0.012,(n,3))
    elif kind=="vein":
        t=rng.uniform(0,1,n); x=t*2-1
        y=0.25*np.sin(t*7)+0.08*np.sin(t*23); z=0.15*np.cos(t*5)
        p=np.stack([x,y,z],1)+rng.normal(0,0.02,(n,3))
    elif kind=="clash":
        h=n//2; a=rng.normal(0,0.18,(h,3))+[-0.3,0,0]; b=rng.normal(0,0.18,(n-h,3))+[0.3,0,0]
        p=np.vstack([a,b])
    elif kind=="shell":
        u=rng.normal(size=(n,3)); u/=np.linalg.norm(u,axis=1,keepdims=True)
        p=u*0.5*(1+0.04*rng.normal(size=(n,1)))
    return np.round(p,4).tolist()
def text_points(lines,n=N,size=64):
    font=ImageFont.truetype(FONT,size); lh=int(size*1.3)
    w=max(int(font.getlength(l)) for l in lines)+20; h=lh*len(lines)+20
    im=Image.new("L",(w,h),0); d=ImageDraw.Draw(im)
    for i,l in enumerate(lines): d.text((10,10+i*lh),l,font=font,fill=255)
    a=np.array(im)>127; ys,xs=np.nonzero(a)
    # weight edge pixels higher for crisp strokes
    edge=np.zeros_like(a); edge[1:-1,1:-1]=a[1:-1,1:-1]&~(a[:-2,1:-1]&a[2:,1:-1]&a[1:-1,:-2]&a[1:-1,2:])
    wts=np.where(edge[ys,xs],3.0,1.0); wts/=wts.sum()
    idx=rng.choice(len(xs),n,p=wts)
    s=2.0/w
    x=(xs[idx]-w/2)*s; y=-(ys[idx]-h/2)*s
    return np.round(np.stack([x,y,np.zeros(n)],1),4).tolist()
if __name__=="__main__":
    att=json.load(open("/workspace/coe/test-cloud/attractors.json"))
    out={a["id"]:{"shape":a["shape"],"points":shape(a["shape"])} for a in att["attractors"]}
    json.dump(out,open("shapes.json","w"))
    demo=text_points(["sample line one","sample line two"])
    json.dump({"demo":demo},open("glyphs.demo.json","w"))
    # preview
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    fig,ax=plt.subplots(1,6,figsize=(18,3),facecolor="#05070D")
    for i,(k,v) in enumerate(out.items()):
        P=np.array(v["points"]); ax[i].scatter(P[:,0],P[:,1],s=0.3,c="#EDE6D6"); ax[i].set_title(k,color="w")
    P=np.array(demo); ax[5].scatter(P[:,0],P[:,1],s=0.3,c="#EDE6D6"); ax[5].set_title("glyph sampler",color="w")
    for a in ax: a.set_facecolor("#05070D"); a.set_aspect("equal"); a.axis("off")
    plt.savefig("preview.png",dpi=90,facecolor="#05070D")
