/* Frasier — núcleo das atividades completas (Plano do dia, Frase inteira, Conversa, Diário, Leitura, Palavras).
   Carregado depois do script principal do index.html: usa as globais dele (S, PAIR, SRC, COURSE_ID, COURSE, speak, toast,
   esc, strip, shuffle, today, nowS, saveLocal, show, renderHome, sent, ensureChunks, IDX, HIDDEN, metaDirty...).
   Cada atividade fica em ext/m-*.js e se registra com F.register({...}). Contrato completo em ext/CONTRACT.md. */
"use strict";
(function(){
const LANG_NAME_PT = { es:'espanhol', fr:'francês', de:'alemão', it:'italiano', en:'inglês', pt:'português' };
const LANG_NAME_EN = { es:'Spanish', fr:'French', de:'German', it:'Italian', en:'English', pt:'Portuguese' };
const MODULES = [];
const F = window.F = {
  /* idioma */
  get pair(){ return PAIR; }, get src(){ return SRC; }, get tgt(){ return COURSE_ID; },
  get course(){ return COURSE; },
  tgtName: LANG_NAME_PT[COURSE_ID], srcName: LANG_NAME_PT[SRC],
  tgtNameEn: LANG_NAME_EN[COURSE_ID], srcNameEn: LANG_NAME_EN[SRC],
  /* idioma das explicações para o aluno (a interface é em português) */
  get explainLang(){ return SRC === 'pt' ? 'português do Brasil' : 'English'; },
  /* utilidades do app principal */
  esc: s => esc(String(s ?? '')), toast: (m, ms) => toast(m, ms), strip, shuffle, today, nowS,
  get S(){ return S; },
  save(){ metaDirty = true; saveLocal(); clearTimeout(F._ft); F._ft = setTimeout(() => { try { flush(); } catch(e){} }, 1500); },
};

/* ---------- estado das atividades (S.ext, sincronizado com a nuvem pelo _meta) ---------- */
function ext(){
  if (!S.ext) S.ext = {};
  const e = S.ext;
  e.vocab = e.vocab || {};        // palavra -> { w, t, ctx, ts, lv, due }
  e.days = e.days || {};          // dia -> { atividadeId: minutos }
  e.journal = e.journal || [];    // [{ id, ts, prompt, text, score, fixed }]
  e.cefr = e.cefr || null;        // 'A1'..'C1' escolhido pelo aluno
  e.store = e.store || {};        // espaço livre por módulo: e.store[moduleId] = {...}
  return e;
}
F.ext = ext;
F.store = id => { const e = ext(); return e.store[id] = e.store[id] || {}; };
/* nível CEFR: escolhido pelo aluno ou estimado pelo progresso nas frases */
F.level = () => {
  const e = ext(); if (e.cefr) return e.cefr;
  const m = Object.values(S.prog || {}).filter(v => v[0] >= 3).length;
  return m > 3000 ? 'B2' : m > 1200 ? 'B1' : m > 300 ? 'A2' : 'A1';
};
F.setLevel = lv => { ext().cefr = lv; F.save(); };

/* ---------- tempo de estudo por atividade (Plano do dia) ---------- */
F.logTime = (id, minutes) => {
  const d = ext().days, t = today(); d[t] = d[t] || {};
  d[t][id] = Math.round(((d[t][id] || 0) + minutes) * 10) / 10;
  // guarda só os últimos 60 dias
  for (const k of Object.keys(d)) if (+k < t - 60) delete d[k];
  F.save();
};
F.todayLog = () => ext().days[today()] || {};
/* cronômetro simples: F.timer(id) ao abrir a atividade; chame stop() ao sair (registra os minutos) */
F.timer = id => { const t0 = Date.now(); let done = false; return { stop(){ if (done) return; done = true; const m = (Date.now() - t0) / 60000; if (m > 0.15) F.logTime(id, Math.min(m, 60)); } }; };
F.addPoints = n => { S.stats.points = (S.stats.points || 0) + n; F.save(); };

/* ---------- vocabulário salvo (Minhas palavras) ---------- */
F.vocab = {
  add(w, t, ctx){ const k = w.toLowerCase().trim(); if (!k) return; const v = ext().vocab; v[k] = { ...(v[k] || { lv:0, due:today() }), w:w.trim(), t:t || v[k]?.t || '', ctx:ctx || v[k]?.ctx || '', ts:nowS() }; F.save(); toast('Palavra salva em Minhas palavras'); },
  remove(w){ delete ext().vocab[w.toLowerCase().trim()]; F.save(); },
  has: w => !!ext().vocab[w.toLowerCase().trim()],
  list: () => Object.values(ext().vocab).sort((a, b) => b.ts - a.ts),
  due: () => Object.values(ext().vocab).filter(x => (x.due ?? 0) <= today()),
  grade(w, ok){ const x = ext().vocab[w.toLowerCase().trim()]; if (!x) return; x.lv = ok ? Math.min(4, (x.lv || 0) + 1) : 0; x.due = today() + [0, 1, 4, 12, 40][x.lv]; x.ts = nowS(); F.save(); },
};

/* ---------- IA (Gemini via Firebase AI Logic, plano gratuito) ---------- */
const AI_URL = m => `https://firebasevertexai.googleapis.com/v1beta/projects/frasier-language-app/models/${m}:generateContent`;
const AI_KEY = 'AIzaSyCVNu0TiymMNR1dgtnyxZxJGAa76Y5OCSY'; // chave web pública do Firebase (não é segredo)
const AI_MODELS = ['gemini-flash-lite-latest', 'gemini-3-flash-preview']; // ambos com cota grátis no projeto; o flash-latest dá 429 (sem cota)
F.aiAvailable = () => navigator.onLine !== false;
/* F.ai(input, opts)
   input: string (pergunta) OU array de mensagens [{role:'user'|'model', text}]
   opts: { system: string, json: bool (resposta em JSON, já parseada), schema: objeto JSON Schema (opcional),
           temperature: número, maxTokens: número, timeout: ms }
   retorna: string, ou objeto se json:true. Lança Error com .friendly (mensagem em pt-BR) se falhar. */
F.ai = async function(input, opts = {}){
  const contents = typeof input === 'string' ? [{ role:'user', parts:[{ text:input }] }]
    : input.map(m => ({ role: m.role === 'model' || m.role === 'assistant' || m.role === 'bot' ? 'model' : 'user', parts:[{ text:String(m.text ?? m.content ?? '') }] }));
  const body = { contents, generationConfig:{ temperature: opts.temperature ?? 0.7, maxOutputTokens: opts.maxTokens ?? 2048 } };
  // raciocínio curto: 'minimal' responde em < 1 s; use opts.thinking:'low' para correções mais cuidadosas
  body.generationConfig.thinkingConfig = { thinkingLevel: opts.thinking || 'minimal' };
  if (opts.system) body.systemInstruction = { parts:[{ text:opts.system }] };
  if (opts.json) { body.generationConfig.responseMimeType = 'application/json'; if (opts.schema) body.generationConfig.responseSchema = opts.schema; }
  const headers = { 'Content-Type':'application/json', 'x-goog-api-key':AI_KEY };
  // (não enviar X-Firebase-Auth: o endpoint não aceita esse cabeçalho no CORS e a chamada falha com 'Failed to fetch' para quem está logado)
  const appCheck = async (force) => { try { if (window.firebase && firebase.appCheck) { const t = await Promise.race([firebase.appCheck().getToken(!!force), new Promise((_, rej) => setTimeout(() => rej(new Error('appcheck timeout')), 10000))]); if (t && t.token) headers['X-Firebase-AppCheck'] = t.token; } } catch(e){ console.warn('appcheck token', e); } };
  await appCheck(false);
  // até 6 tentativas alternando modelos, com espera crescente (erros 503/429/timeout costumam passar em segundos)
  const plan = [0, 1, 0, 1, 0, 1], waits = [0, 300, 1200, 2500, 4000, 6000];
  let lastErr, refreshed = false, noThink = false, netFail = false;
  for (let attempt = 0; attempt < plan.length; attempt++) {
    if (waits[attempt]) await new Promise(res => setTimeout(res, waits[attempt]));
    if (!navigator.onLine) break;
    const model = AI_MODELS[plan[attempt]];
    const b = JSON.parse(JSON.stringify(body)); if (noThink) delete b.generationConfig.thinkingConfig;
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), opts.timeout || 25000);
    try {
      // se a rede/CORS falhou antes (TypeError), tenta com a chave na URL e menos cabeçalhos
      const h2 = netFail ? Object.fromEntries(Object.entries(headers).filter(([k]) => k !== 'x-goog-api-key')) : headers;
      const r = await fetch(AI_URL(model) + (netFail ? '?key=' + AI_KEY : ''), { method:'POST', headers:h2, body:JSON.stringify(b), signal:ctl.signal, credentials:'omit', mode:'cors' });
      clearTimeout(to);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        lastErr = new Error((j.error && j.error.message) || ('HTTP ' + r.status)); lastErr.status = r.status;
        if (r.status === 400 && !noThink) { noThink = true; attempt--; continue; }
        if ((r.status === 401 || r.status === 403) && !refreshed) { refreshed = true; await appCheck(true); continue; }
        if (r.status === 400 || r.status === 401 || r.status === 403) break;
        continue; // 429, 404, 5xx: tenta outro modelo / de novo
      }
      const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
      if (!text) { lastErr = new Error('resposta vazia'); continue; }
      if (!opts.json) return text.trim();
      try { return JSON.parse(text); } catch(e) {
        const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/); if (m) { try { return JSON.parse(m[0]); } catch(e2){} }
        lastErr = new Error('JSON inválido'); continue;
      }
    } catch(e) { clearTimeout(to); lastErr = e; if (e.name === 'AbortError') lastErr = new Error('tempo esgotado'); else netFail = !netFail; }
  }
  const err = lastErr || new Error('falha');
  const code = err.status ? 'HTTP ' + err.status : String(err.message || '').slice(0, 40); const ver = 'v' + String(typeof APP_VERSION !== 'undefined' ? APP_VERSION : '').split(' ')[0];
  err.friendly = !navigator.onLine ? 'Sem internet: esta parte usa IA e precisa de conexão.'
    : err.status === 429 ? 'A IA está muito requisitada agora. Tente de novo em um minuto. (' + code + ')'
    : 'Não consegui falar com a IA agora. Tente de novo em instantes. (' + code + ' · ' + ver + ')';
  console.warn('F.ai falhou', err);
  throw err;
};

