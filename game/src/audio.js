// SKYLINE RIDGE — WebAudio synthesis only. No audio files.
// Engine hum follows throttle, wind grows with speed, chime on ring pass,
// thud on touchdown and crash. M toggles mute.
(function () {
  'use strict';
  var SR = window.SR = window.SR || {};

  var ctx = null, muted = false;
  var engineOsc = null, engineOsc2 = null, engineGain = null, engineFilter = null;
  var windSrc = null, windGain = null, windFilter = null;

  function ensureCtx() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
    } catch (e) { return false; }
    // engine: two detuned saws through a lowpass
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'sawtooth';
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start(); engineOsc2.start();
    // wind: looped noise buffer through a bandpass
    var len = ctx.sampleRate * 2;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    var i;
    for (i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    windSrc = ctx.createBufferSource();
    windSrc.buffer = buf; windSrc.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    windFilter.Q.value = 0.6;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);
    windSrc.start();
    return true;
  }

  function updateAudio(f, flying) {
    if (!ctx || muted) return;
    var t = ctx.currentTime;
    var throttle = f ? f.throttle : 0;
    var speed = f ? f.speed : 0;
    var eng = flying ? 0.045 + throttle * 0.075 : 0;
    engineGain.gain.setTargetAtTime(eng, t, 0.1);
    var freq = 55 + throttle * 95;
    engineOsc.frequency.setTargetAtTime(freq, t, 0.1);
    engineOsc2.frequency.setTargetAtTime(freq * 1.007 + 2, t, 0.1);
    engineFilter.frequency.setTargetAtTime(300 + throttle * 700, t, 0.15);
    var wind = flying ? Math.min(0.16, speed / 96 * 0.16) : 0;
    windGain.gain.setTargetAtTime(wind, t, 0.2);
    windFilter.frequency.setTargetAtTime(500 + speed * 9, t, 0.2);
  }

  function chime() {
    if (!ensureCtx() || muted) return;
    var t = ctx.currentTime;
    [880, 1318.5].forEach(function (freq, i) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.22, t + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.5);
      o.connect(g); g.connect(ctx.destination);
      o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.55);
    });
  }

  function thud(hard) {
    if (!ensureCtx() || muted) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(hard ? 90 : 70, t);
    o.frequency.exponentialRampToValueAtTime(32, t + 0.28);
    g.gain.setValueAtTime(hard ? 0.5 : 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.32);
  }

  function toggleMute() {
    muted = !muted;
    if (ctx) {
      var t = ctx.currentTime;
      if (engineGain) engineGain.gain.setTargetAtTime(muted ? 0 : 0.05, t, 0.05);
      if (windGain) windGain.gain.setTargetAtTime(0, t, 0.05);
    }
    return muted;
  }

  SR.Audio = {
    ensure: ensureCtx,
    update: updateAudio,
    chime: chime,
    thud: thud,
    toggleMute: toggleMute,
    isMuted: function () { return muted; },
  };
})();
