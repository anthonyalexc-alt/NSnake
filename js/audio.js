/* Web Audio blips - no audio files, no dependencies. */
(function (NS) {
  'use strict';

  var ctx = null;
  var muted = NS.storage.get(NS.storage.muteKey, '0') === '1';

  // Browsers block audio until a user gesture, so the context is built lazily
  // on the first keypress/click rather than at load.
  function ensure() {
    if (muted) return null;
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended' && ctx.resume) { ctx.resume(); }
    return ctx;
  }

  function tone(opts) {
    var c = ensure();
    if (!c) return;
    var osc = c.createOscillator();
    var gain = c.createGain();
    var t0 = c.currentTime + (opts.delay || 0);
    var dur = opts.dur;

    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.from, t0);
    if (opts.to && opts.to !== opts.from) {
      osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    }

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(opts.vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  NS.audio = {
    unlock: function () { ensure(); },

    isMuted: function () { return muted; },

    toggleMute: function () {
      muted = !muted;
      NS.storage.set(NS.storage.muteKey, muted ? '1' : '0');
      if (!muted) { ensure(); }
      return muted;
    },

    // Pitch climbs with the score, so a long run audibly escalates.
    eat: function (score) {
      var f = 440 * Math.pow(2, (score % 12) / 12);
      tone({ type: 'square', from: f, to: f * 1.5, dur: 0.09, vol: 0.16 });
    },

    themeChange: function () {
      tone({ type: 'triangle', from: 330, to: 660, dur: 0.16, vol: 0.18 });
      tone({ type: 'triangle', from: 494, to: 988, dur: 0.22, vol: 0.14, delay: 0.1 });
    },

    colorChange: function () {
      tone({ type: 'sine', from: 880, to: 1320, dur: 0.11, vol: 0.1 });
    },

    die: function () {
      tone({ type: 'sawtooth', from: 320, to: 60, dur: 0.55, vol: 0.2 });
    },

    win: function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        tone({ type: 'triangle', from: f, to: f, dur: 0.16, vol: 0.16, delay: i * 0.12 });
      });
    }
  };

})(window.NS = window.NS || {});