/* tradução rápida de uma palavra no contexto (com cache local) */
const LK = 'frasier-lookup-' + PAIR;
let lookCache = {}; try { lookCache = JSON.parse(localStorage.getItem(LK) || '{}'); } catch(e){}
F.lookup = async (word, context) => {
  const k = word.toLowerCase() + '|' + (context || '').slice(0, 80);
  if (lookCache[k]) return lookCache[k];
  const r = await F.ai(`Palavra em ${F.tgtName}: "${word}". Frase: "${context || word}".
Responda em JSON: {"lemma": forma de dicionário, "pos": classe gramatical curta em ${F.explainLang}, "tr": tradução para ${F.srcName} NESTE contexto (1 a 4 palavras), "note": observação curta e útil em ${F.explainLang} (gênero, conjugação, expressão), ou ""}`, { json:true, temperature:0.2, maxTokens:300 });
  lookCache[k] = r; const keys = Object.keys(lookCache); if (keys.length > 800) delete lookCache[keys[0]];
  try { localStorage.setItem(LK, JSON.stringify(lookCache)); } catch(e){}
  return r;
};

/* ---------- voz ---------- */
/* F.say(text) fala no idioma estudado e resolve quando termina */
F.say = (text, opts = {}) => new Promise(res => {
  try {
    if (!('speechSynthesis' in window)) { speak(text); return setTimeout(res, 300 + text.length * 60); }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const pref = S.settings.accent; const vs = (typeof VOICES !== 'undefined' && VOICES.length) ? VOICES : speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith(COURSE_ID));
    const v = vs.find(v => v.lang.replace('_','-') === pref && /premium|enhanced|mejorad/i.test(v.name)) || vs.find(v => v.lang.replace('_','-') === pref) || vs[0];
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = pref || COURSE.voices[0][0];
    u.rate = (opts.rate || 1) * (S.settings.rate || 1);
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    u.onend = fin; u.onerror = fin; setTimeout(fin, 2000 + text.length * 110);
    speechSynthesis.speak(u);
  } catch(e) { res(); }
});
F.stopSpeech = () => { try { speechSynthesis.cancel(); } catch(e){} };
/* F.listen({ onInterim(text), lang }) -> Promise<string> com o que foi dito (''/rejeita se não houver reconhecimento).
   F.canListen() diz se o navegador reconhece voz. */
