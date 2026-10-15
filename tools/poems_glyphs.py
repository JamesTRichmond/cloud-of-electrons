import json,re,sys
sys.path.insert(0,'.')
from glyph_sampler import text_points
import os
SRC=os.environ.get('POEMS','/workspace/coe/story/poems.public.json')
P=[p for p in json.load(open(SRC)) if p.get('public',True) in (True,'True','true')]
idx=[]
for p in P:
    stanzas=[s for s in re.split(r'\n\s*\n',p['text']) if s.strip()]
    groups=[]
    for s in stanzas:
        ls=[l for l in s.split('\n') if l.strip()]
        for i in range(0,len(ls),4): groups.append(ls[i:i+4])
    out=[]
    for g in groups:
        n=min(6000,max(1500,sum(len(l) for l in g)*40))
        out.append({"lines":g,"points":text_points(g,n=n)})
    json.dump({"id":p['id'],"section":p.get('section'),"groups":out},open(f"glyphs/{p['id']}.json","w"))
    idx.append({"id":p['id'],"groups":len(out),"file":f"glyphs/{p['id']}.json"})
json.dump(idx,open('glyphs/index.json','w'),indent=1)
print(len(idx),sum(i['groups'] for i in idx))
