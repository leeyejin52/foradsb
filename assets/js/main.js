// Fixed header: sample the luminance of whatever sits behind it and flip
// between black (light background) and white (dark background).
// Sampling (elementsFromPoint + getImageData) is not free, so while the page
// is being animated it runs at most every ~120ms and once more on arrival.
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
  // Mean luminance (0..1) of the part of an object-fit:cover image under rect r.
  function lumUnder(img, r) {
    if (!img.complete || !img.naturalWidth) return 1;
    var b = img.getBoundingClientRect();
    var s = Math.max(b.width / img.naturalWidth, b.height / img.naturalHeight);
    var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    var ox = b.left + (b.width - dw) / 2, oy = b.top; // matches object-position: 50% 0
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
  var pending = false, lastSample = 0;
  function update() {
    pending = false;
    footCheck();
    var now = performance.now();
    if (document.body.classList.contains('scrolling') && now - lastSample < 120) return;
    lastSample = now;
    sample();
  }
  function req() { if (!pending) { pending = true; requestAnimationFrame(update); } }
  function force() { lastSample = 0; req(); }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', force);
  window.addEventListener('load', force);
  document.addEventListener('rowarrive', force);
  document.querySelectorAll('.tile img').forEach(function (img) { img.addEventListener('load', force); });
  force();
})();

// Row flick: one wheel gesture moves exactly one row (each row is one screen).
// Quick launch, long soft landing (expo-out). Trackpad momentum is swallowed
// until the gesture ends. Footer is the final stop. Touch devices scroll freely.
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
  // Smooth in both directions but far less flat at the ends than quint-in-out,
  // so there is no visible "stick" before it moves or before it stops.
  function expoOut(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function cubicInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function curve(t) { return cubicInOut(t) * 0.35 + expoOut(t) * 0.65; }

  function go(to, duration) {
    var from = window.scrollY, start = performance.now();
    locked = true;
    body.classList.add('scrolling');
    if (raf) cancelAnimationFrame(raf);
    function step(now) {
      var t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, from + (to - from) * curve(t));
      if (t < 1) raf = requestAnimationFrame(step);
      else {
        raf = null;
        body.classList.remove('scrolling');
        document.dispatchEvent(new Event('rowarrive'));
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
    go(s[n], 900);
  }

  window.addEventListener('wheel', function (e) {
    if (!active()) return;
    var panel = document.getElementById('panel');
    if (panel && panel.contains(e.target)) return; // the panel scrolls natively
    // Cancel every wheel event, including the tiny first one of a trackpad gesture.
    // If the first event of a gesture gets through, the browser makes the rest of that
    // gesture uncancellable and its native momentum scroll fights our animation (jitter).
    e.preventDefault();
    if (body.classList.contains('shifting')) return;
    var now = performance.now();
    if (now - lastWheel > 400) quiet = true; // a pause means a new gesture
    lastWheel = now;
    if (locked) return;
    if (!quiet) { // momentum tail of the gesture that already moved us
      if (Math.abs(e.deltaY) < 4) quiet = true;
      return;
    }
    if (Math.abs(e.deltaY) < 4) return; // gesture is still winding up
    quiet = false;
    jump(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (!active() || locked || body.classList.contains('shifting')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); jump(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); jump(-1); }
  });
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

// Detail panel: clicking a tile opens its photos in a panel on the right.
// Photo paths come from data-images; a missing file shows a grey placeholder
// with the path it expects, so dropping the real file in is all that is needed.
(function () {
  var panel = document.getElementById('panel');
  var grid = document.getElementById('work');
  if (!panel || !grid) return;
  var body = document.body;
  var title = panel.querySelector('.panel-title'), meta = panel.querySelector('.panel-meta');
  var role = panel.querySelector('.panel-role'), desc = panel.querySelector('.panel-desc');
  var imgs = panel.querySelector('.panel-images');
  var current = null;

  function text(tile, sel) { var el = tile.querySelector(sel); return el ? el.textContent : ''; }
  var SLIDE = 480; // must match the panel and .page.moving transitions in style.css
  var timer = null;

  function fill(tile) {
    title.textContent = text(tile, '.meta b');
    meta.textContent = text(tile, '.tip em');
    role.textContent = text(tile, '.tip i');
    desc.textContent = text(tile, '.tip small');
    imgs.innerHTML = '';
    (tile.getAttribute('data-images') || '').split(',').forEach(function (src) {
      src = src.trim(); if (!src) return;
      var im = document.createElement('img');
      im.alt = ''; im.loading = 'lazy';
      im.addEventListener('error', function () {
        var ph = document.createElement('div');
        ph.className = 'ph'; ph.textContent = src;
        im.replaceWith(ph);
      });
      im.src = src;
      imgs.appendChild(im);
    });
    panel.scrollTop = 0;
  }
  // Push. Animate a pure scale of the page block around the top of the current row,
  // then commit the real layout (narrow grid + shorter tiles + matching scroll) in one go.
  var page = document.getElementById('page');
  function relayout(split, tile) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var panelW = panel.offsetWidth;
    var ratio = (vw - panelW) / vw;
    var ref = grid.querySelector('.tile'), h0 = ref.offsetHeight;
    var row = Math.round((tile ? tile.offsetTop : window.scrollY) / h0);
    function commit() {
      page.classList.remove('moving');
      page.style.transform = ''; page.style.transformOrigin = '';
      body.classList.toggle('split', split);
      grid.style.setProperty('--tile-h', split && ratio > 0 ? (vh * ratio) + 'px' : '');
      window.scrollTo(0, row * grid.querySelector('.tile').offsetHeight);
      body.classList.remove('shifting');
      document.dispatchEvent(new Event('rowarrive')); // header colour re-check
    }
    clearTimeout(timer);
    body.classList.add('shifting');
    if (!page || ratio <= 0 || ratio >= 1) { commit(); return; } // e.g. full-width panel on mobile
    page.style.transformOrigin = '0 ' + (row * h0) + 'px';
    page.classList.add('moving');
    page.getBoundingClientRect(); // flush so the transform below actually transitions
    page.style.transform = 'scale(' + (split ? ratio : 1 / ratio) + ')';
    var done = false;
    function end(e) { if (done || (e && e.target !== page)) return; done = true; page.removeEventListener('transitionend', end); commit(); }
    page.addEventListener('transitionend', end);
    timer = setTimeout(end, SLIDE + 100); // safety net
  }
  function open(tile) {
    var wasOpen = !!current;
    current = tile;
    if (wasOpen) { // switching project while open: swap the content only
      panel.classList.add('swapping');
      fill(tile);
      setTimeout(function () { panel.classList.remove('swapping'); }, 20);
      return;
    }
    fill(tile);
    panel.setAttribute('aria-hidden', 'false');
    body.classList.add('panel-open');
    relayout(true, tile);
  }
  function close() {
    var tile = current;
    current = null;
    panel.setAttribute('aria-hidden', 'true');
    body.classList.remove('panel-open');
    relayout(false, tile);
  }

  grid.addEventListener('click', function (e) {
    var tile = e.target.closest ? e.target.closest('.tile') : null;
    if (!tile) return;
    e.preventDefault();
    if (tile === current) close(); else open(tile);
  });
  panel.querySelector('.panel-close').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && current) close(); });
})();
