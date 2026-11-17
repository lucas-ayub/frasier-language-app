/* Frasier — módulo "Conversa" (talk): prática de conversa por voz ou texto com um parceiro de IA,
   em cenários do dia a dia, com missão, correções, dicas e avaliação no final. Ver ext/CONTRACT.md. */
(function(){
"use strict";
if (!window.F) return;

/* ---------------- cenários ---------------- */
/* t/d/m: textos da interface (pt-BR); role/set/goal: instruções para a IA (inglês, mais estável) */
const GROUPS = [
  ['dia', 'Dia a dia'], ['viagem', 'Viagem'], ['trabalho', 'Trabalho e estudo'], ['livre', 'Livre'],
];
const SC = [
  { id:'cafe', g:'dia', e:'☕', t:'No café', d:'Peça algo para comer e beber no balcão.', lv:'A1',
    m:'Peça um café e um pão (ou um doce) e pergunte quanto custa.',
    role:'a friendly barista at a busy neighbourhood café', set:'a café counter in the morning',
    goal:'order a coffee and something to eat (bread/pastry) and ask how much it costs' },
  { id:'restaurante', g:'dia', e:'🍽️', t:'Restaurante', d:'Mesa, pedido, prato do dia e a conta.', lv:'A2',
    m:'Peça uma mesa, pergunte o prato do dia, faça o pedido e peça a conta.',
    role:'a waiter at a casual local restaurant', set:'a restaurant at dinner time; the learner just walked in',
    goal:'get a table, ask about the dish of the day, order food and a drink, and ask for the bill' },
  { id:'mercado', g:'dia', e:'🛒', t:'Mercado e feira', d:'Frutas, quantidades e preços.', lv:'A1',
    m:'Compre frutas: pergunte o preço, peça uma quantidade (ex.: 1 quilo) e pague.',
    role:'a chatty market stall vendor selling fruit and vegetables', set:'an open-air market on Saturday morning',
    goal:'ask the price of some fruit, ask for a specific quantity (e.g. one kilo) and pay' },
  { id:'direcoes', g:'dia', e:'🗺️', t:'Pedir direções', d:'Ache a estação, o museu ou a farmácia.', lv:'A2',
    m:'Pergunte como chegar à estação de metrô mais próxima e confirme o caminho repetindo as instruções.',
    role:'a helpful local passer-by on the street', set:'a street corner in the city centre; the learner is a lost tourist',
    goal:'ask how to get to the nearest metro station and confirm the directions by repeating them back' },
  { id:'farmacia', g:'dia', e:'💊', t:'Farmácia', d:'Explique sintomas e peça um remédio.', lv:'A2',
    m:'Explique que está com dor de garganta e tosse, peça um remédio e pergunte como tomar.',
    role:'a pharmacist', set:'a small pharmacy',
    goal:'explain they have a sore throat and a cough, get a remedy and ask how often to take it' },
  { id:'medico', g:'dia', e:'🩺', t:'Consulta médica', d:'Marque e descreva o problema ao médico.', lv:'B1',
    m:'Descreva seus sintomas (desde quando, onde dói), responda às perguntas e entenda o tratamento.',
    role:'a calm general practitioner (doctor)', set:'a doctor\'s office during an appointment',
    goal:'describe symptoms (since when, where it hurts), answer the doctor\'s questions and understand the treatment' },
  { id:'apresentar', g:'dia', e:'👋', t:'Conhecer alguém', d:'Apresente-se numa festa.', lv:'A1',
    m:'Apresente-se (nome, de onde é, o que faz) e descubra duas coisas sobre a outra pessoa.',
    role:'a friendly person the learner just met at a friend\'s party', set:'a relaxed house party',
    goal:'introduce themselves (name, where they are from, what they do) and find out two things about the other person' },
  { id:'fimdesemana', g:'dia', e:'🎉', t:'Fim de semana', d:'Conte o que fez e faça planos.', lv:'A2',
    m:'Conte o que você fez no fim de semana (no passado) e combine algo para o próximo.',
    role:'a friend and co-worker on Monday morning', set:'chatting by the coffee machine on a Monday',
    goal:'tell what they did last weekend using past tenses, and make a plan together for next weekend' },
  { id:'apartamento', g:'dia', e:'🏠', t:'Alugar apartamento', d:'Visite e negocie um aluguel.', lv:'B1',
    m:'Pergunte o preço, o que está incluído (contas, móveis) e combine uma visita.',
    role:'a landlord renting out a small furnished flat', set:'a phone call about a flat advertised online',
    goal:'ask the rent, what is included (bills, furniture), the deposit, and arrange a viewing day and time' },
  { id:'hotel', g:'viagem', e:'🏨', t:'Check-in no hotel', d:'Reserva, café da manhã e wi-fi.', lv:'A2',
    m:'Faça o check-in com sua reserva e pergunte o horário do café da manhã e a senha do wi-fi.',
    role:'a hotel receptionist', set:'the front desk of a mid-range hotel in the evening',
    goal:'check in with an existing reservation and ask what time breakfast is and the wifi password' },
  { id:'aeroporto', g:'viagem', e:'✈️', t:'Aeroporto', d:'Despache a mala e ache o portão.', lv:'A2',
    m:'Faça o check-in do voo, despache uma mala, peça um assento na janela e pergunte o portão de embarque.',
    role:'an airline check-in agent', set:'the airline check-in desk at the airport',
    goal:'check in for the flight, check one bag, ask for a window seat and ask which gate and what boarding time' },
  { id:'trem', g:'viagem', e:'🚆', t:'Passagem de trem', d:'Ida e volta, horários e plataforma.', lv:'A2',
    m:'Compre uma passagem de ida e volta para amanhã de manhã e pergunte de qual plataforma o trem sai.',
    role:'a ticket clerk at a train station', set:'the ticket office of the central train station',
    goal:'buy a return ticket for tomorrow morning to a nearby city, ask the price and which platform the train leaves from' },
  { id:'entrevista', g:'trabalho', e:'💼', t:'Entrevista de emprego', d:'Fale de você, experiência e objetivos.', lv:'B1',
    m:'Fale da sua formação e experiência, explique por que quer a vaga e faça uma pergunta sobre a empresa.',
    role:'a friendly but professional HR interviewer', set:'a job interview for a position that fits the learner',
    goal:'talk about their education and experience, explain why they want the job, and ask one question about the company' },
  { id:'reuniao', g:'trabalho', e:'📊', t:'Reunião / apresentação', d:'Apresente um projeto em poucas frases.', lv:'B1',
    m:'Apresente um projeto seu em poucas frases (objetivo, andamento, próximo passo) e responda a uma pergunta.',
    role:'a team lead in a short weekly team meeting', set:'a weekly team meeting; it is the learner\'s turn to give an update',
    goal:'present one of their projects briefly (goal, progress, next step) and answer a follow-up question' },
  { id:'colega', g:'trabalho', e:'🧑‍💻', t:'Conversa com colega', d:'Peça ajuda e combine um almoço.', lv:'A2',
    m:'Peça ajuda a um colega com uma tarefa e combine de almoçarem juntos.',
    role:'a helpful colleague (work or university)', set:'the office or campus, between tasks',
    goal:'ask a colleague for help with a task and arrange to have lunch together' },
  { id:'livre', g:'livre', e:'💬', t:'Papo livre', d:'Converse sobre qualquer assunto.', lv:'A1',
    m:'Mantenha a conversa por pelo menos 6 falas sobre um assunto de que você goste.',
    role:'a curious, friendly native speaker friend', set:'a relaxed chat; ask the learner what they want to talk about, then follow their interests',
    goal:'keep a natural conversation going for at least 6 turns about a topic they like' },
  { id:'sobrevoce', g:'livre', e:'🎙️', t:'O tutor pergunta', d:'Perguntas sobre você, sua rotina e gostos.', lv:'A1',
    m:'Responda às perguntas sobre você com frases completas e faça uma pergunta de volta.',
    role:'a warm conversation tutor who interviews the learner about their life (routine, family, hobbies, studies, travel, plans)', set:'a one-to-one conversation class',
    goal:'answer questions about themselves with full sentences and ask at least one question back' },
];
const byId = id => SC.find(s => s.id === id);
const LV = ['A1', 'A2', 'B1', 'B2', 'C1'];
const LV_GUIDE = {
  A1:'very short sentences (max ~8 words), present tense, the most common everyday words, one simple question at a time',
  A2:'short simple sentences, present / simple past / near future, common everyday vocabulary, one question at a time',
  B1:'clear natural sentences, common past and future tenses, a few everyday expressions',
  B2:'natural native-like speech with varied tenses and connectors and some idioms, still clear',
  C1:'fully natural native speech, idioms, nuance and colloquial expressions',
};
const MAX_HIST = 16;

/* ---------------- estado ---------------- */
const st = () => {
  const s = F.store('talk');
  s.o = Object.assign({ mode:'text', show:true, slow:false, corr:'live', auto:true }, s.o || {});
  s.h = s.h || [];
  return s;
};
const saveStore = () => { const s = st(); s._ts = F.nowS(); F.save(); };

/* cache de traduções (local) */
const TRK = 'frasier-talk-tr-' + F.pair;
let trCache = {}; try { trCache = JSON.parse(localStorage.getItem(TRK) || '{}'); } catch(e){}
async function translate(text){
  if (trCache[text]) return trCache[text];
  const r = await F.ai(`Traduza do ${F.tgtName} para ${F.srcName}, de forma natural. Responda só com a tradução, sem aspas.\n\n${text}`, { temperature:0.2, maxTokens:400 });
  trCache[text] = r; const k = Object.keys(trCache); if (k.length > 200) delete trCache[k[0]];
  try { localStorage.setItem(TRK, JSON.stringify(trCache)); } catch(e){}
  return r;
}

/* ---------------- estilos ---------------- */
function css(){
  if (document.getElementById('talk-css')) return;
  const el = document.createElement('style'); el.id = 'talk-css';
  el.textContent = `
.talk-lead{padding:16px 16px 14px;display:flex;gap:12px;align-items:center}
.talk-lead .talk-big{font-size:38px;line-height:1}
.talk-lead h2{margin:0;font-family:var(--fd);font-size:17px;letter-spacing:-.02em}
.talk-lead p{margin:3px 0 0;font-size:14px;color:var(--muted)}
.talk-gh{font-family:var(--fd);font-size:14px;font-weight:700;margin:10px 2px 0;color:var(--ink)}
.talk-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.talk-sc{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;padding:12px;border-radius:var(--r-m);background:var(--surface);border:2px solid var(--line);
  box-shadow:0 3px 0 var(--edge);color:var(--ink);min-height:104px;position:relative;transition:transform .07s,box-shadow .07s}
.talk-sc:active{transform:translateY(2px);box-shadow:0 1px 0 var(--edge)}
.talk-sc .e{font-size:26px;line-height:1}
.talk-sc b{font-family:var(--fd);font-size:13.5px;font-weight:700;letter-spacing:-.01em;line-height:1.2}
.talk-sc small{color:var(--muted);font-size:12.5px;line-height:1.25}
.talk-sc .lv{position:absolute;top:8px;right:8px;font-size:11px;font-weight:800;padding:1px 7px;border-radius:99px;background:var(--surface-2);color:var(--muted)}
.talk-sc .lv.fit{background:var(--ok-bg);color:var(--ok-ink)}
.talk-sc .lv.hard{background:color-mix(in srgb,var(--sun) 30%,transparent);color:var(--ink)}
.talk-sc.wide{grid-column:1/-1;flex-direction:row;align-items:center;min-height:64px;gap:12px}
.talk-sc.wide .tx{display:flex;flex-direction:column;gap:2px;padding-right:34px}
.talk-recent{padding:4px 14px}
.talk-recent .it{display:flex;gap:10px;align-items:center;padding:10px 0;font-size:14.5px}
.talk-recent .it+.it{border-top:2px solid var(--line)}
.talk-recent .sc{margin-left:auto;font-family:var(--fd);font-weight:800;font-size:14px}
.talk-brief{padding:18px 16px 16px}
.talk-brief .top{display:flex;gap:12px;align-items:center;margin:0 0 12px}
.talk-brief .top .e{font-size:42px;line-height:1}
.talk-brief h2{margin:0;font-family:var(--fd);font-size:19px;letter-spacing:-.02em}
.talk-mis{display:flex;gap:10px;align-items:flex-start;background:var(--brand-soft);border:2px solid var(--slot-line);border-radius:var(--r-m);padding:12px;font-weight:700;font-size:16px;line-height:1.35}
.talk-mis .k{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);display:block;font-weight:800;margin-bottom:2px}
.talk-opts{padding:6px 16px 14px}
.talk-opts .f{padding:12px 0 2px}
.talk-opts .f+.f{border-top:2px solid var(--line);margin-top:10px}
.talk-opts .lbl{font-weight:700;font-size:15px;margin-bottom:8px;display:block}
.talk-opts .help{font-size:13.5px;color:var(--muted);margin-top:6px;line-height:1.4}
.talk-opts .chips button{min-height:42px;padding:0 13px;font-size:14.5px}
.talk-seg2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.talk-seg2 button{border:2px solid var(--line);background:var(--surface);border-radius:var(--r-m);min-height:62px;padding:8px;font-weight:700;font-size:15px;color:var(--muted);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:0 3px 0 var(--edge)}
.talk-seg2 button small{font-weight:500;font-size:12px}
.talk-seg2 button.on{background:var(--brand-soft);border-color:var(--brand);color:var(--ink);box-shadow:0 3px 0 var(--brand)}
.talk-start{position:sticky;bottom:calc(10px + env(safe-area-inset-bottom));z-index:3;box-shadow:0 5px 0 var(--e),0 0 0 6px var(--bg)}
/* conversa */
.extbody.ext-talk:has(.talk-chat){padding-bottom:0}
.talk-chat{display:flex;flex-direction:column;gap:10px;min-height:calc(100dvh - 92px);margin-bottom:-40px}
.talk-mbar{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:var(--r-m);background:var(--brand-soft);border:2px solid var(--slot-line);font-size:14px;line-height:1.3}
.talk-mbar .ic{font-size:20px;flex:none}
.talk-mbar .tx{flex:1;min-width:0}
.talk-mbar .tx b{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);display:block}
.talk-mbar.done{background:var(--ok-bg);border-color:var(--ok);color:var(--ok-ink)}
.talk-mbar .tool{min-height:40px;padding:6px 11px;font-size:14px;flex:none}
.talk-log{display:flex;flex-direction:column;gap:12px;flex:1;padding:4px 0 6px}
.talk-msg{display:flex;flex-direction:column;max-width:88%;animation:talkin .28s var(--ease-pop) both}
@keyframes talkin{from{transform:translateY(8px);opacity:0}}
.talk-msg.bot{align-self:flex-start;align-items:flex-start}
.talk-msg.me{align-self:flex-end;align-items:flex-end}
.talk-bub{padding:11px 14px;border-radius:18px;font-size:18px;line-height:1.5;word-wrap:break-word;overflow-wrap:anywhere}
.talk-msg.bot .talk-bub{background:var(--surface);border:2px solid var(--line);border-bottom-left-radius:6px;box-shadow:0 3px 0 var(--edge)}
.talk-msg.me .talk-bub{background:var(--brand);color:var(--on-brand);border-bottom-right-radius:6px;box-shadow:0 3px 0 var(--brand-deep)}
.talk-hid{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:15px;font-weight:700;border:0;background:none;padding:0;min-height:30px;text-align:left}
.talk-wave{display:inline-flex;gap:3px;align-items:center;height:22px}
.talk-wave i{width:4px;border-radius:2px;background:var(--brand);height:8px}
.talk-wave i:nth-child(2){height:16px}.talk-wave i:nth-child(3){height:22px}.talk-wave i:nth-child(4){height:12px}.talk-wave i:nth-child(5){height:18px}
.talk-acts{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
.talk-acts button{border:0;background:var(--surface-2);color:var(--ink);border-radius:10px;min-height:36px;padding:0 11px;font-size:13.5px;font-weight:700;display:inline-flex;align-items:center;gap:5px}
.talk-acts button:active{transform:translateY(1px)}
.talk-tr{margin-top:6px;font-size:15px;color:var(--muted);padding:8px 12px;border-left:3px solid var(--sky);background:color-mix(in srgb,var(--sky) 10%,transparent);border-radius:0 10px 10px 0;max-width:100%}
.talk-sys{align-self:center;font-size:13px;color:var(--muted);font-weight:700;background:var(--surface-2);padding:4px 12px;border-radius:99px;text-align:center}
.talk-typing{display:inline-flex;gap:5px;padding:4px 2px}
.talk-typing i{width:8px;height:8px;border-radius:50%;background:var(--muted);animation:talkdot 1s infinite ease-in-out}
.talk-typing i:nth-child(2){animation-delay:.15s}.talk-typing i:nth-child(3){animation-delay:.3s}
@keyframes talkdot{0%,60%,100%{transform:none;opacity:.5}30%{transform:translateY(-5px);opacity:1}}
.talk-chip{margin-top:6px;border:2px solid color-mix(in srgb,var(--sun) 70%,var(--line));background:color-mix(in srgb,var(--sun) 22%,var(--surface));color:var(--ink);
  border-radius:99px;min-height:34px;padding:0 12px;font-size:13.5px;font-weight:700;display:inline-flex;align-items:center;gap:6px}
.talk-chip.ok{border-color:transparent;background:var(--ok-bg);color:var(--ok-ink);cursor:default}
.talk-fix{margin-top:6px;background:var(--surface);border:2px solid color-mix(in srgb,var(--sun) 70%,var(--line));border-radius:14px;padding:10px 12px;font-size:15px;line-height:1.45;text-align:left;max-width:100%}
.talk-fix .c{font-size:17px;font-weight:700}
.talk-fix mark{background:color-mix(in srgb,var(--ok) 25%,transparent);color:inherit;border-radius:4px;padding:0 2px;box-shadow:inset 0 -2px 0 var(--ok)}
.talk-fix .n{margin-top:6px;font-size:15px}
.talk-fix .n i{font-style:normal;color:var(--muted);font-size:12.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;display:block}
.talk-fix .x{margin-top:6px;color:var(--muted);font-size:14.5px}
.talk-fix .tool{min-height:34px;padding:2px 9px;font-size:13px;box-shadow:none;margin-top:6px}
.talk-dock{position:sticky;bottom:0;z-index:4;background:var(--bg);padding:8px 0 calc(10px + env(safe-area-inset-bottom));margin-top:auto;
  box-shadow:0 -10px 14px -8px var(--bg)}
.talk-aux{display:flex;gap:8px;margin-bottom:8px}
.talk-aux button{flex:1;min-height:40px;font-size:14px;padding:6px 8px;justify-content:center}
.talk-aux button.on{background:color-mix(in srgb,var(--sun) 30%,var(--surface));border-color:var(--sun-deep)}
.talk-aux .sq{flex:none;padding:6px 10px}
.talk-hints{display:flex;flex-direction:column;gap:6px;margin-bottom:8px}
.talk-hint{display:flex;align-items:stretch;border:2px solid var(--line);border-radius:12px;background:var(--surface);overflow:hidden}
.talk-hint .h{flex:1;border:0;background:none;text-align:left;padding:9px 12px;font-size:16px;font-weight:500;color:var(--ink);min-height:42px}
.talk-hint .s{border:0;border-left:2px solid var(--line);background:var(--surface-2);width:46px;font-size:16px}
.talk-hintlbl{font-size:12.5px;color:var(--muted);font-weight:700}
.talk-in{display:flex;gap:8px;align-items:flex-end}
.talk-in textarea{flex:1;min-height:50px;max-height:140px;resize:none;font:inherit;font-size:17px;line-height:1.35;padding:12px 13px;border-radius:var(--r-m);border:2px solid var(--line);
  background:var(--surface);color:var(--ink);outline:none}
.talk-in textarea:focus{border-color:var(--brand)}
.talk-ib{width:50px;height:50px;flex:none;border-radius:var(--r-m);border:2px solid var(--line);background:var(--surface);display:grid;place-items:center;padding:0;box-shadow:0 3px 0 var(--edge);color:var(--ink)}
.talk-ib svg{width:22px;height:22px}
.talk-ib.send{background:var(--brand);border-color:var(--brand);color:var(--on-brand);box-shadow:0 3px 0 var(--brand-deep)}
.talk-ib:disabled{opacity:.45}
.talk-ib.rec{background:var(--bad);border-color:var(--bad);color:var(--on-bad);box-shadow:0 3px 0 var(--bad-deep);animation:talkpulse 1.1s infinite}
@keyframes talkpulse{50%{box-shadow:0 3px 0 var(--bad-deep),0 0 0 8px color-mix(in srgb,var(--bad) 20%,transparent)}}
.talk-voice{display:flex;align-items:center;gap:14px;background:var(--surface);border:2px solid var(--line);border-radius:var(--r-l);padding:12px 14px;box-shadow:0 4px 0 var(--edge)}
.talk-vbtn{width:72px;height:72px;border-radius:50%;flex:none;border:0;display:grid;place-items:center;background:var(--sun);color:var(--on-sun);box-shadow:0 4px 0 var(--sun-deep);padding:0}
.talk-vbtn svg{width:32px;height:32px}
.talk-vbtn:active{transform:translateY(3px);box-shadow:0 1px 0 var(--sun-deep)}
.talk-vbtn:disabled{opacity:.5}
.talk-voice.listening .talk-vbtn{background:var(--bad);color:var(--on-bad);box-shadow:0 4px 0 var(--bad-deep);animation:talkpulse2 1.1s infinite}
@keyframes talkpulse2{50%{box-shadow:0 4px 0 var(--bad-deep),0 0 0 14px color-mix(in srgb,var(--bad) 18%,transparent)}}
.talk-voice.speaking .talk-vbtn{background:var(--sky-soft);color:var(--ink);box-shadow:0 4px 0 var(--edge)}
.talk-vs{flex:1;min-width:0}
.talk-vs b{display:block;font-family:var(--fd);font-size:14.5px;letter-spacing:-.01em}
.talk-vs .tr{font-size:16px;margin-top:3px;min-height:1.4em;color:var(--ink);overflow-wrap:anywhere}
.talk-vs .tr.mut{color:var(--muted);font-size:14px}
/* feedback */
.talk-score{text-align:center;padding:22px 16px 18px}
.talk-score .big{font-size:68px;margin:6px 0 6px}
.talk-score .meta{position:relative;font-weight:700;font-size:15px;opacity:.95}
.talk-sec{padding:14px 16px}
.talk-sec h3{margin:0 0 8px;font-family:var(--fd);font-size:15px;letter-spacing:-.01em}
.talk-sec ul{margin:0;padding-left:20px;line-height:1.5;font-size:15.5px}
.talk-sec li+li{margin-top:4px}
.talk-err{padding:10px 0;font-size:15px;line-height:1.45}
.talk-err+.talk-err{border-top:2px solid var(--line)}
.talk-err .o{text-decoration:line-through;text-decoration-color:var(--bad);color:var(--bad-ink)}
.talk-err .c{font-weight:700;font-size:16.5px;color:var(--ok-ink);display:flex;gap:8px;align-items:flex-start;justify-content:space-between}
.talk-err .c button{flex:none;border:0;background:var(--surface-2);border-radius:10px;width:38px;height:34px;padding:0;font-size:15px}
.talk-err .x{color:var(--muted);font-size:14.5px}
.talk-voc{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:16px;cursor:pointer}
.talk-voc+.talk-voc{border-top:2px solid var(--line)}
.talk-voc input{width:22px;height:22px;accent-color:var(--brand);flex:none}
.talk-voc .t{color:var(--muted);font-size:14.5px;margin-left:auto;text-align:right}
.talk-next{display:flex;gap:10px;align-items:flex-start}
.talk-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.talk-btns .full{grid-column:1/-1}
`;
  document.head.appendChild(el);
}

/* ---------------- utilidades ---------------- */
const esc = s => F.esc(s);
const normW = w => F.strip(String(w).toLowerCase()).replace(/[^\p{L}\p{N}]/gu, '');
/* destaca as palavras novas/alteradas da frase corrigida (LCS simples por palavra) */
function diffMark(orig, corr){
  const a = String(orig).split(/\s+/).filter(Boolean).map(normW), bRaw = String(corr).split(/\s+/).filter(Boolean), b = bRaw.map(normW);
  const n = a.length, m = b.length; if (!m) return '';
  const dp = Array.from({ length:n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const keep = new Set(); let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { keep.add(j); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return bRaw.map((w, k) => keep.has(k) ? esc(w) : `<mark>${esc(w)}</mark>`).join(' ');
}
const lvIdx = lv => Math.max(0, LV.indexOf(lv));
const fmtDate = ts => { try { return new Date(ts * 1000).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }).replace('.', ''); } catch(e){ return ''; } };
const SEND_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';
const STOP_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/></svg>';
const SPK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';

/* ---------------- módulo ---------------- */
F.register({
  id:'talk', title:'Conversa', icon:'💬', desc:'Converse por voz ou texto', order:30, big:false,
  subtitle(){
    try {
      const h = st().h; const last = h[h.length - 1]; const s = last && byId(last.s);
      if (s) return `Última: ${s.e} ${s.t}${last.n != null ? ` · nota ${last.n}` : ''}`;
    } catch(e){}
    return 'Diálogos por voz com um parceiro nativo';
  },
  open(body, ctx){ css(); openTalk(body, ctx); },
});

function openTalk(body, ctx){
  const arg = ctx.arg || {};
  let alive = true;
  let sess = null;              // conversa em andamento
  let planMarked = false;
  const canVoice = F.canListen();
  ctx.onClose(() => { alive = false; if (sess) endSession(sess, true); });

  const planBtn = () => arg.fromPlan ? `<button class="btn btn-ghost" data-a="plan">Voltar ao plano</button>` : '';
  const markPlan = () => { if (planMarked) return; planMarked = true; try { F.planDone && F.planDone('talk'); } catch(e){} };
  const top = () => window.scrollTo(0, 0);

  /* ======== tela 1: escolher cenário ======== */
  function picker(){
    ctx.setTitle('Conversa');
    const s = st(), my = F.level();
    const card = c => {
      const d = lvIdx(c.lv) - lvIdx(my);
      const cls = d <= 0 ? 'fit' : d >= 2 ? 'hard' : '';
      const wide = c.g === 'livre';
      return `<button class="talk-sc ${wide ? 'wide' : ''}" data-sc="${c.id}"><span class="e">${c.e}</span>${wide ? '<span class="tx">' : ''}<b>${esc(c.t)}</b><small>${esc(c.d)}</small>${wide ? '</span>' : ''}<span class="lv ${cls}">${c.lv}</span></button>`;
    };
    const recent = s.h.slice(-3).reverse().filter(x => byId(x.s));
    body.innerHTML = `
      <div class="card talk-lead"><span class="talk-big">🗣️</span><div><h2>Pratique conversas reais</h2>
        <p>Escolha uma situação. Seu parceiro fala só em ${esc(F.tgtName)}, no seu nível (<b>${esc(my)}</b>), e você tem uma missão para cumprir.</p></div></div>
      ${arg.fromPlan ? `<div class="row">${planBtn().replace('btn btn-ghost', 'tool')}</div>` : ''}
      ${GROUPS.map(([g, name]) => `<div class="talk-gh">${esc(name)}</div><div class="talk-grid">${SC.filter(c => c.g === g).map(card).join('')}</div>`).join('')}
      ${recent.length ? `<div class="talk-gh">Suas últimas conversas</div><div class="card talk-recent">${recent.map(x => { const c = byId(x.s); return `<div class="it"><span>${c.e}</span><span>${esc(c.t)} <span class="muted small">· ${fmtDate(x.d)} · ${x.t} fala${x.t === 1 ? '' : 's'}</span></span><span class="sc">${x.n != null ? x.n : '—'}</span></div>`; }).join('')}</div>` : ''}`;
    body.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => brief(byId(b.dataset.sc)));
    bindPlan();
    top();
  }
  function bindPlan(){ body.querySelectorAll('[data-a=plan]').forEach(b => b.onclick = () => ctx.open ? ctx.open('plan') : ctx.close()); }

  /* ======== tela 2: briefing + opções ======== */
  function brief(sc){
    ctx.setTitle(sc.t);
    const s = st(), o = s.o, my = F.level();
    if (!canVoice) o.mode = 'text';
    const d = lvIdx(sc.lv) - lvIdx(my);
    const lvNote = d >= 2 ? `Sugerido a partir de ${sc.lv}: vai ser um desafio — use 💡 Ajuda e "Não entendi" sem medo.` : d === 1 ? `Sugerido: ${sc.lv}. Um pouco acima do seu nível, ótimo para crescer.` : `Sugerido: ${sc.lv}. Combina com o seu nível.`;
    const chips = (name, opts, val) => `<div class="chips" data-o="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(val) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const firstNoVoice = !canVoice && !s.noVoiceTold;
    body.innerHTML = `
      <div class="card talk-brief">
        <div class="top"><span class="e">${sc.e}</span><div><h2>${esc(sc.t)}</h2><div class="muted small">${esc(sc.d)}</div></div></div>
        <div class="talk-mis"><span>🎯</span><span><span class="k">Sua missão</span>${esc(sc.m)}</span></div>
        <div class="small muted" style="margin-top:10px">${esc(lvNote)}</div>
      </div>
      <div class="card talk-opts">
        <div class="f"><span class="lbl">Como você quer praticar?</span>
          ${canVoice ? `<div class="talk-seg2" data-o="mode">
            <button data-v="voice" class="${o.mode === 'voice' ? 'on' : ''}">🎙️ Modo voz<small>mãos livres</small></button>
            <button data-v="text" class="${o.mode === 'text' ? 'on' : ''}">⌨️ Texto<small>digitar (com microfone)</small></button></div>
            <div class="help">${o.mode === 'voice' ? 'O parceiro fala e o microfone abre sozinho. Toque no botão para enviar o que você disse.' : 'Você digita (ou toca no microfone para ditar) e envia.'}</div>`
          : `<div class="note" style="margin:0">${firstNoVoice ? '🎙️ Este navegador não reconhece voz, então o modo voz fica escondido. Você ainda ouve o parceiro e responde digitando. Para falar, use o Chrome (Android/computador) ou o Safari no iPhone.' : '⌨️ Modo texto (este navegador não reconhece voz).'}</div>`}
        </div>
        <div class="f"><span class="lbl">Texto do parceiro</span>${chips('show', [['true', '👀 Mostrar'], ['false', '🎧 Só ouvir']], o.show)}
          <div class="help">"Só ouvir" esconde o texto para treinar o ouvido; toque em "Ver texto" quando precisar.</div></div>
        <div class="f"><span class="lbl">Voz do parceiro</span>${chips('slow', [['false', 'Normal'], ['true', '🐢 Devagar']], o.slow)}
          ${o.mode === 'text' || !canVoice ? `<div style="margin-top:8px">${chips('auto', [['true', '🔊 Fala sozinho'], ['false', 'Só quando eu tocar']], o.auto)}</div>` : ''}</div>
        <div class="f"><span class="lbl">Correções</span>${chips('corr', [['live', 'Durante a conversa'], ['end', 'Só no final']], o.corr)}</div>
        <div class="f"><span class="lbl">Seu nível</span>${chips('lv', LV.map(l => [l, l]), my)}
          <div class="help">O parceiro ajusta vocabulário e velocidade a este nível.</div></div>
      </div>
      <button class="btn btn-primary talk-start" id="talkGo">Começar conversa</button>
      <button class="btn btn-ghost" id="talkBack">Outro cenário</button>`;
    if (firstNoVoice) { s.noVoiceTold = true; saveStore(); }
    body.querySelectorAll('[data-o]').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => {
      const k = g.dataset.o, v = b.dataset.v;
      if (k === 'lv') F.setLevel(v);
      else o[k] = v === 'true' ? true : v === 'false' ? false : v;
      saveStore(); brief(sc);
    }));
    body.querySelector('#talkGo').onclick = () => startChat(sc);
    body.querySelector('#talkBack').onclick = picker;
    top();
  }

  /* ======== tela 3: conversa ======== */
  function startChat(sc){
    const o = st().o;
    const s = sess = {
      sc, alive:true, hist:[], turns:0, mission:false, corrections:[], lastHints:[], busy:false,
      voice: canVoice && o.mode === 'voice', show:o.show, rate:o.slow ? 0.75 : 1, corr:o.corr, lv:F.level(),
      speakTok:0, listenTok:0, phase:'idle', ended:false, started:F.nowS(), pts:0,
    };
    ctx.setTitle(sc.t);
    body.innerHTML = `<div class="talk-chat">
      <div class="talk-mbar" id="tMis"><span class="ic">🎯</span><span class="tx"><b>Missão</b>${esc(sc.m)}</span><button class="tool" id="tEnd">Encerrar</button></div>
      <div class="talk-log" id="tLog" aria-live="polite"></div>
      <div class="talk-dock" id="tDock"></div></div>`;
    const $ = sel => body.querySelector(sel);
    const log = $('#tLog'), dock = $('#tDock');
    F.bindLookup(log, w => w.closest('.talk-bub')?.textContent || w.textContent);
    $('#tEnd').onclick = () => finish(s);
    s.$ = $; s.log = log; s.dock = dock;
    renderDock(s);
    top();
    ask(s, null);
  }

  const sysPrompt = s => {
    const sc = s.sc, lv = s.lv;
    return `You are a conversation partner in a ${F.tgtNameEn} speaking-practice app. Role-play naturally.
ROLE: ${sc.role}. SETTING: ${sc.set}.
The learner is a ${F.srcNameEn} speaker at CEFR level ${lv}. Their MISSION (don't reveal it, don't do it for them): ${sc.goal}.
RULES for "reply":
- Stay in character as a real person. Write ONLY in ${F.tgtNameEn}, even if the learner uses another language.
- 1 to 3 short sentences, adapted to ${lv}: ${LV_GUIDE[lv] || LV_GUIDE.A2}.
- Keep the conversation going: usually end with a question or something the learner must react to. Gently steer toward the mission; invent realistic details (prices, times, names) when useful.
- No corrections, translations or teacher talk inside "reply". No emojis, no stage directions.
- Messages like "[APP: …]" are instructions from the app, not the learner.
- Learner text may come from speech recognition: ignore missing punctuation, capitals and accents.
Return ONLY JSON:
{"reply":"…","correction":{"has_error":false,"corrected":"","natural":"","explanation":""},"mission_done":false,"hints":["…","…"]}
- correction: about the learner's LAST message only (has_error false for [APP] messages). has_error=true only for real grammar, vocabulary, agreement, word-order errors or words in another language (then give the ${F.tgtNameEn} version). "corrected": the learner's message minimally corrected. "natural": how a native speaker would naturally say it (may equal corrected). "explanation": ONE short, friendly sentence in ${F.explainLang} saying what was wrong and why. If has_error is false, use "" for the three fields.
- mission_done: true once the learner has done the whole mission in this conversation.
- hints: 2-3 short, varied things the learner could say next (first person, ${F.tgtNameEn}, level ${lv}).`;
  };

  function messages(s){
    const start = { role:'user', text:'[APP: Start the conversation now with your first line, in character.]' };
    let h = s.hist.slice(-MAX_HIST);
    while (h.length && h[0].role !== 'model') h = h.slice(1);
    // a última mensagem precisa ser do usuário
    return [start, ...h];
  }

  /* envia o histórico e trata a resposta. userText: null (abertura) ou {text, meta} */
  async function ask(s, user){
    if (!s.alive) return;
    s.busy = true; setPhase(s, 'thinking'); cancelListen(s); cancelSpeak(s);
    let meBubble = null;
    if (user) {
      s.hist.push({ role:'user', text:user.meta ? user.meta : user.text });
      if (user.meta) addSys(s, user.label);
      else meBubble = addMe(s, user.text);
    }
    const typing = addTyping(s);
    let r;
    try {
      r = await F.ai(messages(s), { system:sysPrompt(s), json:true, temperature:0.8, maxTokens:700 });
    } catch(err) {
      typing.remove(); if (!s.alive) return;
      s.hist.pop && user && s.hist.pop();
      const box = document.createElement('div'); const rid = 'tRetry' + Date.now();
      box.innerHTML = F.errorBox(err, rid); box.firstElementChild.style.padding = '12px 14px';
      s.log.appendChild(box); scrollDown();
      s.busy = false; setPhase(s, 'idle');
      box.querySelector('#' + rid).onclick = () => { box.remove(); if (meBubble) meBubble.remove(); ask(s, user); };
      return;
    }
    typing.remove(); if (!s.alive) return;
    if (typeof r === 'string') r = { reply:r };
    const reply = String(r.reply || r.response || '').trim() || '…';
    s.hist.push({ role:'model', text:reply });
    s.lastHints = (Array.isArray(r.hints) ? r.hints : []).map(String).filter(Boolean).slice(0, 3);
    s.busy = false;
    if (user && !user.meta) {
      s.turns++; F.addPoints(3); s.pts += 3;
      const c = r.correction || {};
      if (c.has_error && c.corrected && normW(c.corrected) !== normW(user.text)) {
        const item = { original:user.text, corrected:String(c.corrected), natural:String(c.natural || ''), explanation:String(c.explanation || '') };
        s.corrections.push(item);
        if (s.corr === 'live') addCorrection(s, meBubble, item);
      } else if (s.corr === 'live' && meBubble) {
        const ok = document.createElement('span'); ok.className = 'talk-chip ok'; ok.textContent = '✓ Certo'; meBubble.appendChild(ok);
      }
      if (s.turns >= 6) markPlan();
    }
    if (r.mission_done && !s.mission && s.turns > 0) {
      s.mission = true; F.addPoints(10); s.pts += 10;
      const mb = s.$('#tMis'); mb.classList.add('done'); mb.querySelector('.ic').textContent = '🏆';
      mb.querySelector('.tx b').textContent = 'Missão cumprida! +10';
      addSys(s, '🏆 Missão cumprida! Continue conversando ou toque em Encerrar.');
    }
    addBot(s, reply);
    renderDock(s);
    const auto = s.voice || !s.show || st().o.auto !== false;
    if (auto) botSpeak(s, reply, s.voice);
    else setPhase(s, 'idle');
  }

  /* ---- bolhas ---- */
  function scrollDown(){ requestAnimationFrame(() => window.scrollTo({ top:document.documentElement.scrollHeight, behavior:'smooth' })); }
  function addTyping(s){
    const d = document.createElement('div'); d.className = 'talk-msg bot';
    d.innerHTML = `<div class="talk-bub" aria-label="digitando"><span class="talk-typing"><i></i><i></i><i></i></span></div>`;
    s.log.appendChild(d); scrollDown(); return d;
  }
  function addSys(s, text){ const d = document.createElement('div'); d.className = 'talk-sys'; d.textContent = text; s.log.appendChild(d); scrollDown(); }
  function addMe(s, text){
    const d = document.createElement('div'); d.className = 'talk-msg me';
    d.innerHTML = `<div class="talk-bub">${esc(text)}</div>`; s.log.appendChild(d); scrollDown(); return d;
  }
  function addBot(s, text){
    const d = document.createElement('div'); d.className = 'talk-msg bot';
    const shown = s.show;
    d.innerHTML = `<div class="talk-bub">${shown ? `<span class="talk-txt">${F.clickable(text)}</span>` : `<button class="talk-hid" data-b="reveal"><span class="talk-wave"><i></i><i></i><i></i><i></i><i></i></span>Ouça e responda</button>`}</div>
      <div class="talk-acts"><button data-b="say" aria-label="Ouvir de novo">🔊 Ouvir</button>${shown ? '' : '<button data-b="reveal">👀 Ver texto</button>'}<button data-b="tr">🌐 Traduzir</button></div>
      <div class="talk-tr hidden"></div>`;
    s.log.appendChild(d);
    d.querySelectorAll('[data-b]').forEach(b => b.onclick = async ev => {
      ev.stopPropagation();
      const k = b.dataset.b;
      if (k === 'say') botSpeak(s, text, s.voice && s.phase !== 'thinking' && !s.busy);
      else if (k === 'reveal') { d.querySelector('.talk-bub').innerHTML = `<span class="talk-txt">${F.clickable(text)}</span>`; d.querySelectorAll('[data-b=reveal]').forEach(x => x.remove()); }
      else if (k === 'tr') {
        const box = d.querySelector('.talk-tr');
        if (!box.classList.contains('hidden') && box.dataset.done) { box.classList.add('hidden'); return; }
        box.classList.remove('hidden'); box.textContent = 'Traduzindo…';
        try { box.textContent = await translate(text); box.dataset.done = '1'; }
        catch(err) { box.textContent = err.friendly || 'Sem tradução agora.'; }
      }
    });
    scrollDown(); return d;
  }
  function addCorrection(s, meEl, item){
    if (!meEl) return;
    const chip = document.createElement('button'); chip.className = 'talk-chip'; chip.textContent = '✏️ Ver correção';
    const box = document.createElement('div'); box.className = 'talk-fix hidden';
    const nat = item.natural && normW(item.natural) !== normW(item.corrected);
    box.innerHTML = `<div class="c">${diffMark(item.original, item.corrected)}</div>
      ${nat ? `<div class="n"><i>Mais natural</i>${esc(item.natural)}</div>` : ''}
      ${item.explanation ? `<div class="x">${esc(item.explanation)}</div>` : ''}
      <button class="tool" data-b="say">🔊 Ouvir a versão certa</button>`;
    chip.onclick = () => { const h = box.classList.toggle('hidden'); chip.textContent = h ? '✏️ Ver correção' : '✏️ Fechar'; };
    box.querySelector('[data-b=say]').onclick = () => botSpeak(s, nat ? item.natural : item.corrected, false);
    meEl.appendChild(chip); meEl.appendChild(box);
  }

  /* ---- voz: nunca sobrepor TTS e microfone ---- */
  function cancelSpeak(s){ s.speakTok++; F.stopSpeech(); }
  function cancelListen(s){ if (s.phase === 'listening' || s.listening) { s.listenTok++; s.listening = false; F.stopListen(); } }
  async function botSpeak(s, text, thenListen){
    if (!s.alive) return;
    cancelListen(s); cancelSpeak(s);
    const tok = ++s.speakTok;
    setPhase(s, 'speaking');
    await F.say(text, { rate:s.rate });
    if (!s.alive || tok !== s.speakTok) return;
    setPhase(s, 'idle');
    if (thenListen && s.voice && !s.busy) startListen(s);
  }
  function startListen(s){
    if (!s.alive || s.busy || !canVoice) return;
    cancelSpeak(s);
    if (s.listening) { s.listenTok++; F.stopListen(); }
    const tok = ++s.listenTok; s.listening = true; s.heard = '';
    setPhase(s, 'listening');
    F.listen({ onInterim: t => { if (tok !== s.listenTok || !s.alive) return; s.heard = t; showHeard(s, t); } })
      .then(t => {
        if (tok !== s.listenTok || !s.alive) return;
        s.listening = false; t = (t || '').trim();
        if (t) send(s, t);
        else { setPhase(s, 'idle', 'silence'); }
      })
      .catch(e => {
        if (tok !== s.listenTok || !s.alive) return;
        s.listening = false;
        const msg = /not-allowed|service-not-allowed/.test(e.message) ? 'Permita o uso do microfone para falar.' : /network/.test(e.message) ? 'O reconhecimento de voz precisa de internet.' : 'Não consegui ouvir agora. Tente de novo ou digite.';
        F.toast(msg); setPhase(s, 'idle', 'silence');
      });
  }
  /* toque no microfone: fala → interrompe; ouvindo → envia; parado → ouvir */
  function micTap(s){
    if (s.busy) return;
    if (s.phase === 'listening') { F.stopListen(); return; }   // termina e envia o que ouviu
    startListen(s);
  }
  function showHeard(s, t){
    const tr = s.dock.querySelector('.talk-vs .tr');
    if (tr) { tr.textContent = t || 'Pode falar…'; tr.classList.toggle('mut', !t); }
    const ta = s.dock.querySelector('textarea');
    if (ta && !s.voice) { ta.value = t; autoGrow(ta); }
  }
  function setPhase(s, ph, why){
    s.phase = ph; s.why = why || '';
    const d = s.dock; if (!d) return;
    const v = d.querySelector('.talk-voice');
    if (v) {
      v.className = 'talk-voice ' + ph;
      const b = v.querySelector('.talk-vbtn'), lb = v.querySelector('.talk-vs b'), tr = v.querySelector('.talk-vs .tr');
      b.disabled = ph === 'thinking';
      b.innerHTML = ph === 'listening' ? STOP_SVG : ph === 'speaking' ? SPK_SVG : F.micSVG;
      b.setAttribute('aria-label', ph === 'listening' ? 'Enviar' : 'Falar');
      lb.textContent = ph === 'listening' ? 'Ouvindo… toque para enviar' : ph === 'speaking' ? 'Parceiro falando… toque para responder já'
        : ph === 'thinking' ? 'Pensando…' : why === 'silence' ? 'Não ouvi nada. Toque para falar' : 'Toque para falar';
      if (ph !== 'listening') { tr.textContent = ph === 'idle' && why === 'silence' ? 'Fale perto do microfone, sem pressa.' : ''; tr.classList.add('mut'); }
      else { tr.textContent = s.heard || 'Pode falar…'; tr.classList.toggle('mut', !s.heard); }
    }
    const mic = d.querySelector('[data-k=mic]');
    if (mic) { mic.classList.toggle('rec', ph === 'listening'); mic.innerHTML = ph === 'listening' ? STOP_SVG : F.micSVG; mic.disabled = ph === 'thinking'; }
    const send = d.querySelector('[data-k=send]'); if (send) send.disabled = ph === 'thinking';
    d.querySelectorAll('.talk-aux button').forEach(b => { if (b.dataset.k !== 'mode') b.disabled = ph === 'thinking'; });
  }
  function autoGrow(ta){ ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight + 4) + 'px'; }

  /* ---- barra inferior ---- */
  function renderDock(s){
    const d = s.dock; const hintsOpen = !!s.hintsOpen && s.lastHints.length;
    d.innerHTML = `
      ${hintsOpen ? `<div class="talk-hints"><span class="talk-hintlbl">${s.voice ? 'Toque para ouvir e depois repita:' : 'Toque para usar (ou 🔊 para ouvir):'}</span>${s.lastHints.map((h, i) => `<div class="talk-hint"><button class="h" data-h="${i}">${esc(h)}</button><button class="s" data-hs="${i}" aria-label="Ouvir">🔊</button></div>`).join('')}</div>` : ''}
      <div class="talk-aux">
        <button class="tool ${hintsOpen ? 'on' : ''}" data-k="help">💡 Ajuda</button>
        <button class="tool" data-k="again">🤔 Não entendi</button>
        ${canVoice ? `<button class="tool sq" data-k="mode" aria-label="${s.voice ? 'Mudar para texto' : 'Mudar para voz'}" title="${s.voice ? 'Digitar' : 'Modo voz'}">${s.voice ? '⌨️ Texto' : '🎙️ Voz'}</button>` : ''}
      </div>
      ${s.voice
        ? `<div class="talk-voice idle"><button class="talk-vbtn" aria-label="Falar">${F.micSVG}</button><div class="talk-vs"><b>Toque para falar</b><div class="tr mut"></div></div></div>`
        : `<div class="talk-in"><textarea rows="1" placeholder="Escreva em ${esc(F.tgtName)}…" enterkeyhint="send" autocapitalize="sentences" lang="${esc(F.tgt)}"></textarea>
            ${canVoice ? `<button class="talk-ib" data-k="mic" aria-label="Falar">${F.micSVG}</button>` : ''}
            <button class="talk-ib send" data-k="send" aria-label="Enviar">${SEND_SVG}</button></div>`}`;
    const q = sel => d.querySelector(sel);
    q('[data-k=help]').onclick = () => {
      if (!s.lastHints.length) { F.toast('Sem sugestões agora — tente "Não entendi".'); return; }
      s.hintsOpen = !s.hintsOpen; renderDock(s);
    };
    q('[data-k=again]').onclick = () => {
      if (s.busy || !s.hist.length) return;
      s.hintsOpen = false;
      ask(s, { meta:`[APP: The learner did not understand your last message. Say the same thing again much more simply: shorter sentences, easier words. Only ${F.tgtNameEn}.]`, label:'🤔 Você pediu para simplificar' });
    };
    const mode = q('[data-k=mode]');
    if (mode) mode.onclick = () => { cancelListen(s); s.voice = !s.voice; st().o.mode = s.voice ? 'voice' : 'text'; saveStore(); renderDock(s); if (s.voice && !s.busy) startListen(s); };
    d.querySelectorAll('[data-h]').forEach(b => b.onclick = () => {
      const h = s.lastHints[+b.dataset.h];
      if (s.voice) { botSpeak(s, h, true); return; }
      const ta = q('textarea'); ta.value = h; autoGrow(ta); ta.focus();
    });
    d.querySelectorAll('[data-hs]').forEach(b => b.onclick = () => botSpeak(s, s.lastHints[+b.dataset.hs], s.voice));
    if (s.voice) {
      q('.talk-vbtn').onclick = () => micTap(s);
    } else {
      const ta = q('textarea');
      ta.oninput = () => autoGrow(ta);
      ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); } };
      const submit = () => { const t = ta.value.trim(); if (!t || s.busy) return; if (s.phase === 'listening') cancelListen(s); ta.value = ''; autoGrow(ta); send(s, t); };
      q('[data-k=send]').onclick = submit;
      const mic = q('[data-k=mic]'); if (mic) mic.onclick = () => micTap(s);
    }
    setPhase(s, s.phase, s.why);
  }
  function send(s, text){
    s.hintsOpen = false; s.heard = '';
    const ta = s.dock.querySelector('textarea'); if (ta) { ta.value = ''; autoGrow(ta); }
    ask(s, { text });
  }

  /* ---- fim da sessão ---- */
  function endSession(s, silent){
    if (s.ended) return; s.ended = true; s.alive = false;
    s.speakTok++; s.listenTok++; F.stopSpeech(); F.stopListen();
    if (silent && s.turns > 0) record(s, null);
  }
  function record(s, nota){
    const st0 = st();
    st0.h.push({ s:s.sc.id, d:F.nowS(), n:nota, t:s.turns, m:s.mission ? 1 : 0 });
    st0.h = st0.h.slice(-10); saveStore();
  }

  async function finish(s){
    endSession(s, false);
    sess = null;
    if (s.turns === 0) { brief(s.sc); return; }
    markPlan();
    body.innerHTML = F.loading('Avaliando sua conversa…'); top();
    const transcript = s.hist.filter(m => !/^\[APP:/.test(m.text)).map(m => (m.role === 'model' ? 'PARTNER: ' : 'LEARNER: ') + m.text).join('\n');
    const prompt = `You are an encouraging, specific ${F.tgtNameEn} conversation teacher. Evaluate the LEARNER (CEFR ${s.lv}, native ${F.srcNameEn}) in this role-play.
Scenario: ${s.sc.set}; partner: ${s.sc.role}. Mission: ${s.sc.goal}. Mission completed: ${s.mission ? 'yes' : 'not detected'}.
Transcript:
${transcript.slice(-6000)}

Return ONLY JSON:
{"nota":0-100,"pontos_fortes":["…"],"melhorar":["…"],"erros":[{"original":"…","corrigido":"…","explicacao":"…"}],"vocabulario":[{"palavra":"…","traducao":"…"}],"proximo_passo":"…"}
- nota: fair for level ${s.lv} (communication, accuracy, range, mission). Be motivating but honest.
- pontos_fortes: 2-3 concrete things done well; melhorar: 2-3 concrete tips. Both in ${F.explainLang}, short.
- erros: up to 5 most important learner mistakes (original exactly as written, corrected ${F.tgtNameEn}, explanation in ${F.explainLang}).
- vocabulario: 4-8 useful ${F.tgtNameEn} words/expressions from this situation the learner should learn (palavra in ${F.tgtNameEn}, traducao in ${F.srcName}).
- proximo_passo: one sentence in ${F.explainLang} suggesting what to practise next.`;
    let fb;
    try { fb = await F.ai(prompt, { json:true, temperature:0.2, maxTokens:1500 }); }
    catch(err) {
      if (!alive) return;
      body.innerHTML = F.errorBox(err, 'talkFbRetry') + `<button class="btn btn-ghost" id="talkSkip">Pular avaliação</button>`;
      body.querySelector('#talkFbRetry').onclick = () => { s.ended = false; finish(s); };
      body.querySelector('#talkSkip').onclick = () => { record(s, null); feedback(s, null); };
      return;
    }
    if (!alive) return;
    const n = Math.max(0, Math.min(100, Math.round(+fb.nota || 0)));
    record(s, n);
    feedback(s, fb);
  }

  function feedback(s, fb){
    ctx.setTitle('Resultado');
    const arr = x => Array.isArray(x) ? x : [];
    const n = fb ? Math.max(0, Math.min(100, Math.round(+fb.nota || 0))) : null;
    const msg = n == null ? 'Conversa concluída' : n >= 85 ? 'Excelente conversa!' : n >= 70 ? 'Muito bem!' : n >= 50 ? 'Bom trabalho — continue!' : 'Cada conversa conta!';
    // correções frase a frase + erros da avaliação (sem repetir)
    const seen = new Set(s.corrections.map(c => normW(c.original)));
    const errs = [...s.corrections.map(c => ({ o:c.original, c:c.corrected, n:c.natural, x:c.explanation })),
      ...arr(fb?.erros).filter(e => e && e.original && !seen.has(normW(e.original))).map(e => ({ o:e.original, c:e.corrigido, x:e.explicacao }))].slice(0, 8);
    const voc = arr(fb?.vocabulario).filter(v => v && v.palavra).slice(0, 8);
    const list = items => `<ul>${items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
    body.innerHTML = `
      <div class="sumcard talk-score"><div class="kick">${esc(s.sc.e + ' ' + s.sc.t)}</div>
        <div class="big">${n == null ? '✓' : n}</div>
        <div class="meta">${esc(msg)}</div>
        <div class="meta" style="font-weight:500;margin-top:4px">${s.turns} fala${s.turns === 1 ? '' : 's'} · ${s.mission ? '🏆 missão cumprida' : 'missão não concluída'} · +${s.pts} pontos</div></div>
      ${fb && arr(fb.pontos_fortes).length ? `<div class="card talk-sec"><h3>💪 Pontos fortes</h3>${list(arr(fb.pontos_fortes))}</div>` : ''}
      ${fb && arr(fb.melhorar).length ? `<div class="card talk-sec"><h3>🎯 Para melhorar</h3>${list(arr(fb.melhorar))}</div>` : ''}
      ${errs.length ? `<div class="card talk-sec"><h3>✏️ Correções</h3>${errs.map((e, i) => `<div class="talk-err"><div class="o">${esc(e.o)}</div>
          <div class="c"><span>${esc(e.c)}</span><button data-say="${i}" aria-label="Ouvir">🔊</button></div>
          ${e.n && normW(e.n) !== normW(e.c) ? `<div class="small">Mais natural: <b>${esc(e.n)}</b></div>` : ''}${e.x ? `<div class="x">${esc(e.x)}</div>` : ''}</div>`).join('')}</div>`
        : fb ? `<div class="card talk-sec"><h3>✏️ Correções</h3><div class="muted">Nenhum erro importante. 👏</div></div>` : ''}
      ${voc.length ? `<div class="card talk-sec"><h3>📚 Vocabulário da situação</h3>
          ${voc.map((v, i) => `<label class="talk-voc"><input type="checkbox" data-v="${i}" ${F.vocab.has(v.palavra) ? 'disabled' : 'checked'}><span>${esc(v.palavra)}</span><span class="t">${esc(v.traducao || '')}${F.vocab.has(v.palavra) ? ' · já salva' : ''}</span></label>`).join('')}
          <button class="btn btn-secondary" id="talkSaveV" style="width:100%;margin-top:10px">Salvar em Minhas palavras</button></div>` : ''}
      ${fb && fb.proximo_passo ? `<div class="note talk-next"><span>➡️</span><span>${esc(fb.proximo_passo)}</span></div>` : ''}
      <div class="talk-btns">
        <button class="btn btn-primary" id="talkAgain">Praticar de novo</button>
        <button class="btn btn-ghost" id="talkOther">Outro cenário</button>
        ${arg.fromPlan ? `<button class="btn btn-secondary full" data-a="plan">Voltar ao plano</button>` : ''}
      </div>`;
    body.querySelectorAll('[data-say]').forEach(b => b.onclick = () => F.say(errs[+b.dataset.say].c, { rate:s.rate }));
    const sv = body.querySelector('#talkSaveV');
    if (sv) sv.onclick = () => {
      const pick = [...body.querySelectorAll('.talk-voc input:checked:not(:disabled)')].map(i => voc[+i.dataset.v]);
      if (!pick.length) { F.toast('Marque as palavras que quer salvar.'); return; }
      pick.forEach(v => F.vocab.add(v.palavra, v.traducao || '', `${s.sc.e} ${s.sc.t}`));
      F.toast(pick.length === 1 ? '1 palavra salva em Minhas palavras' : `${pick.length} palavras salvas em Minhas palavras`);
      body.querySelectorAll('.talk-voc input:checked').forEach(i => { i.checked = true; i.disabled = true; });
      sv.disabled = true; sv.textContent = 'Salvas ✓';
    };
    body.querySelector('#talkAgain').onclick = () => startChat(s.sc);
    body.querySelector('#talkOther').onclick = picker;
    bindPlan();
    top();
  }

  /* ---- entrada ---- */
  const first = arg.scenario && byId(arg.scenario);
  if (first) startChat(first); else picker();
}
})();
