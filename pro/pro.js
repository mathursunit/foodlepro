
/* Foodle Pro v6.0.4 */
(function(){
'use strict';
const WORDLEN=6, MAX_ROWS=6;
const grid=document.getElementById('grid');
const keyboard=document.getElementById('keyboard');
const spinner=document.getElementById('spinner');
const hintBtn=document.getElementById('hintBtn');
const statsBtn=document.getElementById('statsBtn');
const aboutBtn=document.getElementById('aboutBtn');
const hintText=document.getElementById('hintText');
let words=[], hints={}, solution='', row=0, col=0, LOCK=false, HINT_USED=false;
const CSV_PATH='../assets/fihr_food_words_pro_v1.csv';

(function(){const ind=document.querySelector('.mode-tabs .tab-indicator');const active=document.querySelector('.mode-tabs .tab.active');if(ind&&active){const set=()=>{ind.style.left=(active.offsetLeft + (active.offsetWidth-ind.offsetWidth)/2)+'px';};setTimeout(set,0);addEventListener('resize', set);}})();
(function(){const el=document.getElementById('countdown');if(!el)return;function until(){const now=new Date();const utc=now.getTime()+now.getTimezoneOffset()*60000;const ist=new Date(utc+330*60000);ist.setHours(8,0,0,0);if(ist.getTime()<=utc+330*60000)ist.setDate(ist.getDate()+1);return ist.getTime()-(utc+330*60000);}function fmt(ms){const s=Math.floor(ms/1000),h=(''+Math.floor(s/3600)).padStart(2,'0'),m=(''+Math.floor(s%3600/60)).padStart(2,'0'),ss=(''+(s%60)).padStart(2,'0');return h+':'+m+':'+ss;}function tick(){el.textContent='Next word in '+fmt(until());requestAnimationFrame(tick);}tick();})();

function dailyIndex(n){const now=new Date();const utc=now.getTime()+now.getTimezoneOffset()*60000;const ist= utc + 330*60000;const epoch=Date.UTC(2024,0,1,0,0,0);const days=Math.floor((ist-8*3600000-epoch)/86400000);return n?((days % n)+n)%n:0;}
function tileAt(r,c){return grid.children[r*WORDLEN+c];}
function guessString(){let s='';for(let c=0;c<WORDLEN;c++) s+= (tileAt(row,c).textContent||'');return s;}
function showToast(msg){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);Object.assign(t.style,{position:'fixed',left:'50%',transform:'translateX(-50%)',bottom:'72px',background:'#111',color:'#fff',padding:'.6rem .9rem',borderRadius:'10px',fontWeight:'800',boxShadow:'0 6px 24px rgba(0,0,0,.35)',zIndex:2000});}t.textContent=msg;t.style.opacity='1';clearTimeout(window.__t);window.__t=setTimeout(()=>t.style.opacity='0',1800);}

