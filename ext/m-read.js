/* Frasier — Leitura (histórias graduadas, notícias reais, Wikipédia, com toque-para-traduzir) e Minhas palavras.
   Registra dois módulos: `read` e `words`. Contrato em ext/CONTRACT.md.
   Fontes externas (CORS público, sem chave):
   - Wikipédia (REST): https://{lang}.wikipedia.org/api/rest_v1/feed/featured/AAAA/MM/DD  (manchetes "news" + artigo em destaque "tfa")
   - Wikipédia (Action API): https://{lang}.wikipedia.org/w/api.php?...&origin=*  (artigo aleatório, busca e texto completo da introdução)
   - Wikinews (Action API): https://{lang}.wikinews.org/w/api.php?...&origin=*  (lista de notícias publicadas + texto)
   O Wikinews ficou somente leitura em 2026: as notícias são reais, mas de arquivo. Por isso a aba Notícias
   mostra primeiro as manchetes do dia da Wikipédia e depois o arquivo do Wikinews; se nada responder, oferece
   uma "notícia simulada" gerada por IA, com rótulo claro. */
(function(){
"use strict";
if (!window.F) return;

const LANG = F.tgt;
const CACHE_KEY = 'frasier-read-cache-' + F.pair;          // caches grandes (traduções, adaptações): só neste aparelho
const TIMEOUT = 12000;

/* ---------------------------------------------------------------- estilos */
const CSS = `
.ext-read .card,.ext-words .card{padding:14px 16px}
.read-tabs{grid-template-columns:repeat(3,1fr)}
.read-tabs button{min-height:58px;font-size:14px;gap:3px}
.read-tabs .e{font-size:20px;line-height:1}
.read-h{font-family:var(--fd);font-size:15px;font-weight:700;letter-spacing:-.01em;margin:0 0 10px}
.read-sub{font-size:14px;color:var(--muted);margin:-4px 0 12px;line-height:1.4}
.read-topics{gap:8px}
.read-topics button{padding:0 12px;font-size:15px}
.read-gen{width:100%;margin-top:14px}
.read-list{display:flex;flex-direction:column}
.read-item{display:flex;gap:12px;align-items:flex-start;width:100%;text-align:left;background:none;border:0;padding:12px 2px;color:var(--ink);min-height:56px;font:inherit}
.read-item+.read-item{border-top:2px solid var(--line)}
.read-item .ri{font-size:22px;line-height:1.2;flex:none;width:28px;text-align:center}
.read-item .rt{flex:1;min-width:0}
.read-item b{display:block;font-weight:700;font-size:16px;line-height:1.3;overflow-wrap:anywhere}
.read-item small{display:block;color:var(--muted);font-size:13px;margin-top:2px;line-height:1.35}
.read-item .chev{color:var(--muted);font-size:20px;align-self:center}
.read-note{font-size:13.5px;color:var(--muted);line-height:1.45;margin-top:10px}
.read-src{font-size:13px;color:var(--muted);line-height:1.45;margin-top:14px;padding-top:10px;border-top:2px dashed var(--line);overflow-wrap:anywhere}
.read-src a{color:var(--brand);font-weight:700}
@media (prefers-color-scheme: dark){ .read-src a{color:#B6A6FF} }
.read-back{align-self:flex-start;border:0;background:none;color:var(--muted);font-weight:700;font-size:15px;min-height:40px;padding:0 4px;display:inline-flex;gap:6px;align-items:center}
.read-bar{position:sticky;top:0;z-index:5;display:flex;gap:6px;align-items:center;background:var(--bg);padding:8px 0;margin:-6px 0 -4px;box-shadow:0 8px 8px -8px var(--bg)}
.read-bar .tool{padding:8px 10px;font-size:14px;min-width:44px;justify-content:center}
.read-bar .tool.on{background:var(--sky-soft);border-color:var(--sky)}
.read-doc{padding:16px 16px 18px!important}
.read-tags{display:flex;gap:6px;flex-wrap:wrap}
.read-tag-sim{background:var(--sun)!important;color:var(--on-sun)!important}
.read-title{font-family:var(--fd);font-size:21px;font-weight:800;letter-spacing:-.02em;line-height:1.25;margin:10px 0 4px;overflow-wrap:anywhere}
.read-meta{font-size:13.5px;color:var(--muted);margin-bottom:12px}
.read-sum{font-size:14.5px;background:var(--surface-2);border-radius:12px;padding:8px 12px;margin:0 0 12px;color:var(--ink)}
.read-sum summary{cursor:pointer;font-weight:700;color:var(--muted);min-height:28px;display:flex;align-items:center}
.read-view{display:flex;gap:4px;background:var(--surface-2);padding:4px;border-radius:14px;margin:0 0 14px}
.read-view button{flex:1;border:0;background:none;border-radius:10px;min-height:42px;font-size:13.5px;white-space:nowrap;font-weight:700;color:var(--muted);padding:0 6px}
.read-view button+button{flex:1.7}
.read-view button.on{background:var(--surface);color:var(--ink);box-shadow:0 2px 0 var(--edge)}
@media (prefers-color-scheme: dark){ .read-view button.on{background:var(--brand-deep);color:#fff;box-shadow:0 2px 0 #1E0F6B} }
.read-text{font-size:var(--read-fs,20px);line-height:1.7;overflow-wrap:break-word}
.read-text p{margin:0 -6px .75em;padding:2px 6px;border-radius:10px;transition:background .25s}
.read-text p.read-now{background:color-mix(in srgb,var(--sun) 32%,transparent)}
.read-text p.read-lead{font-weight:700}
.read-text .read-dl{font-size:.75em;color:var(--muted);font-weight:700}
.read-tr{font-size:15.5px;line-height:1.5;color:var(--muted);border-left:3px solid var(--sky);padding:2px 0 2px 10px;margin:-.35em 0 1em}
.read-short{font-size:13.5px;color:var(--muted);font-style:italic}
.read-voc{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.read-voc button{border:2px solid var(--line);background:var(--surface);border-radius:12px;min-height:44px;padding:4px 10px;font-size:14.5px;text-align:left;color:var(--ink);box-shadow:0 3px 0 var(--edge);display:inline-flex;gap:6px;align-items:center}
.read-voc button b{font-weight:700}
.read-voc button span{color:var(--muted)}
.read-voc button.saved{border-color:var(--ok);background:var(--ok-bg)}
.read-voc button i{font-style:normal;font-weight:800;color:var(--brand)}
.read-voc button.saved i{color:var(--ok-ink)}
.read-q{padding-top:14px}
.read-q+.read-q{border-top:2px solid var(--line);margin-top:14px}
.read-q .qn{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.read-q .qt{font-size:18px;font-weight:700;line-height:1.4;margin:4px 0 6px}
.read-opt{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;border:2px solid var(--line);background:var(--surface);border-radius:var(--r-m);padding:11px 12px;min-height:50px;font-size:16.5px;line-height:1.35;color:var(--ink);box-shadow:0 3px 0 var(--edge);margin-top:8px;transition:transform .07s,box-shadow .07s}
.read-opt .k{font-family:var(--fd);font-size:12px;font-weight:700;color:var(--muted);width:20px;height:20px;border-radius:6px;background:var(--surface-2);display:grid;place-items:center;flex:none;margin-top:1px}
.read-opt:active:not(:disabled){transform:translateY(3px);box-shadow:0 0 0 var(--edge)}
.read-opt:disabled{cursor:default}
.read-opt.dim{opacity:.55}
.read-opt.ok{background:var(--ok-bg);border-color:var(--ok);color:var(--ok-ink);opacity:1}
.read-opt.ok .k{background:var(--ok);color:var(--on-ok)}
.read-opt.bad{background:var(--bad-bg);border-color:var(--bad);color:var(--bad-ink);opacity:1;animation:shake .4s ease-in-out}
.read-opt.bad .k{background:var(--bad);color:var(--on-bad)}
.read-exp{font-size:15px;line-height:1.45;margin-top:10px;padding:9px 12px;border-radius:12px}
.read-exp.ok{background:var(--ok-bg);color:var(--ok-ink)}
.read-exp.bad{background:var(--bad-bg);color:var(--bad-ink)}
.read-exp b{display:block}
.read-done{text-align:center;padding:18px 16px!important}
.read-done .big{font-family:var(--fd);font-weight:800;font-size:30px;letter-spacing:-.03em;line-height:1.1;margin:4px 0}
.read-stats{display:grid;grid-template-columns:repeat(3,1fr);margin:14px 0 6px}
.read-stats div{padding:4px}
.read-stats div+div{border-left:2px solid var(--line)}
.read-stats b{display:block;font-family:var(--fd);font-size:19px;font-weight:800}
.read-stats span{font-size:12.5px;color:var(--muted)}
.read-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.read-btns .btn{margin-bottom:5px}
.read-search{display:flex;gap:8px;margin-top:12px}
.read-search .txt{flex:1;min-width:0;padding:10px 12px;font-size:16px}
.read-feat{display:flex;gap:12px;align-items:flex-start;width:100%;text-align:left;background:none;border:0;padding:0;color:var(--ink);font:inherit}
.read-feat img{width:72px;height:72px;object-fit:cover;border-radius:12px;flex:none;background:var(--surface-2)}
.read-feat b{display:block;font-family:var(--fd);font-size:17px;font-weight:700;letter-spacing:-.01em;line-height:1.25}
.read-feat p{margin:4px 0 0;font-size:14.5px;color:var(--muted);line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.read-end{height:1px}
.read-finish{width:100%;margin-top:6px}

.words-top{display:flex;align-items:center;gap:14px}
.words-top .n{font-family:var(--fd);font-size:40px;font-weight:800;letter-spacing:-.05em;line-height:1;color:var(--brand)}
@media (prefers-color-scheme: dark){ .words-top .n{color:#B6A6FF} }
.words-top .l{font-size:15px;line-height:1.35}
.words-modes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
.words-modes .btn{margin-bottom:5px}
.words-item{display:flex;gap:10px;align-items:flex-start;padding:12px 2px}
.words-item+.words-item{border-top:2px solid var(--line)}
.words-item .wt{flex:1;min-width:0}
.words-item .ww{font-size:18px;font-weight:700;overflow-wrap:anywhere}
.words-item .wtr{color:var(--ink);font-size:15.5px}
.words-item .wc{font-size:14px;color:var(--muted);margin-top:4px;line-height:1.4;overflow-wrap:anywhere}
.words-item .wc mark{background:var(--slot);color:var(--ink);border-radius:4px;padding:0 2px}
.words-item .acts{display:flex;flex-direction:column;gap:6px;align-items:flex-end}
.words-item .tool{min-height:40px;width:40px;padding:0;justify-content:center;box-shadow:none}
.words-dots{display:inline-flex;gap:3px;vertical-align:2px;margin-left:6px}
.words-dots i{width:8px;height:8px;border-radius:3px;background:var(--surface-2);border:1px solid var(--line)}
.words-dots i.on{background:var(--ok);border-color:var(--ok)}
.words-empty{text-align:center;padding:24px 18px!important}
.words-empty .e{font-size:44px}
.words-empty p{margin:8px 0;line-height:1.5}
.words-card{text-align:center;padding:26px 18px 20px!important;min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.words-card .front{font-family:var(--ft);font-size:34px;font-weight:700;line-height:1.2;overflow-wrap:anywhere}
.words-card .back{font-size:22px;font-weight:700;color:var(--ok-ink)}
.words-card .ctx{font-size:16px;color:var(--muted);line-height:1.5;max-width:100%;overflow-wrap:anywhere}
.words-card .ctx mark{background:var(--slot);color:var(--ink);border-radius:4px;padding:0 3px}
.words-card .hint{font-size:14px;color:var(--muted)}
.words-card .tool{background:var(--sky-soft);border-color:transparent;box-shadow:none}
.words-card .txt{text-align:center;font-size:22px;font-weight:700;margin-top:6px}
.words-card .verdict{margin:6px 0 0;width:100%;text-align:left}
.words-gr{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.words-gr .btn{margin-bottom:5px}
.words-bad{--b:var(--bad-bg);--e:color-mix(in srgb,var(--bad) 55%,var(--edge));--c:var(--bad-ink)}
.words-ok{--b:var(--ok);--e:var(--ok-deep);--c:var(--on-ok)}
.words-prog{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--muted);font-weight:700}
.words-prog .progress{height:12px}
`;
if (!document.getElementById('read-css')) { const st = document.createElement('style'); st.id = 'read-css'; st.textContent = CSS; document.head.appendChild(st); }

/* ---------------------------------------------------------------- utilidades */
const esc = F.esc;
const $q = (root, sel) => root.querySelector(sel);
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const words = s => (String(s).match(/\p{L}[\p{L}\p{M}'’-]*/gu) || []).length;
const fmtDate = d => { try { return new Date(d).toLocaleDateString('pt-BR', { day:'numeric', month:'short', year:'numeric' }); } catch(e){ return ''; } };
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const LEVEL_INFO = {
  A1:{ n:80,  p:3, rule:'só presente do indicativo; vocabulário muito frequente; frases curtas (5 a 10 palavras); nada de expressões idiomáticas' },
  A2:{ n:140, p:3, rule:'presente, passado simples e futuro próximo; frases simples ligadas por conectores básicos (e, mas, porque, depois)' },
  B1:{ n:220, p:4, rule:'tempos do passado variados, algumas orações subordinadas, um diálogo curto; vocabulário do dia a dia mais amplo' },
  B2:{ n:320, p:5, rule:'linguagem natural e variada, condicional e subjuntivo quando couber, algumas expressões idiomáticas comuns' },
  C1:{ n:400, p:5, rule:'estilo rico e natural (literário ou jornalístico), vocabulário preciso e expressões idiomáticas' },
};
const lvInfo = () => LEVEL_INFO[F.level()] || LEVEL_INFO.A2;

function lcache(){ try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch(e){ return {}; } }
function lcacheGet(kind, k){ const c = lcache(); return c[kind] && c[kind][k]; }
function lcacheSet(kind, k, v){
  const c = lcache(); c[kind] = c[kind] || {}; c[kind][k] = v;
  const ks = Object.keys(c[kind]); while (ks.length > 30) delete c[kind][ks.shift()];
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch(e){ try { localStorage.removeItem(CACHE_KEY); } catch(_){} }
}

async function getJSON(url){
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { signal:ctl.signal, headers:{ 'Accept':'application/json' } });
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    return await r.json();
  } finally { clearTimeout(to); }
}
/* MediaWiki Action API com CORS anônimo (origin=*) */
const mwURL = (host, params) => `https://${host}/w/api.php?` + new URLSearchParams({ ...params, format:'json', formatversion:'2', origin:'*' }).toString();
const mw = async (host, params) => { const j = await getJSON(mwURL(host, params)); if (j.error) throw new Error(j.error.info || j.error.code); return j; };
const pagesOf = j => { const p = j && j.query && j.query.pages; return !p ? [] : Array.isArray(p) ? p : Object.values(p); };
const WP = `${LANG}.wikipedia.org`, WN = `${LANG}.wikinews.org`;
const wikiURL = (host, title) => `https://${host}/wiki/${encodeURIComponent(String(title).replace(/ /g, '_'))}`;

/* texto puro a partir de HTML (para a API parse e para as manchetes) */
function htmlToText(html){
  const d = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  return (d.body.textContent || '').replace(/\s+/g, ' ').trim();
}
const STOP_HEAD = /^(fuentes?|fonti|fonte|sources?|quellen?|einzelnachweise|r[ée]f[ée]rences?|referencias|riferimenti|note|notes|notas|anmerkungen|enlaces|liens|collegamenti|links|weblinks|v[ée]ase|voir aussi|siehe auch|see also|vedi anche|related|noticias relacionadas|art[ií]culos? relacionad\w*|articles? li[ée]s|notizie correlate|verwandte|external|externe|bibliograf\w*|literatur|bibliography)/i;
/* extrato em texto puro (TextExtracts, exsectionformat=wiki) -> parágrafos, parando nas seções de fontes/links */
function extractToParas(text){
  const out = [];
  for (let line of String(text || '').split(/\n+/)) {
    line = line.trim(); if (!line) continue;
    const h = line.match(/^=+\s*(.*?)\s*=+$/);
    if (h) { if (STOP_HEAD.test(h[1])) break; continue; }
    if (line.length < 2) continue;
    out.push(line.replace(/\s+/g, ' '));
  }
  return out;
}
function parseHtmlToParas(html){
  const d = new DOMParser().parseFromString(html, 'text/html');
  d.querySelectorAll('table,style,script,sup,.reference,.mw-editsection,.noprint,.thumb,figure,.navbox,.gallery,.infobox,.mw-empty-elt,.metadata').forEach(x => x.remove());
  const out = [];
  for (const el of d.querySelectorAll('p,h2,h3,li')) {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (/^H/.test(el.tagName)) { if (STOP_HEAD.test(t)) break; continue; }
    if (el.tagName === 'LI') continue;
    if (t.length > 1) out.push(t);
  }
  return out;
}
/* limita o texto a ~maxWords palavras sem cortar parágrafo */
function capParas(paras, maxWords = 480){
  const out = []; let n = 0;
  for (const p of paras) { if (n > 0 && n + words(p) > maxWords) return { paras:out, cut:true }; out.push(p); n += words(p); }
  return { paras:out, cut:false };
}
/* frase que contém a palavra tocada (contexto para a tradução) */
function sentenceAround(w){
  const p = w.closest('p, .read-title, li, .qt') || w.parentNode; if (!p) return w.textContent;
  let off = 0; for (const n of p.childNodes) { if (n === w) break; off += (n.textContent || '').length; }
  const t = p.textContent; let a = off, b = off;
  while (a > 0 && !/[.!?¡¿\n]/.test(t[a - 1])) a--;
  while (b < t.length && !/[.!?\n]/.test(t[b])) b++;
  return t.slice(a, b + 1).trim() || t.slice(0, 200);
}
function findContext(word, paras){
  const re = new RegExp(`(^|[^\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'iu');
  for (const p of paras) {
    const ss = p.split(/(?<=[.!?])\s+/);
    for (const s of ss) if (re.test(s)) return s;
  }
  return '';
}
function normQuestions(arr, max){
  return (Array.isArray(arr) ? arr : []).map(q => {
    const opcoes = (q.opcoes || q.options || []).map(String).filter(Boolean);
    let c = Number(q.correta ?? q.correct); if (!(c >= 0 && c < opcoes.length)) c = 0;
    return { pergunta:String(q.pergunta || q.question || ''), opcoes, correta:c, explicacao:String(q.explicacao || q.explanation || '') };
  }).filter(q => q.pergunta && q.opcoes.length >= 2).slice(0, max);
}
function normParas(t){
  if (Array.isArray(t)) return t.map(String).map(s => s.trim()).filter(Boolean);
  return String(t || '').split(/\n\s*\n|\n/).map(s => s.trim()).filter(Boolean);
}
function normVocab(v){ return (Array.isArray(v) ? v : []).map(x => ({ palavra:String(x.palavra || x.word || '').trim(), traducao:String(x.traducao || x.translation || '').trim() })).filter(x => x.palavra).slice(0, 10); }

/* ---------------------------------------------------------------- dados persistentes */
const store = () => F.store('read');
function touch(){ store()._ts = F.nowS(); F.save(); }
function saveStory(s){
  const st = store(); st.stories = (st.stories || []).filter(x => x.id !== s.id);
  st.stories.unshift(s); st.stories = st.stories.slice(0, 10);
  while (st.stories.length > 3 && JSON.stringify(st.stories).length > 22000) st.stories.pop();
  touch();
}
function markRead(id){ const s = (store().stories || []).find(x => x.id === id); if (s && !s.read) { s.read = 1; touch(); } }
const fontSize = () => store().fs || 20;

/* ---------------------------------------------------------------- IA */
const QSHAPE = `{"pergunta":"…","opcoes":["…","…","…","…"],"correta":0,"explicacao":"…"}`;
async function aiStory(topic){
  const lv = F.level(), L = lvInfo();
  const recent = (store().stories || []).slice(0, 6).map(s => s.titulo).filter(Boolean);
  const seed = ['um mal-entendido', 'uma surpresa no final', 'um objeto perdido', 'um encontro inesperado', 'um pequeno problema resolvido', 'uma decisão difícil', 'um dia que deu tudo errado', 'uma descoberta', 'uma tradição local', 'um personagem curioso'];
  const prompt = `Você escreve leituras graduadas (graded readers) para quem aprende ${F.tgtName} (${F.tgtNameEn}).
Escreva uma história ORIGINAL em ${F.tgtNameEn}, nível CEFR ${lv}, tema: ${topic.ai}. Ideia de partida: ${seed[Math.floor(Math.random() * seed.length)]}.
Regras do nível ${lv}: ${L.rule}. Tamanho: cerca de ${L.n} palavras em ${L.p} parágrafos. Começo, meio e fim; personagens com nome; título curto e interessante.${recent.length ? `\nNão repita estes títulos/enredos: ${recent.join('; ')}.` : ''}
Responda só com JSON neste formato:
{"titulo":"…","texto":["parágrafo 1","parágrafo 2"],"perguntas":[${QSHAPE}],"vocabulario":[{"palavra":"…","traducao":"…"}],"resumo_pt":"…"}
- "perguntas": exatamente 4 perguntas de compreensão em ${F.tgtNameEn} (nível ${lv}), 4 opções cada, só uma correta, distratores plausíveis; "correta" = índice 0-3 (varie a posição); "explicacao": 1 frase curta em ${F.explainLang} citando o trecho que responde.
- "vocabulario": 8 palavras ou expressões-chave do texto (escritas como aparecem nele) com a tradução para ${F.srcName} no contexto.
- "resumo_pt": resumo de 1 linha em ${F.srcName}.`;
  const r = await F.ai(prompt, { json:true, temperature:0.9, maxTokens:3000 });
  const texto = normParas(r.texto);
  if (!texto.length) { const e = new Error('história vazia'); e.friendly = 'A IA devolveu um texto vazio. Tente de novo.'; throw e; }
  return { id:'s' + Date.now().toString(36), ts:F.nowS(), topic:topic.id, lv, titulo:String(r.titulo || topic.label), texto,
    perguntas:normQuestions(r.perguntas, 4), vocabulario:normVocab(r.vocabulario).slice(0, 8), resumo_pt:String(r.resumo_pt || '') };
}
async function aiAdapt(doc){
  const k = 'ad:' + F.level() + ':' + hash(doc.paras.join('\n'));
  const c = lcacheGet('ad', k); if (c) return c;
  const lv = F.level(), L = lvInfo(), n = Math.min(L.n + 40, 360);
  const prompt = `Reescreva o texto abaixo em ${F.tgtNameEn} para um aluno de nível CEFR ${lv} (regras: ${L.rule}). Cerca de ${n} palavras em 2 a 5 parágrafos.
Mantenha os FATOS exatos (nomes, números, datas, lugares); não invente nada; pode omitir detalhes secundários. Título curto e claro.
Depois crie 3 perguntas de compreensão em ${F.tgtNameEn} sobre o texto adaptado.
Responda só com JSON: {"titulo":"…","texto":["…"],"perguntas":[${QSHAPE}],"vocabulario":[{"palavra":"…","traducao":"…"}]}
- "correta" = índice 0-3 (varie); "explicacao": 1 frase em ${F.explainLang}; "vocabulario": 6 palavras-chave do texto adaptado com tradução para ${F.srcName}.
TÍTULO ORIGINAL: ${doc.title}
TEXTO ORIGINAL:
${doc.paras.join('\n').slice(0, 5000)}`;
  const r = await F.ai(prompt, { json:true, temperature:0.4, maxTokens:2500 });
  const out = { titulo:String(r.titulo || doc.title), texto:normParas(r.texto), perguntas:normQuestions(r.perguntas, 3), vocabulario:normVocab(r.vocabulario).slice(0, 6) };
  if (!out.texto.length) { const e = new Error('vazio'); e.friendly = 'A IA não conseguiu adaptar este texto. Tente de novo.'; throw e; }
  lcacheSet('ad', k, out); return out;
}
async function aiQuestions(paras){
  const k = 'q:' + hash(paras.join('\n'));
  const c = lcacheGet('q', k); if (c) return c;
  const prompt = `Crie 3 perguntas de compreensão de leitura em ${F.tgtNameEn}, adequadas a um aluno de nível ${F.level()}, sobre o texto abaixo (ideia principal, um detalhe, uma inferência).
Responda só com JSON: {"perguntas":[${QSHAPE}]} — 4 opções, "correta" = índice 0-3 (varie), "explicacao": 1 frase em ${F.explainLang} citando o trecho.
TEXTO:
${paras.join('\n').slice(0, 5000)}`;
  const r = await F.ai(prompt, { json:true, temperature:0.3, maxTokens:1500 });
  const q = normQuestions(r.perguntas || r, 3); if (!q.length) throw Object.assign(new Error('sem perguntas'), { friendly:'Não consegui criar perguntas agora.' });
  lcacheSet('q', k, q); return q;
}
async function aiTranslate(paras){
  const k = 'tr:' + F.src + ':' + hash(paras.join('\n'));
  const c = lcacheGet('tr', k); if (c) return c;
  const prompt = `Traduza cada parágrafo abaixo de ${F.tgtNameEn} para ${F.srcNameEn === 'Portuguese' ? 'português do Brasil' : F.srcNameEn}, de forma natural e fiel.
Responda só com JSON: {"traducoes":["…"]} com exatamente ${paras.length} itens, na mesma ordem.
${paras.map((p, i) => `[${i + 1}] ${p}`).join('\n')}`;
  const r = await F.ai(prompt, { json:true, temperature:0.2, maxTokens:3500 });
  const t = (r.traducoes || r.translations || (Array.isArray(r) ? r : [])).map(String);
  if (!t.length) throw Object.assign(new Error('sem tradução'), { friendly:'Não consegui traduzir agora.' });
  lcacheSet('tr', k, t); return t;
}
async function aiFakeNews(){
  const lv = F.level(), L = lvInfo();
  const prompt = `Escreva uma NOTÍCIA SIMULADA (fictícia mas plausível e neutra, sobre ciência, cultura, cidades, meio ambiente ou esporte — nada de política, tragédias ou pessoas reais) em ${F.tgtNameEn}, no estilo de jornal, para um aluno de nível ${lv} (${L.rule}), cerca de ${Math.min(L.n + 20, 340)} palavras.
Responda só com JSON: {"titulo":"…","texto":["…"],"perguntas":[${QSHAPE}],"vocabulario":[{"palavra":"…","traducao":"…"}]}
- 3 perguntas em ${F.tgtNameEn}, "correta" índice 0-3, "explicacao" em ${F.explainLang}; 6 palavras com tradução para ${F.srcName}.`;
  const r = await F.ai(prompt, { json:true, temperature:0.9, maxTokens:2500 });
  return { kind:'sim', id:'sim' + Date.now(), title:String(r.titulo || 'Notícia'), paras:normParas(r.texto), questions:normQuestions(r.perguntas, 3), vocab:normVocab(r.vocabulario),
    label:'Notícia simulada (IA)', source:{ text:'Texto fictício gerado por IA para treino — não é uma notícia real.' }, adaptable:false };
}

/* ---------------------------------------------------------------- fontes reais */
const mem = { feed:null, feedErr:null, wn:null, wnErr:null };
/* Wikipédia: feed do dia (manchetes + artigo em destaque) */
async function loadFeed(){
  if (mem.feed) return mem.feed;
  let last;
  for (const back of [0, 1]) {
    const d = new Date(Date.now() - back * 86400000);
    const ymd = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;
    try { const j = await getJSON(`https://${WP}/api/rest_v1/feed/featured/${ymd}`); if (j && (j.news || j.tfa || j.mostread)) return mem.feed = j; }
    catch(e){ last = e; }
  }
  throw last || new Error('feed vazio');
}
const sumTitle = s => (s && (s.titles && (s.titles.normalized || s.titles.canonical) || s.normalizedtitle || s.title) || '').replace(/_/g, ' ');
function newsItems(feed){
  return (feed && Array.isArray(feed.news) ? feed.news : []).map((n, i) => {
    const story = htmlToText(n.story || '');
    const links = Array.isArray(n.links) ? n.links : [];
    // artigo principal: o link em negrito na manchete, senão o primeiro
    const m = String(n.story || '').match(/<b>\s*<a[^>]*href="\.\/([^"#]+)/i);
    const key = m ? decodeURIComponent(m[1]).replace(/_/g, ' ') : '';
    const main = links.find(l => sumTitle(l) === key || (l.title || '').replace(/_/g, ' ') === key) || links[0] || null;
    return { id:'wpn' + i, story, main };
  }).filter(x => x.story);
}
/* Wikinews: notícias publicadas, das mais recentes para as mais antigas */
const WN_CATS = {
  es:['Categoría:Publicado', 'Categoría:Publicada'], fr:['Catégorie:Publié', 'Catégorie:Publiés'], de:['Kategorie:Veröffentlicht', 'Kategorie:Published'],
  it:['Categoria:Pubblicati', 'Categoria:Pubblicato'], en:['Category:Published'],
};
const COMMON = { es:'el', fr:'le', de:'der', it:'il', en:'the' };
async function loadWikinews(){
  if (mem.wn) return mem.wn;
  const clean = a => a.filter(x => x.title && !/:/.test(x.title));
  for (const cat of (WN_CATS[LANG] || ['Category:Published'])) {
    try {
      const j = await mw(WN, { action:'query', list:'categorymembers', cmtitle:cat, cmsort:'timestamp', cmdir:'desc', cmlimit:'25', cmnamespace:'0', cmprop:'ids|title|timestamp' });
      const a = clean((j.query && j.query.categorymembers) || []).map(x => ({ title:x.title, date:x.timestamp }));
      if (a.length) return mem.wn = a;
    } catch(e){}
  }
  // fallback 1: busca ordenada por data de criação
  try {
    const j = await mw(WN, { action:'query', list:'search', srsearch:COMMON[LANG] || 'a', srnamespace:'0', srsort:'create_timestamp_desc', srlimit:'25', srprop:'timestamp' });
    const a = clean((j.query && j.query.search) || []).map(x => ({ title:x.title, date:x.timestamp }));
    if (a.length) return mem.wn = a;
  } catch(e){}
  // fallback 2: páginas novas recentes
  const j = await mw(WN, { action:'query', list:'recentchanges', rctype:'new', rcnamespace:'0', rclimit:'25', rcprop:'title|timestamp' });
  const a = clean((j.query && j.query.recentchanges) || []).map(x => ({ title:x.title, date:x.timestamp }));
  if (!a.length) throw new Error('Wikinews sem itens');
  return mem.wn = a;
}
/* texto completo de uma página (TextExtracts; senão action=parse) */
async function pageText(host, title, intro){
  try {
    const p = { action:'query', prop:'extracts', explaintext:'1', exsectionformat:'wiki', titles:title, redirects:'1' };
    if (intro) p.exintro = '1';
    const pg = pagesOf(await mw(host, p))[0];
    const paras = extractToParas(pg && pg.extract);
    if (paras.length) return paras;
  } catch(e){}
  const j = await mw(host, { action:'parse', page:title, prop:'text', redirects:'1', disableeditsection:'1' });
  const html = j.parse && (typeof j.parse.text === 'string' ? j.parse.text : j.parse.text && j.parse.text['*']);
  let paras = parseHtmlToParas(html || '');
  if (intro) paras = paras.slice(0, 4);
  return paras;
}
const WP_SRC = (title, url) => ({ name:'Wikipédia', url:url || wikiURL(WP, title), license:'CC BY-SA 4.0', licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/deed.pt_BR' });
const WN_SRC = (title) => ({ name:'Wikinews', url:wikiURL(WN, title), license:'CC BY 2.5', licenseUrl:'https://creativecommons.org/licenses/by/2.5/deed.pt_BR' });
async function wpArticleDoc(title, fallbackExtract, url){
  let paras = [];
  try { paras = await pageText(WP, title, true); } catch(e){ if (!fallbackExtract) throw e; }
  if (!paras.length && fallbackExtract) paras = extractToParas(fallbackExtract);
  if (!paras.length) throw new Error('artigo vazio');
  const c = capParas(paras);
  return { kind:'wiki', id:'wp:' + title, title, paras:c.paras, cut:c.cut, source:WP_SRC(title, url), label:'Artigo · Wikipédia', adaptable:true };
}
/* artigo aleatório "legível": pega 10 aleatórios e escolhe o de introdução mais substanciosa */
async function randomArticle(){
  const j = await mw(WP, { action:'query', generator:'random', grnnamespace:'0', grnlimit:'10', prop:'extracts|info', exintro:'1', explaintext:'1', exlimit:'10', inprop:'url' });
  const pages = pagesOf(j).filter(p => p.extract);
  if (!pages.length) throw new Error('nenhum artigo');
  const score = p => { const n = words(p.extract); return n < 40 ? n : n > 450 ? 450 - (n - 450) / 4 : n + 100; };
  pages.sort((a, b) => score(b) - score(a));
  const p = pages[0], c = capParas(extractToParas(p.extract));
  return { kind:'wiki', id:'wp:' + p.title, title:p.title, paras:c.paras, cut:c.cut, source:WP_SRC(p.title, p.fullurl), label:'Artigo · Wikipédia', adaptable:true };
}
async function searchArticle(q){
  const j = await mw(WP, { action:'query', generator:'search', gsrsearch:q, gsrlimit:'1', gsrnamespace:'0', prop:'extracts|info', exintro:'1', explaintext:'1', inprop:'url' });
  const p = pagesOf(j)[0]; if (!p || !p.extract) return null;
  const c = capParas(extractToParas(p.extract));
  return { kind:'wiki', id:'wp:' + p.title, title:p.title, paras:c.paras, cut:c.cut, source:WP_SRC(p.title, p.fullurl), label:'Artigo · Wikipédia', adaptable:true };
}

/* ---------------------------------------------------------------- módulo LEITURA */
const TOPICS = [
  { id:'cotidiano', e:'🏠', label:'Cotidiano', ai:'vida cotidiana (casa, compras, amigos, família)' },
  { id:'viagem', e:'✈️', label:'Viagem', ai:'uma viagem (transporte, hotel, turismo, imprevistos)' },
  { id:'misterio', e:'🔍', label:'Mistério', ai:'um pequeno mistério com uma solução inteligente' },
  { id:'humor', e:'😄', label:'Humor', ai:'uma situação engraçada com final cômico' },
  { id:'cultura', e:'🎭', label:'Cultura do país', ai:{ es:'a cultura da Espanha ou de um país hispano-americano (festas, comida, costumes)', fr:'a cultura da França ou de um país francófono (festas, comida, costumes)', de:'a cultura da Alemanha, Áustria ou Suíça (festas, comida, costumes)', it:'a cultura da Itália (festas, comida, costumes, regiões)', en:'a cultura do Reino Unido, EUA, Irlanda ou Austrália (festas, comida, costumes)' }[LANG] },
  { id:'ciencia', e:'🔬', label:'Ciência', ai:'uma curiosidade científica explicada através de uma história' },
  { id:'esporte', e:'⚽', label:'Esporte', ai:'esporte (um jogo, um treino, um torcedor)' },
  { id:'historia', e:'🏛️', label:'História', ai:'um episódio histórico real, contado de forma simples e correta' },
  { id:'trabalho', e:'💼', label:'Trabalho', ai:'o mundo do trabalho (escritório, entrevista, colegas, um projeto)' },
];
const TAB_LIST = [['stories', '📚', 'Histórias'], ['news', '📰', 'Notícias'], ['wiki', '🌍', 'Wikipédia']];

function openRead(body, ctx){
  const arg = ctx.arg || {};
  const S0 = { tab: store().tab || 'stories', topic: null, closed:false };
  let cleanup = [];
  const runCleanup = () => { cleanup.forEach(fn => { try { fn(); } catch(e){} }); cleanup = []; F.hidePopover && F.hidePopover(); };
  ctx.onClose(() => { S0.closed = true; runCleanup(); });

  /* ---------- listas ---------- */
  function renderHome(){
    runCleanup(); ctx.setTitle('Leitura'); window.scrollTo(0, 0);
    body.innerHTML = `<div class="seg read-tabs" role="tablist">${TAB_LIST.map(([id, e, l]) => `<button role="tab" data-tab="${id}" class="${S0.tab === id ? 'on' : ''}"><span class="e">${e}</span>${l}</button>`).join('')}</div><div id="readPane" style="display:flex;flex-direction:column;gap:12px"></div>`;
    body.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S0.tab = b.dataset.tab; store().tab = S0.tab; F.save(); renderHome(); });
    const pane = $q(body, '#readPane');
    if (S0.tab === 'stories') renderStories(pane);
    else if (S0.tab === 'news') renderNews(pane);
    else renderWiki(pane);
  }

  function renderStories(pane){
    const lv = F.level(), L = lvInfo(), st = store().stories || [];
    pane.innerHTML = `<div class="card">
        <h3 class="read-h">Escolha um tema</h3>
        <p class="read-sub">A IA escreve uma história original no seu nível <b>${lv}</b> (~${L.n} palavras), com perguntas e vocabulário.</p>
        <div class="chips read-topics">${TOPICS.map(t => `<button data-t="${t.id}" class="${S0.topic === t.id ? 'on' : ''}">${t.e} ${t.label}</button>`).join('')}<button data-t="surpresa" class="${S0.topic === 'surpresa' ? 'on' : ''}">🎲 Surpresa</button></div>
        <button class="btn btn-primary read-gen" id="readGen">${S0.topic ? 'Gerar história' : 'Gerar história surpresa'}</button>
        <div id="readGenOut"></div>
      </div>
      ${st.length ? `<div class="card"><h3 class="read-h">Suas histórias</h3><p class="read-sub">Ficam salvas para reler, mesmo sem internet.</p><div class="read-list">${st.map(s => {
        const t = TOPICS.find(x => x.id === s.topic);
        return `<button class="read-item" data-s="${esc(s.id)}"><span class="ri">${t ? t.e : '🎲'}</span><span class="rt"><b>${esc(s.titulo)}</b><small>${s.lv} · ${t ? t.label : 'Surpresa'} · ${fmtDate(s.ts * 1000)}${s.read ? ' · ✓ lida' : ''}</small></span><span class="chev">›</span></button>`; }).join('')}</div></div>` : ''}`;
    pane.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { S0.topic = S0.topic === b.dataset.t ? null : b.dataset.t; renderStories(pane); });
    pane.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const s = (store().stories || []).find(x => x.id === b.dataset.s); if (s) openReader(storyDoc(s)); });
    const gen = async () => {
      const out = $q(pane, '#readGenOut'), btn = $q(pane, '#readGen');
      const tid = !S0.topic || S0.topic === 'surpresa' ? TOPICS[Math.floor(Math.random() * TOPICS.length)].id : S0.topic;
      const topic = TOPICS.find(t => t.id === tid);
      btn.disabled = true; out.innerHTML = F.loading(`Escrevendo uma história (${topic.label.toLowerCase()})…`);
      try {
        const s = await aiStory(topic); if (S0.closed) return;
        saveStory(s); openReader(storyDoc(s));
      } catch(err) {
        if (S0.closed) return; btn.disabled = false;
        out.innerHTML = F.errorBox(err, 'readGenRetry'); const r = $q(out, '#readGenRetry'); if (r) r.onclick = gen;
      }
    };
    $q(pane, '#readGen').onclick = gen;
  }
  const storyDoc = s => ({ kind:'story', id:s.id, storyId:s.id, title:s.titulo, paras:s.texto, questions:s.perguntas, vocab:s.vocabulario, summary:s.resumo_pt, lv:s.lv,
    label:'História ' + s.lv, source:{ text:'História original gerada por IA para o seu nível.' }, adaptable:false });

  function renderNews(pane){
    pane.innerHTML = `<div class="card" id="readWpNews"><h3 class="read-h">Manchetes de hoje</h3><p class="read-sub">Notícias reais em ${F.tgtName}, da seção de notícias da Wikipédia.</p><div class="read-body">${F.loading('Buscando manchetes…')}</div></div>
      <div class="card" id="readWn"><h3 class="read-h">Wikinews</h3><p class="read-sub">Reportagens completas do Wikinews em ${F.tgtName}.</p><div class="read-body">${F.loading('Buscando notícias…')}</div></div>
      <div id="readSim"></div>`;
    let fails = 0;
    const simBox = () => {
      if (fails < 2 || S0.closed) return;
      $q(pane, '#readSim').innerHTML = `<div class="card"><h3 class="read-h">Sem notícias reais agora</h3><p class="read-sub">As fontes de notícias não responderam (sem internet ou serviço fora do ar). Você pode treinar com uma <b>notícia simulada</b>: um texto fictício no estilo de jornal, gerado por IA.</p><button class="btn btn-secondary wide" id="readSimBtn">📰 Gerar notícia simulada</button><div id="readSimOut"></div></div>`;
      const go = async () => {
        const out = $q(pane, '#readSimOut'); out.innerHTML = F.loading('Escrevendo a notícia simulada…');
        try { const d = await aiFakeNews(); if (!S0.closed) openReader(d); }
        catch(err){ out.innerHTML = F.errorBox(err, 'readSimRetry'); const r = $q(out, '#readSimRetry'); if (r) r.onclick = go; }
      };
      $q(pane, '#readSimBtn').onclick = go;
    };
    // Wikipédia: manchetes
    loadFeed().then(feed => {
      if (S0.closed || !pane.isConnected) return;
      const items = newsItems(feed); const box = $q(pane, '#readWpNews .read-body');
      if (!items.length) { $q(pane, '#readWpNews').remove(); fails++; return simBox(); }
      box.innerHTML = `<div class="read-list">${items.slice(0, 8).map((n, i) => `<button class="read-item" data-n="${i}"><span class="ri">🗞️</span><span class="rt"><b>${esc(n.story.length > 160 ? n.story.slice(0, 157) + '…' : n.story)}</b><small>${esc(n.main ? sumTitle(n.main) : 'Wikipédia')}</small></span><span class="chev">›</span></button>`).join('')}</div>`;
      box.querySelectorAll('[data-n]').forEach(b => b.onclick = () => openNewsItem(items[+b.dataset.n]));
    }).catch(() => { if (S0.closed || !pane.isConnected) return; const c = $q(pane, '#readWpNews'); c && c.remove(); fails++; simBox(); });
    // Wikinews
    loadWikinews().then(list => {
      if (S0.closed || !pane.isConnected) return;
      const box = $q(pane, '#readWn .read-body');
      const newest = Math.max(...list.map(x => Date.parse(x.date) || 0));
      const old = newest && Date.now() - newest > 45 * 86400000;
      box.innerHTML = `${old ? `<p class="read-note" style="margin:-4px 0 6px">📦 Arquivo: o Wikinews não publica desde ${fmtDate(newest)}. As notícias são reais, mas não são de hoje.</p>` : ''}<div class="read-list">${list.slice(0, 15).map((n, i) => `<button class="read-item" data-w="${i}"><span class="ri">📰</span><span class="rt"><b>${esc(n.title)}</b><small>${n.date ? fmtDate(n.date) : 'Wikinews'}</small></span><span class="chev">›</span></button>`).join('')}</div>`;
      box.querySelectorAll('[data-w]').forEach(b => b.onclick = () => openWikinews(list[+b.dataset.w]));
    }).catch(() => { if (S0.closed || !pane.isConnected) return; const c = $q(pane, '#readWn'); c && c.remove(); fails++; simBox(); });
  }
  async function openNewsItem(n){
    body.innerHTML = F.loading('Abrindo a notícia…');
    try {
      let paras = [n.story], title = n.main ? sumTitle(n.main) : 'Notícia', cut = false;
      if (n.main) {
        let ctxParas = [];
        try { ctxParas = await pageText(WP, title, true); } catch(e){}
        if (!ctxParas.length && n.main.extract) ctxParas = extractToParas(n.main.extract);
        const c = capParas(ctxParas, 380); cut = c.cut; paras = paras.concat(c.paras);
      }
      if (S0.closed) return;
      openReader({ kind:'news', id:'wpn:' + hash(n.story), title, lead:true, paras, cut, label:'Notícia real · Wikipédia', source:WP_SRC(title, n.main && n.main.content_urls && n.main.content_urls.desktop && n.main.content_urls.desktop.page), adaptable:true, date:Date.now() });
    } catch(err){ if (!S0.closed) { body.innerHTML = F.errorBox(err, 'readBackErr'); $q(body, '#readBackErr').onclick = renderHome; } }
  }
  async function openWikinews(n){
    body.innerHTML = F.loading('Abrindo a notícia…');
    try {
      const all = await pageText(WN, n.title, false); if (S0.closed) return;
      if (!all.length) throw Object.assign(new Error('vazio'), { friendly:'Esta notícia veio sem texto. Escolha outra.' });
      const c = capParas(all, 520);
      openReader({ kind:'wikinews', id:'wn:' + n.title, title:n.title, paras:c.paras, cut:c.cut, date:n.date, label:'Notícia real · Wikinews', source:WN_SRC(n.title), adaptable:true });
    } catch(err){ if (!S0.closed) { body.innerHTML = `<button class="read-back" id="readBack0">‹ Voltar às notícias</button>` + F.errorBox(err, 'readRetryWn'); $q(body, '#readRetryWn').onclick = () => openWikinews(n); $q(body, '#readBack0').onclick = renderHome; } }
  }

  function renderWiki(pane){
    pane.innerHTML = `<div class="card" id="readTfa"><h3 class="read-h">Artigo em destaque</h3><div class="read-body">${F.loading('Buscando o destaque de hoje…')}</div></div>
      <div class="card"><h3 class="read-h">Explorar</h3><p class="read-sub">Leia a introdução de um artigo da Wikipédia em ${F.tgtName} — e adapte ao seu nível se ficar difícil.</p>
        <button class="btn btn-secondary wide" id="readRand">🎲 Artigo aleatório</button>
        <form class="read-search" id="readSearch"><input class="txt" id="readQ" placeholder="Buscar um tema (ex.: ${esc({ es:'tapas', fr:'croissant', de:'Brezel', it:'pizza', en:'tea' }[LANG] || 'música')})" autocomplete="off" enterkeyhint="search"><button class="tool primary" type="submit">Ler</button></form>
        <div id="readWikiOut"></div></div>`;
    const out = $q(pane, '#readWikiOut');
    const fail = (err, retry) => { out.innerHTML = F.errorBox(Object.assign(err || new Error(''), { friendly:(err && err.friendly) || 'Não consegui falar com a Wikipédia agora. Verifique a internet e tente de novo.' }), 'readWikiRetry'); const r = $q(out, '#readWikiRetry'); if (r) r.onclick = retry; };
    const rand = async () => { out.innerHTML = F.loading('Sorteando um artigo…'); try { const d = await randomArticle(); if (!S0.closed) openReader(d); } catch(e){ if (!S0.closed) fail(e, rand); } };
    $q(pane, '#readRand').onclick = rand;
    $q(pane, '#readSearch').onsubmit = async ev => {
      ev.preventDefault(); const q = $q(pane, '#readQ').value.trim(); if (!q) return;
      const go = async () => { out.innerHTML = F.loading('Procurando…'); try { const d = await searchArticle(q); if (S0.closed) return; if (d) openReader(d); else out.innerHTML = `<p class="read-note">Nada encontrado para “${esc(q)}”. Tente outra palavra (em ${F.tgtName}).</p>`; } catch(e){ if (!S0.closed) fail(e, go); } };
      go();
    };
    loadFeed().then(feed => {
      if (S0.closed || !pane.isConnected) return;
      const t = feed.tfa, box = $q(pane, '#readTfa .read-body');
      const pick = t && t.extract ? t : (feed.mostread && feed.mostread.articles || []).find(a => a.extract && words(a.extract) > 40);
      if (!pick) { $q(pane, '#readTfa').remove(); return; }
      if (pick !== t) $q(pane, '#readTfa .read-h').textContent = 'Mais lido hoje';
      const thumb = pick.thumbnail && pick.thumbnail.source;
      box.innerHTML = `<button class="read-feat" id="readFeat">${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy">` : ''}<span><b>${esc(sumTitle(pick))}</b><p>${esc(pick.extract)}</p></span></button>`;
      const img = $q(box, 'img'); if (img) img.onerror = () => img.remove();
      $q(box, '#readFeat').onclick = async () => {
        body.innerHTML = F.loading('Abrindo o artigo…');
        try { const d = await wpArticleDoc(sumTitle(pick), pick.extract, pick.content_urls && pick.content_urls.desktop && pick.content_urls.desktop.page); if (!S0.closed) openReader(d); }
        catch(e){ if (!S0.closed) { body.innerHTML = F.errorBox(e, 'readBackErr'); $q(body, '#readBackErr').onclick = renderHome; } }
      };
    }).catch(() => { if (S0.closed || !pane.isConnected) return; const c = $q(pane, '#readTfa'); c && c.remove(); });
  }

  /* ---------- leitor ---------- */
  function openReader(doc){
    runCleanup(); window.scrollTo(0, 0);
    const R = { doc, view:'orig', adapted:null, tts:{ token:0, idx:0, playing:false }, trOn:false, tr:null, t0:Date.now(), finished:false, quizDone:false, answered:0, correct:0, scrolledEnd:false };
    const cur = () => R.view === 'adapt' && R.adapted ? { title:R.adapted.titulo, paras:R.adapted.texto, questions:R.adapted.perguntas, vocab:R.adapted.vocabulario } : { title:doc.title, paras:doc.paras, questions:doc.questions, vocab:doc.vocab };
    cleanup.push(() => { R.tts.token++; F.stopSpeech(); });

    body.innerHTML = `<button class="read-back" id="readBack">‹ ${S0.tab === 'stories' ? 'Histórias' : S0.tab === 'news' ? 'Notícias' : 'Wikipédia'}</button>
      <div class="read-bar" id="readBar">
        <button class="tool primary" id="rbPlay">🔊 Ouvir</button>
        <button class="tool hidden" id="rbStop" aria-label="Parar">⏹</button>
        <button class="tool" id="rbTr" aria-pressed="false">🌐 Traduzir</button>
        <span class="spacer"></span>
        <button class="tool" id="rbMinus" aria-label="Diminuir letra">A−</button>
        <button class="tool" id="rbPlus" aria-label="Aumentar letra">A+</button>
      </div>
      <div class="card read-doc" id="readDoc"></div>
      <div class="read-end" id="readEnd"></div>
      <div id="readQuiz"></div>
      <div id="readDone"></div>`;
    $q(body, '#readBack').onclick = renderHome;
    const docEl = $q(body, '#readDoc');
    const setFs = () => docEl.style.setProperty('--read-fs', fontSize() + 'px');
    $q(body, '#rbMinus').onclick = () => { store().fs = Math.max(15, fontSize() - 2); touch(); setFs(); };
    $q(body, '#rbPlus').onclick = () => { store().fs = Math.min(30, fontSize() + 2); touch(); setFs(); };
    setFs();

    function renderDoc(){
      const c = cur();
      const nw = c.paras.reduce((a, p) => a + words(p), 0);
      const tags = [doc.label ? `<span class="tag ${doc.kind === 'sim' ? 'read-tag-sim' : ''}">${esc(doc.label)}</span>` : '', R.view === 'adapt' ? `<span class="tag new">Adaptado · ${F.level()}</span>` : '', doc.date && doc.kind !== 'story' ? `<span class="tag">${fmtDate(doc.date)}</span>` : ''].join('');
      const src = doc.source || {};
      const srcLine = src.url ? `Fonte: <a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.name)} — “${esc(doc.title)}”</a> · licença <a href="${esc(src.licenseUrl)}" target="_blank" rel="noopener">${esc(src.license)}</a>${R.view === 'adapt' ? '. Versão adaptada pela IA a partir do original.' : doc.cut ? '. Trecho do texto original.' : '.'}` : esc(src.text || '');
      docEl.innerHTML = `<div class="read-tags">${tags}</div>
        <h2 class="read-title">${F.clickable(c.title)}</h2>
        <div class="read-meta">${nw} palavras · ~${Math.max(1, Math.round(nw / 120))} min de leitura</div>
        ${doc.summary ? `<details class="read-sum"><summary>Resumo em ${esc(F.srcName)}</summary>${esc(doc.summary)}</details>` : ''}
        ${doc.adaptable ? `<div class="read-view" role="tablist"><button data-v="orig" class="${R.view === 'orig' ? 'on' : ''}">Original</button><button data-v="adapt" class="${R.view === 'adapt' ? 'on' : ''}">Adaptado ao meu nível</button></div>` : ''}
        <div id="readViewOut"></div>
        <div class="read-text" id="readText">${c.paras.map((p, i) => `<p data-i="${i}" class="${doc.lead && R.view === 'orig' && i === 0 ? 'read-lead' : ''}">${F.clickable(p)}</p><div class="read-tr hidden" data-tr="${i}"></div>`).join('')}
          ${doc.cut && R.view === 'orig' ? `<div class="read-short">Texto encurtado para a leitura — o restante está na fonte.</div>` : ''}</div>
        ${c.vocab && c.vocab.length ? `<h3 class="read-h" style="margin-top:16px">Palavras-chave</h3><div class="read-voc">${c.vocab.map((v, i) => `<button data-vi="${i}" class="${F.vocab.has(v.palavra) ? 'saved' : ''}"><b>${esc(v.palavra)}</b><span>${esc(v.traducao)}</span><i>${F.vocab.has(v.palavra) ? '✓' : '+'}</i></button>`).join('')}</div>` : ''}
        <p class="small muted" style="margin:14px 0 0">Toque em qualquer palavra para ver a tradução e salvá-la.</p>
        <div class="read-src">${srcLine}</div>
        ${!R.finished ? `<button class="btn btn-ghost read-finish" id="readFinish">✓ Terminei de ler</button>` : ''}`;
      if (doc.lead && R.view === 'orig' && c.paras.length > 1) {
        
        const p1 = $q(docEl, 'p[data-i="1"]'); if (p1) p1.insertAdjacentHTML('beforebegin', `<div class="read-dl" style="margin:.2em 0 .4em">Contexto — ${esc(c.title)}</div>`);
      }
      F.bindLookup($q(docEl, '.read-text'), sentenceAround);
      F.bindLookup($q(docEl, '.read-title'), sentenceAround);
      docEl.querySelectorAll('[data-v]').forEach(b => b.onclick = () => switchView(b.dataset.v));
      docEl.querySelectorAll('[data-vi]').forEach(b => b.onclick = () => {
        const v = c.vocab[+b.dataset.vi]; if (F.vocab.has(v.palavra)) { F.say(v.palavra); return; }
        F.vocab.add(v.palavra, v.traducao, findContext(v.palavra, c.paras)); b.classList.add('saved'); $q(b, 'i').textContent = '✓';
      });
      const fin = $q(docEl, '#readFinish'); if (fin) fin.onclick = () => finish(true);
      if (R.trOn) showTranslations();
      renderQuiz();
    }
    async function switchView(v){
      if (v === R.view) return;
      stopTTS();
      if (v === 'adapt' && !R.adapted) {
        const out = $q(docEl, '#readViewOut');
        docEl.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === 'adapt'));
        out.innerHTML = F.loading(`Adaptando ao nível ${F.level()}…`); $q(docEl, '#readText').style.opacity = '.35';
        try { R.adapted = await aiAdapt(doc); }
        catch(err){
          if (S0.closed) return; $q(docEl, '#readText').style.opacity = '';
          docEl.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === 'orig'));
          out.innerHTML = F.errorBox(err, 'readAdRetry'); const r = $q(out, '#readAdRetry'); if (r) r.onclick = () => { out.innerHTML = ''; switchView('adapt'); };
          return;
        }
        if (S0.closed || !docEl.isConnected) return;
      }
      R.view = v; R.tr = null; R.trOn = false; $q(body, '#rbTr').classList.remove('on'); $q(body, '#rbTr').setAttribute('aria-pressed', 'false');
      R.answered = 0; R.correct = 0; R.quizDone = false; R.t0 = Date.now(); R.scrolledEnd = false;
      renderDoc();
    }

    /* ---- ouvir (TTS parágrafo por parágrafo, com destaque) ---- */
    const playBtn = $q(body, '#rbPlay'), stopBtn = $q(body, '#rbStop');
    function ttsUI(){
      playBtn.textContent = R.tts.playing ? '⏸ Pausar' : R.tts.idx > 0 ? '▶ Continuar' : '🔊 Ouvir';
      stopBtn.classList.toggle('hidden', !(R.tts.playing || R.tts.idx > 0));
    }
    function hl(i){ docEl.querySelectorAll('.read-text p').forEach(p => p.classList.toggle('read-now', +p.dataset.i === i)); }
    async function playTTS(){
      const my = ++R.tts.token; R.tts.playing = true; ttsUI();
      const ps = cur().paras;
      for (let i = R.tts.idx; i < ps.length; i++) {
        if (my !== R.tts.token) return;
        R.tts.idx = i; hl(i);
        const p = docEl.querySelector(`.read-text p[data-i="${i}"]`);
        if (p) { const r = p.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 20) p.scrollIntoView({ block:'center', behavior:'smooth' }); }
        await F.say(ps[i], { rate:F.level() <= 'A2' ? 0.85 : 1 });
      }
      if (my !== R.tts.token) return;
      R.tts.playing = false; R.tts.idx = 0; hl(-1); ttsUI();
    }
    function pauseTTS(){ R.tts.token++; R.tts.playing = false; F.stopSpeech(); ttsUI(); }
    function stopTTS(){ R.tts.token++; R.tts.playing = false; R.tts.idx = 0; F.stopSpeech(); hl(-1); ttsUI(); }
    playBtn.onclick = () => R.tts.playing ? pauseTTS() : playTTS();
    stopBtn.onclick = stopTTS;

    /* ---- traduzir parágrafos ---- */
    const trBtn = $q(body, '#rbTr');
    function showTranslations(){
      docEl.querySelectorAll('[data-tr]').forEach(d => { const t = R.tr && R.tr[+d.dataset.tr]; d.textContent = t || ''; d.classList.toggle('hidden', !R.trOn || !t); });
    }
    trBtn.onclick = async () => {
      R.trOn = !R.trOn; trBtn.classList.toggle('on', R.trOn); trBtn.setAttribute('aria-pressed', String(R.trOn));
      if (R.trOn && !R.tr) {
        trBtn.disabled = true; trBtn.textContent = '🌐 Traduzindo…';
        try { R.tr = await aiTranslate(cur().paras); }
        catch(err){ R.trOn = false; trBtn.classList.remove('on'); F.toast(err.friendly || 'Não consegui traduzir agora.'); }
        trBtn.disabled = false; trBtn.textContent = '🌐 Traduzir';
        if (!docEl.isConnected) return;
      }
      showTranslations();
    };

    /* ---- perguntas ---- */
    function renderQuiz(){
      const box = $q(body, '#readQuiz'); const qs = cur().questions;
      if (!qs || !qs.length) {
        box.innerHTML = `<div class="card"><h3 class="read-h">Teste sua compreensão</h3><p class="read-sub" style="margin-bottom:10px">3 perguntas rápidas sobre o texto${R.view === 'orig' && doc.adaptable ? ' original' : ''}.</p><button class="btn btn-secondary wide" id="readGenQ">❓ Criar perguntas</button><div id="readGenQOut"></div></div>`;
        const go = async () => {
          const out = $q(box, '#readGenQOut'), b = $q(box, '#readGenQ'); b.disabled = true; out.innerHTML = F.loading('Criando perguntas…');
          try { const q = await aiQuestions(cur().paras); if (S0.closed || !box.isConnected) return; if (R.view === 'adapt' && R.adapted) R.adapted.perguntas = q; else doc.questions = q; renderQuiz(); }
          catch(err){ b.disabled = false; out.innerHTML = F.errorBox(err, 'readGenQRetry'); const r = $q(out, '#readGenQRetry'); if (r) r.onclick = go; }
        };
        $q(box, '#readGenQ').onclick = go;
        return;
      }
      R.answered = 0; R.correct = 0;
      box.innerHTML = `<div class="card"><h3 class="read-h" style="margin:0">Compreensão</h3>${qs.map((q, i) => `<div class="read-q" data-q="${i}"><div class="qn">Pergunta ${i + 1} de ${qs.length}</div><div class="qt">${F.clickable(q.pergunta)}</div>${q.opcoes.map((o, j) => `<button class="read-opt" data-o="${j}"><span class="k">${'ABCD'[j] || j + 1}</span><span>${esc(o)}</span></button>`).join('')}<div class="read-expbox"></div></div>`).join('')}</div>`;
      box.querySelectorAll('.qt').forEach(el => F.bindLookup(el, sentenceAround));
      box.querySelectorAll('.read-q').forEach(qe => {
        const q = qs[+qe.dataset.q];
        qe.querySelectorAll('.read-opt').forEach(b => b.onclick = () => {
          const j = +b.dataset.o, ok = j === q.correta;
          qe.querySelectorAll('.read-opt').forEach(x => { x.disabled = true; const k = +x.dataset.o; x.classList.add(k === q.correta ? 'ok' : k === j ? 'bad' : 'dim'); });
          $q(qe, '.read-expbox').innerHTML = `<div class="read-exp ${ok ? 'ok' : 'bad'}"><b>${ok ? ['Isso mesmo!', 'Perfeito!', 'Acertou!'][Math.floor(Math.random() * 3)] + ' +5' : 'Não foi dessa vez.'}</b>${!ok ? `Resposta certa: <b style="display:inline">${esc(q.opcoes[q.correta])}</b>. ` : ''}${esc(q.explicacao)}</div>`;
          R.answered++; if (ok) { R.correct++; F.addPoints(5); }
          if (R.answered === qs.length) { R.quizDone = true; finish(false); }
          else { const nx = qe.nextElementSibling; if (nx) setTimeout(() => { const r = nx.getBoundingClientRect(); if (r.top > innerHeight - 120) nx.scrollIntoView({ block:'start', behavior:'smooth' }); }, 700); }
        });
      });
    }

    /* ---- fim da leitura: tempo, palavras/min, plano ---- */
    function finish(manual){
      const c = cur(), nw = c.paras.reduce((a, p) => a + words(p), 0);
      const secs = Math.max(1, (Date.now() - R.t0) / 1000);
      if (!R.finished) {
        R.finished = true; R.readSecs = secs; F.addPoints(3);
        if (doc.storyId) markRead(doc.storyId);
        F.planDone && F.planDone('read');
        const fb = $q(docEl, '#readFinish'); if (fb) fb.remove();
      }
      const wpm = Math.round(nw / (R.readSecs / 60));
      const qs = c.questions || [];
      const box = $q(body, '#readDone');
      const msg = R.quizDone ? (R.correct === qs.length ? 'Compreensão perfeita!' : R.correct >= qs.length / 2 ? 'Boa leitura!' : 'Leitura concluída — releia os trechos das explicações.') : 'Leitura concluída!';
      box.innerHTML = `<div class="card read-done"><div class="small muted" style="font-weight:700">${R.quizDone ? 'Resultado' : 'Muito bem'}</div><div class="big">${msg}</div>
        <div class="read-stats"><div><b>${mmss(R.readSecs)}</b><span>tempo de leitura</span></div><div><b>${wpm > 600 ? '—' : wpm}</b><span>palavras/min</span></div><div><b>${R.quizDone ? `${R.correct}/${qs.length}` : nw}</b><span>${R.quizDone ? 'acertos' : 'palavras'}</span></div></div>
        ${!R.quizDone && qs.length ? `<p class="small muted" style="margin:6px 0 0">Responda às perguntas acima para fixar a compreensão.</p>` : ''}
        <div class="read-btns">${arg.fromPlan ? `<button class="btn btn-primary" id="readPlan">Voltar ao plano</button><button class="btn btn-ghost" id="readMore">Ler outro</button>` : `<button class="btn btn-ghost" id="readWords">🗂️ Minhas palavras</button><button class="btn btn-primary" id="readMore">Ler outro</button>`}</div></div>`;
      const more = $q(box, '#readMore'); if (more) more.onclick = renderHome;
      const pl = $q(box, '#readPlan'); if (pl) pl.onclick = () => F.open('plan', { fromRead:true });
      const wd = $q(box, '#readWords'); if (wd) wd.onclick = () => F.open('words');
      if (manual || R.quizDone) setTimeout(() => box.isConnected && box.scrollIntoView({ block:'nearest', behavior:'smooth' }), 150);
    }
    /* terminou ao chegar ao fim do texto — mas só depois de um tempo mínimo plausível de leitura */
    const endEl = $q(body, '#readEnd');
    {
      let tmr = null, raf = 0;
      const minSecs = () => Math.max(12, cur().paras.reduce((a, p) => a + words(p), 0) / 450 * 60);
      const check = () => { if (R.finished || S0.closed || !R.scrolledEnd) return; const el = (Date.now() - R.t0) / 1000; if (el >= minSecs()) finish(false); else { clearTimeout(tmr); tmr = setTimeout(check, (minSecs() - el) * 1000 + 50); } };
      const onScroll = () => { if (raf || R.finished) return; raf = requestAnimationFrame(() => { raf = 0;
        if (!R.scrolledEnd && endEl.isConnected && window.scrollY > 40 && endEl.getBoundingClientRect().top < innerHeight) { R.scrolledEnd = true; check(); } }); };
      window.addEventListener('scroll', onScroll, { passive:true });
      cleanup.push(() => { window.removeEventListener('scroll', onScroll); clearTimeout(tmr); cancelAnimationFrame(raf); });
    }
    renderDoc(); ttsUI();
  }

  if (arg.doc) openReader(arg.doc); else renderHome();
}

F.register({
  id:'read', title:'Leitura', icon:'📖', desc:'Histórias no seu nível, notícias reais e Wikipédia', order:50,
  subtitle(){
    try { const st = store().stories || []; const unread = st.filter(s => !s.read).length;
      return unread ? `${unread} história${unread > 1 ? 's' : ''} para ler · nível ${F.level()}` : `Histórias, notícias e Wikipédia · ${F.level()}`; }
    catch(e){ return 'Histórias, notícias e Wikipédia'; }
  },
  open: openRead,
});

/* ---------------------------------------------------------------- módulo MINHAS PALAVRAS */
const norm = s => F.strip(String(s).toLowerCase()).replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
const lev = (a, b) => { const d = Array.from({ length:a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length]; };
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function markWord(ctxText, w, mask){
  const e = esc(ctxText || ''); if (!w) return e;
  const re = new RegExp(`(^|[^\\p{L}])(${reEsc(esc(w))})(?=[^\\p{L}]|$)`, 'giu');
  return e.replace(re, (m, a, b) => `${a}<mark>${mask ? '＿'.repeat(Math.min(6, Math.max(3, b.length / 2 | 0))) : b}</mark>`);
}
const dots = lv => `<span class="words-dots" title="Domínio ${lv || 0}/4">${[1, 2, 3, 4].map(i => `<i class="${(lv || 0) >= i ? 'on' : ''}"></i>`).join('')}</span>`;

function openWords(body, ctx){
  const arg = ctx.arg || {};
  let closed = false, q = '';
  ctx.onClose(() => { closed = true; });

  function renderList(){
    ctx.setTitle('Minhas palavras'); window.scrollTo(0, 0);
    const all = F.vocab.list(), due = F.vocab.due();
    if (!all.length) {
      body.innerHTML = `<div class="card words-empty"><div class="e">🗂️</div><h3 class="read-h" style="margin:6px 0">Nenhuma palavra salva ainda</h3>
        <p class="muted">Toque em qualquer palavra de um texto em <b>Leitura</b>, <b>Conversa</b> ou <b>Diário</b> para ver a tradução — e toque em <b>+ Minhas palavras</b> para guardá-la aqui.</p>
        <p class="muted">Depois, revise com cartões: o app traz cada palavra de volta no momento certo para você não esquecer.</p>
        <button class="btn btn-primary wide" id="wGoRead" style="margin-top:10px">📖 Ir para a Leitura</button></div>`;
      $q(body, '#wGoRead').onclick = () => F.open('read');
      return;
    }
    body.innerHTML = `<div class="card"><div class="words-top"><div class="n num">${due.length}</div><div class="l">${due.length ? `palavra${due.length > 1 ? 's' : ''} para revisar hoje<br><span class="muted small">${all.length} salvas no total</span>` : `<b>Tudo revisado por hoje!</b><br><span class="muted small">${all.length} palavras salvas · treine à vontade</span>`}</div></div>
        <div class="words-modes">${due.length ? `<button class="btn btn-primary" id="wRev">Revisar (${due.length})<small>cartões</small></button><button class="btn btn-secondary" id="wWrite">✍️ Escrever<small>digite a palavra</small></button>`
          : `<button class="btn btn-ghost" id="wRev">Treino extra<small>cartões</small></button><button class="btn btn-ghost" id="wWrite">✍️ Escrever<small>treino extra</small></button>`}</div></div>
      <input class="txt" id="wSearch" type="search" placeholder="Buscar nas suas ${all.length} palavras" value="${esc(q)}" autocomplete="off">
      <div class="card" id="wList" style="padding:4px 14px"></div>`;
    const extra = !due.length;
    const pool = () => extra ? F.shuffle(all.slice()).slice(0, 10) : F.shuffle(due.slice()).slice(0, 20);
    $q(body, '#wRev').onclick = () => review('flip', pool(), extra);
    $q(body, '#wWrite').onclick = () => review('write', pool(), extra);
    const s = $q(body, '#wSearch'); s.oninput = () => { q = s.value; drawItems(); };
    drawItems();
  }
  function drawItems(){
    const box = $q(body, '#wList'); if (!box) return;
    const nq = norm(q);
    const items = F.vocab.list().filter(x => !nq || norm(x.w).includes(nq) || norm(x.t).includes(nq));
    box.innerHTML = items.length ? items.map(x => `<div class="words-item" data-k="${esc(x.w)}"><div class="wt"><div class="ww">${esc(x.w)}${dots(x.lv)}</div><div class="wtr">${esc(x.t || '—')}</div>${x.ctx ? `<div class="wc">${markWord(x.ctx, x.w)}</div>` : ''}</div>
        <div class="acts"><button class="tool" data-a="say" aria-label="Ouvir">🔊</button><button class="tool" data-a="del" aria-label="Remover">✕</button></div></div>`).join('')
      : `<p class="muted" style="padding:10px 2px">Nada encontrado para “${esc(q)}”.</p>`;
    box.querySelectorAll('.words-item').forEach(el => {
      const w = el.dataset.k, it = F.vocab.list().find(x => x.w === w);
      $q(el, '[data-a=say]').onclick = () => F.say(it && it.ctx ? it.ctx : w);
      $q(el, '[data-a=del]').onclick = () => {
        const backup = it ? { ...it } : null;
        F.vocab.remove(w); el.remove(); F.toast(`“${w}” removida`);
        if (!F.vocab.list().length) renderList();
        else if (backup) { const n = $q(body, '.words-top .n'); if (n) n.textContent = F.vocab.due().length; }
      };
    });
  }

  /* revisão: 'flip' (cartões) ou 'write' (digitar a palavra a partir da tradução) */
  function review(mode, items, extra){
    if (!items.length) return renderList();
    const queue = items.slice(), seenWrong = new Set(); let done = 0, right = 0, total = items.length;
    const next = () => {
      if (closed) return;
      if (!queue.length) return summary();
      const it = queue[0]; window.scrollTo(0, 0);
      const head = `<button class="read-back" id="wBack">‹ Minhas palavras</button><div class="words-prog"><div class="progress"><i style="width:${Math.round(done / total * 100)}%"></i></div><span class="num">${done}/${total}</span></div>`;
      if (mode === 'flip') {
        body.innerHTML = head + `<div class="card words-card" id="wCard"><div class="front">${esc(it.w)}</div><button class="tool" id="wSay">🔊 Ouvir</button><div class="hint">Lembra o que significa? Pense e depois vire o cartão.</div></div>
          <div id="wAct"><button class="btn btn-primary wide" id="wFlip">Mostrar tradução</button></div>`;
        $q(body, '#wSay').onclick = () => F.say(it.w);
        F.say(it.w);
        $q(body, '#wFlip').onclick = () => {
          $q(body, '#wCard').innerHTML = `<div class="front">${esc(it.w)}</div><div class="back">${esc(it.t || '—')}</div>${it.ctx ? `<div class="ctx">${markWord(it.ctx, it.w)}</div>` : ''}<button class="tool" id="wSay2">🔊 ${it.ctx ? 'Ouvir a frase' : 'Ouvir'}</button>`;
          $q(body, '#wSay2').onclick = () => F.say(it.ctx || it.w);
          $q(body, '#wAct').innerHTML = `<div class="words-gr"><button class="btn words-bad" id="wNo">Errei</button><button class="btn words-ok" id="wYes">Acertei</button></div>`;
          $q(body, '#wNo').onclick = () => grade(it, false); $q(body, '#wYes').onclick = () => grade(it, true);
        };
      } else {
        body.innerHTML = head + `<div class="card words-card" id="wCard"><div class="hint">Como se diz em ${esc(F.tgtName)}?</div><div class="front" style="font-size:28px">${esc(it.t || '—')}</div>${it.ctx ? `<div class="ctx">${markWord(it.ctx, it.w, true)}</div>` : ''}
            <input class="txt" id="wIn" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Digite a palavra" enterkeyhint="done"></div>
          <div id="wAct"><div class="words-gr"><button class="btn btn-ghost" id="wHint">Dica</button><button class="btn btn-primary" id="wCheck">Verificar</button></div></div>`;
        const inp = $q(body, '#wIn'); let hints = 0;
        setTimeout(() => inp.focus(), 50);
        $q(body, '#wHint').onclick = () => { hints = Math.min(it.w.length, hints + 1); inp.value = it.w.slice(0, hints); inp.focus(); };
        const check = () => {
          const v = inp.value.trim(); if (!v) { inp.focus(); return; }
          const exact = v.toLowerCase() === it.w.toLowerCase();
          const ok = exact || norm(v) === norm(it.w) || norm(v).endsWith(' ' + norm(it.w));
          inp.disabled = true;
          const acc = ok && !exact && norm(v) === norm(it.w);
          inp.insertAdjacentHTML('afterend', `<div class="verdict ${ok ? 'ok' : 'bad'}"><div class="vt"><span class="vh">${ok ? (acc ? 'Certo! Atenção aos acentos' : 'Perfeito!') : lev(norm(v), norm(it.w)) <= 2 ? 'Quase! A palavra é:' : 'A palavra é:'}</span><span class="vs"><b>${esc(it.w)}</b>${!ok ? ` · você escreveu “${esc(v)}”` : ''}</span></div></div>`);
          F.say(it.w);
          $q(body, '#wAct').innerHTML = `<button class="btn ${ok ? 'btn-primary' : 'btn-ghost'} wide" id="wNext">Próxima</button>`;
          $q(body, '#wNext').onclick = () => grade(it, ok && hints < it.w.length);
          $q(body, '#wNext').focus();
        };
        $q(body, '#wCheck').onclick = check;
        inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); check(); } };
      }
      $q(body, '#wBack').onclick = renderList;
    };
    const grade = (it, ok) => {
      queue.shift();
      const first = !seenWrong.has(it.w);
      if (ok) { if (first) { right++; F.addPoints(2); } if (!extra) F.vocab.grade(it.w, true); done++; }
      else {
        F.vocab.grade(it.w, false);
        if (first) { seenWrong.add(it.w); queue.push(it); total++; } // volta no fim da sessão uma vez
        done++;
      }
      next();
    };
    const summary = () => {
      F.planDone && F.planDone('words');
      const n = items.length;
      body.innerHTML = `<div class="card read-done"><div class="small muted" style="font-weight:700">Revisão concluída</div><div class="big">${right}/${n} de primeira</div>
        <p class="muted" style="margin:8px 0 0">${right === n ? 'Memória afiada! Essas palavras só voltam daqui a alguns dias.' : 'As que você errou voltam amanhã — repetição espaçada funciona assim.'}</p>
        <div class="read-btns">${arg.fromPlan ? `<button class="btn btn-ghost" id="wDone">Minhas palavras</button><button class="btn btn-primary" id="wPlan">Voltar ao plano</button>` : `<button class="btn btn-ghost" id="wDone">Minhas palavras</button><button class="btn btn-primary" id="wRead">📖 Ler um texto</button>`}</div></div>`;
      $q(body, '#wDone').onclick = renderList;
      const p = $q(body, '#wPlan'); if (p) p.onclick = () => F.open('plan', { fromWords:true });
      const r = $q(body, '#wRead'); if (r) r.onclick = () => F.open('read');
    };
    next();
  }

  if ((arg.review || arg.fromPlan) && F.vocab.due().length) review(arg.mode === 'write' ? 'write' : 'flip', F.shuffle(F.vocab.due().slice()).slice(0, 20), false);
  else renderList();
}

F.register({
  id:'words', title:'Minhas palavras', icon:'🗂️', desc:'Revise as palavras que você salvou', order:60,
  subtitle(){
    try { const d = F.vocab.due().length, n = F.vocab.list().length;
      return d ? `${d} para revisar hoje` : n ? `${n} palavra${n > 1 ? 's' : ''} salva${n > 1 ? 's' : ''} · em dia` : 'Salve palavras tocando nelas'; }
    catch(e){ return 'Salve palavras tocando nelas'; }
  },
  open: openWords,
});
})();
