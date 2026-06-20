// RNG Dice v0.0.2
const rarities = [
  {name:'Common', w:40, coins:1, color:'#94a3b8'},
  {name:'Uncommon', w:22, coins:3, color:'#22c55e'},
  {name:'Rare', w:15, coins:8, color:'#3b82f6'},
  {name:'Epic', w:9, coins:20, color:'#a855f7'},
  {name:'Legendary', w:5.5, coins:50, color:'#f97316'},
  {name:'Mythic', w:3.5, coins:120, color:'#ec4899'},
  {name:'Divine', w:2, coins:300, color:'#eab308'},
  {name:'Celestial', w:1.2, coins:750, color:'#22d3ee'},
  {name:'Transcendent', w:0.7, coins:2000, color:'#ff00ff'},
  {name:'Impossible', w:0.4, coins:5000, color:'#ffffff'},
  {name:'Glitched', w:0.1, coins:15000, color:'#00ff88'},
  {name:'???', w:0.01, coins:100000, color:'#ff0044'},
];
const elementsBase = ['Fire','Water','Earth','Air','Lightning','Ice','Shadow','Light'];
const elementsExtra = ['Nature','Void','Crystal','Metal','Poison','Holy','Chaos'];
const creatures = ['Dragon','Phoenix','Wolf','Serpent','Golem','Spirit','Titan','Kitsune','Kraken','Griffin'];

let state = JSON.parse(localStorage.getItem('rng-dice-v2')||'{}');
state.coins = state.coins||0;
state.rolls = state.rolls||0;
state.best = state.best||null;
state.pity = state.pity||0;
state.prestige = state.prestige||0;
state.upgrades = state.upgrades||{luck:0, magnet:0, auto:0, elem:0, crit:0, gold:0};
state.history = state.history||[];
state.collection = state.collection||{};
state.leaderboard = state.leaderboard||[];

const $ = id=>document.getElementById(id);
function save(){localStorage.setItem('rng-dice-v2', JSON.stringify(state))}
function fmt(n){return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':Math.floor(n).toString()}

// --- SOUNDS v0.0.2 ---
let audioCtx;
function beep(freq=440, dur=0.08, type='sine', vol=0.2){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime+dur);
  }catch(e){}
}
function playRollSound(ri){
  beep(300,0.05,'square',0.15);
  setTimeout(()=>beep(500,0.05,'square',0.12),60);
  if(ri>=3) setTimeout(()=>beep(700,0.12,'triangle',0.18),120); // Epic+
  if(ri>=4) setTimeout(()=>{beep(900,0.15,'sawtooth',0.2); beep(1200,0.2,'sine',0.15)},180); // Legendary+
}

function getElements(){
  const unlocked = [...elementsBase];
  if(state.upgrades.elem>=1) unlocked.push(...elementsExtra.slice(0,3));
  if(state.upgrades.elem>=2) unlocked.push(...elementsExtra.slice(3,5));
  if(state.upgrades.elem>=3) unlocked.push(...elementsExtra.slice(5));
  return unlocked;
}

function weightedRarity(){
  const prestigeBonus = state.prestige * 2; // +2% per prestige
  const luckShift = state.upgrades.luck * 3 + prestigeBonus;
  const weights = rarities.map((r,i)=>{
    let w = r.w;
    if(i===0) w = Math.max(3, w - luckShift);
    else w = w + luckShift * (r.w / 60);
    return w;
  });
  if(state.pity>=50){
    const epicPlus = weights.slice(3).reduce((a,b)=>a+b,0);
    const roll = Math.random()*epicPlus;
    let acc=0;
    for(let i=3;i<weights.length;i++){acc+=weights[i]; if(roll<acc) return i;}
  }
  const total = weights.reduce((a,b)=>a+b,0);
  let r = Math.random()*total, acc=0;
  for(let i=0;i<weights.length;i++){acc+=weights[i]; if(r<acc) return i;}
  return 0;
}

