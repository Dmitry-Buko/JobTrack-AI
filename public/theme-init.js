/* Раннее включение сохранённой темы до первой отрисовки (без FOUC).
   Вынесено из index.html в отдельный файл, чтобы обойтись в CSP без
   'unsafe-inline' в script-src (см. netlify.toml). */
(function () {
  try {
    var stored = localStorage.getItem('jobtrack-theme');
    var dark = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {
    /* localStorage недоступен — остаётся светлая тема */
  }
})();
