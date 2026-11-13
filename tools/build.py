import csv, re, json, sys, collections, os
src, out = sys.argv[1], sys.argv[2]
WORD = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+")
rows = []
seen = set()
with open(src, encoding='utf-8') as f:
    for line in f:
        line = line.rstrip('\n')
        if line.startswith('"') and line.endswith('"'): line = line[1:-1]
        parts = line.split('\t')
        if len(parts) < 3: continue
        en, es, attr = parts[0].strip(), parts[1].strip(), parts[2]
        es = es.replace('""', '"'); en = en.replace('""', '"')
        m = re.search(r"#(\d+) \(.*?\) & #(\d+)", attr)
        if not m: continue
        enid, esid = int(m.group(1)), int(m.group(2))
        key = es.lower()
        if key in seen: continue
        toks = list(WORD.finditer(es))
        if len(toks) < 2 or len(toks) > 22: continue
        if any(ch.isdigit() for ch in es): continue
        seen.add(key)
        rows.append((es, en, esid, enid, toks))
print('sentences', len(rows))
freq = collections.Counter(); capmid = collections.Counter(); lower = collections.Counter()
for es, en, _, _, toks in rows:
    for i, t in enumerate(toks):
        w = t.group(0); lw = w.lower(); freq[lw] += 1
        if w[0].isupper():
            if i > 0 and es[t.start()-2:t.start()].strip() not in ('¿','¡','.','?','!','"','—','-'): capmid[lw] += 1
        else: lower[lw] += 1
proper = {w for w in freq if capmid[w] > lower[w]}
proper -= {'yo'}
ranked = [w for w, c in freq.most_common() if w not in proper]
rank = {w: i for i, w in enumerate(ranked)}
print('vocab', len(ranked), 'proper', len(proper))
items = collections.defaultdict(list)  # cloze word -> sentences
for es, en, esid, enid, toks in rows:
    cands = [t for t in toks if t.group(0).lower() in rank]
    if not cands: continue
    t = max(cands, key=lambda t: rank[t.group(0).lower()])
    items[t.group(0).lower()].append((len(es), [es, en, t.start(), len(t.group(0)), esid, enid]))
bounds = [100, 500, 1000, 2000, 5000, 10000, 10**9]
names = ['Top 100', 'Top 500', 'Top 1000', 'Top 2000', 'Top 5000', 'Top 10 000', 'Avançado']
levels = [[] for _ in bounds]
for w, lst in items.items():
    lst.sort(key=lambda x: x[0])
    r = rank[w]
    li = next(i for i, b in enumerate(bounds) if r < b)
    levels[li].append((r, [x[1] for x in lst]))
final = []; lvinfo = []
for li, lv in enumerate(levels):
    lv.sort()
    start = len(final)
    k = 0
    while True:
        added = False
        for r, lst in lv:
            if k < len(lst): final.append(lst[k]); added = True
        if not added: break
        k += 1
    lvinfo.append({'name': names[li], 'start': start, 'end': len(final)})
print('final', len(final)); print(lvinfo)
CH = 2000
os.makedirs(out + '/data', exist_ok=True)
for i in range(0, len(final), CH):
    with open(f"{out}/data/c{i//CH}.json", 'w', encoding='utf-8') as f:
        json.dump(final[i:i+CH], f, ensure_ascii=False, separators=(',', ':'))
with open(out + '/data/words.json', 'w', encoding='utf-8') as f:
    json.dump(ranked[:40000], f, ensure_ascii=False, separators=(',', ':'))
with open(out + '/data/index.json', 'w') as f:
    json.dump({'total': len(final), 'chunk': CH, 'levels': lvinfo}, f)
