import json,os,sys,urllib.request,re
key=[l.split('=',1)[1].strip() for l in open('/workspace/angie-one/.env') if l.startswith('GEMINI_API_KEY=')][0]
en=open('/workspace/angie-one-wt/scripts/i18n-cl/en.json').read()
names={'pt':'Brazilian Portuguese','fr':'French','de':'German','it':'Italian','zh':'Simplified Chinese','ja':'Japanese','ko':'Korean','hi':'Hindi','ar':'Arabic','ru':'Russian','tr':'Turkish'}
model=sys.argv[1]
for l in sys.argv[2:]:
  out=f'/workspace/angie-one-wt/scripts/i18n-cl/{l}.json'
  if os.path.exists(out): continue
  p=f"Translate the JSON values into {names[l]} for a friendly, warm, no-guilt nutrition app. Keep keys, keep {{{{placeholders}}}} exactly, keep emoji, brand names (Angie One, Etsy, WhatsApp, Garmin, Fitbit, Samsung Health, Spotify, Apple Health, Health Connect) and 'kcal'. Short and simple. Return only JSON.\n\n"+en
  body=json.dumps({"contents":[{"parts":[{"text":p}]}],"generationConfig":{"responseMimeType":"application/json","temperature":0.2}}).encode()
  r=urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",data=body,headers={'Content-Type':'application/json','x-goog-api-key':key})
  try:
    o=json.load(urllib.request.urlopen(r,timeout=180)); t=o['candidates'][0]['content']['parts'][0]['text']
    json.loads(t); open(out,'w').write(t); print(l,'ok')
  except Exception as e: print(l,'ERR',str(e)[:150])
