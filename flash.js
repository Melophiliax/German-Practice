/* Bildkarten: Emoji (immer) + Foto von Wikipedia/Wikimedia (CC-Lizenzen, optional). Keine KI-Bilder. */
const CK='dtrainer.cards',WK='dtrainer.wiki',INT=[0,1,2,4,8,16];
let CARDS=[],WIKI=JSON.parse(localStorage.getItem(WK)||'{}'),F={};
async function loadCards(){if(!CARDS.length){let c=[];try{c=await getJSON('vocabulary/cards.json')}catch(e){}CARDS=[...c,...JSON.parse(localStorage.getItem(CK)||'[]')]}return CARDS}
const cstate=c=>(S.cards=S.cards||{})[c.de]||{b:0,d:0};
async function photo(c){
  const k=c.wiki||c.de;if(k in WIKI)return WIKI[k];
  try{
    const r=await fetch('https://de.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(k.replace(/ /g,'_')));
    if(!r.ok){WIKI[k]='';localStorage.setItem(WK,JSON.stringify(WIKI));return''}
    const j=await r.json(),u=j.type!=='disambiguation'&&j.thumbnail&&j.thumbnail.source;
    WIKI[k]=u?{u,p:(j.content_urls&&j.content_urls.desktop&&j.content_urls.desktop.page)||''}:'';
    localStorage.setItem(WK,JSON.stringify(WIKI));return WIKI[k];
  }catch(e){return''}
}
const picHTML=c=>`<div class=pic id=pic data-k="${esc(c.de)}"><span class=emoji>${c.emoji||'🔤'}</span></div><div class=attr id=attr></div>`;
async function loadPic(c){
  if(S.nophoto||c.wiki==='-')return;
  const p=await photo(c),e=$('#pic');if(!p||!e||e.dataset.k!==c.de)return;
  e.insertAdjacentHTML('beforeend',`<img src="${esc(p.u)}" alt="${esc(c.de)}" referrerpolicy="no-referrer" onload="this.parentNode.classList.add('ph')" onerror="this.remove()">`);
  const a=$('#attr');if(a&&p.p)a.innerHTML=`Foto: <a href="${esc(p.p)}" target="_blank" rel="noopener">Wikipedia/Wikimedia Commons</a> (freie Lizenz)`;
}
async function decks(){
  stop();const all=await loadCards(),cats=[...new Set(all.map(c=>c.cat))],now=Date.now();
  app.innerHTML=`<h1>Bildkarten</h1><p class=tag>Emoji + echte Fotos von Wikipedia. Wiederholung nach Lernstand (Karten) oder Bild-Quiz.</p>`+
  ['Alle',...cats].map(k=>{const p=k==='Alle'?all:all.filter(c=>c.cat===k),due=p.filter(c=>cstate(c).d<=now).length,kn=p.filter(c=>cstate(c).b>=3).length;
    return`<div style="display:flex;gap:6px;align-items:center;margin:8px 0;font-family:system-ui"><span style="flex:1">${esc(k)}<br><small>${kn}/${p.length} gelernt · ${due} fällig</small></span><button style="width:auto" onclick="startCards('${k}','flash')">Karten</button><button style="width:auto" onclick="startCards('${k}','quiz')">Quiz</button></div>`}).join('')+
  `<label style="display:flex;gap:8px;align-items:center;margin:10px 0;font-family:system-ui"><input type=checkbox style="width:auto;min-height:0" ${S.nophoto?'':'checked'} onchange="S.nophoto=!this.checked;save()"> Fotos von Wikipedia laden</label>`+
  (G.key?'<button class=sec onclick="newWords()">✨ Neue Wörter (KI nur für Text; Bilder von Wikipedia)</button>':'')+'<button onclick="home()">Zurück</button>';
}
async function startCards(cat,mode){
  const all=await loadCards(),p=cat==='Alle'?all:all.filter(c=>c.cat===cat);
  if(mode==='quiz'){
    Q={id:'pic',qs:shuffle(p).slice(0,10).map(c=>({type:'mc',q:'Was ist das? (mit Artikel)',pic:c,
      options:shuffle([c,...shuffle(all.filter(x=>x!==c&&x.cat===c.cat)).slice(0,3)]).map(x=>x.art+' '+x.de),answer:c.art+' '+c.de,
      explain:`${c.art} ${c.de} · ${c.pl?'Plural: '+c.pl:'kein Plural'} · ${c.en}`})),i:0,ok:0};
    return show();
  }
  let q=shuffle(p.filter(c=>cstate(c).d<=Date.now())).sort((a,b)=>cstate(a).b-cstate(b).b).slice(0,15);
  if(!q.length)q=shuffle(p).slice(0,15);
  F={q,i:0,flip:0,n:q.length};card();
}
function card(){
  const c=F.q[F.i];
  if(!c){stop();app.innerHTML=`<h1>Fertig 🎉</h1><p>${F.n} Karten geübt.</p><button class=go onclick="decks()">Zurück</button>`;return}
  app.innerHTML=`<div class=bar><i style="width:${F.i/F.q.length*100}%"></i></div><span class=tag>${F.i+1}/${F.q.length} · ${esc(c.cat)}</span>${picHTML(c)}`+
  (F.flip?`<h2 style="text-align:center">${c.art} ${esc(c.de)}</h2><p style="text-align:center">${c.pl?'Plural: die '+esc(c.pl):'kein Plural'} · <i>${esc(c.en)}</i></p><button class=sec onclick="say(F.q[F.i].art+' '+F.q[F.i].de)">🔊 Anhören</button><button class=go onclick="rate(1)">✔ Wusste ich</button><button onclick="rate(0)">✘ Noch nicht</button>`
   :`<h2 style="text-align:center">?</h2><p class=tag style="text-align:center">Wie heißt das auf Deutsch – mit Artikel?</p><button class=go onclick="flip()">Umdrehen</button>`);
  loadPic(c);
}
function flip(){F.flip=1;card();const c=F.q[F.i];say(c.art+' '+c.de)}
function rate(ok){
  const c=F.q[F.i],s=(S.cards=S.cards||{}),e=s[c.de]||{b:0,d:0};
  e.b=ok?Math.min(5,e.b+1):1;e.d=ok?Date.now()+INT[e.b]*864e5:Date.now();s[c.de]=e;save();
  if(!ok&&F.q.filter(x=>x===c).length<2)F.q.push(c);F.i++;F.flip=0;card();
}
async function newWords(){
  const th=prompt('Thema/Kategorie für neue Bildkarten (z. B. Küche, Sport, Obst, Reise):');if(!th)return;
  app.innerHTML='<p>✨ KI erzeugt Wörter …</p>';
  try{
    const have=(await loadCards()).map(c=>c.de).slice(0,200);
    let t=(await gem([{role:'user',parts:[{text:`Nenne 10 NEUE, gut bildlich darstellbare deutsche Nomen (Niveau A1–B1) zum Thema "${th}". Nicht diese: ${JSON.stringify(have)}. Antworte NUR mit einem JSON-Array aus Objekten {"cat":"${th}","art":"der|die|das","de":"Wort","pl":"Plural ohne Artikel oder leer","en":"English","emoji":"ein passendes Emoji","wiki":"exakter deutscher Wikipedia-Artikeltitel, nur wenn eindeutig, sonst -"}. Artikel und Plural müssen stimmen.`}]}],{json:true})).replace(/```json|```/g,'').trim();
    const a=JSON.parse(t.slice(t.indexOf('['),t.lastIndexOf(']')+1)).filter(c=>c&&['der','die','das'].includes(c.art)&&typeof c.de==='string'&&c.de&&typeof c.en==='string');
    if(a.length<3)throw new Error('Zu wenige gültige Wörter.');
    const mine=JSON.parse(localStorage.getItem(CK)||'[]'),ex=new Set(CARDS.map(c=>c.de));
    a.forEach(c=>{if(!ex.has(c.de)){mine.push({cat:c.cat||th,art:c.art,de:c.de,pl:c.pl||'',en:c.en,emoji:c.emoji||'🔤',wiki:c.wiki||'-'})}});
    localStorage.setItem(CK,JSON.stringify(mine));CARDS=[];
  }catch(e){alert('KI-Fehler: '+e.message)}
  decks();
}
