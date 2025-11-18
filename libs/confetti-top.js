
// ultra tiny confetti-ish burst
window.confettiTop = function(opts){
  const cfg = Object.assign({ count: 180 }, opts||{});
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.pointerEvents = 'none';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const parts = [];
  for (let i=0;i<cfg.count;i++){
    parts.push({
      x: canvas.width * 0.5,
      y: 0,
      dx: (Math.random()-0.5)*6,
      dy: Math.random()*3+2,
      r: Math.random()*4+2,
      c: `hsl(${Math.random()*360},80%,60%)`
    });
  }
  let frame = 0;
  function tick(){
    frame++;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const p of parts){
      p.x += p.dx;
      p.y += p.dy;
      p.dy += 0.08;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    }
    if(frame<140){
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  }
  tick();
};
