/* The three map themes. Purely cosmetic - grid, speed and collision never change.
   Backgrounds are painted once to an offscreen canvas and blitted each frame. */
(function (NS) {
  'use strict';

  function withGlow(ctx, color, blur, fn) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    fn();
    ctx.restore();
  }

  function vignette(ctx, px) {
    var g = ctx.createRadialGradient(px / 2, px / 2, px * 0.25, px / 2, px / 2, px * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
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

  /* ---------------- Techy ---------------- */

  var techy = {
    key: 'TECHY',
    name: 'Techy',
    ground: '#05070d',
    accent: '#00e5ff',
    accentSoft: 'rgba(0,229,255,0.35)',
    accentDim: 'rgba(0,229,255,0.12)',
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

        // Solder node at the end of the run.
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

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  /* ---------------- Grassy ---------------- */

  var grassy = {
    key: 'GRASSY',
    name: 'Grassy',
    ground: '#04150b',
    accent: '#5dff8f',
    accentSoft: 'rgba(93,255,143,0.35)',
    accentDim: 'rgba(93,255,143,0.12)',
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

      // Neon blades, leaning at varied angles.
      var blades = cells * 26;
      ctx.lineCap = 'round';
      for (var i = 0; i < blades; i++) {
        var x = rnd() * px;
        var y = rnd() * px;
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

      // A few glowing pollen motes.
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

      // Leaf + highlight.
      ctx.strokeStyle = 'rgba(140,255,160,0.95)';
      ctx.lineWidth = Math.max(1, cell * 0.1);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.75);
      ctx.quadraticCurveTo(cx + r * 0.6, cy - r * 1.35, cx + r * 0.95, cy - r * 0.85);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(cx - r * 0.3, cy - r * 0.25, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  /* ---------------- Blocky ---------------- */

  var blocky = {
    key: 'BLOCKY',
    name: 'Blocky',
    ground: '#0b0616',
    accent: '#ffd166',
    accentSoft: 'rgba(255,209,102,0.35)',
    accentDim: 'rgba(255,209,102,0.12)',
    foodHue: 190,

    paint: function (ctx, px, cells) {
      var rnd = NS.seededRandom(cells * 5237 + 43);
      var cell = px / cells;

      ctx.fillStyle = this.ground;
      ctx.fillRect(0, 0, px, px);

      // Checkerboard base.
      for (var gy = 0; gy < cells; gy++) {
        for (var gx = 0; gx < cells; gx++) {
          if ((gx + gy) % 2 === 0) { continue; }
          ctx.fillStyle = 'rgba(255,255,255,0.028)';
          ctx.fillRect(gx * cell, gy * cell, cell, cell);
        }
      }

      // Confetti tiles in pastel neon.
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

      // A handful of fully lit blocks for punctuation.
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

  NS.THEMES = [techy, grassy, blocky];

  NS.themeForScore = function (score) {
    return NS.THEMES[Math.floor(score / NS.THEME_EVERY) % NS.THEMES.length];
  };

})(window.NS = window.NS || {});
