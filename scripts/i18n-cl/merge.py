import json,os,sys
d=os.path.dirname(os.path.abspath(__file__)); loc=os.path.join(d,'..','..','src','locales')
for l in ['es','en','pt','fr','de','it','zh','ja','ko','hi','ar','ru','tr']:
  f=os.path.join(d,l+'.json')
  if not os.path.exists(f): print('missing',l); continue
  add=json.load(open(f)); p=os.path.join(loc,l+'.json'); base=json.load(open(p)); base.update(add)
  json.dump(base,open(p,'w'),ensure_ascii=False,indent=2); print('merged',l)
