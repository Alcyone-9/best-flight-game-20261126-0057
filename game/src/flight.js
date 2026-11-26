// SKYLINE RIDGE — arcade flight model: throttle, lift, stall, buffet,
// fuel burn, damage, landing and crash detection.
(function () {
  'use strict';
  var SR = window.SR = window.SR || {};
  var CFG = SR.CONFIG;

  function createFlight() {
    return {
      pos: new THREE.Vector3(CFG.runway.x, 0, CFG.runway.z),
      heading: 0, pitch: 0, roll: 0,
      speed: 0, throttle: 0,
      vy: 0, fuel: CFG.fuelStart, damage: 0,
      airborne: false, onGround: true, landed: false,
      crashed: false, crashCause: '',
      stalled: false, buffeting: false, boosting: false,
      groundSpeed: 0,
    };
  }
  SR.createFlight = createFlight;

  function forwardVector(f) {
    var e = new THREE.Euler(f.pitch, f.heading, f.roll, 'YXZ');
    var v = new THREE.Vector3(0, 0, -1);
    v.applyEuler(e);
    return v;
  }
  SR.forwardVector = forwardVector;

  function applyToMesh(f, mesh) {
    mesh.position.copy(f.pos);
    mesh.rotation.set(f.pitch, f.heading, f.roll, 'YXZ');
  }

  // One physics step. Returns an event string or ''.
  // events: 'takeoff' | 'landed' | 'hard' | 'scrape' | 'crash'
  function stepFlight(f, input, dt, mission) {
    if (f.crashed) return '';
    var K = SR.KEYS;
    var event = '';

    // --- throttle ---
    if (input.isDown(K.throttleUp)) f.throttle = Math.min(1, f.throttle + dt * 0.55);
    if (input.isDown(K.throttleDown)) f.throttle = Math.max(0, f.throttle - dt * 0.7);
    f.boosting = input.mouse.down && input.mouse.active && f.fuel > 0;
    var effThrottle = f.throttle + (f.boosting ? CFG.boostExtra : 0);
    if (f.fuel <= 0) effThrottle = 0;

    // --- speed ---
    var targetSpeed = effThrottle * CFG.maxSpeed;
    var rate = targetSpeed > f.speed ? CFG.accel : CFG.accel * 0.7;
    f.speed += Math.max(-rate * dt, Math.min(rate * dt, targetSpeed - f.speed));

    // --- controls ---
    var mushy = f.speed < CFG.stallSpeed
      ? Math.max(0.25, f.speed / CFG.stallSpeed) : 1;
    var pitchIn = 0, rollIn = 0;
    if (input.isDown(K.pitchUp)) pitchIn += 1;
    if (input.isDown(K.pitchDown)) pitchIn -= 1;
    if (input.isDown(K.rollLeft)) rollIn += 1;
    if (input.isDown(K.rollRight)) rollIn -= 1;

    // mouse steering: pointer position banks and pitches toward it
    if (input.mouse.active && !input.mouse.down) {
      rollIn += Math.max(-1, Math.min(1, -input.mouse.x)) * 0.9;
      pitchIn += Math.max(-1, Math.min(1, -input.mouse.y)) * 0.55;
    }

    var targetRoll = Math.max(-CFG.maxRoll, Math.min(CFG.maxRoll, rollIn * CFG.maxRoll));
    var rollStep = CFG.rollRate * mushy * dt;
    f.roll += Math.max(-rollStep, Math.min(rollStep, targetRoll - f.roll));
    if (rollIn === 0 && Math.abs(f.roll) < 0.02) f.roll = 0;

    f.pitch += pitchIn * CFG.pitchRate * mushy * dt;
    f.pitch = Math.max(-0.9, Math.min(0.9, f.pitch));

    // yaw keys + coordinated turn from bank
    var yawIn = 0;
    if (input.isDown(K.yawLeft)) yawIn += 1;
    if (input.isDown(K.yawRight)) yawIn -= 1;
    f.heading += yawIn * CFG.yawRate * mushy * dt;
    f.heading += Math.sin(f.roll) * CFG.turnFactor * 9.81 /
      Math.max(f.speed, 25) * dt;

    // --- stall: below stall speed the nose drops and the plane sinks ---
    f.stalled = f.speed < CFG.stallSpeed && f.airborne;
    if (f.stalled) {
      f.pitch = Math.max(f.pitch - dt * 0.35, -0.45);
    }

    // --- buffet: hard pull at high speed shakes the wings ---
    f.buffeting = f.speed > CFG.buffetSpeed && Math.abs(pitchIn) > 0.4 && f.airborne;
    if (f.buffeting) {
      f.damage = Math.min(100, f.damage + dt * 2.5);
      f.pitch += (Math.random() - 0.5) * dt * 0.12;
    }

    // --- fuel ---
    if (f.airborne || f.speed > 5) {
      f.fuel -= (effThrottle * CFG.fuelBurn +
        (f.boosting ? CFG.boostBurn : 0)) * dt;
      if (f.fuel < 0) f.fuel = 0;
    }

    // --- motion ---
    var fwd = forwardVector(f);
    var sink = f.stalled ? (CFG.stallSpeed - f.speed) * 0.9 : 0;
    f.vy = fwd.y * f.speed - sink;
    f.pos.x += fwd.x * f.speed * dt;
    f.pos.z += fwd.z * f.speed * dt;
    f.pos.y += f.vy * dt;

    // --- ground / water ---
    var groundH = SR.heightAt(f.pos.x, f.pos.z);
    var overWater = groundH < 0.5;
    var gearY = groundH + CFG.gearHeight;
    var rw = CFG.runway;
    var onRunway = Math.abs(f.pos.x - rw.x) < rw.width / 2 + 4 &&
      Math.abs(f.pos.z - rw.z) < rw.length / 2 + 4;

    // ditching: the sea catches the plane before the sea floor does
    if (overWater && f.pos.y <= 1.0 && f.airborne) {
      f.crashed = true; f.crashCause = 'Ditched in the sea';
      return 'crash';
    }

    if (f.pos.y <= gearY) {
      if (overWater) {
        f.crashed = true; f.crashCause = 'Ditched in the sea';
        return 'crash';
      }
      if (!f.onGround) {
        // touchdown
        if (Math.abs(f.vy) > CFG.hardLandingVy || f.speed > 52 ||
            Math.abs(f.roll) > 0.35) {
          var hard = Math.abs(f.vy) - CFG.hardLandingVy;
          f.damage = Math.min(100, f.damage + Math.max(6, hard * 9) +
            Math.max(0, f.speed - 52) * 0.8);
          event = 'hard';
          if (f.damage >= 100) {
            f.crashed = true; f.crashCause = 'Broke apart on a hard landing';
            return 'crash';
          }
        } else {
          event = 'landed';
        }
        if (onRunway && Math.abs(f.vy) <= CFG.hardLandingVy) {
          f.landed = true;
        }
      }
      f.onGround = true;
      f.airborne = false;
      f.pos.y = gearY;
      f.pitch = 0;
      if (f.speed < 4) { f.speed = 0; f.roll = 0; }
      // rolling on the ground bleeds speed; takeoff needs speed + pull
      f.speed = Math.max(0, f.speed - dt * 6);
      if (f.speed > 30 && pitchIn > 0 && f.throttle > 0.5) {
        f.airborne = true; f.onGround = false; f.landed = false;
        f.pos.y = gearY + 0.5;
        event = 'takeoff';
      }
    } else {
      f.onGround = false;
      if (f.speed > CFG.stallSpeed * 0.8) f.airborne = true;
      // near-miss scrape: skimming terrain at speed damages the airframe
      var clearance = f.pos.y - groundH;
      if (f.airborne && clearance < CFG.scrapeDistance && clearance > 0) {
        f.damage = Math.min(100, f.damage + CFG.scrapeDamage * dt);
        event = 'scrape';
        if (f.damage >= 100) {
          f.crashed = true; f.crashCause = 'Clipped the terrain';
          return 'crash';
        }
      }
    }

    if (f.damage >= 100 && !f.crashed) {
      f.crashed = true; f.crashCause = 'Airframe gave out';
      return 'crash';
    }
    return event;
  }
  SR.stepFlight = stepFlight;
  SR.applyToMesh = applyToMesh;
})();
