"""Gera data/<idioma>/tracks.json: trilhas temáticas (Dia a dia, Viagem, Profissional, Acadêmico...).

Cada frase é classificada pelo texto em inglês (a tradução inglesa, ou a própria frase no curso de inglês)
com listas de palavras-chave por tema. Dentro de cada tema as frases ficam na mesma ordem de dificuldade
da trilha geral (índice global), então o progresso é compartilhado entre as trilhas.
Uso: python tools/build_tracks.py
"""
import json, os, re, glob

MAX_PER_SUB = 2500
MIN_PER_SUB = 60

# (id da trilha, nome, ícone, [(id do tema, nome, palavras em inglês)])
# Palavras terminadas em * aceitam qualquer final (ex.: shop* = shop, shops, shopping, shopped).
TRACKS = [
 ('diadia', 'Dia a dia', '☀️', [
  ('mercado', 'Mercado e compras', 'buy* bought shop shops shopping shopped store stores supermarket* market* price* cost costs costly cheap* expensive groceries grocery cashier* receipt* discount* sale customer* bargain* wallet purse paid pay pays paying bag bags bread milk eggs cheese fruit* vegetable* apples bananas tomatoes potatoes coins'),
  ('restaurante', 'Comida e restaurante', 'restaurant* menu waiter* waitress* dinner* lunch* breakfast* meal* food* dish dishes delicious tasty hungry thirsty coffee tea beer* wine* juice dessert* soup meat beef chicken pork fish rice pasta pizza salad sandwich* cook cooks cooked cooking cake* steak tip the_bill chef kitchen eat eats eating ate eaten drink drinks drank'),
  ('transporte', 'Transporte', 'bus buses train* taxi* cab car cars drive drives driving drove driven driver* station* ticket* subway metro bike* bicycle* road* traffic highway parking park* ride rides riding rode platform* passenger* motorcycle* tram truck* gas fuel accident*'),
  ('casa', 'Casa e família', 'house* home* apartment* flat room* bedroom* bathroom* kitchen* bed beds sofa couch furniture garden* door* window* family families mother* father* mom dad parent* brother* sister* son sons daughter* wife husband* child children kid kids baby babies grandmother* grandfather* grandparents uncle* aunt* cousin* clean* wash* laundry'),
  ('saude', 'Saúde e corpo', 'doctor* hospital* sick* ill illness* medicine* medical pain* painful headache* toothache fever hurt hurts injured injury nurse* dentist* pharmacy pills patient* healthy health cough* flu disease* surgery heart blood stomach ache aches'),
  ('clima', 'Tempo e clima', 'weather rain rains raining rained rainy snow* sunny sunshine cloud* cloudy wind* windy storm* temperature* degrees summer* winter* autumn spring hot humid freezing umbrella* forecast'),
  ('rotina', 'Horários e rotina', "tomorrow today tonight yesterday weekend* morning* evening* afternoon* o'clock appointment* schedule* routine wake woke asleep sleep* early late hurry minutes hours monday tuesday wednesday thursday friday saturday sunday"),
  ('lazer', 'Lazer e amigos', 'movie* film* cinema music song* concert* party parties game* sport* soccer football basketball tennis swim* swimming beach* dance* dancing danced friend* hobby hobbies guitar piano vacation* holiday* fun'),
  ('sentimentos', 'Sentimentos', 'happy happiness sad sadness angry anger afraid scared fear love* loves loved hate* hates lonely tired worried worry nervous excited glad upset jealous proud ashamed embarrassed bored surprised disappointed'),
 ]),
 ('viagem', 'Viagem', '✈️', [
  ('aeroporto', 'Aeroporto e voo', 'airport* flight* plane* airplane* passport* luggage baggage suitcase* boarding gate visa customs pilot* fly flies flew flying airline*'),
  ('hotel', 'Hotel e hospedagem', 'hotel* reservation* reserve* reserved room rooms stay stayed staying guest* receptionist lobby key keys suite hostel'),
  ('direcoes', 'Direções e lugares', 'where_is where_are turn_left turn_right on_the_left on_the_right to_the_left to_the_right straight_ahead map maps far_from near nearby street* corner* get_lost got_lost directions bridge* downtown address* north south east west neighborhood* crossroads intersection'),
  ('turismo', 'Turismo e passeios', 'museum* tour* tourist* visit* sightseeing souvenir* photo* photograph* camera* guide* castle* church* cathedral* monument* trip trips travel* abroad foreign country countries city cities'),
 ]),
 ('profissional', 'Profissional', '💼', [
  ('escritorio', 'Escritório e reuniões', 'office* meeting* boss* colleague* coworker* manager* team* project* deadline* report* presentation* conference* agenda employee* staff department* secretary'),
  ('comunicacao', 'E-mail e telefone', 'email* e-mail* phone* telephone* call calls called calling message* letter* send sends sent reply replied contact* text texted fax'),
  ('carreira', 'Entrevista e carreira', 'job* interview* salary salaries hire* hired fired career* experience* position* apply applied application* promotion* promoted resign* retire* retired work works worked working worker* profession* qualified skills'),
  ('negocios', 'Negócios e dinheiro', 'company companies business* client* contract* sell* sold profit* bank* banks money invest* investment* economy economic* sales market tax taxes budget* debt* loan* price* industry factory factories trade'),
  ('tecnologia', 'Tecnologia', 'computer* internet software program* website* online password* data technology robot* email* laptop* smartphone* app apps digital network* printer*'),
 ]),
 ('academico', 'Acadêmico', '🎓', [
  ('universidade', 'Escola e universidade', 'university universities college* school* class classes lesson* teacher* professor* student* exam* test tests homework study studies studied studying grade* courses lecture* library* graduate* graduated degree diploma* semester classroom* learn* learned'),
  ('ciencia', 'Ciência e pesquisa', 'science* scientist* scientific research* experiment* theory theories discover* discovery physics chemistry biology mathematics math laboratory lab evidence hypothesis analysis atom* energy universe'),
  ('historia', 'História e sociedade', 'history historical war wars warfare king* queen* government* president* politics political politician* law laws century centuries ancient empire* election* vote* democracy citizen* nation* society'),
  ('natureza', 'Natureza e meio ambiente', 'nature natural animal* tree* forest* river* sea seas ocean* mountain* environment* planet* earth climate species bird* flower* plants lake* island* desert*'),
  ('cultura', 'Arte e literatura', 'art arts artist* painting* painter* novel* poem* poet* poetry writer* author* literature culture cultural theater theatre book* books language* languages'),
 ]),
]

