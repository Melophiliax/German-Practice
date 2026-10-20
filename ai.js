/* KI-Funktionen (Google Gemini). Der API-Key liegt NUR im localStorage dieses Browsers – nie im Repo. */
const GK='dtrainer.gem',BK='dtrainer.bank',FL={};
let G=JSON.parse(localStorage.getItem(GK)||'{"key":"","model":"gemini-3.8-flash","auto":true}'),B=JSON.parse(localStorage.getItem(BK)||'{}');
if(!G.model||/^gemini-2\./.test(G.model)){G.model='gemini-3.8-flash';localStorage.setItem(GK,JSON.stringify(G))} /* alte Modelle migrieren */
const saveB=()=>localStorage.setItem(BK,JSON.stringify(B));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const md=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');

async function gem(contents,{json=false,system=''}={}){
  if(!G.key)throw new Error('Kein API-Key – bitte unter ⚙ eintragen.');
  const body={contents,generationConfig:{temperature:json?1:.4}};
  if(json)body.generationConfig.responseMimeType='application/json';
  if(system)body.systemInstruction={parts:[{text:system}]};
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(G.model)}:generateContent`,
    {method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':G.key},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error?.message||('HTTP '+r.status));
  return(j.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');
}
function validQ(q){
  if(!q||typeof q.q!=='string'||!q.q.trim())return false;
  const A=[].concat(q.answer||[]).filter(a=>typeof a==='string'&&a.trim());if(!A.length)return false;
  if(q.type==='listen'&&typeof q.audio!=='string')return false;
  if(q.type==='mc'||q.type==='listen')return Array.isArray(q.options)&&q.options.length>=2&&q.options.includes(A[0]);
  if(q.type==='fill'||q.type==='translate')return true;
  if(q.type==='order')return Array.isArray(q.words)&&q.words.length>=3&&norm(q.words.join(' '))===norm(A[0]);
  return false;
}
async function aiQs(prompt){
  let t=(await gem([{role:'user',parts:[{text:prompt}]}],{json:true})).replace(/```json|```/g,'').trim();
  const a=t.indexOf('['),b=t.lastIndexOf(']');if(a<0)throw new Error('Unerwartete KI-Antwort');
  return JSON.parse(t.slice(a,b+1)).filter(validQ).map(q=>({...q,explain:q.explain||'',options:q.options?shuffle(q.options):undefined,ai:1}));
}
const FORMAT=`Formate (genau so, Feldnamen exakt):
{"type":"mc","q":"...","options":["a","b","c"],"answer":"<exakt eine der Optionen>","explain":"kurze Erklärung"}
{"type":"fill","q":"Satz mit ___","answer":"Wort","explain":"..."}
{"type":"translate","q":"Übersetze: <Satz>","answer":["Variante 1","Variante 2"],"explain":"..."}
{"type":"order","q":"Bilde den Satz.","words":["Wort1","Wort2","..."],"answer":"Satz in richtiger Reihenfolge","explain":"..."}
Antworte NUR mit einem JSON-Array.`;
const lvl=t=>t.level==='Prüfung'?'B1':t.level;
function prompt(t,d){
  const seen=[...d.questions,...(B[t.id]||[])].map(q=>q.q).slice(-40);
  return `Du bist Prüfer für Goethe-Zertifikat/telc. Erstelle 8 NEUE, korrekte Übungsaufgaben für Deutschlernende, Niveau ${lvl(t)}, Thema: "${d.title}". Inhalt/Regeln: ${d.explanation}
