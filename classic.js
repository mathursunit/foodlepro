
(function(){
  const COLS = 5;
  const ROWS = 6;
  const grid = document.querySelector('[data-grid]');
  const kb   = document.querySelector('[data-keyboard]');
  const hintBtn = document.querySelector('[data-hint-btn]');

  if (!grid || !kb) return;
  grid.style.setProperty('--cols', COLS);

  // build grid
  for (let r=0;r<ROWS;r++){
    for (let c=0;c<COLS;c++){
      const d = document.createElement('div');
      d.className = 'tile';
      d.dataset.cell = `${r}:${c}`;
      grid.appendChild(d);
    }
  }

  // build keyboard
  const layout = "QWERTYUIOP ASDFGHJKL ZXCVBNM".split(" ");
  const KEYS = [];
  layout.forEach((row,i) => {
    row.split("").forEach(ch => KEYS.push(ch));
  });
  KEYS.push("⌫","Enter");

  KEYS.forEach(k => {
    const div = document.createElement('div');
    div.className = 'key';
    if (k === "Enter" || k === "⌫") div.classList.add("wide");
    div.textContent = (k === "⌫") ? "⌫" : k;
    div.dataset.key = k;
    kb.appendChild(div);
  });

  // choose today's word deterministically from list
  const wl = (window.FOODLE_CLASSIC_WORDS || []);
  const todayIdx = new Date().toISOString().slice(0,10).split("-").join("")
    .split("").reduce((a,b)=>a+parseInt(b,10),0) % wl.length;
  const today = wl[todayIdx] || { w: "apple", h: "Demo word" };
  const ANSWER = today.w.toLowerCase();

  let row = 0, col = 0, over = false, hintUsed = false;
  let activeRows = ROWS;

  function cell(r,c){ return grid.querySelector(`[data-cell="${r}:${c}"]`); }

  function readRow(r){
    let s = "";
    for (let c=0;c<COLS;c++){
      s += (cell(r,c).textContent || "").toLowerCase();
    }
    return s;
  }

  function paintRow(r, guess, answer){
    const a = answer.split("");
    const g = guess.split("");
    const used = Array(COLS).fill(false);

    // first pass correct
    for (let i=0;i<COLS;i++){
      const tile = cell(r,i);
      tile.classList.remove("correct","present","absent","filled");
      if (g[i] === a[i]){
        tile.classList.add("filled","correct");
        used[i] = true;
      }
    }
    // second pass present / absent
    for (let i=0;i<COLS;i++){
      const tile = cell(r,i);
      if (tile.classList.contains("correct")) continue;
      const idx = a.findIndex((ch,j)=> !used[j] && ch === g[i]);
      if (idx > -1){
        tile.classList.add("filled","present");
        used[idx] = true;
      } else {
        tile.classList.add("filled","absent");
      }
    }
  }

  function disableKeyboard(){
    kb.querySelectorAll(".key").forEach(k => k.classList.add("disabled"));
  }

  function commit(){
    if (over) return;
    const guess = readRow(row);
    if (guess.length !== COLS){
      showToast("Not enough letters");
      return;
    }
    paintRow(row, guess, ANSWER);
    if (guess === ANSWER){
      over = true;
      if (window.confettiTop) confettiTop({count:220});
      showToast("Game Over - You Rock!");
      disableKeyboard();
      return;
    }
    row++;
    col = 0;
    if (row >= activeRows){
      over = true;
      showToast("Game Over - Better luck tomorrow");
      disableKeyboard();
    }
  }

  function backspace(){
    if (over) return;
    if (col <= 0) return;
    col--;
    cell(row,col).textContent = "";
  }

  function insert(ch){
    if (over) return;
    if (col >= COLS) return;
    cell(row,col).textContent = ch.toUpperCase();
    col++;
  }

  function markDisabledRows(){
    for (let r=row+1;r<ROWS;r++){
      const any = cell(r,0);
      if (!any) continue;
      const rowTiles = [];
      for (let c=0;c<COLS;c++){
        rowTiles.push(cell(r,c));
      }
      rowTiles.forEach(t => {
        t.parentElement && t.parentElement.classList;
        t.classList.add("row-disabled-cell");
      });
      // easier: wrap uses row-disabled via dataset
    }
  }

  function applyHintEffect(){
    // Classic: all but ONE remaining guess.
    // That means: current row is the LAST playable row.
    activeRows = row + 1;
    // Visually cross out future rows
    for (let r=row+1;r<ROWS;r++){
      for (let c=0;c<COLS;c++){
        cell(r,c).classList.add("row-disabled");
      }
    }
  }

  function openHintConfirm(){
    if (hintUsed) {
      showToast("Hint already used");
      return;
    }
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const box = document.createElement("div");
    box.className = "modal glass";
    box.innerHTML = `
      <div class="modal-title">Use a hint?</div>
      <div class="modal-body">
        Using a hint will leave you with <strong>only one remaining guess</strong> for today's Foodle.
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="cancel">Cancel</button>
        <button class="btn" data-action="ok">Use hint</button>
      </div>
    `;
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    box.querySelector('[data-action="cancel"]').onclick = close;
    box.querySelector('[data-action="ok"]').onclick = () => {
      close();
      hintUsed = true;
      if (hintBtn) hintBtn.disabled = true;
      applyHintEffect();
      showToast("Hint: " + (today.h || "It's something tasty!"));
    };

    backdrop.addEventListener("click",e=>{
      if (e.target === backdrop) close();
    });
    window.addEventListener("keydown", function escHandler(ev){
      if (ev.key === "Escape"){
        ev.stopPropagation();
        window.removeEventListener("keydown", escHandler, true);
        close();
      }
    }, true);
  }

  kb.addEventListener("click", e => {
    const k = e.target.closest(".key");
    if (!k || k.classList.contains("disabled")) return;
    const val = k.dataset.key;
    if (val === "Enter") commit();
    else if (val === "⌫") backspace();
    else insert(val);
  });

  window.addEventListener("keydown", e => {
    if (e.repeat) return;
    const k = e.key;
    if (k === "Enter"){ e.preventDefault(); commit(); }
    else if (k === "Backspace"){ e.preventDefault(); backspace(); }
    else if (/^[a-zA-Z]$/.test(k)){ insert(k.toUpperCase()); }
  }, { passive:false });

  if (hintBtn){
    hintBtn.addEventListener("click", openHintConfirm);
  }
})();
