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

  // Every free cell must stay reachable from every other, or food can spawn
  // somewhere the snake can never get to. Flood fill and compare counts.
  function allFreeCellsConnected(cells, wallMode, blocks) {
    var total = cells * cells;
    var free = total - blocks.size;
    if (free <= 0) { return false; }

    var start = -1;
    for (var i = 0; i < total; i++) {
      if (!blocks.has(i)) { start = i; break; }
    }

    var seen = new Set([start]);
    var stack = [start];
    var steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (stack.length) {
      var cur = stack.pop();
      var cx = cur % cells, cy = Math.floor(cur / cells);
      for (var d = 0; d < 4; d++) {
        var nx = cx + steps[d][0], ny = cy + steps[d][1];
        if (nx < 0 || ny < 0 || nx >= cells || ny >= cells) {
          if (wallMode !== 'WRAP') { continue; }
          nx = (nx + cells) % cells;
          ny = (ny + cells) % cells;
        }
        var nid = idx(nx, ny, cells);
        if (blocks.has(nid) || seen.has(nid)) { continue; }
        seen.add(nid);
        stack.push(nid);
      }
    }
    return seen.size === free;
  }

  // Short straight clusters, never on a cell the snake needs, and only accepted
  // if the board is still fully connected afterwards.
  function generateBlocks(cells, wallMode, count, safe) {
    for (var attempt = 0; attempt < 40; attempt++) {
      var blocks = new Set();
      var placed = 0, guard = 0;

      while (placed < count && guard++ < count * 25) {
        var x = Math.floor(Math.random() * cells);
        var y = Math.floor(Math.random() * cells);
        var len = 1 + Math.floor(Math.random() * 3);
        var horizontal = Math.random() > 0.5;
        var cluster = [];
        var ok = true;

        for (var i = 0; i < len; i++) {
          var bx = horizontal ? x + i : x;
          var by = horizontal ? y : y + i;
          if (bx >= cells || by >= cells) { ok = false; break; }
          var id = idx(bx, by, cells);
          if (safe.has(id) || blocks.has(id)) { ok = false; break; }
          cluster.push(id);
        }
        if (!ok) { continue; }

        for (var c = 0; c < cluster.length; c++) { blocks.add(cluster[c]); }
        placed += cluster.length;
      }

      if (allFreeCellsConnected(cells, wallMode, blocks)) { return blocks; }
    }
    return new Set();     // never ship a board that could trap the food
  }

  function create(cells, wallMode, blockCount) {
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
      food: null,
      blocks: new Set()
    };

    var midY = Math.floor(cells / 2);
    var headX = Math.floor(cells / 2);
    for (var i = 0; i < NS.START_LENGTH; i++) {
      var seg = { x: headX - i, y: midY };
      g.body.push(seg);
      g.occupied.add(idx(seg.x, seg.y, cells));
    }

    if (blockCount > 0) {
      // Keep the snake's cells clear, plus a run-up ahead of it so the first
      // few ticks can never end in a block the player had no chance to avoid.
      var safe = new Set();
      for (var b = 0; b < g.body.length; b++) {
        safe.add(idx(g.body[b].x, g.body[b].y, cells));
      }
      for (var a = 1; a <= 8; a++) {
        var ax = headX + a;
        if (ax >= cells) {
          if (wallMode !== 'WRAP') { break; }
          ax = ax % cells;
        }
        safe.add(idx(ax, midY, cells));
      }

      g.blocks = generateBlocks(cells, wallMode, blockCount, safe);
      // Blocks live in `occupied` too, so collision and food placement both
      // treat them as taken without any extra checks on the hot path.
      g.blocks.forEach(function (id) { g.occupied.add(id); });
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
