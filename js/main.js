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

  function roundRectPath(c, x, y, w, h, r) {
    if (c.roundRect) { c.roundRect(x, y, w, h, r); return; }
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* ---------------- colour ---------------- */

  // Never pick a hue that reads as the current theme's apple.
  function pickHue() {
    var pool = NS.SNAKE_HUES.filter(function (h) {
      return h !== hue && NS.hueGap(h, theme.foodHue) > 40;
    });
    if (!pool.length) { pool = NS.SNAKE_HUES.filter(function (h) { return h !== hue; }); }
    hue = pool[Math.floor(Math.random() * pool.length)];
  }

  /* ---------------- rendering ---------------- */

  function drawSnake(cell, time) {
    var body = game.body;
    var glow = NS.hsl(hue, 100, 58);
    var core = NS.hsl(hue, 100, 84);
    var pad = cell * 0.09;
    var size = cell - pad * 2;
    var radius = Math.max(1, cell * 0.28);
    var i, seg;

    // One fill for the whole body means one shadow render, not one per segment.
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = cell * 0.85;
    ctx.fillStyle = glow;
    ctx.beginPath();
    for (i = 0; i < body.length; i++) {
      seg = body[i];
      roundRectPath(ctx, seg.x * cell + pad, seg.y * cell + pad, size, size, radius);
    }
    ctx.fill();
    ctx.restore();

    // Bright core, tapering slightly toward the tail.
    ctx.fillStyle = core;
    for (i = 0; i < body.length; i++) {
      seg = body[i];
      var t = body.length > 1 ? i / (body.length - 1) : 0;
      var inset = pad + cell * (0.1 + t * 0.09);
      var s = cell - inset * 2;
      if (s <= 0) { continue; }
      ctx.beginPath();
      roundRectPath(ctx, seg.x * cell + inset, seg.y * cell + inset, s, s, Math.max(1, s * 0.3));
      ctx.fill();
    }

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

  function render(time) {
    var cells = game ? game.cells : NS.ui.cells();
    var cell = PX / cells;

    ensureBackground(cells);
    ctx.clearRect(0, 0, PX, PX);
    ctx.drawImage(bg, 0, 0, PX, PX);

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
    game = NS.game.create(NS.MAP_SIZES[sel.size].cells, sel.mode);
    best = NS.ui.highScore();

    syncTheme(true);
    pickHue();

    NS.ui.setScore(0, false);
    NS.ui.setBest(best);
    NS.ui.setGrid(game.cells);
    NS.ui.setWalls(NS.WALL_MODES[sel.mode].label);
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
    NS.ui.setGrid(NS.ui.cells());
    NS.ui.setWalls(NS.WALL_MODES[NS.ui.selection().mode].label);
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

    // Theme first, so the new snake hue is chosen against the new apple colour.
    if (score % NS.THEME_EVERY === 0 && syncTheme(false)) {
      ensureBackground(game.cells);
      NS.ui.flash();
      NS.audio.themeChange();
    }
    if (score % NS.COLOR_EVERY === 0) {
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
      while (acc >= NS.TICK_MS) {
        acc -= NS.TICK_MS;
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
      if (state === 'PLAYING') { state = 'PAUSED'; NS.ui.showPause(true); }
      else if (state === 'PAUSED') { state = 'PLAYING'; acc = 0; NS.ui.showPause(false); }
      return;
    }

    if (state === 'PLAYING' && KEYS[lower]) {
      NS.game.turn(game, KEYS[lower]);
      e.preventDefault();
    }
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
      // Keep the HUD and the menu backdrop in step with the selectors.
      onSelect: function () {
        if (state !== 'MENU') { return; }
        NS.ui.setGrid(NS.ui.cells());
        NS.ui.setWalls(NS.WALL_MODES[NS.ui.selection().mode].label);
        NS.ui.setBest(NS.ui.highScore());
      }
    });

    toMenu();

    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', function () { NS.audio.unlock(); });

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
