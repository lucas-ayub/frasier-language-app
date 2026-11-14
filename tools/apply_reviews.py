"""Aplica as revisões humanas/IA de tools/reviews/<par>.json nos dados de data/<par>/.

Formato de tools/reviews/<par>.json:
  {"reviewed_upto": 15213,                       # frases 0..N-1 (ordem da trilha Geral) já revisadas
   "fix":    {"<id_tatoeba>": {"orig": "...", "nova": "..."}},   # tradução corrigida
   "remove": [<id_tatoeba>, ...]}                                 # frase escondida do app

As correções são guardadas pelo id do Tatoeba, então sobrevivem a uma nova geração dos dados.
Uma correção só é aplicada se a tradução atual ainda for a original revisada.
Uso: python tools/apply_reviews.py   (também é chamado no fim de build_courses.py)
"""
import json, os, glob

def apply(out='data', reviews='tools/reviews'):
    for f in sorted(glob.glob(os.path.join(reviews, '*.json'))):
        pair = os.path.basename(f)[:-5]
        d = os.path.join(out, pair)
        if not os.path.exists(os.path.join(d, 'index.json')): continue
        rv = json.load(open(f, encoding='utf-8'))
        fix, remove = rv.get('fix', {}), set(int(x) for x in rv.get('remove', []))
        idx = json.load(open(os.path.join(d, 'index.json')))
        hidden, fixed, n = [], 0, 0
        for c in range((idx['total'] + idx['chunk'] - 1) // idx['chunk']):
            p = os.path.join(d, f'c{c}.json')
            rows = json.load(open(p, encoding='utf-8')); changed = False
            for r in rows:
                t = str(r[4])
                if r[4] in remove: hidden.append(n)
                elif t in fix and fix[t].get('nova') and r[1] in (fix[t].get('orig'), fix[t]['nova']):
                    if r[1] != fix[t]['nova']: r[1] = fix[t]['nova']; changed = True
                    fixed += 1
                n += 1
            if changed: json.dump(rows, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        idx['hidden'] = hidden
        idx['reviewed'] = rv.get('reviewed_upto', 0)
        json.dump(idx, open(os.path.join(d, 'index.json'), 'w'))
        tp = os.path.join(d, 'tracks.json')
        if os.path.exists(tp) and hidden:
            hs = set(hidden); tr = json.load(open(tp, encoding='utf-8'))
            for t in tr['tracks']:
                for s in t['subs']: s['ids'] = [i for i in s['ids'] if i not in hs]
            json.dump(tr, open(tp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        print(pair, 'revisadas até', idx['reviewed'], '| corrigidas', fixed, '| escondidas', len(hidden))

if __name__ == '__main__':
    apply()
