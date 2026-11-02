/* Runs synchronously in <head>: flags JS support and decides whether the preloader plays. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false;
  try { seen = sessionStorage.getItem('evolve-pl') === '1'; } catch (e) {}
  if (reduce || seen) d.classList.add('no-preloader');
})();
