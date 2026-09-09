(function () {
  var hero = document.getElementById('hero');
  var spark = document.querySelector('.spark');
  if (!hero || !spark) return;

  function st(el, cls, ms) {
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  // Lightning-like irregular flicker: one main strike, optional after-flickers.
  function strike() {
    st(spark, 'off', 50 + Math.random() * 60);
    if (Math.random() < 0.7) {
      setTimeout(function () { st(spark, 'off', 30 + Math.random() * 60); }, 110 + Math.random() * 120);
    }
    if (Math.random() < 0.5) {
      setTimeout(function () { st(spark, 'dim', 70); }, 260 + Math.random() * 100);
    }
    setTimeout(strike, 900 + Math.random() * 2800);
  }
  setTimeout(strike, 600);

  // Rare full inversion.
  (function burst() {
    setTimeout(function () {
      st(hero, 'burst', 45);
      burst();
    }, 8000 + Math.random() * 10000);
  })();
})();
