/* Frasier — módulo Diário (journal): produção livre diária, escrita ou falada, com correção de professor pela IA.
   Contrato: ext/CONTRACT.md. */
(function(){
"use strict";
if (!window.F) return;
const ID = 'journal';
/* banco de perguntas (pt-BR); a versão no idioma estudado é gerada pela IA uma vez e guardada */
const BANK = {
A1: {
  'como foi seu dia': ['Como foi o seu dia hoje? O que você fez?', 'O que você comeu hoje?', 'Onde você estava hoje às dez da manhã?', 'Você está cansado ou com energia hoje? Por quê?', 'Qual foi a melhor parte do seu dia?'],
  'rotina': ['A que horas você acorda? O que você faz de manhã?', 'Como você vai para o trabalho ou para a escola?', 'O que você faz depois do almoço?', 'O que você faz à noite, antes de dormir?', 'O que você faz aos domingos?'],
  'comida': ['Qual é a sua comida favorita?', 'O que você toma no café da manhã?', 'Você gosta de cozinhar? O que você cozinha?', 'Que frutas você gosta de comer?', 'Você prefere café ou chá? Por quê?'],
  'família': ['Fale da sua família. Quantas pessoas são?', 'Como se chamam seus pais? Onde eles moram?', 'Você tem irmãos? Como eles são?', 'Você tem um animal de estimação? Como ele é?', 'Quem é a pessoa mais velha da sua família?'],
  'casa': ['Como é a sua casa ou o seu apartamento?', 'Qual é o seu cômodo favorito da casa?', 'O que tem no seu quarto?', 'Você mora sozinho ou com outras pessoas?', 'Como é a sua rua?'],
  'cidade': ['Em que cidade você mora? Como ela é?', 'Do que você gosta na sua cidade?', 'Tem um parque perto da sua casa? Como ele é?', 'Qual é o seu restaurante ou café favorito na cidade?', 'Como está o tempo hoje na sua cidade?'],
  'descrever pessoa': ['Descreva o seu melhor amigo ou a sua melhor amiga.', 'Como você é? Descreva a sua aparência.', 'Quem é o seu professor favorito? Como ele ou ela é?', 'Descreva uma pessoa famosa que você admira.', 'Como é o seu vizinho ou a sua vizinha?'],
  'gostos': ['O que você gosta de fazer no tempo livre?', 'Que tipo de música você escuta?', 'Você pratica algum esporte? Qual?', 'Qual é o seu filme ou série favorito?', 'Que cor você prefere? Por quê?'],
  'fim de semana': ['O que você fez no último fim de semana?', 'O que você vai fazer no próximo sábado?', 'Com quem você passa o fim de semana?', 'Você prefere ficar em casa ou sair no fim de semana?', 'Qual é o seu domingo ideal?'],
  'trabalho/estudo': ['Você trabalha ou estuda? O que você faz?', 'Por que você estuda este idioma?', 'Como é a sua escola, universidade ou trabalho?', 'Quantas horas por dia você estuda ou trabalha?', 'Qual é a sua matéria ou tarefa favorita?'],
  'roupas e clima': ['O que você está vestindo hoje?', 'Qual é a sua estação do ano favorita? Por quê?', 'O que você usa quando faz frio?', 'Você gosta de chuva? O que você faz quando chove?', 'Como é o clima no seu país?'],
  'planos': ['O que você vai fazer amanhã?', 'O que você quer comprar este mês?', 'Aonde você quer ir nas próximas férias?', 'O que você vai comer hoje à noite?', 'Que idioma você quer aprender depois deste?'],
},
A2: {
  'como foi seu dia': ['Conte como foi o seu dia: o que você fez de manhã, à tarde e à noite?', 'Aconteceu alguma coisa engraçada ou diferente hoje? Conte.', 'Com quem você conversou hoje? Sobre o quê?', 'O que você fez hoje que não faz todos os dias?', 'Hoje foi um dia bom ou ruim? Explique por quê.'],
  'rotina': ['Descreva um dia normal da sua semana, do começo ao fim.', 'O que mudou na sua rotina nos últimos meses?', 'Que hábito saudável você tem? E um hábito que quer mudar?', 'Como você organiza as tarefas da casa?', 'Como é a sua rotina de estudos de idiomas?'],
  'comida': ['Explique como preparar um prato simples que você sabe fazer.', 'Qual foi a última vez que você comeu num restaurante? Como foi?', 'Que comida típica do seu país você recomendaria a um estrangeiro?', 'O que você comia quando era criança e não come mais?', 'Descreva o seu almoço ideal.'],
  'família': ['Conte uma tradição da sua família.', 'Com quem da sua família você mais se parece? Em quê?', 'O que você costuma fazer com a sua família?', 'Descreva uma festa de família de que você se lembra.', 'Como era a casa dos seus avós?'],
  'planos': ['Quais são os seus planos para as próximas férias?', 'O que você vai fazer neste fim de semana? Com quem?', 'Que curso ou atividade você quer começar este ano?', 'Como você imagina a sua vida daqui a cinco anos?', 'Que lugar da sua cidade você ainda quer conhecer?'],
  'lembranças': ['Como era a sua escola quando você era criança?', 'Qual era o seu brinquedo ou jogo favorito na infância?', 'Conte sobre o seu primeiro dia de aula ou de trabalho.', 'Qual foi o melhor presente que você já recebeu?', 'Como você passava as férias quando era criança?'],
  'viagens': ['Conte sobre uma viagem que você fez. Aonde foi e o que fez?', 'Você prefere praia ou montanha? Por quê?', 'O que você sempre leva na mala quando viaja?', 'Descreva um hotel ou uma casa onde você já se hospedou.', 'Qual cidade você gostaria de visitar e por quê?'],
  'trabalho/estudo': ['Descreva o que você faz no seu trabalho ou nos seus estudos.', 'Como são os seus colegas de trabalho ou de turma?', 'O que você aprendeu esta semana?', 'Qual é a parte mais difícil do seu trabalho ou estudo?', 'Que profissão você queria ter quando era criança?'],
  'descrever lugar': ['Descreva o bairro onde você mora.', 'Descreva o seu lugar favorito para relaxar.', 'Como é um mercado ou uma feira na sua cidade?', 'Descreva a vista da sua janela.', 'Descreva uma praça ou um parque que você conhece bem.'],
  'descrever pessoa': ['Descreva uma pessoa importante na sua vida e explique por quê.', 'Como era você quando tinha dez anos?', 'Descreva um amigo que mora longe. Como vocês se conheceram?', 'Descreva uma pessoa que você conheceu recentemente.', 'Qual é a pessoa mais engraçada que você conhece? Por quê?'],
  'contar uma história': ['Conte sobre um dia em que tudo deu errado.', 'Conte sobre a última vez que você se perdeu.', 'Conte sobre uma surpresa que você fez ou recebeu.', 'Conte o que aconteceu no último aniversário que você comemorou.', 'Conte sobre um filme que você viu recentemente.'],
  'compras e saúde': ['Conte sobre a última coisa que você comprou. Por que comprou?', 'Você prefere comprar pela internet ou em lojas? Por quê?', 'O que você faz para cuidar da saúde?', 'Conte sobre a última vez que você ficou doente.', 'Como você relaxa quando está estressado?'],
},
B1: {
  'como foi seu dia': ['Conte o seu dia e diga o que você faria diferente se pudesse repeti-lo.', 'Qual foi o momento mais marcante desta semana? Por que foi importante?', 'Descreva uma conversa interessante que você teve recentemente.', 'Algo hoje mudou a sua forma de pensar? Conte.', 'O que você aprendeu esta semana fora dos estudos?'],
  'lembranças': ['Conte sobre uma experiência que mudou a sua forma de ver o mundo.', 'Qual é a sua lembrança mais antiga? O que você sentiu?', 'Conte sobre uma pessoa que você admirava na adolescência e por quê.', 'Descreva um momento em que você sentiu muito orgulho de si mesmo.', 'Conte sobre uma decisão difícil que você teve que tomar.'],
  'opiniões': ['É melhor morar numa cidade grande ou pequena? Dê a sua opinião com exemplos.', 'As redes sociais aproximam ou afastam as pessoas? O que você acha?', 'Você acha que é importante aprender idiomas hoje em dia? Por quê?', 'Qual é a melhor forma de aprender alguma coisa nova, na sua opinião?', 'Os jovens de hoje têm mais ou menos oportunidades que os seus pais? Explique.'],
  'viagens': ['Conte sobre uma viagem em que algo inesperado aconteceu.', 'Viajar sozinho ou acompanhado: quais são as vantagens de cada um?', 'Descreva o choque cultural que você teve (ou imagina ter) num país diferente.', 'Que conselho você daria a alguém que vai visitar o seu país pela primeira vez?', 'Planeje uma viagem dos sonhos: aonde iria, com quem e o que faria?'],
  'trabalho/estudo': ['Que habilidades você desenvolveu no seu trabalho ou estudo? Como?', 'Descreva um projeto de que você participou e o que aprendeu com ele.', 'Como seria o seu emprego ideal? Explique.', 'Que dificuldades você encontra ao estudar um idioma e como lida com elas?', 'Trabalhar de casa ou no escritório: o que você prefere e por quê?'],
  'sonhos': ['Se você pudesse morar em qualquer país, qual escolheria? Por quê?', 'Qual é um sonho que você ainda não realizou? O que precisa fazer para realizá-lo?', 'Se você ganhasse muito dinheiro, o que faria com ele?', 'Que habilidade você gostaria de aprender e por quê?', 'Como seria o seu dia perfeito daqui a dez anos?'],
  'contar uma história': ['Conte uma história engraçada que aconteceu com você ou com um amigo.', 'Conte sobre uma vez em que você ajudou um desconhecido (ou foi ajudado).', 'Conte sobre um mal-entendido que causou confusão.', 'Conte a história de um objeto que é especial para você.', 'Invente o começo de uma história que começa numa estação de trem.'],
  'dar conselho': ['Um amigo quer aprender o seu idioma estudado em seis meses. Que conselhos você daria?', 'Um colega está muito estressado com o trabalho. O que você recomendaria?', 'Que conselhos você daria a alguém que acabou de se mudar para a sua cidade?', 'O que você diria a alguém que tem medo de falar em público?', 'Escreva conselhos para alguém que quer economizar dinheiro.'],
  'descrever lugar/pessoa': ['Descreva um lugar que tem um significado especial para você e explique por quê.', 'Descreva alguém que te inspira e o que você aprendeu com essa pessoa.', 'Descreva a cidade onde você cresceu e como ela mudou.', 'Descreva um professor que marcou a sua vida.', 'Descreva o ambiente onde você estuda ou trabalha e como ele afeta você.'],
  'planos': ['Quais são os seus objetivos para este ano e como pretende alcançá-los?', 'O que você gostaria de mudar na sua vida nos próximos meses?', 'Descreva o plano para uma festa ou evento que você gostaria de organizar.', 'Que hábito novo você quer criar? Como vai fazer?', 'Onde você se vê profissionalmente daqui a cinco anos?'],
  'cultura e comida': ['Compare a culinária do seu país com a de outro país que você conhece.', 'Descreva uma festa popular ou um feriado típico do seu país.', 'Que livro, filme ou série você recomendaria? Por quê?', 'Que costume de outro país você gostaria de adotar?', 'Como a música influencia o seu dia a dia?'],
  'argumentar': ['Os estudantes deveriam usar uniforme? Apresente argumentos.', 'Deveria ser proibido usar o celular nas escolas? Argumente.', 'É melhor alugar ou comprar uma casa? Defenda a sua posição.', 'Os carros deveriam ser proibidos no centro das cidades? Argumente.', 'Fazer intercâmbio é essencial para aprender um idioma? Dê argumentos a favor e contra.'],
},
B2: {
  'argumentar': ['A inteligência artificial vai criar mais empregos do que destruir? Defenda a sua posição com argumentos.', 'O ensino universitário deveria ser gratuito para todos? Argumente.', 'O turismo de massa faz mais bem ou mais mal às cidades? Discuta.', 'A semana de trabalho de quatro dias deveria ser adotada? Apresente prós e contras e conclua.', 'Os governos deveriam regular as redes sociais? Argumente com exemplos.'],
  'opiniões': ['O sucesso depende mais do esforço ou das circunstâncias? Discuta.', 'Qual é o papel da arte numa sociedade moderna?', 'O que significa ter uma vida equilibrada hoje em dia?', 'A globalização ameaça as culturas locais? Dê a sua opinião.', 'É possível ser totalmente imparcial ao informar notícias? Discuta.'],
  'dar conselho': ['Escreva uma carta com conselhos para você mesmo de dez anos atrás.', 'Um amigo está em dúvida entre um emprego estável e abrir o próprio negócio. Aconselhe-o.', 'Que conselhos você daria a um jovem que vai morar sozinho pela primeira vez?', 'Como alguém pode manter a motivação ao aprender um idioma durante anos?', 'Aconselhe uma empresa que quer reduzir o seu impacto ambiental.'],
  'sonhos': ['Descreva o mundo em que você gostaria de viver daqui a trinta anos.', 'Se você pudesse mudar uma coisa na sua vida até agora, o que mudaria e por quê?', 'Que legado você gostaria de deixar?', 'Se pudesse ter uma conversa com qualquer pessoa da história, quem escolheria e o que perguntaria?', 'Que projeto pessoal ambicioso você gostaria de realizar? Descreva-o.'],
  'contar uma história': ['Conte sobre um fracasso que, no fim, trouxe algo positivo.', 'Narre um acontecimento que você presenciou e que poderia virar notícia.', 'Conte uma história que tenha uma reviravolta inesperada no final.', 'Narre um dia da sua vida do ponto de vista de um objeto da sua casa.', 'Conte sobre um encontro casual que acabou sendo importante.'],
  'trabalho/estudo': ['Qual é a qualidade mais importante de um bom líder? Justifique com exemplos.', 'Como a tecnologia mudou a forma como você estuda ou trabalha?', 'O que as escolas deveriam ensinar e não ensinam?', 'Descreva um desafio profissional ou acadêmico e como você o superou.', 'Especialistas ou generalistas: quem terá mais futuro no mercado de trabalho?'],
  'sociedade': ['Quais são os maiores desafios da sua cidade e como poderiam ser resolvidos?', 'Como podemos combater a desinformação na internet?', 'O que pode ser feito para reduzir a desigualdade social?', 'Qual é o impacto do envelhecimento da população na sociedade?', 'As grandes cidades ainda fazem sentido com o trabalho remoto? Discuta.'],
  'lembranças': ['Descreva uma época da sua vida que você considera decisiva e explique por quê.', 'Fale sobre um livro ou filme que mudou a sua forma de pensar.', 'Conte sobre uma tradição que você deixou de seguir e por quê.', 'Como a sua visão sobre a sua profissão ou os seus estudos mudou com o tempo?', 'Qual foi a lição mais valiosa que alguém mais velho ensinou a você?'],
  'viagens': ['Viajar realmente amplia a mente, ou é um clichê? Discuta com experiências.', 'Descreva um lugar que superou (ou frustrou) as suas expectativas.', 'Quais são as responsabilidades de um viajante em relação ao lugar que visita?', 'Como seria o roteiro perfeito para mostrar o seu país a um estrangeiro exigente?', 'Morar no exterior por um tempo: quais são os ganhos e as perdas?'],
  'cultura': ['Como o idioma que falamos influencia a nossa forma de pensar?', 'Que aspecto da cultura do país do idioma que você estuda mais te interessa? Por quê?', 'Os museus ainda são relevantes na era digital? Discuta.', 'Analise uma música ou obra de arte de que você gosta.', 'O humor é universal ou depende da cultura? Dê exemplos.'],
  'tecnologia': ['Estamos dependentes demais dos nossos celulares? Discuta.', 'Que invenção recente teve mais impacto na sua vida? Explique.', 'Os carros autônomos são uma boa ideia? Argumente.', 'Como seria um dia sem internet para você? O que isso revela?', 'A privacidade ainda existe na era digital? Discuta.'],
  'descrever': ['Descreva com detalhes uma cena do seu cotidiano, usando os cinco sentidos.', 'Descreva a personalidade de alguém que você conhece bem, com exemplos de comportamento.', 'Descreva um lugar da sua cidade para quem nunca esteve lá, de forma que a pessoa consiga imaginá-lo.', 'Descreva como a sua cidade será daqui a cinquenta anos.', 'Descreva um momento de muita emoção, explicando o que você sentiu e pensou.'],
},
};

const LEVELS = ['A1', 'A2', 'B1', 'B2'];
const NEXT = { A1:'A2', A2:'B1', B1:'B2', B2:'C1', C1:'C1' };
const TARGET = {
  A1:{ min:2, max:4, txt:'2–4 frases' }, A2:{ min:4, max:6, txt:'4–6 frases' },
  B1:{ min:6, max:10, txt:'6–10 frases' }, B2:{ words:120, txt:'120+ palavras' },
};
const TYPES = ['gramática', 'vocabulário', 'ortografia', 'concordância', 'tempo verbal', 'preposição', 'outro'];
const INFORMAL = { es:'tú', fr:'tu', de:'du', it:'tu', en:'you' };

/* ---------- dados ---------- */
const FLAT = {};
for (const lv of LEVELS) { FLAT[lv] = []; for (const [theme, arr] of Object.entries(BANK[lv])) arr.forEach((pt, i) => FLAT[lv].push({ key:`${lv}:${theme}:${i}`, theme, pt, lv })); }
/* intercala os temas para que dias seguidos tenham temas diferentes */
for (const lv of LEVELS) { const by = {}; FLAT[lv].forEach(p => (by[p.theme] = by[p.theme] || []).push(p)); const th = Object.keys(by); const out = []; for (let i = 0; i < 5; i++) th.forEach(t => by[t][i] && out.push(by[t][i])); FLAT[lv] = out; }

const lvl = () => { const l = F.level(); return l === 'C1' ? 'B2' : (TARGET[l] ? l : 'A1'); };
const st = () => F.store(ID);
const touch = () => { st()._ts = F.nowS(); F.save(); };
const dayOf = ts => { const ms = ts * 1000; return Math.floor((ms - new Date(ms).getTimezoneOffset() * 60000) / 86400000); };
const altN = () => { const a = st().alt; return a && a.d === F.today() ? a.n : 0; };
const promptFor = (day, n, lv = lvl()) => { const L = FLAT[lv]; return L[(((day * 37 + n * 11) % L.length) + L.length) % L.length]; };
const todayPrompt = () => promptFor(F.today(), altN());
const shortPt = s => { const m = s.match(/^[^?.!]*[?.!]/); return (m ? m[0] : s).trim(); };
const words = s => (String(s).match(/\p{L}[\p{L}\p{M}'’-]*/gu) || []).length;
const sentences = s => String(s).split(/[.!?…]+|\n+/).filter(x => /\p{L}/u.test(x)).length;
const draftKey = () => `frasier-journal-draft-${F.pair}-${F.today()}`;
const PHK = () => `frasier-journal-phr-${F.pair}`;
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch(e){ return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
const fmtDate = ts => { const d = new Date(ts * 1000).toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short' }); return d.charAt(0).toUpperCase() + d.slice(1); };
const scoreCls = n => n >= 80 ? 'ok' : n >= 55 ? 'mid' : 'low';

function progressInfo(text, lv){
  const t = TARGET[lv], w = words(text), s = sentences(text);
  if (t.words) return { w, s, frac: Math.min(1, w / t.words), met: w >= t.words, half: w >= t.words / 2 };
  return { w, s, frac: Math.min(1, s / t.min), met: s >= t.min, half: s >= Math.ceil(t.min / 2), over: s > t.max };
}

/* ---------- traduções das perguntas (IA uma vez, cache em F.store) ---------- */
let trBusy = null;
function ensureTranslations(extraKeys = []){
  if (trBusy || !F.aiAvailable()) return trBusy || Promise.resolve();
  const s = st(); s.tr = s.tr || {};
  const d = F.today(), lv = lvl(), n = altN();
  const want = [promptFor(d, n), promptFor(d, n + 1), promptFor(d, n + 2), promptFor(d + 1, 0), promptFor(d + 2, 0), ...extraKeys];
  const miss = [...new Map(want.filter(p => p && !s.tr[p.key]).map(p => [p.key, p])).values()];
  if (!miss.length) return Promise.resolve();
  const prompt = `Traduza para ${F.tgtName} estas perguntas de um diário de quem estuda ${F.tgtName} (nível ${lv}). Trate o aluno de forma informal ("${INFORMAL[F.tgt] || 'informal'}"), use vocabulário e gramática adequados ao nível ${lv} e frases naturais.
Responda em JSON: {"t":["tradução 1","tradução 2",...]} na mesma ordem.
${miss.map((p, i) => `${i + 1}. ${p.pt}`).join('\n')}`;
  trBusy = F.ai(prompt, { json:true, temperature:0.3, maxTokens:1200 }).then(r => {
    const arr = Array.isArray(r) ? r : (r && r.t) || [];
    const tr = st().tr = st().tr || {};
    miss.forEach((p, i) => { if (typeof arr[i] === 'string' && arr[i].trim()) tr[p.key] = arr[i].trim(); });
    const ks = Object.keys(tr); ks.slice(0, Math.max(0, ks.length - 40)).forEach(k => delete tr[k]);
    touch();
  }).catch(() => {}).finally(() => { trBusy = null; });
  return trBusy;
}

/* ---------- diferença palavra a palavra (texto do aluno x corrigido) ---------- */
function diffHTML(a, b){
  const A = String(a).split(/\s+/).filter(Boolean), B = String(b).split(/\s+/).filter(Boolean);
  if (A.length * B.length > 250000) return F.esc(b);
  const n = A.length, m = B.length, norm = w => w.toLowerCase();
  const L = Array.from({ length:n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = norm(A[i]) === norm(B[j]) && A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < n && j < m) { if (A[i] === B[j]) { ops.push(['=', A[i]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) ops.push(['-', A[i++]]); else ops.push(['+', B[j++]]); }
  while (i < n) ops.push(['-', A[i++]]); while (j < m) ops.push(['+', B[j++]]);
  // agrupa trechos seguidos
  const out = []; let k = 0;
  while (k < ops.length) {
    if (ops[k][0] === '=') { out.push(F.esc(ops[k][1])); k++; continue; }
    const del = [], ins = [];
    while (k < ops.length && ops[k][0] !== '=') { (ops[k][0] === '-' ? del : ins).push(ops[k][1]); k++; }
    let h = ''; if (del.length) h += `<del class="journal-del">${F.esc(del.join(' '))}</del>`; if (ins.length) h += `${del.length ? ' ' : ''}<ins class="journal-ins">${F.esc(ins.join(' '))}</ins>`;
    out.push(h);
  }
  return out.join(' ');
}

/* ---------- trechos com erro destacados no texto do aluno ---------- */
function markErrors(text, errs){
  const ranges = [], low = text.toLowerCase();
  errs.forEach((e, idx) => {
    let o = String(e.original || '').trim(); if (!o) return;
    const tries = [o, o.replace(/^[\s.,;:!?¿¡"'«»]+|[\s.,;:!?¿¡"'«»]+$/g, '')];
    for (const t of tries) {
      if (!t) continue;
      let from = 0, pos;
      while ((pos = low.indexOf(t.toLowerCase(), from)) !== -1) {
        const end = pos + t.length;
        if (!ranges.some(r => pos < r.end && end > r.start)) { ranges.push({ start:pos, end, idx }); e._found = true; return; }
        from = pos + 1;
      }
    }
  });
  ranges.sort((a, b) => a.start - b.start);
  let h = '', at = 0;
  for (const r of ranges) {
    h += F.esc(text.slice(at, r.start)) + `<mark class="journal-err" tabindex="0" role="button" data-i="${r.idx}">${F.esc(text.slice(r.start, r.end))}<sup>${r.idx + 1}</sup></mark>`;
    at = r.end;
  }
  return (h + F.esc(text.slice(at))).replace(/\n/g, '<br>');
}

function normalizeEval(r){
  r = r && typeof r === 'object' ? r : {};
  const num = Math.max(0, Math.min(100, Math.round(+r.nota || 0)));
  const arr = x => Array.isArray(x) ? x : [];
  return {
    nota: num, nivel_estimado: String(r.nivel_estimado || '').toUpperCase().slice(0, 2), resumo: String(r.resumo || ''),
    erros: arr(r.erros).filter(e => e && (e.original || e.corrigido)).slice(0, 15).map(e => ({ original:String(e.original || ''), corrigido:String(e.corrigido || ''), tipo: TYPES.includes(String(e.tipo || '').toLowerCase()) ? String(e.tipo).toLowerCase() : 'outro', explicacao:String(e.explicacao || '') })),
    texto_corrigido: String(r.texto_corrigido || ''), versao_natural: String(r.versao_natural || ''),
    vocabulario: arr(r.vocabulario).filter(v => v && v.palavra).slice(0, 8).map(v => ({ palavra:String(v.palavra), traducao:String(v.traducao || ''), exemplo:String(v.exemplo || '') })),
    pergunta_seguimento: String(r.pergunta_seguimento || ''),
  };
}

/* ---------- estilo ---------- */
function injectCSS(){
  if (document.getElementById('journal-css')) return;
  const css = `
.journal-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.journal-tabs button{min-height:48px;justify-content:center;display:flex;align-items:center;gap:6px}
.journal-q{padding:16px 16px 14px}
.journal-qhead{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.journal-qt{font-size:21px;line-height:1.45;font-weight:600;margin:12px 0 6px;word-wrap:break-word}
.journal-qtr{margin:0 0 4px;font-size:16px;color:var(--muted);padding-top:8px;border-top:2px dashed var(--line)}
.journal-qbtns{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.journal-qbtns .tool{flex:1 1 auto;justify-content:center}
.journal-say{width:44px;padding:0;justify-content:center;margin-left:auto;background:var(--sky-soft);border-color:transparent;box-shadow:none}
.journal-hint{font-size:13.5px;color:var(--muted);margin:6px 0 0}
.journal-mode{grid-template-columns:1fr 1fr}
.journal-mode button{min-height:52px;flex-direction:row;font-size:16px}
.journal-ed{padding:14px}
.journal-goal{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:14px;color:var(--muted);font-weight:700;flex-wrap:wrap}
.journal-goal b{color:var(--ink)}
.journal-bar{height:8px;border-radius:4px;background:var(--surface-2);overflow:hidden;margin:8px 0 12px}
.journal-bar i{display:block;height:100%;background:var(--sky);border-radius:4px;transition:width .3s}
.journal-bar.met i{background:var(--ok)}
.journal-ta{width:100%;min-height:190px;font:inherit;font-family:var(--ft);font-size:18px;line-height:1.55;border:2px solid var(--line);border-radius:var(--r-m);background:var(--slot);color:var(--ink);padding:12px 14px;resize:vertical;outline:none;box-shadow:inset 0 3px 0 rgba(23,18,58,.08)}
.journal-ta:focus{border-color:var(--brand)}
.journal-edrow{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}
.journal-ed .mic{margin:0 0 12px;padding:16px;flex-direction:row;justify-content:center;gap:14px}
.journal-ed .mic .ring{width:56px;height:56px}
.journal-ed .mic svg{width:28px;height:28px}
.journal-interim{font-size:17px;color:var(--muted);min-height:1.4em;margin:0 0 8px;font-style:italic}
.journal-interim:empty{display:none}
.journal-phr{list-style:none;padding:0;margin:10px 0 0;display:flex;flex-direction:column;gap:6px}
.journal-phr li{display:flex;align-items:center;gap:8px;border:2px solid var(--line);border-radius:12px;padding:6px 6px 6px 10px;background:var(--surface)}
.journal-phr .journal-ins-btn{flex:1;text-align:left;border:0;background:none;padding:4px 0;min-height:40px;font-size:16px}
.journal-phr .journal-ins-btn b{display:block;font-weight:700}
.journal-phr .journal-ins-btn span{font-size:14px;color:var(--muted)}
.journal-phr .tool{width:40px;min-height:40px;padding:0;justify-content:center;box-shadow:none}
.journal-go{width:100%}
.journal-lastbtn{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 14px;color:var(--ink);font:inherit}
.journal-lastbtn small{display:block;color:var(--muted);font-size:13.5px}
.journal-badge{flex:none;min-width:46px;height:36px;padding:0 8px;border-radius:10px;display:grid;place-items:center;font-family:var(--fd);font-weight:800;font-size:15px}
.journal-badge.ok{background:var(--ok-bg);color:var(--ok-ink)}
.journal-badge.mid{background:color-mix(in srgb,var(--sun) 32%,var(--surface));color:var(--on-sun)}
@media (prefers-color-scheme: dark){ .journal-badge.mid{background:color-mix(in srgb,var(--sun) 16%,transparent);color:var(--sun)} }
.journal-badge.low{background:var(--bad-bg);color:var(--bad-ink)}
.journal-scorecard{display:flex;gap:16px;align-items:center;padding:16px}
.journal-ring{flex:none;width:96px;height:96px;position:relative}
.journal-ring svg{width:96px;height:96px;transform:rotate(-90deg)}
.journal-ring .bg{stroke:var(--surface-2)}
.journal-ring .fg{transition:stroke-dashoffset .8s var(--ease-pop)}
.journal-ring.ok .fg{stroke:var(--ok)} .journal-ring.mid .fg{stroke:var(--sun)} .journal-ring.low .fg{stroke:var(--bad)}
.journal-ring b{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--fd);font-size:28px;font-weight:800;letter-spacing:-.04em}
.journal-ring b small{display:block;font-size:11px;font-weight:600;color:var(--muted);letter-spacing:0;margin-top:-4px;text-align:center}
.journal-sc-txt{min-width:0;flex:1}
.journal-sc-txt p{margin:6px 0 0;font-size:15.5px;line-height:1.45}
.journal-pts{display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:8px;background:var(--sun);color:var(--on-sun);font-weight:800;font-size:13px;font-family:var(--fd)}
.journal-sec{padding:14px 16px}
.journal-sec h3{font-family:var(--fd);font-size:15px;font-weight:700;margin:0;display:flex;align-items:center;gap:8px}
.journal-sec h3 .spacer{flex:1}
.journal-sec h3 .tool{min-height:40px;width:40px;padding:0;justify-content:center;box-shadow:none;background:var(--sky-soft);border-color:transparent}
.journal-text{font-size:17.5px;line-height:1.75;margin:10px 0 6px;word-wrap:break-word}
.journal-err{background:var(--bad-bg);color:var(--bad-ink);border-radius:5px;padding:1px 2px;text-decoration:underline wavy var(--bad);text-decoration-thickness:1.5px;text-underline-offset:3px;cursor:pointer}
.journal-err sup{font-size:10px;font-weight:800;margin-left:1px;text-decoration:none;display:inline-block}
.journal-err.sel{outline:2px solid var(--bad);outline-offset:1px}
.journal-del{background:var(--bad-bg);color:var(--bad-ink);text-decoration:line-through;text-decoration-thickness:2px;border-radius:4px;padding:0 2px}
.journal-ins{background:var(--ok-bg);color:var(--ok-ink);text-decoration:none;font-weight:700;border-radius:4px;padding:0 2px}
.journal-tally{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.journal-tally .tag b{color:var(--ink);font-family:var(--fd)}
.journal-errlist{list-style:none;padding:0;margin:10px 0 0;display:flex;flex-direction:column;gap:8px}
.journal-errlist li{border-top:2px solid var(--line);padding-top:8px;font-size:15px;line-height:1.45}
.journal-errlist .n{font-family:var(--fd);font-weight:800;color:var(--bad-ink);margin-right:4px}
.journal-errlist del{color:var(--bad-ink)} .journal-errlist ins{color:var(--ok-ink);text-decoration:none;font-weight:700}
.journal-popt{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.journal-popfix{font-size:17px;margin:6px 0}
.journal-popfix del{color:var(--bad-ink)} .journal-popfix ins{color:var(--ok-ink);font-weight:700;text-decoration:none}
details.journal-det summary{cursor:pointer;font-weight:700;font-size:15px;color:var(--brand);min-height:40px;display:flex;align-items:center;list-style:none}
details.journal-det summary::-webkit-details-marker{display:none}
details.journal-det summary::before{content:"▸";margin-right:6px;transition:transform .2s}
details.journal-det[open] summary::before{transform:rotate(90deg)}
@media (prefers-color-scheme: dark){ details.journal-det summary{color:#B6A6FF} }
.journal-vocab{list-style:none;padding:0;margin:8px 0 0}
.journal-vocab li{display:flex;gap:10px;align-items:center;padding:10px 0;border-top:2px solid var(--line)}
.journal-vocab li:first-child{border-top:0}
.journal-vocab .vt{flex:1;min-width:0}
.journal-vocab .vt b{font-size:17px}
.journal-vocab .vt .ex{font-size:14px;color:var(--muted);font-style:italic;margin-top:2px}
.journal-vocab .tool{font-size:13.5px;padding:6px 10px;min-height:40px;flex:none}
.journal-follow{background:var(--brand-soft);border-color:var(--slot-line)}
.journal-follow .journal-text{font-weight:600;margin-bottom:12px}
.journal-endbtns{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.journal-endbtns .btn:only-child{grid-column:1/-1}
.journal-stats{display:grid;grid-template-columns:repeat(3,1fr);text-align:center;margin-top:12px}
.journal-stats div+div{border-left:2px solid var(--line)}
.journal-stats b{display:block;font-family:var(--fd);font-size:20px;font-weight:800}
.journal-stats span{font-size:13px;color:var(--muted)}
.journal-chart{width:100%;height:auto;display:block;margin-top:8px;overflow:visible}
.journal-chart .grid{stroke:var(--line);stroke-width:1}
.journal-chart .lbl{fill:var(--muted);font-size:10px;font-family:var(--ft)}
.journal-chart .ln{fill:none;stroke:var(--brand);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
.journal-chart .area{fill:var(--brand);opacity:.1}
.journal-chart .dot{fill:var(--brand);stroke:var(--surface);stroke-width:2}
.journal-chart .hit{fill:transparent;cursor:pointer}
.journal-chart .sel .dot{fill:var(--sun);stroke:var(--brand)}
@media (prefers-color-scheme: dark){ .journal-chart .ln{stroke:#9D86FF} .journal-chart .dot{fill:#9D86FF} .journal-chart .area{fill:#9D86FF} }
.journal-tip{font-size:14px;color:var(--muted);min-height:20px;margin-top:4px;font-weight:700}
.journal-entry{padding:12px 14px}
.journal-entry .row{align-items:flex-start}
.journal-entry .meta{flex:1;min-width:0}
.journal-entry .meta .d{font-size:13px;color:var(--muted);font-weight:700}
.journal-entry .meta .p{font-size:15px;margin-top:2px;line-height:1.35}
.journal-entry .body{font-size:16px;line-height:1.6;margin:8px 0 4px;white-space:pre-wrap;word-wrap:break-word}
.journal-entry .fixed{font-size:15.5px;line-height:1.6;margin:6px 0;padding:8px 10px;border-radius:10px;background:var(--surface-2)}
.journal-entry .acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.journal-empty{padding:18px;text-align:center;color:var(--muted)}
`;
  const el = document.createElement('style'); el.id = 'journal-css'; el.textContent = css; document.head.appendChild(el);
}

/* ---------- tela ---------- */
function open(body, ctx){
  injectCSS();
  const arg = ctx.arg || {};
  let tab = 'write', listening = false, stopLoop = false, saveT = null;
  // estado da entrada atual (restaurado do rascunho do dia)
  const dr = lsGet(draftKey(), null);
  let cur = { text:'', free:false, cont:null, mode:'write', showTr:false };
  if (dr && typeof dr === 'object') cur = { ...cur, text:dr.text || '', free:!!dr.free, cont:dr.cont || null, mode:dr.mode === 'speak' ? 'speak' : 'write' };

  const saveDraft = () => { if (cur.text.trim() || cur.cont || cur.free) lsSet(draftKey(), { text:cur.text, free:cur.free, cont:cur.cont, mode:cur.mode }); else try { localStorage.removeItem(draftKey()); } catch(e){} };
  ctx.onClose(() => { stopLoop = true; listening = false; F.stopListen(); saveDraft(); F.hidePopover && F.hidePopover(); });
  // limpa rascunhos de dias anteriores
  try { Object.keys(localStorage).filter(k => k.startsWith(`frasier-journal-draft-${F.pair}-`) && k !== draftKey()).forEach(k => localStorage.removeItem(k)); } catch(e){}

  const curPrompt = () => {
    if (cur.cont) return { kind:'cont', tgt:cur.cont.question, pt:'', label:'Continuação' };
    if (cur.free) return { kind:'free', tgt:'', pt:'Tema livre: escreva sobre o que quiser — o seu dia, uma ideia, uma notícia, um plano.', label:'Tema livre' };
    const p = todayPrompt(); const tr = (st().tr || {})[p.key];
    return { kind:'bank', key:p.key, theme:p.theme, tgt:tr || '', pt:p.pt, label:'Pergunta de hoje' };
  };
  const promptText = () => { const p = curPrompt(); return p.kind === 'free' ? 'Tema livre' : (p.tgt || p.pt); };

  function render(){
    F.hidePopover && F.hidePopover();
    const n = (F.ext().journal || []).length;
    body.innerHTML = `<div class="chips journal-tabs" role="tablist">
        <button role="tab" data-tab="write" class="${tab === 'write' || tab === 'result' ? 'on' : ''}">✍️ Escrever</button>
        <button role="tab" data-tab="hist" class="${tab === 'hist' ? 'on' : ''}">📓 Meu diário${n ? ` (${n})` : ''}</button></div><div id="jView" style="display:flex;flex-direction:column;gap:12px"></div>`;
    body.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { if (listening) { stopLoop = true; F.stopListen(); } tab = b.dataset.tab; render(); });
    const v = body.querySelector('#jView');
    if (tab === 'hist') renderHistory(v); else if (tab === 'result' && shown) renderResult(v, shown); else { tab = 'write'; renderWrite(v); }
  }

  /* ----- escrever ----- */
  function renderWrite(v){
    const lv = lvl(), p = curPrompt(), t = TARGET[lv], s = st();
    const offlineNote = p.kind === 'bank' && !p.tgt;
    const mainTxt = p.kind === 'bank' ? (p.tgt || p.pt) : p.kind === 'cont' ? p.tgt : p.pt;
    const showMainTgt = (p.kind === 'bank' && p.tgt) || p.kind === 'cont';
    v.innerHTML = `
      <div class="card journal-q">
        <div class="journal-qhead"><span class="tag new">${F.esc(p.label)}</span><span class="tag">${lv}</span>${p.theme ? `<span class="tag">${F.esc(p.theme)}</span>` : ''}
          ${showMainTgt ? `<button class="tool journal-say" id="jSayQ" aria-label="Ouvir a pergunta">🔊</button>` : ''}</div>
        <p class="journal-qt" id="jQ" ${showMainTgt ? `lang="${F.tgt}"` : ''}>${showMainTgt ? F.clickable(mainTxt) : F.esc(mainTxt)}</p>
        ${p.kind === 'bank' && p.tgt ? `<p class="journal-qtr ${cur.showTr ? '' : 'hidden'}" id="jQtr">${F.esc(p.pt)}</p>` : ''}
        ${offlineNote ? `<p class="journal-hint" id="jOffHint">${F.aiAvailable() ? `Preparando a versão em ${F.esc(F.tgtName)}…` : `Sem internet: a pergunta aparece em português. Responda em ${F.esc(F.tgtName)}!`}</p>` : ''}
        ${p.kind === 'cont' ? `<details class="journal-det"><summary>O que você já escreveu</summary><p class="small" style="white-space:pre-wrap;margin:4px 0 0">${F.esc(cur.cont.prev || '')}</p></details>` : ''}
        <div class="journal-qbtns">
          ${p.kind === 'bank' && p.tgt ? `<button class="tool" id="jTr">${cur.showTr ? 'Ocultar tradução' : 'Ver tradução'}</button>` : ''}
          ${p.kind === 'bank' ? `<button class="tool" id="jOther">🔀 Outra pergunta</button><button class="tool" id="jFree">🕊️ Tema livre</button>` : `<button class="tool" id="jBackQ">↩ Pergunta de hoje</button>`}
        </div>
      </div>
      <div class="seg journal-mode" role="radiogroup" aria-label="Modo">
        <button data-mode="write" class="${cur.mode === 'write' ? 'on' : ''}" aria-pressed="${cur.mode === 'write'}">✍️ Escrever</button>
        <button data-mode="speak" class="${cur.mode === 'speak' ? 'on' : ''}" aria-pressed="${cur.mode === 'speak'}">🎤 Falar</button>
      </div>
      <div class="card journal-ed">
        <div class="journal-goal"><span>Meta ${lv}: <b>${t.txt}</b></span><span id="jCount" aria-live="polite"></span></div>
        <div class="journal-bar" id="jBar"><i></i></div>
        ${cur.mode === 'speak' ? (F.canListen() ? `<button class="mic" id="jMic"><span class="ring">${F.micSVG}</span><span id="jMicL">Toque e fale uma frase</span></button><p class="journal-interim" id="jInterim"></p>`
          : `<p class="note">Seu navegador não reconhece voz. Escreva abaixo — no celular, o microfone do teclado também funciona.</p>`) : ''}
        <textarea class="journal-ta" id="jTa" lang="${F.tgt}" spellcheck="false" autocorrect="off" autocapitalize="sentences"
          placeholder="${cur.mode === 'speak' ? 'O que você disser aparece aqui. Pode editar.' : `Escreva em ${F.esc(F.tgtName)}…`}"></textarea>
        <div class="journal-edrow"><button class="tool" id="jPhr">💡 Frases úteis</button><span class="spacer"></span>${cur.text ? '<button class="linkbtn" id="jClear">Apagar</button>' : ''}</div>
        <div id="jPhrBox"></div>
      </div>
      <button class="btn btn-primary journal-go" id="jEval">Corrigir meu texto<small>correção de professor com IA</small></button>
      <div id="jEvalBox"></div>
      ${s.last && s.last.ev ? `<button class="card journal-lastbtn" id="jLast"><span class="journal-badge ${scoreCls(s.last.ev.nota)}">${s.last.ev.nota}</span><span><b>Última correção</b><small>${F.esc(fmtDate(s.last.ts))} · ${F.esc(shortPt(s.last.prompt || '').slice(0, 60))}</small></span></button>` : ''}`;

    const ta = v.querySelector('#jTa'); ta.value = cur.text;
    const upd = () => {
      cur.text = ta.value; const pi = progressInfo(cur.text, lv);
      v.querySelector('#jCount').textContent = `${pi.w} ${pi.w === 1 ? 'palavra' : 'palavras'} · ${pi.s} ${pi.s === 1 ? 'frase' : 'frases'}${pi.met ? ' ✓' : ''}`;
      const bar = v.querySelector('#jBar'); bar.classList.toggle('met', pi.met); bar.firstElementChild.style.width = Math.round(pi.frac * 100) + '%';
      v.querySelector('#jEval').disabled = pi.w < 3;
      clearTimeout(saveT); saveT = setTimeout(saveDraft, 400);
    };
    ta.addEventListener('input', upd); upd();
    if (showMainTgt) F.bindLookup(v.querySelector('#jQ'), () => mainTxt);
    const on = (id, fn) => { const el = v.querySelector('#' + id); if (el) el.onclick = fn; };
    on('jSayQ', () => F.say(mainTxt));
    on('jTr', () => { cur.showTr = !cur.showTr; v.querySelector('#jQtr').classList.toggle('hidden', !cur.showTr); v.querySelector('#jTr').textContent = cur.showTr ? 'Ocultar tradução' : 'Ver tradução'; });
    on('jOther', () => { const s2 = st(); s2.alt = { d:F.today(), n:altN() + 1 }; touch(); cur.showTr = false; saveDraft(); renderWrite(v); ensureTranslations().then(refreshIfMissing); });
    on('jFree', () => { cur.free = true; cur.cont = null; saveDraft(); renderWrite(v); });
    on('jBackQ', () => { cur.free = false; cur.cont = null; saveDraft(); renderWrite(v); });
    on('jClear', () => { if (!confirm('Apagar o texto?')) return; cur.text = ''; saveDraft(); renderWrite(v); });
    on('jLast', () => { shown = { ...st().last, isNew:false }; tab = 'result'; render(); window.scrollTo(0, 0); });
    on('jEval', () => evaluate(v));
    on('jPhr', () => phrases(v, ta));
    v.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { if (listening) { stopLoop = true; F.stopListen(); } cur.mode = b.dataset.mode; saveDraft(); renderWrite(v); });
    on('jMic', () => dictate(v, ta, upd));
    if (offlineNote && F.aiAvailable()) ensureTranslations().then(refreshIfMissing);
    function refreshIfMissing(){
      if (tab !== 'write' || !v.isConnected) return;
      const q = curPrompt();
      if (q.kind === 'bank' && q.tgt && !v.querySelector('#jTr')) renderWrite(v);
      else if (q.kind === 'bank' && !q.tgt) { const h = v.querySelector('#jOffHint'); if (h) h.textContent = `Não consegui traduzir agora — responda em ${F.tgtName} mesmo assim.`; }
    }
  }

  /* ----- ditado: frase por frase, até um silêncio ----- */
  async function dictate(v, ta, upd){
    const mic = v.querySelector('#jMic'), lab = v.querySelector('#jMicL'), inter = v.querySelector('#jInterim');
    if (listening) { stopLoop = true; F.stopListen(); return; }
    listening = true; stopLoop = false; mic.classList.add('listening'); lab.textContent = 'Ouvindo… toque para parar';
    try {
      while (!stopLoop) {
        let t = '';
        try { t = await F.listen({ onInterim: s => { inter.textContent = s; } }); }
        catch(e){ F.toast('Não consegui usar o microfone. Verifique a permissão ou escreva.'); break; }
        inter.textContent = '';
        if (!t) break;
        t = t.trim(); t = t.charAt(0).toUpperCase() + t.slice(1); if (!/[.!?…]$/.test(t)) t += '.';
        const base = ta.value.replace(/\s+$/, '');
        ta.value = base ? base + ' ' + t : t; upd();
      }
    } finally {
      listening = false; if (mic.isConnected) { mic.classList.remove('listening'); lab.textContent = 'Toque e fale uma frase'; inter.textContent = ''; }
    }
  }

  /* ----- frases úteis ----- */
  async function phrases(v, ta){
    const box = v.querySelector('#jPhrBox'), lv = lvl(), pt = promptText();
    const ck = lv + '|' + pt.slice(0, 120), cache = lsGet(PHK(), {});
    const show = list => {
      box.innerHTML = `<ul class="journal-phr">${list.map((x, i) => `<li><button class="journal-ins-btn" data-i="${i}" title="Inserir no texto"><b lang="${F.tgt}">${F.esc(x.expr)}</b><span>${F.esc(x.traducao)}</span></button><button class="tool" data-say="${i}" aria-label="Ouvir">🔊</button></li>`).join('')}</ul><p class="journal-hint">Toque numa expressão para inseri-la no texto.</p>`;
      box.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
        const e = list[+b.dataset.i].expr, s0 = ta.selectionStart ?? ta.value.length, s1 = ta.selectionEnd ?? s0;
        const pre = ta.value.slice(0, s0), sp = pre && !/\s$/.test(pre) ? ' ' : '';
        ta.value = pre + sp + e + ' ' + ta.value.slice(s1); const pos = (pre + sp + e + ' ').length;
        ta.focus(); ta.setSelectionRange(pos, pos); ta.dispatchEvent(new Event('input'));
      });
      box.querySelectorAll('[data-say]').forEach(b => b.onclick = () => F.say(list[+b.dataset.say].expr));
    };
    if (cache[ck]) return show(cache[ck]);
    box.innerHTML = F.loading('Buscando expressões úteis…');
    try {
      const r = await F.ai(`Um aluno de ${F.tgtName}, nível ${lv}, vai escrever um texto curto sobre: "${pt}".
Dê 5 expressões ou começos de frase em ${F.tgtName}, naturais e adequados ao nível ${lv}, que ajudem a responder (conectores, estruturas úteis; tratamento informal). Tradução para ${F.srcName}.
JSON: {"frases":[{"expr":"…","traducao":"…"}]}`, { json:true, temperature:0.5, maxTokens:600 });
      const list = (r.frases || r || []).filter(x => x && x.expr).slice(0, 6).map(x => ({ expr:String(x.expr), traducao:String(x.traducao || '') }));
      if (!list.length) throw Object.assign(new Error('vazio'), { friendly:'Não veio nenhuma expressão. Tente de novo.' });
      cache[ck] = list; const ks = Object.keys(cache); ks.slice(0, Math.max(0, ks.length - 30)).forEach(k => delete cache[k]); lsSet(PHK(), cache);
      if (box.isConnected) show(list);
    } catch(err) { if (!box.isConnected) return; box.innerHTML = F.errorBox(err, 'jPhrRetry'); const b = box.querySelector('#jPhrRetry'); if (b) b.onclick = () => phrases(v, ta); }
  }

  /* ----- correção ----- */
  let evaluating = false;
  async function evaluate(v){
    if (evaluating) return;
    if (listening) { stopLoop = true; F.stopListen(); }
    const text = cur.text.trim(); if (words(text) < 3) return F.toast('Escreva pelo menos uma frase.');
    const lv = lvl(), p = curPrompt(), t = TARGET[lv];
    const box = v.querySelector('#jEvalBox'), btn = v.querySelector('#jEval');
    evaluating = true; btn.disabled = true;
    box.innerHTML = F.loading('O professor está lendo o seu texto…'); box.scrollIntoView({ behavior:'smooth', block:'center' });
    const qDesc = p.kind === 'free' ? 'Tema livre (o aluno escolheu o assunto).' : `Pergunta: "${p.tgt || p.pt}"`;
    const system = `Você é um professor experiente de ${F.tgtName} como língua estrangeira, especialista no Quadro Europeu Comum (CEFR). É gentil e preciso: corrige só erros reais (não preferências de estilo), explica de forma curta e clara em ${F.explainLang}, avalia de forma justa para o nível do aluno e sempre encoraja com elogios específicos. Nunca invente erros. Responda apenas com JSON válido.`;
    const prompt = `Idioma estudado: ${F.tgtName}. Nível declarado do aluno: ${lv}. Meta de extensão: ${t.txt}.
${qDesc}
${p.kind === 'cont' ? `O aluno está continuando um texto que já escreveu: """${(cur.cont.prev || '').slice(0, 1200)}"""\n` : ''}Texto do aluno:
"""
${text}
"""
Responda em JSON exatamente neste formato:
{"nota":0-100,"nivel_estimado":"A1|A2|B1|B2|C1","resumo":"1-2 frases de feedback encorajador e específico","erros":[{"original":"trecho exato do aluno","corrigido":"…","tipo":"gramática|vocabulário|ortografia|concordância|tempo verbal|preposição|outro","explicacao":"curta"}],"texto_corrigido":"texto do aluno com as correções mínimas","versao_natural":"como um nativo escreveria","vocabulario":[{"palavra":"…","traducao":"…","exemplo":"…"}],"pergunta_seguimento":"uma pergunta para continuar escrevendo"}
Regras:
- "original": copie EXATAMENTE o trecho do texto do aluno (o menor trecho que contém o erro, 1 a 6 palavras), um item por erro, na ordem do texto, no máximo 12. "corrigido": só esse trecho corrigido.
- "explicacao" e "resumo" em ${F.explainLang}; "explicacao" com até 20 palavras, dizendo a regra.
- "texto_corrigido": mantenha o texto do aluno e mude só o necessário.
- "versao_natural": em ${F.tgtName}, como um nativo escreveria a mesma ideia, no nível ${NEXT[lv]}.
- "vocabulario": 3 a 5 palavras ou expressões úteis da versão natural; "traducao" para ${F.srcName}; "exemplo" curto em ${F.tgtName}.
- "pergunta_seguimento": em ${F.tgtName}, nível ${lv}, informal, ligada ao que o aluno contou.
- "nota": correção (50%), adequação à pergunta e comunicação (25%), riqueza para o nível ${lv} (15%) e extensão em relação à meta (10%). Texto sem erros e no nível = 90+.
- Se o texto não estiver em ${F.tgtName}, dê nota baixa e explique no resumo.`;
    try {
      const raw = await F.ai(prompt, { system, json:true, temperature:0.2, maxTokens:4096, timeout:60000 });
      const ev = normalizeEval(raw);
      if (!ev.texto_corrigido && !ev.resumo) throw Object.assign(new Error('resposta incompleta'), { friendly:'A correção veio incompleta. Tente de novo.' });
      const pi = progressInfo(text, lv);
      const pts = Math.round(ev.nota / 10) + (pi.met ? 3 : pi.half ? 1 : 0);
      const promptStr = p.kind === 'free' ? 'Tema livre' : (p.tgt || p.pt);
      const entry = { id:'j' + Date.now().toString(36), ts:F.nowS(), prompt:promptStr, text, score:ev.nota, fixed:ev.texto_corrigido };
      if (p.kind === 'cont' && cur.cont.parentId) entry.parent = cur.cont.parentId;
      const j = F.ext().journal; j.push(entry);
      const s = st(); s.last = { id:entry.id, ts:entry.ts, prompt:promptStr, promptPt: p.kind === 'bank' ? p.pt : '', text, ev, pts }; touch();
      F.addPoints(pts);
      cur = { text:'', free:false, cont:null, mode:cur.mode, showTr:false }; try { localStorage.removeItem(draftKey()); } catch(e){}
      F.planDone && F.planDone(ID);
      shown = { ...s.last, isNew:true }; tab = 'result'; render(); window.scrollTo(0, 0);
    } catch(err) {
      if (!box.isConnected) return;
      box.innerHTML = F.errorBox(err, 'jEvalRetry'); const b = box.querySelector('#jEvalRetry'); if (b) b.onclick = () => evaluate(v);
      btn.disabled = false;
    } finally { evaluating = false; }
  }

  /* ----- resultado ----- */
  let shown = null;
  function renderResult(v, r){
    const ev = r.ev, C = 2 * Math.PI * 42, cls = scoreCls(ev.nota);
    const errs = ev.erros.map(e => ({ ...e }));
    const marked = markErrors(r.text, errs);
    const tally = {}; errs.forEach(e => tally[e.tipo] = (tally[e.tipo] || 0) + 1);
    const fromPlan = arg.fromPlan;
    v.innerHTML = `
      <div class="card journal-scorecard">
        <div class="journal-ring ${cls}" role="img" aria-label="Nota ${ev.nota} de 100"><svg viewBox="0 0 96 96"><circle class="bg" cx="48" cy="48" r="42" fill="none" stroke-width="9"/><circle class="fg" cx="48" cy="48" r="42" fill="none" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg><b><span>${ev.nota}<small>de 100</small></span></b></div>
        <div class="journal-sc-txt">
          <div class="row" style="gap:6px;flex-wrap:wrap">${ev.nivel_estimado ? `<span class="tag">Nível estimado: <b style="color:var(--ink)">${F.esc(ev.nivel_estimado)}</b></span>` : ''}${r.isNew && r.pts ? `<span class="journal-pts">+${r.pts} pts</span>` : ''}</div>
          <p>${F.esc(ev.resumo)}</p>
        </div>
      </div>
      <div class="card journal-sec">
        <h3>Seu texto <span class="spacer"></span><span class="tag">${errs.length ? `${errs.length} ${errs.length === 1 ? 'correção' : 'correções'}` : 'sem erros 🎉'}</span></h3>
        <p class="small muted" style="margin:6px 0 0">${F.esc(r.prompt || '')}</p>
        <div class="journal-text" id="jMarked" lang="${F.tgt}">${marked}</div>
        ${errs.length ? `<p class="journal-hint">Toque nos trechos marcados para ver a correção.</p>
        <div class="journal-tally">${Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span class="tag">${F.esc(k)} <b>${n}</b></span>`).join('')}</div>
        <details class="journal-det" style="margin-top:6px"><summary>Ver todas as correções</summary><ol class="journal-errlist">${errs.map((e, i) => `<li><span class="n">${i + 1}</span><del>${F.esc(e.original)}</del> → <ins>${F.esc(e.corrigido)}</ins> <span class="tag" style="height:22px;font-size:12px">${F.esc(e.tipo)}</span><div class="muted">${F.esc(e.explicacao)}</div></li>`).join('')}</ol></details>` : ''}
      </div>
      ${ev.texto_corrigido && ev.texto_corrigido.trim() !== r.text.trim() ? `<div class="card journal-sec">
        <h3>Texto corrigido <span class="spacer"></span><button class="tool" id="jSayFix" aria-label="Ouvir o texto corrigido">🔊</button></h3>
        <div class="journal-text" lang="${F.tgt}">${diffHTML(r.text, ev.texto_corrigido)}</div>
        <p class="journal-hint"><span class="journal-del">riscado</span> sai · <span class="journal-ins">verde</span> entra</p>
      </div>` : ''}
      ${ev.versao_natural ? `<div class="card journal-sec">
        <h3>Como um nativo diria <span class="tag">${NEXT[lvl()]}</span><span class="spacer"></span><button class="tool" id="jSayNat" aria-label="Ouvir a versão natural">🔊</button></h3>
        <div class="journal-text" id="jNat" lang="${F.tgt}">${F.clickable(ev.versao_natural)}</div>
        <p class="journal-hint">Toque numa palavra para ver a tradução e salvar.</p>
      </div>` : ''}
      ${ev.vocabulario.length ? `<div class="card journal-sec"><h3>Vocabulário para levar</h3><ul class="journal-vocab">${ev.vocabulario.map((x, i) => `<li><div class="vt"><b lang="${F.tgt}">${F.esc(x.palavra)}</b> <span class="muted">— ${F.esc(x.traducao)}</span>${x.exemplo ? `<div class="ex" lang="${F.tgt}">${F.esc(x.exemplo)}</div>` : ''}</div><button class="tool ${F.vocab.has(x.palavra) ? '' : 'primary'}" data-v="${i}">${F.vocab.has(x.palavra) ? 'Salva ✓' : '+ Minhas palavras'}</button></li>`).join('')}</ul></div>` : ''}
      ${ev.pergunta_seguimento ? `<div class="card journal-sec journal-follow"><h3>Para continuar escrevendo <span class="spacer"></span><button class="tool" id="jSayF" aria-label="Ouvir a pergunta">🔊</button></h3>
        <div class="journal-text" id="jFollowQ" lang="${F.tgt}">${F.clickable(ev.pergunta_seguimento)}</div>
        <button class="btn btn-secondary" id="jReply" style="width:100%">Responder</button></div>` : ''}
      <div class="journal-endbtns">
        ${fromPlan ? '<button class="btn btn-primary" id="jPlan">Voltar ao plano</button>' : ''}
        <button class="btn btn-ghost" id="jNew">Nova entrada</button>
      </div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const fg = v.querySelector('.journal-ring .fg'); if (fg) fg.style.strokeDashoffset = C * (1 - ev.nota / 100); }));
    const mk = v.querySelector('#jMarked');
    const showErr = m => {
      mk.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); m.classList.add('sel');
      const e = errs[+m.dataset.i];
      F.popover(m, `<div class="journal-popt">${F.esc(e.tipo)}</div><div class="journal-popfix" lang="${F.tgt}"><del>${F.esc(e.original)}</del> → <ins>${F.esc(e.corrigido)}</ins></div><div class="small">${F.esc(e.explicacao)}</div>
        ${e.corrigido ? `<div class="row" style="gap:6px;margin-top:8px"><button class="tool" data-act="say">🔊 Ouvir</button></div>` : ''}`, { say: () => F.say(e.corrigido) });
    };
    mk.addEventListener('click', e => { const m = e.target.closest('.journal-err'); if (m) showErr(m); });
    mk.addEventListener('keydown', e => { const m = e.target.closest('.journal-err'); if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showErr(m); } });
    const nat = v.querySelector('#jNat'); if (nat) F.bindLookup(nat, () => ev.versao_natural);
    const fq = v.querySelector('#jFollowQ'); if (fq) F.bindLookup(fq, () => ev.pergunta_seguimento);
    const on = (id, fn) => { const el = v.querySelector('#' + id); if (el) el.onclick = fn; };
    on('jSayFix', () => F.say(ev.texto_corrigido)); on('jSayNat', () => F.say(ev.versao_natural)); on('jSayF', () => F.say(ev.pergunta_seguimento));
    v.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { const x = ev.vocabulario[+b.dataset.v]; F.vocab.add(x.palavra, x.traducao, x.exemplo); b.textContent = 'Salva ✓'; b.classList.remove('primary'); });
    on('jReply', () => {
      cur = { text:'', free:false, cont:{ parentId:r.id, prev:(r.ev.texto_corrigido || r.text).slice(0, 1500), question:ev.pergunta_seguimento }, mode:cur.mode, showTr:false };
      saveDraft(); tab = 'write'; render(); window.scrollTo(0, 0); setTimeout(() => { const ta = body.querySelector('#jTa'); ta && ta.focus({ preventScroll:true }); }, 50);
    });
    on('jNew', () => { tab = 'write'; render(); window.scrollTo(0, 0); });
    on('jPlan', () => F.open('plan'));
  }

  /* ----- histórico ----- */
  function renderHistory(v){
    const j = (F.ext().journal || []).slice().sort((a, b) => a.ts - b.ts);
    if (!j.length) { v.innerHTML = `<div class="card journal-empty">📓<br>Seu diário ainda está vazio.<br>Escreva a primeira entrada — leva 10 minutos.</div><button class="btn btn-primary" id="jStart">Escrever agora</button>`; v.querySelector('#jStart').onclick = () => { tab = 'write'; render(); }; return; }
    const sc = j.map(x => +x.score || 0), avg = Math.round(sc.reduce((a, b) => a + b, 0) / sc.length), best = Math.max(...sc);
    const last = st().last;
    v.innerHTML = `<div class="card journal-sec"><h3>Sua evolução</h3>${chartSVG(j.slice(-30))}<div class="journal-tip" id="jTip" aria-live="polite">${j.length > 1 ? 'Toque num ponto para ver a nota.' : 'Escreva mais entradas para ver a curva.'}</div>
        <div class="journal-stats"><div><b>${j.length}</b><span>entradas</span></div><div><b>${avg}</b><span>média</span></div><div><b>${best}</b><span>melhor nota</span></div></div></div>
      ${j.slice().reverse().map(x => `<div class="card journal-entry"><div class="row"><div class="meta"><div class="d">${F.esc(fmtDate(x.ts))}${x.parent ? ' · continuação' : ''}</div><div class="p">${F.esc((x.prompt || '').slice(0, 140))}</div></div><span class="journal-badge ${scoreCls(+x.score || 0)}">${+x.score || 0}</span></div>
        <details class="journal-det"><summary>Ler texto</summary><div class="body" lang="${F.tgt}">${F.esc(x.text || '')}</div>${x.fixed && x.fixed.trim() !== (x.text || '').trim() ? `<div class="journal-popt" style="margin-top:8px">Corrigido</div><div class="fixed" lang="${F.tgt}">${diffHTML(x.text || '', x.fixed)}</div>` : ''}
        <div class="acts">${x.text ? `<button class="tool" data-say="${F.esc(x.id)}">🔊 Ouvir</button>` : ''}${last && last.id === x.id && last.ev ? `<button class="tool primary" data-open="1">Ver correção completa</button>` : ''}</div></details></div>`).join('')}`;
    v.querySelectorAll('[data-say]').forEach(b => b.onclick = () => { const x = j.find(y => y.id === b.dataset.say); x && F.say(x.fixed || x.text); });
    v.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { shown = { ...st().last, isNew:false }; tab = 'result'; render(); window.scrollTo(0, 0); });
    const tip = v.querySelector('#jTip'), svg = v.querySelector('.journal-chart');
    if (svg) svg.addEventListener('click', e => { const g = e.target.closest('[data-k]'); if (!g) return; svg.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); g.classList.add('sel'); const x = j.slice(-30)[+g.dataset.k]; tip.textContent = `${fmtDate(x.ts)} · nota ${x.score}`; });
  }
  function chartSVG(list){
    const W = 320, H = 150, l = 26, r = 10, t = 10, b = 22, n = list.length;
    const X = i => n === 1 ? (l + W - r) / 2 : l + i * (W - l - r) / (n - 1), Y = s => t + (100 - s) * (H - t - b) / 100;
    const pts = list.map((x, i) => [X(i), Y(Math.max(0, Math.min(100, +x.score || 0)))]);
    const line = pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
    const area = n > 1 ? `M${pts[0][0].toFixed(1)},${Y(0)} L${line.replace(/ /g, ' L')} L${pts[n - 1][0].toFixed(1)},${Y(0)} Z` : '';
    const d0 = new Date(list[0].ts * 1000).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }), d1 = new Date(list[n - 1].ts * 1000).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
    return `<svg class="journal-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Notas das últimas ${n} entradas: ${list.map(x => x.score).join(', ')}">
      ${[0, 50, 100].map(s => `<line class="grid" x1="${l}" x2="${W - r}" y1="${Y(s)}" y2="${Y(s)}"/><text class="lbl" x="${l - 6}" y="${Y(s) + 3.5}" text-anchor="end">${s}</text>`).join('')}
      ${area ? `<path class="area" d="${area}"/>` : ''}${n > 1 ? `<polyline class="ln" points="${line}"/>` : ''}
      ${pts.map((p, i) => `<g data-k="${i}"><circle class="hit" cx="${p[0]}" cy="${p[1]}" r="12"/><circle class="dot" cx="${p[0]}" cy="${p[1]}" r="4.5"/><title>${F.esc(fmtDate(list[i].ts))}: ${list[i].score}</title></g>`).join('')}
      <text class="lbl" x="${l}" y="${H - 4}">${d0}</text>${n > 1 ? `<text class="lbl" x="${W - r}" y="${H - 4}" text-anchor="end">${d1}</text>` : ''}
    </svg>`;
  }

  render();
  if (F.aiAvailable()) ensureTranslations();
}

F.register({
  id:ID, title:'Diário', icon:'📓', desc:'Escreva sobre o seu dia e receba correção', order:40, big:false,
  subtitle(){
    try {
      const j = F.ext().journal || [], last = j[j.length - 1];
      if (last && dayOf(last.ts) === F.today()) return `Escrito hoje ✓ nota ${last.score}`;
      return shortPt(todayPrompt().pt);
    } catch(e){ return 'Escreva sobre o seu dia e receba correção'; }
  },
  open,
});
})();
