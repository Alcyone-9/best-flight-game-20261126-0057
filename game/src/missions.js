// SKYLINE RIDGE — missions: ring sequencing, scoring, timers.
// Rings light up in order; passing one chimes, scores, and (where the
// mission has a clock) adds time.
(function () {
  'use strict';
  var SR = window.SR = window.SR || {};

  function createMission(def) {
    return {
      def: def,
      index: 0,              // next ring to pass
      score: 0,
      timeLeft: def.timeLimit || 0,
      elapsed: 0,
      done: false,
      failed: false,
      passed: 0,
      ringsPassed: [],
    };
  }
  SR.createMission = createMission;

  function ringColor(state) {
    // 0 = upcoming, 1 = current, 2 = passed
    if (state === 1) return 0xff9a1f;   // bright orange — the target
    if (state === 2) return 0x2fd35a;   // green — cleared
    return 0x2e9fd8;                    // blue — waiting
  }

  function buildRings(scene, def) {
    var group = new THREE.Group();
    var meshes = [];
    var i, pos, mat, mesh;
    for (i = 0; i < def.rings.length; i += 1) {
      pos = def.rings[i];
      mat = new THREE.MeshBasicMaterial({
        color: ringColor(i === 0 ? 1 : 0),
        transparent: true, opacity: i === 0 ? 0.95 : 0.45,
      });
      mesh = new THREE.Mesh(new THREE.TorusGeometry(def.ringRadius, 1.1, 10, 40), mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      // face the ring toward the previous ring / start point
      var prev = i === 0 ? [640, 55, 120] : def.rings[i - 1];
      mesh.lookAt(prev[0], pos[1], prev[2]);
      group.add(mesh);
      meshes.push(mesh);
      // a small beacon pillar under each ring so it is findable from afar
      var beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, pos[1], 8),
        new THREE.MeshBasicMaterial({
          color: 0xffc46b, transparent: true, opacity: 0.16,
        })
      );
      beam.position.set(pos[0], pos[1] / 2, pos[2]);
      group.add(beam);
    }
    scene.add(group);
    return { group: group, meshes: meshes };
  }
  SR.buildRings = buildRings;

  function refreshRingColors(mission, meshes) {
    var i;
    for (i = 0; i < meshes.length; i += 1) {
      var state = i < mission.index ? 2 : (i === mission.index ? 1 : 0);
      meshes[i].material.color.setHex(ringColor(state));
      meshes[i].material.opacity = state === 1 ? 0.95 : (state === 2 ? 0.7 : 0.35);
    }
  }

  // Step the mission. Returns an event: '' | 'ring' | 'complete' | 'timeout'.
  function stepMission(mission, flight, meshes, dt) {
    if (mission.done || mission.failed) return '';
    var def = mission.def;
    mission.elapsed += dt;
    if (def.timeLimit > 0) {
      mission.timeLeft = Math.max(0, def.timeLimit - mission.elapsed);
      if (mission.timeLeft <= 0 && !mission.done) {
        mission.failed = true;
        return 'timeout';
      }
    }
    // canyon ceiling
    if (def.maxAlt && flight.pos.y > def.maxAlt && flight.airborne) {
      // no instant fail — the timer is the pressure; HUD warns instead
    }
    // next ring?
    if (mission.index < def.rings.length) {
      var r = def.rings[mission.index];
      var dx = flight.pos.x - r[0];
      var dy = flight.pos.y - r[1];
      var dz = flight.pos.z - r[2];
      var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < def.ringRadius * 0.95) {
        mission.index += 1;
        mission.passed += 1;
        mission.ringsPassed.push(mission.elapsed);
        mission.score += 100;
        if (def.timeLimit > 0) {
          mission.score += 25;             // time bonus per ring
          mission.elapsed -= 8;            // +8 s on the clock
        }
        refreshRingColors(mission, meshes);
        if (mission.index >= def.rings.length && !def.landToFinish) {
          mission.done = true;
          mission.score += Math.round(mission.timeLeft) * 2; // clock bonus
          return 'complete';
        }
        return 'ring';
      }
    } else if (def.landToFinish && flight.landed) {
      mission.done = true;
      mission.score += 250;                // clean landing bonus
      mission.score += Math.round(Math.max(0, 100 - flight.damage));
      return 'complete';
    }
    return '';
  }
  SR.stepMission = stepMission;
  SR.refreshRingColors = refreshRingColors;

  function missionStatusText(mission) {
    var def = mission.def;
    if (mission.done) return 'SORTIE COMPLETE';
    if (mission.failed) return 'TIME UP';
    if (def.landToFinish && mission.index >= def.rings.length) {
      return 'ALL CHECKPOINTS CLEAR — LAND ON THE RUNWAY';
    }
    return def.name + ' — RING ' + (mission.index + 1) + ' / ' + def.rings.length;
  }
  SR.missionStatusText = missionStatusText;

  function formatTime(seconds) {
    var s = Math.max(0, Math.ceil(seconds));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  SR.formatTime = formatTime;
})();