def compile_words(spec):
    alts = []
    for w in spec.split():
        w = w.replace('_', ' ')
        if w.endswith('*'): alts.append(re.escape(w[:-1]).replace('\\ ', r'\s+') + r"[a-z'’-]*")
        else: alts.append(re.escape(w).replace('\\ ', r'\s+'))
    return re.compile(r"(?<![a-z])(?:" + '|'.join(alts) + r")(?![a-z])", re.I)

COMPILED = [(tid, tname, icon, [(sid, sname, compile_words(spec)) for sid, sname, spec in subs]) for tid, tname, icon, subs in TRACKS]

for d in sorted(glob.glob('data/*/index.json')):
    code = d.split('/')[1]
    idx = json.load(open(d))
    n = (idx['total'] + idx['chunk'] - 1) // idx['chunk']
    english = []
    for c in range(n):
        for row in json.load(open(f'data/{code}/c{c}.json', encoding='utf-8')):
            english.append(row[0] if code == 'en' else (row[1] or ''))
    out = []
    for tid, tname, icon, subs in COMPILED:
        osubs = []
        for sid, sname, rx in subs:
            ids = [i for i, t in enumerate(english) if t and rx.search(t)]
            if len(ids) < MIN_PER_SUB: continue
            osubs.append({'id': sid, 'name': sname, 'ids': ids[:MAX_PER_SUB]})
        if osubs: out.append({'id': tid, 'name': tname, 'icon': icon, 'subs': osubs})
    json.dump({'tracks': out}, open(f'data/{code}/tracks.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(code, [(t['id'], [(s['id'], len(s['ids'])) for s in t['subs']]) for t in out])
