
window.FOODLE_BUILD = "v6.1.0";

(function(){
  // toast
  const container = document.createElement('div');
  container.className = 'toast-container';
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(container);
  });

  window.showToast = function(msg){
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    container.appendChild(t);
    // force reflow
    void t.offsetWidth;
    t.classList.add('show');
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 200);
    }, 1700);
  };

  // countdown to 8 AM IST
  function nextIST8(){
    const now = new Date();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const target = new Date(istNow);
    target.setHours(8,0,0,0);
    if (target <= istNow) target.setDate(target.getDate()+1);
    const utcMs = Date.parse(target.toLocaleString('en-US', { timeZone: 'UTC' }));
    return utcMs;
  }

  function fmt(h,m,s){
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function tickCountdown(){
    const els = document.querySelectorAll('[data-countdown]');
    if(!els.length) return;
    const ms = Math.max(0, nextIST8() - Date.now());
    const totalSec = Math.floor(ms/1000);
    const h = Math.floor(totalSec/3600);
    const m = Math.floor((totalSec%3600)/60);
    const s = totalSec%60;
    const txt = "Next word in " + fmt(h,m,s);
    els.forEach(el => el.textContent = txt);
  }

  document.addEventListener('DOMContentLoaded', () => {
    tickCountdown();
    setInterval(tickCountdown, 1000);
    // build watermark
    const badge = document.querySelector('[data-build]');
    if (badge){
      const mode = badge.getAttribute('data-mode') || 'Classic';
      badge.textContent = `Build ${window.FOODLE_BUILD} (${mode})`;
    }
  });
})();
