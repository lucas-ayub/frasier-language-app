/* Frasier — módulo "Frase inteira" (id: sentence).
   O aluno produz a frase inteira: traduz, escreve o que ouviu (ditado) ou fala.
   Correção tolerante no estilo Duolingo: alinhamento palavra a palavra (DP) com acentos, erros de digitação,
   palavras faltando/sobrando/fora de ordem; nas traduções, a IA confere se uma versão diferente também vale.
   O corretor (G) não depende do app: em node, require('./m-sentence.js') devolve o corretor para testes. */
(function(root){
"use strict";

/* =====================================================================
   CORRETOR LOCAL
   ===================================================================== */
const G = (function(){
  const NUMS = {
    es:['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciseis','diecisiete','dieciocho','diecinueve','veinte'],
    pt:['zero','um','dois','tres','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','catorze','quinze','dezesseis','dezessete','dezoito','dezenove','vinte'],
    fr:['zero','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf','vingt'],
    de:['null','eins','zwei','drei','vier','funf','sechs','sieben','acht','neun','zehn','elf','zwolf','dreizehn','vierzehn','funfzehn','sechzehn','siebzehn','achtzehn','neunzehn','zwanzig'],
    it:['zero','uno','due','tre','quattro','cinque','sei','sette','otto','nove','dieci','undici','dodici','tredici','quattordici','quindici','sedici','diciassette','diciotto','diciannove','venti'],
    en:['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'],
  };
  // formas alternativas que também valem para o número (uno/un/una, ein/eine…)
  const NUM_ALT = { es:{ 1:['un','una'] }, fr:{ 1:['une'] }, de:{ 1:['ein','eine','einen','einem','einer'] }, it:{ 1:['un','una'] }, pt:{ 1:['uma'], 2:['duas'] }, en:{ 1:['a','an'] } };
  const EN_CONTR = [
    [/\b(can)['’]t\b/gi, 'can not'], [/\bcannot\b/gi, 'can not'], [/\bwon['’]t\b/gi, 'will not'], [/\bshan['’]t\b/gi, 'shall not'],
    [/\bain['’]t\b/gi, 'is not'], [/n['’]t\b/gi, ' not'], [/\bi['’]m\b/gi, 'i am'], [/['’]re\b/gi, ' are'], [/['’]ve\b/gi, ' have'],
    [/['’]ll\b/gi, ' will'], [/['’]d\b/gi, ' would'],
    [/\b(it|that|what|he|she|there|here|who|where|how|this)['’]s\b/gi, '$1 is'], [/\blet['’]s\b/gi, 'let us'],
  ];
  const lower = (s, lang) => { try { return s.toLocaleLowerCase(lang || undefined); } catch(e) { return s.toLowerCase(); } };
  const fold = s => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/ß/g, 'ss').replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/ı/g, 'i');
  const umlautT = s => s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

  /* texto -> tokens {raw, n (minúsculo), f (sem acento)} */
  function tokenize(text, lang){
    let s = String(text || '').normalize('NFC');
    s = s.replace(/[’‘ʼ`´′‛]/g, "'").replace(/[“”„‟«»‹›"]/g, ' ');
    if (lang === 'en') for (const [re, rep] of EN_CONTR) s = s.replace(re, rep);
    if (lang === 'de') s = s.replace(/(\p{L})'s\b/gu, '$1 es');               // geht's = geht es
    if (lang === 'fr' || lang === 'it') s = s.replace(/(\p{L})'(?=\p{L})/gu, "$1' "); // l'eau = l' eau
    s = s.replace(/(\p{L})[-‐‑–—](?=\p{L})/gu, '$1 ').replace(/\s[-–—]\s/g, ' ');
    const out = [];
    for (const piece of s.split(/\s+/)) {
      const raw = piece.replace(/^[^\p{L}\p{N}]+/u, '').replace(/[^\p{L}\p{N}']+$/u, '').replace(/[^\p{L}\p{N}'.,:]/gu, '');
      if (!/[\p{L}\p{N}]/u.test(raw)) continue;
      let n = lower(raw, lang).replace(/'/g, '');
      if (!/^\d+([.,:]\d+)*$/.test(n)) n = n.replace(/[.,:]/g, '');
      if (!n) continue;
      out.push({ raw: raw.replace(/'$/, "'"), n, f: fold(n) });
    }
    return out;
  }

  /* distância de Damerau-Levenshtein (versão OSA) */
  function dl(a, b){
    const A = a.length, B = b.length; if (!A) return B; if (!B) return A;
    let pp = null, p = Array.from({ length: B + 1 }, (_, j) => j);
    for (let i = 1; i <= A; i++) {
      const c = [i];
      for (let j = 1; j <= B; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + cost);
        if (pp && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, pp[j - 2] + 1);
        c[j] = v;
      }
      pp = p; p = c;
    }
    return p[B];
  }
  const prefix = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
  const isNum = s => /^\d+$/.test(s);
  function numEq(a, b, lang){
    const [d, w] = isNum(a.n) ? [a, b] : isNum(b.n) ? [b, a] : [null, null];
    if (!d || isNum(w.n)) return false;
    const k = +d.n, L = NUMS[lang] || NUMS.en;
    return (L[k] && fold(L[k]) === w.f) || !!(NUM_ALT[lang] && NUM_ALT[lang][k] && NUM_ALT[lang][k].includes(w.f));
  }
  const VOW = 'aeiouy';
  /* troca só no fim da palavra (gênero, número, pessoa): gato/gata, gato/gatos, habla/hablan, schöne/schönen */
  function endingSwap(a, b){
    const p = prefix(a, b); const ra = a.slice(p), rb = b.slice(p);
    if (ra.length > 2 || rb.length > 2) return false;
    if (p < 2) return false;
    // só troca de vogal final (o/a, e/a); acréscimos (plural, pessoa) dependem de a palavra existir (ver classify)
    return ra.length === 1 && rb.length === 1 && VOW.includes(ra) && VOW.includes(rb);
  }
  /* compara uma palavra da resposta com uma da frase certa */
  function classify(a, t, o){
    if (a.n === t.n) return { k:'ok' };
    if (numEq(a, t, o.lang)) return { k:'ok', num:true };
    if (a.f === t.f || (o.lang === 'de' && umlautT(a.n) === umlautT(t.n))) {
      const ss = a.n.replace(/ß/g, 'ss') === t.n.replace(/ß/g, 'ss');
      return { k: o.speech ? 'ok' : 'acc', why: ss ? 'ß/ss' : (o.lang === 'de' && /[äöü]/.test(t.n) && umlautT(a.n) === umlautT(t.n) && a.n !== t.f) ? 'trema' : 'acento' };
    }
    const L = t.f.length, lim = L >= 8 ? 2 : L >= 4 ? 1 : 0;
    const p = prefix(a.f, t.f), minL = Math.min(a.f.length, t.f.length);
    if (lim) {
      const d = dl(a.f, t.f);
      if (d <= lim) {
        const anagram = d === 1 && a.f.length === t.f.length && [...a.f].sort().join('') === [...t.f].sort().join('');
        if (!anagram && endingSwap(a.f, t.f)) return { k:'form' };
        if (!anagram && o.known && a.f.length > 2 && o.known(a.n)) return { k: (p >= 3 && p >= minL - 2) ? 'form' : 'wrong' };
        return { k:'typo', why: o.speech ? 'pronúncia' : 'digitação' };
      }
    }
    if (minL >= 3 && (p >= 4 || (p >= 3 && p >= minL - 2))) return { k:'form' };
    return { k:'wrong' };
  }
  /* inglês sem apóstrofo: "dont" = do not, "its" = it is, "im" = i am */
  const EN_SUF = { is:'s', are:'re', have:'ve', will:'ll', would:'d', am:'m', us:'s' };
  function enContract(a, b){
    if (b === 'not') return a === 'can' ? 'cant' : a === 'will' ? 'wont' : a === 'shall' ? 'shant' : a + 'nt';
    return EN_SUF[b] ? a + EN_SUF[b] : null;
  }
  const COST = { ok:0, acc:0.05, typo:0.25, join:0.15, form:0.7, wrong:1.0 };
  const W = t => t.f.length <= 3 ? 0.5 : 1;
  const CREDIT = { ok:1, acc:0.97, typo:0.9, join:0.95, form:0.5, moved:0.6, wrong:0, miss:0 };

  /* alinha resposta x frase certa (programação dinâmica) e classifica cada palavra */
  function align(A, T, o){
    const n = A.length, m = T.length, INF = 1e9;
    const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(INF));
    const P = Array.from({ length: n + 1 }, () => new Array(m + 1));
    const C = new Map(); const cls = (i, j) => { const k = i * 1000 + j; if (!C.has(k)) C.set(k, classify(A[i], T[j], o)); return C.get(k); };
    D[0][0] = 0;
    const INS = 0.99, DEL = 0.99;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
      const d = D[i][j]; if (d >= INF) continue;
      const relax = (ii, jj, cost, op) => { if (d + cost < D[ii][jj] - 1e-9) { D[ii][jj] = d + cost; P[ii][jj] = op; } };
      if (i < n && j < m) { const c = cls(i, j); relax(i + 1, j + 1, COST[c.k], { t:'sub', i, j, c }); }
      if (i < n) relax(i + 1, j, INS, { t:'ins', i, j });
      if (j < m) relax(i, j + 1, DEL, { t:'del', i, j });
      // palavra separada ou junta: "hausaufgabe" x "haus aufgabe", "jai" x "j' ai"
      if (i + 1 < n && j < m && A[i].f + A[i + 1].f === T[j].f) relax(i + 2, j + 1, COST.join, { t:'split', i, j });
      if (i < n && j + 1 < m) {
        const cat = T[j].f + T[j + 1].f, en = o.lang === 'en' ? enContract(T[j].f, T[j + 1].f) : null;
        if (A[i].f === cat || (en && A[i].f === en)) relax(i + 1, j + 2, COST.join, { t:'merge', i, j });
        else if (en && en.length >= 4 && A[i].f.length >= en.length && dl(A[i].f, en) === 1) relax(i + 1, j + 2, COST.typo, { t:'merge', i, j, typo:true });
      }
    }
    const ops = []; let i = n, j = m;
    while (i > 0 || j > 0) {
      const op = P[i][j]; if (!op) break;
      if (op.t === 'sub') ops.push({ k:op.c.k, why:op.c.why, a:A[op.i], tg:T[op.j], ti:op.j, ai:op.i });
      else if (op.t === 'ins') ops.push({ k:'extra', a:A[op.i], ai:op.i });
      else if (op.t === 'del') ops.push({ k:'miss', tg:T[op.j], ti:op.j });
      else if (op.t === 'split') ops.push({ k:'join', why:'espaço', a:{ raw:A[op.i].raw + ' ' + A[op.i + 1].raw }, tg:T[op.j], ti:op.j, ai:op.i });
      else ops.push({ k: op.typo ? 'typo' : 'join', why: op.typo ? 'digitação' : (T[op.j].raw.endsWith("'") || o.lang === 'en') ? 'apóstrofo' : 'espaço', a:A[op.i], tg:{ raw:T[op.j].raw + (T[op.j].raw.endsWith("'") ? '' : ' ') + T[op.j + 1].raw, f:T[op.j].f + T[op.j + 1].f, n:T[op.j].n + T[op.j + 1].n }, ti:op.j, ai:op.i, tw:W(T[op.j]) + W(T[op.j + 1]) });
      i = op.t === 'del' ? i : op.t === 'split' ? i - 2 : i - 1;
      j = op.t === 'ins' ? j : op.t === 'merge' ? j - 2 : j - 1;
    }
    ops.reverse();
    // palavra certa no lugar errado: sobra + falta da mesma palavra
    for (const ex of ops) {
      if (ex.k !== 'extra') continue;
      const mi = ops.find(x => x.k === 'miss' && !x.paired && ['ok', 'acc', 'typo'].includes(classify(ex.a, x.tg, o).k));
      if (mi) { mi.paired = true; ex.k = 'moved'; ex.tg = mi.tg; ex.ti = mi.ti; mi.k = 'movedFrom'; }
    }
    // alemão: substantivo com minúscula
    if (o.lang === 'de' && !o.speech) for (const x of ops) {
      if (['ok', 'acc', 'typo'].includes(x.k) && x.ti > 0 && /^\p{Lu}/u.test(x.tg.raw) && /^\p{Ll}/u.test(x.a.raw)) x.caseFix = true;
    }
    return ops;
  }

  /* nota e veredito: perfect | correct | almost | wrong */
  function grade(attempt, target, opts = {}){
    const o = { lang: opts.lang || 'es', speech: !!opts.speech, known: opts.known || null };
    const A = tokenize(attempt, o.lang), T = tokenize(target, o.lang);
    if (!A.length) return { verdict:'wrong', score:0, ops: T.map((t, ti) => ({ k:'miss', tg:t, ti })), notes:[], errors:T.length, empty:true };
    const ops = align(A, T, o);
    let got = 0, tot = 0;
    for (const x of ops) {
      if (x.k === 'extra') { tot += W(x.a); continue; }
      if (x.k === 'movedFrom') continue;
      const w = x.tw || W(x.tg); tot += w; got += w * (CREDIT[x.k] ?? 0);
    }
    const score = tot ? Math.round(100 * got / tot) : 0;
    const errs = ops.filter(x => ['wrong', 'form', 'miss', 'extra', 'moved'].includes(x.k));
    const notes = ops.filter(x => ['acc', 'typo', 'join'].includes(x.k) || x.caseFix);
    // espanhol: ¿ e ¡ de abertura
    let punct = null;
    if (o.lang === 'es' && !o.speech) {
      const at = String(attempt);
      if (/¿/.test(target) && !/¿/.test(at)) punct = '¿';
      else if (/¡/.test(target) && !/¡/.test(at)) punct = '¡';
    }
    let verdict;
    if (!errs.length) verdict = (notes.length || punct) ? 'correct' : 'perfect';
    else {
      const e = errs[0], short = (e.tg || e.a).f.length <= 4;
      verdict = errs.length === 1 && score >= 75 && (short || e.k === 'form' || e.k === 'moved' || score >= 85) ? 'almost' : 'wrong';
    }
    return { verdict, score, ops, notes, punct, errors: errs.length, attempt, target };
  }
  return { tokenize, dl, classify, align, grade, fold };
})();
if (typeof module === 'object' && module.exports) module.exports = G;
const F = root && root.F;
if (!F || !root.document) return;
root.FrasierSentenceGrader = G;

/* =====================================================================
   INTERFACE
   ===================================================================== */
const ID = 'sentence', N = 8;
const PTS = { perfect:12, correct:10, alt:10, almost:4, wrong:0 };
const VERD = {
  perfect:{ t:'Perfeito!', cls:'ok' }, correct:{ t:'Correto', cls:'ok' }, alt:{ t:'Também está certo!', cls:'ok' },
  almost:{ t:'Quase', cls:'mid' }, wrong:{ t:'Errado', cls:'bad' }, skip:{ t:'Pulou', cls:'bad' },
};
const MODES = [
  { id:'tr', name:'Traduzir', ic:'✍️' }, { id:'dict', name:'Ditado', ic:'🎧' }, { id:'speak', name:'Falar', ic:'🎤' },
];
const MAXW = { A1:6, A2:9, B1:13 };
const ICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>';
const IX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const IMID = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 12h12"/></svg>';
const ISPK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';
const ISTAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6L2.5 9.3l6.6-.8z"/></svg>';

function css(){
  if (document.getElementById('sentence-css')) return;
  const st = document.createElement('style'); st.id = 'sentence-css';
  st.textContent = `
.sentence-seg button{min-height:58px;font-size:14px}
.sentence-seg .ic{font-size:20px;line-height:1}
.sentence-top{display:flex;align-items:center;gap:10px}
.sentence-top .progress{height:14px}
.sentence-top .pts{height:38px;min-width:58px;font-size:15px}
.sentence-card{padding:16px 16px 18px;transition:border-color .2s,box-shadow .2s}
.sentence-card.v-ok{border-color:var(--ok);box-shadow:0 4px 0 var(--ok-deep)}
.sentence-card.v-bad{border-color:var(--bad);box-shadow:0 4px 0 var(--bad-deep)}
.sentence-kick{font-size:13px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin:12px 0 6px}
.sentence-src{font-family:var(--ft);font-weight:500;font-size:23px;line-height:1.4;word-wrap:break-word}
.sentence-src.dim{font-size:17px;color:var(--muted);margin-top:8px}
.sentence-listen{display:flex;gap:10px;margin-top:4px}
.sentence-listen .tool{min-height:56px;font-size:16px;flex:1;justify-content:center}
.sentence-listen .tool.slow{flex:0 0 auto}
.sentence-ta{width:100%;font-family:var(--ft);font-size:19px;line-height:1.45;border:2px solid var(--line);border-radius:var(--r-m);background:var(--slot);color:var(--ink);
  padding:12px 14px;min-height:96px;resize:none;outline:none;box-shadow:inset 0 3px 0 rgba(23,18,58,.08);display:block}
.sentence-ta:focus{border-color:var(--brand)}
.sentence-ta:disabled{opacity:.75}
.sentence-acc{margin-top:10px}
.sentence-acc button{height:42px;font-size:19px}
.sentence-actions{display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-top:12px}
.sentence-hint{font-size:13px;color:var(--muted);text-align:center;margin-top:2px}
.sentence-heard{font-family:var(--ft);font-size:19px;min-height:1.5em;margin-top:10px;text-align:center;color:var(--ink)}
.sentence-heard:empty::before{content:attr(data-empty);color:var(--muted);font-size:15px}
.sentence-verdict.mid{background:color-mix(in srgb,var(--sun) 26%,var(--surface));color:var(--ink)}
.sentence-verdict.mid .vi{background:var(--sun);color:var(--on-sun);box-shadow:0 3px 0 var(--sun-deep)}
.sentence-verdict.wait{background:var(--surface-2);color:var(--ink)}
.sentence-verdict .vs{font-size:15px}
.sentence-verdict{margin-bottom:12px}
.sentence-res{padding:14px 16px 16px}
.sentence-res h4{margin:0 0 8px;font-size:12.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.sentence-res h4+*{margin-top:0}
.sentence-res .blk+.blk{margin-top:14px;padding-top:12px;border-top:2px dashed var(--line)}
.sentence-diff{font-family:var(--ft);font-size:20px;line-height:2.05;word-wrap:break-word}
.sentence-diff .w{cursor:default}
.sentence-diff span.d{display:inline-block;line-height:1.35;padding:0 .18em;border-radius:6px;margin:0 .04em;vertical-align:baseline}
.sentence-diff .ok{color:var(--ok-ink);font-weight:700}
.sentence-diff .fix{color:var(--ok-ink);font-weight:700;text-decoration:underline dotted;text-decoration-thickness:2px;text-underline-offset:4px;position:relative}
.sentence-diff .fix sup{font-family:var(--ft);font-size:10.5px;font-weight:800;letter-spacing:.02em;color:var(--ink);background:var(--sun);border-radius:5px;padding:0 4px;margin-left:3px;vertical-align:.7em;line-height:1.4;text-decoration:none;display:inline-block}
.sentence-diff .bad{color:var(--bad-ink);background:var(--bad-bg);text-decoration:line-through;text-decoration-thickness:2px;text-decoration-color:var(--bad)}
.sentence-diff .cor{color:var(--ok-ink);font-weight:700;background:var(--ok-bg)}
.sentence-diff .miss{border:2px dashed var(--ok);color:var(--ok-ink);font-weight:700;padding:0 .3em}
.sentence-diff .moved{color:var(--bad-ink);background:var(--bad-bg);font-weight:700}
.sentence-diff .moved::before{content:"↔ ";font-size:.8em}
.sentence-legend{font-size:13px;color:var(--muted);margin-top:4px;display:flex;flex-wrap:wrap;gap:4px 12px}
.sentence-legend i{font-style:normal;font-weight:700}
.sentence-right{display:flex;gap:10px;align-items:flex-start}
.sentence-right .tool{width:44px;padding:0;justify-content:center;flex:none;background:var(--sky-soft);border-color:transparent;box-shadow:none}
.sentence-right .txt2{font-family:var(--ft);font-size:21px;font-weight:700;line-height:1.4;flex:1;min-width:0;word-wrap:break-word;padding-top:4px}
.sentence-right .txt2.alt{font-weight:500;font-size:19px}
.sentence-tr{color:var(--muted);font-size:16px;margin-top:8px}
.sentence-fixes{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;font-size:15px}
.sentence-fixes li{line-height:1.4}
.sentence-fixes s{color:var(--bad-ink);text-decoration-thickness:2px}
.sentence-fixes b{color:var(--ok-ink)}
.sentence-fixes .why{display:inline-block;font-size:11.5px;font-weight:800;background:var(--surface-2);color:var(--muted);border-radius:6px;padding:0 6px;margin-left:4px;vertical-align:1px}
.sentence-ai{background:var(--brand-soft);border-radius:var(--r-m);padding:12px 14px;font-size:15px}
.sentence-ai .ttl{font-weight:800;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--brand);margin-bottom:6px;display:flex;gap:6px;align-items:center}
@media (prefers-color-scheme: dark){ .sentence-ai .ttl{color:#B6A6FF} }
.sentence-ai ul{margin:0;padding-left:18px}
.sentence-ai li+li{margin-top:6px}
.sentence-ai .corr{margin-top:8px}
.sentence-next{position:sticky;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2;box-shadow:0 5px 0 var(--e),0 0 0 6px var(--bg)}
.sentence-sum .big{font-size:64px}
.sentence-sumlist{padding:2px 0}
.sentence-sumlist .it{display:flex;gap:10px;padding:12px 14px;align-items:flex-start;font-size:16px;line-height:1.4}
.sentence-sumlist .it+.it{border-top:2px solid var(--line)}
.sentence-sumlist .tg{flex:none;font-size:12px;font-weight:800;border-radius:7px;padding:2px 7px;margin-top:1px;white-space:nowrap}
.sentence-sumlist .tg.ok{background:var(--ok-bg);color:var(--ok-ink)}
.sentence-sumlist .tg.mid{background:color-mix(in srgb,var(--sun) 30%,transparent);color:var(--ink)}
.sentence-sumlist .tg.bad{background:var(--bad-bg);color:var(--bad-ink)}
.sentence-sumlist .tr{color:var(--muted);font-size:14px}
.sentence-sumbtns{display:grid;grid-template-columns:1fr 1.4fr;gap:10px}
.sentence-mic{margin-top:4px}
`;
  document.head.appendChild(st);
}

/* ---------- escolha das frases ---------- */
const wc = s => G.tokenize(s, F.tgt).length;
function maxWords(){ return MAXW[F.level()] || 99; }
async function pickSentences(store){
  const S = F.S, prog = S.prog || {}, hid = (typeof HIDDEN !== 'undefined' && HIDDEN) || new Set();
  const recent = new Set(store.recent || []), mw = maxWords();
  const fits = idx => { try { const r = sent(idx); if (!r || !r[0] || !r[1]) return false; const n = wc(r[0]); return n >= 3 && n <= mw; } catch(e) { return false; } };
  const fitsLoose = idx => { try { const r = sent(idx); if (!r || !r[0] || !r[1]) return false; const n = wc(r[0]); return n >= 2 && n <= mw + 2; } catch(e) { return false; } };
  const out = [];
  const seen = Object.entries(prog).filter(([k, v]) => v && v[0] >= 0 && !hid.has(+k) && +k < IDX.total).map(([k, v]) => ({ idx:+k, lv:v[0], due:v[1] }));
  const tiers = [
    F.shuffle(seen.filter(x => x.lv >= 1 && !recent.has(x.idx))),
    F.shuffle(seen.filter(x => x.lv < 1 && !recent.has(x.idx))),
  ];
  for (const tier of tiers) {
    for (let k = 0; k < tier.length && out.length < N; k += 40) {
      const batch = tier.slice(k, k + 40).map(x => x.idx);
      await ensureChunks(batch);
      for (const idx of batch) { if (out.length >= N) break; if (fits(idx)) out.push({ idx, seen:true }); }
      if (k >= 160) break;
    }
  }
  // frases novas do começo da coleção atual
  if (out.length < N) {
    const lvl = (S.settings && S.settings.level) || 0;
    const L = IDX.levels[lvl] || IDX.levels[0];
    let p = L.start;
    const chosen = new Set(out.map(x => x.idx));
    for (let pass = 0; pass < 2 && out.length < N; pass++) {
      const test = pass ? fitsLoose : fits;
      for (p = L.start; p < L.end && out.length < N && p < L.start + 4 * IDX.chunk; p++) {
        if (p in prog || hid.has(p) || recent.has(p) || chosen.has(p)) continue;
        await ensureChunks([p]);
        if (test(p)) { out.push({ idx:p, seen:false }); chosen.add(p); }
      }
    }
  }
  // se ainda faltar (tudo recente), aceita repetir
  if (out.length < N && recent.size) {
    const pool = F.shuffle([...recent].filter(i => !out.some(x => x.idx === i)));
    await ensureChunks(pool.slice(0, 30));
    for (const idx of pool.slice(0, 30)) { if (out.length >= N) break; if (fitsLoose(idx)) out.push({ idx, seen: idx in prog }); }
  }
  return F.shuffle(out);
}

/* ---------- SRS: acertar a frase inteira empurra a revisão como no jogo principal ---------- */
function nudge(idx){
  const S = F.S; const v = S.prog && S.prog[idx]; if (!v || v[0] < 0) return;
  const t = F.today(); if (v[1] > t + 1) return;
  const IV = (typeof INTERVALS !== 'undefined' && INTERVALS) || [0, 1, 10, 30, 180];
  const lv = Math.min(4, v[0] + 1);
  S.prog[idx] = [lv, t + IV[lv], F.nowS()];
  try { if (typeof markDirty === 'function') markDirty(idx); } catch(e){}
  F.save();
}

/* =====================================================================
   ATIVIDADE
   ===================================================================== */
function open(body, ctx){
  css();
  const store = F.store(ID);
  const arg = ctx.arg || {};
  let mode = MODES.some(m => m.id === arg.mode) ? arg.mode : MODES.some(m => m.id === store.mode) ? store.mode : 'tr';
  let R = null, Q = null, phase = 'idle', token = 0;
  const known = (() => { let set = null; return w => { if (!set) set = new Set((typeof WORDS !== 'undefined' && WORDS) || []); return set.has(w); }; })();
  const lang = F.tgt;

  const onKey = e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    if (phase === 'answered') { const b = body.querySelector('#sentence-next'); if (b) { e.preventDefault(); b.click(); } }
  };
  document.addEventListener('keydown', onKey);
  ctx.onClose(() => { document.removeEventListener('keydown', onKey); token++; F.stopSpeech(); F.stopListen(); });

  async function start(){
    phase = 'loading';
    body.innerHTML = F.loading('Separando frases…');
    let items;
    try { items = await pickSentences(store); }
    catch(e) { console.error(e); body.innerHTML = F.errorBox(e, 'sentence-retry'); body.querySelector('#sentence-retry').onclick = start; return; }
    if (!items.length) { body.innerHTML = `<div class="card sentence-card">Não encontrei frases para treinar agora. Jogue algumas rodadas no jogo principal e volte aqui.</div>`; return; }
    R = { queue: items.map(x => ({ ...x, retry:false })), i:0, pts:0, results:[] };
    render();
  }

  function shell(){
    const done = R.i, total = R.queue.length;
    return `<div class="seg sentence-seg" role="tablist" aria-label="Exercício">${MODES.map(m => `<button data-mode="${m.id}" class="${m.id === mode ? 'on' : ''}" role="tab" aria-selected="${m.id === mode}"><span class="ic" aria-hidden="true">${m.ic}</span>${m.name}</button>`).join('')}</div>
      <div class="sentence-top"><div class="progress" aria-label="Progresso da rodada"><i style="width:${Math.max(4, done / total * 100)}%"></i></div><div class="pts" id="sentence-pts">${ISTAR}<span>${R.pts}</span></div></div>`;
  }

  function render(){
    if (!R) return;
    if (R.i >= R.queue.length) return summary();
    token++;
    F.stopSpeech(); F.stopListen();
    const it = R.queue[R.i]; const row = sent(it.idx);
    Q = { it, tgt: row[0], src: row[1], id: row[4], idx: it.idx, mode };
    phase = 'asking';
    const tag = it.retry ? '<span class="tag retry">De novo</span>' : it.seen ? '<span class="tag">Revisão</span>' : '<span class="tag new">Nova</span>';
    const first = R.queue.filter(x => !x.retry).length;
    const count = `<span class="small muted">${it.retry ? 'segunda chance' : `${Math.min(R.i + 1, first)} de ${first}`}</span>`;
    let prompt;
    if (mode === 'dict') prompt = `<div class="sentence-kick">Escreva o que você ouvir</div>
      <div class="sentence-listen"><button class="tool primary" id="sentence-play">${ISPK}Ouvir</button><button class="tool slow" id="sentence-slow" aria-label="Ouvir devagar">🐢 Devagar</button></div>
      <button class="linkbtn" id="sentence-showtr">ver tradução</button><div class="sentence-src dim hidden" id="sentence-trbox">${F.esc(Q.src)}</div>`;
    else prompt = `<div class="sentence-kick">${mode === 'speak' ? 'Diga' : 'Escreva'} em ${F.esc(F.tgtName)}</div><div class="sentence-src" lang="${F.esc(F.src)}">${F.esc(Q.src)}</div>`;
    body.innerHTML = `${shell()}
      <div class="card sentence-card" id="sentence-card"><div class="row">${tag}<div class="spacer"></div>${count}</div>${prompt}</div>
      <div id="sentence-ans"></div><div id="sentence-after"></div>`;
    body.querySelectorAll('.sentence-seg button').forEach(b => b.onclick = () => {
      if (b.dataset.mode === mode) return;
      mode = b.dataset.mode; store.mode = mode; store._ts = F.nowS(); F.save();
      if (phase === 'answered') { body.querySelectorAll('.sentence-seg button').forEach(x => { x.classList.toggle('on', x.dataset.mode === mode); x.setAttribute('aria-selected', x.dataset.mode === mode); }); return; }
      render();
    });
    if (mode === 'dict') {
      const play = async (rate, btn) => { btn.disabled = true; try { await F.say(Q.tgt, { rate }); } finally { btn.disabled = false; } };
      body.querySelector('#sentence-play').onclick = e => play(1, e.currentTarget);
      body.querySelector('#sentence-slow').onclick = e => play(0.7, e.currentTarget);
      body.querySelector('#sentence-showtr').onclick = e => { const b = body.querySelector('#sentence-trbox'); b.classList.toggle('hidden'); e.currentTarget.textContent = b.classList.contains('hidden') ? 'ver tradução' : 'esconder tradução'; };
      setTimeout(() => { if (phase === 'asking' && Q && Q.mode === 'dict') F.say(Q.tgt); }, 250);
    }
    if (mode === 'speak' && F.canListen() && !store.noMic) renderMic(); else renderTyping();
  }

  function renderTyping(){
    const box = body.querySelector('#sentence-ans');
    const letters = (F.course && F.course.letters) || [];
    const ph = mode === 'dict' ? 'Escreva a frase que você ouviu…' : mode === 'speak' ? 'Digite (ou use o 🎤 do teclado)…' : `Escreva em ${F.tgtName}…`;
    box.innerHTML = `${mode === 'speak' ? `<div class="small muted" style="margin-bottom:8px">${F.canListen() ? '' : 'Seu navegador não reconhece voz aqui. '}Digite a frase ou use o ditado (🎤) do teclado.${F.canListen() ? ' <button class="linkbtn" id="sentence-tomic" style="min-height:0;padding:0">Usar o microfone</button>' : ''}</div>` : ''}
      <textarea class="sentence-ta" id="sentence-ta" rows="3" lang="${F.esc(lang)}" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" enterkeyhint="done" placeholder="${F.esc(ph)}" aria-label="Sua resposta"></textarea>
      ${letters.length ? `<div class="accents sentence-acc">${letters.map(a => `<button type="button" data-a="${F.esc(a)}">${F.esc(a)}</button>`).join('')}</div>` : ''}
      <div class="sentence-actions"><button class="btn btn-ghost" id="sentence-skip">Não sei</button><button class="btn btn-primary" id="sentence-check">Verificar</button></div>
      <div class="sentence-hint">Enter verifica · Shift+Enter quebra linha</div>`;
    const ta = box.querySelector('#sentence-ta');
    try { if (mode !== 'dict' || !matchMedia('(hover:none)').matches) ta.focus({ preventScroll:true }); } catch(e){}
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); e.stopPropagation(); check(ta.value); }
    });
    box.querySelector('#sentence-check').onclick = () => check(ta.value);
    box.querySelector('#sentence-skip').onclick = () => finish(null);
    const tm = box.querySelector('#sentence-tomic'); if (tm) tm.onclick = () => { store.noMic = false; renderMic(); };
    box.querySelectorAll('.sentence-acc button').forEach(b => b.onmousedown = b.ontouchstart = e => {
      e.preventDefault(); const a = b.dataset.a; const s = ta.selectionStart ?? ta.value.length, en = ta.selectionEnd ?? s;
      ta.value = ta.value.slice(0, s) + a + ta.value.slice(en); ta.setSelectionRange(s + a.length, s + a.length); ta.focus();
    });
  }

  function renderMic(){
    const box = body.querySelector('#sentence-ans');
    box.innerHTML = `<button class="mic sentence-mic" id="sentence-mic"><span class="ring">${F.micSVG}</span><span id="sentence-miclbl">Toque e diga a frase inteira</span></button>
      <div class="sentence-heard" id="sentence-heard" data-empty="O que você disser aparece aqui"></div>
      <div class="row" style="justify-content:space-between"><button class="linkbtn" id="sentence-totype">Prefiro digitar</button><button class="linkbtn" id="sentence-skip">Não sei</button></div>`;
    const btn = box.querySelector('#sentence-mic'), lbl = box.querySelector('#sentence-miclbl'), heard = box.querySelector('#sentence-heard');
    box.querySelector('#sentence-totype').onclick = () => { F.stopListen(); renderTyping(); };
    box.querySelector('#sentence-skip').onclick = () => { F.stopListen(); finish(null); };
    let listening = false;
    btn.onclick = async () => {
      if (listening) { F.stopListen(); return; }
      const my = token; listening = true; btn.classList.add('listening'); lbl.textContent = 'Ouvindo… toque para parar'; heard.textContent = '';
      let text = '';
      try { text = await F.listen({ onInterim: t => { if (my === token) heard.textContent = t; } }); }
      catch(e) {
        if (my !== token) return;
        listening = false; btn.classList.remove('listening');
        F.toast('O microfone não está disponível aqui. Digite a frase.'); store.noMic = true; renderTyping(); return;
      }
      if (my !== token) return;
      listening = false; btn.classList.remove('listening');
      if (!text) { lbl.textContent = 'Não ouvi nada. Toque e tente de novo'; return; }
      heard.textContent = text;
      check(text, true);
    };
  }

  /* ---------- correção ---------- */
  function check(val, spoken){
    if (phase !== 'asking') return;
    val = String(val || '').trim();
    if (!val) { const ta = body.querySelector('#sentence-ta'); if (ta) ta.focus(); return; }
    finish(val, spoken);
  }

  async function finish(val, spoken){
    if (phase !== 'asking') return;
    phase = 'checking';
    const my = ++token;
    const q = Q; q.attempt = val; q.spoken = !!spoken;
    F.stopSpeech(); F.stopListen();
    const ta = body.querySelector('#sentence-ta'); if (ta) ta.disabled = true;
    const box = body.querySelector('#sentence-ans');
    if (box) { box.querySelectorAll('button').forEach(b => b.disabled = true); box.classList.add('hidden'); }
    const g = val == null ? { verdict:'skip', score:0, ops: G.tokenize(q.tgt, lang).map((t, ti) => ({ k:'miss', tg:t, ti })), notes:[], errors:1 }
      : G.grade(val, q.tgt, { lang, speech: !!spoken, known });
    q.g = g; q.verdict = g.verdict; q.ai = null; q.aiFail = null;
    const wantAI = val != null && (q.mode === 'tr' || q.mode === 'speak') && (g.verdict === 'almost' || g.verdict === 'wrong') && F.aiAvailable();
    if (wantAI) {
      phase = 'answered';
      showAfter(q, true);
      try {
        const r = await askAI(q);
        if (my !== token) return;
        if (r && typeof r === 'object') {
          q.ai = r;
          if (r.aceitavel === true) q.verdict = 'alt';
        }
      } catch(e) { if (my !== token) return; q.aiFail = e.friendly || 'A IA não respondeu agora.'; /* fica o veredito local, com aviso e opção de perguntar de novo */ }
    }
    if (my !== token) return;
    record(q);
    phase = 'answered';
    showAfter(q, false);
  }

  async function askAI(q){
    const sys = `Você é um professor de ${F.tgtName} corrigindo um exercício de tradução de um aluno (nível ${F.level()}). Seja justo como um bom professor: aceite qualquer tradução correta e natural com o mesmo sentido, mesmo que diferente da referência (sinônimos, outra ordem, pronome sujeito explícito ou omitido, outro tempo verbal equivalente). Ignore maiúsculas e pontuação${q.spoken ? ' e acentos (a resposta veio do reconhecimento de voz)' : ''}. Pequenos erros de digitação não tornam a resposta inaceitável; erros de gramática, de concordância ou de sentido, sim. Explicações curtas, encorajadoras, em ${F.explainLang}. Responda só em JSON.`;
    const prompt = `Frase original (${F.srcName}): "${q.src}"
Tradução de referência (${F.tgtName}): "${q.tgt}"
Resposta do aluno: "${q.attempt}"

A resposta do aluno é uma tradução aceitável da frase original em ${F.tgtName} correto?
JSON exatamente assim: {"aceitavel": true/false, "nota": 0-100, "erros": [{"trecho": "parte da resposta do aluno", "correcao": "como deveria ser", "explicacao": "curta em ${F.explainLang}"}], "versao_corrigida": "a resposta do aluno corrigida com o mínimo de mudanças"}
Se for aceitável, "erros" traz só detalhes menores (ou []).`;
    const r = await F.ai(prompt, { system: sys, json:true, temperature:0.2, maxTokens:700, timeout:20000, thinking:'low' });
    if (!r || typeof r.aceitavel !== 'boolean') throw new Error('resposta inesperada');
    r.erros = Array.isArray(r.erros) ? r.erros.filter(e => e && (e.trecho || e.correcao || e.explicacao)).slice(0, 5) : [];
    return r;
  }

  function record(q){
    const v = q.verdict, okv = v === 'perfect' || v === 'correct' || v === 'alt';
    const pts = PTS[v] || 0;
    if (pts) { F.addPoints(pts); R.pts += pts; }
    q.pts = pts;
    if (!q.it.retry) {
      R.results.push(q);
      if (!okv) R.queue.push({ ...q.it, retry:true });
      if (okv && q.it.idx in (F.S.prog || {})) nudge(q.idx);
    } else {
      const first = R.results.find(x => x.idx === q.idx); if (first) first.retryVerdict = v;
    }
    store.recent = [...(store.recent || []).filter(i => i !== q.idx), q.idx].slice(-60);
    store._ts = F.nowS(); F.save();
  }

  /* ---------- tela depois de responder ---------- */
  function diffHTML(g){
    const parts = [];
    for (const x of g.ops) {
      if (x.k === 'movedFrom') continue;
      if (x.k === 'ok') parts.push(`<span class="d ok">${F.esc(x.a.raw)}</span>`);
      else if (x.k === 'acc' || x.k === 'typo' || x.k === 'join') parts.push(`<span class="d fix" title="você escreveu: ${F.esc(x.a.raw)}">${F.esc(x.tg.raw)}<sup>${x.k === 'acc' ? F.esc(x.why || 'acento') : x.k === 'typo' ? (x.why === 'pronúncia' ? 'quase' : 'digitação') : F.esc(x.why || 'espaço')}</sup></span>`);
      else if (x.k === 'wrong' || x.k === 'form') parts.push(`<span class="d bad">${F.esc(x.a.raw)}</span> <span class="d cor">${F.esc(x.tg.raw)}</span>`);
      else if (x.k === 'extra') parts.push(`<span class="d bad">${F.esc(x.a.raw)}</span>`);
      else if (x.k === 'miss') parts.push(`<span class="d miss">${F.esc(x.tg.raw)}</span>`);
      else if (x.k === 'moved') parts.push(`<span class="d moved" title="lugar errado">${F.esc(x.a.raw)}</span>`);
      if (x.caseFix && parts.length) parts[parts.length - 1] = parts[parts.length - 1].replace(/<\/span>$/, '<sup>maiúscula</sup></span>').replace('class="d ok"', 'class="d fix"');
    }
    return parts.join(' ');
  }
  function fixesHTML(g){
    const li = [];
    for (const x of g.ops) {
      if (x.k === 'acc') li.push(`<li><s>${F.esc(x.a.raw)}</s> → <b>${F.esc(x.tg.raw)}</b><span class="why">${F.esc(x.why || 'acento')}</span></li>`);
      else if (x.k === 'typo') li.push(`<li><s>${F.esc(x.a.raw)}</s> → <b>${F.esc(x.tg.raw)}</b><span class="why">${x.why === 'pronúncia' ? 'entendi assim' : 'digitação'}</span></li>`);
      else if (x.k === 'join') li.push(`<li><s>${F.esc(x.a.raw)}</s> → <b>${F.esc(x.tg.raw)}</b><span class="why">${F.esc(x.why)}</span></li>`);
      if (x.caseFix) li.push(`<li><s>${F.esc(x.a.raw)}</s> → <b>${F.esc(x.tg.raw)}</b><span class="why">substantivo com maiúscula</span></li>`);
    }
    if (g.punct) li.push(`<li>Em espanhol, ${g.punct === '¿' ? 'perguntas começam com <b>¿</b>' : 'exclamações começam com <b>¡</b>'}<span class="why">pontuação</span></li>`);
    return li.join('');
  }
  function errorsSummary(g){
    const wr = g.ops.filter(x => x.k === 'wrong' || x.k === 'form'), mi = g.ops.filter(x => x.k === 'miss'), ex = g.ops.filter(x => x.k === 'extra'), mv = g.ops.filter(x => x.k === 'moved');
    const s = [];
    if (wr.length) s.push(wr.length === 1 ? (wr[0].k === 'form' ? `<b>${F.esc(wr[0].tg.raw)}</b>, não ${F.esc(wr[0].a.raw)}` : `uma palavra trocada: <b>${F.esc(wr[0].tg.raw)}</b>`) : `${wr.length} palavras trocadas`);
    if (mi.length) s.push(mi.length === 1 ? `faltou <b>${F.esc(mi[0].tg.raw)}</b>` : `faltaram ${mi.length} palavras`);
    if (ex.length) s.push(ex.length === 1 ? `sobrou <b>${F.esc(ex[0].a.raw)}</b>` : `sobraram ${ex.length} palavras`);
    if (mv.length) s.push(mv.length === 1 ? `<b>${F.esc(mv[0].a.raw)}</b> fora do lugar` : `${mv.length} palavras fora do lugar`);
    return s.join(' · ');
  }

  function showAfter(q, waiting){
    const after = body.querySelector('#sentence-after'); if (!after) return;
    const g = q.g, v = waiting ? 'wait' : q.verdict, V = VERD[v] || { t:'Conferindo…', cls:'wait' };
    let sub = '';
    if (waiting) sub = 'Sua frase é diferente da referência. Vendo se também vale…';
    else if (v === 'perfect') sub = q.it.retry ? 'Agora foi. Frase fixada.' : 'Frase exata, sem nenhum erro.';
    else if (v === 'correct') sub = 'Só detalhes para ajustar.';
    else if (v === 'alt') sub = 'Sua tradução tem o mesmo sentido.';
    else if (v === 'almost') sub = errorsSummary(g) || 'Faltou pouco.';
    else if (v === 'skip') sub = 'Tudo bem. Veja a frase e repita em voz alta.';
    else sub = (g.empty ? 'Nada foi escrito.' : errorsSummary(g)) + (q.it.retry ? '' : ' · ela volta no fim da rodada');
    const icon = waiting ? '<span class="tiles" aria-hidden="true" style="display:inline-flex;gap:3px;margin:0"><i style="width:7px;height:9px"></i><i style="width:7px;height:9px"></i><i style="width:7px;height:9px"></i></span>' : V.cls === 'ok' ? ICK : V.cls === 'mid' ? IMID : IX;
    const verdict = `<div class="verdict sentence-verdict ${waiting ? 'wait' : V.cls}" role="status" id="sentence-verdict"><span class="vi">${icon}</span><span class="vt"><b class="vh">${waiting ? 'Conferindo…' : V.t}</b><span class="vs">${sub}</span></span>${!waiting && q.pts ? `<span class="vp">+${q.pts}</span>` : ''}</div>`;
    const blocks = [];
    if (!waiting) {
      if (v === 'alt') {
        blocks.push(`<div class="blk"><h4>Sua resposta</h4><div class="sentence-diff"><span class="d ok">${F.esc(q.attempt)}</span></div></div>`);
      } else if (v !== 'skip' && v !== 'perfect') {
        const leg = [];
        if (g.ops.some(x => x.k === 'wrong' || x.k === 'form' || x.k === 'extra')) leg.push('<span><i style="color:var(--bad-ink)">riscado</i> = errado</span>');
        if (g.ops.some(x => x.k === 'miss')) leg.push('<span><i style="color:var(--ok-ink)">tracejado</i> = faltou</span>');
        if (g.ops.some(x => x.k === 'moved')) leg.push('<span><i style="color:var(--bad-ink)">↔</i> = lugar errado</span>');
        blocks.push(`<div class="blk"><h4>${q.spoken ? 'O que entendi' : 'Sua resposta'}</h4><div class="sentence-diff" lang="${F.esc(lang)}">${diffHTML(g)}</div>${leg.length ? `<div class="sentence-legend">${leg.join('')}</div>` : ''}</div>`);
        const fx = fixesHTML(g);
        if (fx && v === 'correct') blocks.push(`<div class="blk"><h4>Para ficar perfeito</h4><ul class="sentence-fixes">${fx}</ul></div>`);
      } else if (v === 'perfect' && g.punct == null && q.mode !== 'tr') {
        // nada
      }
      blocks.push(`<div class="blk"><h4>${v === 'alt' ? 'Outra forma' : 'Frase certa'}</h4><div class="sentence-right"><button class="tool" id="sentence-say" aria-label="Ouvir">${ISPK}</button><div class="txt2 ${v === 'alt' ? 'alt' : ''}" lang="${F.esc(lang)}">${F.clickable(q.tgt)}</div></div><div class="sentence-tr">${F.esc(q.src)}</div></div>`);
      if (!q.ai && (v === 'almost' || v === 'wrong') && (q.mode === 'tr' || q.mode === 'speak') && q.attempt) {
        blocks.push(`<div class="blk"><div class="sentence-ai"><div class="ttl">🤔 Sua frase pode estar certa também</div><div class="small">${q.aiFail ? F.esc(q.aiFail) + ' ' : ''}A correção automática compara com uma frase de referência; sinônimos (como <i>coche</i>/<i>auto</i>) e outras formas de dizer podem estar corretos.</div><button class="tool primary" id="sentence-recheck" style="margin-top:8px">Perguntar à IA se vale</button></div></div>`);
      }
      if (q.ai) {
        const a = q.ai; const errs = a.erros || [];
        const corr = a.versao_corrigida && G.fold(String(a.versao_corrigida).toLowerCase()).replace(/[^\p{L}\p{N}]/gu, '') !== G.fold(q.attempt.toLowerCase()).replace(/[^\p{L}\p{N}]/gu, '') ? a.versao_corrigida : '';
        if (errs.length || (corr && v !== 'alt')) blocks.push(`<div class="blk"><div class="sentence-ai"><div class="ttl">✨ ${v === 'alt' ? 'Detalhes' : 'Explicação'}</div>
          ${errs.length ? `<ul>${errs.map(e => `<li>${e.trecho ? `<s>${F.esc(e.trecho)}</s>` : ''}${e.correcao ? ` → <b>${F.esc(e.correcao)}</b>` : ''}${e.explicacao ? `<div class="small">${F.esc(e.explicacao)}</div>` : ''}</li>`).join('')}</ul>` : ''}
          ${corr ? `<div class="corr small"><span class="muted">Sua frase corrigida:</span> <b lang="${F.esc(lang)}">${F.esc(corr)}</b></div>` : ''}</div></div>`);
      }
    }
    after.innerHTML = `${verdict}${blocks.length ? `<div class="card sentence-res">${blocks.join('')}</div>` : ''}
      <button class="btn btn-primary wide sentence-next" id="sentence-next" style="margin-top:14px">${waiting ? 'Pular verificação' : R.i + 1 >= R.queue.length ? 'Ver resultado' : 'Continuar'}</button>`;
    const card = body.querySelector('#sentence-card'); if (card && !waiting) { card.classList.remove('v-ok', 'v-bad'); if (V.cls === 'ok' || V.cls === 'bad') card.classList.add(V.cls === 'ok' ? 'v-ok' : 'v-bad'); }
    const sayB = after.querySelector('#sentence-say'); if (sayB) sayB.onclick = () => F.say(q.tgt);
    const rc = after.querySelector('#sentence-recheck');
    if (rc) rc.onclick = async () => {
      rc.disabled = true; rc.textContent = 'Conferindo…';
      try {
        const r = await askAI(q); q.ai = r; q.aiFail = null;
        if (r.aceitavel === true && q.verdict !== 'alt') {
          const before = q.pts || 0; q.verdict = 'alt'; const pts = PTS.alt || 0;
          if (pts > before) { F.addPoints(pts - before); R.pts += pts - before; q.pts = pts; }
          // tira a repetição agendada no fim da rodada
          for (let k = R.queue.length - 1; k > R.i; k--) if (R.queue[k].retry && R.queue[k].idx === q.idx) R.queue.splice(k, 1);
          if (q.it.retry) { const first = R.results.find(x => x.idx === q.idx); if (first) first.retryVerdict = 'alt'; }
        }
        showAfter(q, false);
      } catch(e) { q.aiFail = e.friendly || 'A IA não respondeu agora.'; rc.disabled = false; rc.textContent = 'Tentar de novo'; F.toast(q.aiFail); }
    };
    const res = after.querySelector('.txt2'); if (res) F.bindLookup(res, () => q.tgt);
    after.querySelector('#sentence-next').onclick = () => {
      if (waiting) { token++; record(q); phase = 'answered'; showAfter(q, false); return; }
      F.stopSpeech(); R.i++; render(); window.scrollTo({ top:0 });
    };
    if (!waiting) {
      const pb = body.querySelector('#sentence-pts'); if (pb) { pb.querySelector('span').textContent = R.pts; if (q.pts) { pb.classList.remove('bump'); void pb.offsetWidth; pb.classList.add('bump'); } }
      if (q.mode !== 'dict' || v !== 'perfect') setTimeout(() => { if (Q === q && phase === 'answered') F.say(q.tgt); }, 200);
    }
    setTimeout(() => { const n = after.querySelector('#sentence-next'); if (n) { try { n.focus({ preventScroll:true }); } catch(e){} } const vd = after.querySelector('.verdict'); if (vd) vd.scrollIntoView({ block:'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, 40);
  }

  /* ---------- fim da rodada ---------- */
  function summary(){
    phase = 'summary'; token++;
    const rs = R.results, okN = rs.filter(r => ['perfect', 'correct', 'alt'].includes(r.verdict)).length;
    store.rounds = (store.rounds || 0) + 1; store.last = `${okN}/${rs.length}`; store._ts = F.nowS(); F.save();
    F.planDone && F.planDone(ID);
    const pip = r => { const c = VERD[r.verdict]?.cls; return `<i class="${c === 'ok' ? 'ok' : 'bad'}"${c === 'mid' ? ' style="background:rgba(255,255,255,.55);box-shadow:none"' : ''}></i>`; };
    body.innerHTML = `${''}<div class="sumcard sentence-sum"><div class="kick">Rodada concluída · ${F.esc(MODES.find(m => m.id === mode).name)}</div>
        <div class="big">${okN}/${rs.length}</div><div class="pips" aria-hidden="true">${rs.map(pip).join('')}</div>
        <div style="font-weight:700;position:relative">+${R.pts} pontos${rs.some(r => r.retryVerdict) ? ` · ${rs.filter(r => ['perfect', 'correct', 'alt'].includes(r.retryVerdict)).length} corrigidas na segunda chance` : ''}</div></div>
      <div class="card sentence-sumlist">${rs.map(r => { const V = VERD[r.verdict]; return `<div class="it"><span class="tg ${V.cls}">${V.t.replace('!', '')}</span><span><span lang="${F.esc(lang)}">${F.esc(r.tgt)}</span><br><span class="tr">${F.esc(r.src)}</span></span></div>`; }).join('')}</div>
      <div class="sentence-sumbtns"><button class="btn btn-ghost" id="sentence-back">${ctx.arg && ctx.arg.fromPlan ? 'Voltar ao plano' : 'Voltar'}</button><button class="btn btn-primary" id="sentence-more">Mais ${N}</button></div>`;
    body.querySelector('#sentence-more').onclick = () => { window.scrollTo({ top:0 }); start(); };
    body.querySelector('#sentence-back').onclick = () => { if (ctx.arg && ctx.arg.fromPlan) F.open('plan'); else ctx.close(); };
    window.scrollTo({ top:0 });
  }

  start();
}

F.register({
  id: ID, title: 'Frase inteira', icon: '✍️', order: 20, big: false,
  desc: 'Traduza, ouça e escreva frases completas',
  subtitle(){
    const s = F.store(ID);
    return s.rounds ? `Traduza, ouça e escreva frases completas · última rodada ${s.last}` : 'Traduza, ouça e escreva frases completas';
  },
  open,
});
})(typeof window !== 'undefined' ? window : globalThis);
