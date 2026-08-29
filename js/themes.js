/* The map themes. Purely cosmetic - grid, speed and collision never change.
   Backgrounds are painted once to an offscreen canvas and blitted each frame.

   Nine themes cycle every 10 points. At GOLDEN_SCORE the golden map takes over
   permanently and the snake turns to diamond. */
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
    foodHue: 350,

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 4391 + 61);

      ctx.fillStyle = this.ground;
      ctx.fillRect(0, 0, px, px);

      // Castle masonry: offset courses of stone.
      var rows = Math.max(8, Math.round(cells * 0.7));
      var rowH = px / rows;
      var stoneW = rowH * 2.1;
      ctx.lineWidth = Math.max(1, px * 0.0016);
      for (var r = 0; r < rows; r++) {
        var offset = (r % 2) * stoneW * 0.5;
        for (var x = -stoneW; x < px + stoneW; x += stoneW) {
          var sx = x + offset, sy = r * rowH;
          var tone = 0.03 + rnd() * 0.055;
          ctx.fillStyle = 'rgba(196,204,232,' + tone + ')';
          ctx.fillRect(sx + 1, sy + 1, stoneW - 2, rowH - 2);
          ctx.strokeStyle = 'rgba(150,165,205,0.10)';
          ctx.strokeRect(sx + 1, sy + 1, stoneW - 2, rowH - 2);
        }
      }

      // Wall furniture on a jittered 4x4 grid of slots, so shields, crossed
      // swords, banners and torches spread out instead of clumping.
      var SLOTS = 4;
      var slot = px / SLOTS;
      var order = [];
      for (var i = 0; i < SLOTS * SLOTS; i++) { order.push(i); }
      for (var s = order.length - 1; s > 0; s--) {      // shuffle
        var j = Math.floor(rnd() * (s + 1));
        var tmp = order[s]; order[s] = order[j]; order[j] = tmp;
      }

      var heraldry = [
        ['rgba(150,32,42,0.92)', 'rgba(240,205,120,0.95)'],   // gules & or
        ['rgba(28,58,120,0.92)', 'rgba(226,232,244,0.95)'],   // azure & argent
        ['rgba(32,86,52,0.92)', 'rgba(240,205,120,0.95)'],    // vert & or
        ['rgba(64,36,96,0.92)', 'rgba(240,205,120,0.95)']     // purpure & or
      ];

      var count = Math.min(order.length, 11);
      for (var k = 0; k < count; k++) {
        var idx = order[k];
        var cx = (idx % SLOTS) * slot + slot * (0.28 + rnd() * 0.44);
        var cy = Math.floor(idx / SLOTS) * slot + slot * (0.28 + rnd() * 0.44);
        var pal = heraldry[Math.floor(rnd() * heraldry.length)];
        var kind = k % 4;                    // even spread of the four kinds

        if (kind === 0) {
          var sw = slot * (0.34 + rnd() * 0.10);
          drawShield(ctx, cx, cy, sw, sw * 1.18, pal[0], pal[1], Math.floor(rnd() * 3));
        } else if (kind === 1) {
          var len = slot * (0.62 + rnd() * 0.16);
          drawSword(ctx, cx, cy, len, -0.66);
          drawSword(ctx, cx, cy, len, 0.66);
          // Small shield over the crossing point.
          drawShield(ctx, cx, cy + len * 0.04, len * 0.30, len * 0.35, pal[0], pal[1], 1);
        } else if (kind === 2) {
          var bw = slot * (0.26 + rnd() * 0.08);
          drawBanner(ctx, cx, cy - slot * 0.30, bw, bw * 2.0, pal[0], pal[1]);
        } else {
          // Torch: bracket, flame and the pool of light it throws.
          var flame = ctx.createRadialGradient(cx, cy, 0, cx, cy, px * 0.14);
          flame.addColorStop(0, 'rgba(255,190,90,0.44)');
          flame.addColorStop(0.4, 'rgba(255,120,40,0.17)');
          flame.addColorStop(1, 'rgba(255,90,20,0)');
          ctx.fillStyle = flame;
          ctx.fillRect(cx - px * 0.14, cy - px * 0.14, px * 0.28, px * 0.28);

          ctx.fillStyle = 'rgba(70,48,26,0.9)';
          ctx.fillRect(cx - px * 0.006, cy, px * 0.012, px * 0.045);
          withGlow(ctx, 'rgba(255,170,60,0.95)', px * 0.035, function () {
            ctx.fillStyle = 'rgba(255,225,165,0.97)';
            ctx.beginPath();
            ctx.ellipse(cx, cy - px * 0.006, px * 0.009, px * 0.017, 0, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      vignette(ctx, px, 0.58);
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

  /* ---------------- 6. War Map ---------------- */

  var war = {
    key: 'WAR', name: 'War Map',
    ground: '#0d1208', accent: '#b6ff5a',
    accentSoft: 'rgba(182,255,90,0.35)', accentDim: 'rgba(182,255,90,0.12)',
    foodHue: 355,

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 3719 + 83);

      ctx.fillStyle = this.ground;
      ctx.fillRect(0, 0, px, px);

      // Topographic contours.
      var groups = 3 + Math.floor(rnd() * 3);
      ctx.lineWidth = Math.max(1, px * 0.0018);
      for (var g = 0; g < groups; g++) {
        var ox = px * (0.15 + rnd() * 0.7);
        var oy = px * (0.15 + rnd() * 0.7);
        var rings = 3 + Math.floor(rnd() * 4);
        var wob = 0.12 + rnd() * 0.16;
        var phase = rnd() * Math.PI * 2;
        for (var k = 1; k <= rings; k++) {
          var base = px * 0.03 * k;
          ctx.strokeStyle = 'rgba(182,255,90,' + (0.16 - k * 0.014) + ')';
          ctx.beginPath();
          for (var a = 0; a <= 64; a++) {
            var t = (a / 64) * Math.PI * 2;
            var rr = base * (1 + Math.sin(t * 3 + phase) * wob + Math.sin(t * 5 + phase * 2) * wob * 0.4);
            var xx = ox + Math.cos(t) * rr, yy = oy + Math.sin(t) * rr;
            if (a === 0) { ctx.moveTo(xx, yy); } else { ctx.lineTo(xx, yy); }
          }
          ctx.closePath();
          ctx.stroke();
        }
      }

      gridLines(ctx, px, cells, 'rgba(182,255,90,0.05)', 1);

      // Sector grid and dashed advance routes.
      ctx.strokeStyle = 'rgba(182,255,90,0.13)';
      ctx.lineWidth = Math.max(1, px * 0.0022);
      ctx.beginPath();
      for (var q = 1; q < 4; q++) {
        ctx.moveTo((px / 4) * q, 0); ctx.lineTo((px / 4) * q, px);
        ctx.moveTo(0, (px / 4) * q); ctx.lineTo(px, (px / 4) * q);
      }
      ctx.stroke();

      ctx.setLineDash([px * 0.018, px * 0.014]);
      ctx.strokeStyle = 'rgba(255,190,80,0.30)';
      ctx.lineWidth = Math.max(1, px * 0.003);
      for (var d = 0; d < 3; d++) {
        ctx.beginPath();
        ctx.moveTo(rnd() * px, rnd() * px);
        ctx.quadraticCurveTo(rnd() * px, rnd() * px, rnd() * px, rnd() * px);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Position markers.
      for (var m = 0; m < Math.max(3, Math.round(cells * 0.2)); m++) {
        var mx = px * (0.1 + rnd() * 0.8), my = px * (0.1 + rnd() * 0.8);
        var mr = px * 0.012;
        ctx.strokeStyle = 'rgba(182,255,90,0.5)';
        ctx.lineWidth = Math.max(1, px * 0.002);
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.moveTo(mx - mr * 1.8, my); ctx.lineTo(mx + mr * 1.8, my);
        ctx.moveTo(mx, my - mr * 1.8); ctx.lineTo(mx, my + mr * 1.8);
        ctx.stroke();
      }

      vignette(ctx, px, 0.5);
    },

    // Target reticle.
    drawFood: function (ctx, x, y, cell, pulse) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var r = cell * (0.30 + pulse * 0.05);
      var col = NS.hsl(this.foodHue, 95, 58);
      withGlow(ctx, col, cell * (1.1 + pulse), function () {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1, cell * 0.075);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - r * 1.35, cy); ctx.lineTo(cx - r * 0.6, cy);
        ctx.moveTo(cx + r * 0.6, cy); ctx.lineTo(cx + r * 1.35, cy);
        ctx.moveTo(cx, cy - r * 1.35); ctx.lineTo(cx, cy - r * 0.6);
        ctx.moveTo(cx, cy + r * 0.6); ctx.lineTo(cx, cy + r * 1.35);
        ctx.stroke();
      });
    }
  };

  /* ---------------- 7. Tree Trunks ---------------- */

  var trunks = {
    key: 'TRUNKS', name: 'Tree Trunks',
    ground: '#140d07', accent: '#ffab5e',
    accentSoft: 'rgba(255,171,94,0.35)', accentDim: 'rgba(255,171,94,0.12)',
    foodHue: 175,

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 2657 + 97);

      ctx.fillStyle = this.ground;
      ctx.fillRect(0, 0, px, px);

      // Vertical trunks of varying width.
      var x = 0;
      while (x < px) {
        var w = px * (0.10 + rnd() * 0.11);
        var shade = 0.05 + rnd() * 0.07;
        var g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, 'rgba(120,70,35,' + shade * 0.5 + ')');
        g.addColorStop(0.35, 'rgba(190,120,60,' + shade + ')');
        g.addColorStop(1, 'rgba(90,50,25,' + shade * 0.6 + ')');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, w, px);

        // Bark grain: wavy vertical lines within the trunk.
        var lines = 5 + Math.floor(rnd() * 6);
        for (var i = 0; i < lines; i++) {
          var lx = x + w * (0.08 + rnd() * 0.84);
          var amp = w * (0.03 + rnd() * 0.07);
          var freq = 2 + rnd() * 4;
          var ph = rnd() * Math.PI * 2;
          ctx.strokeStyle = 'rgba(255,180,110,' + (0.05 + rnd() * 0.10) + ')';
          ctx.lineWidth = Math.max(1, px * (0.0012 + rnd() * 0.002));
          ctx.beginPath();
          for (var yy = 0; yy <= px; yy += px / 40) {
            var xx = lx + Math.sin((yy / px) * Math.PI * freq + ph) * amp;
            if (yy === 0) { ctx.moveTo(xx, yy); } else { ctx.lineTo(xx, yy); }
          }
          ctx.stroke();
        }

        // A knot or two.
        if (rnd() > 0.55) {
          var kx = x + w * (0.25 + rnd() * 0.5);
          var ky = px * (0.1 + rnd() * 0.8);
          var kr = w * (0.10 + rnd() * 0.10);
          for (var k = 3; k >= 1; k--) {
            ctx.strokeStyle = 'rgba(255,190,120,' + (0.05 + k * 0.03) + ')';
            ctx.lineWidth = Math.max(1, px * 0.0016);
            ctx.beginPath();
            ctx.ellipse(kx, ky, kr * k * 0.5, kr * k * 0.75, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Seam between trunks.
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x + w - px * 0.004, 0, px * 0.008, px);
        x += w;
      }

      gridLines(ctx, px, cells, 'rgba(255,190,130,0.035)', 1);
      vignette(ctx, px, 0.6);
    },

    // A teal berry - the one colour that cuts through all that brown.
    drawFood: function (ctx, x, y, cell, pulse) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var r = cell * (0.30 + pulse * 0.05);
      var col = NS.hsl(this.foodHue, 95, 60);
      withGlow(ctx, col, cell * (1.15 + pulse), function () {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy + cell * 0.04, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - r * 0.55, cy - r * 0.45, r * 0.52, 0, Math.PI * 2);
        ctx.fill();
      });
      glint(ctx, cx + r * 0.25, cy - r * 0.2, r * 0.24);
    }
  };

  /* ---------------- 8. Western ---------------- */

  var western = {
    key: 'WESTERN', name: 'Western',
    ground: '#1a0e06', accent: '#ff8a3d',
    accentSoft: 'rgba(255,138,61,0.35)', accentDim: 'rgba(255,138,61,0.12)',
    foodHue: 48,

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 9173 + 131);

      var g = ctx.createLinearGradient(0, 0, 0, px);
      g.addColorStop(0, '#2a1408');
      g.addColorStop(0.5, '#1a0e06');
      g.addColorStop(1, '#0c0603');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, px, px);

      // Low desert sun.
      var sun = ctx.createRadialGradient(px * 0.5, px * 0.62, 0, px * 0.5, px * 0.62, px * 0.55);
      sun.addColorStop(0, 'rgba(255,140,50,0.22)');
      sun.addColorStop(0.5, 'rgba(255,90,30,0.08)');
      sun.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, px, px);

      // Cacti silhouettes with rim light.
      var cacti = Math.max(3, Math.round(cells * 0.18));
      for (var i = 0; i < cacti; i++) {
        var bx = px * (0.06 + rnd() * 0.88);
        var by = px * (0.15 + rnd() * 0.75);
        var h = px * (0.07 + rnd() * 0.09);
        var w = h * 0.28;
        ctx.fillStyle = 'rgba(30,45,25,0.85)';
        ctx.strokeStyle = 'rgba(255,150,70,0.35)';
        ctx.lineWidth = Math.max(1, px * 0.0022);

        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(bx - w / 2, by - h, w, h, w * 0.5)
                      : ctx.rect(bx - w / 2, by - h, w, h);
        ctx.fill(); ctx.stroke();

        // Arms.
        if (rnd() > 0.3) {
          var ah = h * 0.42, aw = w * 0.75;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(bx - w / 2 - aw, by - h * 0.72, aw, w * 0.9, w * 0.45)
                        : ctx.rect(bx - w / 2 - aw, by - h * 0.72, aw, w * 0.9);
          ctx.fill(); ctx.stroke();
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(bx - w / 2 - aw, by - h * 0.72 - ah, w * 0.9, ah + w, w * 0.45)
                        : ctx.rect(bx - w / 2 - aw, by - h * 0.72 - ah, w * 0.9, ah + w);
          ctx.fill(); ctx.stroke();
        }
      }

      // Sand speckle and tumbleweed dust.
      for (var s = 0; s < cells * 12; s++) {
        var sx = rnd() * px, sy = rnd() * px;
        ctx.fillStyle = 'rgba(255,190,120,' + (0.03 + rnd() * 0.07) + ')';
        ctx.fillRect(sx, sy, px * 0.003, px * 0.003);
      }

      gridLines(ctx, px, cells, 'rgba(255,170,100,0.04)', 1);
      vignette(ctx, px, 0.58);
    },

    // Sheriff's star.
    drawFood: function (ctx, x, y, cell, pulse) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var r = cell * (0.36 + pulse * 0.05);
      var col = NS.hsl(this.foodHue, 100, 60);
      withGlow(ctx, col, cell * (1.15 + pulse), function () {
        ctx.fillStyle = col;
        starPath(ctx, cx, cy, 5, r, r * 0.45);
        ctx.fill();
      });
      ctx.fillStyle = 'rgba(255,245,200,0.9)';
      starPath(ctx, cx, cy, 5, r * 0.42, r * 0.19);
      ctx.fill();
    }
  };

  /* ---------------- 9. Candy ---------------- */

  var candy = {
    key: 'CANDY', name: 'Candy',
    ground: '#1a0620', accent: '#ff7ad9',
    accentSoft: 'rgba(255,122,217,0.35)', accentDim: 'rgba(255,122,217,0.12)',
    foodHue: 150,

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 6733 + 149);

      ctx.fillStyle = this.ground;
      ctx.fillRect(0, 0, px, px);

      // Diagonal candy stripes.
      ctx.save();
      ctx.translate(px / 2, px / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.translate(-px, -px);
      var band = px * 0.08;
      for (var i = 0; i < Math.ceil((px * 2) / band) + 1; i++) {
        ctx.fillStyle = i % 2 === 0
          ? 'rgba(255,122,217,0.075)'
          : 'rgba(255,255,255,0.035)';
        ctx.fillRect(i * band, 0, band, px * 2);
      }
      ctx.restore();

      // Sprinkles.
      var hues = [340, 20, 55, 130, 190, 280];
      var sprinkles = Math.round(cells * cells * 0.05);
      for (var s = 0; s < sprinkles; s++) {
        var sx = rnd() * px, sy = rnd() * px;
        var len = px * (0.010 + rnd() * 0.012);
        var thick = len * 0.42;
        var hue = hues[Math.floor(rnd() * hues.length)];
        var col = NS.hsl(hue, 95, 70);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rnd() * Math.PI);
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.35 + rnd() * 0.4;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(-len / 2, -thick / 2, len, thick, thick / 2);
          ctx.fill();
        } else {
          ctx.fillRect(-len / 2, -thick / 2, len, thick);
        }
        ctx.restore();
      }

      // A few glossy gumballs.
      for (var b = 0; b < Math.max(3, Math.round(cells * 0.18)); b++) {
        var gx = rnd() * px, gy = rnd() * px, gr = px * (0.012 + rnd() * 0.016);
        var gh = hues[Math.floor(rnd() * hues.length)];
        withGlow(ctx, NS.hsl(gh, 100, 70), px * 0.02, function () {
          ctx.fillStyle = NS.hsl(gh, 95, 68, 0.5);
          ctx.beginPath();
          ctx.arc(gx, gy, gr, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      gridLines(ctx, px, cells, 'rgba(255,255,255,0.05)', 1);
      vignette(ctx, px, 0.45);
    },

    // Wrapped mint sweet.
    drawFood: function (ctx, x, y, cell, pulse) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var r = cell * (0.26 + pulse * 0.04);
      var col = NS.hsl(this.foodHue, 90, 60);
      withGlow(ctx, col, cell * (1.1 + pulse), function () {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        // Wrapper twists either side.
        ctx.beginPath();
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx - r * 2.0, cy - r * 0.75);
        ctx.lineTo(cx - r * 2.0, cy + r * 0.75);
        ctx.closePath();
        ctx.moveTo(cx + r, cy);
        ctx.lineTo(cx + r * 2.0, cy - r * 0.75);
        ctx.lineTo(cx + r * 2.0, cy + r * 0.75);
        ctx.closePath();
        ctx.fill();
      });
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1, cell * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.55, Math.PI * 0.15, Math.PI * 1.15);
      ctx.stroke();
    }
  };

  /* ---------------- 10. Golden (final, permanent) ---------------- */

  var golden = {
    key: 'GOLDEN', name: 'Golden',
    // The board is a bright slab of gold. The page chrome stays dark, or the
    // light HUD text would be unreadable against it.
    ground: '#e7bd44', pageBg: '#1a1204',
    accent: '#ffd24a',
    accentSoft: 'rgba(255,210,74,0.45)', accentDim: 'rgba(255,210,74,0.18)',
    foodHue: 350,

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

      // Glimmer - sparse, so it never competes with the apple for attention.
      var sparks = Math.max(7, Math.round(cells * 0.45));
      for (var s2 = 0; s2 < sparks; s2++) {
        var sx = rnd() * px, sy = rnd() * px;
        var sr = px * (0.005 + rnd() * 0.011);
        withGlow(ctx, 'rgba(255,255,235,0.8)', px * 0.022, function () {
          ctx.fillStyle = 'rgba(255,255,245,0.75)';
          starPath(ctx, sx, sy, 4, sr, sr * 0.24);
          ctx.fill();
        });
      }

      // Gentle darkening at the rim so the bright slab still has edges.
      vignette(ctx, px, 0.30);
    },

    // A ruby. On a bright slab a glow alone would wash out, so it gets a dark
    // setting around it to hold its edge.
    drawFood: function (ctx, x, y, cell, pulse) {
      var cx = x + cell / 2, cy = y + cell / 2;
      var w = cell * (0.30 + pulse * 0.04), h = cell * (0.36 + pulse * 0.04);
      var col = NS.hsl(this.foodHue, 95, 48);

      diamondPath(ctx, cx, cy, w * 1.22, h * 1.18);
      ctx.fillStyle = 'rgba(58,26,4,0.55)';
      ctx.fill();

      withGlow(ctx, col, cell * (0.9 + pulse * 0.5), function () {
        ctx.fillStyle = col;
        diamondPath(ctx, cx, cy, w, h);
        ctx.fill();
      });

      diamondPath(ctx, cx, cy, w, h);
      ctx.strokeStyle = 'rgba(30,10,2,0.7)';
      ctx.lineWidth = Math.max(1, cell * 0.05);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,190,200,0.65)';
      diamondPath(ctx, cx, cy - h * 0.2, w * 0.42, h * 0.36);
      ctx.fill();
      glint(ctx, cx - w * 0.2, cy - h * 0.32, cell * 0.05);
    }
  };

  NS.THEMES = [techy, grassy, blocky, medieval, sky, war, trunks, western, candy];
  NS.GOLDEN = golden;

  // Past GOLDEN_SCORE the golden map is permanent; before it the nine themes
  // cycle every THEME_EVERY points.
  NS.themeForScore = function (score) {
    if (score >= NS.GOLDEN_SCORE) { return golden; }
    return NS.THEMES[Math.floor(score / NS.THEME_EVERY) % NS.THEMES.length];
  };

  NS.isGolden = function (score) { return score >= NS.GOLDEN_SCORE; };

})(window.NS = window.NS || {});
