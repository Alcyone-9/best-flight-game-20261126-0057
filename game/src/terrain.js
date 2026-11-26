// SKYLINE RIDGE — procedural island: heightmap, sea, runway, trees,
// rocks, clouds, sky dome and sun. One seeded world, identical every load.
(function () {
  'use strict';
  var SR = window.SR = window.SR || {};
  var CFG = SR.CONFIG;

  var fbm = null;
  var noise2 = null;

  // --- height function: shared by the mesh builder and the flight model ---
  function smoothstep(a, b, t) {
    var x = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return x * x * (3 - 2 * x);
  }

  function heightAt(x, z) {
    var R = CFG.islandRadius;
    var d = Math.sqrt(x * x + z * z) / R;      // 0 centre, 1 shoreline
    if (d >= 1.35) return -14;                 // open sea floor
    var fall = 1 - smoothstep(0.55, 1.0, d);   // island mass
    var hills = fbm(x * 0.0035 + 7, z * 0.0035 + 3);
    var h = 6 + hills * 42 * fall;
    // one mountain, north-west of centre
    var mx = x + 330, mz = z + 430;
    var md = Math.sqrt(mx * mx + mz * mz);
    h += 250 * Math.exp(-(md * md) / (2 * 260 * 260));
    // river valley: carved from the mountain to the south coast
    var rx = x + 60, rz = z - 120;
    var riverD = Math.abs(rx) * 0.55 + Math.abs(rz) * 0.35;
    var riverMask = Math.exp(-(riverD * riverD) / (2 * 55 * 55));
    h -= 16 * riverMask * fall;
    // small lake, south-east
    var lx = x - 300, lz = z - 260;
    var ld = Math.sqrt(lx * lx + lz * lz);
    h -= 14 * Math.exp(-(ld * ld) / (2 * 95 * 95));
    // flatten the runway pad near the east coast
    var rw = CFG.runway;
    var dx = Math.abs(x - rw.x), dz = Math.abs(z - rw.z);
    var pad = (1 - smoothstep(rw.length / 2, rw.length / 2 + 60, dz)) *
              (1 - smoothstep(rw.width / 2, rw.width / 2 + 60, dx));
    h = h * (1 - pad) + 6 * pad;
    // sink below sea outside the shoreline
    h = h * fall - 14 * (1 - fall) * smoothstep(0.9, 1.2, d);
    return h;
  }
  SR.heightAt = heightAt;

  function initNoise() {
    fbm = SR.makeFbm(CFG.seed, 4);
    noise2 = SR.makeNoise2D(CFG.seed + 99);
  }

  // --- sky: gradient dome + sun sprite ---
  function makeSkyTexture() {
    var c = document.createElement('canvas');
    c.width = 4; c.height = 256;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#1d5a9e');
    grad.addColorStop(0.45, '#5ea3d6');
    grad.addColorStop(0.72, '#bfe0f2');
    grad.addColorStop(0.82, '#f6e3b8');
    grad.addColorStop(1.0, '#e8d9b0');
    g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
    var tex = new THREE.CanvasTexture(c);
    return tex;
  }

  function makeGlowTexture() {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,244,200,1)');
    grad.addColorStop(0.35, 'rgba(255,220,130,0.75)');
    grad.addColorStop(1, 'rgba(255,210,110,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function buildSky(scene) {
    var skyGeo = new THREE.SphereGeometry(4200, 24, 16);
    var skyMat = new THREE.MeshBasicMaterial({
      map: makeSkyTexture(), side: THREE.BackSide, fog: false,
    });
    var sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    var sunMat = new THREE.SpriteMaterial({
      map: makeGlowTexture(), fog: false, depthWrite: false,
    });
    var sun = new THREE.Sprite(sunMat);
    sun.position.set(2400, 900, -3200);
    sun.scale.set(520, 520, 1);
    scene.add(sun);

    var hemi = new THREE.HemisphereLight(0xbfd9ff, 0x6a8f5a, 0.75);
    scene.add(hemi);
    var sunLight = new THREE.DirectionalLight(0xfff1c8, 1.15);
    sunLight.position.set(1200, 900, -1400);
    scene.add(sunLight);
    scene.fog = new THREE.Fog(0xc4dcee, 900, 3800);
    return { sunLight: sunLight };
  }

  // --- terrain mesh with painted vertex colours ---
  function buildIsland(scene) {
    var size = CFG.worldSize;
    var segs = 180;
    var geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    var sand = new THREE.Color(0xdcc98f);
    var grassA = new THREE.Color(0x5da244);
    var grassB = new THREE.Color(0x7fb84f);
    var rock = new THREE.Color(0x8a7f74);
    var snow = new THREE.Color(0xf2f4f6);
    var tmp = new THREE.Color();
    var i, x, z, h, n;
    for (i = 0; i < pos.count; i += 1) {
      x = pos.getX(i); z = pos.getZ(i);
      h = heightAt(x, z);
      pos.setY(i, h);
      n = noise2(x * 0.02, z * 0.02) * 0.5 + 0.5;
      if (h < 2.5) tmp.copy(sand);
      else if (h < 60) tmp.copy(grassA).lerp(grassB, n);
      else if (h < 150) tmp.copy(grassB).lerp(rock, smoothstep(60, 150, h));
      else if (h < 210) tmp.copy(rock);
      else tmp.copy(rock).lerp(snow, smoothstep(190, 230, h));
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    var mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    var island = new THREE.Mesh(geo, mat);
    scene.add(island);

    // sea
    var seaGeo = new THREE.PlaneGeometry(9000, 9000);
    seaGeo.rotateX(-Math.PI / 2);
    var sea = new THREE.Mesh(seaGeo, new THREE.MeshLambertMaterial({
      color: 0x2e7fb8, transparent: true, opacity: 0.92,
    }));
    sea.position.y = 0.4;
    scene.add(sea);
    return island;
  }

  // --- runway: asphalt strip, threshold bars, centreline dashes ---
  function buildRunway(scene) {
    var rw = CFG.runway;
    var group = new THREE.Group();
    var padH = heightAt(rw.x, rw.z);
    var asphalt = new THREE.Mesh(
      new THREE.BoxGeometry(rw.width, 0.6, rw.length),
      new THREE.MeshLambertMaterial({ color: 0x3a3f45 })
    );
    asphalt.position.set(rw.x, padH + 0.3, rw.z);
    group.add(asphalt);

    var white = new THREE.MeshLambertMaterial({ color: 0xf5f5f0 });
    var i, stripe;
    // threshold bars at both ends
    for (i = -1; i <= 1; i += 2) {
      for (var k = -3; k <= 3; k += 1) {
        stripe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 10),
          white);
        stripe.position.set(rw.x + k * 3.4, padH + 0.7,
          rw.z + i * (rw.length / 2 - 14));
        group.add(stripe);
      }
    }
    // centreline dashes
    for (i = 0; i < 9; i += 1) {
      stripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 12), white);
      stripe.position.set(rw.x, padH + 0.7,
        rw.z - rw.length / 2 + 30 + i * 32);
      group.add(stripe);
    }
    // small hangar beside the strip
    var hangar = new THREE.Mesh(
      new THREE.BoxGeometry(26, 10, 18),
      new THREE.MeshLambertMaterial({ color: 0xe8e2d2 })
    );
    hangar.position.set(rw.x - 26, padH + 5, rw.z + 60);
    group.add(hangar);
    var roof = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 9, 26, 12, 1, false, 0, Math.PI),
      new THREE.MeshLambertMaterial({ color: 0x2f8f8a })
    );
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.set(rw.x - 26, padH + 10, rw.z + 60);
    group.add(roof);

    scene.add(group);
    return group;
  }

  // --- trees, rocks, clouds ---
  function buildTrees(scene) {
    var rng = SR.makeRng(CFG.seed + 7);
    var trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 4, 6);
    var canopyGeo = new THREE.ConeGeometry(3.2, 9, 7);
    var trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
    var canopyMat = new THREE.MeshLambertMaterial({ color: 0x2f7a33 });
    var count = 420;
    var trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    var canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, count);
    var m = new THREE.Matrix4();
    var q = new THREE.Quaternion();
    var s = new THREE.Vector3();
    var p = new THREE.Vector3();
    var placed = 0, tries = 0;
    var rw = CFG.runway;
    while (placed < count && tries < 4000) {
      tries += 1;
      var x = (rng() * 2 - 1) * 950;
      var z = (rng() * 2 - 1) * 950;
      var h = heightAt(x, z);
      if (h < 5 || h > 95) continue;
      if (Math.abs(x - rw.x) < 60 && Math.abs(z - rw.z) < 220) continue;
      var sc = 0.8 + rng() * 0.9;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI * 2);
      s.set(sc, sc, sc);
      p.set(x, h + 2 * sc, z);
      m.compose(p, q, s); trunks.setMatrixAt(placed, m);
      p.set(x, h + (4 + 4.5) * sc, z);
      m.compose(p, q, s); canopies.setMatrixAt(placed, m);
      placed += 1;
    }
    trunks.count = placed; canopies.count = placed;
    scene.add(trunks); scene.add(canopies);
  }

  function buildRocks(scene) {
    var rng = SR.makeRng(CFG.seed + 21);
    var geo = new THREE.DodecahedronGeometry(1, 0);
    var mat = new THREE.MeshLambertMaterial({ color: 0x7d7468 });
    var count = 70;
    var rocks = new THREE.InstancedMesh(geo, mat, count);
    var m = new THREE.Matrix4();
    var q = new THREE.Quaternion();
    var e = new THREE.Euler();
    var placed = 0, tries = 0;
    while (placed < count && tries < 2000) {
      tries += 1;
      var x = (rng() * 2 - 1) * 1000;
      var z = (rng() * 2 - 1) * 1000;
      var h = heightAt(x, z);
      if (h < -2 || (h > 4 && h < 120 && rng() < 0.6)) continue;
      var sc = 2 + rng() * 7;
      e.set(rng() * 3, rng() * 3, rng() * 3);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, h + sc * 0.3, z), q,
        new THREE.Vector3(sc, sc * 0.7, sc));
      rocks.setMatrixAt(placed, m);
      placed += 1;
    }
    rocks.count = placed;
    scene.add(rocks);
  }

  function buildClouds(scene) {
    var rng = SR.makeRng(CFG.seed + 42);
    var mat = new THREE.MeshLambertMaterial({
      color: 0xffffff, transparent: true, opacity: 0.88,
    });
    var clouds = [];
    var i, j, puff, group;
    for (i = 0; i < 15; i += 1) {
      group = new THREE.Group();
      var puffs = 3 + Math.floor(rng() * 3);
      for (j = 0; j < puffs; j += 1) {
        puff = new THREE.Mesh(new THREE.SphereGeometry(10 + rng() * 14, 10, 8), mat);
        puff.position.set((rng() * 2 - 1) * 22, (rng() * 2 - 1) * 4, (rng() * 2 - 1) * 12);
        puff.scale.y = 0.45;
        group.add(puff);
      }
      group.position.set((rng() * 2 - 1) * 1500, 190 + rng() * 110,
        (rng() * 2 - 1) * 1500);
      group.userData.speed = 2 + rng() * 3;
      scene.add(group);
      clouds.push(group);
    }
    return clouds;
  }

  function updateClouds(clouds, dt) {
    var i, c;
    for (i = 0; i < clouds.length; i += 1) {
      c = clouds[i];
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 1700) c.position.x = -1700;
    }
  }

  // Build the whole world; returns handles the loop needs.
  function buildWorld(scene) {
    initNoise();
    var sky = buildSky(scene);
    buildIsland(scene);
    buildRunway(scene);
    buildTrees(scene);
    buildRocks(scene);
    var clouds = buildClouds(scene);
    return { clouds: clouds, sunLight: sky.sunLight };
  }
  SR.buildWorld = buildWorld;
  SR.updateClouds = updateClouds;
})();