function roll(){
  const dice = $('dice');
  dice.classList.remove('spin'); void dice.offsetWidth; dice.classList.add('spin');
  
  state.rolls++;
  const ri = weightedRarity();
  const rarity = rarities[ri];
  playRollSound(ri);
  
  const elems = getElements();
  const element = elems[Math.floor(Math.random()*elems.length)];
  const creature = creatures[Math.floor(Math.random()*creatures.length)];
  
  let coins = rarity.coins;
  const mults=[1,1.2,1.5,2,3,5];
  coins *= mults[state.upgrades.magnet];
  coins *= 1 + state.upgrades.elem*0.1;
  coins *= 1 + state.prestige*0.1;
  let isCrit = false;
  if(state.upgrades.crit && Math.random()<0.07){coins*=3; isCrit=true;}
  if(state.upgrades.gold && Math.random()<0.02){
    const ri2 = weightedRarity();
    if(ri2>ri){setTimeout(roll,200); return;}
  }
  coins = Math.floor(coins);
  state.coins += coins;
  
  if(ri>=3) state.pity=0; else state.pity++;
  
  const key = rarity.name+'|'+element;
  state.collection[key]=true;
  
  const resultStr = `${rarity.name.toUpperCase()} ${element.toUpperCase()} ${creature.toUpperCase()}`;
  if(!state.best || ri > rarities.findIndex(r=>r.name===state.best?.rarity)) {
    state.best={rarity:rarity.name, text:resultStr};
    // leaderboard
    state.leaderboard.unshift({text:resultStr, rarity:rarity.name, color:rarity.color, time:Date.now()});
    state.leaderboard = state.leaderboard.slice(0,5);
  }
  
  $('result').textContent = resultStr;
  $('result').style.color = rarity.color;
  $('result').classList.remove('glow'); void $('result').offsetWidth; $('result').classList.add('glow');
  $('coins').textContent = fmt(state.coins);
  $('rolls').textContent = state.rolls;
  $('best').textContent = state.best.text;
  $('prestige').textContent = state.prestige;
  $('mult').textContent = 'x'+(mults[state.upgrades.magnet]*(1+state.prestige*0.1)).toFixed(1);
  
  const f=document.createElement('div'); f.className='floating'; f.textContent='+'+fmt(coins)+(isCrit?' CRIT!':''); f.style.left=(window.innerWidth/2)+'px'; f.style.top='200px'; f.style.color=rarity.color; document.body.appendChild(f); setTimeout(()=>f.remove(),1000);
  
  state.history.unshift({t:Date.now(), txt:resultStr, color:rarity.color, coins});
  state.history = state.history.slice(0,20);
  $('history').innerHTML = state.history.map(h=>`<div style="color:${h.color}">• ${h.txt} <span style="opacity:.7">+${fmt(h.coins)}</span></div>`).join('');
  
  $('collection').innerHTML = Object.keys(state.collection).map(k=>{const [r,e]=k.split('|'); const col=rarities.find(x=>x.name===r)?.color||'#fff'; return `<span class="pill" style="border-color:${col};color:${col}">${e}</span>`}).join('');
  
  $('leaderboard').innerHTML = state.leaderboard.map((l,i)=>`<div style="color:${l.color}">${i+1}. ${l.text}</div>`).join('') || '<div style="opacity:.6">No top rolls yet</div>';
  
  if(ri>=4){confetti(rarity.color)}
  
  $('prestigeBtn').disabled = state.coins < 1000000;
  
  save();
  updateShop();
}

function confetti(color){
  for(let i=0;i[ri] * 40); acc+=weights[i]; if(r<acc) return i;}
  return 0;
}