${t.group==='Wortschatz'?'Fokus: NEUE, prüfungsrelevante Wörter der Goethe-B1-Wortliste (Artikel, Plural, Bedeutung, Kollokationen); keine Wörter wiederholen, die schon vorkamen.':''}
Mische die Typen mc, fill, translate, order. Alle Sätze müssen grammatisch einwandfrei sein, es gibt genau eine richtige Lösung (bei fill ein Wort).
${FORMAT}
Diese Aufgaben gab es schon – NICHT wiederholen: ${JSON.stringify(seen)}`;
}
const examKind=id=>/^ex_(lesen|sprachbausteine)/.test(id)?'read':id==='ex_hoeren'?'listen':null;
function examPrompt(t,d,kind){
  const ex=JSON.stringify(d.questions[0]).slice(0,900);
  return kind==='listen'
   ?`Erstelle einen NEUEN Hörverstehen-Satz im Stil Goethe/telc B1 (Thema: Alltag/Arbeit/Reisen): ein gesprochener Text (Ansage, Nachricht oder Dialog, 60–90 Wörter) und 4 Aufgaben. Jede Aufgabe: {"type":"listen","q":"...","audio":"<der gesamte Hörtext, in allen Aufgaben identisch>","options":["a","b","c"],"answer":"<exakt eine Option>","explain":"..."}. Fragen mit Optionen a/b/c oder ["Richtig","Falsch"]. Beispielaufgabe: ${ex}\nAntworte NUR mit einem JSON-Array.`
   :`Erstelle einen NEUEN Prüfungssatz im Stil von „${d.title}“ (Goethe/telc B1): ein neuer Text (100–150 Wörter, Alltag) und 5 passende Aufgaben. Jede Aufgabe: {"type":"mc","q":"...","options":[...],"answer":"<exakt eine Option>","explain":"...","passage":"<der gesamte Text, in allen Aufgaben identisch>"}. Halte dich an das Aufgabenformat des Beispiels (Optionen!). Bei Lückentexten: Lücken (1)–(6) im Text, Frage „Lücke n“. Beispiel: ${ex}\nAntworte NUR mit einem JSON-Array.`;
}
const unseen=(id,d)=>[...d.questions,...(B[id]||[])].filter(q=>!(S.seen||{})[kq(q)]).length;
function pick(id,d){
  const pool=[...d.questions,...(B[id]||[])],s=S.seen||{};
  return[...shuffle(pool.filter(q=>!s[kq(q)])),...shuffle(pool.filter(q=>s[kq(q)]))].slice(0,10);
}
function markSeen(q){S.seen=S.seen||{};S.seen[kq(q)]=1}
function aiBox(id,t,d){
  if(!G.key)return'<button class=sec onclick="settings()">✨ KI-Aufgaben aktivieren (Gemini-Key unter ⚙)</button>';
  const k=examKind(id);if(d.ordered&&!k)return'';
  if(G.auto&&!d.ordered&&unseen(id,d)<10)setTimeout(()=>fill(id,true),0);
  return`<p id=aist class=tag>${d.ordered?'':'KI-Bank: '+(B[id]||[]).length+' Aufgaben'}</p><button class=sec onclick="fill('${id}')">✨ ${d.ordered?'Neuen Prüfungssatz üben (KI)':'Neue Aufgaben erzeugen (KI)'}</button>`;
}
async function fill(id,auto){
  if(FL[id])return;const t=topics.find(x=>x.id===id),d=await load(t.file),st=m=>{const e=$('#aist');if(e)e.textContent=m};
  FL[id]=1;st('✨ KI erzeugt neue Aufgaben …');
  try{
    const k=examKind(id);
    if(k){
      const qs=await aiQs(examPrompt(t,d,k));if(qs.length<3)throw new Error('Zu wenige gültige Aufgaben – nochmal versuchen.');
      qs.forEach(q=>{if(q.type==='mc'&&k==='listen'){q.type='listen'}});
      Q={id,qs,i:0,ok:0,min:d.minutes,exam:true,ai:1};
      app.innerHTML=`<h1>Neuer Prüfungssatz</h1><p>${qs.length} frische Aufgaben im Stil „${esc(d.title)}“. Zählt nicht für den Fortschritt.</p><button class=go onclick="begin()">Starten</button>`;
    }else{
      const qs=await aiQs(prompt(t,d)),bank=B[id]=B[id]||[],have=new Set([...bank,...d.questions].map(kq));let n=0;
      qs.forEach(q=>{if(!have.has(kq(q))){bank.push(q);have.add(kq(q));n++}});
      B[id]=bank.slice(-200);saveB();st(`✨ ${n} neue Aufgaben hinzugefügt (Bank: ${B[id].length}).`);
    }
  }catch(e){st('KI-Fehler: '+e.message)}
  FL[id]=0;
}
async function customVocab(){
  if(!G.key)return settings();
  const th=prompt('Thema für neuen Wortschatz (z. B. Bank, Arzt, Bewerbung, Auto):');if(!th)return;
  app.innerHTML='<p>✨ KI erzeugt Wortschatz …</p>';
  try{
    const qs=await aiQs(`Erstelle 10 NEUE Wortschatz-Aufgaben (Goethe-B1-Wortliste) zum Thema "${th}" für B1-Lernende. Prüfe Artikel, Plural, Bedeutung (Englisch in "explain"), Kollokationen oder Lückensätze. Nur Typen mc und fill. Alles muss korrekt sein.\n${FORMAT}`);
    if(qs.length<3)throw new Error('Zu wenige gültige Aufgaben – nochmal versuchen.');
    Q={id:'custom',qs,i:0,ok:0,ai:1};show();
  }catch(e){app.innerHTML=`<p>KI-Fehler: ${esc(e.message)}</p><button onclick="home()">Zurück</button>`}
}
/* ---- Frage zur Aufgabe an den KI-Tutor ---- */
const nextBtns=()=>'<button class=sec onclick="chat()">💬 Frage zu dieser Aufgabe</button><div id=chat></div><button class=go onclick="Q.i++;show()">Weiter</button>';
const SYS='Du bist ein geduldiger Deutschlehrer für Lernende (A1–B1, Goethe/telc). Antworte in der Sprache der Frage (Standard: Englisch), deutsche Beispiele auf Deutsch. Kurz (max. ca. 150 Wörter): nenne die Regel, erkläre, warum die richtige Antwort stimmt und (falls relevant) warum die Antwort des Lernenden nicht stimmt, gib 2 kurze Beispielsätze. Erfinde nichts; wenn du unsicher bist, sag es.';
function chat(){
  if(!G.key)return settings();
  if($('#qin'))return;
  Q.h=[];$('#chat').innerHTML='<div id=msgs></div><textarea id=qin rows=2 placeholder="Deine Frage … (z. B. Why Dativ here?)"></textarea><button class=go onclick="send()">Fragen</button>';
  $('#qin').focus();
}
async function send(){
  const t=$('#qin').value.trim();if(!t)return;$('#qin').value='';Q.h=Q.h||[];const q=cur(),m=$('#msgs');
  const ctx=JSON.stringify({aufgabe:q.q,text:q.passage||q.audio,optionen:q.options,richtige_antwort:q.answer,erklaerung:q.explain});
  Q.h.push({role:'user',parts:[{text:Q.h.length?t:`Aufgabe: ${ctx}\nMeine Antwort: ${Q.last}\n\nFrage: ${t}`}]});
  m.innerHTML+=`<blockquote>${esc(t)}</blockquote><div id=wait class=tag>…</div>`;
  try{const a=await gem(Q.h,{system:SYS});Q.h.push({role:'model',parts:[{text:a}]});$('#wait').outerHTML=`<p>${md(a)}</p>`}
  catch(e){Q.h.pop();$('#wait').outerHTML=`<p class=tag>KI-Fehler: ${esc(e.message)}</p>`}
}
/* ---- Einstellungen ---- */
function settings(){
  stop();
  app.innerHTML=`<h1>Einstellungen</h1><p>Gemini API-Key (aus Google AI Studio). Er wird <b>nur in diesem Browser</b> gespeichert, nicht im GitHub-Repo.</p>
