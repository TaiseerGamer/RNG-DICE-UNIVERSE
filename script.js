const rarities=[
 {n:'Common',w:40,c:1,col:'#94a3b8'},
 {n:'Uncommon',w:22,c:3,col:'#22c55e'},
 {n:'Rare',w:15,c:8,col:'#3b82f6'},
 {n:'Epic',w:9,c:20,col:'#a855f7'},
 {n:'Legendary',w:5.5,c:50,col:'#f97316'},
 {n:'Mythic',w:3.5,c:120,col:'#ec4899'},
 {n:'Divine',w:2,c:300,col:'#eab308'},
 {n:'Celestial',w:1.2,c:750,col:'#22d3ee'},
 {n:'Transcendent',w:0.7,c:2000,col:'#f0f'},
 {n:'Impossible',w:0.4,c:5000,col:'#fff'},
 {n:'Glitched',w:0.1,c:15000,col:'#0f8'},
 {n:'???',w:0.01,c:100000,col:'#f04'}
];
const elems=['Fire','Water','Earth','Air','Lightning','Ice','Shadow','Light','Nature','Void','Crystal','Metal','Poison','Holy','Chaos'];
const mobs=['Dragon','Phoenix','Wolf','Serpent','Golem','Spirit','Titan','Kitsune','Kraken','Griffin'];

let S=JSON.parse(localStorage.getItem('rng2')||'{}');
S.coins=S.coins||0;S.rolls=S.rolls||0;S.best=S.best||'';S.pity=S.pity||0;S.pres=S.pres||0;
S.up=S.up||{luck:0,mag:0,auto:0,elem:0,crit:0,gold:0};S.hist=S.hist||[];S.col=S.col||{};

const $=id=>document.getElementById(id);
const fmt=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':''+Math.floor(n);
function save(){localStorage.setItem('rng2',JSON.stringify(S))}

let ctx;function beep(f){try{if(!ctx)ctx=new (window.AudioContext||webkitAudioContext)();const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=f;g.gain.value=.1;o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.07)}catch{}}

function pick(){
  const shift=S.up.luck*3+S.pres*2;
  const ws=rarities.map((r,i)=>i? r.w+shift*r.w/60 : Math.max(5,r.w-shift));
  if(S.pity>=50){let t=Math.random()*ws.slice(3).reduce((a,b)=>a+b,0),a=0;for(let i=3;i<ws.length;i++){a+=ws[i];if(t<a)return i}}
  let t=Math.random()*ws.reduce((a,b)=>a+b,0),a=0;for(let i=0;i<ws.length;i++){a+=ws[i];if(t<a)return i}return 0;
}

let busy=false;
function roll(){
 if(busy)return;busy=true;
 const d=$('dice');d.classList.remove('spin');void d.offsetWidth;d.classList.add('spin');beep(400);
 setTimeout(()=>{
  S.rolls++;const i=pick(),r=rarities[i];if(i>=3)S.pity=0;else S.pity++;
  const e=elems[Math.floor(Math.random()* (8+S.up.elem*2+2))%elems.length];
  const m=mobs[Math.floor(Math.random()*mobs.length)];
  let coins=r.c*( [1,1.2,1.5,2,3,5][S.up.mag] )*(1+S.pres*0.1)*(1+S.up.elem*0.1);
  if(S.up.crit&&Math.random()<.07)coins*=3;
  coins=Math.floor(coins);S.coins+=coins;
  const txt=`${r.n} ${e} ${m}`.toUpperCase();
  if(!S.best||i>rarities.findIndex(x=>x.n===S.best.split(' ')[0]))S.best=txt;
  $('result').textContent=txt;$('result').style.color=r.col;
  $('coins').textContent=fmt(S.coins);$('rolls').textContent=S.rolls;$('best').textContent=S.best;$('prestige').textContent=S.pres;
  $('mult').textContent='x'+([1,1.2,1.5,2,3,5][S.up.mag]*(1+S.pres*0.1)).toFixed(1);
  S.hist.unshift({t:txt,c:r.col,co:coins});S.hist=S.hist.slice(0,20);
  $('history').innerHTML=S.hist.map(h=>`<div style="color:${h.c}">• ${h.t} +${fmt(h.co)}</div>`).join('');
  S.col[e]=1;$('collection').innerHTML=Object.keys(S.col).map(k=>`<span class="pill">${k}</span>`).join('');
  $('prestigeBtn').disabled=S.coins<1e6;
  save();updateShop();busy=false;
 },250);
}

const shop=[
 {id:'luck',n:'Lucky Dice',max:5,c:[50,250,1200,6000,25000]},
 {id:'mag',n:'Coin Magnet',max:5,c:[100,500,2500,10000,50000]},
 {id:'auto',n:'Auto',max:4,c:[2000,5000,15000,50000]},
 {id:'elem',n:'Elements',max:3,c:[1500,8000,40000]},
 {id:'crit',n:'Crit 7%',max:1,c:[3000]},
 {id:'gold',n:'Gold Touch',max:1,c:[15000]},
];
function updateShop(){
 $('shop').innerHTML=shop.map(s=>{
  const l=S.up[s.id]||0, max=l>=s.max, cost=s.c[l]||0;
  return `<div class="item"><div><b>${s.n} ${l}/${s.max}</b></div><button data-id="${s.id}" ${max||S.coins<cost?'disabled':''}>${max?'MAX':fmt(cost)}</button></div>`;
 }).join('');
 document.querySelectorAll('#shop button').forEach(b=>b.onclick=()=>buy(b.dataset.id));
}
function buy(id){
 const s=shop.find(x=>x.id===id),l=S.up[id]||0,c=s.c[l];
 if(S.coins>=c&&l<s.max){S.coins-=c;S.up[id]=l+1;save();$('coins').textContent=fmt(S.coins);updateShop();startAuto();}
}

let auto=null;function startAuto(){if(auto)clearInterval(auto);const l=S.up.auto||0;if(!l)return;const sp=[0,3333,1000,333,100];auto=setInterval(()=>{if(!busy)roll()},sp[l])}

function prestige(){if(S.coins<1e6)return;if(confirm('Prestige for +10% permanent?')){S.pres++;S.coins=0;S.up={luck:0,mag:0,auto:0,elem:0,crit:0,gold:0};S.hist=[];save();location.reload()}}

$('dice').onclick=roll;$('rollBtn').onclick=roll;$('prestigeBtn').onclick=prestige;
addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();roll()}});

$('coins').textContent=fmt(S.coins);$('rolls').textContent=S.rolls;$('best').textContent=S.best||'-';$('prestige').textContent=S.pres;updateShop();startAuto();$('prestigeBtn').disabled=S.coins<1e6;