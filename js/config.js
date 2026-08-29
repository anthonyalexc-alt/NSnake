/* Shared constants and tiny helpers. Loaded first. */
(function (NS) {
  'use strict';

  NS.CANVAS_PX = 640;          // logical canvas size; CSS scales it to fit
  NS.TICK_MS = 111;            // ~9 moves per second, fixed for every map size
  NS.COLOR_EVERY = 5;          // snake picks a new neon hue every N points
  NS.THEME_EVERY = 10;         // map theme advances every N points
  NS.GOLDEN_SCORE = 100;       // golden map + diamond snake, for the rest of the run
  NS.START_LENGTH = 3;

  NS.MAP_SIZES = {
    S: { key: 'S', label: 'Small',  cells: 15 },
    M: { key: 'M', label: 'Medium', cells: 25 },
    L: { key: 'L', label: 'Large',  cells: 35 }
  };

  NS.WALL_MODES = {
    SOLID: { key: 'SOLID', label: 'Solid' },
    WRAP:  { key: 'WRAP',  label: 'Wrap' }
  };

  // Curated neon hues - all high saturation, all readable on a dark ground.
  NS.SNAKE_HUES = [190, 300, 100, 45, 265, 330, 160, 210, 75, 15];

  NS.hsl = function (h, s, l, a) {
    return a === undefined
      ? 'hsl(' + h + ',' + s + '%,' + l + '%)'
      : 'hsla(' + h + ',' + s + '%,' + l + '%,' + a + ')';
  };

  // Shortest distance between two hues on the colour wheel.
  NS.hueGap = function (a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  };

  // Deterministic RNG so a given theme + grid always paints the same backdrop.
  NS.seededRandom = function (seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      var r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  NS.storage = {
    highKey: function (sizeKey, modeKey) {
      return 'neonsnake.hi.' + sizeKey + '.' + modeKey;
    },
    muteKey: 'neonsnake.muted',
    padKey: 'neonsnake.pad',
    // localStorage throws in some privacy modes - never let that break the game.
    get: function (key, fallback) {
      try {
        var v = window.localStorage.getItem(key);
        return v === null ? fallback : v;
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        window.localStorage.setItem(key, String(value));
      } catch (e) { /* ignore */ }
    }
  };

})(window.NS = window.NS || {});
