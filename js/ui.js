/* Screens, HUD, menu selectors and high-score persistence. */
(function (NS) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var el = {};
  var selection = { size: 'M', mode: 'SOLID' };
  var handlers = {};

  function paintSelectors() {
    var groups = [
      { root: el.selSize, value: selection.size },
      { root: el.selMode, value: selection.mode }
    ];
    groups.forEach(function (g) {
      var opts = g.root.querySelectorAll('.opt');
      for (var i = 0; i < opts.length; i++) {
        var on = opts[i].getAttribute('data-value') === g.value;
        opts[i].classList.toggle('is-on', on);
      }
    });
    el.menuBest.textContent = NS.ui.highScore();
    if (handlers.onSelect) { handlers.onSelect(); }
  }

  function cycle(group, delta) {
    var keys = group === 'size' ? ['S', 'M', 'L'] : ['SOLID', 'WRAP'];
    var i = keys.indexOf(selection[group]);
    selection[group] = keys[(i + delta + keys.length) % keys.length];
    paintSelectors();
  }

  NS.ui = {

    init: function (h) {
      handlers = h;
      el = {
        stage: document.querySelector('.stage'),
        menu: $('overlay-menu'),
        pause: $('overlay-pause'),
        over: $('overlay-over'),
        selSize: $('sel-size'),
        selMode: $('sel-mode'),
        menuBest: $('menu-best'),
        btnStart: $('btn-start'),
        btnAgain: $('btn-again'),
        btnMenu: $('btn-menu'),
        score: $('hud-score'),
        best: $('hud-best'),
        theme: $('hud-theme'),
        grid: $('hud-grid'),
        walls: $('hud-walls'),
        mute: $('hud-mute'),
        overScore: $('over-score'),
        overBest: $('over-best'),
        overRecord: $('over-record')
      };

      [el.selSize, el.selMode].forEach(function (root) {
        root.addEventListener('click', function (e) {
          var btn = e.target.closest('.opt');
          if (!btn) { return; }
          selection[root.getAttribute('data-group')] = btn.getAttribute('data-value');
          paintSelectors();
        });
      });

      // Blur after a click, or the focused button would swallow later Space presses.
      el.btnStart.addEventListener('click', function () { this.blur(); handlers.onStart(); });
      el.btnAgain.addEventListener('click', function () { this.blur(); handlers.onRestart(); });
      el.btnMenu.addEventListener('click', function () { this.blur(); handlers.onMenu(); });

      paintSelectors();
      this.setMute(NS.audio.isMuted());
    },

    selection: function () { return selection; },
    cycleSelection: cycle,

    cells: function () { return NS.MAP_SIZES[selection.size].cells; },

    highScore: function () {
      var raw = NS.storage.get(NS.storage.highKey(selection.size, selection.mode), '0');
      var n = parseInt(raw, 10);
      return isNaN(n) ? 0 : n;
    },

    saveHighScore: function (score) {
      NS.storage.set(NS.storage.highKey(selection.size, selection.mode), score);
    },

    /* ---- screens ---- */

    showMenu: function () {
      paintSelectors();
      el.menu.classList.remove('hidden');
      el.pause.classList.add('hidden');
      el.over.classList.add('hidden');
    },

    showPlaying: function () {
      el.menu.classList.add('hidden');
      el.pause.classList.add('hidden');
      el.over.classList.add('hidden');
    },

    showPause: function (paused) {
      el.pause.classList.toggle('hidden', !paused);
    },

    showGameOver: function (score, best, isRecord) {
      el.overScore.textContent = score;
      el.overBest.textContent = best;
      el.overRecord.classList.toggle('hidden', !isRecord);
      el.over.classList.remove('hidden');
    },

    /* ---- hud ---- */

    setScore: function (n, bump) {
      el.score.textContent = n;
      if (bump) {
        el.score.classList.remove('bump');
        void el.score.offsetWidth;   // force reflow so the animation replays
        el.score.classList.add('bump');
      }
    },

    setBest: function (n) { el.best.textContent = n; },
    setGrid: function (cells) { el.grid.textContent = cells + ' × ' + cells; },
    setWalls: function (label) { el.walls.textContent = label; },
    setThemeName: function (name) { el.theme.textContent = name; },
    setMute: function (muted) { el.mute.textContent = muted ? 'Off' : 'On'; },

    /* ---- theme accent bleeds out of the canvas into the page chrome ---- */

    applyTheme: function (theme) {
      var root = document.documentElement.style;
      root.setProperty('--accent', theme.accent);
      root.setProperty('--accent-soft', theme.accentSoft);
      root.setProperty('--accent-dim', theme.accentDim);
      root.setProperty('--bg', theme.ground);
      this.setThemeName(theme.name);
    },

    flash: function () {
      el.stage.classList.remove('flash');
      void el.stage.offsetWidth;
      el.stage.classList.add('flash');
    }
  };

})(window.NS = window.NS || {});
