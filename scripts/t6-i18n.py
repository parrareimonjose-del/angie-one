import json, os, sys, urllib.request, time
sys.path.insert(0, 'scripts'); from t6_en_es import EN, ES
NAMES = {'pt':'Brazilian Portuguese','fr':'French','de':'German','it':'Italian','zh':'Simplified Chinese','ja':'Japanese','ko':'Korean','hi':'Hindi','ar':'Arabic','ru':'Russian','tr':'Turkish'}
def tr(lang):
  prompt = f"Translate the string values of this JSON from English to {NAMES[lang]} for a friendly nutrition and wellness app. Keep keys, {{{{n}}}} and {{{{list}}}} placeholders and emoji unchanged. Keep it natural, warm and simple; no medical claims. Output ONLY the JSON.\n\n" + json.dumps(EN, ensure_ascii=False)
  body = json.dumps({"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"responseMimeType":"application/json","temperature":0.2}}).encode()
  for m in ['gemini-flash-latest','gemini-flash-lite-latest']*3:
    try:
      r = urllib.request.urlopen(urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent", body, {'Content-Type':'application/json','x-goog-api-key':os.environ['GEMINI_API_KEY']}), timeout=120)
      j = json.load(r); return json.loads(j['candidates'][0]['content']['parts'][0]['text'])
    except Exception as e: print(lang, m, str(e)[:80]); time.sleep(5)
  raise SystemExit('fail '+lang)
def same(a, b): return isinstance(a, dict) and isinstance(b, dict) and set(a) == set(b) and all(same(a[k], b[k]) if isinstance(a[k], dict) else isinstance(b[k], str) for k in a)
for f in sorted(os.listdir('src/locales')):
  l = f[:-5]; d = json.load(open('src/locales/' + f))
  if 't6' in d and same(EN, d['t6']): continue
  v = EN if l == 'en' else ES if l == 'es' else tr(l)
  assert same(EN, v), l
  d['t6'] = v; json.dump(d, open('src/locales/' + f, 'w'), ensure_ascii=False, indent=2); open('src/locales/' + f, 'a').write('\n'); print('ok', l)
