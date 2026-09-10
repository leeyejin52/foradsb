// Fixed header: sample the luminance of whatever sits behind it and flip
// between black (light background) and white (dark background).
// Sampling (elementsFromPoint + getImageData) is not free, so while the page
// is scrolling it runs at most every ~120ms and once more when it stops.
(function () {
  var hd = document.getElementById('hd');
  var foot = document.querySelector('.foot');
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
  // Relative luminance (0..1) of a computed "rgb(r, g, b)" colour.
  function lumOf(css) {
    var m = /(\d+)\D+(\d+)\D+(\d+)/.exec(css || '');
    return m ? (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255 : 1;
  }
  // Mean luminance (0..1) of the image under rect r. Where r falls outside the
  // image — a fitted tile shows its ground colour there — the tile's own
  // background is measured instead, since that ground can be dark.
  function lumUnder(img, r) {
    if (!img.complete || !img.naturalWidth) return 1;
    var b = img.getBoundingClientRect();
    // cover fills the box and crops; contain fits inside it and is centred.
    var fit = getComputedStyle(img).objectFit === 'contain';
    var s = fit ? Math.min(b.width / img.naturalWidth, b.height / img.naturalHeight)
                : Math.max(b.width / img.naturalWidth, b.height / img.naturalHeight);
    var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    var ox = b.left + (b.width - dw) / 2;
    var oy = fit ? b.top + (b.height - dh) / 2 : b.top; // 50% 50% vs 50% 0
    var x0 = Math.max(0, (r.left - ox) / dw), x1 = Math.min(1, (r.right - ox) / dw);
    var y0 = Math.max(0, (r.top - oy) / dh), y1 = Math.min(1, (r.bottom - oy) / dh);
    if (x1 <= x0 || y1 <= y0) {
      var tile = img.closest ? img.closest('.tile') : null;
      return tile ? lumOf(getComputedStyle(tile).backgroundColor) : 1;
    }
    var c = canvasFor(img), W = c.cv.width, H = c.cv.height;
    var sx = Math.floor(x0 * W), sy = Math.floor(y0 * H);
    var sw = Math.max(1, Math.ceil((x1 - x0) * W)), sh = Math.max(1, Math.ceil((y1 - y0) * H));
    var d;
    try { d = c.ctx.getImageData(sx, sy, Math.min(sw, W - sx), Math.min(sh, H - sy)).data; } catch (e) { return 1; }
    var sum = 0, n = d.length / 4;
    for (var i = 0; i < d.length; i += 4) sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    return n ? sum / n : 1;
  }
  function sample() {
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
  // Hide the header once the footer enters the viewport (it carries the same info).
  function footCheck() {
    if (foot) hd.classList.toggle('hidden', foot.getBoundingClientRect().top < window.innerHeight - 1);
  }
  var pending = false, lastSample = 0, settle = null;
  function update() {
    pending = false;
    footCheck();
    var now = performance.now();
    if (now - lastSample < 120) return; // sampling is expensive: cap it while the page moves
    lastSample = now;
    sample();
  }
  function req() { if (!pending) { pending = true; requestAnimationFrame(update); } }
  function force() { lastSample = 0; req(); }
  // Throttled while scrolling, then one exact sample once it stops.
  function onScroll() { req(); clearTimeout(settle); settle = setTimeout(force, 140); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', force);
  window.addEventListener('load', function () {
    force();
    // The restored scroll position lands around here; only then allow the fades.
    setTimeout(function () { hd.classList.add('ready'); }, 200);
  });
  document.querySelectorAll('.tile img').forEach(function (img) { img.addEventListener('load', force); });
  force();
})();

// Hover card: the detail block of each tile follows the cursor, kept inside
// the tile's own box so it never gets clipped.
(function () {
  var grid = document.getElementById('work');
  if (!grid || window.matchMedia('(hover: none)').matches) return;
  var tile = null, tip = null, x = 0, y = 0;
  function place() {
    if (!tile || !tip) return;
    var r = tile.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    var gap = 14;
    var tx = x - r.left + gap, ty = y - r.top + gap;
    if (tx + w > r.width - 12) tx = x - r.left - gap - w;   // flip left near the right edge
    if (ty + h > r.height - 12) ty = y - r.top - gap - h;   // flip up near the bottom
    tx = Math.max(12, tx); ty = Math.max(12, ty);
    tip.style.transform = 'translate(' + Math.round(tx) + 'px,' + Math.round(ty) + 'px)';
  }
  grid.addEventListener('mousemove', function (e) {
    var t = e.target.closest ? e.target.closest('.tile') : null;
    if (t !== tile) { tile = t; tip = t ? t.querySelector('.tip') : null; }
    x = e.clientX; y = e.clientY;
    place(); // mousemove already arrives at most once per frame
  });
  grid.addEventListener('mouseleave', function () { tile = null; tip = null; });

  // Mean luminance of each tile image decides the card colour once per tile,
  // so it never flickers while the cursor moves across a busy image.
  function rate(img) {
    var t = img.closest('.tile');
    if (!t || !img.naturalWidth) return;
    var cv = document.createElement('canvas'), W = 32, H = 32;
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d'), d;
    try { ctx.drawImage(img, 0, 0, W, H); d = ctx.getImageData(0, 0, W, H).data; } catch (e) { return; }
    var sum = 0;
    for (var i = 0; i < d.length; i += 4) sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    t.classList.toggle('on-light', sum / (d.length / 4) > 0.65); // only clearly bright images get the black card
  }
  grid.querySelectorAll('.tile img').forEach(function (img) {
    if (img.complete) rate(img); else img.addEventListener('load', function () { rate(img); });
  });
})();

// About index: the sections scroll with the page. The index marks the one whose top
// has passed the upper third of the screen, and clicking an entry scrolls to it.
(function () {
  var foot = document.querySelector('.foot');
  if (!foot) return;
  var links = foot.querySelectorAll('.index a[href^="#"]');
  var sections = foot.querySelectorAll('.about section');
  if (!links.length || !sections.length) return;
  function mark(id) {
    links.forEach(function (a) { a.parentElement.classList.toggle('active', a.getAttribute('href') === '#' + id); });
  }
  function spy() {
    var fr = foot.getBoundingClientRect();
    var top = Math.max(fr.top, 0);
    var line = top + Math.min(fr.height, window.innerHeight) * 0.3; // current once a section's top passes this line
    var cur = sections[0].id;
    sections.forEach(function (sec) { if (sec.getBoundingClientRect().top <= line) cur = sec.id; });
    var atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atEnd) cur = sections[sections.length - 1].id;
    mark(cur);
  }
  function goTo(sec, smooth) {
    window.scrollTo({
      top: sec.getBoundingClientRect().top + window.scrollY - 20,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }
  window.addEventListener('scroll', spy, { passive: true });
  window.addEventListener('resize', spy);
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      goTo(t, true);
      if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
    });
  });
  if (location.hash) { var t0 = document.querySelector(location.hash); if (t0 && t0.closest('.foot')) goTo(t0, false); }
  spy();
})();
