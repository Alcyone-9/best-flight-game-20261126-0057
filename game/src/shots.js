// SKYLINE RIDGE — deterministic screenshot poses via ?shot=.
// After the scene settles, sets window.__shotReady = true.
// Poses: start | play | cockpit | win.
(function () {
  'use strict';
  var SR = window.SR = window.SR || {};

  function parkOnRunway(game) {
    var rw = SR.CONFIG.runway;
    var f = game.flight;
    f.pos.set(rw.x, SR.heightAt(rw.x, rw.z) + SR.CONFIG.gearHeight, rw.z);
    f.heading = 0; f.pitch = 0; f.roll = 0;
    f.speed = 0; f.throttle = 0; f.fuel = 100; f.damage = 0;
    f.airborne = false; f.onGround = true; f.landed = false;
    SR.applyToMesh(f, game.aircraft);
  }

  function poseStart(game) {
    game.showTitle();
    parkOnRunway(game);
    game.setDawn(true);
    // close three-quarter view: the parked aircraft large in frame,
    // runway stretching ahead into the dawn light
    var rw = SR.CONFIG.runway;
    var gy = SR.heightAt(rw.x, rw.z);
    game.camera.position.set(rw.x + 15, gy + 5.5, rw.z + 24);
    game.camera.lookAt(rw.x + 14, gy + 2, rw.z - 60);
    game.cameraMode = 'fixed';
  }

  function posePlay(game) {
    game.startMission(0);
    var f = game.flight;
    // mid-flight, chase view, first ring ahead over the coastline
    f.pos.set(640, 78, 60);
    f.heading = 0; f.pitch = 0.03; f.roll = -0.06;
    f.speed = 66; f.throttle = 0.72; f.fuel = 78; f.damage = 4;
    f.airborne = true; f.onGround = false;
    SR.applyToMesh(f, game.aircraft);
    game.setCameraMode('chase');
    game.snapCamera();
    game.state = 'flying';
    game.showHudOnly();
  }

  function poseCockpit(game) {
    game.startMission(1);
    var f = game.flight;
    // high over the south coast, runway far ahead to the north
    f.pos.set(640, 135, 760);
    f.heading = 0; f.pitch = -0.02; f.roll = 0.04;
    f.speed = 60; f.throttle = 0.65; f.fuel = 84; f.damage = 0;
    f.airborne = true; f.onGround = false;
    SR.applyToMesh(f, game.aircraft);
    game.setCameraMode('cockpit');
    game.snapCamera();
    game.state = 'flying';
    game.showHudOnly();
  }

  function poseWin(game) {
    game.startMission(0);
    var m = game.mission;
    m.index = m.def.rings.length;
    m.passed = m.def.rings.length;
    m.done = true;
    m.elapsed = 154;
    m.timeLeft = 86;
    // 8 rings x 125 + clock bonus
    m.score = 8 * 125 + 86 * 2;
    SR.refreshRingColors(m, game.rings.meshes);
    parkOnRunway(game);
    game.setCameraMode('chase');
    game.snapCamera();
    game.showComplete(m);
  }

  function applyShot(name) {
    var game = SR.Game;
    if (!game || !name) return false;
    var poses = { start: poseStart, play: posePlay, cockpit: poseCockpit, win: poseWin };
    var pose = poses[name];
    if (!pose) return false;
    game.shotMode = true;
    pose(game);
    // let a few frames render, then declare the shot ready
    setTimeout(function () {
      window.__shotReady = true;
    }, 1400);
    return true;
  }
  SR.applyShot = applyShot;

  function shotFromUrl() {
    var m = /[?&]shot=([a-z]+)/.exec(window.location.search || '');
    return m ? m[1] : null;
  }
  SR.shotFromUrl = shotFromUrl;
})();