function roll(){
  const dice = $('dice');
  dice.classList.remove('spin'); void dice.offsetWidth; dice.classList.add('spin');
  
  state.rolls++;
  const ri = weightedRarity();
  const rarity = rarities[ri];
  playRollSound(ri);
  
  const elems = getElements();
  const element = elems[Math.floor(Math.random()*elems.length)];
  const creature = creatures[Math.floor(Math.random()*creatures.length)];
  
  let coins = rarity.coins;
  const mults=[1,1.2,1.5,2,3,5];
  coins *= mults[state.upgrades.magnet];
  coins *= 1 + state.upgrades.elem*0.1;
  coins *= 1 + state.prestige*0.1;
  let isCrit = false;
  if(state.upgrades.crit && Math.random()<0.07){coins*=3; isCrit=true;}
  if(state.upgrades.gold && Math.random()<0.02){
    const ri2 = weightedRarity();
    if(ri2>ri){setTimeout(roll,200); return;}
  }
  coins = Math.floor(coins);
  state.coins += coins;
  
  if(ri>=3) state.pity=0; else state.pity++;
  
  const key = rarity.name+'|'+element;
  state.collection[key]=true;
  
  const resultStr = `${rarity.name.toUpperCase()} ${element.toUpperCase()} ${creature.toUpperCase()}`;
  if(!state.best || ri > rarities.findIndex(r=>r.name===state.best?.rarity)) {
    state.best={rarity:rarity.name, text:resultStr};
    // leaderboard
    state.leaderboard.unshift({text:resultStr, rarity:rarity.name, color:rarity.color, time:Date.now()});
    state.leaderboard = state.leaderboard.slice(0,5);
  }
  
  $('result').textContent = resultStr;
  $('result').style.color = rarity.color;
  $('result').classList.remove('glow'); void $('result').offsetWidth; $('result').classList.add('glow');
  $('coins').textContent = fmt(state.coins);
  $('rolls').textContent = state.rolls;
  $('best').textContent = state.best.text;
  $('prestige').textContent = state.prestige;
  $('mult').textContent = 'x'+(mults[state.upgrades.magnet]*(1+state.prestige*0.1)).toFixed(1);
  
  const f=document.createElement('div'); f.className='floating'; f.textContent='+'+fmt(coins)+(isCrit?' CRIT!':''); f.style.left=(window.innerWidth/2)+'px'; f.style.top='200px'; f.style.color=rarity.color; document.body.appendChild(f); setTimeout(()=>f.remove(),1000);
  
  state.history.unshift({t:Date.now(), txt:resultStr, color:rarity.color, coins});
  state.history = state.history.slice(0,20);
  $('history').innerHTML = state.history.map(h=>`<div style="color:${h.color}">• ${h.txt} <span style="opacity:.7">+${fmt(h.coins)}</span></div>`).join('');
  
  $('collection').innerHTML = Object.keys(state.collection).map(k=>{const [r,e]=k.split('|'); const col=rarities.find(x=>x.name===r)?.color||'#fff'; return `<span class="pill" style="border-color:${col};color:${col}">${e}</span>`}).join('');
  
  $('leaderboard').innerHTML = state.leaderboard.map((l,i)=>`<div style="color:${l.color}">${i+1}. ${l.text}</div>`).join('') || '<div style="opacity:.6">No top rolls yet</div>';
  
  if(ri>=4){confetti(rarity.color)}
  
  $('prestigeBtn').disabled = state.coins < 1000000;
  
  save();
  updateShop();
}

function confetti(color){
  for(let i=0;i<30;i++){
    const p=document.createElement('div'); p.style.position='fixed'; p.style.left=Math.random()*window.innerWidth+'px'; p.style.top='-10px'; p.style.width='6px'; p.style.height='6px'; p.style.background=color; p.style.opacity='.9'; p.style.transition='transform 1.2s linear, opacity 1.2s'; document.body.appendChild(p);
    setTimeout(()=>{p.style.transform=`translateY(${window.innerHeight+20}px) rotate(${Math.random()*720}deg)`; p.style.opacity='0'},10);
    setTimeout(()=>p.remove(),1300);
  }
}

