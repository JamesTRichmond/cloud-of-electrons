"""Make poems.public.json from poems.json: public poems only.
Lines over 120 chars are split at sentence ends, then at , ; : — (max ~110).
Every word and punctuation mark is checked against the original."""
import json,re,sys
SRC=sys.argv[1] if len(sys.argv)>1 else 'poems.json'
OUT=sys.argv[2] if len(sys.argv)>2 else 'story/poems.public.json'
def soft(l):
  if len(l)<=120: return [l]
  out=[];cur=''
  for s in re.split(r'(?<=[,;:—])\s+',l):
    if cur and len(cur)+1+len(s)>110: out.append(cur);cur=s
    else: cur=(cur+' '+s).strip()
  return out+[cur]
pub=[dict(q) for q in json.load(open(SRC)) if q.get('public')]
for q in pub:
  out=[]
  for l in q['text'].split('\n'):
    for s in (re.split(r'(?<=[.!?])\s+(?=\S)',l) if len(l)>120 else [l]): out+=soft(s)
  assert ''.join(out).replace(' ','')==q['text'].replace('\n','').replace(' ',''),q['id']
  q['text']='\n'.join(out);q['lines']=len(out)
json.dump(pub,open(OUT,'w'),ensure_ascii=False,indent=1)
print(len(pub),'public poems written to',OUT)
