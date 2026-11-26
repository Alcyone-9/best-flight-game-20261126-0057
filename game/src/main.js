// SKYLINE RIDGE — game loop, camera, state machine, wiring.
// States: title | flying | paused | complete | crashed.
(function () {
  'use strict';
  var SR = window.SR = window.SR || {};
  var CFG = SR.CONFIG;

  var renderer, scene, camera, clock;
  var aircraft, world, rings = null;
  var flight = null, mission = null;
  var state = 'title';
  var cameraMode = 'chase';
  var shotMode = false;
  var time = 0;
  var shake = 0;
  var camPos = new THREE.Vector3();
  var camTarget = new THREE.Vector3();

  function $(id) { return document.getElementById(id); }

  function bestScore() {
    try { return parseInt(window.localStorage.getItem('skyline-ridge-best') || '0', 10) || 0; }
    catch (e) { return 0; }
  }
  function saveBest(score) {
    try {
      if (score > bestScore()) window.localStorage.setItem('skyline-ridge-best', String(score));
    } catch (e) { /* storage unavailable */ }
  }

  function hideOverlays() {
    ['title', 'pause', 'complete', 'crash'].forEach(function (id) {
      var n = $('overlay-' + id);
      if (n) n.classList.add('hidden');
    });
  }
  function showOverlay(id) {
    hideOverlays();
    var n = $('overlay-' + id);
    if (n) n.classList.remove('hidden');
  }

  function showTitle() {
    state = 'title';
    showOverlay('title');
    $('hud').classList.add('hidden');
    $('best-score').textContent = bestScore();
  }

  function showHudOnly() {
    hideOverlays();
    $('hud').classList.remove('hidden');
  }

  function startMission(index) {
    var def = SR.MISSIONS[index];
    if (rings) { scene.remove(rings.group); rings = null; }
    rings = SR.buildRings(scene, def);
    mission = SR.createMission(def);
    flight = SR.createFlight();
    var rw = CFG.runway;
    flight.pos.set(rw.x, SR.heightAt(rw.x, rw.z) + CFG.gearHeight, rw.z);
    flight.heading = 0;
    SR.applyToMesh(flight, aircraft);
    state = 'flying';
    cameraMode = 'chase';
    showHudOnly();
    SR.showBanner(def.name + ' — ' + def.short, 3.5);
    SR.updateHud(flight, mission, performance.now());
  }

  function showComplete(m) {
    state = 'complete';
    saveBest(m.score);
    $('hud').classList.add('hidden');
    if ($('banner')) $('banner').style.opacity = '0';
    $('final-score').textContent = m.score;
    $('final-rings').textContent = m.passed + ' / ' + m.def.rings.length;
    $('final-time').textContent = SR.formatTime(m.elapsed);
    $('final-fuel').textContent = Math.round(flight ? flight.fuel : 0) + '%';
    $('final-damage').textContent = Math.round(flight ? flight.damage : 0) + '%';
    $('final-best').textContent = bestScore();
    showOverlay('complete');
  }

  function showCrash(cause) {
    state = 'crashed';
    $('hud').classList.add('hidden');
    if ($('banner')) $('banner').style.opacity = '0';
    $('crash-cause').textContent = cause || 'Crashed';
    $('crash-score').textContent = mission ? mission.score : 0;
    showOverlay('crash');
    SR.Audio.thud(true);
  }

  function setCameraMode(mode) {
    cameraMode = mode;
    if (mode === 'cockpit') {
      $('view-label').textContent = 'COCKPIT';
    } else {
      $('view-label').textContent = 'CHASE';
    }
  }

  function snapCamera() {
    if (cameraMode === 'cockpit') {
      var fwd = SR.forwardVector(flight);
      camera.position.copy(flight.pos)
        .addScaledVector(fwd, 2.0).add(new THREE.Vector3(0, 1.55, 0));
      camTarget.copy(flight.pos).addScaledVector(fwd, 60);
      camTarget.y -= 5;
      camera.lookAt(camTarget);
    } else if (cameraMode === 'chase') {
      var fwd2 = SR.forwardVector(flight);
      camPos.copy(flight.pos).addScaledVector(fwd2, -CFG.chaseDistance)
        .add(new THREE.Vector3(0, CFG.chaseHeight, 0));
      camera.position.copy(camPos);
      camTarget.copy(flight.pos).addScaledVector(fwd2, 12);
      camera.lookAt(camTarget);
    }
  }

  function updateCamera(dt) {
    if (cameraMode === 'fixed' || state === 'title') return;
    if (!flight) return;
    var fwd = SR.forwardVector(flight);
    if (cameraMode === 'cockpit') {
      var eye = flight.pos.clone().addScaledVector(fwd, 2.0)
        .add(new THREE.Vector3(0, 1.55, 0));
      camera.position.lerp(eye, 1 - Math.exp(-dt * 18));
      camTarget.copy(flight.pos).addScaledVector(fwd, 80);
      camTarget.y -= 5;
      camera.up.set(0, 1, 0);
      camera.lookAt(camTarget);
    } else {
      var desired = flight.pos.clone().addScaledVector(fwd, -CFG.chaseDistance)
        .add(new THREE.Vector3(0, CFG.chaseHeight, 0));
      var k = 1 - Math.exp(-dt * CFG.camLag);
      camera.position.lerp(desired, k);
      camTarget.copy(flight.pos).addScaledVector(fwd, 12);
      if (shake > 0.001) {
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
      }
      camera.up.set(0, 1, 0);
      camera.lookAt(camTarget);
    }
  }

  function setDawn(on) {
    if (!world || !world.sunLight) return;
    if (on) {
      world.sunLight.color.setHex(0xffc98a);
      world.sunLight.intensity = 1.05;
      world.sunLight.position.set(2000, 420, -1600);
      scene.fog.color.setHex(0xe8cfa8);
    } else {
      world.sunLight.color.setHex(0xfff1c8);
      world.sunLight.intensity = 1.15;
      world.sunLight.position.set(1200, 900, -1400);
      scene.fog.color.setHex(0xc4dcee);
    }
  }

  function restart() {
    if (mission) startMission(SR.MISSIONS.indexOf(mission.def));
    else showTitle();
  }

  function togglePause() {
    if (state === 'flying') {
      state = 'paused';
      showOverlay('pause');
    } else if (state === 'paused') {
      state = 'flying';
      showHudOnly();
    }
  }

  function init() {
    var canvas = $('game-canvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9cc8e8);
    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 9000);
    camera.position.set(660, 30, 200);
    clock = new THREE.Clock();

    world = SR.buildWorld(scene);
    aircraft = SR.buildAircraft();
    scene.add(aircraft);
    flight = SR.createFlight();
    var rw = CFG.runway;
    flight.pos.set(rw.x, SR.heightAt(rw.x, rw.z) + CFG.gearHeight, rw.z);
    SR.applyToMesh(flight, aircraft);

    SR.initHud();
    SR.Input.init(canvas);
    SR.Audio.ensure();

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // title screen mission buttons
    var buttons = document.querySelectorAll('[data-mission]');
    var i;
    for (i = 0; i < buttons.length; i += 1) {
      buttons[i].addEventListener('click', function (e) {
        SR.Audio.ensure();
        startMission(parseInt(e.currentTarget.getAttribute('data-mission'), 10));
      });
    }
    $('btn-resume').addEventListener('click', togglePause);
    $('btn-restart-pause').addEventListener('click', restart);
    $('btn-again').addEventListener('click', restart);
    $('btn-title-again').addEventListener('click', showTitle);
    $('btn-crash-again').addEventListener('click', restart);
    $('btn-crash-title').addEventListener('click', showTitle);

    showTitle();

    // screenshot poses
    var shot = SR.shotFromUrl();
    if (shot) {
      shotMode = true;
      SR.applyShot(shot);
    }

    renderer.setAnimationLoop(tick);
  }

  function tick() {
    var dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    var input = SR.Input;

    // edge-triggered keys
    if (input.wasPressed('KeyM')) {
      var muted = SR.Audio.toggleMute();
      $('mute-label').textContent = muted ? 'MUTED (M)' : 'SOUND ON (M)';
    }
    if (input.wasPressed('KeyC') && state === 'flying') {
      setCameraMode(cameraMode === 'chase' ? 'cockpit' : 'chase');
    }
    if (input.wasPressed('KeyR') && state !== 'title') restart();
    if ((input.wasPressed('KeyP') || input.wasPressed('Escape')) &&
        (state === 'flying' || state === 'paused')) togglePause();
    if (state === 'title') {
      if (input.wasPressed('Digit1')) startMission(0);
      if (input.wasPressed('Digit2')) startMission(1);
      if (input.wasPressed('Digit3')) startMission(2);
      // slow orbit around the parked aircraft on the title screen
      if (cameraMode === 'chase' && !shotMode) {
        var rw = CFG.runway;
        var gy = SR.heightAt(rw.x, rw.z);
        var a = time * 0.12;
        camera.position.set(rw.x + Math.sin(a) * 26, gy + 8, rw.z + Math.cos(a) * 26);
        camera.lookAt(rw.x, gy + 2, rw.z - 30);
      }
    }

    if (state === 'flying' && !shotMode) {
      var event = SR.stepFlight(flight, input, dt, mission);
      if (event === 'takeoff') SR.showBanner('AIRBORNE — GEAR UP, FLY THE RINGS', 2.5);
      if (event === 'landed') { SR.Audio.thud(false); SR.showBanner('TOUCHDOWN', 2); }
      if (event === 'hard') { SR.Audio.thud(true); SR.showBanner('HARD LANDING — DAMAGE TAKEN', 2.5); }
      if (event === 'scrape') SR.showBanner('TERRAIN SCRAPE — PULL UP', 1.5);
      if (event === 'crash') { showCrash(flight.crashCause); }

      if (mission && !flight.crashed) {
        var mev = SR.stepMission(mission, flight, rings.meshes, dt);
        if (mev === 'ring') {
          SR.Audio.chime();
          SR.showBanner('RING CLEAR  +100  —  NEXT RING LIT', 2);
        }
        if (mev === 'complete') {
          SR.Audio.chime();
          showComplete(mission);
        }
        if (mev === 'timeout') {
          showCrash('Out of time — the sortie is over');
          $('crash-cause').textContent = 'Out of time — the sortie is over';
        }
      }
      shake = flight.buffeting ? 0.5 : 0;
      SR.Audio.update(flight, true);
    } else {
      SR.Audio.update(flight, false);
    }

    SR.updateAircraft(aircraft, dt, flight ? flight.throttle : 0, time);
    SR.updateClouds(world.clouds, dt);
    if (rings && rings.meshes && mission) {
      var cur = rings.meshes[mission.index];
      if (cur && !mission.done) {
        var pulse = 1 + Math.sin(time * 4) * 0.12;
        cur.scale.set(pulse, pulse, pulse);
      }
    }
    if (flight && state !== 'title') SR.applyToMesh(flight, aircraft);
    updateCamera(dt);
    SR.updateHud(flight, mission, performance.now());
    renderer.render(scene, camera);
    input.endFrame();
  }

  SR.Game = {
    get state() { return state; },
    set state(v) { state = v; },
    get flight() { return flight; },
    get mission() { return mission; },
    get rings() { return rings; },
    get aircraft() { return aircraft; },
    get camera() { return camera; },
    get cameraMode() { return cameraMode; },
    set cameraMode(v) { cameraMode = v; },
    get shotMode() { return shotMode; },
    set shotMode(v) { shotMode = v; },
    startMission: startMission,
    showTitle: showTitle,
    showHudOnly: showHudOnly,
    showComplete: showComplete,
    setCameraMode: setCameraMode,
    snapCamera: snapCamera,
    setDawn: setDawn,
  };

  window.addEventListener('load', init);
})();
