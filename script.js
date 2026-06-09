(() => {
  // Data
  const rarities = [
    {name:'Common', prob:40, coins:10, color:'#9ca3af'},
    {name:'Uncommon', prob:25, coins:25, color:'#22c55e'},
    {name:'Rare', prob:15, coins:60, color:'#3b82f6'},
    {name:'Epic', prob:8, coins:150, color:'#a855f7'},
    {name:'Legendary', prob:5, coins:400, color:'#f59e0b'},
    {name:'Mythic', prob:3, coins:1000, color:'#ef4444'},
    {name:'Divine', prob:2, coins:3000, color:'#eab308'},
    {name:'Celestial', prob:1.2, coins:8000, color:'#22d3ee'},
    {name:'Transcendent', prob:0.6, coins:25000, color:'#d946ef'},
    {name:'Impossible', prob:0.19, coins:100000, color:'#ffffff'},
    {name:'???', prob:0.01, coins:1000000, color:'#ff2bd6'},
  ];
  const elements = ['Fire','Water','Earth','Air','Lightning','Ice','Light','Shadow','Nature','Metal','Void','Crystal'];
  const items = ['Dragon','Phoenix','Wolf','Serpent','Titan','Golem','Spirit','Blade','Crown','Orb','Knight','Hydra','Griffin','Leviathan','Wraith','Angel','Demon','Samurai','Wizard','Beast'];

  // State (memory only)
  const state = {
    coins:0,
    rolls:0,
    best:null,
    bestValue:0,
    activeRolls:0,
    history:[],
    collection:[],
    autoInterval:null,
    upgrades:{
      lucky:{key:'lucky', name:'Lucky Charm', desc:'+4% chance to upgrade rarity per level', level:0, cost:100, base:100, mult:1.7},
      magnet:{key:'magnet', name:'Coin Magnet', desc:'+25% coins per level', level:0, cost:150, base:150, mult:1.8},
      critical:{key:'critical', name:'Critical Roll', desc:'+3% chance for 3x coins per level', level:0, cost:300, base:300, mult:2.0},
      fortune:{key:'fortune', name:'Fortune Dice', desc:'+15% coins on Rare+ per level', level:0, cost:500, base:500, mult:2.2},
      auto:{key:'auto', name:'Auto Roller', desc:'Unlocks faster auto roll', level:0, cost:1000, base:1000, mult:2.5},
      speed:{key:'speed', name:'Speed Boost', desc:'-100ms roll time per level (min 400ms)', level:0, cost:750, base:750, mult:1.9},
      multi:{key:'multi', name:'Multi Roll', desc:'+1 roll per click per level', level:0, cost:2000, base:2000, mult:3.0},
    }
  };

  // Elements
  const $coins = document.getElementById('coins');
  const $rolls = document.getElementById('rolls');
  const $best = document.getElementById('best');
  const $collection = document.getElementById('collection');
  const $history = document.getElementById('history');
  const $upgrades = document.getElementById('upgrades');
  const $result = document.getElementById('lastResult');
  const $debug = document.getElementById('debug');
  const $cube = document.getElementById('cube');
  const $diceBtn = document.getElementById('diceBtn');
  const $rollBtn = document.getElementById('rollBtn');
  const $roll10Btn = document.getElementById('roll10Btn');
  const $autoBtn = document.getElementById('autoBtn');

  // Utils
  const fmt = n => new Intl.NumberFormat().format(Math.floor(n));
  const getRollTime = () => Math.max(400, 1200 - state.upgrades.speed.level * 100);

  function pickRarityIndex(){
    const r = Math.random()*100;
    let acc=0;
    for(let i=0;i<rarities.length;i++){ acc+=rarities[i].prob; if(r<acc) return i; }
    return rarities.length-1;
  }

  function updateDebug(){
    $debug.textContent = state.activeRolls>0 ? `Rolling… (${state.activeRolls})` : 'Ready';
  }

  // Confetti
  const cvs = document.getElementById('confetti');
  const ctx = cvs.getContext('2d');
  let particles = [];
  let confettiRunning = false;
  function resize(){ cvs.width = innerWidth; cvs.height = innerHeight; }
  addEventListener('resize', resize); resize();
  function burstConfetti(){
    const cx = innerWidth*0.5, cy = innerHeight*0.33;
    for(let i=0;i<120;i++){
      particles.push({
        x:cx, y:cy,
        vx:(Math.random()-0.5)*9,
        vy:-Math.random()*9-2,
        life:80+Math.random()*40,
        size:5+Math.random()*7,
        rot:Math.random()*360,
        vr:(Math.random()-0.5)*12,
        color:`hsl(${Math.floor(Math.random()*360)} 100% 62%)`
      });
    }
    if(!confettiRunning){ confettiRunning=true; requestAnimationFrame(tick); }
    function tick(){
      ctx.clearRect(0,0,cvs.width,cvs.height);
      particles = particles.filter(p=>p.life>0);
      for(const p of particles){
        p.life--; p.vy+=0.24; p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
        ctx.save();
        ctx.translate(p.x,p.y);
        ctx.rotate(p.rot*Math.PI/180);
        ctx.globalAlpha = Math.max(0, p.life/120);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.65);
        ctx.restore();
      }
      if(particles.length){ requestAnimationFrame(tick); } else { confettiRunning=false; ctx.clearRect(0,0,cvs.width,cvs.height); }
    }
  }

  // Core roll
  function performRoll(){
    state.activeRolls++; updateDebug();

    const rollTime = getRollTime();
    // visual spin
    const rx = 360 + Math.floor(Math.random()*1440);
    const ry = 360 + Math.floor(Math.random()*1440);
    const rz = Math.floor(Math.random()*360);
    $cube.style.transitionDuration = rollTime+'ms';
    $cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;

    // pick
    let rIdx = pickRarityIndex();
    // Lucky Charm upgrades
    const lucky = state.upgrades.lucky.level;
    for(let i=0;i<lucky;i++){ if(Math.random()<0.04 && rIdx<rarities.length-1) rIdx++; }
    const rarity = rarities[rIdx];
    const element = elements[(Math.random()*elements.length)|0];
    const item = items[(Math.random()*items.length)|0];

    let coins = rarity.coins;
    coins *= (1 + state.upgrades.magnet.level*0.25);
    let isCrit = false;
    if(Math.random() < state.upgrades.critical.level*0.03){ coins *= 3; isCrit = true; }
    if(rIdx>=2){ coins *= (1 + state.upgrades.fortune.level*0.15); }
    coins = Math.floor(coins);

    state.coins += coins;
    state.rolls++;

    if(coins > state.bestValue){ state.bestValue = coins; state.best = `${rarity.name} ${element} ${item}`; }

    state.history.push({rarity:rarity.name, element, item, coins, color:rarity.color, crit:isCrit});
    if(state.history.length>200) state.history.shift();

    if(rIdx>=2){
      const key = `${rarity.name}-${element}-${item}`;
      if(!state.collection.some(c=>c.key===key)){
        state.collection.push({key, rarity:rarity.name, element, item, color:rarity.color});
        if(state.collection.length>120) state.collection.shift();
      }
    }

    // Reveal after animation
    setTimeout(()=>{
      $result.innerHTML = `
        <div class="res-rarity" style="color:${rarity.color};text-shadow:0 0 14px ${rarity.color}">${rarity.name.toUpperCase()}</div>
        <div class="res-name">${element} ${item}</div>
        <div class="res-coins">+${fmt(coins)} coins ${isCrit?'<span class="crit">CRIT x3!</span>':''}</div>
      `;
      $result.style.animation='none'; void $result.offsetWidth; $result.style.animation='pop .28s ease';

      if(rIdx>=5) burstConfetti();

      state.activeRolls--; updateDebug(); render();
    }, rollTime);

    // immediate HUD update for responsiveness
    render(false);
  }

  function doMultiRoll(){
    const count = 1 + state.upgrades.multi.level;
    for(let i=0;i<count;i++){
      // slight stagger to keep canvas smooth under spam
      setTimeout(performRoll, i*45);
    }
  }

  // Debounce for manual clicks (100ms)
  let lastClick = 0;
  function tryManualRoll(){
    const now = Date.now();
    if(now - lastClick < 100) return;
    lastClick = now;
    doMultiRoll();
  }

  // Render
  function render(full=true){
    $coins.textContent = fmt(state.coins);
    $rolls.textContent = fmt(state.rolls);
    $best.textContent = state.best ? `${state.best} (${fmt(state.bestValue)})` : '—';

    if(full){
      // Upgrades
      $upgrades.innerHTML = Object.values(state.upgrades).map(u=>`
        <div class="upgrade">
          <div class="u-top"><b>${u.name}</b><span class="lvl">Lv.${u.level}</span></div>
          <div class="u-desc">${u.desc}</div>
          <button class="u-buy" data-key="${u.key}" ${state.coins < u.cost ? 'disabled':''}>Buy — ${fmt(u.cost)}</button>
        </div>
      `).join('');
      $upgrades.querySelectorAll('.u-buy').forEach(btn=>{
        btn.onclick = ()=>buyUpgrade(btn.dataset.key);
      });

      // Collection (show newest first, only Rare+)
      const cols = state.collection.slice(-48).reverse();
      $collection.innerHTML = cols.length ? cols.map(c=>`
        <div class="collect-item" style="--c:${c.color}">
          <b>${c.rarity}</b>
          <span>${c.element} ${c.item}</span>
        </div>
      `).join('') : `<div class="collect-item" style="--c:#7c8cff"><b>No rares yet</b><span>Roll to discover Rare+ items</span></div>`;

      // History
      const h = state.history.slice(-40).reverse();
      $history.innerHTML = h.map(x=>`
        <div class="h-item" title="${x.rarity} ${x.element} ${x.item} • +${fmt(x.coins)}" style="color:${x.color}; border-color:${x.color}66; background:${x.color}18">
          ${x.rarity[0]}${x.element[0]}
        </div>
      `).join('');
    }
  }

  function buyUpgrade(key){
    const u = state.upgrades[key];
    if(!u) return;
    if(state.coins < u.cost) return;
    state.coins -= u.cost;
    u.level++;
    u.cost = Math.floor(u.base * Math.pow(u.mult, u.level));
    // Auto button state
    if(key==='auto') updateAutoButton();
    render();
  }

  // Controls
  $diceBtn.addEventListener('click', tryManualRoll);
  $diceBtn.addEventListener('keydown', e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); tryManualRoll(); }});
  $rollBtn.addEventListener('click', tryManualRoll);
  $roll10Btn.addEventListener('click', ()=>{
    // Queue 10 multi-rolls, bypassing the 100ms manual debounce
    for(let i=0;i<10;i++) setTimeout(doMultiRoll, i*65);
  });

  function updateAutoButton(){
    const on = !!state.autoInterval;
    $autoBtn.textContent = on ? 'AUTO: ON' : (state.upgrades.auto.level>0 ? 'AUTO: OFF' : 'AUTO: LOCKED');
    $autoBtn.disabled = state.upgrades.auto.level===0;
  }

  $autoBtn.addEventListener('click', ()=>{
    if(state.upgrades.auto.level===0){
      $result.innerHTML = `<div class="res-rarity" style="color:#ff7ac6">LOCKED</div><div class="res-name">Buy Auto Roller first</div><div class="res-coins">Cost: ${fmt(state.upgrades.auto.cost)}</div>`;
      return;
    }
    if(state.autoInterval){
      clearInterval(state.autoInterval); state.autoInterval=null;
    }else{
      const speed = Math.max(220, 1800 - state.upgrades.auto.level*280 - state.upgrades.speed.level*60);
      state.autoInterval = setInterval(doMultiRoll, speed);
    }
    updateAutoButton();
  });

  // Initial render
  render();
  updateAutoButton();
  updateDebug();

  // Safety: ensure rapid clicks never lock – we never use a global rolling flag, only timestamp debounce for manual input.
})();