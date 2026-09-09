(function () {
  var stage = document.getElementById('stage');
  if (!stage) return;
  var cells = Array.prototype.slice.call(stage.querySelectorAll('.cell'));

  // Per-cell state: drift phase, drag offset, velocity.
  var state = cells.map(function (el, i) {
    return { el: el, dx: 0, dy: 0, vx: 0, vy: 0, s: 1, phase: i * 1.7, amp: 6 + (i % 3) * 3, speed: 0.35 + (i % 4) * 0.08, drag: null, hover: false };
  });

  function apply(c) {
    c.el.style.setProperty('--dx', c.dx.toFixed(2) + 'px');
    c.el.style.setProperty('--dy', c.dy.toFixed(2) + 'px');
    c.el.style.setProperty('--s', c.s.toFixed(3));
  }

  // Idle: slow, cell-like drift. Dragging: follow pointer. Released: inertia + soft spring home.
  var t0 = performance.now();
  function tick(now) {
    var t = (now - t0) / 1000;
    var w = stage.clientWidth, h = stage.clientHeight;
    state.forEach(function (c) {
      if (c.drag) return;
      var target = c.hover ? 1.08 : 1;
      c.s += (target - c.s) * 0.15;
      if (Math.abs(c.vx) > 0.05 || Math.abs(c.vy) > 0.05) {
        c.dx += c.vx; c.dy += c.vy;
        c.vx *= 0.94; c.vy *= 0.94;
        var lim = Math.min(w, h) * 0.35;
        if (Math.abs(c.dx) > lim) { c.dx = Math.sign(c.dx) * lim; c.vx *= -0.6; }
        if (Math.abs(c.dy) > lim) { c.dy = Math.sign(c.dy) * lim; c.vy *= -0.6; }
      } else {
        // ease back toward a drifting home position
        var hx = Math.sin(t * c.speed + c.phase) * c.amp;
        var hy = Math.cos(t * c.speed * 0.8 + c.phase) * c.amp;
        c.dx += (hx - c.dx) * 0.02;
        c.dy += (hy - c.dy) * 0.02;
      }
      apply(c);
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  state.forEach(function (c) {
    var el = c.el;
    el.addEventListener('pointerenter', function () { c.hover = true; });
    el.addEventListener('pointerleave', function () { c.hover = false; });
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('active');
      c.drag = { x: e.clientX, y: e.clientY, dx: c.dx, dy: c.dy, lx: e.clientX, ly: e.clientY, lt: performance.now() };
      c.vx = c.vy = 0; c.s = 1.08; apply(c);
    });
    el.addEventListener('pointermove', function (e) {
      if (!c.drag) return;
      var now = performance.now(), dt = Math.max(1, now - c.drag.lt);
      c.vx = (e.clientX - c.drag.lx) / dt * 16;
      c.vy = (e.clientY - c.drag.ly) / dt * 16;
      c.drag.lx = e.clientX; c.drag.ly = e.clientY; c.drag.lt = now;
      c.dx = c.drag.dx + (e.clientX - c.drag.x);
      c.dy = c.drag.dy + (e.clientY - c.drag.y);
      apply(c);
    });
    function release() { if (!c.drag) return; c.drag = null; el.classList.remove('active'); }
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
  });
})();
