import os,json,re,unicodedata
from docx import Document
from striprtf.striprtf import rtf_to_text
root="/workspace/poetry/Poetry & Prose"
out=[];seen={}
for dp,_,fs in os.walk(root):
  for f in sorted(fs):
    p=os.path.join(dp,f);ext=f.rsplit('.',1)[-1].lower() if '.' in f else ''
    try:
      if ext=='txt': t=open(p,encoding='utf-8',errors='replace').read()
      elif ext=='docx': t="\n".join(x.text for x in Document(p).paragraphs)
      elif ext=='rtf': t=rtf_to_text(open(p,errors='replace').read())
      else: continue
    except Exception as e: print("FAIL",p,e);continue
    t=t.replace('\r\n','\n').strip('\n')
    if not t.strip(): continue
    key=re.sub(r'\s+',' ',t).strip()
    rel=os.path.relpath(p,root)
    if key in seen: seen[key]['duplicates'].append(rel);continue
    first=next((l.strip() for l in t.split('\n') if l.strip()),'')
    title=os.path.splitext(f)[0]
    e={"id":re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',rel.lower())).strip('-'),"title":title,"source":rel,"firstLine":first[:120],"lines":len(t.split('\n')),"words":len(t.split()),"text":t,"public":False,"duplicates":[]}
    seen[key]=e;out.append(e)
json.dump(out,open('/workspace/coe/poems.json','w'),ensure_ascii=False,indent=1)
with open('/workspace/coe/story/poem-list.md','w') as m:
  m.write("| # | Title | First line | Words | Source |\n|---|---|---|---|---|\n")
  for i,e in enumerate(out,1): m.write(f"| {i} | {e['title']} | {e['firstLine'].replace('|','/')} | {e['words']} | `{e['source']}` |\n")
print(len(out),"unique")
