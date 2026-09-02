/* Boot, fixed-timestep loop, input, rendering. Loaded last. */
(function (NS) {
  'use strict';

  var PX = NS.CANVAS_PX;

  var canvas, ctx, bg, bgCtx;
  var bgKey = '';
  var dpr = 1;

  var state = 'MENU';           // MENU | PLAYING | PAUSED | OVER
  var game = null;
  var theme = NS.THEMES[0];
  var hue = NS.SNAKE_HUES[0];
  var acc = 0;
  var last = 0;
  var best = 0;
  var tickMs = NS.TICK_MS;      // set per run from the chosen difficulty

  /* ---------------- canvas plumbing ---------------- */

  function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PX * dpr;
    canvas.height = PX * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    bg.width = PX * dpr;
    bg.height = PX * dpr;
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    bgKey = '';   // force a repaint at the new resolution
  }

  function ensureBackground(cells) {
    var key = theme.key + ':' + cells + ':' + dpr;
    if (key === bgKey) { return; }
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgCtx.clearRect(0, 0, PX, PX);
    theme.paint(bgCtx, PX, cells);
    bgKey = key;
  }

  /* ---------------- colour ---------------- */

  // Never pick a hue that reads as the current theme's apple. 40 degrees was too
  // tight - a hue-100 snake next to Medieval's hue-145 emerald both just read
  // "green" - so the exclusion is wider.
  function pickHue() {
    var pool = NS.SNAKE_HUES.filter(function (h) {
      return h !== hue && NS.hueGap(h, theme.foodHue) > 60;
    });
    if (!pool.length) { pool = NS.SNAKE_HUES.filter(function (h) { return h !== hue; }); }
    hue = pool[Math.floor(Math.random() * pool.length)];
  }

  /* ---------------- rendering ---------------- */

  // Cell centres from the head back, each carrying how far along the body it is
  // so widths and colours can taper. Normally one run; in wrap mode the body is
  // split wherever it crosses an edge.
  function bodyRuns(cell) {
    var body = game.body, runs = [], cur = [], i;
    var last = Math.max(1, body.length - 1);

    function pt(seg, idx) {
      return { x: (seg.x + 0.5) * cell, y: (seg.y + 0.5) * cell, t: idx / last };
    }
    // A point just past the edge `seg` is sitting against, so a wrapped body runs
    // off one side and back in at the other rather than straight across the board.
    function offBoard(p, seg, horiz) {
      var out = cell * 0.62;
      return horiz
        ? { x: p.x + (seg.x === 0 ? -out : out), y: p.y, t: p.t }
        : { x: p.x, y: p.y + (seg.y === 0 ? -out : out), t: p.t };
    }

    cur.push(pt(body[0], 0));
    for (i = 1; i < body.length; i++) {
      var a = body[i - 1], b = body[i], bp = pt(b, i);
      var dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
      // Adjacent: the run carries on. Only a jump of more than one cell is a
      // wrap; anything else would be a bug, and a straight link beats a spur
      // shooting off the edge of the board.
      if (dx <= 1 && dy <= 1) { cur.push(bp); continue; }
      var horiz = dx > dy;
      cur.push(offBoard(cur[cur.length - 1], a, horiz));
      runs.push(cur);
      cur = [offBoard(bp, b, horiz), bp];
    }
    runs.push(cur);
    return runs;
  }

  // The body is one stroked line through the cell centres instead of a rounded
  // square per segment, so it reads as a single unbroken snake. Each link is
  // stroked on its own with a round cap, which both lets the width taper toward
  // the tail and rounds off every corner where two links meet.
  function drawSnake(cell, time) {
    var body = game.body;
    var goldenSnake = NS.isGolden(game.score);
    // On the golden level the snake is solid gold. The board is bright gold too,
    // so it gets a dark bronze rim to hold its shape against the slab.
    var glow = goldenSnake ? 'hsl(38,100%,52%)' : NS.hsl(hue, 100, 58);
    var core = goldenSnake ? 'hsl(46,100%,70%)' : NS.hsl(hue, 100, 84);
    var runs = bodyRuns(cell);
    var k, run;

    function bodyW(t) { return cell * (0.86 - 0.20 * t); }
    function coreW(t) { return cell * (0.50 - 0.16 * t); }

    function strokeLinks(widthFn, colourFn) {
      for (var r = 0; r < runs.length; r++) {
        run = runs[r];
        if (run.length < 2) {                     // a one-cell snake has no link
          ctx.fillStyle = colourFn(0);
          ctx.beginPath();
          ctx.arc(run[0].x, run[0].y, widthFn(0) / 2, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        for (k = 1; k < run.length; k++) {
          var p = run[k - 1], q = run[k], t = (p.t + q.t) / 2;
          ctx.lineWidth = widthFn(t);
          ctx.strokeStyle = colourFn(t);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // The whole body as one path, for the passes that want an unbroken line
    // rather than a per-link taper.
    function strokeWhole() {
      for (var r = 0; r < runs.length; r++) {
        var rr = runs[r];
        ctx.beginPath();
        ctx.moveTo(rr[0].x, rr[0].y);
        if (rr.length < 2) { ctx.lineTo(rr[0].x + 0.01, rr[0].y); }
        for (var m = 1; m < rr.length; m++) { ctx.lineTo(rr[m].x, rr[m].y); }
        ctx.stroke();
      }
    }

    // The halo goes down in one stroke per run. A shadow per link would cost far
    // more and glow no brighter.
    ctx.shadowColor = glow;
    ctx.shadowBlur = cell * (goldenSnake ? 1.0 : 0.85);
    ctx.strokeStyle = glow;
    ctx.lineWidth = cell * 0.74;
    strokeWhole();
    ctx.shadowBlur = 0;

    // The rim is the whole body stroked wider underneath and then painted over,
    // so only the silhouette of it survives.
    if (goldenSnake) {
      strokeLinks(function (t) { return bodyW(t) + cell * 0.12; },
        function () { return 'rgba(52,28,2,0.85)'; });
    }

    strokeLinks(bodyW, function () { return glow; });
    strokeLinks(coreW, function () { return core; });

    // Polished-metal shimmer travelling down the golden body. It is dashed along
    // the body's own path so the highlights follow it round every corner; giving
    // each link its own lightness instead made the snake read as a string of beads.
    if (goldenSnake) {
      ctx.strokeStyle = 'rgba(255,247,208,0.5)';
      ctx.lineWidth = cell * 0.3;
      ctx.setLineDash([cell * 0.7, cell * 1.6]);
      ctx.lineDashOffset = -time / 9;
      strokeWhole();
      ctx.setLineDash([]);
    }

    ctx.restore();

    // Eyes on the head, facing the direction of travel.
    var head = body[0];
    var d = game.dir;
    var hx = head.x * cell + cell / 2;
    var hy = head.y * cell + cell / 2;
    var fwd = cell * 0.16;
    var side = cell * 0.17;
    var er = Math.max(0.8, cell * 0.075);
    ctx.fillStyle = '#04070e';
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.arc(hx + d.x * fwd - d.y * side * s, hy + d.y * fwd + d.x * side * s, er, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // The grid each map bakes into its own backdrop is barely there by design, and
  // vanishes entirely on the busy maps. This draws it over the art instead, so
  // the cells read the same on every one of them.
  function drawGrid(cell, cells) {
    ctx.strokeStyle = theme.grid || 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 1; i < cells; i++) {
      var p = Math.round(i * cell) + 0.5;   // same alignment the backdrops use
      ctx.moveTo(p, 0); ctx.lineTo(p, PX);
      ctx.moveTo(0, p); ctx.lineTo(PX, p);
    }
    ctx.stroke();
  }

  function render(time) {
    var cells = game ? game.cells : NS.ui.cells();
    var cell = PX / cells;

    ensureBackground(cells);
    ctx.clearRect(0, 0, PX, PX);
    ctx.drawImage(bg, 0, 0, PX, PX);
    drawGrid(cell, cells);

    // Anything a map wants animated rather than baked into its backdrop.
    if (theme.drawOverlay) { theme.drawOverlay(ctx, PX, cells, time); }

    if (!game) { return; }

    if (game.food) {
      var pulse = 0.5 + 0.5 * Math.sin(time / 260);
      theme.drawFood(ctx, game.food.x * cell, game.food.y * cell, cell, pulse);
    }

    drawSnake(cell, time);
  }

  /* ---------------- game flow ---------------- */

  function syncTheme(force) {
    var next = NS.themeForScore(game ? game.score : 0);
    if (!force && next === theme) { return false; }
    theme = next;
    NS.ui.applyTheme(theme);
    return true;
  }

  function startRun() {
    var sel = NS.ui.selection();
    var cells = NS.MAP_SIZES[sel.size].cells;
    var diff = NS.DIFFICULTIES[sel.diff] || NS.DIFFICULTIES.NORMAL;

    tickMs = diff.tickMs;
    game = NS.game.create(cells, sel.mode);
    best = NS.ui.highScore();

    syncTheme(true);
    pickHue();

    NS.ui.setScore(0, false);
    NS.ui.setBest(best);
    NS.ui.showPlaying();

    acc = 0;
    state = 'PLAYING';
  }

  function toMenu() {
    state = 'MENU';
    game = null;
    theme = NS.THEMES[0];
    NS.ui.applyTheme(theme);
    NS.ui.setScore(0, false);
    NS.ui.setBest(NS.ui.highScore());
    NS.ui.showMenu();
  }

  function endRun(won) {
    state = 'OVER';
    var isRecord = game.score > best;
    if (isRecord) {
      best = game.score;
      NS.ui.saveHighScore(best);
      NS.ui.setBest(best);
    }
    if (won) { NS.audio.win(); } else { NS.audio.die(); }
    NS.ui.showGameOver(game.score, best, isRecord);
  }

  function tick() {
    var event = NS.game.step(game);
    if (!event) { return; }

    if (event === 'die' || event === 'win') {
      endRun(event === 'win');
      return;
    }

    // event === 'eat'
    var score = game.score;
    NS.ui.setScore(score, true);
    NS.audio.eat(score);

    // Once you are past your record, Best climbs with you. `best` itself stays
    // put so endRun can still tell this was a record - the save happens there.
    if (score > best) { NS.ui.setBest(score, true); }

    // Theme first, so the new snake hue is chosen against the new apple colour.
    // Asking on every apple rather than only on multiples of THEME_EVERY: it is
    // a comparison, and it cannot miss a boundary.
    if (syncTheme(false)) {
      ensureBackground(game.cells);
      NS.ui.flash();
      if (NS.isGolden(score)) { NS.audio.win(); } else { NS.audio.themeChange(); }
    }
    // Once the snake turns gold it keeps that look - no more hue changes.
    if (score % NS.COLOR_EVERY === 0 && !NS.isGolden(score)) {
      pickHue();
      if (score % NS.THEME_EVERY !== 0) { NS.audio.colorChange(); }
    }
  }

  function frame(now) {
    window.requestAnimationFrame(frame);
    var dt = now - last;
    last = now;

    if (state === 'PLAYING') {
      // A backgrounded tab returns a huge dt; don't fast-forward the snake.
      acc += Math.min(dt, 250);
      while (acc >= tickMs) {
        acc -= tickMs;
        tick();
        if (state !== 'PLAYING') { break; }
      }
    }

    render(now);
  }

  /* ---------------- input ---------------- */

  var KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', a: 'left', s: 'down', d: 'right'
  };

  function togglePause() {
    if (state === 'PLAYING') {
      state = 'PAUSED';
      NS.ui.showPause(true);
    } else if (state === 'PAUSED') {
      state = 'PLAYING';
      acc = 0;
      NS.ui.showPause(false);
    }
  }

  function onKey(e) {
    var k = e.key;
    var lower = k.length === 1 ? k.toLowerCase() : k;

    NS.audio.unlock();

    if (lower === 'm') {
      NS.ui.setMute(NS.audio.toggleMute());
      return;
    }

    if (state === 'MENU') {
      if (k === 'ArrowLeft' || lower === 'a') { NS.ui.cycleSelection('size', -1); e.preventDefault(); }
      else if (k === 'ArrowRight' || lower === 'd') { NS.ui.cycleSelection('size', 1); e.preventDefault(); }
      else if (k === 'ArrowUp' || k === 'ArrowDown' || lower === 'w' || lower === 's') { NS.ui.cycleSelection('mode', 1); e.preventDefault(); }
      else if (k === 'Enter' || k === ' ') { startRun(); e.preventDefault(); }
      return;
    }

    if (k === 'Escape') { toMenu(); return; }
    if (lower === 'r') { startRun(); return; }

    if (k === ' ' || lower === 'p') {
      e.preventDefault();
      togglePause();
      return;
    }

    if (state === 'PLAYING' && KEYS[lower]) {
      NS.game.turn(game, KEYS[lower]);
      e.preventDefault();
    }
  }

  /* ---------------- touch ---------------- */

  var SWIPE_PX = 22;   // how far a finger travels before it counts as a swipe

  function initTouch(surface) {
    var originX = 0, originY = 0, tracking = false;

    surface.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') { return; }
      // The arrow buttons and the HUD own their taps; everything else is swipe
      // area, so steering still works with the buttons hidden.
      if (e.target.closest('.pad') || e.target.closest('.hud')) { return; }
      tracking = true;
      originX = e.clientX;
      originY = e.clientY;
      NS.audio.unlock();
    });

    surface.addEventListener('pointermove', function (e) {
      if (!tracking || state !== 'PLAYING') { return; }
      var dx = e.clientX - originX;
      var dy = e.clientY - originY;
      if (Math.abs(dx) < SWIPE_PX && Math.abs(dy) < SWIPE_PX) { return; }

      NS.game.turn(game, Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up'));

      // Re-anchor so a long drag can chain several turns without lifting.
      originX = e.clientX;
      originY = e.clientY;
      e.preventDefault();
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
      surface.addEventListener(evt, function () { tracking = false; });
    });

    var pad = document.getElementById('pad');

    // pointerdown, not click - a tap should register on contact, not on release.
    pad.addEventListener('pointerdown', function (e) {
      var btn = e.target.closest('.pad-btn');
      if (!btn) { return; }
      e.preventDefault();
      NS.audio.unlock();

      var dir = btn.getAttribute('data-dir');
      if (dir) {
        if (state === 'PLAYING') { NS.game.turn(game, dir); }
        return;
      }
      if (state === 'MENU' || state === 'OVER') { startRun(); }
      else { togglePause(); }
    });

    pad.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  /* ---------------- boot ---------------- */

  function init() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    bg = document.createElement('canvas');
    bgCtx = bg.getContext('2d');

    setupCanvas();

    NS.ui.init({
      onStart: startRun,
      onRestart: startRun,
      onMenu: toMenu,
      onTogglePause: togglePause,
      // Keep the HUD and the menu backdrop in step with the selectors.
      onSelect: function () {
        if (state !== 'MENU') { return; }
        NS.ui.setBest(NS.ui.highScore());
      }
    });

    toMenu();

    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', function () { NS.audio.unlock(); });
    initTouch(document.querySelector('.wrap'));

    // Tapping the Sound readout mutes - the only way to do it without a keyboard.
    document.querySelector('.hud-mute').addEventListener('click', function () {
      NS.audio.unlock();
      NS.ui.setMute(NS.audio.toggleMute());
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(setupCanvas, 150);
    });

    // Pause rather than let the snake run on unseen.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state === 'PLAYING') {
        state = 'PAUSED';
        NS.ui.showPause(true);
      }
    });

    last = window.performance.now();
    window.requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window.NS = window.NS || {});
