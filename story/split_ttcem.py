import json,re
from docx import Document
P=Document("Thoughts That Couldn't Escape Me - Draft 1.docx").paragraphs
L=[p.text for p in P]
titles=[13,56,111,132,170,188,213,239,266,285,319,339,374,391,592,622,651,673,696]
sect={9:"What Passes Through",235:"What Sticks Around",588:"What Circles Back"}
d=json.load(open('/workspace/coe/poems.json'))
d=[e for e in d if e.get('collection')!='ttcem']
new=[]
for k,s in enumerate(titles):
  end=titles[k+1] if k+1<len(titles) else len(L)
  for h in sect:
    if s<h<end: end=h
  body=L[s+1:end]
  while body and (not body[-1].strip() or re.fullmatch(r'[IVX]+\.',body[-1].strip())): body.pop()
  while body and not body[0].strip(): body.pop(0)
  section=[v for h,v in sect.items() if h<s][-1]
  t="\n".join(body)
  title=L[s].strip()
  new.append({"id":"ttcem-"+re.sub(r'[^a-z0-9]+','-',title.lower()).strip('-'),"title":title,"collection":"ttcem","section":section,"source":"Thoughts That Couldn't Escape Me - Draft 1.docx","firstLine":next(x.strip() for x in body if x.strip())[:120],"lines":len(body),"words":len(t.split()),"text":t,"public":True,"duplicates":[]})
json.dump(d+new,open('/workspace/coe/poems.json','w'),ensure_ascii=False,indent=1)
for e in new: print(f"{e['section'][:12]:12} | {e['title']:45} | {e['words']:4} | {e['firstLine'][:50]}")
