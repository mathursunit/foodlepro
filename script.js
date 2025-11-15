/* Shared game script — v5.0.9 */
(function(){
'use strict';

const MODE = (window.GAME_MODE||'classic');
const WORDLEN = window.WORDLEN||5;
const MAX_ROWS = window.MAX_ROWS||5;
const HINT_REMAINING = MODE==='pro' ? 2 : 1;  // after hint
const LS_STATS_CLASSIC = 'fihr_stats_v1';
const LS_STATS_PRO = 'fihr_stats_v1_pro';
const grid = document.getElementById('grid');
const keyboard = document.getElementById('keyboard');
const hintBtn = document.getElementById('hintBtn');
const statsBtn = document.getElementById('statsBtn');
const aboutBtn = document.getElementById('aboutBtn');
const hintText = document.getElementById('hintText');

let words=[], hints={}, solution='', row=0, col=0, LOCK=false, HINT_USED=false;

const csvPath = MODE==='pro' ? '../assets/fihr_words6_temp.csv' : 'assets/fihr_food_words_v1.4.csv';

/* Countdown to 8AM IST */
(function tick(){
  const el=document.getElementById('countdown'); if(!el) return;
  function nextIST8(){
    const now=new Date();
    const utc= now.getTime() + now.getTimezoneOffset()*60000;
    const ist= new Date(utc + 330*60000);
    ist.setHours(8,0,0,0);
    if (ist < new Date(utc + 330*60000)) ist.setDate(ist.getDate()+1);
    return ist.getTime() - (utc + 330*60000);
  }
  function fmt(ms){ const s=Math.floor(ms/1000); const h=String(Math.floor(s/3600)).padStart(2,'0'); const m=String(Math.floor(s%3600/60)).padStart(2,'0'); const ss=String(s%60).padStart(2,'0'); return `${h}:${m}:${ss}`; }
  function loop(){ const ms=nextIST8(); el.textContent='Next word in '+fmt(ms); requestAnimationFrame(loop); }
  loop();
})();

/* Utils */
function dailyIndex(n){
  const now=new Date();
  const utc= now.getTime() + now.getTimezoneOffset()*60000;
  const ist= utc + 330*60000;
  const cutoff = new Date(ist - 8*3600000); // shift 8am
  const epoch = Date.UTC(2024,0,1,0,0,0);
  const days = Math.floor((cutoff.getTime()-epoch)/86400000);
  return n? ((days % n)+n)%n : 0;
}
function tileAt(r,c){ return grid.children[r*WORDLEN + c]; }
function currentGuess(){ let s=''; for (let c=0;c<WORDLEN;c++) s+= (tileAt(r,c).textContent||''); return s; }
function disableInput(){ LOCK=true; /* keep keyboard visible */ }
function enableInput(){ LOCK=false; }
function showToast(msg){
  let t=document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; document.body.appendChild(t);
    Object.assign(t.style,{position:'fixed',left:'50%',transform:'translateX(-50%)',bottom:'72px',background:'#111',color:'#fff',padding:'.6rem .9rem',borderRadius:'10px',fontWeight:'800',boxShadow:'0 6px 24px rgba(0,0,0,.35)',zIndex:2000});
  }
  t.textContent=msg; t.style.opacity='1'; clearTimeout(window.__t); window.__t=setTimeout(()=>t.style.opacity='0',1800);
}

/* Rendering */
function renderGrid(){
  grid.style.gridTemplateColumns = `repeat(${WORDLEN}, var(--tileSize))`;
  grid.innerHTML='';
  for(let i=0;i<MAX_ROWS*WORDLEN;i++){
    const t=document.createElement('div'); t.className='tile'; grid.appendChild(t);
  }
}
function loadKeyboard(){
  const rows=[['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['ENTER','Z','X','C','V','B','N','M','⌫']];
  keyboard.innerHTML='';
  rows.forEach(rowKeys=>{
    const rdiv=document.createElement('div'); rdiv.className='krow';
    rowKeys.forEach(k=>{
      const b=document.createElement('button'); b.className='key'; if(k==='ENTER'||k==='⌫') b.classList.add('wide'); b.textContent=k;
      b.addEventListener('click', ()=>onKey(k)); rdiv.appendChild(b);
    }); keyboard.appendChild(rdiv);
  });
}
function autoSize(){
  const root=document.documentElement;
  const vh=window.innerHeight||root.clientHeight, vw=window.innerWidth||root.clientWidth;
  const kbd=keyboard.getBoundingClientRect().height||220;
  const margins=160; // header + brand + controls + legend
  const gap=6;
  const byH=Math.floor((vh - kbd - margins - (MAX_ROWS-1)*gap)/MAX_ROWS);
  const byW=Math.floor(((vw*0.9) - (WORDLEN-1)*gap)/WORDLEN);
  const size=Math.max(28,Math.min(byH,byW));
  root.style.setProperty('--tileSize', size+'px');
}
window.addEventListener('resize',autoSize);
window.addEventListener('orientationchange',autoSize);

/* CSV load */
async function loadWords(){
  try{
    const txt = await fetch(csvPath,{cache:'no-store'}).then(r=>r.text());
    const lines = txt.split('\n'); // header + rows
    for(let i=1;i<lines.length;i++){
      const line=(lines[i]||'').trim(); if(!line) continue;
      const pos=line.indexOf(',');
      if(pos<0) continue;
      let w=line.slice(0,pos).toUpperCase();
      // strip non-letters without regex
      let clean=''; for(let j=0;j<w.length;j++){ const ch=w[j], L=ch.toLowerCase(); if(L>='a'&&L<='z') clean+=ch; }
      const h=line.slice(pos+1).trim();
      if(clean.length===WORDLEN){ words.push(clean); hints[clean]=h; }
    }
  }catch(e){}
  if(!words.length){
    if(MODE==='pro'){ words=['BANANA','BUTTER','CHEESE','COOKIEE','ORANGE','PIZZAO','TOMATOE','SPICES','PANEER','GINGER']; }
    else { words=['BASIL','PLATE','MANGO','APPLE','CHILI','WHEAT','GHEE','BIRYI','IDLIY','LASSI']; }
    hints={'BASIL':'Herb for pesto','PLATE':'Served on this','MANGO':'King of fruits','APPLE':'Keeps doc away','CHILI':'Hot pepper','WHEAT':'Bread grain','GHEE':'Clarified butter','BIRYI':'Hyderabadi rice','IDLIY':'Steamed South snack','LASSI':'Punjabi yogurt drink','BANANA':'Yellow fruit','BUTTER':'Dairy spread','CHEESE':'Aged dairy','COOKIEE':'Baked treat','ORANGE':'Citrus fruit','PIZZAO':'Slice of heaven','TOMATOE':'Red salad fruit','SPICES':'Masala magic','PANEER':'Cottage cheese','GINGER':'Spicy root'};
  }
  const idx=dailyIndex(words.length);
  solution=words[idx]||words[0];
  renderGrid(); loadKeyboard(); autoSize();
  setTimeout(autoSize,0);
}

/* Input */
function onKey(k){
  if(LOCK) return;
  if(k==='⌫'){ if(col>0){ col--; const t=tileAt(row,col); t.textContent=''; t.classList.remove('filled'); } return; }
  if(k==='ENTER'){ submit(); return; }
  if(k.length===1){
    const ch=k.toUpperCase();
    if(ch>='A'&&ch<='Z' && col<WORDLEN){ const t=tileAt(row,col); t.textContent=ch; t.classList.add('filled'); col++; }
  }
}
window.addEventListener('keydown',e=>{
  let k=e.key; if(k==='Backspace') k='⌫'; else if(k==='Enter') k='ENTER'; else k=k.toUpperCase();
  if(k==='ENTER'||k==='⌫'||(k.length===1 && k>='A'&&k<='Z')) onKey(k);
});

function evaluate(g){
  const res=new Array(WORDLEN).fill('absent'), sol=solution.split(''), ga=g.split('');
  for(let i=0;i<WORDLEN;i++){ if(ga[i]===sol[i]){ res[i]='correct'; sol[i]='*'; ga[i]='_'; } }
  for(let i=0;i<WORDLEN;i++){ if(res[i]==='correct') continue; const p=sol.indexOf(ga[i]); if(p>-1){ res[i]='present'; sol[p]='*'; } }
  return res;
}
function paintRow(r,res){ for(let c=0;c<WORDLEN;c++){ tileAt(r,c).classList.add(res[c]); } }

/* Stats */
function loadStats(mode){ const key = mode==='pro'? LS_STATS_PRO : LS_STATS_CLASSIC; try{ return JSON.parse(localStorage.getItem(key)||'{}'); }catch(e){ return {}; } }
function saveStats(mode, s){ const key = mode==='pro'? LS_STATS_PRO : LS_STATS_CLASSIC; localStorage.setItem(key, JSON.stringify(s)); }
function record(win){
  const keyMode=MODE==='pro'?'pro':'classic';
  const s = Object.assign({played:0,wins:0,cur:0,max:0,totalGuesses:0,hints:0,lastSolution:''}, loadStats(keyMode));
  s.played++; if(win){ s.wins++; s.cur++; if(s.cur>s.max) s.max=s.cur; s.totalGuesses += (row+1); } else { s.cur=0; }
  if(HINT_USED) s.hints++;
  s.lastSolution=solution;
  saveStats(keyMode, s);
}
function openStats(initial='classic'){
  const m=document.getElementById('statsModal'); m.classList.add('open');
  const c=document.getElementById('statsClassic'), p=document.getElementById('statsPro');
  function card(k,v){ return `<div style="display:inline-block;min-width:120px;margin:6px 8px;text-align:center"><div style="color:var(--muted)">${k}</div><div style="font-weight:900;font-size:1.3rem">${v}</div></div>`; }
  function render(mode, el){
    const st = loadStats(mode);
    const winRate = st.played? Math.round(100* (st.wins||0) / st.played)+'%' : '0%';
    el.innerHTML = card('Played', st.played||0)+card('Wins',st.wins||0)+card('Win Rate',winRate)+card('Current Streak',st.cur||0)+card('Max Streak',st.max||0)+card('Avg Guesses', (st.wins? (st.totalGuesses/st.wins).toFixed(1):'0.0'))+card('Hints Used',st.hints||0)+card('Last', st.lastSolution||'-');
  }
  render('classic',c); render('pro',p);
  const tabC=document.getElementById('tabClassic'), tabP=document.getElementById('tabPro');
  function show(which){ if(which==='classic'){ c.style.display='block'; p.style.display='none'; tabC.disabled=true; tabP.disabled=false; } else { c.style.display='none'; p.style.display='block'; tabC.disabled=false; tabP.disabled=true; } }
  show(initial);
  document.getElementById('resetStats').onclick=()=>{ const mode = tabC.disabled? 'pro' : 'classic'; saveStats(mode,{}); show(mode); };
}

/* End game & hint */
function endGame(win){
  disableInput();
  try{ confetti && confetti({particleCount: 220, spread: 80, origin: { y: .6 }}); }catch(e){}
  record(win);
  showToast(win? 'Game Over - You Rock!' : 'Game Over - Better luck tomorrow');
  if(hintBtn) hintBtn.disabled=true;
}
function submit(){
  if(col<WORDLEN) return;
  const g=currentGuess();
  let valid=false; for(let i=0;i<words.length;i++){ if(words[i]===g){ valid=true; break; } }
  if(!valid){ showToast('Not in word list'); return; }
  const res=evaluate(g); paintRow(row,res);
  if(g===solution){ endGame(true); return; }
  row++; col=0;
  if(row>=MAX_ROWS){ endGame(false); }
}

function useHint(){
  if(HINT_USED) return;
  HINT_USED=true;
  const keepStart = MAX_ROWS - HINT_REMAINING;
  for(let rr=0; rr<keepStart; rr++){ for(let c=0;c<WORDLEN;c++){ tileAt(rr,c).classList.add('ghost'); } }
  if(row < keepStart) row = keepStart; col=0;
  const h = hints[solution] || '';
  if(hintText){ hintText.textContent = h? ('Hint: '+h) : 'Hint used'; }
  if(hintBtn){ hintBtn.disabled=true; hintBtn.style.opacity=.5; }
  showToast(HINT_REMAINING===1 ? 'Only 1 guess left!' : 'Only 2 guesses left!');
}

/* Wire UI */
if(hintBtn){
  document.getElementById('hintModal').querySelectorAll('[data-close], #hintCancel').forEach(el=>el.addEventListener('click', ()=>document.getElementById('hintModal').classList.remove('open')));
  document.getElementById('hintConfirm').addEventListener('click', ()=>{ document.getElementById('hintModal').classList.remove('open'); useHint(); });
  hintBtn.addEventListener('click', ()=>document.getElementById('hintModal').classList.add('open'));
}
if(statsBtn){ statsBtn.onclick=()=>openStats(MODE==='pro'?'pro':'classic'); }
if(aboutBtn){ aboutBtn.onclick=()=>document.getElementById('aboutModal').classList.add('open'); }
document.querySelectorAll('.modal .bg,[data-close]').forEach(el=>el.addEventListener('click',e=>{ const m=el.closest('.modal'); m && m.classList.remove('open'); }));
window.addEventListener('keydown', e=>{ if(e.key==='Escape'){ document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open')); } });

/* Init */
renderGrid(); loadKeyboard(); loadWords();
})();