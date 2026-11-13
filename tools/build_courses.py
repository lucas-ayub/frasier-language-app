"""Monta os cursos do Frasier a partir das exportações do Tatoeba (CC BY 2.0 FR).

Roda no GitHub Actions (.github/workflows/build-courses.yml). Para cada idioma-alvo gera:
  data/<alvo>/index.json   níveis e totais
  data/<alvo>/words.json   palavras por frequência (para as alternativas)
  data/<alvo>/cN.json      [frase, tradução_en, início, tamanho, id_tatoeba, id_en]
  data/<alvo>/pt/cN.json   tradução em português de cada frase ("" se não houver)

O espanhol (data/es) já existe: só acrescenta data/es/pt/ sem mudar a ordem das frases,
para não bagunçar o progresso de quem já joga.
"""
import bz2, tarfile, json, re, os, sys, collections, urllib.request, time

BASE = os.environ.get('TATOEBA_BASE', 'https://downloads.tatoeba.org/exports/')
OUT = 'data'
CHUNK = 2000
CAP = 120000
TARGETS = {'deu': 'de', 'ita': 'it', 'fra': 'fr', 'eng': 'en'}
LANGS = ['spa', 'deu', 'ita', 'fra', 'eng', 'por']
REPORT = {}

def log(*a): print(*a, flush=True)

def dl(url, path):
    for i in range(4):
        try:
            urllib.request.urlretrieve(url, path); return
        except Exception as e:
            log('retry', url, e); time.sleep(5 * (i + 1))
    raise SystemExit('falha ao baixar ' + url)

# ---------- 1. frases ----------
text, lang = {}, {}
for l in LANGS:
    p = f'/tmp/{l}.tsv.bz2'
    dl(f'{BASE}per_language/{l}/{l}_sentences.tsv.bz2', p)
    n = 0
    with bz2.open(p, 'rt', encoding='utf-8') as f:
        for line in f:
            parts = line.rstrip('\n').split('\t')
            if len(parts) >= 3:
                i = int(parts[0]); text[i] = parts[2]; lang[i] = l; n += 1
    log(l, n, 'frases')
    REPORT[l + '_sentences'] = n

# ---------- 2. ligações (traduções) ----------
# guarda só o necessário: a primeira tradução em inglês e em português de cada frase
dl(BASE + 'links.tar.bz2', '/tmp/links.tar.bz2')
to_eng, to_por = {}, {}
with tarfile.open('/tmp/links.tar.bz2', 'r:bz2') as tf:
    member = next(m for m in tf.getmembers() if m.name.endswith('.csv'))
    f = tf.extractfile(member)
    for raw in f:
        a, b = raw.split(b'\t')
        a, b = int(a), int(b)
        la, lb = lang.get(a), lang.get(b)
        if not la or not lb or la == lb: continue
        if lb == 'eng' and a not in to_eng: to_eng[a] = b
        elif lb == 'por' and a not in to_por: to_por[a] = b
log('ligações', len(to_eng), 'para inglês,', len(to_por), 'para português')

def first(i, l):
    return (to_eng if l == 'eng' else to_por).get(i)

def pt_of(i, en_id=None):
    """tradução em português: direta, senão via inglês."""
    j = to_por.get(i)
    if j: return text[j]
    for e in (en_id, to_eng.get(i)):
        if e and to_por.get(e): return text[to_por[e]]
    return ''

