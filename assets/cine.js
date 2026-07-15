/* SolutionsIMPACT — living IMPACT-ripple for any canvas.cine-ripple (shared) */
(function(){
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var canvases = document.querySelectorAll('canvas.cine-ripple');
  canvases.forEach(function(c){
    var ctx = c.getContext('2d'); if(!ctx) return;
    var W, H, DPR;
    function resize(){
      DPR = Math.min(window.devicePixelRatio||1, 2);
      W = c.clientWidth; H = c.clientHeight;
      c.width = W*DPR; c.height = H*DPR;
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }
    var rings = [{r:0}], last = 0, acc = 0, SPAWN = 900;
    function frame(t){
      var dt = t - last; last = t;
      ctx.clearRect(0,0,W,H);
      var ox = W*0.16, oy = H*0.46, max = Math.hypot(W,H);
      for(var i=rings.length-1;i>=0;i--){
        var ring = rings[i];
        ring.r += (max/6000)*dt;
        var life = ring.r/(max*1.05);
        if(life>=1){ rings.splice(i,1); continue; }
        var a = (1-life)*0.5, gold = (i%2===0);
        ctx.beginPath();
        ctx.arc(ox,oy,ring.r,0,Math.PI*2);
        ctx.lineWidth = 1.4 + (1-life)*2.2;
        ctx.strokeStyle = gold ? 'rgba(255,198,0,'+(a*0.9)+')' : 'rgba(90,150,255,'+(a*0.8)+')';
        ctx.stroke();
      }
      acc += dt;
      if(acc > SPAWN){ acc = 0; rings.push({r:0}); }
      requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(function(t){ last = t; requestAnimationFrame(frame); });
  });
})();
