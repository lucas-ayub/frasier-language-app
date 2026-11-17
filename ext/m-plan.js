/* Plano do dia — sessão guiada de 20 a 50 minutos que passa por todas as atividades. */
"use strict";
(function(){
const LEVELS = [
  ['A1', 'Iniciante', 'Frases curtas do dia a dia, apresentações, números'],
  ['A2', 'Básico', 'Rotina, compras, passado simples, conversas curtas'],
  ['B1', 'Intermediário', 'Contar experiências, opinar, se virar em viagens'],
  ['B2', 'Intermediário avançado', 'Notícias, discussões, textos mais longos'],
  ['C1', 'Avançado', 'Nuances, textos complexos, fala fluente'],
];
const SIZES = { leve:{ name:'Leve', min:20 }, completo:{ name:'Completo', min:35 }, intenso:{ name:'Intenso', min:50 } };
/* etapas: id da atividade, nome, minutos sugeridos, como saber se está feita */
function steps(){
  const st = F.store('plan'), size = st.size || 'completo', t = F.today(), dow = new Date().getDay();
  const n = size === 'leve' ? 15 : size === 'intenso' ? 40 : 25;
  const all = [
    { id:'cards', icon:'🔁', name:`Aquecimento: ${n} frases`, desc:'Revisões vencidas + frases novas no jogo de lacunas', min: size === 'leve' ? 6 : size === 'intenso' ? 12 : 8 },
    { id:'words', icon:'🗂️', name:'Minhas palavras', desc:'Revise as palavras que você salvou', min:3, optional:true },
    { id:'sentence', icon:'✍️', name:'Frase inteira', desc:'Traduza e escreva frases completas', min:5 },
    { id:'read', icon:'📖', name:'Leitura', desc:'Um texto no seu nível ou uma notícia', min:7 },
    { id:'talk', icon:'💬', name:'Conversa', desc:'Um diálogo por voz ou texto', min:8 },
    { id:'journal', icon:'📓', name:'Diário', desc:'Responda à pergunta do dia por escrito', min:6 },
  ];
  let list = all;
  const vocabDue = F.vocab.due().length;
  if (!vocabDue) list = list.filter(s => s.id !== 'words');
  if (size === 'leve') {
    // um dos três "grandes" por dia, alternando
    const big = ['talk', 'read', 'journal'][t % 3];
    list = list.filter(s => ['cards', 'sentence', 'words', big].includes(s.id));
  }
  const avail = new Set(F.modules().map(m => m.id).concat(['cards']));
  list = list.filter(s => avail.has(s.id));
  const done = (st.done && st.done[t]) || {};
  const cnt = (S.stats.days[t] || 0);
  return list.map(s => ({ ...s, target:n, progress: s.id === 'cards' ? Math.min(1, cnt / n) : done[s.id] ? 1 : 0, done: s.id === 'cards' ? cnt >= n : !!done[s.id] }));
}
F.planDone = id => {
  const st = F.store('plan'), t = F.today();
  st.done = st.done || {}; st.done[t] = st.done[t] || {};
  if (st.done[t][id]) return;
  st.done[t][id] = true;
  for (const k of Object.keys(st.done)) if (+k < t - 30) delete st.done[k];
  st._ts = F.nowS(); F.save();
  const ss = steps(), left = ss.filter(s => !s.done).length;
  if (!left) { F.addPoints(50); F.toast('🎉 Plano do dia completo! +50 pontos', 3500); }
  else F.toast(`Etapa concluída ✓ — faltam ${left}`, 2500);
};
function dayComplete(t){
  const st = F.store('plan'); const d = (st.done && st.done[t]) || {};
  const core = ['sentence', 'read', 'talk', 'journal'].filter(id => F.modules().some(m => m.id === id));
  return (S.stats.days[t] || 0) >= 15 && core.filter(id => d[id]).length >= (st.size === 'leve' ? 2 : 3);
}

function openStep(id){
  if (id === 'cards') { F.close(true); startRound('play'); return; }
  F.open(id, { fromPlan:true });
}

function render(body){
  const st = F.store('plan'), lv = F.level(), ss = steps(), t = F.today();
  const doneN = ss.filter(s => s.done).length, totalMin = ss.reduce((a, s) => a + s.min, 0);
  const log = F.todayLog(), minsToday = Math.round(Object.values(log).reduce((a, b) => a + b, 0));
  const next = ss.find(s => !s.done);
  // últimos 7 dias
  const week = [];
  for (let d = t - 6; d <= t; d++) {
    const m = Math.round(Object.values((F.ext().days[d]) || {}).reduce((a, b) => a + b, 0));
    const dt = new Date(d * 86400000 + new Date().getTimezoneOffset() * 60000);
    week.push({ d, m, ok: dayComplete(d), lbl: ['D','S','T','Q','Q','S','S'][dt.getDay()] });
  }
  const maxM = Math.max(30, ...week.map(w => w.m));
  body.innerHTML = `
  <style>
  .plan-hero{background:linear-gradient(135deg,var(--hero),var(--hero-deep));color:var(--hero-ink);border-radius:var(--r-l);padding:18px;box-shadow:0 5px 0 var(--hero-deep)}
  .plan-hero h2{margin:0;font-family:var(--fd);font-size:20px}
  .plan-hero .bar{height:10px;border-radius:99px;background:rgba(255,255,255,.22);margin:12px 0 8px;overflow:hidden}
  .plan-hero .bar i{display:block;height:100%;background:var(--sun);border-radius:99px}
  .plan-hero .meta{display:flex;justify-content:space-between;font-size:14px;opacity:.95}
  .plan-hero .btn{margin-top:14px;width:100%}
  .plan-steps{display:flex;flex-direction:column;gap:8px}
  .plan-step{display:flex;align-items:center;gap:12px;padding:12px;border-radius:var(--r-m);background:var(--surface);border:2px solid var(--line);color:var(--ink);font:inherit;text-align:left;cursor:pointer}
  .plan-step.done{border-color:var(--ok);background:var(--ok-bg)}
  .plan-step .ic{font-size:24px;flex:none;width:34px;text-align:center}
  .plan-step .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
  .plan-step .tx b{font-size:15px}.plan-step .tx small{color:var(--muted)}
  .plan-step .st{font-size:12px;font-weight:700;white-space:nowrap;color:var(--muted)}
  .plan-step.done .st{color:var(--ok-ink)}
  .plan-step .pb{height:5px;border-radius:99px;background:var(--surface-2);margin-top:4px;overflow:hidden}.plan-step .pb i{display:block;height:100%;background:var(--sky)}
  .plan-week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;align-items:end;height:110px;padding:8px 4px 0}
  .plan-week .c{display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end}
  .plan-week .c i{width:70%;border-radius:6px 6px 2px 2px;background:var(--brand-soft);min-height:3px}
  .plan-week .c.ok i{background:var(--ok)}.plan-week .c.today span{color:var(--brand);font-weight:800}
  .plan-week .c span{font-size:12px;color:var(--muted)}.plan-week .c em{font-style:normal;font-size:11px;color:var(--muted)}
  .plan-lv{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
  .plan-lv button{padding:8px 0;border-radius:var(--r-s);border:2px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:800;cursor:pointer}
  .plan-lv button.on{background:var(--brand);border-color:var(--brand-deep);color:var(--on-brand)}
  </style>
  <div class="plan-hero">
    <h2>${doneN === ss.length ? '🎉 Plano de hoje completo!' : 'Seu plano de hoje'}</h2>
    <div class="bar"><i style="width:${Math.round(doneN / ss.length * 100)}%"></i></div>
    <div class="meta"><span>${doneN} de ${ss.length} etapas</span><span>~${totalMin} min · ${minsToday} min estudados</span></div>
    ${next ? `<button class="btn btn-secondary" id="planNext"><span class="ico">▶ ${F.esc(next.name.replace(/:.*/, ''))}</span><small>próxima etapa · ~${next.min} min</small></button>` : `<div style="margin-top:10px">Ótimo trabalho. Se quiser continuar, qualquer atividade abaixo vale como treino extra.</div>`}
  </div>
  <div class="plan-steps">${ss.map(s => `
    <button class="plan-step ${s.done ? 'done' : ''}" data-id="${s.id}">
      <span class="ic">${s.done ? '✅' : s.icon}</span>
      <span class="tx"><b>${F.esc(s.name)}</b><small>${F.esc(s.desc)}</small>${s.id === 'cards' && !s.done ? `<span class="pb"><i style="width:${Math.round(s.progress * 100)}%"></i></span>` : ''}</span>
      <span class="st">${s.done ? 'feito' : '~' + s.min + ' min'}</span>
    </button>`).join('')}</div>
  <div class="card">
    <div class="row"><b>Últimos 7 dias</b><div class="spacer"></div><span class="small muted">minutos por dia · verde = plano feito</span></div>
    <div class="plan-week">${week.map(w => `<div class="c ${w.ok ? 'ok' : ''} ${w.d === t ? 'today' : ''}"><em>${w.m || ''}</em><i style="height:${Math.max(3, w.m / maxM * 70)}px"></i><span>${w.lbl}</span></div>`).join('')}</div>
  </div>
  <div class="card">
    <b>Seu nível</b> <span class="small muted">— ajusta textos, conversas e correções</span>
    <div class="plan-lv" id="planLv" style="margin-top:10px">${LEVELS.map(([c]) => `<button data-lv="${c}" class="${lv === c ? 'on' : ''}">${c}</button>`).join('')}</div>
    <div class="small muted" style="margin-top:8px" id="planLvTxt">${F.esc(LEVELS.find(l => l[0] === lv)[1] + ': ' + LEVELS.find(l => l[0] === lv)[2])}${F.ext().cefr ? '' : ' (estimado pelo seu progresso; toque para escolher)'}</div>
    <div style="margin-top:14px"><b>Tamanho do plano</b></div>
    <div class="chips" id="planSize" style="margin-top:8px">${Object.entries(SIZES).map(([k, v]) => `<button data-s="${k}" class="${(st.size || 'completo') === k ? 'on' : ''}">${v.name} · ~${v.min} min</button>`).join('')}</div>
  </div>
  <div class="small muted" style="padding:0 4px">Dica: um plano completo por dia, todos os dias, vale mais do que maratonas de vez em quando. As atividades com IA (conversa, diário, leitura adaptada) precisam de internet.</div>`;
  body.querySelectorAll('.plan-step').forEach(b => b.onclick = () => openStep(b.dataset.id));
  if ($('planNext')) $('planNext').onclick = () => openStep(next.id);
  $('planLv').onclick = e => { const b = e.target.closest('button'); if (!b) return; F.setLevel(b.dataset.lv); render(body); };
  $('planSize').onclick = e => { const b = e.target.closest('button'); if (!b) return; st.size = b.dataset.s; st._ts = F.nowS(); F.save(); render(body); };
}

F.register({
  id:'plan', title:'Plano do dia', icon:'🗓️', order:10, big:true,
  subtitle(){ try { const ss = steps(), d = ss.filter(s => s.done).length; return d === ss.length ? `Completo hoje 🎉 · nível ${F.level()}` : `${d}/${ss.length} etapas · ~${ss.reduce((a, s) => a + s.min, 0)} min · nível ${F.level()}`; } catch(e) { return 'Sessão guiada de 30–40 min'; } },
  open(body){ render(body); },
});
})();
