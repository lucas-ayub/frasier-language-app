# Frasier — activity modules contract (ext/)

Frasier is a single-page PWA (index.html, vanilla JS, no framework, no build). UI language: **Brazilian Portuguese**.
The user studies one course at a time: source language `F.src` ('pt' or 'en') → target language `F.tgt` ('es','fr','de','it','en').
Goal of these modules: turn the app into a complete 30–40 min/day self-study routine (like a tutor), beyond cloze sentences.

## Files
- `index.html` — main app (read its CSS tokens/classes to match the look: `.card`, `.btn .btn-primary/.btn-secondary/.btn-ghost`,
  `.tool`, `.tool.primary`, `.chips` (buttons with `.on`), `.tag`, `.seg`, `.section h3`, `.small`, `.muted`, `.row`, `.spacer`,
  `.mic` (big mic button with `.ring`, `.listening` state), `.sentence`, `.trans`, `.note`, `.typeactions`; CSS vars `--brand --sun --ok --bad --sky --ink --muted --surface --surface-2 --line --edge --r-s --r-m --r-l --fd (display font) --ft (text font)`; dark theme via prefers-color-scheme).
- `ext/core.js` — shared API `window.F` (READ IT FULLY before coding). Do not edit it; if you need something missing, implement it inside your module and mention it in your final report.
- `ext/m-<id>.js` — ONE file per module, plain script (no import/export), wrapped in an IIFE, `"use strict"`.
  Put module CSS in a `<style>` element you inject once (prefix all classes with your module id, e.g. `.talk-…`).

## Registering
```js
F.register({ id:'talk', title:'Conversa', icon:'💬', desc:'Converse por voz ou texto', order:30, big:false,
             subtitle(){ return '…dynamic line for the home card…'; },
             open(body, ctx){ /* render into body (an empty div). ctx.setTitle(t), ctx.close(), ctx.onClose(fn), ctx.arg */ } });
```
Home shows a card per module; tapping it calls `open`. The back button closes. Time spent is logged automatically per module id.
Module ids (fixed): `plan` (Plano do dia), `sentence` (Frase inteira), `talk` (Conversa), `journal` (Diário / escrita), `read` (Leitura e notícias), `words` (Minhas palavras — registered by the read module).
`ctx.arg` lets other modules open yours with a parameter, e.g. `F.open('talk', { scenario:'restaurante', minutes:8 })` — the plan module will call `F.open(id, { fromPlan:true, minutes:N })`; when your activity finishes a meaningful unit, call `F.planDone && F.planDone(id)` and show a "Voltar ao plano" button if `ctx.arg?.fromPlan`.

## Key API (see core.js)
- `F.ai(promptOrMessages, { system, json, schema, temperature, maxTokens })` → Gemini (gemini-2.5-flash) via Firebase AI Logic, free.
  Messages: `[{role:'user'|'model', text}]`. With `json:true` returns a parsed object (give the exact JSON shape in the prompt; `schema` optional).
  Errors have `.friendly` (pt-BR message) — always catch and show `F.errorBox(err, 'retryBtnId')` with a retry. Needs internet.
  Keep prompts compact; prefer one call per user action. Use `temperature` low (0.2) for grading, ~0.8 for conversation.
- `F.tgtName`/`F.srcName` (Portuguese names: 'espanhol', 'português'…), `F.tgtNameEn`, `F.explainLang` (language for explanations to the learner: 'português do Brasil' or 'English').
- `F.level()` → 'A1'..'C1' (learner's CEFR level, chosen or estimated). Adapt difficulty to it. `F.setLevel(lv)`.
- `F.say(text, {rate})` → Promise resolved when TTS ends (target-language voice). `F.stopSpeech()`.
- `F.canListen()`, `F.listen({ onInterim })` → Promise<string> (speech recognition in the target language; resolves '' on silence). `F.stopListen()`.
  iPhone Safari supports it; Firefox doesn't — always offer typing as fallback.
- `F.clickable(text)` → HTML where every word is a tappable `<span class="w">`; `F.bindLookup(containerEl, ctxFn?)` shows a translation popover with "+ Minhas palavras".
- `F.vocab.add(word, translation, context)`, `.list()`, `.due()`, `.grade(word, ok)`, `.remove`, `.has`.
- `F.store(moduleId)` → persistent object for your module (synced to the cloud; keep it small: < 30 KB; set `_ts = F.nowS()` when you change it, then `F.save()`).
- `F.addPoints(n)` (points), `F.logTime(id, min)` (automatic, rarely needed), `F.todayLog()`.
- `F.esc`, `F.toast`, `F.loading(msg)`, `F.errorBox(err, retryId)`, `F.micSVG`, `F.shuffle`, `F.strip` (remove accents), `F.today()` (day number).
- Sentence data (for `sentence` module): globals from index.html `IDX` ({total, chunk, levels:[{name,start,end}]}), `HIDDEN` (Set of removed idx),
  `S.prog` ({idx: [level 0-4, dueDay, lastSeenSec]}), `await ensureChunks(ids)`, `sent(idx)` → `[target, sourceTranslation, clozeStart, clozeLen, id, id]`.

## Quality bar
- Mobile first (390 px wide, thumb reach), big tap targets, works in light and dark theme, no horizontal scroll.
- Everything the learner reads in the UI is pt-BR; target-language content is in the target language.
- Feedback must be encouraging and specific, like a good teacher: what was wrong, why, the corrected version, a more natural version.
- Never block the UI on AI without a visible loading state; keep the conversation/answers responsive.
- No external libraries, no new network hosts except the Firebase AI endpoint (via F.ai) and any public CORS API you justify (e.g. Wikinews/Wikipedia API with `origin=*`).
- Test with Playwright (python, Chrome at /usr/bin/google-chrome, `--no-sandbox`) against a local server:
  `cd /home/claude/frasier && (python3 -m http.server PORT >/dev/null 2>&1 &)` in the SAME bash command as the test (background processes die between commands).
  The AI endpoint is NOT reachable from this machine: intercept `https://firebasevertexai.googleapis.com/**` with `page.route` and return realistic
  Gemini responses: `{"candidates":[{"content":{"parts":[{"text": "<your JSON or text>"}]}}]}`. Speech APIs: test the typing path; stub speech if needed.
  Seed `localStorage['frasier-prefs'] = {"active":"pt-es","list":["pt-es"]}` and a state key `frasier-pt-es-v1` with `{"dv":2,"hideAccountTip":true,"prog":{...},"stats":{"points":0,"days":{}},"settings":{"goal":30,"mode":"mc"}}` before reload.
  Take screenshots (390x844, light and dark) and LOOK at them; fix ugly things. Make sure there are no console errors.
- Only write your own `ext/m-<id>.js` (and scratch files under /tmp/<id>_work). Do not modify index.html, core.js, sw.js or other modules.
