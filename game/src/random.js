// SKYLINE RIDGE — seeded random numbers and smooth value noise.
// Deterministic: the same seed always builds the same island.
(function () {
  'use strict';
  var SR = window.SR = window.SR || {};

  // mulberry32 — small, fast, deterministic PRNG.
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  SR.makeRng = makeRng;

  // 2D value noise on a seeded grid, smooth-interpolated.
  function makeNoise2D(seed) {
    var rng = makeRng(seed);
    var perm = new Uint8Array(512);
    var base = new Uint8Array(256);
    var i, j, tmp;
    for (i = 0; i < 256; i += 1) base[i] = i;
    for (i = 255; i > 0; i -= 1) {
      j = Math.floor(rng() * (i + 1));
      tmp = base[i]; base[i] = base[j]; base[j] = tmp;
    }
    for (i = 0; i < 512; i += 1) perm[i] = base[i & 255];

    function grad(ix, iz) {
      return perm[(perm[ix & 255] + iz) & 255] / 255;
    }
    function smooth(t) { return t * t * (3 - 2 * t); }

    return function noise(x, z) {
      var ix = Math.floor(x), iz = Math.floor(z);
      var fx = x - ix, fz = z - iz;
      var a = grad(ix, iz), b = grad(ix + 1, iz);
      var c = grad(ix, iz + 1), d = grad(ix + 1, iz + 1);
      var ux = smooth(fx), uz = smooth(fz);
      return (a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz) * 2 - 1;
    };
  }
  SR.makeNoise2D = makeNoise2D;

  // Fractal (multi-octave) noise, still deterministic.
  function makeFbm(seed, octaves) {
    var noise = makeNoise2D(seed);
    return function fbm(x, z) {
      var sum = 0, amp = 1, freq = 1, norm = 0, o;
      for (o = 0; o < octaves; o += 1) {
        sum += noise(x * freq, z * freq) * amp;
        norm += amp; amp *= 0.5; freq *= 2.1;
      }
      return sum / norm;
    };
  }
  SR.makeFbm = makeFbm;
})();