<input id=gk type=password autocomplete=off placeholder="API-Key" value="${esc(G.key)}"><input id=gm value="${esc(G.model)}" aria-label="Modell">
<label style="display:flex;gap:8px;align-items:center;margin:8px 0;font-family:system-ui"><input id=ga type=checkbox style="width:auto;min-height:0" ${G.auto?'checked':''}> Neue Aufgaben automatisch nachladen</label>
<button class=go onclick="saveSettings()">Speichern</button><button class=sec onclick="testG()">Verbindung testen</button><p id=gs class=tag></p>
<h4>Sicherheit</h4><p class=tag>Jeder, der deinen Browser benutzt, kann den Key sehen. Beschränke ihn in der Google-Konsole auf deine Website (HTTP-Referrer <code>https://DEIN-NAME.github.io/*</code>) und setze ein Kontingent-Limit. Aufgaben und Fragen werden an Google gesendet.</p>
<button class=sec onclick="B={};saveB();$('#gs').textContent='KI-Aufgaben gelöscht.'">KI-Aufgaben löschen</button><button onclick="home()">Zurück</button>`;
}
function saveSettings(){G={key:$('#gk').value.trim(),model:$('#gm').value.trim()||'gemini-3.8-flash',auto:$('#ga').checked};localStorage.setItem(GK,JSON.stringify(G));$('#gs').textContent='Gespeichert.'}
async function testG(){saveSettings();$('#gs').textContent='Teste …';try{const a=await gem([{role:'user',parts:[{text:'Antworte nur mit: OK'}]}]);$('#gs').textContent='✔ Verbunden: '+a.trim().slice(0,40)}catch(e){$('#gs').textContent='✘ '+e.message}}
