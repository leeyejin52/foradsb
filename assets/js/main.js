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
    var from = window.scrollY, start = performance.now();
    locked = true;
    if (raf) cancelAnimationFrame(raf);
    function step(now) {
      var t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, from + (to - from) * ease(t));
      if (t < 1) { raf = requestAnimationFrame(step); }
      else { raf = null; setTimeout(function () { locked = false; }, 150); }
    }
    raf = requestAnimationFrame(step);
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