const shopData = [
  {id:'luck', name:'Lucky Dice', max:5, costs:[50,250,1200,6000,25000], desc:l=>' -'+(l*3)+'% Common'},
  {id:'magnet', name:'Coin Magnet', max:5, costs:[100,500,2500,10000,50000], desc:l=>['','x1.2','x1.5','x2','x3','x5'][l+1]},
  {id:'auto', name:'Auto Roller', max:4, costs:[2000,5000,15000,50000], desc:l=>['Off','1/3s','1/s','3/s','10/s'][l+1]},
  {id:'elem', name:'Elemental Mastery', max:3, costs:[1500,8000,40000], desc:l=>'+'+((l+1)*5)+' elements'},
  {id:'crit', name:'Critical Surge', max:1, costs:[3000], desc:()=> '7% 3x coins'},
  {id:'gold', name:'Golden Touch', max:1, costs:[15000], desc:()=> '2% double roll'},
];

function updateShop(){
  $('shop').innerHTML = shopData.map(s=>{
    const lvl = state.upgrades[s.id];
    const maxed = lvl>=s.max;
    const cost = maxed?'-':s.costs[lvl];
    return `<div class="item"><div><b>${s.name} ${lvl}/${s.max}</b><div style="opacity:.7;font-size:12px">${s.desc(lvl)}</div></div><button ${maxed||state.coins<cost?'disabled':''} onclick="buy('${s.id}')">${maxed?'MAX':fmt(cost)}</button></div>`;
  }).join('');
}

function buy(id){
  const s=shopData.find(x=>x.id===id); const lvl=state.upgrades[id]; const cost=s.costs[lvl];
  if(state.coins>=cost){state.coins-=cost; state.upgrades[id]++; save(); $('coins').textContent=fmt(state.coins); updateShop(); startAuto();}
}
window.buy=buy;

let autoTimer=null;
function startAuto(){
  if(autoTimer) clearInterval(autoTimer);
  const lvl=state.upgrades.auto;
  if(!lvl) return;
  const speeds=[0,3333,1000,333,100];
  autoTimer=setInterval(roll, speeds[lvl]);
}

function doPrestige(){
  if(state.coins < 1000000) return;
  if(!confirm('Prestige now? You will reset coins, upgrades, and history for +1 permanent prestige (+10% coins and +2% luck).')) return;
  state.prestige++;
  state.coins=0;
  state.rolls=0;
  state.pity=0;
  state.upgrades={luck:0, magnet:0, auto:0, elem:0, crit:0, gold:0};
  state.history=[];
  state.collection={};
  beep(600,0.2,'sawtooth',0.3); setTimeout(()=>beep(900,0.3,'sine',0.3),200);
  save(); location.reload();
}

$('dice').onclick=roll;
$('rollBtn').onclick=roll;
$('prestigeBtn').onclick=doPrestige;
window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();roll()}});

// init
$('coins').textContent=fmt(state.coins); $('rolls').textContent=state.rolls; $('best').textContent=state.best?.text||'-'; $('prestige').textContent=state.prestige; $('prestigeBtn').disabled = state.coins < 1000000; updateShop(); startAuto();
$('leaderboard').innerHTML = state.leaderboard.map((l,i)=>`<div style="color:${l.color}">${i+1}. ${l.text}</div>`).join('') || '<div style="opacity:.6">No top rolls yet</div>';
if(state.history.length){$('history').innerHTML = state.history.map(h=>`<div style="color:${h.color}">• ${h.txt}</div>`).join('')}
$('collection').innerHTML = Object.keys(state.collection).map(k=>{const [r,e]=k.split('|'); const col=rarities.find(x=>x.name===r)?.color||'#fff'; return `<span class="pill" style="border-color:${col};color:${col}">${e}</span>`}).join('');
$('mult').textContent = 'x'+(1+state.prestige*0.1).toFixed(1);