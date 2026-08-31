/* Pure game state: movement, growth, food, collision. No rendering, no DOM. */
(function (NS) {
  'use strict';

  var DIRS = {
    up:    { x: 0,  y: -1 },
    down:  { x: 0,  y: 1 },
    left:  { x: -1, y: 0 },
    right: { x: 1,  y: 0 }
  };

  function idx(x, y, cells) { return y * cells + x; }

  // Build the list of free cells and pick one. O(cells^2) but that is only
  // 1225 checks on the largest map - far cheaper than reject-sampling once
  // the snake covers most of the board.
  function placeFood(g) {
    var total = g.cells * g.cells;
    var free = [];
    for (var i = 0; i < total; i++) {
      if (!g.occupied.has(i)) { free.push(i); }
    }
    if (free.length === 0) { g.food = null; return false; }
    var pick = free[Math.floor(Math.random() * free.length)];
    g.food = { x: pick % g.cells, y: Math.floor(pick / g.cells) };
    return true;
  }

  function create(cells, wallMode) {
    var g = {
      cells: cells,
      wallMode: wallMode,
      body: [],
      occupied: new Set(),
      dir: DIRS.right,
      lastDir: DIRS.right,
      queue: [],
      score: 0,
      alive: true,
      food: null
    };

    var midY = Math.floor(cells / 2);
    var headX = Math.floor(cells / 2);
    for (var i = 0; i < NS.START_LENGTH; i++) {
      var seg = { x: headX - i, y: midY };
      g.body.push(seg);
      g.occupied.add(idx(seg.x, seg.y, cells));
    }

    placeFood(g);
    return g;
  }

  // Queue a turn rather than applying it immediately. Two keys pressed inside
  // a single tick would otherwise let the snake reverse into itself.
  function turn(g, dirName) {
    var d = DIRS[dirName];
    if (!d) { return; }
    var last = g.queue.length ? g.queue[g.queue.length - 1] : g.lastDir;
    if (d.x === last.x && d.y === last.y) { return; }          // no-op
    if (d.x === -last.x && d.y === -last.y) { return; }        // 180 turn
    if (g.queue.length < 2) { g.queue.push(d); }
  }

  // Advances one tick. Returns 'eat', 'die', 'win', or null.
  function step(g) {
    if (!g.alive) { return null; }

    if (g.queue.length) { g.dir = g.queue.shift(); }
    g.lastDir = g.dir;

    var head = g.body[0];
    var nx = head.x + g.dir.x;
    var ny = head.y + g.dir.y;

    if (nx < 0 || ny < 0 || nx >= g.cells || ny >= g.cells) {
      if (g.wallMode === 'WRAP') {
        nx = (nx + g.cells) % g.cells;
        ny = (ny + g.cells) % g.cells;
      } else {
        g.alive = false;
        return 'die';
      }
    }

    var eating = !!g.food && nx === g.food.x && ny === g.food.y;

    // The tail cell frees up on the same tick it is vacated, so chasing your
    // own tail is legal - exactly as in the original.
    if (!eating) {
      var tail = g.body[g.body.length - 1];
      g.occupied.delete(idx(tail.x, tail.y, g.cells));
    }

    if (g.occupied.has(idx(nx, ny, g.cells))) {
      g.alive = false;
      return 'die';
    }

    g.body.unshift({ x: nx, y: ny });
    g.occupied.add(idx(nx, ny, g.cells));

    if (!eating) {
      g.body.pop();
      return null;
    }

    g.score += 1;
    if (!placeFood(g)) {
      g.alive = false;
      return 'win';
    }
    return 'eat';
  }

  NS.game = { create: create, step: step, turn: turn, DIRS: DIRS };

})(window.NS = window.NS || {});
