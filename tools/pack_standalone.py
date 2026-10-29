"""Pack site/ into one self-contained HTML file that runs when opened from disk.
Usage: python3 tools/pack_standalone.py [out.html]"""
import json,base64,sys,os
D=os.path.join(os.path.dirname(__file__),'..','site')
r=lambda f,m='r':open(os.path.join(D,f),m).read()
s=r('index.html')
m=r('motion.js').replace('export const','const').replace('export function','function').replace('export class','class')
names=s.split("import {")[1].split("}")[0]
s=s.replace("import {"+names+"} from './motion.js';","const {"+names+"}=(()=>{"+m+"\nreturn {"+names+"};})();")
man=json.loads(r('glyphs/manifest.json'))
bins={p['file']:base64.b64encode(r(p['file'],'rb')).decode() for p in man['poems']}
s=s.replace("const [att,man]=await Promise.all([fetch('attractors.json').then(r=>r.json()),fetch('glyphs/manifest.json').then(r=>r.json())]);",
 "const att="+r('attractors.json').strip()+",man="+json.dumps(man)+",BINS="+json.dumps(bins)+";")
s=s.replace("new Int16Array(await (await fetch(f)).arrayBuffer())","new Int16Array(Uint8Array.from(atob(BINS[f]),c=>c.charCodeAt(0)).buffer)")
s=s.replace("const OF=await fetch('openfield.json').then(r=>r.json());","const OF="+r('openfield.json').strip()+";")
s=s.replace("const REG=await fetch('regions.json').then(r=>r.json())","const REG="+r('regions.json').strip())
s=s.replace("fetch('pause-map.json').then(r=>r.ok?r.json():null)","Promise.resolve("+r('pause-map.json').strip()+")")
s=s.replace("fetch('poem-segments.json').then(r=>r.ok?r.json():null)","Promise.resolve("+r('poem-segments.json').strip()+")")
s=s.replace("src:url(SourceSerif4.ttf)","src:url(data:font/ttf;base64,"+base64.b64encode(r('SourceSerif4.ttf','rb')).decode()+")")
out=sys.argv[1] if len(sys.argv)>1 else 'cloud-of-electrons.html'
open(out,'w').write(s);print(out,len(s))
