/* The map themes. Purely cosmetic - grid, speed and collision never change.
   Backgrounds are painted once to an offscreen canvas and blitted each frame.

   Nine themes cycle every 10 points. At GOLDEN_SCORE the golden map takes over
   permanently and the snake turns gold. */
(function (NS) {
  'use strict';

  function withGlow(ctx, color, blur, fn) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    fn();
    ctx.restore();
  }

  function vignette(ctx, px, strength) {
    var g = ctx.createRadialGradient(px / 2, px / 2, px * 0.25, px / 2, px / 2, px * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,' + (strength === undefined ? 0.55 : strength) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, px, px);
  }

  function gridLines(ctx, px, cells, color, width) {
    var cell = px / cells;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (var i = 1; i < cells; i++) {
      var p = Math.round(i * cell) + 0.5;
      ctx.moveTo(p, 0); ctx.lineTo(p, px);
      ctx.moveTo(0, p); ctx.lineTo(px, p);
    }
    ctx.stroke();
  }

  function starPath(ctx, cx, cy, spikes, outer, inner, rotation) {
    var rot = (rotation || 0) - Math.PI / 2;
    var step = Math.PI / spikes;
    ctx.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = rot + i * step;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
    }
    ctx.closePath();
  }

  function diamondPath(ctx, cx, cy, w, h) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + w, cy);
    ctx.lineTo(cx, cy + h);
    ctx.lineTo(cx - w, cy);
    ctx.closePath();
  }

  function glint(ctx, cx, cy, r) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function polyPath(ctx, cx, cy, r, sides, rotation) {
    var rot = rotation || 0;
    ctx.beginPath();
    for (var i = 0; i < sides; i++) {
      var a = rot + (Math.PI * 2 / sides) * i;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
    }
    ctx.closePath();
  }

  // A brilliant cut seen from above: girdle, table, and the facets between.
  function drawBrilliant(ctx, cx, cy, r, pulse) {
    var rot = Math.PI / 8;

    // Dark setting, so a white stone still has an edge on a bright floor.
    polyPath(ctx, cx, cy, r * 1.2, 8, rot);
    ctx.fillStyle = 'rgba(40,24,4,0.5)';
    ctx.fill();

    ctx.save();
    ctx.shadowColor = 'rgba(210,245,255,0.95)';
    ctx.shadowBlur = r * (1.6 + pulse * 0.8);

    var body = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.38, '#d8f2ff');
    body.addColorStop(0.62, '#a8dcf6');
    body.addColorStop(1, '#e9f9ff');
    ctx.fillStyle = body;
    polyPath(ctx, cx, cy, r, 8, rot);
    ctx.fill();
    ctx.restore();

    // Crown facets: girdle points joined to the table.
    var table = r * 0.46;
    ctx.strokeStyle = 'rgba(120,180,215,0.55)';
    ctx.lineWidth = Math.max(0.6, r * 0.07);
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = rot + (Math.PI / 4) * i;
      ctx.moveTo(cx + Math.cos(a) * table, cy + Math.sin(a) * table);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.stroke();

    // Table.
    polyPath(ctx, cx, cy, table, 8, rot);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,205,235,0.7)';
    ctx.lineWidth = Math.max(0.6, r * 0.06);
    ctx.stroke();

    // Girdle.
    polyPath(ctx, cx, cy, r, 8, rot);
    ctx.strokeStyle = 'rgba(28,18,4,0.55)';
    ctx.lineWidth = Math.max(0.8, r * 0.09);
    ctx.stroke();

    // Sparkle.
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    starPath(ctx, cx - r * 0.28, cy - r * 0.3, 4, r * (0.34 + pulse * 0.1), r * 0.07);
    ctx.fill();
  }

  /* ---- heraldry, for the Medieval wall ---- */

  function shieldPath(ctx, cx, cy, w, h) {
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy + h * 0.08);
    ctx.quadraticCurveTo(cx + w / 2, cy + h / 2, cx, cy + h / 2);
    ctx.quadraticCurveTo(cx - w / 2, cy + h / 2, cx - w / 2, cy + h * 0.08);
    ctx.closePath();
  }

  function drawShield(ctx, cx, cy, w, h, main, charge, device) {
    ctx.save();
    shieldPath(ctx, cx, cy, w, h);
    ctx.fillStyle = main;
    ctx.fill();

    // The device is clipped to the shield so it never bleeds past the edge.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = charge;
    if (device === 0) {                       // per pale
      ctx.fillRect(cx, cy - h / 2, w / 2, h);
    } else if (device === 1) {                // cross
      ctx.fillRect(cx - w * 0.13, cy - h / 2, w * 0.26, h);
      ctx.fillRect(cx - w / 2, cy - h * 0.16, w, h * 0.24);
    } else {                                  // chevron
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, cy + h * 0.26);
      ctx.lineTo(cx, cy - h * 0.10);
      ctx.lineTo(cx + w / 2, cy + h * 0.26);
      ctx.lineTo(cx + w / 2, cy + h * 0.46);
      ctx.lineTo(cx, cy + h * 0.10);
      ctx.lineTo(cx - w / 2, cy + h * 0.46);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Boss and a lit metal rim.
    ctx.fillStyle = 'rgba(255,210,130,0.8)';
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.02, w * 0.09, 0, Math.PI * 2);
    ctx.fill();

    shieldPath(ctx, cx, cy, w, h);
    ctx.strokeStyle = 'rgba(255,205,125,0.8)';
    ctx.lineWidth = Math.max(1, w * 0.075);
    ctx.stroke();
    ctx.restore();
  }

  function drawSword(ctx, cx, cy, len, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    var bw = len * 0.055;

    var steel = ctx.createLinearGradient(-bw, 0, bw, 0);
    steel.addColorStop(0, 'rgba(120,140,168,0.95)');
    steel.addColorStop(0.45, 'rgba(228,242,255,0.98)');
    steel.addColorStop(1, 'rgba(110,130,158,0.95)');
    ctx.fillStyle = steel;
    ctx.beginPath();
    ctx.moveTo(-bw, -len * 0.10);
    ctx.lineTo(bw, -len * 0.10);
    ctx.lineTo(bw, len * 0.40);
    ctx.lineTo(0, len * 0.50);
    ctx.lineTo(-bw, len * 0.40);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,200,95,0.92)';
    ctx.fillRect(-len * 0.13, -len * 0.145, len * 0.26, len * 0.05);
    ctx.fillStyle = 'rgba(72,42,20,0.95)';
    ctx.fillRect(-bw * 0.85, -len * 0.33, bw * 1.7, len * 0.19);
    ctx.beginPath();
    ctx.arc(0, -len * 0.355, len * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,200,95,0.95)';
    ctx.fill();
    ctx.restore();
  }

  function drawBanner(ctx, cx, top, w, h, main, charge) {
    // Rod with finials.
    ctx.strokeStyle = 'rgba(196,166,116,0.85)';
    ctx.lineWidth = Math.max(1, w * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.62, top);
    ctx.lineTo(cx + w * 0.62, top);
    ctx.stroke();

    // Cloth with a swallowtail hem.
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, top);
    ctx.lineTo(cx + w / 2, top);
    ctx.lineTo(cx + w / 2, top + h);
    ctx.lineTo(cx, top + h * 0.76);
    ctx.lineTo(cx - w / 2, top + h);
    ctx.closePath();
    ctx.fillStyle = main;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,205,125,0.45)';
    ctx.lineWidth = Math.max(1, w * 0.05);
    ctx.stroke();

    // Charge.
    ctx.fillStyle = charge;
    ctx.fillRect(cx - w * 0.10, top + h * 0.18, w * 0.20, h * 0.34);
    ctx.fillRect(cx - w * 0.26, top + h * 0.28, w * 0.52, h * 0.14);
  }

  /* ---------------- 1. Techy ---------------- */

  var techy = {
    key: 'TECHY', name: 'Techy',
    ground: '#05070d', accent: '#00e5ff',
    accentSoft: 'rgba(0,229,255,0.35)', accentDim: 'rgba(0,229,255,0.12)',
    foodHue: 315,

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 7919 + 11);
      var cell = px / cells;

      ctx.fillStyle = this.ground;
      ctx.fillRect(0, 0, px, px);
      gridLines(ctx, px, cells, 'rgba(0,229,255,0.055)', 1);

      // Circuit traces: right-angled runs along the grid, like PCB routing.
      var traces = Math.round(cells * 1.6);
      ctx.lineCap = 'square';
      for (var i = 0; i < traces; i++) {
        var hot = rnd() > 0.72;
        var x = Math.floor(rnd() * cells) * cell;
        var y = Math.floor(rnd() * cells) * cell;
        var runA = (1 + Math.floor(rnd() * 5)) * cell * (rnd() > 0.5 ? 1 : -1);
        var runB = (1 + Math.floor(rnd() * 4)) * cell * (rnd() > 0.5 ? 1 : -1);
        var horizontalFirst = rnd() > 0.5;

        ctx.strokeStyle = hot ? 'rgba(255,47,208,0.30)' : 'rgba(0,229,255,0.22)';
        ctx.lineWidth = Math.max(1, cell * 0.1);
        ctx.beginPath();
        ctx.moveTo(x, y);
        if (horizontalFirst) { ctx.lineTo(x + runA, y); ctx.lineTo(x + runA, y + runB); }
        else { ctx.lineTo(x, y + runA); ctx.lineTo(x + runB, y + runA); }
        ctx.stroke();

        var nodeX = horizontalFirst ? x + runA : x + runB;
        var nodeY = horizontalFirst ? y + runB : y + runA;
        var nodeCol = hot ? 'rgba(255,47,208,0.85)' : 'rgba(0,229,255,0.8)';
        var nodeR = Math.max(1.2, cell * 0.13);
        withGlow(ctx, nodeCol, cell * 0.9, function () {
          ctx.fillStyle = nodeCol;
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, nodeR, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      vignette(ctx, px);
    },

    drawFood: function (ctx, x, y, cell, pulse) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var r = cell * (0.32 + pulse * 0.05);
      var col = NS.hsl(this.foodHue, 100, 62);
      withGlow(ctx, col, cell * (1.1 + pulse), function () {
        ctx.fillStyle = col;
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
          var a = (Math.PI / 3) * i - Math.PI / 6;
          var vx = cx + Math.cos(a) * r, vy = cy + Math.sin(a) * r;
          if (i === 0) { ctx.moveTo(vx, vy); } else { ctx.lineTo(vx, vy); }
        }
        ctx.closePath();
        ctx.fill();
      });
      glint(ctx, cx, cy, r * 0.3);
    }
  };

  /* ---------------- 2. Grassy ---------------- */

  var grassy = {
    key: 'GRASSY', name: 'Grassy',
    ground: '#04150b', accent: '#5dff8f',
    accentSoft: 'rgba(93,255,143,0.35)', accentDim: 'rgba(93,255,143,0.12)',
    foodHue: 0,

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 6271 + 29);

      ctx.fillStyle = this.ground;
      ctx.fillRect(0, 0, px, px);

      var glow = ctx.createRadialGradient(px / 2, px * 0.1, 0, px / 2, px * 0.1, px * 0.9);
      glow.addColorStop(0, 'rgba(93,255,143,0.16)');
      glow.addColorStop(1, 'rgba(93,255,143,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, px, px);

      gridLines(ctx, px, cells, 'rgba(93,255,143,0.05)', 1);

      var blades = cells * 26;
      ctx.lineCap = 'round';
      for (var i = 0; i < blades; i++) {
        var x = rnd() * px, y = rnd() * px;
        var h = px * (0.018 + rnd() * 0.045);
        var lean = (rnd() - 0.5) * h * 0.9;
        var bright = rnd();
        ctx.strokeStyle = NS.hsl(105 + rnd() * 45, 90, 40 + bright * 30, 0.1 + bright * 0.28);
        ctx.lineWidth = px * 0.0022 + rnd() * px * 0.0022;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + lean * 0.4, y - h * 0.6, x + lean, y - h);
        ctx.stroke();
      }

      for (var j = 0; j < cells; j++) {
        var mx = rnd() * px, my = rnd() * px, mr = px * (0.002 + rnd() * 0.004);
        withGlow(ctx, 'rgba(200,255,150,0.9)', px * 0.02, function () {
          ctx.fillStyle = 'rgba(220,255,190,0.75)';
          ctx.beginPath();
          ctx.arc(mx, my, mr, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      vignette(ctx, px);
    },

    drawFood: function (ctx, x, y, cell, pulse) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var r = cell * (0.33 + pulse * 0.05);
      var col = NS.hsl(this.foodHue, 100, 58);
      withGlow(ctx, col, cell * (1.1 + pulse), function () {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy + cell * 0.03, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = 'rgba(140,255,160,0.95)';
      ctx.lineWidth = Math.max(1, cell * 0.1);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.75);
      ctx.quadraticCurveTo(cx + r * 0.6, cy - r * 1.35, cx + r * 0.95, cy - r * 0.85);
      ctx.stroke();
      glint(ctx, cx - r * 0.3, cy - r * 0.25, r * 0.22);
    }
  };

  /* ---------------- 3. Blocky ---------------- */

  var blocky = {
    key: 'BLOCKY', name: 'Blocky',
    ground: '#0b0616', accent: '#ffd166',
    accentSoft: 'rgba(255,209,102,0.35)', accentDim: 'rgba(255,209,102,0.12)',
    foodHue: 190,

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 5237 + 43);
      var cell = px / cells;

      ctx.fillStyle = this.ground;
      ctx.fillRect(0, 0, px, px);

      for (var gy = 0; gy < cells; gy++) {
        for (var gx = 0; gx < cells; gx++) {
          if ((gx + gy) % 2 === 0) { continue; }
          ctx.fillStyle = 'rgba(255,255,255,0.028)';
          ctx.fillRect(gx * cell, gy * cell, cell, cell);
        }
      }

      var hues = [320, 45, 275, 165, 200, 10];
      var tiles = Math.round(cells * cells * 0.06);
      for (var i = 0; i < tiles; i++) {
        var tx = Math.floor(rnd() * cells) * cell;
        var ty = Math.floor(rnd() * cells) * cell;
        var hue = hues[Math.floor(rnd() * hues.length)];
        var pad = cell * 0.16;
        ctx.fillStyle = NS.hsl(hue, 95, 65, 0.14 + rnd() * 0.16);
        ctx.fillRect(tx + pad, ty + pad, cell - pad * 2, cell - pad * 2);
      }

      var lit = Math.round(cells * 0.7);
      for (var j = 0; j < lit; j++) {
        var bx = Math.floor(rnd() * cells) * cell;
        var by = Math.floor(rnd() * cells) * cell;
        var bh = hues[Math.floor(rnd() * hues.length)];
        var bpad = cell * 0.22;
        var bcol = NS.hsl(bh, 100, 68, 0.5);
        withGlow(ctx, NS.hsl(bh, 100, 68), cell * 0.8, function () {
          ctx.fillStyle = bcol;
          ctx.fillRect(bx + bpad, by + bpad, cell - bpad * 2, cell - bpad * 2);
        });
      }

      gridLines(ctx, px, cells, 'rgba(255,255,255,0.045)', 1);
      vignette(ctx, px);
    },

    drawFood: function (ctx, x, y, cell, pulse) {
      var pad = cell * (0.2 - pulse * 0.04);
      var col = NS.hsl(this.foodHue, 100, 65);
      withGlow(ctx, col, cell * (1.1 + pulse), function () {
        ctx.fillStyle = col;
        ctx.fillRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
      });
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      var ip = cell * 0.35;
      ctx.fillRect(x + ip, y + ip, cell - ip * 2, cell - ip * 2);
    }
  };

  /* ---------------- 4. Medieval ---------------- */

  var medieval = {
    key: 'MEDIEVAL', name: 'Medieval',
    ground: '#0d0a14', accent: '#ffb43d',
    accentSoft: 'rgba(255,180,61,0.35)', accentDim: 'rgba(255,180,61,0.12)',
    foodHue: 145,          // emerald - crimson would vanish on the red runner

    // The great hall of a keep, seen from above: flagstone floor, a runner down
    // the middle, columns, light falling from the windows, and the walls of the
    // room around the edge hung with heraldry.
    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 4391 + 61);
      var band = px * 0.075;                 // thickness of the surrounding wall

      ctx.fillStyle = this.ground;
      ctx.fillRect(0, 0, px, px);

      /* ---- flagstone floor ---- */
      var fs = px / 8;
      for (var gy = 0; gy < 8; gy++) {
        for (var gx = 0; gx < 8; gx++) {
          var jx = (rnd() - 0.5) * fs * 0.05;
          var jy = (rnd() - 0.5) * fs * 0.05;
          var tone = 0.045 + rnd() * 0.05;
          ctx.fillStyle = 'rgba(198,206,236,' + tone + ')';
          ctx.fillRect(gx * fs + 2 + jx, gy * fs + 2 + jy, fs - 4, fs - 4);

          // Worn patches and cracks.
          if (rnd() > 0.62) {
            ctx.fillStyle = 'rgba(0,0,0,0.16)';
            ctx.beginPath();
            ctx.ellipse(gx * fs + fs * (0.3 + rnd() * 0.4), gy * fs + fs * (0.3 + rnd() * 0.4),
              fs * (0.10 + rnd() * 0.16), fs * (0.07 + rnd() * 0.12), rnd() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
          }
          if (rnd() > 0.82) {
            ctx.strokeStyle = 'rgba(0,0,0,0.30)';
            ctx.lineWidth = Math.max(1, px * 0.0016);
            ctx.beginPath();
            var sx0 = gx * fs + fs * rnd(), sy0 = gy * fs + fs * rnd();
            ctx.moveTo(sx0, sy0);
            ctx.lineTo(sx0 + fs * (rnd() - 0.5) * 0.6, sy0 + fs * (rnd() - 0.5) * 0.6);
            ctx.stroke();
          }
        }
      }

      /* ---- runner down the centre of the hall ---- */
      var cw = px * 0.23, cx0 = px / 2 - cw / 2;
      ctx.fillStyle = 'rgba(104,18,26,0.72)';
      ctx.fillRect(cx0, band, cw, px - band * 2);
      ctx.fillStyle = 'rgba(150,30,38,0.20)';
      ctx.fillRect(cx0 + cw * 0.14, band, cw * 0.72, px - band * 2);

      ctx.fillStyle = 'rgba(206,168,86,0.65)';
      ctx.fillRect(cx0 + cw * 0.06, band, cw * 0.028, px - band * 2);
      ctx.fillRect(cx0 + cw * 0.912, band, cw * 0.028, px - band * 2);

      ctx.strokeStyle = 'rgba(206,168,86,0.42)';
      ctx.lineWidth = Math.max(1, px * 0.002);
      for (var my = band + px * 0.06; my < px - band; my += px * 0.115) {
        diamondPath(ctx, px / 2, my, cw * 0.15, px * 0.026);
        ctx.stroke();
      }

      /* ---- light from the windows ---- */
      for (var w = 0; w < 3; w++) {
        var lx = px * (0.10 + w * 0.33);
        var g = ctx.createLinearGradient(lx, 0, lx + px * 0.26, px);
        g.addColorStop(0, 'rgba(255,240,196,0.17)');
        g.addColorStop(0.6, 'rgba(255,226,160,0.07)');
        g.addColorStop(1, 'rgba(255,215,140,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx + px * 0.115, 0);
        ctx.lineTo(lx + px * 0.30, px);
        ctx.lineTo(lx + px * 0.155, px);
        ctx.closePath();
        ctx.fill();
      }

      /* ---- columns ---- */
      var colR = px * 0.036;
      [[0.20, 0.26], [0.80, 0.26], [0.20, 0.74], [0.80, 0.74]].forEach(function (p) {
        var cx = px * p[0], cy = px * p[1];
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(cx + colR * 0.30, cy + colR * 0.34, colR * 1.16, colR * 1.06, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(150,158,190,0.16)';
        ctx.beginPath();
        ctx.arc(cx, cy, colR * 1.24, 0, Math.PI * 2);
        ctx.fill();

        var lit = ctx.createRadialGradient(cx - colR * 0.4, cy - colR * 0.45, colR * 0.1, cx, cy, colR);
        lit.addColorStop(0, 'rgba(226,232,252,0.60)');
        lit.addColorStop(0.65, 'rgba(150,158,190,0.34)');
        lit.addColorStop(1, 'rgba(60,64,88,0.42)');
        ctx.fillStyle = lit;
        ctx.beginPath();
        ctx.arc(cx, cy, colR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(230,236,255,0.14)';
        ctx.lineWidth = Math.max(1, px * 0.0018);
        for (var f = 0; f < 7; f++) {
          var a = (Math.PI * 2 / 7) * f;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * colR * 0.42, cy + Math.sin(a) * colR * 0.42);
          ctx.lineTo(cx + Math.cos(a) * colR * 0.95, cy + Math.sin(a) * colR * 0.95);
          ctx.stroke();
        }
      });

      /* ---- the walls of the room ---- */
      ctx.fillStyle = 'rgba(7,5,11,0.94)';
      ctx.fillRect(0, 0, px, band);
      ctx.fillRect(0, px - band, px, band);
      ctx.fillRect(0, 0, band, px);
      ctx.fillRect(px - band, 0, band, px);

      var bh = band * 0.5;                    // masonry courses on the wall band
      ctx.strokeStyle = 'rgba(176,188,224,0.13)';
      ctx.lineWidth = Math.max(1, px * 0.0015);
      for (var t = 0; t < px; t += bh * 1.9) {
        ctx.strokeRect(t, 1, bh * 1.9, bh);
        ctx.strokeRect(t + bh * 0.95, band - bh - 1, bh * 1.9, bh);
        ctx.strokeRect(t, px - band + 1, bh * 1.9, bh);
        ctx.strokeRect(t + bh * 0.95, px - bh - 1, bh * 1.9, bh);
        ctx.strokeRect(1, t, bh, bh * 1.9);
        ctx.strokeRect(band - bh - 1, t + bh * 0.95, bh, bh * 1.9);
        ctx.strokeRect(px - band + 1, t, bh, bh * 1.9);
        ctx.strokeRect(px - bh - 1, t + bh * 0.95, bh, bh * 1.9);
      }

      ctx.strokeStyle = 'rgba(198,208,242,0.20)';
      ctx.lineWidth = Math.max(1, px * 0.0022);
      ctx.strokeRect(band, band, px - band * 2, px - band * 2);

      /* ---- heraldry hung on those walls ---- */
      var heraldry = [
        ['rgba(150,32,42,0.94)', 'rgba(240,205,120,0.96)'],   // gules & or
        ['rgba(28,58,120,0.94)', 'rgba(226,232,244,0.96)'],   // azure & argent
        ['rgba(32,86,52,0.94)', 'rgba(240,205,120,0.96)'],    // vert & or
        ['rgba(64,36,96,0.94)', 'rgba(240,205,120,0.96)']     // purpure & or
      ];
      var u = px * 0.115;                     // nominal size of a wall piece

      function torch(cx, cy) {
        var flame = ctx.createRadialGradient(cx, cy, 0, cx, cy, px * 0.15);
        flame.addColorStop(0, 'rgba(255,192,92,0.46)');
        flame.addColorStop(0.4, 'rgba(255,122,40,0.18)');
        flame.addColorStop(1, 'rgba(255,90,20,0)');
        ctx.fillStyle = flame;
        ctx.fillRect(cx - px * 0.15, cy - px * 0.15, px * 0.30, px * 0.30);
        ctx.fillStyle = 'rgba(70,48,26,0.92)';
        ctx.fillRect(cx - px * 0.006, cy, px * 0.012, px * 0.042);
        withGlow(ctx, 'rgba(255,170,60,0.95)', px * 0.035, function () {
          ctx.fillStyle = 'rgba(255,228,170,0.97)';
          ctx.beginPath();
          ctx.ellipse(cx, cy - px * 0.005, px * 0.009, px * 0.017, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Top wall: banners between crossed swords. Side walls: shields.
      // Corners: torches, so the room is lit from its four corners.
      var top = band * 0.78;
      drawBanner(ctx, px * 0.30, top - u * 0.16, u * 0.52, u * 1.5, heraldry[0][0], heraldry[0][1]);
      drawBanner(ctx, px * 0.70, top - u * 0.16, u * 0.52, u * 1.5, heraldry[1][0], heraldry[1][1]);

      drawSword(ctx, px * 0.5, top + u * 0.30, u * 1.05, -0.62);
      drawSword(ctx, px * 0.5, top + u * 0.30, u * 1.05, 0.62);
      drawShield(ctx, px * 0.5, top + u * 0.34, u * 0.46, u * 0.55, heraldry[2][0], heraldry[2][1], 1);

      drawShield(ctx, band * 0.86, px * 0.38, u * 0.60, u * 0.71, heraldry[1][0], heraldry[1][1], 0);
      drawShield(ctx, band * 0.86, px * 0.66, u * 0.60, u * 0.71, heraldry[3][0], heraldry[3][1], 2);
      drawShield(ctx, px - band * 0.86, px * 0.38, u * 0.60, u * 0.71, heraldry[2][0], heraldry[2][1], 2);
      drawShield(ctx, px - band * 0.86, px * 0.66, u * 0.60, u * 0.71, heraldry[0][0], heraldry[0][1], 0);

      drawBanner(ctx, px * 0.36, px - band * 1.05, u * 0.46, u * 1.15, heraldry[3][0], heraldry[3][1]);
      drawBanner(ctx, px * 0.64, px - band * 1.05, u * 0.46, u * 1.15, heraldry[2][0], heraldry[2][1]);

      torch(band * 0.9, band * 0.9);
      torch(px - band * 0.9, band * 0.9);
      torch(band * 0.9, px - band * 0.9);
      torch(px - band * 0.9, px - band * 0.9);

      vignette(ctx, px, 0.55);
    },

    // A crimson gem set in a shield.
    drawFood: function (ctx, x, y, cell, pulse) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var w = cell * (0.30 + pulse * 0.04), h = cell * (0.38 + pulse * 0.04);
      var col = NS.hsl(this.foodHue, 90, 58);
      withGlow(ctx, col, cell * (1.0 + pulse), function () {
        ctx.fillStyle = col;
        diamondPath(ctx, cx, cy, w, h);
        ctx.fill();
      });
      ctx.fillStyle = 'rgba(255,220,230,0.55)';
      diamondPath(ctx, cx, cy - h * 0.18, w * 0.44, h * 0.4);
      ctx.fill();
      glint(ctx, cx - w * 0.22, cy - h * 0.3, cell * 0.055);
    }
  };

  /* ---------------- 5. Sky ---------------- */

  var sky = {
    key: 'SKY', name: 'Sky',
    ground: '#041226', accent: '#7ad7ff',
    accentSoft: 'rgba(122,215,255,0.35)', accentDim: 'rgba(122,215,255,0.12)',
    foodHue: 45,

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 8123 + 17);

      var sk = ctx.createLinearGradient(0, 0, 0, px);
      sk.addColorStop(0, '#072a4d');
      sk.addColorStop(0.55, '#04162c');
      sk.addColorStop(1, '#020b18');
      ctx.fillStyle = sk;
      ctx.fillRect(0, 0, px, px);

      // Stars.
      for (var s = 0; s < cells * 3; s++) {
        var sx2 = rnd() * px, sy2 = rnd() * px * 0.6;
        var sr = px * (0.0012 + rnd() * 0.0026);
        ctx.fillStyle = 'rgba(220,245,255,' + (0.3 + rnd() * 0.5) + ')';
        ctx.beginPath();
        ctx.arc(sx2, sy2, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Clouds: overlapping soft blobs.
      var clouds = Math.max(4, Math.round(cells * 0.28));
      for (var i = 0; i < clouds; i++) {
        var cx = rnd() * px;
        var cy = px * (0.15 + rnd() * 0.75);
        var scale = px * (0.05 + rnd() * 0.07);
        var puffs = 4 + Math.floor(rnd() * 4);
        for (var p = 0; p < puffs; p++) {
          var ox = cx + (p - puffs / 2) * scale * 0.8 + (rnd() - 0.5) * scale * 0.4;
          var oy = cy + (rnd() - 0.5) * scale * 0.5;
          var rr = scale * (0.6 + rnd() * 0.6);
          var g = ctx.createRadialGradient(ox, oy, 0, ox, oy, rr);
          g.addColorStop(0, 'rgba(170,225,255,0.20)');
          g.addColorStop(1, 'rgba(140,205,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(ox - rr, oy - rr, rr * 2, rr * 2);
        }
      }

      gridLines(ctx, px, cells, 'rgba(160,220,255,0.045)', 1);
      vignette(ctx, px, 0.4);
    },

    // A small sun.
    drawFood: function (ctx, x, y, cell, pulse) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var r = cell * (0.26 + pulse * 0.04);
      var col = NS.hsl(this.foodHue, 100, 62);
      withGlow(ctx, col, cell * (1.2 + pulse), function () {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1, cell * 0.07);
        ctx.lineCap = 'round';
        for (var i = 0; i < 8; i++) {
          var a = (Math.PI / 4) * i;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 1.25);
          ctx.lineTo(cx + Math.cos(a) * r * (1.6 + pulse * 0.2), cy + Math.sin(a) * r * (1.6 + pulse * 0.2));
          ctx.stroke();
        }
      });
      glint(ctx, cx, cy, r * 0.4);
    }
  };

  /* ---- armour, seen from above ---- */

  // Track marks left behind, fading with distance.
  function trackMarks(ctx, x, y, ang, size, len) {
    var W = size * 0.62;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    for (var s = -1; s <= 1; s += 2) {
      var off = s * W * 0.37;
      var grad = ctx.createLinearGradient(-size * 0.5, 0, -size * 0.5 - len, 0);
      grad.addColorStop(0, 'rgba(18,24,14,0.55)');
      grad.addColorStop(1, 'rgba(18,24,14,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(-size * 0.5 - len, off - W * 0.11, len, W * 0.22);
    }
    ctx.restore();
  }

  // Hull, tracks with tread ticks, turret and gun. Dark silhouette, rim-lit.
  function drawTank(ctx, x, y, size, ang, turretAng, body, rim) {
    var L = size, W = size * 0.62;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);

    ctx.fillStyle = 'rgba(0,0,0,0.40)';                 // ground shadow
    ctx.fillRect(-L * 0.48 + size * 0.05, -W * 0.5 + size * 0.05, L * 0.96, W);

    ctx.fillStyle = 'rgba(10,14,9,0.97)';               // tracks
    ctx.fillRect(-L * 0.5, -W * 0.5, L, W * 0.27);
    ctx.fillRect(-L * 0.5, W * 0.23, L, W * 0.27);
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(0.6, size * 0.022);
    ctx.globalAlpha = 0.45;
    for (var i = 0; i <= 7; i++) {                      // tread ticks
      var tx = -L * 0.5 + (L / 7) * i;
      ctx.beginPath();
      ctx.moveTo(tx, -W * 0.5); ctx.lineTo(tx, -W * 0.23);
      ctx.moveTo(tx, W * 0.23); ctx.lineTo(tx, W * 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = body;                               // hull
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(-L * 0.44, -W * 0.34, L * 0.88, W * 0.68, size * 0.06); }
    else { ctx.rect(-L * 0.44, -W * 0.34, L * 0.88, W * 0.68); }
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(0.8, size * 0.035);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,0.30)';                 // glacis plate
    ctx.fillRect(L * 0.24, -W * 0.34, L * 0.12, W * 0.68);

    // Turret rotates independently of the hull.
    ctx.rotate(turretAng);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, W * 0.31, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(0.8, size * 0.03);
    ctx.stroke();

    ctx.fillStyle = 'rgba(10,14,9,0.97)';               // gun
    ctx.fillRect(W * 0.22, -size * 0.035, L * 0.52, size * 0.07);
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(0.6, size * 0.018);
    ctx.strokeRect(W * 0.22, -size * 0.035, L * 0.52, size * 0.07);

    ctx.fillStyle = 'rgba(0,0,0,0.45)';                 // hatch
    ctx.beginPath();
    ctx.arc(-W * 0.07, 0, W * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ---------------- 6. War Map ---------------- */

  var war = {
    key: 'WAR', name: 'War Map',
    ground: '#0d1409', accent: '#b6ff5a',
    accentSoft: 'rgba(182,255,90,0.35)', accentDim: 'rgba(182,255,90,0.12)',
    foodHue: 45,

    // Two radar posts, and the columns of armour crossing the ground.
    radars: [[0.83, 0.17, 0.30, 0.85], [0.17, 0.84, 0.22, -0.6]],
    columns: [
      { y: 0.26, dir: -1, speed: 0.052, off: 0.10, size: 0.070, hostile: true },
      { y: 0.34, dir: -1, speed: 0.045, off: 0.52, size: 0.062, hostile: true },
      { y: 0.44, dir: -1, speed: 0.058, off: 0.80, size: 0.058, hostile: true },
      { y: 0.62, dir: 1, speed: 0.048, off: 0.22, size: 0.070, hostile: false },
      { y: 0.71, dir: 1, speed: 0.040, off: 0.62, size: 0.064, hostile: false },
      { y: 0.80, dir: 1, speed: 0.055, off: 0.05, size: 0.058, hostile: false },
      { y: 0.91, dir: 1, speed: 0.036, off: 0.44, size: 0.052, hostile: false }
    ],

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 3719 + 83);

      // Open ground, lit slightly from the north.
      var g = ctx.createLinearGradient(0, 0, 0, px);
      g.addColorStop(0, '#16210e');
      g.addColorStop(0.5, '#0f1709');
      g.addColorStop(1, '#080d05');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, px, px);

      // Ground texture: scrub and shell scrapes, nothing that reads as a symbol.
      for (var i = 0; i < cells * 16; i++) {
        var sx = rnd() * px, sy = rnd() * px;
        ctx.fillStyle = 'rgba(150,190,90,' + (0.015 + rnd() * 0.05) + ')';
        ctx.fillRect(sx, sy, px * 0.003, px * 0.003);
      }
      for (var c = 0; c < 14; c++) {
        var cx = rnd() * px, cy = rnd() * px, cr = px * (0.008 + rnd() * 0.020);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, cr, cr * 0.72, rnd() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(150,180,100,0.10)';
        ctx.lineWidth = Math.max(1, px * 0.0014);
        ctx.stroke();
      }

      // Two faint ridges, so the ground is not perfectly flat.
      ctx.strokeStyle = 'rgba(182,255,90,0.07)';
      ctx.lineWidth = Math.max(1, px * 0.0018);
      for (var r = 0; r < 2; r++) {
        var ox = px * (0.25 + r * 0.45), oy = px * (0.30 + r * 0.34);
        for (var k = 1; k <= 3; k++) {
          ctx.beginPath();
          for (var a = 0; a <= 48; a++) {
            var t = (a / 48) * Math.PI * 2;
            var rr = px * 0.05 * k * (1 + Math.sin(t * 3 + r) * 0.18);
            var xx = ox + Math.cos(t) * rr, yy = oy + Math.sin(t) * rr * 0.6;
            if (a === 0) { ctx.moveTo(xx, yy); } else { ctx.lineTo(xx, yy); }
          }
          ctx.closePath();
          ctx.stroke();
        }
      }

      // Static rings of the two radar posts.
      this.radars.forEach(function (rad) {
        var rx = px * rad[0], ry = px * rad[1], rr = px * rad[2];
        ctx.strokeStyle = 'rgba(182,255,90,0.16)';
        ctx.lineWidth = Math.max(1, px * 0.0018);
        [0.4, 0.7, 1].forEach(function (f) {
          ctx.beginPath(); ctx.arc(rx, ry, rr * f, 0, Math.PI * 2); ctx.stroke();
        });
        ctx.beginPath();
        ctx.moveTo(rx - rr, ry); ctx.lineTo(rx + rr, ry);
        ctx.moveTo(rx, ry - rr); ctx.lineTo(rx, ry + rr);
        ctx.stroke();
      });

      vignette(ctx, px, 0.5);
    },

    drawOverlay: function (ctx, px, cells, time) {
      var t = time / 1000;

      // Radar sweeps.
      this.radars.forEach(function (rad) {
        var rx = px * rad[0], ry = px * rad[1], rr = px * rad[2];
        var ang = (t * rad[3]) % (Math.PI * 2);
        ctx.save();
        ctx.beginPath();
        ctx.arc(rx, ry, rr, 0, Math.PI * 2);
        ctx.clip();
        for (var i = 0; i < 14; i++) {
          var a0 = ang - i * 0.055 * Math.sign(rad[3] || 1);
          ctx.fillStyle = 'rgba(182,255,90,' + (0.075 * (1 - i / 14)) + ')';
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.arc(rx, ry, rr, Math.min(a0, a0 - 0.055), Math.max(a0, a0 - 0.055));
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = 'rgba(182,255,90,0.8)';
        ctx.lineWidth = Math.max(1, px * 0.0028);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.cos(ang) * rr, ry + Math.sin(ang) * rr);
        ctx.stroke();
      });

      // Armour crossing the ground. Each column loops off one edge and back on
      // the other, so there is always movement without a crowd of vehicles.
      var self = this;
      this.columns.forEach(function (col, idx) {
        var span = 1.34;
        var travel = ((t * col.speed + col.off) % span);
        var x = col.dir > 0 ? (travel - 0.17) * px : (1.17 - travel) * px;
        var y = px * col.y + Math.sin(t * 0.5 + idx) * px * 0.004;   // slight wander
        var ang = col.dir > 0 ? 0 : Math.PI;
        // The turret tracks slowly across, independent of where the hull points.
        var turret = Math.sin(t * 0.35 + idx * 1.7) * 0.5;
        var size = px * col.size;

        trackMarks(ctx, x, y, ang, size, px * 0.10);
        drawTank(ctx, x, y, size, ang, turret,
          col.hostile ? 'rgba(58,26,22,0.97)' : 'rgba(30,46,26,0.97)',
          col.hostile ? 'rgba(255,120,100,0.65)' : 'rgba(150,220,120,0.6)');

        // Anything inside a radar's reach paints a contact as the beam passes.
        self.radars.forEach(function (rad) {
          var rx = px * rad[0], ry = px * rad[1], rr = px * rad[2];
          var d = Math.hypot(x - rx, y - ry);
          if (d > rr) { return; }
          var ca = Math.atan2(y - ry, x - rx);
          var ang2 = (t * rad[3]) % (Math.PI * 2);
          var diff = Math.abs(((ang2 - ca + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          var lit = Math.max(0, 1 - (Math.PI - diff) / 1.1);
          if (lit <= 0.02) { return; }
          ctx.fillStyle = 'rgba(182,255,90,' + (lit * 0.85) + ')';
          ctx.beginPath();
          ctx.arc(x, y, px * 0.007, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    },

    // Amber objective pin.
    drawFood: function (ctx, x, y, cell, pulse) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var r = cell * (0.30 + pulse * 0.05);
      var col = NS.hsl(this.foodHue, 100, 58);
      withGlow(ctx, col, cell * (1.15 + pulse), function () {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1, cell * 0.075);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - r * 1.4, cy); ctx.lineTo(cx - r * 0.62, cy);
        ctx.moveTo(cx + r * 0.62, cy); ctx.lineTo(cx + r * 1.4, cy);
        ctx.moveTo(cx, cy - r * 1.4); ctx.lineTo(cx, cy - r * 0.62);
        ctx.moveTo(cx, cy + r * 0.62); ctx.lineTo(cx, cy + r * 1.4);
        ctx.stroke();
      });
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  /* ---- deep space ---- */

  function nebulaBloom(ctx, cx, cy, r, inner, outer) {
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, inner);
    g.addColorStop(0.45, outer);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  function starfield(ctx, px, rnd, count) {
    for (var i = 0; i < count; i++) {
      var x = rnd() * px, y = rnd() * px;
      var mag = rnd();
      var r = px * (0.0009 + mag * mag * 0.0035);
      var tint = rnd();
      var col = tint > 0.88 ? 'rgba(255,206,180,' : tint < 0.12 ? 'rgba(186,214,255,' : 'rgba(255,255,255,';
      ctx.fillStyle = col + (0.25 + mag * 0.7) + ')';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // The brightest few get diffraction spikes.
      if (mag > 0.95) {
        withGlow(ctx, 'rgba(220,236,255,0.9)', px * 0.02, function () {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          starPath(ctx, x, y, 4, r * 6, r * 0.7);
          ctx.fill();
        });
      }
    }
  }

  // Banded gas giant, lit from the upper left, with an optional ring system
  // drawn in two passes so the near side crosses in front of the planet.
  function drawPlanet(ctx, cx, cy, r, opt) {
    var hue = opt.hue, tilt = opt.tilt || -0.42;

    function rings(from, to) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      [[2.15, 0.09, 0.30], [1.92, 0.13, 0.46], [1.66, 0.07, 0.26], [1.50, 0.10, 0.38]]
        .forEach(function (band) {
          ctx.beginPath();
          ctx.ellipse(0, 0, r * band[0], r * band[0] * 0.30, 0, from, to);
          ctx.strokeStyle = NS.hsl(hue + 12, 60, 74, band[2]);
          ctx.lineWidth = r * band[1];
          ctx.stroke();
        });
      ctx.restore();
    }

    if (opt.ring) { rings(Math.PI, Math.PI * 2); }        // far side, behind

    // Atmospheric halo.
    var halo = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.45);
    halo.addColorStop(0, NS.hsl(hue, 90, 60, 0.34));
    halo.addColorStop(1, NS.hsl(hue, 90, 60, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(cx - r * 1.5, cy - r * 1.5, r * 3, r * 3);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    var body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.25);
    body.addColorStop(0, NS.hsl(hue, 70, 62));
    body.addColorStop(0.55, NS.hsl(hue, 62, 42));
    body.addColorStop(1, NS.hsl(hue, 60, 16));
    ctx.fillStyle = body;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Latitude bands.
    (opt.bands || [[-0.55, 0.16, 10, 0.30], [-0.18, 0.22, -8, 0.22],
      [0.22, 0.14, 14, 0.26], [0.55, 0.18, -6, 0.18]]).forEach(function (b) {
      ctx.fillStyle = NS.hsl(hue + b[2], 66, 58, b[3]);
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * b[0], r * 1.05, r * b[1], 0, 0, Math.PI * 2);
      ctx.fill();
    });

    if (opt.spot) {                                       // a storm
      ctx.fillStyle = NS.hsl(hue - 24, 78, 52, 0.55);
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.28, cy + r * 0.20, r * 0.26, r * 0.15, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Terminator: night creeping in from the lower right.
    var night = ctx.createRadialGradient(cx - r * 0.45, cy - r * 0.5, r * 0.2, cx, cy, r * 1.5);
    night.addColorStop(0, 'rgba(0,0,0,0)');
    night.addColorStop(0.55, 'rgba(2,3,12,0.30)');
    night.addColorStop(1, 'rgba(2,3,12,0.88)');
    ctx.fillStyle = night;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    // Lit limb.
    ctx.strokeStyle = NS.hsl(hue, 95, 82, 0.55);
    ctx.lineWidth = r * 0.045;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.985, Math.PI * 0.85, Math.PI * 1.75);
    ctx.stroke();

    if (opt.ring) { rings(0, Math.PI); }                  // near side, in front
  }

  function drawMoon(ctx, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    var g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.3);
    g.addColorStop(0, '#d8dbe6');
    g.addColorStop(0.6, '#8e94a8');
    g.addColorStop(1, '#3a3f52');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.42, 0.13], [0.42, -0.35, 0.10]]
      .forEach(function (c) {
        ctx.fillStyle = 'rgba(60,64,80,0.45)';
        ctx.beginPath();
        ctx.arc(cx + r * c[0], cy + r * c[1], r * c[2], 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(230,234,245,0.30)';
        ctx.lineWidth = r * 0.03;
        ctx.beginPath();
        ctx.arc(cx + r * c[0], cy + r * c[1], r * c[2], Math.PI * 0.9, Math.PI * 1.8);
        ctx.stroke();
      });

    var night = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.15, cx, cy, r * 1.45);
    night.addColorStop(0, 'rgba(0,0,0,0)');
    night.addColorStop(1, 'rgba(3,4,14,0.85)');
    ctx.fillStyle = night;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  }

  // Classic finned rocket, nose up, with a lit porthole and an engine plume.
  function drawRocket(ctx, x, y, len, angle) {
    var w = len * 0.30;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Plume first, so the hull sits over it.
    var flame = ctx.createLinearGradient(0, len * 0.30, 0, len * 0.95);
    flame.addColorStop(0, 'rgba(255,238,170,0.95)');
    flame.addColorStop(0.35, 'rgba(255,158,54,0.75)');
    flame.addColorStop(1, 'rgba(255,90,30,0)');
    withGlow(ctx, 'rgba(255,170,70,0.9)', len * 0.35, function () {
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(-w * 0.30, len * 0.30);
      ctx.quadraticCurveTo(-w * 0.16, len * 0.72, 0, len * 0.95);
      ctx.quadraticCurveTo(w * 0.16, len * 0.72, w * 0.30, len * 0.30);
      ctx.closePath();
      ctx.fill();
    });

    // Fins.
    ctx.fillStyle = '#c8434a';
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(s * w * 0.42, len * 0.06);
      ctx.quadraticCurveTo(s * w * 0.95, len * 0.24, s * w * 0.80, len * 0.34);
      ctx.lineTo(s * w * 0.40, len * 0.30);
      ctx.closePath();
      ctx.fill();
    });

    // Hull.
    var hull = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    hull.addColorStop(0, '#7d8598');
    hull.addColorStop(0.35, '#eef2f8');
    hull.addColorStop(1, '#9aa3b4');
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(0, -len * 0.50);
    ctx.quadraticCurveTo(w * 0.5, -len * 0.16, w * 0.44, len * 0.30);
    ctx.lineTo(-w * 0.44, len * 0.30);
    ctx.quadraticCurveTo(-w * 0.5, -len * 0.16, 0, -len * 0.50);
    ctx.closePath();
    ctx.fill();

    // Nose cone and engine collar.
    ctx.fillStyle = '#c8434a';
    ctx.beginPath();
    ctx.moveTo(0, -len * 0.50);
    ctx.quadraticCurveTo(w * 0.34, -len * 0.28, w * 0.30, -len * 0.16);
    ctx.lineTo(-w * 0.30, -len * 0.16);
    ctx.quadraticCurveTo(-w * 0.34, -len * 0.28, 0, -len * 0.50);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5d6577';
    ctx.fillRect(-w * 0.46, len * 0.24, w * 0.92, len * 0.07);

    // Porthole.
    withGlow(ctx, 'rgba(120,220,255,0.95)', len * 0.12, function () {
      ctx.fillStyle = '#9fe4ff';
      ctx.beginPath();
      ctx.arc(0, -len * 0.02, w * 0.20, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = '#5d6577';
    ctx.lineWidth = len * 0.022;
    ctx.beginPath();
    ctx.arc(0, -len * 0.02, w * 0.20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawSatellite(ctx, x, y, s, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#aeb6c6';
    ctx.fillRect(-s * 0.30, -s * 0.22, s * 0.60, s * 0.44);
    ctx.fillStyle = '#6f7789';
    ctx.fillRect(-s * 0.30, -s * 0.22, s * 0.60, s * 0.10);

    [-1, 1].forEach(function (d) {
      ctx.fillStyle = '#2b4c9a';
      ctx.fillRect(d > 0 ? s * 0.34 : -s * 1.06, -s * 0.20, s * 0.72, s * 0.40);
      ctx.strokeStyle = 'rgba(150,200,255,0.55)';
      ctx.lineWidth = s * 0.03;
      for (var i = 1; i < 4; i++) {
        var gx = (d > 0 ? s * 0.34 : -s * 1.06) + (s * 0.72 / 4) * i;
        ctx.beginPath();
        ctx.moveTo(gx, -s * 0.20); ctx.lineTo(gx, s * 0.20);
        ctx.stroke();
      }
      ctx.strokeStyle = '#8d94a6';
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(d * s * 0.30, 0); ctx.lineTo(d * s * 0.34, 0);
      ctx.stroke();
    });

    withGlow(ctx, 'rgba(255,120,120,0.9)', s * 0.3, function () {
      ctx.fillStyle = '#ff8a8a';
      ctx.beginPath();
      ctx.arc(0, -s * 0.30, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawComet(ctx, x, y, len, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    var tail = ctx.createLinearGradient(0, 0, -len, 0);
    tail.addColorStop(0, 'rgba(190,235,255,0.75)');
    tail.addColorStop(0.5, 'rgba(140,190,255,0.22)');
    tail.addColorStop(1, 'rgba(120,170,255,0)');
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.moveTo(0, -len * 0.045);
    ctx.quadraticCurveTo(-len * 0.5, -len * 0.10, -len, -len * 0.02);
    ctx.quadraticCurveTo(-len * 0.5, len * 0.10, 0, len * 0.045);
    ctx.closePath();
    ctx.fill();
    withGlow(ctx, 'rgba(200,240,255,0.95)', len * 0.16, function () {
      ctx.fillStyle = '#e8f7ff';
      ctx.beginPath();
      ctx.arc(0, 0, len * 0.05, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawAsteroid(ctx, cx, cy, r, rnd) {
    ctx.beginPath();
    for (var i = 0; i < 9; i++) {
      var a = (Math.PI * 2 / 9) * i;
      var rr = r * (0.72 + rnd() * 0.5);
      var px2 = cx + Math.cos(a) * rr, py2 = cy + Math.sin(a) * rr;
      if (i === 0) { ctx.moveTo(px2, py2); } else { ctx.lineTo(px2, py2); }
    }
    ctx.closePath();
    var g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, '#8b8fa0');
    g.addColorStop(1, '#33374a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(210,220,240,0.25)';
    ctx.lineWidth = r * 0.10;
    ctx.stroke();
  }

  /* ---------------- 7. Space ---------------- */

  var space = {
    key: 'SPACE', name: 'Space',
    ground: '#04030f', accent: '#7cc4ff',
    accentSoft: 'rgba(124,196,255,0.35)', accentDim: 'rgba(124,196,255,0.12)',
    foodHue: 95,           // a green energy cell against all that blue and violet

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 2657 + 97);

      // Deep field.
      var deep = ctx.createRadialGradient(px * 0.6, px * 0.3, 0, px * 0.5, px * 0.5, px * 0.95);
      deep.addColorStop(0, '#0a0a24');
      deep.addColorStop(0.55, '#06061a');
      deep.addColorStop(1, '#02020a');
      ctx.fillStyle = deep;
      ctx.fillRect(0, 0, px, px);

      // Nebulae.
      nebulaBloom(ctx, px * 0.22, px * 0.34, px * 0.46,
        'rgba(126,72,220,0.30)', 'rgba(80,40,160,0.12)');
      nebulaBloom(ctx, px * 0.74, px * 0.72, px * 0.48,
        'rgba(32,150,190,0.24)', 'rgba(20,90,140,0.10)');
      nebulaBloom(ctx, px * 0.52, px * 0.14, px * 0.30,
        'rgba(210,70,150,0.18)', 'rgba(120,40,110,0.07)');

      // A dust lane through the middle of the field.
      ctx.save();
      ctx.translate(px * 0.5, px * 0.5);
      ctx.rotate(-0.5);
      var lane = ctx.createLinearGradient(0, -px * 0.20, 0, px * 0.20);
      lane.addColorStop(0, 'rgba(4,3,16,0)');
      lane.addColorStop(0.5, 'rgba(4,3,16,0.55)');
      lane.addColorStop(1, 'rgba(4,3,16,0)');
      ctx.fillStyle = lane;
      ctx.fillRect(-px, -px * 0.20, px * 2, px * 0.40);
      ctx.restore();

      starfield(ctx, px, rnd, Math.round(cells * 11));

      // The showpiece: a ringed gas giant.
      drawPlanet(ctx, px * 0.755, px * 0.235, px * 0.135,
        { hue: 28, ring: true, spot: true, tilt: -0.38 });

      // A cratered moon and a small ice world.
      drawMoon(ctx, px * 0.165, px * 0.155, px * 0.052);
      drawPlanet(ctx, px * 0.135, px * 0.795, px * 0.085,
        { hue: 195, bands: [[-0.42, 0.14, 12, 0.26], [0.10, 0.20, -10, 0.20], [0.55, 0.12, 16, 0.22]] });

      drawComet(ctx, px * 0.60, px * 0.44, px * 0.30, -2.5);
      drawSatellite(ctx, px * 0.86, px * 0.60, px * 0.075, 0.4);
      drawRocket(ctx, px * 0.40, px * 0.62, px * 0.23, -0.55);

      [[0.30, 0.90, 0.030], [0.52, 0.86, 0.020], [0.66, 0.95, 0.024], [0.92, 0.42, 0.018]]
        .forEach(function (a) { drawAsteroid(ctx, px * a[0], px * a[1], px * a[2], rnd); });

      gridLines(ctx, px, cells, 'rgba(124,196,255,0.045)', 1);
      vignette(ctx, px, 0.45);
    },

    // A glowing energy cell: core, containment ring, spark.
    drawFood: function (ctx, x, y, cell, pulse) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var r = cell * (0.26 + pulse * 0.04);
      var col = NS.hsl(this.foodHue, 95, 58);

      withGlow(ctx, col, cell * (1.3 + pulse * 0.6), function () {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = NS.hsl(this.foodHue, 90, 72, 0.9);
      ctx.lineWidth = Math.max(1, cell * 0.05);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.65, r * 0.55, 0.5 + pulse * 0.3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  /* ---- wild west props ----
     Drawn in profile rather than plan view: a saguaro seen from directly above
     is an unreadable blob, and the whole point of these is that you can tell
     what they are. Each is a dark silhouette with a warm rim light picking out
     its edge against the dusk. */

  var WEST_DARK = 'rgba(26,14,7,0.95)';
  var WEST_RIM = 'rgba(255,150,66,0.55)';

  function rimStroke(ctx, w) {
    ctx.strokeStyle = WEST_RIM;
    ctx.lineWidth = Math.max(1, w);
    ctx.stroke();
  }

  // Saguaro: ribbed trunk, one or two raised arms, spines, and a crown flower.
  function drawSaguaro(ctx, x, groundY, h, rnd) {
    var w = h * 0.20;
    var green = 'rgba(38,84,50,0.95)';

    function limb(cx, top, width, capR) {
      ctx.beginPath();
      ctx.moveTo(cx - width / 2, groundY);
      ctx.lineTo(cx - width / 2, top + capR);
      ctx.quadraticCurveTo(cx - width / 2, top, cx, top);
      ctx.quadraticCurveTo(cx + width / 2, top, cx + width / 2, top + capR);
      ctx.lineTo(cx + width / 2, groundY);
      ctx.closePath();
    }

    // Trunk.
    ctx.fillStyle = green;
    limb(x, groundY - h, w, w * 0.5);
    ctx.fill();
    rimStroke(ctx, h * 0.014);

    // Arms: out from the trunk, elbow, then up. A round-capped, round-joined
    // polyline gives the limb its thickness and its bend in one stroke.
    var arms = rnd() > 0.35 ? 2 : 1;
    for (var a = 0; a < arms; a++) {
      var side = a === 0 ? -1 : 1;
      var elbowY = groundY - h * (0.44 + rnd() * 0.16);
      var ex = x + side * w * (1.15 + rnd() * 0.45);
      var armTop = elbowY - h * (0.26 + rnd() * 0.16);
      var aw = w * 0.66;

      [[WEST_RIM, aw + h * 0.024], [green, aw]].forEach(function (pass) {
        ctx.strokeStyle = pass[0];
        ctx.lineWidth = pass[1];
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x + side * w * 0.28, elbowY);
        ctx.lineTo(ex, elbowY);
        ctx.lineTo(ex, armTop);
        ctx.stroke();
      });

      // Spines up the raised limb.
      ctx.strokeStyle = 'rgba(230,240,190,0.4)';
      ctx.lineWidth = Math.max(0.6, h * 0.006);
      for (var q = 0; q < 4; q++) {
        var qy = armTop + (elbowY - armTop) * (0.2 + q * 0.24);
        ctx.beginPath();
        ctx.moveTo(ex - aw / 2, qy); ctx.lineTo(ex - aw * 0.78, qy - h * 0.015);
        ctx.moveTo(ex + aw / 2, qy); ctx.lineTo(ex + aw * 0.78, qy - h * 0.015);
        ctx.stroke();
      }
    }

    // Ribs and spines.
    ctx.strokeStyle = 'rgba(12,32,18,0.7)';
    ctx.lineWidth = Math.max(1, h * 0.008);
    for (var r = -1; r <= 1; r++) {
      ctx.beginPath();
      ctx.moveTo(x + r * w * 0.26, groundY - h * 0.92);
      ctx.lineTo(x + r * w * 0.26, groundY - h * 0.05);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(230,240,190,0.45)';
    ctx.lineWidth = Math.max(0.6, h * 0.006);
    for (var s = 0; s < 7; s++) {
      var sy = groundY - h * (0.15 + s * 0.11);
      ctx.beginPath();
      ctx.moveTo(x - w / 2, sy); ctx.lineTo(x - w * 0.72, sy - h * 0.02);
      ctx.moveTo(x + w / 2, sy); ctx.lineTo(x + w * 0.72, sy - h * 0.02);
      ctx.stroke();
    }

    // Crown flower.
    if (rnd() > 0.45) {
      withGlow(ctx, 'rgba(255,120,160,0.8)', h * 0.08, function () {
        ctx.fillStyle = 'rgba(255,160,190,0.95)';
        ctx.beginPath();
        ctx.arc(x, groundY - h - w * 0.12, w * 0.22, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  // Prickly pear: stacked pads.
  function drawPricklyPear(ctx, x, groundY, h) {
    var green = 'rgba(44,92,54,0.95)';
    var pads = [[0, 0.30, 0.42, 0.34], [-0.30, 0.62, 0.34, 0.28], [0.30, 0.66, 0.30, 0.26]];
    pads.forEach(function (p) {
      ctx.beginPath();
      ctx.ellipse(x + p[0] * h, groundY - p[1] * h, p[2] * h * 0.5, p[3] * h, 0, 0, Math.PI * 2);
      ctx.fillStyle = green;
      ctx.fill();
      rimStroke(ctx, h * 0.02);
    });
  }

  // Horse in profile, facing `dir`, standing at the hitching rail.
  function drawHorse(ctx, x, groundY, h, dir) {
    var L = h * 1.30;
    ctx.save();
    ctx.translate(x, groundY);
    ctx.scale(dir, 1);
    ctx.fillStyle = WEST_DARK;

    // Barrel of the body.
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.58, L * 0.36, h * 0.23, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck and head.
    ctx.beginPath();
    ctx.moveTo(L * 0.20, -h * 0.68);
    ctx.lineTo(L * 0.40, -h * 1.02);
    ctx.lineTo(L * 0.52, -h * 1.06);
    ctx.lineTo(L * 0.60, -h * 0.98);      // muzzle
    ctx.lineTo(L * 0.50, -h * 0.88);
    ctx.lineTo(L * 0.34, -h * 0.62);
    ctx.closePath();
    ctx.fill();

    // Ear.
    ctx.beginPath();
    ctx.moveTo(L * 0.42, -h * 1.04);
    ctx.lineTo(L * 0.44, -h * 1.16);
    ctx.lineTo(L * 0.49, -h * 1.05);
    ctx.closePath();
    ctx.fill();

    // Legs.
    var legW = h * 0.075;
    [[-0.26, 0], [-0.17, 0.03], [0.20, 0], [0.29, 0.03]].forEach(function (p) {
      ctx.fillRect(L * p[0] - legW / 2, -h * (0.62 - p[1]), legW, h * (0.62 - p[1]));
    });

    // Tail.
    ctx.beginPath();
    ctx.moveTo(-L * 0.34, -h * 0.72);
    ctx.quadraticCurveTo(-L * 0.50, -h * 0.55, -L * 0.44, -h * 0.16);
    ctx.lineTo(-L * 0.36, -h * 0.20);
    ctx.quadraticCurveTo(-L * 0.40, -h * 0.52, -L * 0.28, -h * 0.68);
    ctx.closePath();
    ctx.fill();

    // Mane along the neck, and the rim light that makes it read.
    ctx.beginPath();
    ctx.moveTo(L * 0.22, -h * 0.70);
    ctx.quadraticCurveTo(L * 0.34, -h * 1.02, L * 0.46, -h * 1.10);
    ctx.lineTo(L * 0.40, -h * 1.10);
    ctx.quadraticCurveTo(L * 0.28, -h * 0.98, L * 0.16, -h * 0.72);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = WEST_RIM;
    ctx.lineWidth = Math.max(1, h * 0.022);
    ctx.beginPath();
    ctx.moveTo(-L * 0.34, -h * 0.74);
    ctx.quadraticCurveTo(-L * 0.05, -h * 0.86, L * 0.22, -h * 0.70);
    ctx.lineTo(L * 0.40, -h * 1.03);
    ctx.lineTo(L * 0.52, -h * 1.06);
    ctx.stroke();
    ctx.restore();
  }

  // Single-action revolver, lying flat.
  function drawRevolver(ctx, x, y, len, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    var h = len * 0.30;

    ctx.fillStyle = 'rgba(38,34,38,0.95)';
    ctx.beginPath();                                   // barrel
    ctx.rect(-len * 0.10, -h * 0.34, len * 0.52, h * 0.30);
    ctx.fill();
    rimStroke(ctx, len * 0.018);

    ctx.beginPath();                                   // cylinder
    ctx.roundRect
      ? ctx.roundRect(-len * 0.20, -h * 0.42, len * 0.20, h * 0.46, len * 0.03)
      : ctx.rect(-len * 0.20, -h * 0.42, len * 0.20, h * 0.46);
    ctx.fillStyle = 'rgba(52,46,50,0.95)';
    ctx.fill();
    rimStroke(ctx, len * 0.018);

    ctx.fillStyle = 'rgba(38,34,38,0.95)';             // frame + hammer
    ctx.beginPath();
    ctx.rect(-len * 0.34, -h * 0.40, len * 0.16, h * 0.34);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-len * 0.34, -h * 0.40);
    ctx.lineTo(-len * 0.30, -h * 0.62);
    ctx.lineTo(-len * 0.24, -h * 0.40);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(96,54,26,0.95)';             // grip
    ctx.beginPath();
    ctx.moveTo(-len * 0.34, -h * 0.08);
    ctx.quadraticCurveTo(-len * 0.44, h * 0.42, -len * 0.30, h * 0.56);
    ctx.lineTo(-len * 0.18, h * 0.42);
    ctx.quadraticCurveTo(-len * 0.20, h * 0.06, -len * 0.18, -h * 0.06);
    ctx.closePath();
    ctx.fill();
    rimStroke(ctx, len * 0.018);

    ctx.strokeStyle = 'rgba(38,34,38,0.95)';           // trigger guard
    ctx.lineWidth = Math.max(1, len * 0.03);
    ctx.beginPath();
    ctx.arc(-len * 0.14, h * 0.10, len * 0.09, Math.PI * 0.05, Math.PI * 0.95);
    ctx.stroke();
    ctx.restore();
  }

  function drawWagonWheel(ctx, x, groundY, r) {
    ctx.save();
    ctx.translate(x, groundY - r);
    ctx.strokeStyle = 'rgba(120,74,34,0.95)';
    ctx.lineWidth = Math.max(1, r * 0.16);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = Math.max(1, r * 0.09);
    for (var i = 0; i < 8; i++) {
      var a = (Math.PI / 4) * i;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.16, Math.sin(a) * r * 0.16);
      ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(120,74,34,0.95)';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = WEST_RIM;
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.restore();
  }

  function drawBarrel(ctx, x, groundY, h) {
    var w = h * 0.66;
    ctx.fillStyle = 'rgba(104,62,28,0.95)';
    ctx.beginPath();
    ctx.moveTo(x - w / 2, groundY);
    ctx.quadraticCurveTo(x - w * 0.62, groundY - h / 2, x - w / 2, groundY - h);
    ctx.lineTo(x + w / 2, groundY - h);
    ctx.quadraticCurveTo(x + w * 0.62, groundY - h / 2, x + w / 2, groundY);
    ctx.closePath();
    ctx.fill();
    rimStroke(ctx, h * 0.045);
    ctx.strokeStyle = 'rgba(60,34,14,0.9)';
    ctx.lineWidth = Math.max(1, h * 0.05);
    [0.3, 0.68].forEach(function (f) {
      ctx.beginPath();
      ctx.moveTo(x - w * 0.55, groundY - h * f);
      ctx.lineTo(x + w * 0.55, groundY - h * f);
      ctx.stroke();
    });
  }

  function drawTumbleweed(ctx, x, y, r, rnd) {
    ctx.strokeStyle = 'rgba(168,124,62,0.75)';
    ctx.lineWidth = Math.max(1, r * 0.1);
    for (var i = 0; i < 11; i++) {
      var a = rnd() * Math.PI * 2;
      var a2 = a + Math.PI * (0.55 + rnd() * 0.6);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9);
      ctx.quadraticCurveTo(x + (rnd() - 0.5) * r * 0.6, y + (rnd() - 0.5) * r * 0.6,
        x + Math.cos(a2) * r, y + Math.sin(a2) * r * 0.9);
      ctx.stroke();
    }
  }

  /* ---- frontier storefronts ---- */

  function planks(ctx, x, y, w, h, base, line, vertical, step) {
    ctx.fillStyle = base;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = line;
    ctx.lineWidth = Math.max(1, step * 0.09);
    ctx.beginPath();
    if (vertical) {
      for (var i = step; i < w; i += step) { ctx.moveTo(x + i, y); ctx.lineTo(x + i, y + h); }
    } else {
      for (var j = step; j < h; j += step) { ctx.moveTo(x, y + j); ctx.lineTo(x + w, y + j); }
    }
    ctx.stroke();
  }

  // A lit pane: warm spill, glass, muntins, sill.
  function litWindow(ctx, x, y, w, h, cols, rows) {
    var spill = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w * 1.5);
    spill.addColorStop(0, 'rgba(255,186,96,0.30)');
    spill.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = spill;
    ctx.fillRect(x - w * 0.8, y - h * 0.5, w * 2.6, h * 2.2);

    ctx.fillStyle = 'rgba(255,196,110,0.92)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(40,22,10,0.9)';
    ctx.lineWidth = Math.max(1, w * 0.055);
    ctx.beginPath();
    for (var c = 1; c < cols; c++) { ctx.moveTo(x + (w / cols) * c, y); ctx.lineTo(x + (w / cols) * c, y + h); }
    for (var r = 1; r < rows; r++) { ctx.moveTo(x, y + (h / rows) * r); ctx.lineTo(x + w, y + (h / rows) * r); }
    ctx.stroke();
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = 'rgba(74,44,22,0.95)';               // sill
    ctx.fillRect(x - w * 0.08, y + h, w * 1.16, h * 0.09);
  }

  function signBoard(ctx, cx, y, w, h, text) {
    ctx.fillStyle = 'rgba(24,14,7,0.96)';
    ctx.fillRect(cx - w / 2, y, w, h);
    ctx.strokeStyle = 'rgba(196,146,74,0.8)';
    ctx.lineWidth = Math.max(1, h * 0.09);
    ctx.strokeRect(cx - w / 2, y, w, h);

    ctx.save();
    ctx.fillStyle = 'rgba(240,214,164,0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var size = Math.min(h * 0.58, (w * 1.55) / Math.max(4, text.length));
    ctx.font = 'bold ' + size + 'px Georgia, "Times New Roman", serif';
    ctx.fillText(text, cx, y + h * 0.54);
    ctx.restore();
  }

  function lantern(ctx, x, y, r) {
    withGlow(ctx, 'rgba(255,180,80,0.95)', r * 5, function () {
      ctx.fillStyle = 'rgba(255,214,150,0.95)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = 'rgba(50,30,14,0.9)';
    ctx.lineWidth = Math.max(1, r * 0.35);
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x, y - r);
    ctx.stroke();
  }

  // One storefront: wall, false front with cornice, sign, windows, door and a
  // covered porch with posts, railing and steps.
  function westBuilding(ctx, x, groundY, w, h, opt) {
    var falseH = h * (opt.falseFront || 0.30);
    var top = groundY - h;
    var step = w * 0.055;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';                  // cast shadow
    ctx.fillRect(x + w * 0.04, groundY - h * 0.03, w, h * 0.05);

    planks(ctx, x, top, w, h, opt.wall || '#4a2c17', 'rgba(30,16,7,0.55)', true, step);

    // False front and cornice.
    planks(ctx, x - w * 0.02, top - falseH, w * 1.04, falseH, opt.wall || '#4a2c17',
      'rgba(30,16,7,0.5)', true, step);
    ctx.fillStyle = 'rgba(32,18,8,0.95)';
    ctx.fillRect(x - w * 0.05, top - falseH - h * 0.045, w * 1.10, h * 0.05);
    ctx.fillRect(x - w * 0.04, top - falseH * 0.34, w * 1.08, h * 0.028);
    ctx.fillStyle = 'rgba(255,168,86,0.30)';             // rim light on the cornice
    ctx.fillRect(x - w * 0.05, top - falseH - h * 0.045, w * 1.10, h * 0.010);

    // Dentils under the cornice.
    ctx.fillStyle = 'rgba(26,14,6,0.8)';
    for (var d = 0; d < 9; d++) {
      ctx.fillRect(x + w * (0.03 + d * 0.108), top - falseH + h * 0.01, w * 0.045, h * 0.02);
    }

    signBoard(ctx, x + w / 2, top - falseH * 0.82, w * 0.82, falseH * 0.42, opt.label);

    // Upper-storey windows on the false front.
    if (opt.upperWindows !== false) {
      var uw = w * 0.16, uh = falseH * 0.26;
      litWindow(ctx, x + w * 0.18 - uw / 2, top - falseH * 0.30, uw, uh, 2, 2);
      litWindow(ctx, x + w * 0.82 - uw / 2, top - falseH * 0.30, uw, uh, 2, 2);
    }

    // Porch roof and posts.
    var porchY = top + h * 0.30;
    var overhang = w * 0.07;
    ctx.fillStyle = 'rgba(38,21,10,0.97)';
    ctx.fillRect(x - overhang, porchY, w + overhang * 2, h * 0.055);
    ctx.fillStyle = 'rgba(255,168,86,0.22)';
    ctx.fillRect(x - overhang, porchY, w + overhang * 2, h * 0.012);
    ctx.fillStyle = 'rgba(0,0,0,0.30)';                  // shade it throws
    ctx.fillRect(x - overhang, porchY + h * 0.055, w + overhang * 2, h * 0.10);

    ctx.fillStyle = 'rgba(52,30,14,0.97)';
    [x - overhang * 0.4, x + w * 0.5, x + w + overhang * 0.4 - w * 0.03].forEach(function (postX) {
      ctx.fillRect(postX, porchY, w * 0.032, groundY - porchY);
    });
    ctx.fillStyle = 'rgba(52,30,14,0.9)';                // railing
    ctx.fillRect(x - overhang * 0.4, groundY - h * 0.16, w + overhang * 0.8, h * 0.018);

    // Ground-floor window and door.
    var winW = w * 0.26, winH = h * 0.20;
    litWindow(ctx, x + w * 0.10, porchY + h * 0.14, winW, winH, 3, 2);

    var doorW = w * 0.22, doorH = h * 0.34;
    var doorX = x + w * 0.62, doorY = groundY - doorH;
    ctx.fillStyle = 'rgba(20,11,5,0.95)';
    ctx.fillRect(doorX, doorY, doorW, doorH);

    if (opt.batwing) {
      ctx.fillStyle = 'rgba(255,186,96,0.55)';           // light spilling out
      ctx.fillRect(doorX, doorY, doorW, doorH);
      ctx.fillStyle = 'rgba(58,34,16,0.97)';
      ctx.fillRect(doorX, doorY + doorH * 0.18, doorW * 0.46, doorH * 0.52);
      ctx.fillRect(doorX + doorW * 0.54, doorY + doorH * 0.18, doorW * 0.46, doorH * 0.52);
      ctx.strokeStyle = 'rgba(28,16,7,0.9)';
      ctx.lineWidth = Math.max(1, doorH * 0.03);
      for (var s = 1; s < 4; s++) {
        var sy = doorY + doorH * (0.18 + s * 0.13);
        ctx.beginPath();
        ctx.moveTo(doorX, sy); ctx.lineTo(doorX + doorW * 0.46, sy);
        ctx.moveTo(doorX + doorW * 0.54, sy); ctx.lineTo(doorX + doorW, sy);
        ctx.stroke();
      }
    } else {
      planks(ctx, doorX, doorY, doorW, doorH, 'rgba(58,34,16,0.97)', 'rgba(24,13,6,0.8)',
        true, doorW * 0.25);
      ctx.fillStyle = 'rgba(214,176,96,0.9)';            // knob
      ctx.beginPath();
      ctx.arc(doorX + doorW * 0.82, doorY + doorH * 0.55, doorW * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(80,48,22,0.95)';             // door frame
    ctx.lineWidth = Math.max(1, w * 0.014);
    ctx.strokeRect(doorX, doorY, doorW, doorH);

    if (opt.barredWindow) {
      ctx.strokeStyle = 'rgba(30,30,34,0.95)';
      ctx.lineWidth = Math.max(1, w * 0.018);
      ctx.beginPath();
      for (var b = 0; b < 4; b++) {
        var bx = x + w * 0.10 + winW * (0.2 + b * 0.2);
        ctx.moveTo(bx, porchY + h * 0.14); ctx.lineTo(bx, porchY + h * 0.14 + winH);
      }
      ctx.stroke();
    }

    lantern(ctx, x + w * 0.52, porchY + h * 0.10, w * 0.022);
  }

  function drawWaterTower(ctx, x, groundY, h) {
    var r = h * 0.30;
    var tankY = groundY - h;
    ctx.strokeStyle = 'rgba(46,26,12,0.95)';
    ctx.lineWidth = Math.max(1, h * 0.035);
    [[-r * 0.8, -r * 0.25], [r * 0.8, r * 0.25]].forEach(function (o) {
      ctx.beginPath();
      ctx.moveTo(x + o[0], groundY);
      ctx.lineTo(x + o[1], tankY + r * 1.6);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, groundY - h * 0.28);
    ctx.lineTo(x + r * 0.55, groundY - h * 0.28);
    ctx.stroke();

    planks(ctx, x - r, tankY + r * 0.35, r * 2, r * 1.3, 'rgba(66,38,18,0.97)',
      'rgba(28,15,7,0.6)', false, r * 0.26);
    ctx.fillStyle = 'rgba(34,19,9,0.97)';                // conical roof
    ctx.beginPath();
    ctx.moveTo(x - r * 1.12, tankY + r * 0.35);
    ctx.lineTo(x, tankY - r * 0.30);
    ctx.lineTo(x + r * 1.12, tankY + r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,168,86,0.35)';
    ctx.lineWidth = Math.max(1, h * 0.014);
    ctx.beginPath();
    ctx.moveTo(x - r * 1.12, tankY + r * 0.35);
    ctx.lineTo(x, tankY - r * 0.30);
    ctx.stroke();
  }

  function drawHitchingRail(ctx, x0, x1, groundY, h) {
    ctx.strokeStyle = 'rgba(96,58,26,0.95)';
    ctx.lineWidth = Math.max(1, h * 0.14);
    ctx.beginPath();
    ctx.moveTo(x0, groundY - h); ctx.lineTo(x1, groundY - h);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, h * 0.17);
    [x0, (x0 + x1) / 2, x1].forEach(function (px2) {
      ctx.beginPath();
      ctx.moveTo(px2, groundY - h * 1.12); ctx.lineTo(px2, groundY);
      ctx.stroke();
    });
    ctx.strokeStyle = WEST_RIM;
    ctx.lineWidth = Math.max(1, h * 0.06);
    ctx.beginPath();
    ctx.moveTo(x0, groundY - h * 1.06); ctx.lineTo(x1, groundY - h * 1.06);
    ctx.stroke();
  }

  /* ---------------- 8. Western ---------------- */

  var western = {
    key: 'WESTERN', name: 'Western',
    ground: '#1a0e06', accent: '#ff8a3d',
    accentSoft: 'rgba(255,138,61,0.35)', accentDim: 'rgba(255,138,61,0.12)',
    foodHue: 200,          // cold: the badge is silver, and the map is all warm

    // Dusk over a frontier street. Props are drawn in profile so a cactus reads
    // as a cactus; a plan view of one is just a blob.
    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 9173 + 131);
      var horizon = px * 0.30;

      /* ---- sky ---- */
      var sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, '#2b1236');
      sky.addColorStop(0.45, '#6b2418');
      sky.addColorStop(1, '#b85216');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, px, horizon);

      var sunX = px * 0.68, sunR = px * 0.085;
      var halo = ctx.createRadialGradient(sunX, horizon, 0, sunX, horizon, px * 0.42);
      halo.addColorStop(0, 'rgba(255,186,84,0.55)');
      halo.addColorStop(0.35, 'rgba(255,120,40,0.20)');
      halo.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, px, horizon * 1.9);

      ctx.fillStyle = 'rgba(255,206,120,0.92)';
      ctx.beginPath();
      ctx.arc(sunX, horizon, sunR, Math.PI, Math.PI * 2);
      ctx.fill();

      // Mesas on the skyline.
      // Wide and low - a mesa is a table, not a chimney.
      [[-0.02, 0.055, 0.34], [0.30, 0.040, 0.28], [0.64, 0.062, 0.40]].forEach(function (m) {
        var mx = px * m[0], mw = px * m[2], mh = horizon * m[1] * 4.2;
        ctx.fillStyle = 'rgba(46,22,12,0.95)';
        ctx.beginPath();
        ctx.moveTo(mx, horizon);
        ctx.lineTo(mx + mw * 0.14, horizon - mh);
        ctx.lineTo(mx + mw * 0.86, horizon - mh);
        ctx.lineTo(mx + mw, horizon);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,150,66,0.35)';
        ctx.lineWidth = Math.max(1, px * 0.002);
        ctx.beginPath();
        ctx.moveTo(mx + mw * 0.14, horizon - mh);
        ctx.lineTo(mx + mw * 0.86, horizon - mh);
        ctx.stroke();
      });

      // A couple of birds.
      ctx.strokeStyle = 'rgba(40,20,10,0.75)';
      ctx.lineWidth = Math.max(1, px * 0.0022);
      [[0.36, 0.09, 0.016], [0.43, 0.13, 0.012], [0.30, 0.15, 0.010]].forEach(function (b) {
        var bx = px * b[0], by = px * b[1], s = px * b[2];
        ctx.beginPath();
        ctx.moveTo(bx - s, by);
        ctx.quadraticCurveTo(bx - s * 0.5, by - s * 0.6, bx, by);
        ctx.quadraticCurveTo(bx + s * 0.5, by - s * 0.6, bx + s, by);
        ctx.stroke();
      });

      /* ---- ground ---- */
      ctx.fillStyle = '#3a2010';
      ctx.fillRect(0, horizon, px, px - horizon);
      var gr2 = ctx.createLinearGradient(0, horizon, 0, px);
      gr2.addColorStop(0, 'rgba(146,84,34,0.45)');
      gr2.addColorStop(0.35, 'rgba(58,32,16,0.18)');
      gr2.addColorStop(1, 'rgba(14,8,4,0.85)');
      ctx.fillStyle = gr2;
      ctx.fillRect(0, horizon, px, px - horizon);

      /* ---- the town along the street ---- */
      var townBase = px * 0.545;
      drawWaterTower(ctx, px * 0.945, townBase - px * 0.02, px * 0.26);

      westBuilding(ctx, px * 0.015, townBase, px * 0.235, px * 0.20,
        { label: 'BANK', wall: '#4d3520', falseFront: 0.34 });
      westBuilding(ctx, px * 0.275, townBase, px * 0.295, px * 0.225,
        { label: 'SALOON', wall: '#5a3318', falseFront: 0.36, batwing: true });
      westBuilding(ctx, px * 0.595, townBase, px * 0.20, px * 0.19,
        { label: 'SHERIFF', wall: '#462914', falseFront: 0.30, barredWindow: true });
      westBuilding(ctx, px * 0.815, townBase, px * 0.17, px * 0.205,
        { label: 'HOTEL', wall: '#513018', falseFront: 0.32 });

      // Boardwalk running along the shopfronts.
      planks(ctx, 0, townBase, px, px * 0.032, 'rgba(62,37,17,0.97)',
        'rgba(26,14,6,0.7)', false, px * 0.011);
      ctx.fillStyle = 'rgba(255,168,86,0.18)';
      ctx.fillRect(0, townBase, px, px * 0.006);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, townBase + px * 0.032, px, px * 0.02);

      // Wagon ruts down the street - faint, they are tracks not trenches.
      ctx.strokeStyle = 'rgba(24,13,6,0.28)';
      ctx.lineWidth = px * 0.006;
      [0.36, 0.50].forEach(function (f) {
        ctx.beginPath();
        ctx.moveTo(px * f, townBase + px * 0.06);
        ctx.bezierCurveTo(px * (f - 0.03), px * 0.72, px * (f + 0.05), px * 0.86, px * (f + 0.01), px);
        ctx.stroke();
      });

      // Dust, stones and scrub - only on the street, never over the shopfronts.
      var streetTop = townBase + px * 0.055;
      for (var s2 = 0; s2 < cells * 14; s2++) {
        var sx = rnd() * px, sy = streetTop + rnd() * (px - streetTop);
        ctx.fillStyle = 'rgba(255,190,120,' + (0.03 + rnd() * 0.08) + ')';
        ctx.fillRect(sx, sy, px * 0.0035, px * 0.0035);
      }
      for (var t = 0; t < 12; t++) {
        var tx = rnd() * px, ty = streetTop + rnd() * (px - streetTop);
        ctx.strokeStyle = 'rgba(120,86,40,0.5)';
        ctx.lineWidth = Math.max(1, px * 0.0016);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + (rnd() - 0.5) * px * 0.02, ty - px * 0.012);
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + (rnd() - 0.5) * px * 0.02, ty - px * 0.010);
        ctx.stroke();
      }

      // Hoof prints leading away from the rail.
      ctx.fillStyle = 'rgba(18,10,5,0.45)';
      for (var p = 0; p < 8; p++) {
        var hx = px * (0.20 + p * 0.030) + (p % 2) * px * 0.013;
        var hy = px * (0.99 - p * 0.040);
        var hr = px * 0.008;
        ctx.beginPath();
        ctx.ellipse(hx, hy, hr, hr * 1.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      /* ---- the street ---- */
      drawHitchingRail(ctx, px * 0.30, px * 0.62, px * 0.665, px * 0.05);
      drawHorse(ctx, px * 0.375, px * 0.665, px * 0.135, 1);
      drawHorse(ctx, px * 0.565, px * 0.665, px * 0.125, -1);

      drawSaguaro(ctx, px * 0.055, px * 0.90, px * 0.21, rnd);
      drawSaguaro(ctx, px * 0.945, px * 0.97, px * 0.24, rnd);
      drawPricklyPear(ctx, px * 0.80, px * 0.99, px * 0.075);

      drawWagonWheel(ctx, px * 0.185, px * 0.795, px * 0.05);
      drawBarrel(ctx, px * 0.715, px * 0.755, px * 0.058);
      drawBarrel(ctx, px * 0.775, px * 0.775, px * 0.046);

      drawRevolver(ctx, px * 0.44, px * 0.865, px * 0.14, -0.20);
      drawRevolver(ctx, px * 0.635, px * 0.945, px * 0.12, 2.9);

      drawTumbleweed(ctx, px * 0.305, px * 0.945, px * 0.033, rnd);

      gridLines(ctx, px, cells, 'rgba(255,170,100,0.035)', 1);
      vignette(ctx, px, 0.5);
    },

    // A marshal's star in cold silver. Gold was the obvious choice and the wrong
    // one: this map is all warm orange and brown, so a gold star sank into it.
    // Cold metal, a dark backing and a wide cool glow keep it off the ground.
    drawFood: function (ctx, x, y, cell, pulse) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var r = cell * (0.42 + pulse * 0.05);

      // Dark backing, so the star never merges with whatever is under it.
      ctx.fillStyle = 'rgba(14,8,3,0.62)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
      ctx.fill();

      withGlow(ctx, 'rgba(150,225,255,0.95)', cell * (1.5 + pulse * 0.7), function () {
        var metal = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        metal.addColorStop(0, '#ffffff');
        metal.addColorStop(0.45, '#cfeaff');
        metal.addColorStop(1, '#8fc6e8');
        ctx.fillStyle = metal;
        starPath(ctx, cx, cy, 5, r, r * 0.46);
        ctx.fill();
      });

      ctx.strokeStyle = 'rgba(18,26,36,0.75)';
      ctx.lineWidth = Math.max(1, cell * 0.055);
      starPath(ctx, cx, cy, 5, r, r * 0.46);
      ctx.stroke();

      // Balls on the points, as a real badge has.
      ctx.fillStyle = '#eaf6ff';
      for (var i = 0; i < 5; i++) {
        var a = -Math.PI / 2 + (Math.PI * 2 / 5) * i;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(40,60,80,0.55)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      starPath(ctx, cx - r * 0.22, cy - r * 0.26, 4, r * (0.26 + pulse * 0.08), r * 0.05);
      ctx.fill();
    }
  };

  /* ---- confectionery ---- */

  // Classic two-tone swirl. Drawn as a spiral stroke over a white disc, so the
  // white shows through as the second colour of the swirl.
  function lollipopHead(ctx, cx, cy, r, rot, hue) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    ctx.fillStyle = '#fff6fb';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = NS.hsl(hue, 90, 62);
    ctx.lineWidth = r * 0.30;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i <= 90; i++) {
      var t = i / 90;
      var a = t * Math.PI * 5.2;
      var rr = r * 1.06 * t;
      var x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
    }
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'rgba(120,40,90,0.45)';
    ctx.lineWidth = r * 0.10;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.55)';           // gloss
    ctx.beginPath();
    ctx.ellipse(-r * 0.34, -r * 0.38, r * 0.26, r * 0.16, -0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // A stick of its own length, rather than one reaching down to a ground line -
  // there is no floor any more.
  function lollipopStick(ctx, cx, cy, r) {
    var end = cy + r * 2.5;
    ctx.strokeStyle = 'rgba(110,30,80,0.35)';
    ctx.lineWidth = r * 0.26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.7); ctx.lineTo(cx, end);
    ctx.stroke();
    ctx.strokeStyle = '#f7ecf3';
    ctx.lineWidth = r * 0.18;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.7); ctx.lineTo(cx, end);
    ctx.stroke();
  }

  function wrappedSweet(ctx, cx, cy, r, hue, rot) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot || 0);
    var body = NS.hsl(hue, 92, 62);

    ctx.fillStyle = body;                                // wrapper tails
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.9, 0);
      ctx.lineTo(s * r * 2.0, -r * 0.78);
      ctx.lineTo(s * r * 1.72, 0);
      ctx.lineTo(s * r * 2.0, r * 0.78);
      ctx.closePath();
      ctx.fill();
    });

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,25,70,0.4)';
    ctx.lineWidth = r * 0.12;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.75)';          // stripe
    ctx.lineWidth = r * 0.22;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, Math.PI * 0.2, Math.PI * 1.1);
    ctx.stroke();
    ctx.restore();
  }

  // The stripes are dashes along the cane's own path, so they can only ever be
  // on the cane. Clipping to the path does not work here: a clip uses the path's
  // fill region, and a cane is a stroke - so the stripes escaped it entirely.
  function candyCane(ctx, x, bottomY, h) {
    var w = h * 0.17;
    var hookR = h * 0.155;

    function path() {
      ctx.beginPath();
      ctx.moveTo(x, bottomY);
      ctx.lineTo(x, bottomY - h * 0.66);
      ctx.arc(x + hookR, bottomY - h * 0.66, hookR, Math.PI, Math.PI * 2);
    }

    ctx.save();
    ctx.lineCap = 'round';

    path();                                              // rim
    ctx.strokeStyle = 'rgba(110,30,80,0.45)';
    ctx.lineWidth = w * 1.16;
    ctx.stroke();

    path();                                              // sugar
    ctx.strokeStyle = '#fff4f8';
    ctx.lineWidth = w;
    ctx.stroke();

    path();                                              // stripes
    ctx.strokeStyle = '#e8365f';
    ctx.lineWidth = w * 0.96;
    ctx.lineCap = 'butt';
    ctx.setLineDash([h * 0.072, h * 0.078]);
    ctx.lineDashOffset = h * 0.04;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  function gumballMachine(ctx, x, groundY, h, rnd) {
    var r = h * 0.30;
    var globeY = groundY - h * 0.66;

    ctx.fillStyle = '#c8194a';                           // base
    ctx.beginPath();
    ctx.moveTo(x - r * 0.85, groundY);
    ctx.lineTo(x - r * 0.55, groundY - h * 0.30);
    ctx.lineTo(x + r * 0.55, groundY - h * 0.30);
    ctx.lineTo(x + r * 0.85, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x - r * 0.7, groundY - h * 0.24, r * 1.4, h * 0.05);

    ctx.save();                                          // glass globe
    ctx.beginPath();
    ctx.arc(x, globeY, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,240,250,0.18)';
    ctx.fillRect(x - r, globeY - r, r * 2, r * 2);
    var hues = [340, 20, 50, 140, 195, 275];
    for (var i = 0; i < 22; i++) {
      var a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.86;
      ctx.fillStyle = NS.hsl(hues[Math.floor(rnd() * hues.length)], 90, 62);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, globeY + Math.sin(a) * d * 0.98, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    ctx.arc(x, globeY, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = r * 0.10;
    ctx.beginPath();
    ctx.arc(x, globeY, r * 0.78, Math.PI * 1.1, Math.PI * 1.5);
    ctx.stroke();

    ctx.fillStyle = '#8e0f34';                           // dispenser
    ctx.fillRect(x - r * 0.22, groundY - h * 0.34, r * 0.44, h * 0.09);
  }

  function cupcake(ctx, x, groundY, h) {
    var w = h * 0.62;
    ctx.fillStyle = '#d98cc0';                           // case
    ctx.beginPath();
    ctx.moveTo(x - w / 2, groundY - h * 0.42);
    ctx.lineTo(x + w / 2, groundY - h * 0.42);
    ctx.lineTo(x + w * 0.36, groundY);
    ctx.lineTo(x - w * 0.36, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,40,90,0.35)';
    ctx.lineWidth = h * 0.03;
    for (var i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * w * 0.17, groundY - h * 0.42);
      ctx.lineTo(x + i * w * 0.13, groundY);
      ctx.stroke();
    }

    // Frosting: a stacked swirl, tinted rather than white so it does not read
    // as a grey cloud against the pale sugar ground.
    [[0.46, 0.36, '#ffc9e4'], [0.63, 0.28, '#ffd9ec'], [0.78, 0.19, '#ffe9f4']]
      .forEach(function (s, k) {
        ctx.fillStyle = s[2];
        ctx.beginPath();
        ctx.arc(x + (k % 2 ? 1 : -1) * w * 0.11, groundY - h * s[0], w * s[1], 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(190,80,140,0.35)';
        ctx.lineWidth = h * 0.018;
        ctx.stroke();
      });

    ctx.fillStyle = '#e8365f';                           // cherry
    ctx.beginPath();
    ctx.arc(x, groundY - h * 0.94, w * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4f8f3a';
    ctx.lineWidth = h * 0.022;
    ctx.beginPath();
    ctx.moveTo(x, groundY - h * 1.03);
    ctx.quadraticCurveTo(x + w * 0.14, groundY - h * 1.12, x + w * 0.22, groundY - h * 1.02);
    ctx.stroke();
  }

  function doughnut(ctx, cx, cy, r, hue) {
    var hole = r * 0.34;

    // The hole is a reversed subpath, not an erase. Cutting it with
    // destination-out would take the background out with it and leave a black
    // disc, since there is nothing behind the board to show through.
    function ring(outerAt) {
      ctx.beginPath();
      for (var i = 0; i <= 44; i++) {
        var a = (i / 44) * Math.PI * 2;
        var rr = outerAt(a);
        var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
      }
      ctx.closePath();
      ctx.arc(cx, cy, hole, 0, Math.PI * 2, true);       // reversed: leaves a hole
    }

    ctx.fillStyle = '#b8763f';
    ring(function () { return r; });
    ctx.fill();

    ctx.fillStyle = NS.hsl(hue, 85, 72);                 // icing with drips
    ring(function (a) { return r * (0.90 + Math.sin(a * 7) * 0.09); });
    ctx.fill();

    ctx.save();                                          // sprinkles, on the icing only
    ring(function (a) { return r * (0.88 + Math.sin(a * 7) * 0.09); });
    ctx.clip();
    var sh = [340, 50, 140, 200, 280];
    for (var s = 0; s < 14; s++) {
      var sa = (s / 14) * Math.PI * 2 * 1.7, sd = r * (0.52 + (s % 3) * 0.13);
      ctx.save();
      ctx.translate(cx + Math.cos(sa) * sd, cy + Math.sin(sa) * sd);
      ctx.rotate(sa);
      ctx.fillStyle = NS.hsl(sh[s % sh.length], 90, 66);
      ctx.fillRect(-r * 0.10, -r * 0.032, r * 0.20, r * 0.064);
      ctx.restore();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(90,50,20,0.5)';              // inner edge
    ctx.lineWidth = r * 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, hole, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* ---------------- 9. Candy ---------------- */

  var candy = {
    key: 'CANDY', name: 'Candy',
    ground: '#2b0b31', accent: '#ff7ad9',
    accentSoft: 'rgba(255,122,217,0.35)', accentDim: 'rgba(255,122,217,0.12)',
    foodHue: 155,          // mint, the one colour not already on the board

    // Lollipops live in the animated layer so their swirls can turn.
    lollipops: [
      { x: 0.115, y: 0.235, r: 0.082, hue: 340, speed: 0.32 },
      { x: 0.845, y: 0.185, r: 0.066, hue: 20, speed: -0.24 },
      { x: 0.545, y: 0.545, r: 0.056, hue: 275, speed: 0.41 }
    ],

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 6733 + 149);

      // One continuous raspberry-to-plum field. No floor: the board is a place
      // things float in, and a striped ground band only crowded it.
      var sky = ctx.createLinearGradient(0, 0, 0, px);
      sky.addColorStop(0, '#6d1c63');
      sky.addColorStop(0.55, '#45123f');
      sky.addColorStop(1, '#26092c');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, px, px);

      // Candy-floss clouds, kept to the upper half so the lower board stays open.
      for (var c = 0; c < 4; c++) {
        var cx = px * (0.08 + rnd() * 0.86), cy = px * (0.05 + rnd() * 0.34);
        var s = px * (0.05 + rnd() * 0.05);
        for (var p = 0; p < 5; p++) {
          var ox = cx + (p - 2) * s * 0.62 + (rnd() - 0.5) * s * 0.3;
          var oy = cy + (rnd() - 0.5) * s * 0.4;
          var rr = s * (0.62 + rnd() * 0.5);
          var g2 = ctx.createRadialGradient(ox, oy, 0, ox, oy, rr);
          g2.addColorStop(0, 'rgba(255,180,225,0.26)');
          g2.addColorStop(1, 'rgba(255,150,210,0)');
          ctx.fillStyle = g2;
          ctx.fillRect(ox - rr, oy - rr, rr * 2, rr * 2);
        }
      }

      // A ribbon of chocolate across the lower third.
      ctx.strokeStyle = '#5a3418';
      ctx.lineWidth = px * 0.046;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-px * 0.02, px * 0.775);
      ctx.bezierCurveTo(px * 0.32, px * 0.715, px * 0.66, px * 0.855, px * 1.02, px * 0.760);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(190,130,80,0.45)';
      ctx.lineWidth = px * 0.009;
      ctx.beginPath();
      ctx.moveTo(-px * 0.02, px * 0.763);
      ctx.bezierCurveTo(px * 0.32, px * 0.703, px * 0.66, px * 0.843, px * 1.02, px * 0.748);
      ctx.stroke();

      // The confectionery, spread across the whole board rather than lined up
      // along a ground line.
      gumballMachine(ctx, px * 0.225, px * 0.585, px * 0.235, rnd);
      candyCane(ctx, px * 0.735, px * 0.485, px * 0.245);
      candyCane(ctx, px * 0.375, px * 0.965, px * 0.195);
      cupcake(ctx, px * 0.885, px * 0.925, px * 0.185);
      doughnut(ctx, px * 0.115, px * 0.865, px * 0.070, 330);
      doughnut(ctx, px * 0.655, px * 0.945, px * 0.055, 195);

      wrappedSweet(ctx, px * 0.335, px * 0.115, px * 0.030, 50, -0.3);
      wrappedSweet(ctx, px * 0.905, px * 0.475, px * 0.027, 275, 0.5);
      wrappedSweet(ctx, px * 0.075, px * 0.640, px * 0.024, 200, 0.2);

      // Jelly beans and sprinkles, thinned right out.
      var beanHues = [340, 20, 50, 140, 200, 280];
      for (var b = 0; b < 6; b++) {
        var bx = px * (0.10 + rnd() * 0.82), by = px * (0.30 + rnd() * 0.65);
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(rnd() * Math.PI);
        ctx.fillStyle = NS.hsl(beanHues[Math.floor(rnd() * beanHues.length)], 85, 62);
        ctx.beginPath();
        ctx.ellipse(0, 0, px * 0.015, px * 0.010, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.ellipse(-px * 0.004, -px * 0.003, px * 0.005, px * 0.003, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (var s2 = 0; s2 < Math.round(cells * 1.6); s2++) {
        var sx = rnd() * px, sy = rnd() * px;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rnd() * Math.PI);
        ctx.fillStyle = NS.hsl(beanHues[Math.floor(rnd() * beanHues.length)], 95, 70, 0.42);
        ctx.fillRect(-px * 0.007, -px * 0.0022, px * 0.014, px * 0.0044);
        ctx.restore();
      }

      vignette(ctx, px, 0.45);
    },

    drawOverlay: function (ctx, px, cells, time) {
      var t = time / 1000;
      this.lollipops.forEach(function (l) {
        var cx = px * l.x, cy = px * l.y, r = px * l.r;
        lollipopStick(ctx, cx, cy, r);
        lollipopHead(ctx, cx, cy, r, t * l.speed, l.hue);
      });
    },

    // Mint humbug: the one flavour not already lying around on the ground.
    drawFood: function (ctx, x, y, cell, pulse) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var r = cell * (0.28 + pulse * 0.04);
      var col = NS.hsl(this.foodHue, 90, 58);

      // A soft dark pool rather than a hard disc: the board here is busy and
      // pale in places, and the sweet needs separating from it without looking
      // like it is sitting on a coin.
      var pool = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 2.2);
      pool.addColorStop(0, 'rgba(30,6,26,0.62)');
      pool.addColorStop(1, 'rgba(30,6,26,0)');
      ctx.fillStyle = pool;
      ctx.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);

      withGlow(ctx, col, cell * (1.2 + pulse), function () {
        ctx.fillStyle = col;
        [-1, 1].forEach(function (s) {                   // wrapper tails
          ctx.beginPath();
          ctx.moveTo(s * r * 0.9 + cx, cy);
          ctx.lineTo(s * r * 2.0 + cx, cy - r * 0.8);
          ctx.lineTo(s * r * 1.7 + cx, cy);
          ctx.lineTo(s * r * 2.0 + cx, cy + r * 0.8);
          ctx.closePath();
          ctx.fill();
        });
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(1, cell * 0.07);
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.55, Math.PI * 0.15, Math.PI * 1.15);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(cx - r * 0.3, cy - r * 0.32, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  /* ---------------- 10. Golden (final, permanent) ---------------- */

  var golden = {
    key: 'GOLDEN', name: 'Golden',
    // The board is a bright slab of gold. The page chrome stays dark, or the
    // light HUD text would be unreadable against it.
    ground: '#e7bd44', pageBg: '#1a1204',
    // A white grid would disappear on a bright slab; this one is drawn in shadow.
    grid: 'rgba(74,46,4,0.22)',
    accent: '#ffd24a',
    accentSoft: 'rgba(255,210,74,0.45)', accentDim: 'rgba(255,210,74,0.18)',
    foodHue: 195,          // icy: the apple here is a cut diamond

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 1597 + 211);

      // Polished gold, lit from the top left.
      var g = ctx.createLinearGradient(0, 0, px, px);
      g.addColorStop(0, '#fbeaa4');
      g.addColorStop(0.30, '#f0cf62');
      g.addColorStop(0.58, '#d9a92e');
      g.addColorStop(0.80, '#c8951f');
      g.addColorStop(1, '#efd070');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, px, px);

      // Bullion blocks with bevelled edges - the "standing on a gold block" read.
      var BL = 4;
      var bs = px / BL;
      for (var by = 0; by < BL; by++) {
        for (var bx = 0; bx < BL; bx++) {
          var x = bx * bs, y = by * bs;
          var bev = bs * 0.07;

          ctx.fillStyle = 'rgba(255,244,190,' + (0.05 + rnd() * 0.07) + ')';
          ctx.fillRect(x, y, bs, bs);

          // Lit top and left edges.
          ctx.fillStyle = 'rgba(255,250,215,0.5)';
          ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x + bs, y);
          ctx.lineTo(x + bs - bev, y + bev); ctx.lineTo(x + bev, y + bev);
          ctx.closePath(); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x + bev, y + bev);
          ctx.lineTo(x + bev, y + bs - bev); ctx.lineTo(x, y + bs);
          ctx.closePath(); ctx.fill();

          // Shaded bottom and right edges.
          ctx.fillStyle = 'rgba(120,76,6,0.34)';
          ctx.beginPath();
          ctx.moveTo(x + bs, y); ctx.lineTo(x + bs, y + bs);
          ctx.lineTo(x + bs - bev, y + bs - bev); ctx.lineTo(x + bs - bev, y + bev);
          ctx.closePath(); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x, y + bs); ctx.lineTo(x + bev, y + bs - bev);
          ctx.lineTo(x + bs - bev, y + bs - bev); ctx.lineTo(x + bs, y + bs);
          ctx.closePath(); ctx.fill();
        }
      }

      // Brushed-metal streaks.
      ctx.save();
      ctx.globalAlpha = 0.10;
      for (var b = 0; b < 90; b++) {
        var sy2 = rnd() * px;
        ctx.strokeStyle = rnd() > 0.5 ? '#fff6cf' : '#a97c12';
        ctx.lineWidth = px * (0.0008 + rnd() * 0.0018);
        ctx.beginPath();
        ctx.moveTo(rnd() * px * 0.4, sy2);
        ctx.lineTo(rnd() * px * 0.6 + px * 0.4, sy2 + (rnd() - 0.5) * px * 0.02);
        ctx.stroke();
      }
      ctx.restore();

      // Broad specular sweep across the slab.
      ctx.save();
      ctx.translate(px / 2, px / 2);
      ctx.rotate(-Math.PI / 5);
      var sheen = ctx.createLinearGradient(0, -px * 0.5, 0, px * 0.5);
      sheen.addColorStop(0, 'rgba(255,255,255,0)');
      sheen.addColorStop(0.45, 'rgba(255,255,240,0.30)');
      sheen.addColorStop(0.55, 'rgba(255,255,240,0.30)');
      sheen.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(-px, -px * 0.30, px * 2, px * 0.60);
      ctx.restore();

      gridLines(ctx, px, cells, 'rgba(120,80,10,0.10)', 1);

      // The glimmer is not painted here: it is drawn per frame by drawOverlay
      // so it can twinkle, rather than sitting on the board like a photograph.

      // Gentle darkening at the rim so the bright slab still has edges.
      vignette(ctx, px, 0.30);
    },

    // Twinkle positions are fixed for a given board; only their brightness moves.
    twinkles: function (px, cells) {
      var key = px + ':' + cells;
      if (this._twKey === key) { return this._tw; }
      var rnd = NS.seededRandom(cells * 811 + 37);
      var list = [];
      var n = Math.max(9, Math.round(cells * 0.5));
      for (var i = 0; i < n; i++) {
        list.push({
          x: rnd() * px,
          y: rnd() * px,
          r: px * (0.005 + rnd() * 0.012),
          phase: rnd() * Math.PI * 2,
          speed: 0.55 + rnd() * 1.15      // each one on its own clock
        });
      }
      this._twKey = key;
      this._tw = list;
      return list;
    },

    drawOverlay: function (ctx, px, cells, time) {
      var list = this.twinkles(px, cells);
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,235,0.9)';
      ctx.shadowBlur = px * 0.022;
      ctx.fillStyle = 'rgba(255,255,245,0.9)';

      for (var i = 0; i < list.length; i++) {
        var t = list[i];
        var a = 0.5 + 0.5 * Math.sin(time / 1000 * t.speed + t.phase);
        a *= a;                            // squared, so it lingers dark and flashes bright
        if (a < 0.03) { continue; }
        ctx.globalAlpha = a;
        starPath(ctx, t.x, t.y, 4, t.r * (0.7 + a * 0.5), t.r * 0.24);
        ctx.fill();
      }
      ctx.restore();
    },

    // A cut diamond. On a bright slab a glow alone would wash out, so the stone
    // sits in a dark setting.
    drawFood: function (ctx, x, y, cell, pulse) {
      drawBrilliant(ctx, x + cell / 2, y + cell / 2, cell * (0.34 + pulse * 0.04), pulse);
    }
  };

  NS.THEMES = [techy, grassy, blocky, medieval, sky, war, space, western, candy];
  NS.GOLDEN = golden;

  // Past GOLDEN_SCORE the golden map is permanent; before it the nine themes
  // cycle every THEME_EVERY points.
  NS.themeForScore = function (score) {
    if (score >= NS.GOLDEN_SCORE) { return golden; }
    return NS.THEMES[Math.floor(score / NS.THEME_EVERY) % NS.THEMES.length];
  };

  NS.isGolden = function (score) { return score >= NS.GOLDEN_SCORE; };

})(window.NS = window.NS || {});