const SRx = window.SpeechRecognition || window.webkitSpeechRecognition;
F.canListen = () => !!SRx;
let curRec = null;
F.listen = (opts = {}) => new Promise((res, rej) => {
  if (!SRx) { rej(new Error('sem reconhecimento de voz')); return; }
  try { curRec && curRec.abort(); } catch(e){}
  F.stopSpeech();
  const rec = curRec = new SRx(); rec.lang = opts.lang || S.settings.accent || COURSE.voices[0][0];
  rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
  let finalT = '', interim = '';
  rec.onresult = e => { interim = ''; finalT = ''; for (let i = 0; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) finalT += r[0].transcript; else interim += r[0].transcript; } opts.onInterim && opts.onInterim((finalT + ' ' + interim).trim()); };
  rec.onerror = e => { if (e.error === 'no-speech' || e.error === 'aborted') res(''); else rej(new Error(e.error)); };
  rec.onend = () => res((finalT || interim).trim());
  try { rec.start(); } catch(e) { rej(e); }
});
F.stopListen = () => { try { curRec && curRec.stop(); } catch(e){} };

/* ---------- tela das atividades ---------- */
/* F.open(moduleId) abre a atividade; o módulo recebe (body, ctx) com ctx.setTitle, ctx.close, ctx.onClose(fn) */
let current = null;
F.open = (id, arg) => {
  const m = MODULES.find(x => x.id === id); if (!m) return;
  if (current) F.close(true);
  const timer = F.timer(m.id);
  const closers = [];
  $('extTitle').textContent = m.title;
  $('extIcon').textContent = m.icon || '';
  const body = $('extBody'); body.innerHTML = ''; body.className = 'extbody ext-' + m.id;
  current = { m, timer, closers };
  show('ext');
  try { history.pushState({ ext:id }, ''); } catch(e){}
  const ctx = { setTitle: t => { $('extTitle').textContent = t; }, close: () => F.close(), onClose: fn => closers.push(fn), arg, open: F.open };
  try { const p = m.open(body, ctx); if (p && p.catch) p.catch(e => { console.error(e); body.innerHTML = `<div class="card">Algo deu errado ao abrir. ${F.esc(e.friendly || e.message)}</div>`; }); }
  catch(e) { console.error(e); body.innerHTML = `<div class="card">Algo deu errado ao abrir. ${F.esc(e.message)}</div>`; }
};
F.close = (silent) => {
  if (!current) return;
  const c = current; current = null;
  for (const fn of c.closers) { try { fn(); } catch(e){} }
  c.timer.stop(); F.stopSpeech(); F.stopListen();
  if (!silent) { show('home'); renderHome(); }
};
window.addEventListener('popstate', () => { if (current) F.close(); });
F.register = m => { MODULES.push(m); MODULES.sort((a, b) => (a.order || 50) - (b.order || 50)); renderHub(); };
F.modules = () => MODULES.slice();

