import json, os, sys, urllib.request, time
sys.path.insert(0, 'scripts'); from rv_en_es import EN, ES, PRIV_EN, PRIV_ES
NAMES = {'pt':'Brazilian Portuguese','fr':'French','de':'German','it':'Italian','zh':'Simplified Chinese','ja':'Japanese','ko':'Korean','hi':'Hindi','ar':'Arabic','ru':'Russian','tr':'Turkish'}
UPD = {'en': 'Last updated: October 21, 2026', 'es': 'Última actualización: 21 de octubre de 2026'}
def tr(lang):
  src = {'rv': EN, 'priv': PRIV_EN, 'updated': UPD['en']}
  prompt = f"Translate the string values of this JSON from English to {NAMES[lang]} for a friendly nutrition and wellness app (the 'priv' part is its privacy policy: keep it precise). Keep keys, {{{{n}}}} placeholders, emails, brand names and emoji unchanged. Keep the same array shapes. No medical claims. Output ONLY the JSON.\n\n" + json.dumps(src, ensure_ascii=False)
  body = json.dumps({"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"responseMimeType":"application/json","temperature":0.2}}).encode()
  for m in ['gemini-flash-latest','gemini-flash-lite-latest']*3:
    try:
      r = urllib.request.urlopen(urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent", body, {'Content-Type':'application/json','x-goog-api-key':os.environ['GEMINI_API_KEY']}), timeout=180)
      o = json.loads(json.load(r)['candidates'][0]['content']['parts'][0]['text'])
      assert set(o['rv']) == set(EN) and len(o['priv']) == len(PRIV_EN) and all(len(x) == 2 for x in o['priv']) and '{{n}}' in o['rv']['fUnblock']; return o
    except Exception as e: print(lang, m, str(e)[:80]); time.sleep(5)
  raise SystemExit('fail '+lang)
from concurrent.futures import ThreadPoolExecutor
langs = [f[:-5] for f in sorted(os.listdir('src/locales'))]
def do(l):
  o = {'rv': EN, 'priv': PRIV_EN, 'updated': UPD['en']} if l == 'en' else {'rv': ES, 'priv': PRIV_ES, 'updated': UPD['es']} if l == 'es' else tr(l)
  return l, o
with ThreadPoolExecutor(6) as ex:
  for l, o in ex.map(do, langs):
    p = 'src/locales/' + l + '.json'; d = json.load(open(p)); d['rv'] = o['rv']; d['docs']['privacy']['sections'] = o['priv']; d['docs']['privacy']['updated'] = o['updated']
    json.dump(d, open(p, 'w'), ensure_ascii=False, indent=2); open(p, 'a').write('\n'); print('ok', l)