function renderGrid(){grid.style.display='grid';grid.style.gridTemplateColumns=`repeat(${WORDLEN}, var(--tileSize,56px))`;grid.innerHTML='';for(let i=0;i<MAX_ROWS*WORDLEN;i++){const t=document.createElement('div');t.className='tile';grid.appendChild(t);}}
function loadKeyboard(){const rows=[['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['ENTER','Z','X','C','V','B','N','M','⌫']];keyboard.innerHTML='';rows.forEach(rowKeys=>{const r=document.createElement('div');r.className='krow';rowKeys.forEach(k=>{const b=document.createElement('button');b.className='key';if(k==='ENTER'||k==='⌫') b.classList.add('wide');b.textContent=k;b.addEventListener('click',()=>onKey(k));r.appendChild(b);});keyboard.appendChild(r);});}
function autoSize(){const root=document.documentElement;const vh=innerHeight||root.clientHeight,vw=innerWidth||root.clientWidth;const kbd=keyboard.getBoundingClientRect().height||220;const margins=175;const gap=6;const byH=Math.floor((vh-kbd-margins-(MAX_ROWS-1)*gap)/MAX_ROWS);const byW=Math.floor(((vw*0.9)-(WORDLEN-1)*gap)/WORDLEN);const size=Math.max(28,Math.min(byH,byW));root.style.setProperty('--tileSize', size+'px');}
addEventListener('resize',autoSize);addEventListener('orientationchange',autoSize);

async function loadWords(){try{spinner.style.display='block';const txt=await fetch(CSV_PATH,{cache:'no-store'}).then(r=>r.text());const lines=txt.split('\n');for(let i=1;i<lines.length;i++){const line=(lines[i]||'').trim();if(!line) continue;const pos=line.indexOf(',');if(pos<0) continue;let w=line.slice(0,pos).toUpperCase();let clean='';for(let j=0;j<w.length;j++){const ch=w[j],L=ch.toLowerCase();if(L>='a'&&L<='z') clean+=ch;}const h=line.slice(pos+1).trim();if(clean.length===WORDLEN){words.push(clean);hints[clean]=h;}}}catch(e){}if(!words.length){words=['PANEER','SPICES','GINGER','TOMATO','ORANGE','BUTTER','CHEESE','MASALA','PICKLE','PAPAYA'];hints={'PANEER':'Indian cottage cheese','SPICES':'Masala magic','GINGER':'Zesty root','TOMATO':'Salad + sauce staple','ORANGE':'Citrus fruit','BUTTER':'Dairy spread','CHEESE':'Aged dairy','MASALA':'Spice blend','PICKLE':'Tangy preserved veg','PAPAYA':'Tropical fruit'};}const idx=dailyIndex(words.length);solution=words[idx]||words[0];renderGrid();loadKeyboard();autoSize();setTimeout(autoSize,0);}
function push(ch){if(LOCK||col>=WORDLEN) return;const t=tileAt(row,col);t.textContent=ch;t.classList.add('filled');col++;}
function pop(){if(LOCK||col<=0) return;col--;const t=tileAt(row,col);t.textContent='';t.classList.remove('filled');}
function onKey(k){if(LOCK) return;if(k==='⌫'){pop();return;}if(k==='ENTER'){submit();return;}if(k.length===1){const ch=k.toUpperCase();if(ch>='A'&&ch<='Z') push(ch);}}
addEventListener('keydown', e=>{let k=e.key;if(k==='Backspace') k='⌫'; else if(k==='Enter') k='ENTER'; else k=k.toUpperCase();if(k==='ENTER'||k==='⌫'||(k.length===1&&k>='A'&&k<='Z')) onKey(k);});

function evaluate(g){const res=new Array(WORDLEN).fill('absent'),sol=solution.split(''),ga=g.split('');for(let i=0;i<WORDLEN;i++){if(ga[i]===sol[i]){res[i]='correct';sol[i]='*';ga[i]='_';}}for(let i=0;i<WORDLEN;i++){if(res[i]==='correct') continue;const p=sol.indexOf(ga[i]);if(p>-1){res[i]='present';sol[p]='*';}}return res;}
function paintRow(r,res){for(let c=0;c<WORDLEN;c++){tileAt(r,c).classList.add(res[c]);}}

function loadStats(){try{return JSON.parse(localStorage.getItem('fihr_stats_v1_pro')||'{}');}catch(e){return {};}}function saveStats(s){localStorage.setItem('fihr_stats_v1_pro', JSON.stringify(s));}
function record(win){const s=Object.assign({played:0,wins:0,cur:0,max:0,totalGuesses:0,hints:0,lastSolution:''}, loadStats());s.played++;if(win){s.wins++;s.cur++;if(s.cur>s.max)s.max=s.cur;s.totalGuesses+=(row+1);}else{s.cur=0;}if(HINT_USED)s.hints++;s.lastSolution=solution;saveStats(s);}
function openStats(){const m=document.getElementById('statsModal');const b=document.getElementById('statsBody');const s=Object.assign({played:0,wins:0,cur:0,max:0,totalGuesses:0,hints:0,lastSolution:'-'}, loadStats());const winRate=s.played?Math.round(100*s.wins/s.played)+'%':'0%';const avg=s.wins?(s.totalGuesses/s.wins).toFixed(1):'0.0';b.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center"><div><div style="color:#9aa4b2">Played</div><div style="font-weight:900;font-size:1.3rem">${s.played}</div></div><div><div style="color:#9aa4b2">Wins</div><div style="font-weight:900;font-size:1.3rem">${s.wins}</div></div><div><div style="color:#9aa4b2">Win Rate</div><div style="font-weight:900;font-size:1.3rem">${winRate}</div></div><div><div style="color:#9aa4b2">Current Streak</div><div style="font-weight:900;font-size:1.3rem">${s.cur}</div></div><div><div style="color:#9aa4b2">Max Streak</div><div style="font-weight:900;font-size:1.3rem">${s.max}</div></div><div><div style="color:#9aa4b2">Avg Guesses</div><div style="font-weight:900;font-size:1.3rem">${avg}</div></div><div><div style="color:#9aa4b2">Hints Used</div><div style="font-weight:900;font-size:1.3rem">${s.hints}</div></div><div><div style="color:#9aa4b2">Last</div><div style="font-weight:900;font-size:1.3rem">${s.lastSolution}</div></div></div>`;m.classList.add('open');}

function endGame(win){LOCK=true;try{window.confetti&&window.confetti({particleCount:200,spread:70,origin:{y:0.6}});}catch(e){}record(win);showToast(win?'Game Over - You Rock!':'Game Over - Better luck tomorrow');if(hintBtn) hintBtn.disabled=true;}
function submit(){if(col<WORDLEN) return;const g=guessString();let valid=false;for(let i=0;i<words.length;i++){if(words[i]===g){valid=true;break;}}if(!valid){showToast('Not in word list');return;}const res=evaluate(g);paintRow(row,res);if(g===solution){endGame(true);return;}row++;col=0;if(row>=MAX_ROWS){endGame(false);}}
function useHint(){if(HINT_USED) return;HINT_USED=true;const keepStart=MAX_ROWS-2;for(let rr=0;rr<keepStart;rr++){for(let c=0;c<WORDLEN;c++){tileAt(rr,c).classList.add('ghost');}}if(row<keepStart) row=keepStart;col=0;const h=hints[solution]||'';if(hintText) hintText.textContent=h?('Hint: '+h):'Hint used';if(hintBtn){hintBtn.disabled=true;hintBtn.style.opacity=.5;}showToast('Only 2 guesses left!');}

document.querySelectorAll('.modal .bg,[data-close]').forEach(el=>el.addEventListener('click',e=>{el.closest('.modal').classList.remove('open');}));
addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open'));}});
hintBtn&&hintBtn.addEventListener('click',()=>{if(!HINT_USED) document.getElementById('hintModal').classList.add('open');});
document.getElementById('hintCancel').addEventListener('click',()=>document.getElementById('hintModal').classList.remove('open'));
document.getElementById('hintConfirm').addEventListener('click',()=>{document.getElementById('hintModal').classList.remove('open');useHint();});
statsBtn&&statsBtn.addEventListener('click',openStats);
aboutBtn&&aboutBtn.addEventListener('click',()=>document.getElementById('aboutModal').classList.add('open'));

function onKey(k){if(LOCK) return;if(k==='⌫'){pop();return;}if(k==='ENTER'){submit();return;}if(k.length===1){const ch=k.toUpperCase();if(ch>='A'&&ch<='Z') push(ch);}}
function push(ch){if(LOCK||col>=WORDLEN) return;const t=tileAt(row,col);t.textContent=ch;t.classList.add('filled');col++;}
function pop(){if(LOCK||col<=0) return;col--;const t=tileAt(row,col);t.textContent='';t.classList.remove('filled');}

addEventListener('keydown', e=>{let k=e.key;if(k==='Backspace') k='⌫'; else if(k==='Enter') k='ENTER'; else k=k.toUpperCase();if(k==='ENTER'||k==='⌫'||(k.length===1&&k>='A'&&k<='Z')) onKey(k);});

function autoSize(){const root=document.documentElement;const vh=innerHeight||root.clientHeight,vw=innerWidth||root.clientWidth;const kbd=keyboard.getBoundingClientRect().height||220;const margins=175;const gap=6;const byH=Math.floor((vh-kbd-margins-(MAX_ROWS-1)*gap)/MAX_ROWS);const byW=Math.floor(((vw*0.9)-(WORDLEN-1)*gap)/WORDLEN);const size=Math.max(28,Math.min(byH,byW));root.style.setProperty('--tileSize', size+'px');}
addEventListener('resize',autoSize);addEventListener('orientationchange',autoSize);

renderGrid();loadKeyboard();autoSize();(async()=>{await loadWords();spinner.style.display='none';})();
})();