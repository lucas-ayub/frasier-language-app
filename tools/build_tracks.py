"""Gera as trilhas "Primeiros passos" e "Gramática" em data/<par>/tracks2.json (carregado depois do início do app) a partir dos dados já prontos.

As regras ficam em tools/tracks/<idioma-alvo>.json (escritas por professores/agentes especialistas):
cada tema tem um regex com o grupo (?P<w>...) = a palavra que fica escondida, e as alternativas da múltipla escolha.
Não precisa baixar o Tatoeba: roda sobre data/. É chamado no fim de build_courses.py e pode rodar sozinho:
  python tools/build_tracks.py
"""
import json, os, re, glob

MAX_PER_SUB, MIN_PER_SUB = 1500, 60
META = {'basico': ('Primeiros passos', '🧱'), 'gramatica': ('Gramática', '📐')}

def build(out='data', rules='tools/tracks'):
    for d in sorted(glob.glob(os.path.join(out, '*-*'))):
        pair = os.path.basename(d); tgt = pair.split('-')[1]
        rf = os.path.join(rules, tgt + '.json'); tp = os.path.join(d, 'tracks2.json')
        if not os.path.exists(rf) or not os.path.exists(os.path.join(d, 'index.json')): continue
        idx = json.load(open(os.path.join(d, 'index.json'))); hidden = set(idx.get('hidden', []))
        rows = []
        for c in range((idx['total'] + idx['chunk'] - 1) // idx['chunk']):
            rows += json.load(open(os.path.join(d, f'c{c}.json'), encoding='utf-8'))
        spec = json.load(open(rf, encoding='utf-8'))
        new, report = [], []
        for tr in spec['tracks']:
            subs = []
            for s in tr['subs']:
                fl = 0 if s.get('case') else re.I
                rx = re.compile(s['pattern'], fl); ex = re.compile(s['exclude'], fl) if s.get('exclude') else None
                opt = s.get('options'); omap = {k.lower(): v for k, v in opt.items()} if isinstance(opt, dict) else None
                ids, cz = [], []
                for n, r in enumerate(rows):
                    if n in hidden: continue
                    t = r[0]
                    if ex and ex.search(t): continue
                    for m in rx.finditer(t):
                        w = m.group('w')
                        if not w or ' ' in w: continue
                        if omap is not None and w.lower() not in omap: continue
                        ids.append(n); cz.append([m.start('w'), len(w)]); break
                    if len(ids) >= MAX_PER_SUB: break
                report.append(f"{tr['id']}.{s['id']}={len(ids)}")
                if len(ids) < MIN_PER_SUB: continue
                o = {'id': s['id'], 'name': s['name'], 'ids': ids, 'cz': cz}
                if s.get('desc'): o['desc'] = s['desc']
                if omap is not None: o['omap'] = omap
                elif isinstance(opt, list): o['opts'] = opt
                subs.append(o)
            if subs:
                name, icon = META.get(tr['id'], (tr.get('name', tr['id']), tr.get('icon', '📚')))
                new.append({'id': tr['id'], 'name': name, 'icon': icon, 'subs': subs})
        json.dump({'tracks': new}, open(tp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        print(pair, ' '.join(report))

if __name__ == '__main__':
    build()
