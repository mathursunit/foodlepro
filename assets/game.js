
// Simple Foodle engine (Classic/Pro)
(function(){
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));

  function confettiTop(opts={}){
    const { duration=1500, count=180, colors=['#fff','#8b5cf6','#22c1c3','#f59e0b','#ef4444'] } = opts;
    const cvs = document.createElement('canvas');
    Object.assign(cvs.style,{position:'fixed',left:0,top:0,width:'100vw',height:'100vh',pointerEvents:'none',zIndex:9999});
    document.body.appendChild(cvs);
    const ctx = cvs.getContext('2d');
    function resize(){ cvs.width = innerWidth; cvs.height = innerHeight; }
    resize(); addEventListener('resize', resize, {passive:true});
    const parts = Array.from({length:count}).map(()=>({x:Math.random()*cvs.width,y:-Math.random()*cvs.height*0.5-10,
      r:3+Math.random()*5,c:colors[(Math.random()*colors.length)|0],vx:(Math.random()-0.5)*1.2,vy:1+Math.random()*2.5,rot:Math.random()*6.28,vr:(Math.random()-0.5)*0.2}));
    const start = performance.now();
    function frame(t){
      ctx.clearRect(0,0,cvs.width,cvs.height);
      parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.02;p.rot+=p.vr;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.c;ctx.fillRect(-p.r,-p.r,p.r*2,p.r*2);ctx.restore();});
      if(t-start<duration) requestAnimationFrame(frame); else { removeEventListener('resize',resize); cvs.remove(); }
    }
    requestAnimationFrame(frame);
  }

  function startResetTickerIST(spanId){
    const el = document.getElementById(spanId);
    if(!el) return;
    const IST = 5.5*3600*1000;
    function msToNext8am(){
      const now = Date.now();
      const ist = new Date(now + IST);
      const y=ist.getUTCFullYear(), m=ist.getUTCMonth(), d=ist.getUTCDate();
      const eightIST = Date.UTC(y,m,d,8,0,0) - IST;
      const target = now >= eightIST ? eightIST + 86400000 : eightIST;
      return Math.max(0, target-now);
    }
    function render(){
      let ms = msToNext8am();
      const h=Math.floor(ms/3600000); ms-=h*3600000;
      const m=Math.floor(ms/60000); ms-=m*60000;
      const s=Math.floor(ms/1000);
      el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    render(); setInterval(render, 1000);
  }

  function fetchCsv(url){
    return fetch(url).then(r=>r.text()).then(t=>{
      const lines = t.trim().split(/\r?\n/).slice(1);
      return lines.map(l=>{
        const [w,h] = l.split(",");
        return {word:w.trim().toLowerCase(), hint:(h||"").trim()};
      });
    });
  }

  function getDailyIndex(len){
    const IST = 5.5*3600*1000, now = Date.now();
    const day = Math.floor((now + IST)/86400000); // IST-based day index
    return day % len;
  }

  function makeKeyboard(container, onKey){
    const rows = ["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
    rows.forEach((r,i)=>{
      const row = document.createElement('div'); row.className='kbrow';
      r.split("").forEach(ch=>{
        const k = document.createElement('div'); k.className='key'; k.textContent=ch; k.dataset.key=ch;
        k.addEventListener('click', ()=>onKey(ch)); row.appendChild(k);
      });
      if(i===2){
        const enter=document.createElement('div'); enter.className='key'; enter.textContent='Enter'; enter.dataset.key='ENTER';
        enter.style.minWidth='70px'; enter.addEventListener('click',()=>onKey('ENTER')); row.prepend(enter);
        const bk=document.createElement('div'); bk.className='key'; bk.textContent='⌫'; bk.dataset.key='BACK';
        bk.style.minWidth='44px'; bk.addEventListener('click',()=>onKey('BACK')); row.appendChild(bk);
      }
      container.appendChild(row);
    });
  }

  function updateKbColors(kb, map){
    qsa('.key',kb).forEach(k=>{
      const ch = k.dataset.key||k.textContent;
      const st = map[ch];
      if(st){ k.classList.remove('correct','present','absent'); k.classList.add(st); }
    });
  }

  // engine
  window.initFoodle = async function initFoodle(opts){
    const { modeName, wordLength, maxRows, storageKey, wordsUrl, buildTag } = opts;
    document.documentElement.style.setProperty('--cols', String(wordLength));

    // chrome double-key prevention
    let handling=false;
    function onKeyDown(e){
      if(handling) return;
      handling=true; doKey(e); handling=false;
    }

    const app = qs('#app');
    app.innerHTML = `
      <div class="brand-row card">
        <img src="./assets/fihr-logo.svg" class="brand-img" alt="FIHR">
        <img src="./assets/foodle-logo.svg" class="brand-img" alt="Foodle">
      </div>
      <div class="ticker">Next word in <span id="ticker">--:--:--</span></div>
      <div class="gridWrap"><div id="grid" class="grid" aria-label="${modeName} grid"></div></div>
      <div class="toolbar">
        <button id="btnHint" class="btn">💡 Hint</button>
        <button id="btnStats" class="btn">📊 Stats</button>
        <button id="btnAbout" class="btn">ℹ️ About</button>
      </div>
      <div class="legend">
        <span><span class="dot p"></span>Correct</span>
        <span><span class="dot t"></span>Present</span>
        <span><span class="dot a"></span>Absent</span>
      </div>
      <div id="keyboard"></div>
      <div class="footer">Build ${buildTag}</div>
      <div id="modal" class="modal-backdrop">
        <div class="modal" role="dialog" aria-modal="true">
          <h3 id="modalTitle"></h3>
          <div id="modalBody"></div>
          <div class="actions">
            <button class="btn" id="modalCancel">Cancel</button>
            <button class="btn" id="modalOk">OK</button>
          </div>
        </div>
      </div>
    `;
    startResetTickerIST('ticker');

    const grid = qs('#grid'), kb = qs('#keyboard');
    // build grid
    const tiles=[];
    for(let r=0;r<maxRows;r++){
      tiles[r]=[];
      for(let c=0;c<wordLength;c++){
        const t=document.createElement('div'); t.className='tile'; t.textContent=''; grid.appendChild(t); tiles[r][c]=t;
      }
    }

    makeKeyboard(kb, key=>handleKey(key));
    const kbEl = kb;

    const words = await fetchCsv(wordsUrl);
    const word = words[getDailyIndex(words.length)];
    const answer = word.word;
    let hintText = word.hint || "No hint available.";

    // sizing
    function autoSize(){
      const vw = Math.max(320, innerWidth||320);
      const vh = Math.max(480, innerHeight||480);
      const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tileGap'))||10;
      const cols = wordLength, rows = maxRows;
      const maxW = Math.floor((vw - 40 - (cols-1)*gap)/cols);
      const gridTop = grid.getBoundingClientRect().top || 160;
      const kbIdeal = 3*58 + 2*16 + 24;
      const availH = vh - gridTop - kbIdeal - 60;
      const sizeH = Math.floor((availH - (rows-1)*gap)/rows);
      let size = Math.max(34, Math.min(64, Math.min(maxW, sizeH)));
      document.documentElement.style.setProperty('--tileSize', size+'px');
      const gridHeight = rows*size + (rows-1)*gap;
      const kbAvail = vh - gridTop - gridHeight - 36;
      let scale = Math.max(0.82, Math.min(1, kbAvail / kbIdeal));
      document.documentElement.style.setProperty('--kbScale', String(scale));
    }
    addEventListener('resize', autoSize); addEventListener('orientationchange', autoSize); setTimeout(autoSize,0);

    // state
    let row=0, col=0, gameOver=false;
    const kbMap={}; // letter -> status

    function setTile(r,c,ch){ tiles[r][c].textContent = ch||''; }
    function setTileState(r,c,state){ const t=tiles[r][c]; t.classList.remove('correct','present','absent'); if(state) t.classList.add(state); }
    function setKbState(ch,state){
      const up = ch.toUpperCase();
      const order = {correct:3,present:2,absent:1};
      if(!kbMap[up] || order[state] > order[kbMap[up]]) kbMap[up]=state;
      updateKbColors(kbEl, kbMap);
    }

    function scoreGuess(g){
      const res = Array(wordLength).fill('absent');
      const counts = {};
      for(const ch of answer) counts[ch]=(counts[ch]||0)+1;
      // first pass
      for(let i=0;i<wordLength;i++){
        if(g[i]===answer[i]){ res[i]='correct'; counts[g[i]]--; }
      }
      // second pass
      for(let i=0;i<wordLength;i++){
        if(res[i]==='correct') continue;
        const ch=g[i];
        if(counts[ch]>0){ res[i]='present'; counts[ch]--; }
      }
      return res;
    }

    function finishWin(){
      gameOver=true;
      confettiTop();
      saveStats(true, row+1);
    }
    function finishLose(){
      gameOver=true;
      saveStats(false, row+1);
    }

    function handleEnter(){
      if(gameOver || col<wordLength) return;
      const guess = tiles[row].map(t=>t.textContent.toLowerCase()).join("");
      // simple validation: just alpha + correct length
      if(!/^[a-z]{%d}$/.test(guess)) return;
      const res = scoreGuess(guess);
      res.forEach((st,i)=>{ setTileState(row,i,st); setKbState(guess[i], st); });
      if(res.every(s=>s==='correct')){ finishWin(); return; }
      row++; col=0;
      if(row>=maxRows){ finishLose(); }
    }

    function handleKey(key){
      if(gameOver) return;
      if(key==='ENTER'){ handleEnter(); return; }
      if(key==='BACK'){
        if(col>0){ col--; setTile(row,col,''); }
        return;
      }
      if(/^[A-Z]$/.test(key) && col<wordLength){
        setTile(row,col,key); col++; return;
      }
    }

    function doKey(e){
      const k = e.key;
      if(k==='Enter'){ handleKey('ENTER'); }
      else if(k==='Backspace'){ handleKey('BACK'); }
      else if(/^[a-zA-Z]$/.test(k)){ handleKey(k.toUpperCase()); }
    }
    addEventListener('keydown', onKeyDown);

    // hint modal
    function openModal(title, bodyHtml, okLabel, onOk){
      const m=qs('#modal'); qs('#modalTitle').textContent=title; qs('#modalBody').innerHTML=bodyHtml;
      const ok=qs('#modalOk'), cancel=qs('#modalCancel');
      m.style.display='flex';
      function close(){ m.style.display='none'; ok.onclick=cancel.onclick=null; }
      cancel.onclick=close;
      ok.textContent=okLabel||'OK';
      ok.onclick=()=>{ try{ onOk&&onOk(); }finally{ close(); } };
    }

    qs('#btnHint').addEventListener('click', ()=>{
      if(gameOver) return;
      const keep = (modeName==='Pro' ? 2 : 1);
      openModal('Use a Hint?', `
        <p>Hint: <span class="badge">${hintText}</span></p>
        <p>Using a hint will leave you with <b>${keep}</b> ${keep===1?'try':'tries'}.</p>
      `,'Use Hint', ()=>{
        // lock to remaining tries
        const allow = (modeName==='Pro'?2:1);
        const newMax = Math.max(row + allow, row); // ensure at least current progress
        // disable extra rows by marking game over when we pass allowed
        const oldHandleEnter = handleEnter;
        // monkey patch: when row exceeds budget after this, convert to lose on miss
        // (we keep UI simple; user will see it naturally)
        (function wrap(){
          // no-op, behavior enforced by maxRows comparison below
        })();
        // reduce maxRows visually by greying future rows (optional)
        for(let r=row+allow; r<maxRows; r++){
          tiles[r].forEach(t=>t.style.opacity=.35);
        }
        // set logical cap
        window.__maxRowsCap = row + allow;
      });
    });

    // enforce capped rows if hint used
    const _origHandleEnter = handleEnter;
    handleEnter = function(){
      if(typeof window.__maxRowsCap === 'number' && row>=window.__maxRowsCap){ return; }
      return _origHandleEnter();
    }

    // stats
    function loadStats(){
      try{ return JSON.parse(localStorage.getItem(storageKey)||'{}'); }catch{return {}}
    }
    function saveStats(win, guesses){
      const s = loadStats();
      s.played = (s.played||0)+1;
      s.wins = (s.wins||0) + (win?1:0);
      s.streak = (win ? (s.streak||0)+1 : 0);
      s.maxStreak = Math.max(s.maxStreak||0, s.streak);
      s.dist = s.dist||{}; if(win){ s.dist[guesses] = (s.dist[guesses]||0)+1; }
      localStorage.setItem(storageKey, JSON.stringify(s));
    }
    function statsHtml(){
      const s = loadStats();
      const rows = Array.from({length:maxRows},(_,i)=>{
        const g=i+1, v=(s.dist&&s.dist[g])||0;
        return `<div style="display:flex;gap:8px;align-items:center;"><div style="width:24px;text-align:right;">${g}</div><div style="height:10px;background:#334155;border-radius:6px;flex:1;overflow:hidden;"><div style="height:10px;background:var(--present);width:${Math.min(100, v*12)}%"></div></div><div style="width:34px;text-align:right;">${v}</div></div>`;
      }).join("");
      return `<div class="statgrid">
        <div class="badge">Played: ${s.played||0}</div>
        <div class="badge">Wins: ${s.wins||0}</div>
        <div class="badge">Win%: ${s.played?Math.round((s.wins||0)*100/s.played):0}</div>
        <div class="badge">Streak: ${s.streak||0}</div>
        <div class="badge">Max: ${s.maxStreak||0}</div>
        <div style="margin-top:12px">${rows}</div>
      </div>`;
    }
    qs('#btnStats').addEventListener('click', ()=>{
      openModal(`${modeName} Stats`, statsHtml(), 'Close', null);
    });
    qs('#btnAbout').addEventListener('click', ()=>{
      openModal('About FIHR Foodle', `<p>Daily food word game.</p>
      <p>Mode: <b>${modeName}</b>. Green = Correct, Teal = Present, Gray = Absent.</p>
      <p>Follow us on: 
        <a class="btn" target="_blank" href="https://www.instagram.com/foodiesinhydreloaded/">Instagram</a>
        <a class="btn" target="_blank" href="https://www.facebook.com/groups/foodiesinhyd">Facebook</a>
      </p>`, 'Close', null);
    });

    // expose for testing
    window.__foodle = {answer};

  }; // initFoodle
})();