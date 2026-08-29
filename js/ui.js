/* Screens, HUD, menu selectors and high-score persistence. */
(function (NS) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function pop(node) {
    node.classList.remove('bump');
    void node.offsetWidth;         // force reflow so the animation replays
    node.classList.add('bump');
  }

  var el = {};
  var selection = { size: 'M', mode: 'SOLID', pad: 'SHOW', diff: 'NORMAL' };
  var handlers = {};

  // Scores from before difficulty existed were all Normal speed on a clear
  // board, so they belong in the Normal bucket rather than being orphaned.
  function migrateLegacyScores() {
    ['S', 'M', 'L'].forEach(function (size) {
      ['SOLID', 'WRAP'].forEach(function (mode) {
        var old = NS.storage.get(NS.storage.legacyHighKey(size, mode), null);
        if (old === null) { return; }
        var moved = NS.storage.highKey(size, mode, 'NORMAL');
        if (NS.storage.get(moved, null) === null) { NS.storage.set(moved, old); }
      });
    });
  }

  // Hiding the arrow buttons hands their space back to the board.
  function applyPadMode() {
    var off = selection.pad === 'HIDE';
    document.documentElement.classList.toggle('pad-off', off);
    NS.storage.set(NS.storage.padKey, selection.pad);
    if (el.touchHint) {
      el.touchHint.textContent = off
        ? 'Swipe anywhere to steer'
        : 'Swipe to steer · or use the buttons';
    }
  }

  function paintSelectors() {
    var groups = [
      { root: el.selSize, value: selection.size },
      { root: el.selMode, value: selection.mode },
      { root: el.selPad, value: selection.pad }
    ];
    groups.forEach(function (g) {
      if (!g.root) { return; }
      var opts = g.root.querySelectorAll('.opt');
      for (var i = 0; i < opts.length; i++) {
        var on = opts[i].getAttribute('data-value') === g.value;
        opts[i].classList.toggle('is-on', on);
      }
    });
    if (el.selDiff) { el.selDiff.value = selection.diff; }
    el.menuBest.textContent = NS.ui.highScore();
    applyPadMode();
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
        selPad: $('sel-pad'),
        selDiff: $('sel-difficulty'),
        touchHint: $('touch-hint'),
        menuBest: $('menu-best'),
        btnStart: $('btn-start'),
        btnAgain: $('btn-again'),
        btnMenu: $('btn-menu'),
        score: $('hud-score'),
        best: $('hud-best'),
        theme: $('hud-theme'),
        mute: $('hud-mute'),
        overScore: $('over-score'),
        overBest: $('over-best'),
        overRecord: $('over-record')
      };

      migrateLegacyScores();

      // Remember the arrow-button and difficulty preferences across sessions.
      selection.pad = NS.storage.get(NS.storage.padKey, 'SHOW') === 'HIDE' ? 'HIDE' : 'SHOW';
      var storedDiff = NS.storage.get(NS.storage.diffKey, 'NORMAL');
      selection.diff = NS.DIFFICULTIES[storedDiff] ? storedDiff : 'NORMAL';

      if (el.selDiff) {
        el.selDiff.addEventListener('change', function () {
          selection.diff = NS.DIFFICULTIES[this.value] ? this.value : 'NORMAL';
          NS.storage.set(NS.storage.diffKey, selection.diff);
          this.blur();            // or the focused select would swallow Space
          paintSelectors();
        });
      }

      [el.selSize, el.selMode, el.selPad].forEach(function (root) {
        if (!root) { return; }
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
      var raw = NS.storage.get(
        NS.storage.highKey(selection.size, selection.mode, selection.diff), '0');
      var n = parseInt(raw, 10);
      return isNaN(n) ? 0 : n;
    },

    saveHighScore: function (score) {
      NS.storage.set(
        NS.storage.highKey(selection.size, selection.mode, selection.diff), score);
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
      if (bump) { pop(el.score); }
    },

    setBest: function (n, bump) {
      el.best.textContent = n;
      if (bump) { pop(el.best); }
    },
    setThemeName: function (name) { el.theme.textContent = name; },
    setMute: function (muted) { el.mute.textContent = muted ? 'Off' : 'On'; },

    /* ---- theme accent bleeds out of the canvas into the page chrome ---- */

    applyTheme: function (theme) {
      var root = document.documentElement.style;
      root.setProperty('--accent', theme.accent);
      root.setProperty('--accent-soft', theme.accentSoft);
      root.setProperty('--accent-dim', theme.accentDim);
      // A theme whose board is light (Golden) supplies its own dark page colour;
      // the HUD text would be unreadable on the board colour itself.
      root.setProperty('--bg', theme.pageBg || theme.ground);
      this.setThemeName(theme.name);
    },

    flash: function () {
      el.stage.classList.remove('flash');
      void el.stage.offsetWidth;
      el.stage.classList.add('flash');
    }
  };

})(window.NS = window.NS || {});
