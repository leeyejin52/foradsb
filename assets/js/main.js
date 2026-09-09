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
