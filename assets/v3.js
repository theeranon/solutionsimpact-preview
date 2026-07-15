/* ============================================================
   SolutionsIMPACT V3 — immersive engine
   1) WebGL "IMPACT ripple" surface (the brand element, alive in 3D)
   2) scroll-depth reveals · nav · 3D tilt cards · parallax
   Graceful: no WebGL or reduced-motion -> static premium fallback.
   ============================================================ */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------- 1. WEBGL RIPPLE -------- */
  function initRipple() {
    if (reduce || !window.THREE || /nowebgl/.test(location.search)) { document.body.classList.add('no-webgl'); return; }
    var canvas = document.getElementById('ripple-canvas');
    if (!canvas) return;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) { document.body.classList.add('no-webgl'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    var ABYSS = 0x00060f;
    scene.fog = new THREE.Fog(ABYSS, 16, 46);

    var camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
    camera.position.set(0, 7.2, 15.5);
    camera.lookAt(0, -1.2, -3);

    // rippling surface — wireframe reads as a premium data-grid, not a game demo
    var SEG = 64, SIZE = 62;
    var geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    var pos = geo.attributes.position;
    var n = pos.count;
    var baseX = new Float32Array(n), baseY = new Float32Array(n);
    for (var i = 0; i < n; i++) { baseX[i] = pos.getX(i); baseY[i] = pos.getY(i); }
    var colors = new Float32Array(n * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    var mat = new THREE.MeshBasicMaterial({ wireframe: true, vertexColors: true, transparent: true, opacity: 0.92 });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -1.12;
    mesh.position.y = -2.4;
    scene.add(mesh);

    // colour ramp: deep navy trough -> electric blue -> gold crest tip
    var cNavy = new THREE.Color(0x03204d), cBlue = new THREE.Color(0x2f6bff), cGold = new THREE.Color(0xFFC600);
    var tmp = new THREE.Color();

    var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('pointermove', function (e) {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    function resize() {
      var w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize); resize();

    var t = 0, running = true;
    document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) loop(); });

    function loop() {
      if (!running) return;
      requestAnimationFrame(loop);
      // pause the expensive surface update + render once the hero is scrolled away —
      // keeps content-scrolling smooth (canvas is only visible over the hero anyway)
      if (window.pageYOffset > window.innerHeight + 140) return;
      t += 0.016;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      var px = pointer.x * 22, py = -pointer.y * 12; // pointer projected onto surface
      for (var i = 0; i < n; i++) {
        var x = baseX[i], y = baseY[i];
        var d = Math.sqrt(x * x + y * y);
        // concentric expanding ripples, damped outward (the IMPACT ripple)
        var z = Math.sin(d * 0.5 - t * 2.1) * 1.5 * Math.exp(-d * 0.055);
        z += Math.sin(d * 0.26 - t * 1.15) * 0.7;
        z += Math.sin(x * 0.22 + t * 0.7) * Math.cos(y * 0.2 + t * 0.55) * 0.5;
        // ripple following the cursor
        var pd = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
        z += Math.sin(pd * 0.6 - t * 3.0) * 0.9 * Math.exp(-pd * 0.12);
        pos.setZ(i, z);

        var hv = Math.min(Math.max((z + 1.6) / 3.4, 0), 1);
        if (hv < 0.72) tmp.copy(cNavy).lerp(cBlue, hv / 0.72);
        else tmp.copy(cBlue).lerp(cGold, (hv - 0.72) / 0.28);
        colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
      }
      pos.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;

      // subtle camera parallax
      camera.position.x += (pointer.x * 2.6 - camera.position.x) * 0.04;
      camera.position.y += (7.2 - pointer.y * 1.6 - camera.position.y) * 0.04;
      camera.lookAt(0, -1.2, -3);

      renderer.render(scene, camera);
    }
    loop();
  }

  /* -------- 2. SCROLL / NAV / TILT / PARALLAX -------- */
  function initUI() {
    document.documentElement.classList.add('has-js');
    var nav = document.querySelector('nav');
    var pfx = [].slice.call(document.querySelectorAll('.pfx'));
    var risers = [].slice.call(document.querySelectorAll('.rise'));

    function revealAll() { risers.forEach(function (el) { el.classList.add('in'); }); risers = []; }

    if (reduce) { revealAll(); }
    else {
      // reveal by POLLING position — immune to scroll-event / rAF throttling
      var revealCheck = function () {
        var vh = window.innerHeight || document.documentElement.clientHeight;
        for (var i = risers.length - 1; i >= 0; i--) {
          if (risers[i].getBoundingClientRect().top < vh * 0.9) { risers[i].classList.add('in'); risers.splice(i, 1); }
        }
        if (!risers.length && iv) { clearInterval(iv); iv = null; }
      };
      var iv = setInterval(revealCheck, 120);
      window.addEventListener('scroll', revealCheck, { passive: true });
      revealCheck();
      // hard safety net: never leave content stuck invisible
      setTimeout(revealAll, 3000);
    }

    // nav condense + parallax on scroll (rAF-throttled)
    var ticking = false;
    function onScroll() {
      var y = window.pageYOffset;
      if (nav) nav.classList.toggle('stuck', y > 24);
      if (!reduce) for (var i = 0; i < pfx.length; i++) {
        var sp = parseFloat(pfx[i].getAttribute('data-speed')) || 0.2;
        pfx[i].style.transform = 'translate3d(0,' + (y * sp) + 'px,0)';
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    // 3D tilt cards
    if (!reduce) {
      [].slice.call(document.querySelectorAll('[data-tilt]')).forEach(function (el) {
        var max = parseFloat(el.getAttribute('data-tilt')) || 8;
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var cx = (e.clientX - r.left) / r.width, cy = (e.clientY - r.top) / r.height;
          el.style.transform = 'perspective(900px) rotateY(' + ((cx - 0.5) * max) + 'deg) rotateX(' + ((0.5 - cy) * max) + 'deg) translateZ(24px)';
          el.style.setProperty('--mx', (cx * 100) + '%');
          el.style.setProperty('--my', (cy * 100) + '%');
        });
        el.addEventListener('pointerleave', function () { el.style.transform = ''; });
      });
    }
  }

  /* -------- 3. LIGHTWEIGHT PER-PAGE 2D BACKGROUNDS (distinct per page) -------- */
  function initBg2D() {
    if (reduce || /nowebgl/.test(location.search)) return;
    var mode = document.body.getAttribute('data-bg');
    if (mode !== 'rising' && mode !== 'grid') return;
    var canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W, H, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() {
      var w = window.innerWidth || document.documentElement.clientWidth || 1280;
      var h = window.innerHeight || document.documentElement.clientHeight || 800;
      var nw = w * dpr, nh = h * dpr;
      if (canvas.width === nw && canvas.height === nh) return; // idempotent — never blank mid-frame
      W = canvas.width = nw; H = canvas.height = nh;
    }
    size(); window.addEventListener('resize', size);
    setTimeout(size, 400);
    var run = true;
    document.addEventListener('visibilitychange', function () { run = !document.hidden; if (run) loop(); });

    if (mode === 'rising') {
      // sparks drifting upward — the energy of a room of people building
      var N = Math.min(80, Math.floor(window.innerWidth / 16)), ps = [];
      var mk = function (init) { return { x: Math.random(), y: init ? Math.random() : 1.04, r: (Math.random() * 1.6 + 0.4) * dpr, sp: Math.random() * 0.0005 + 0.00016, drift: (Math.random() - 0.5) * 0.00012, g: Math.random() < 0.22 }; };
      for (var i = 0; i < N; i++) ps.push(mk(true));
      var loop = function () {
        if (!run) return; requestAnimationFrame(loop);
        if (window.pageYOffset > (window.innerHeight || 800) + 200) return;
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < ps.length; i++) {
          var p = ps[i]; p.y -= p.sp; p.x += p.drift;
          if (p.y < -0.03) { ps[i] = mk(false); continue; }
          ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r, 0, 6.283);
          ctx.fillStyle = p.g ? 'rgba(255,198,0,.55)' : 'rgba(120,170,255,.32)';
          ctx.fill();
        }
      };
      loop();
    } else {
      // data dot-grid with a slow gold scan — proof / measurement
      var gap = 44 * dpr, t = 0;
      var loop2 = function () {
        if (!run) return; requestAnimationFrame(loop2);
        if (window.pageYOffset > (window.innerHeight || 800) + 200) return;
        t += 0.008;
        ctx.clearRect(0, 0, W, H);
        var scan = (Math.sin(t) * 0.5 + 0.5) * H, band = 150 * dpr;
        for (var y = gap; y < H; y += gap) {
          var d = Math.abs(y - scan), a = Math.max(0, 1 - d / band);
          for (var x = gap; x < W; x += gap) {
            ctx.beginPath(); ctx.arc(x, y, (a > 0.55 ? 1.5 : 1) * dpr, 0, 6.283);
            ctx.fillStyle = a > 0.55 ? 'rgba(255,198,0,' + (a * 0.6) + ')' : 'rgba(120,170,255,' + (0.05 + a * 0.4) + ')';
            ctx.fill();
          }
        }
      };
      loop2();
    }
  }

  /* -------- 4. ARTICLE READING PROGRESS BAR -------- */
  function initProgress() {
    var bar = document.querySelector('.readbar');
    if (!bar) return;
    var ticking = false;
    function upd() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.pageYOffset / h) * 100 : 0) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    setInterval(upd, 200); upd();
  }

  function start() { initRipple(); initBg2D(); initUI(); initProgress(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
