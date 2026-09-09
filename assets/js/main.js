(function () {
  var cells = document.querySelectorAll('#stage .cell');
  if (!cells.length) return;

  // Each circle flickers on its own clock, lightning-like: a main blink,
  // sometimes an after-flicker, sometimes a dim, then a random pause.
  function flicker(el, seed) {
    function st(cls, ms) {
      el.classList.add(cls);
      setTimeout(function () { el.classList.remove(cls); }, ms);
    }
    function strike() {
      st('off', 40 + Math.random() * 70);
      if (Math.random() < 0.65) {
        setTimeout(function () { st('off', 30 + Math.random() * 60); }, 100 + Math.random() * 140);
      }
      if (Math.random() < 0.45) {
        setTimeout(function () { st('dim', 60 + Math.random() * 60); }, 260 + Math.random() * 140);
      }
      setTimeout(strike, 1200 + Math.random() * 4800);
    }
    setTimeout(strike, 300 + seed * 230 + Math.random() * 1500);
  }

  Array.prototype.forEach.call(cells, function (el, i) { flicker(el, i); });
})();

// Hero → work: one wheel flick leaves the hero in a single heavy, eased jump
// (1.4s, slow start, long settle). A flick up from the top of the grid returns.
(function () {
  var hero = document.getElementById('hero');
  var work = document.getElementById('work');
  var stage = document.getElementById('stage');
  if (!hero || !work) return;
  var locked = false, raf = null;

  function ease(t) { // easeInOutQuint: heavy start, long deceleration
    return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
  }
  function go(to, duration) {
    // Lock first and let the browser's own in-flight wheel scroll settle
    // before we start driving scrollY, otherwise the two fight and stutter.
    locked = true;
    if (raf) cancelAnimationFrame(raf);
    var html = document.documentElement, prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    setTimeout(function () {
      var from = window.scrollY, start = performance.now();
      function step(now) {
        var t = Math.min(1, (now - start) / duration);
        window.scrollTo(0, Math.round(from + (to - from) * ease(t)));
        if (t < 1) { raf = requestAnimationFrame(step); }
        else {
          raf = null;
          html.style.overflow = prevOverflow;
          setTimeout(function () { locked = false; }, 200);
        }
      }
      raf = requestAnimationFrame(step);
    }, 120);
  }
  function down() { go(work.offsetTop, 1400); }
  function up() { go(0, 1200); }

  window.addEventListener('wheel', function (e) {
    var y = window.scrollY, h = hero.offsetHeight;
    if (locked) { e.preventDefault(); return; }
    if (e.deltaY > 0 && y < h - 2) { e.preventDefault(); down(); }
    else if (e.deltaY < 0 && y > 0 && y <= work.offsetTop + 8) { e.preventDefault(); up(); }
  }, { passive: false });
  window.addEventListener('keydown', function (e) {
    var y = window.scrollY, h = hero.offsetHeight;
    if (locked) return;
    if ((e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') && y < h - 2) { e.preventDefault(); down(); }
    else if ((e.key === 'ArrowUp' || e.key === 'PageUp') && y > 0 && y <= work.offsetTop + 8) { e.preventDefault(); up(); }
  });

  // Hero drifts up slower than the page and fades as it leaves (weight).
  function parallax() {
    var y = window.scrollY, h = hero.offsetHeight;
    if (!stage || h === 0) return;
    var p = Math.min(1, Math.max(0, y / h));
    stage.style.transform = 'translate(-50%, -50%) translateY(' + (p * h * 0.35) + 'px) scale(' + (1 - p * 0.06) + ')';
    stage.style.opacity = String(1 - p * 1.1);
  }
  window.addEventListener('scroll', parallax, { passive: true });
  parallax();
})();

// Fixed header: sample the luminance of whatever sits behind it and flip
// between black (light background) and white (dark background).
(function () {
  var hd = document.getElementById('hd');
  if (!hd) return;
  var cache = new Map();
  function canvasFor(img) {
    var c = cache.get(img);
    if (c) return c;
    var cv = document.createElement('canvas');
    cv.width = 64; cv.height = Math.max(1, Math.round(64 * img.naturalHeight / img.naturalWidth));
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    c = { cv: cv, ctx: cv.getContext('2d') };
    cache.set(img, c);
    return c;
  }
  // Mean luminance (0..1) of the part of an object-fit:cover image under rect r.
  function lumUnder(img, r) {
    if (!img.complete || !img.naturalWidth) return 1;
    var b = img.getBoundingClientRect();
    var s = Math.max(b.width / img.naturalWidth, b.height / img.naturalHeight);
    var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    var ox = b.left + (b.width - dw) / 2, oy = b.top + (b.height - dh) / 2;
    var x0 = Math.max(0, (r.left - ox) / dw), x1 = Math.min(1, (r.right - ox) / dw);
    var y0 = Math.max(0, (r.top - oy) / dh), y1 = Math.min(1, (r.bottom - oy) / dh);
    if (x1 <= x0 || y1 <= y0) return 1;
    var c = canvasFor(img), W = c.cv.width, H = c.cv.height;
    var sx = Math.floor(x0 * W), sy = Math.floor(y0 * H);
    var sw = Math.max(1, Math.ceil((x1 - x0) * W)), sh = Math.max(1, Math.ceil((y1 - y0) * H));
    var d;
    try { d = c.ctx.getImageData(sx, sy, Math.min(sw, W - sx), Math.min(sh, H - sy)).data; } catch (e) { return 1; }
    var sum = 0, n = d.length / 4;
    for (var i = 0; i < d.length; i += 4) sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    return n ? sum / n : 1;
  }
  var pending = false;
  function update() {
    pending = false;
    var r = hd.getBoundingClientRect();
    var pts = [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4], [(r.left + r.right) / 2, (r.top + r.bottom) / 2]];
    var lum = 0, n = 0;
    pts.forEach(function (p) {
      var els = document.elementsFromPoint(p[0], p[1]);
      var el = els.find(function (e) { return !hd.contains(e); });
      if (!el) return;
      var img = el.closest ? (el.matches('.tile img') ? el : (el.closest('.tile') ? el.closest('.tile').querySelector('img') : null)) : null;
      lum += img ? lumUnder(img, r) : 1;
      n++;
    });
    var light = n ? (lum / n) < 0.5 : false;
    hd.classList.toggle('light', light);
  }
  function req() { if (!pending) { pending = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  document.querySelectorAll('.tile img').forEach(function (img) { img.addEventListener('load', req); });
  req();
})();