# ---------- 3. espanhol: só a tradução em português ----------
idx_path = os.path.join(OUT, 'es', 'index.json')
if os.path.exists(idx_path):
    idx = json.load(open(idx_path))
    os.makedirs(os.path.join(OUT, 'es', 'pt'), exist_ok=True)
    have = 0
    for c in range((idx['total'] + idx['chunk'] - 1) // idx['chunk']):
        rows = json.load(open(os.path.join(OUT, 'es', f'c{c}.json'), encoding='utf-8'))
        pts = [pt_of(r[4], r[5]) for r in rows]
        have += sum(1 for x in pts if x)
        json.dump(pts, open(os.path.join(OUT, 'es', 'pt', f'c{c}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    REPORT['es'] = {'total': idx['total'], 'pt': have}
    log('es pt', have, '/', idx['total'])

# ---------- 4. cursos novos ----------
TOK = {
    'en': re.compile(r"[^\W\d_]+(?:['’][^\W\d_]+)*"),
    'de': re.compile(r"[^\W\d_]+"),
    'it': re.compile(r"[^\W\d_]+"),
    'fr': re.compile(r"[^\W\d_]+"),
}
NAMES = {'en': 'Inglês', 'de': 'Alemão', 'it': 'Italiano', 'fr': 'Francês'}

def build(tl, code):
    tok = TOK[code]
    cands, seen = [], set()
    for i, l in lang.items():
        if l != tl: continue
        s = text[i].strip()
        key = s.lower()
        if key in seen or any(ch.isdigit() for ch in s): continue
        toks = list(tok.finditer(s))
        if len(toks) < 2 or len(toks) > 22: continue
        if tl == 'eng':
            en_id = 0; en = ''
            pt = pt_of(i)
            if not pt: continue
        else:
            en_id = first(i, 'eng')
            if not en_id: continue
            en = text[en_id]; pt = pt_of(i, en_id)
        seen.add(key)
        cands.append((0 if pt else 1, i, s, en, pt, en_id, toks))
    REPORT[code + '_candidates'] = len(cands)
    cands.sort(key=lambda x: (x[0], x[1]))
    cands = cands[:CAP]
    log(code, 'frases', len(cands))
    # frequência e nomes próprios (palavra com maiúscula que aparece igual na tradução)
    freq, propc = collections.Counter(), collections.Counter()
    for _, i, s, en, pt, _, toks in cands:
        ref = ' ' + (en or pt) + ' '
        for k, t in enumerate(toks):
            w = t.group(0); lw = w.lower(); freq[lw] += 1
            if w[0].isupper() and re.search(r'(?<![^\W\d_])' + re.escape(w) + r'(?![^\W\d_])', ref): propc[lw] += 1
    proper = {w for w in freq if propc[w] > 0.5 * freq[w]}
    ranked = [w for w, c in freq.most_common() if w not in proper]
    rank = {w: n for n, w in enumerate(ranked)}
    items = collections.defaultdict(list)
    for _, i, s, en, pt, en_id, toks in cands:
        ok = []
        for t in toks:
            lw = t.group(0).lower()
            if lw not in rank: continue
            if code in ('fr', 'it') and s[t.end():t.end() + 1] in ("'", '’'): continue  # artigo elidido (l', d')
            ok.append(t)
        if not ok: continue
        t = max(ok, key=lambda t: rank[t.group(0).lower()])
        items[t.group(0).lower()].append((len(s), [s, en, t.start(), len(t.group(0)), i, en_id or 0], pt))
    bounds = [100, 500, 1000, 2000, 5000, 10000, 10 ** 9]
    names = ['Top 100', 'Top 500', 'Top 1000', 'Top 2000', 'Top 5000', 'Top 10 000', 'Avançado']
    levels = [[] for _ in bounds]
    for w, lst in items.items():
        lst.sort(key=lambda x: x[0])
        r = rank[w]
        li = next(k for k, b in enumerate(bounds) if r < b)
        levels[li].append((r, lst))
    final, pts, lvinfo = [], [], []
    for li, lv in enumerate(levels):
        lv.sort(key=lambda x: x[0])
        start = len(final); k = 0
        while True:
            added = False
            for r, lst in lv:
                if k < len(lst): final.append(lst[k][1]); pts.append(lst[k][2]); added = True
            if not added: break
            k += 1
        lvinfo.append({'name': names[li], 'start': start, 'end': len(final)})
    d = os.path.join(OUT, code); os.makedirs(os.path.join(d, 'pt'), exist_ok=True)
    for n in range(0, len(final), CHUNK):
        json.dump(final[n:n + CHUNK], open(f'{d}/c{n // CHUNK}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        json.dump(pts[n:n + CHUNK], open(f'{d}/pt/c{n // CHUNK}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(ranked[:40000], open(f'{d}/words.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump({'total': len(final), 'chunk': CHUNK, 'levels': lvinfo}, open(f'{d}/index.json', 'w'))
    REPORT[code] = {'total': len(final), 'pt': sum(1 for x in pts if x), 'en': sum(1 for x in final if x[1]), 'vocab': len(ranked), 'levels': lvinfo,
                    'sample': [x[0][:x[2]] + '[' + x[0][x[2]:x[2] + x[3]] + ']' + x[0][x[2] + x[3]:] + ' | ' + (x[1] or p) for x, p in list(zip(final, pts))[:8:2] + list(zip(final, pts))[len(final) // 2:len(final) // 2 + 4]]}

for tl, code in TARGETS.items():
    build(tl, code)

json.dump(REPORT, open(os.path.join(OUT, 'build-report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
log(json.dumps(REPORT, ensure_ascii=False)[:3000])
