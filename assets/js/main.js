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
      var tile = el.closest ? el.closest('.tile') : null;
      var img = tile ? tile.querySelector('img') : null;
      lum += img ? lumUnder(img, r) : 1;
      n++;
    });
    hd.classList.toggle('light', n ? (lum / n) < 0.5 : false);
  }
  function req() { if (!pending) { pending = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  window.addEventListener('load', req);
  document.querySelectorAll('.tile img').forEach(function (img) { img.addEventListener('load', req); });
  req();
})();

// Hide the fixed header once the footer enters the viewport (the footer
// carries the same information).
(function () {
  var hd = document.getElementById('hd');
  var foot = document.querySelector('.foot');
  if (!hd || !foot) return;
  function check() {
    hd.classList.toggle('hidden', foot.getBoundingClientRect().top < window.innerHeight - 1);
  }
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check);
  window.addEventListener('load', check);
  check();
})();

// Row flick: one wheel gesture moves exactly one row (each row is one screen).
// 1.0s heavy easing, trackpad momentum is swallowed until the gesture ends.
// Footer is the final stop. Touch devices scroll freely.
(function () {
  var grid = document.getElementById('work');
  if (!grid) return;
  var tiles = grid.querySelectorAll('.tile');
  if (!tiles.length) return;
  var body = document.body, html = document.documentElement;
  var locked = false, quiet = true, lastWheel = 0, raf = null;

  function stops() {
    var tops = [], seen = {};
    tiles.forEach(function (t) { var y = Math.round(t.offsetTop); if (!seen[y]) { seen[y] = 1; tops.push(y); } });
    var max = Math.max(0, html.scrollHeight - window.innerHeight);
    if (max > tops[tops.length - 1] + 2) tops.push(max); // footer
    return tops;
  }
  function active() { return window.matchMedia('(pointer: fine)').matches; }
  function ease(t) { return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2; }

  function go(to, duration) {
    var from = window.scrollY, start = performance.now();
    locked = true;
    body.classList.add('scrolling');
    html.style.overflow = 'hidden';
    if (raf) cancelAnimationFrame(raf);
    function step(now) {
      var t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, Math.round(from + (to - from) * ease(t)));
      if (t < 1) raf = requestAnimationFrame(step);
      else {
        raf = null;
        html.style.overflow = '';
        body.classList.remove('scrolling');
        setTimeout(function () { locked = false; }, 120);
      }
    }
    raf = requestAnimationFrame(step);
  }
  function jump(dir) {
    var s = stops(), y = window.scrollY, i = 0;
    for (var k = 0; k < s.length; k++) if (Math.abs(s[k] - y) < Math.abs(s[i] - y)) i = k;
    var n = Math.min(s.length - 1, Math.max(0, i + dir));
    if (n === i && Math.abs(s[i] - y) < 2) return;
    go(s[n], 1000);
  }

  window.addEventListener('wheel', function (e) {
    if (!active()) return;
    var now = performance.now();
    if (now - lastWheel > 400) quiet = true; // a pause means a new gesture
    lastWheel = now;
    if (locked) { e.preventDefault(); return; }
    if (!quiet) { // momentum tail of the gesture that already moved us
      e.preventDefault();
      if (Math.abs(e.deltaY) < 4) quiet = true;
      return;
    }
    if (Math.abs(e.deltaY) < 4) return;
    e.preventDefault();
    quiet = false;
    jump(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (!active() || locked) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); jump(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); jump(-1); }
  });
})();
