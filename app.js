/* Deutsch Trainer v2 – Vanilla JS. Data: topics/manifest.json + one JSON per topic. */
const $=s=>document.querySelector(s),app=$('#app'),KEY='dtrainer.v1';
let S=JSON.parse(localStorage.getItem(KEY)||'{"m":{},"err":[],"theme":""}'),topics=[],cache={},Q={};
const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
const norm=s=>(s||'').toLowerCase().replace(/[.,!?;:"„“]/g,'').replace(/\s+/g,' ').trim();
const shuffle=a=>[...a].sort(()=>Math.random()-.5),cur=()=>Q.qs[Q.i];
const words=t=>t.trim().split(/\s+/).filter(Boolean),kq=q=>q.q+(q.answer?[].concat(q.answer)[0]:'');
const sim=(g,a)=>{const G=norm(g).split(' '),A=norm(a).split(' ');return A.filter(w=>G.includes(w)).length/A.length};
const theme=()=>{S.theme=S.theme==='dark'?'light':'dark';save();document.documentElement.dataset.theme=S.theme};

async function init(){
  if(S.theme)document.documentElement.dataset.theme=S.theme;
  try{topics=await getJSON('topics/manifest.json');home()}
  catch(e){app.innerHTML='<p>Daten nicht ladbar: <code>'+e.message+'</code><br>Prüfe, ob manifest.json im Repo liegt und über HTTP(S) geöffnet wird.</p>'}
}
/* Funktioniert mit Ordnern (topics/…) UND mit flacher Ablage im Repo-Root */
async function getJSON(f){
  for(const p of [f,f.split('/').pop()]){try{const r=await fetch(p);if(r.ok)return await r.json()}catch(e){}}
  throw new Error('nicht gefunden: '+f);
}
const load=async f=>cache[f]||(cache[f]=await getJSON(f));
function stop(){clearInterval(Q.t);speechSynthesis.cancel();if(Q.rec){try{Q.rec.stop()}catch(e){}Q.rec=null}}

function home(){
  stop();let h='<h1>Dashboard</h1>';
  ['A1','A2','B1','Prüfung'].forEach(L=>{
    const ts=topics.filter(t=>t.level===L),p=Math.round(ts.reduce((a,t)=>a+(S.m[t.id]?.best||0),0)/(ts.length||1));
    h+=`<section><h3>${L==='Prüfung'?'Prüfungstraining Goethe & telc B1':L}<small>${p}%</small></h3><div class=bar><i style="width:${p}%"></i></div>`;
    let g='';ts.forEach(t=>{if(t.group!==g){g=t.group;h+=`<h4>${g}</h4>`}
      h+=`<button class=topic onclick="intro('${t.id}')">${t.title}<small>${S.m[t.id]?.best||0}%</small></button>`});
    h+='</section>'});
  app.innerHTML=h+`<h3></h3><button class=go onclick="decks()">🖼 Bildkarten & Vokabeln</button><button class=sec onclick="customVocab()">✨ Eigenes Wortschatz-Thema (KI)</button><button class=sec onclick="review()">🔁 Fehler wiederholen (${S.err.length})</button>`;
}
async function intro(id){
  const t=topics.find(t=>t.id===id),d=await load(t.file);
  Q={id,d,qs:d.ordered?d.questions:pick(id,d),i:0,ok:0,min:d.minutes,exam:t.level==='Prüfung'};
  app.innerHTML=`<h1>${d.title}</h1><p>${d.explanation}</p>${d.minutes?`<p class=tag>Empfohlene Zeit: ${d.minutes} Min. · Bestanden ab 60 %</p>`:''}<button class=go onclick="begin()">Üben starten</button>${aiBox(id,t,d)}`;
}
function begin(){
  if(Q.d&&!Q.d.ordered)Q.qs=pick(Q.id,Q.d);
  if(Q.min){Q.end=Date.now()+Q.min*60000;Q.t=setInterval(()=>{const s=Math.max(0,Math.round((Q.end-Date.now())/1000)),e=$('#timer');
    if(e)e.textContent=`⏱ ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;if(!s)finish()},1000)}
  show();
}
function review(){
  if(!S.err.length)return app.innerHTML='<p>Keine Fehler gespeichert. 🎉</p><button onclick="home()">Zurück</button>';
  Q={id:'review',review:1,qs:shuffle(S.err).slice(0,10).map(e=>e.q),i:0,ok:0};show();
}
function show(){
  const q=cur();if(!q)return finish();Q.done=0;Q.h=null;markSeen(q);
  let h=`<div class=bar><i style="width:${Q.i/Q.qs.length*100}%"></i></div><span class=tag>${q.type} · ${Q.i+1}/${Q.qs.length}</span> <span id=timer class=tag></span>`;
  if(q.passage)h+=`<blockquote>${q.passage.replace(/\n/g,'<br>')}</blockquote>`;
  if(q.pic)h+=picHTML(q.pic);
  if(q.audio)h+=`<button class=sec onclick="say(cur().audio)">🔊 Anhören</button>`;
  h+=`<h2>${q.q}</h2><div id=ans>`;
  if(q.type==='order'){Q.pick=[];Q.order=shuffle(q.words.map((_,i)=>i));h+='<div id=line class=chips></div><div id=pool class=chips></div><button class=go onclick="grade(Q.pick.map(i=>cur().words[i]).join(\' \'))">Prüfen</button>'}
  else if(q.type==='write'||q.type==='talk')h+=`<p class=tag>${q.hint||''}</p><textarea id=txt rows=9 oninput="wc()" autocapitalize=sentences></textarea><p id=wc class=tag></p>`+(q.type==='talk'?'<button id=mic class=big onclick="dictate()">🎤 Diktieren</button>':'')+'<button class=go onclick="gradeText()">Auswerten</button>';
  else if(q.type==='speak')h+='<button class=big onclick="mic()">🎤 Sprechen</button><p id=heard class=tag></p><input id=txt placeholder="Oder tippen…"><button class=go onclick="grade(txt.value)">Prüfen</button>';
  else if(q.options)h+=q.options.map((o,i)=>`<button class=opt onclick="grade(cur().options[${i}],this)">${o}</button>`).join('');
  else h+='<input id=txt autocomplete=off autocapitalize=off placeholder="Antwort…" onkeydown="event.key===\'Enter\'&&grade(this.value)"><button class=go onclick="grade(txt.value)">Prüfen</button>';
  app.innerHTML=h+'</div><div id=fb></div><div id=nx></div>';
  if(q.pic)loadPic(q.pic);
  if(q.type==='order')draw();else if(q.type==='write'||q.type==='talk')wc();else if($('#txt'))$('#txt').focus({preventScroll:true});
}
const wc=()=>{const q=cur();$('#wc').textContent=`${words($('#txt').value).length} Wörter (mind. ${q.min})`};
function draw(){
  const q=cur();
  $('#line').innerHTML=Q.pick.map(i=>`<b onclick="Q.pick=Q.pick.filter(x=>x!=${i});draw()">${q.words[i]}</b>`).join('');
  $('#pool').innerHTML=Q.order.filter(i=>!Q.pick.includes(i)).map(i=>`<b onclick="Q.pick.push(${i});draw()">${q.words[i]}</b>`).join('');
}
function result(ok,html){
  Q.done=1;const q=cur(),key=kq(q);
  if(ok){Q.ok++;if(Q.review)S.err=S.err.filter(e=>kq(e.q)!==key)}
  else if(!S.err.some(e=>kq(e.q)===key))S.err.push({t:Q.id,q:{...q}});
  save();$('#fb').className=ok?'ok':'bad';$('#fb').innerHTML=html;
  $('#nx').innerHTML=nextBtns();
}
function grade(g,btn){
  if(Q.done||!g)return;Q.last=g;
  const q=cur(),ans=[].concat(q.answer),ok=ans.some(a=>q.type==='speak'?sim(g,a)>=.8:norm(a)===norm(g));
  if(q.options)document.querySelectorAll('.opt').forEach(b=>{b.disabled=1;if(norm(b.textContent)===norm(ans[0]))b.classList.add('ok')});
  if(btn&&!ok)btn.classList.add('bad');
  result(ok,(ok?'✔ Richtig!':`✘ Richtig wäre: <b>${ans[0]}</b>`)+(q.explain?`<p>${q.explain}</p>`:''));
}
/* Schreiben/Sprechen: regelbasierte Prüfung (Wortzahl + Pflichtpunkte) + Musterlösung */
function gradeText(){
  if(Q.done)return;const q=cur(),t=$('#txt').value,n=words(t).length;Q.last=t;
  const r=[[`Mindestens ${q.min} Wörter (du hast ${n})`,n>=q.min],...q.checks.map(c=>[c[0],new RegExp(c[1],'i').test(t)])];
  const ok=r.filter(x=>x[1]).length/r.length>=.7;
  result(ok,(ok?'✔ Gut – Kriterien weitgehend erfüllt.':'✘ Noch nicht ausreichend.')+'<p>'+r.map(x=>(x[1]?'✔ ':'✘ ')+x[0]).join('<br>')+`</p><p><b>Musterlösung:</b><br>${q.model.replace(/\n/g,'<br>')}</p>`);
}
function finish(){
  stop();const p=Math.round(Q.ok/Q.qs.length*100);
  if(!Q.review&&!Q.ai){const m=S.m[Q.id]||{best:0,n:0};m.best=Math.max(m.best,p);m.n++;S.m[Q.id]=m;save()}
  app.innerHTML=`<h1>${p}%</h1><p>${Q.ok} von ${Q.qs.length} richtig.</p>`+(Q.exam?`<p><b>${p>=60?'Bestanden (≥ 60 %)':'Noch nicht bestanden – 60 % sind nötig.'}</b></p>`:'')+'<button class=go onclick="home()">Zum Dashboard</button>';
}
function say(t){
  speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='de-DE';u.rate=.85;
  u.voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('de'))||null;speechSynthesis.speak(u);
}
const SR=()=>window.SpeechRecognition||window.webkitSpeechRecognition;
function mic(){
  const R=SR();if(!R)return $('#heard').textContent='Spracherkennung wird hier nicht unterstützt – bitte tippen.';
  const r=new R();r.lang='de-DE';$('#heard').textContent='Ich höre zu…';
  r.onresult=e=>{const t=e.results[0][0].transcript;$('#heard').textContent='🗣 '+t;grade(t)};
  r.onerror=()=>$('#heard').textContent='Nicht verstanden – nochmal oder tippen.';r.start();
}
function dictate(){
  const R=SR();if(!R)return alert('Spracherkennung wird hier nicht unterstützt – bitte tippen.');
  if(Q.rec){Q.rec.stop();return}
  const r=new R();r.lang='de-DE';r.continuous=true;
  r.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal){const t=$('#txt');t.value+=(t.value?' ':'')+e.results[i][0].transcript;wc()}};
  r.onend=()=>{Q.rec=null;const b=$('#mic');if(b)b.textContent='🎤 Diktieren'};
  r.start();Q.rec=r;$('#mic').textContent='⏹ Stopp';
}
init();
