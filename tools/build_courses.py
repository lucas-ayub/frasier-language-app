"""Monta os cursos do Frasier (pares de idiomas) a partir das exportações do Tatoeba (CC BY 2.0 FR).

Versão 2 — foco em qualidade:
  * só traduções DIRETAS feitas por pessoas (nada de "telefone sem fio" via inglês);
  * prioriza frases de falantes nativos e com áudio gravado por nativos;
  * descarta frases marcadas pela comunidade (@needs native check, @change, @delete…) ou mal avaliadas;
  * descarta pares com tamanho muito desproporcional (sinal de tradução solta).

Para cada par <fonte>-<alvo> gera em data/<par>/:
  index.json, words.json, cN.json ([frase, tradução, início, tamanho, id_frase, id_tradução]),
  tracks.json (trilhas temáticas), migrate.json (índice antigo -> novo, para converter progresso).
Também gera data/build-report.json e data/qa-sample.json (amostra aleatória para auditoria).
"""
import bz2, tarfile, json, re, os, sys, collections, urllib.request, time, random, shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tracks_def import COMPILED as TRACKS, MAX_PER_SUB, MIN_PER_SUB

BASE = os.environ.get('TATOEBA_BASE', 'https://downloads.tatoeba.org/exports/')
OUT = 'data'
CHUNK = 2000
CAP = 120000
CODE = {'spa': 'es', 'deu': 'de', 'ita': 'it', 'fra': 'fr', 'eng': 'en', 'por': 'pt'}
LANGS = list(CODE)
PAIRS = [('por', 'spa'), ('por', 'deu'), ('por', 'ita'), ('por', 'fra'), ('por', 'eng'),
         ('eng', 'spa'), ('eng', 'deu'), ('eng', 'ita'), ('eng', 'fra')]
BAD_TAGS = {'@needs native check', '@change', '@check', '@delete', '@duplicate', '@neg', '@neg?', '@sp',
            '@check translation', '@not a sentence', '@unclear', '@translation check', 'changed'}
REPORT = {'downloads': {}}

def log(*a): print(*a, flush=True)

def dl(name, optional=False):
    path = '/tmp/' + name.replace('/', '_')
    if os.path.exists(path): return path
    for i in range(4):
        try:
            urllib.request.urlretrieve(BASE + name, path); REPORT['downloads'][name] = 'ok'; return path
        except Exception as e:
            log('retry', name, e); time.sleep(5 * (i + 1))
    REPORT['downloads'][name] = 'falhou'
    if optional: return None
    raise SystemExit('falha ao baixar ' + name)

def tar_lines(path):
    with tarfile.open(path, 'r:bz2') as tf:
        for m in tf.getmembers():
            if not m.isfile(): continue
            for raw in tf.extractfile(m):
                yield raw.decode('utf-8', 'replace').rstrip('\n').split('\t')

# ---------- 1. frases (com dono) ----------
text, lang, owner = {}, {}, {}
for l in LANGS:
    p = dl(f'per_language/{l}/{l}_sentences_detailed.tsv.bz2')
    n = 0
    with bz2.open(p, 'rt', encoding='utf-8') as f:
        for line in f:
            c = line.rstrip('\n').split('\t')
            if len(c) < 3: continue
            i = int(c[0]); text[i] = c[2]; lang[i] = l
            u = c[3] if len(c) > 3 else ''
            if u and u != '\\N': owner[i] = u
            n += 1
    log(l, n, 'frases'); REPORT[l + '_sentences'] = n

# ---------- 2. sinais de qualidade ----------
skill = {}  # (usuário, idioma) -> nível 0..5 (5 = nativo)
p = dl('user_languages.tar.bz2', optional=True)
if p:
    for c in tar_lines(p):
        if len(c) >= 3 and c[0] in CODE and c[1].isdigit(): skill[(c[2], c[0])] = int(c[1])
log('níveis de usuários', len(skill))
bad = set()
p = dl('tags.tar.bz2', optional=True)
if p:
    for c in tar_lines(p):
        if len(c) >= 2 and c[0].isdigit() and c[1].strip().lower() in BAD_TAGS: bad.add(int(c[0]))
log('frases com etiqueta ruim', len(bad))
audio = set()
p = dl('sentences_with_audio.tar.bz2', optional=True)
if p:
    for c in tar_lines(p):
        if c and c[0].isdigit(): audio.add(int(c[0]))
log('frases com áudio', len(audio))
good, neg = collections.Counter(), set()
p = dl('users_sentences.csv', optional=True)
if p:
    with open(p, encoding='utf-8', errors='replace') as f:
        for line in f:
            c = line.rstrip('\n').split('\t')
            if len(c) >= 3 and c[1].isdigit():
                try: m = int(c[2])
                except ValueError: continue
                if m < 0: neg.add(int(c[1]))
                elif m > 0: good[int(c[1])] += 1
log('avaliações:', len(good), 'positivas,', len(neg), 'negativas')
REPORT['signals'] = {'skills': len(skill), 'bad_tags': len(bad), 'audio': len(audio), 'good_reviews': len(good), 'neg_reviews': len(neg)}

