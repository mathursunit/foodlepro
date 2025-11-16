
/* Foodle Pro rebuilt v6.0.12b (clean, readable) */
(function(){
  'use strict';

  // --- Config ---
  const WORDLEN = 6;
  const MAX_ROWS = 6;

  // --- DOM ---
  let gridEl     = document.getElementById('grid');
  let kbEl       = document.getElementById('keyboard');
  const hintBtn    = document.getElementById('hintBtn');
  const statsBtn   = document.getElementById('statsBtn');
  const aboutBtn   = document.getElementById('aboutBtn');
  const hintText   = document.getElementById('hintText');
  const spinner    = document.getElementById('spinner');

  
  // Ensure containers exist and have expected classes
  if(!gridEl){ gridEl = document.createElement('div'); gridEl.id='grid'; document.body.appendChild(gridEl); }
  gridEl.classList.add('grid');
  if(!kbEl){ kbEl = document.createElement('div'); kbEl.id='keyboard'; document.body.appendChild(kbEl); }

  // --- State ---
  let words = ['TOMATO','GINGER','PANEER','CASHEW','DHOKLA','PAPRIK','OREGANO','BUTTER','GHEEES','CHUTNY'];
  let hints = {
    TOMATO: 'Red fruit used as a vegetable.',
    GINGER: 'Zesty root used in chai.',
    PANEER: 'Indian cottage cheese.',
    CASHEW: 'C-shaped nut, kaju.',
    DHOKLA: 'Steamed Gujarati snack.',
    PAPRIK: 'Spice ground from peppers.',
    OREGANO:'Herb for pizza/pasta.',
    BUTTER:'Made by churning cream.',
    GHEEES:'Clarified butter in India.',
    CHUTNY:'Condiment of fruits/spices.'
  };
  // Ensure all entries are exactly WORDLEN
  words = words.map(w => (w||'').toUpperCase()).filter(w => w.length === WORDLEN);

  // Pick solution by date for stability
  const dayIndex = Math.floor(Date.now() / 86400000);
  const solution = words[dayIndex % words.length] || 'TOMATO';

  let row = 0, col = 0, LOCK = false, used = {}; // used letter states
  let hintUsed = false;
  let allowedRows = MAX_ROWS;

  // --- Render ---
  function renderGrid() {
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${WORDLEN}, var(--tileSize))`; gridEl.classList.add('grid');
    for (let r=0; r<MAX_ROWS; r++) {
      for (let c=0; c<WORDLEN; c++) {
        const d = document.createElement('div');
        d.className = 'tile';
        d.dataset.r = r;
        d.dataset.c = c;
        gridEl.appendChild(d);
      }
    }
  }

  function renderKeyboard(){
    kbEl.innerHTML = '';
    const rows = ['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
    rows.forEach((rowStr,i)=>{
      const rowDiv = document.createElement('div');
      rowDiv.className = 'kbrow';
      if(i===2){
        rowDiv.appendChild(makeKey('Enter','ENTER'));
      }
      rowStr.split('').forEach(ch=>rowDiv.appendChild(makeKey(ch,ch)));
      if(i===2){
        rowDiv.appendChild(makeKey('⌫','⌫'));
      }
      kbEl.appendChild(rowDiv);
    });
  }

  function makeKey(label, val){
    const b = document.createElement('button');
    b.className = 'key';
    b.textContent = label;
    b.dataset.key = val;
    b.addEventListener('click', ()=> onKey(val));
    return b;
  }

  function currentRowTiles(){
    return [...gridEl.querySelectorAll(`.tile[data-r="${row}"]`)];
  }

  function onKey(k){
    if(LOCK) return;
    if(k==='⌫'){
      if(col>0){
        col--;
        currentRowTiles()[col].textContent = '';
      }
      return;
    }
    if(k==='ENTER'){
      if(col!==WORDLEN) return;
      commitRow();
      return;
    }
    if(k.length===1 && k>='A' && k<='Z'){
      if(col<WORDLEN){
        currentRowTiles()[col].textContent = k;
        col++;
      }
    }
  }

  
function showToast(msg){
  var c=document.getElementById('toast-container'); var t=document.getElementById('toast');
  if(!c||!t){ alert(msg); return; }
  t.textContent=msg; t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 1200);
}
function shakeRow(){
  var r = currentRowTiles(); r.forEach(function(el){ el.classList.add('shake'); });
  setTimeout(function(){ r.forEach(function(el){ el.classList.remove('shake'); }); }, 420);
}

function commitRow(){
    const guess = currentRowTiles().map(t=>t.textContent || ' ').join('');
    if(guess.length!==WORDLEN) return;

    
    if(!allowedSet.has(guess.toUpperCase())){ showToast('Not in word list'); shakeRow(); return; }
const solArr = solution.split('');
    const usedPos = Array(WORDLEN).fill(false);

    // first pass: correct
    currentRowTiles().forEach((t,i)=>{
      const ch = guess[i];
      if(ch===solArr[i]){
        t.classList.add('correct');
        used[ch] = 'correct';
        usedPos[i]=true;
      }
    });
    // second pass: present
    currentRowTiles().forEach((t,i)=>{
      if(t.classList.contains('correct')) return;
      const ch = guess[i];
      const pos = solArr.findIndex((c,idx)=>c===ch && !usedPos[idx]);
      if(pos>-1){
        t.classList.add('present');
        if(used[ch] !== 'correct') used[ch]='present';
        usedPos[pos]=true;
      }else{
        t.classList.add('absent');
        if(!used[ch]) used[ch]='absent';
      }
    });
    paintKeyboard();

    if(guess===solution){
      LOCK = true;
      document.dispatchEvent(new CustomEvent('foodlePro:win'));
      return;
    }
    row++;
    col=0;

    if(row>=allowedRows){
      LOCK = true;
      document.dispatchEvent(new CustomEvent('foodlePro:lose'));
    }
  }

  function paintKeyboard(){
    const keys = kbEl.querySelectorAll('button.key');
    keys.forEach(k=>{
      const l=k.dataset.key;
      if(l.length!==1) return;
      k.classList.remove('correct','present','absent');
      if(used[l]) k.classList.add(used[l]);
    });
  }

  // --- Hint logic ---
  function applyHint(){
    if(hintUsed) return;
    hintUsed = true;
    allowedRows = Math.min(MAX_ROWS, Math.max(row+2, 2));
    hintBtn && (hintBtn.disabled = true);
    if(hintText){
      hintText.textContent = 'Hint: ' + (hints[solution] || 'No hint available');
    }
  }

  // --- Events ---
  renderGrid();
  renderKeyboard();

  // single, capturing keydown to avoid double entries
  (function attachKeydown(){
    try{ if(window.__foodleProKD){ window.removeEventListener('keydown', window.__foodleProKD, true);} }catch(e){}
    window.__foodleProKD = function(e){
      const key = e.key || '';
      let mapped = key;
      if(key==='Backspace') mapped='⌫';
      else if(key==='Enter') mapped='ENTER';
      else mapped = key.toUpperCase();
      if(mapped==='ENTER' || mapped==='⌫' || (mapped.length===1 && mapped>='A' && mapped<='Z')){
        e.stopImmediatePropagation();
        onKey(mapped);
      }
    };
    window.addEventListener('keydown', window.__foodleProKD, true);
  })();

  // hook hint button / modal (graceful fallback)
  if(hintBtn){
    hintBtn.addEventListener('click', ()=>{
      const modal = document.getElementById('hintModal');
      if(modal && modal.classList){ modal.classList.add('open');
        const ok = document.getElementById('hintConfirm');
        const cancel = document.getElementById('hintCancel');
        const closeAll = ()=> modal.classList.remove('open');
        if(ok){ ok.onclick = ()=>{ applyHint(); closeAll(); }; }
        if(cancel){ cancel.onclick = closeAll; }
      } else {
        if(confirm('Use a hint? You will only have 2 tries left.')) applyHint();
      }
    });
  }

  // hide spinner if present
  try{ if(spinner) spinner.style.display='none'; }catch(_){}

  // basic autosize for tiles (keep board visible)
  function autoSize(){
    const vh = Math.max(window.innerHeight, 400);
    const headerH = 220; // banner area approx
    const kbH = 250;     // keyboard area approx
    const avail = vh - headerH - kbH - 60;
    const size = Math.max(38, Math.min(64, Math.floor(avail / MAX_ROWS) - 6));
    document.documentElement.style.setProperty('--tileSize', size + 'px');
  }
  addEventListener('resize', autoSize);
  addEventListener('orientationchange', autoSize);
  setTimeout(autoSize, 0);
})();


// ---- Countdown to next puzzle (8 AM IST logic kept simple to midnight UTC like Classic) ----
(function(){
  const el = document.getElementById('countdown');
  if(!el) return;
  
function updateCountdown(){
  var el = document.getElementById('countdown'); if(!el) return;
  var IST = 5.5*3600*1000;
  function nextMs(){
    var now=Date.now(); var ist=new Date(now+IST);
    var y=ist.getUTCFullYear(), m=ist.getUTCMonth(), d=ist.getUTCDate();
    var target = Date.UTC(y,m,d,8,0,0) - IST;
    if(now >= target) target += 86400000;
    return Math.max(0, target-now);
  }
  var ms = nextMs();
  var h = String(Math.floor(ms/3600000)).padStart(2,'0');
  var m = String(Math.floor((ms%3600000)/60000)).padStart(2,'0');
  var s = String(Math.floor((ms%60000)/1000)).padStart(2,'0');
  el.innerText = 'Next word in ' + h + ':' + m + ':' + s;
}

  updateCountdown();
  setInterval(updateCountdown,1000);
})();

// ---- Minimal confetti (falls from top) ----
function dropConfetti(durationMs=1500, count=60){
  const root = document.createElement('div');
  root.setAttribute('data-confetti','1');
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9999';
  document.body.appendChild(root);
  const colors = ['#a78bfa','#60a5fa','#34d399','#fbbf24','#f87171'];
  const vw = Math.max(document.documentElement.clientWidth, window.innerWidth||0);
  for (let i=0;i<count;i++){
    const s = document.createElement('div');
    const size = 6 + Math.random()*8;
    s.style.cssText = `position:absolute;top:-20px;width:${size}px;height:${size}px;border-radius:2px;background:${colors[i%colors.length]};opacity:.9;left:${Math.random()*vw}px;`;
    root.appendChild(s);
    const fall = s.animate([
      { transform:`translateY(-20px) rotate(0deg)`, opacity: .9 },
      { transform:`translateY(${window.innerHeight+40}px) rotate(${360+Math.random()*360}deg)`, opacity: .9 }
    ], { duration: durationMs + Math.random()*800, easing:'cubic-bezier(.17,.67,.32,1.01)' });
  }
  setTimeout(()=>root.remove(), durationMs+1200);
}