/* ---------- cartões na tela inicial ---------- */
function renderHub(){
  const box = $('hubGrid'); if (!box) return;
  const log = F.todayLog();
  box.innerHTML = MODULES.filter(m => !m.hidden).map(m => {
    const mins = Math.round(log[m.id] || 0);
    return `<button class="hubcard ${m.big ? 'big' : ''}" data-m="${m.id}"><span class="hi">${m.icon || ''}</span><span class="ht"><b>${F.esc(m.title)}</b><small>${F.esc(typeof m.subtitle === 'function' ? m.subtitle() : (m.desc || ''))}</small></span>${mins ? `<span class="hm">${mins} min hoje</span>` : ''}</button>`;
  }).join('');
}
F.renderHub = renderHub;
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.hubcard'); if (b) F.open(b.dataset.m); });
if (typeof renderHome === 'function') {
  // re-renderiza os cartões sempre que a home é desenhada
  const orig = renderHome;
  window.renderHome = renderHome = function(){ const r = orig.apply(this, arguments); try { renderHub(); } catch(e){} return r; };
}
$('extBack').onclick = () => { try { history.back(); } catch(e){ F.close(); } setTimeout(() => current && F.close(), 60); };

/* ---------- utilidades de interface para os módulos ---------- */
/* palavras clicáveis: F.clickable(text) -> HTML com <span class="w"> em cada palavra; F.bindLookup(el, context) liga o toque */
F.clickable = text => String(text).split(/(\p{L}[\p{L}\p{M}'’-]*)/u).map((p, i) => i % 2 ? `<span class="w" tabindex="0">${F.esc(p)}</span>` : F.esc(p)).join('');
F.bindLookup = (el, getContext) => {
  el.addEventListener('click', async e => {
    const w = e.target.closest('.w'); if (!w) return;
    const word = w.textContent; const ctx = typeof getContext === 'function' ? getContext(w) : (w.closest('p, .sentence, li, div')?.textContent || word);
    el.querySelectorAll('.w.sel').forEach(x => x.classList.remove('sel')); w.classList.add('sel');
    F.popover(w, `<div class="lk"><b>${F.esc(word)}</b> <span class="muted small">…</span></div>`);
    try {
      const r = await F.lookup(word, ctx);
      F.popover(w, `<div class="lk"><div><b>${F.esc(r.lemma || word)}</b> <span class="muted small">${F.esc(r.pos || '')}</span></div><div class="lktr">${F.esc(r.tr || '')}</div>${r.note ? `<div class="small muted">${F.esc(r.note)}</div>` : ''}
        <div class="row" style="gap:6px;margin-top:8px"><button class="tool" data-act="say">🔊</button><button class="tool primary" data-act="save">${F.vocab.has(r.lemma || word) ? 'Salva ✓' : '+ Minhas palavras'}</button></div></div>`, {
        say: () => F.say(word), save: () => F.vocab.add(r.lemma || word, r.tr, ctx) });
    } catch(err) { F.popover(w, `<div class="lk small">${F.esc(err.friendly || 'Sem tradução agora.')}</div>`); }
  });
};
let pop = null;
F.popover = (anchor, html, actions = {}) => {
  if (!pop) { pop = document.createElement('div'); pop.className = 'xpop'; document.body.appendChild(pop);
    document.addEventListener('click', e => { if (pop && !pop.contains(e.target) && !e.target.closest('.w')) pop.classList.add('hidden'); }, true); }
  pop.innerHTML = html; pop.classList.remove('hidden');
  const r = anchor.getBoundingClientRect(), W = Math.min(300, innerWidth - 24);
  pop.style.width = W + 'px'; pop.style.left = Math.max(12, Math.min(innerWidth - W - 12, r.left + r.width / 2 - W / 2)) + 'px';
  pop.style.top = (r.bottom + scrollY + 8) + 'px';
  pop.querySelectorAll('[data-act]').forEach(b => b.onclick = ev => { ev.stopPropagation(); actions[b.dataset.act] && actions[b.dataset.act](b); if (b.dataset.act === 'save') b.textContent = 'Salva ✓'; });
};
F.hidePopover = () => pop && pop.classList.add('hidden');
/* botão de microfone padrão: F.micButton(label) -> HTML; use com F.listen */
F.micSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/></svg>';
F.loading = (msg = 'Pensando…') => `<div class="xload"><span class="tiles" aria-hidden="true"><i></i><i></i><i></i></span>${F.esc(msg)}</div>`;
F.errorBox = (err, retryId) => `<div class="card xerr">${F.esc(err && (err.friendly || err.message) || 'Algo deu errado.')}${retryId ? ` <button class="tool" id="${retryId}">Tentar de novo</button>` : ''}</div>`;
})();