def score(i):
    """None = descartar. Quanto maior, mais confiável."""
    if i in bad or i in neg: return None
    l, u = lang[i], owner.get(i)
    s = 0
    if u:
        k = skill.get((u, l))
        if k == 5: s += 3
        elif k == 4: s += 1
        elif k is not None and k <= 3: s -= 3
    if i in audio: s += 2
    s += min(2, good[i])
    return s

# ---------- 3. ligações diretas ----------
need = set((t, s) for s, t in PAIRS) | {(t, 'eng') for _, t in PAIRS if t != 'eng'}
links = {pr: collections.defaultdict(list) for pr in need}   # (alvo, fonte): id_alvo -> [id_fonte]
for c in tar_lines(dl('links.tar.bz2')):
    if len(c) < 2 or not c[0].isdigit() or not c[1].isdigit(): continue
    a, b = int(c[0]), int(c[1])
    la, lb = lang.get(a), lang.get(b)
    if la and lb and (la, lb) in links: links[(la, lb)][a].append(b)
log('ligações', {f'{a}<-{b}': len(v) for (a, b), v in links.items()})

WORD = re.compile(r"[^\W\d_]+")
TOK = {'en': re.compile(r"[^\W\d_]+(?:['’][^\W\d_]+)*"), 'de': WORD, 'it': WORD, 'fr': WORD,
       'es': re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+")}

def ntoks(s): return len(WORD.findall(s))

def best_translation(i, tl, sl, min_score=0):
    best = None
    for j in links[(tl, sl)].get(i, []):
        sj = score(j)
        if sj is None or sj < min_score: continue
        tj = text[j].strip()
        if not tj or tj.lower() == text[i].strip().lower(): continue
        a, b = ntoks(text[i]), ntoks(tj)
        if a == 0 or b == 0 or a / b > 2.6 or b / a > 2.6: continue   # tamanho desproporcional
        if best is None or sj > best[0]: best = (sj, j)
    return best

def english_gloss(i, tl, sl, tr_text):
    if sl == 'eng': return tr_text
    if tl == 'eng': return text[i]
    b = best_translation(i, tl, 'eng')
    return text[b[1]] if b else ''

# ---------- 4. montar cada par ----------
old_cache = {}
def old_ids(code):
    """ids Tatoeba das frases antigas (data/<alvo>/), para converter o progresso."""
    if code in old_cache: return old_cache[code]
    d = os.path.join(OUT, code); ids = None
    if os.path.exists(os.path.join(d, 'index.json')):
        idx = json.load(open(os.path.join(d, 'index.json')))
        ids = []
        for c in range((idx['total'] + idx['chunk'] - 1) // idx['chunk']):
            ids += [r[4] for r in json.load(open(os.path.join(d, f'c{c}.json'), encoding='utf-8'))]
    old_cache[code] = ids
    return ids

qa = {}
random.seed(42)
for sl, tl in PAIRS:
    pair = CODE[sl] + '-' + CODE[tl]; code = CODE[tl]; tok = TOK[code]
    cands = []
    for i, l in lang.items():
        if l != tl: continue
        si = score(i)
        if si is None or si < 0: continue
        s = text[i].strip()
        if any(ch.isdigit() for ch in s): continue
        toks = list(tok.finditer(s))
        if len(toks) < 2 or len(toks) > 22: continue
        bt = best_translation(i, tl, sl)
        if not bt: continue
        cands.append((si + bt[0], i, bt[1]))
    cands.sort(key=lambda x: (-x[0], x[1]))
    seen, rows = set(), []
    for sc, i, j in cands:
        k = text[i].strip().lower()
        if k in seen: continue
        seen.add(k); rows.append((sc, i, j))
        if len(rows) >= CAP: break
    REPORT[pair + '_candidates'] = len(cands)
    dist = collections.Counter(min(sc, 8) for sc, _, _ in rows)
    log(pair, 'frases', len(rows), 'pontuação', sorted(dist.items()))
    freq, propc, parsed = collections.Counter(), collections.Counter(), []
    for sc, i, j in rows:
        s, tr = text[i].strip(), text[j].strip()
        toks = list(tok.finditer(s))
        parsed.append((i, j, s, tr, toks))
        ref = ' ' + tr + ' '
        for t in toks:
            w = t.group(0); lw = w.lower(); freq[lw] += 1
            if w[0].isupper() and re.search(r'(?<![^\W\d_])' + re.escape(w) + r'(?![^\W\d_])', ref): propc[lw] += 1
    proper = {w for w in freq if propc[w] > 0.5 * freq[w]}
    ranked = [w for w, c in freq.most_common() if w not in proper]
    rank = {w: n for n, w in enumerate(ranked)}
    items = collections.defaultdict(list)
    for i, j, s, tr, toks in parsed:
        ok = []
        for t in toks:
            lw = t.group(0).lower()
            if lw not in rank: continue
            if code in ('fr', 'it') and s[t.end():t.end() + 1] in ("'", '’'): continue
            ok.append(t)
        if not ok: continue
        t = max(ok, key=lambda t: rank[t.group(0).lower()])
        items[t.group(0).lower()].append((len(s), [s, tr, t.start(), len(t.group(0)), i, j]))
    bounds = [100, 500, 1000, 2000, 5000, 10000, 10 ** 9]
    names = ['Top 100', 'Top 500', 'Top 1000', 'Top 2000', 'Top 5000', 'Top 10 000', 'Avançado']
    levels = [[] for _ in bounds]
    for w, lst in items.items():
        lst.sort(key=lambda x: x[0])
        li = next(k for k, b in enumerate(bounds) if rank[w] < b)
        levels[li].append((rank[w], lst))
    final, lvinfo = [], []
    for li, lv in enumerate(levels):
        lv.sort(key=lambda x: x[0]); start = len(final); k = 0
        while True:
            added = False
            for r, lst in lv:
                if k < len(lst): final.append(lst[k][1]); added = True
            if not added: break
            k += 1
        lvinfo.append({'name': names[li], 'start': start, 'end': len(final)})
    d = os.path.join(OUT, pair)
    # guarda a ordem e a conversão anteriores para não perder o caminho do progresso antigo
    prev_ids, prev_mig = None, None
    if os.path.exists(os.path.join(d, 'index.json')):
        pi = json.load(open(os.path.join(d, 'index.json')))
        prev_ids = []
        for c in range((pi['total'] + pi['chunk'] - 1) // pi['chunk']):
            prev_ids += [r[4] for r in json.load(open(os.path.join(d, f'c{c}.json'), encoding='utf-8'))]
        if os.path.exists(os.path.join(d, 'migrate.json')): prev_mig = json.load(open(os.path.join(d, 'migrate.json')))
    if os.path.exists(d): shutil.rmtree(d)
    os.makedirs(d)
    for n in range(0, len(final), CHUNK):
        json.dump(final[n:n + CHUNK], open(f'{d}/c{n // CHUNK}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(ranked[:40000], open(f'{d}/words.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump({'total': len(final), 'chunk': CHUNK, 'levels': lvinfo, 'dv': 2, 'pair': pair}, open(f'{d}/index.json', 'w'))
    gloss = [english_gloss(r[4], tl, sl, r[1]) for r in final]
    out = []
    for tid, tname, icon, subs in TRACKS:
        osubs = []
        for sid, sname, rx in subs:
            ids = [n for n, g in enumerate(gloss) if g and rx.search(g)]
            if len(ids) >= MIN_PER_SUB: osubs.append({'id': sid, 'name': sname, 'ids': ids[:MAX_PER_SUB]})
        if osubs: out.append({'id': tid, 'name': tname, 'icon': icon, 'subs': osubs})
    json.dump({'tracks': out}, open(f'{d}/tracks.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    oi = old_ids(code)
    pos = {r[4]: n for n, r in enumerate(final)}
    if oi:
        json.dump({'from': code, 'map': [pos.get(t, -1) for t in oi]}, open(f'{d}/migrate.json', 'w'), separators=(',', ':'))
    elif prev_mig and prev_ids:
        # compõe: índice antigo -> índice da geração anterior -> índice novo
        json.dump({'from': prev_mig.get('from'), 'map': [pos.get(prev_ids[k], -1) if 0 <= k < len(prev_ids) else -1 for k in prev_mig['map']]},
                  open(f'{d}/migrate.json', 'w'), separators=(',', ':'))
    if prev_ids and prev_ids != [r[4] for r in final]:
        REPORT.setdefault('order_changed', []).append(pair)   # a ordem mudou: progresso v2 precisaria de conversão
    native_both = sum(1 for r in final if skill.get((owner.get(r[4]), tl)) == 5 and skill.get((owner.get(r[5]), sl)) == 5)
    REPORT[pair] = {'total': len(final), 'native_both': native_both, 'with_audio': sum(1 for r in final if r[4] in audio),
                    'vocab': len(ranked), 'score_dist': sorted(dist.items()),
                    'tracks': {t['id']: {s['id']: len(s['ids']) for s in t['subs']} for t in out}, 'levels': lvinfo}
    sample_idx = sorted(random.sample(range(len(final)), min(150, len(final))))
    qa[pair] = [{'n': n, 'frase': final[n][0], 'traducao': final[n][1], 'tatoeba': final[n][4]} for n in sample_idx]

for code in ['es', 'de', 'it', 'fr', 'en']:
    d = os.path.join(OUT, code)
    if os.path.exists(d): shutil.rmtree(d)

json.dump(qa, open(os.path.join(OUT, 'qa-sample.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)

# revisões (correções e frases removidas) guardadas em tools/reviews/
from apply_reviews import apply as apply_reviews
apply_reviews(OUT, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reviews'))
json.dump(REPORT, open(os.path.join(OUT, 'build-report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for sl, tl in PAIRS:
    pr = CODE[sl] + '-' + CODE[tl]; log(pr, REPORT[pr]['total'], 'nativos nos dois lados:', REPORT[pr]['native_both'])
log('downloads', REPORT['downloads'], 'sinais', REPORT['signals'])
