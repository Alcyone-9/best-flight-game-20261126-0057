// SKYLINE RIDGE — the aircraft, built from Three.js primitives.
// Teal + cream livery with orange accents. Forward is local -Z.
(function () {
  'use strict';
  var SR = window.SR = window.SR || {};

  function buildAircraft() {
    var group = new THREE.Group();
    var teal = new THREE.MeshLambertMaterial({ color: 0x0f7d7a });
    var cream = new THREE.MeshLambertMaterial({ color: 0xf3ead2 });
    var orange = new THREE.MeshLambertMaterial({ color: 0xe86a1c });
    var dark = new THREE.MeshLambertMaterial({ color: 0x2b2f33 });
    var glass = new THREE.MeshLambertMaterial({ color: 0x1c3a4d });

    // fuselage: cream body with a teal belly stripe
    var fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.55, 6.4, 12), cream);
    fuselage.rotation.x = Math.PI / 2;
    group.add(fuselage);
    var nose = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 12), orange);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -4.0;
    group.add(nose);
    var belly = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 5.6), teal);
    belly.position.set(0, -0.72, 0.2);
    group.add(belly);

    // canopy: dark glass bubble
    var canopy = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 10), glass);
    canopy.scale.set(0.9, 0.75, 1.7);
    canopy.position.set(0, 0.62, -1.1);
    group.add(canopy);

    // main wing: teal, slightly swept, orange tips
    var wing = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.22, 2.3), teal);
    wing.position.set(0, 0.05, -0.3);
    group.add(wing);
    var tipL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.26, 2.3), orange);
    tipL.position.set(-5.6, 0.05, -0.3);
    group.add(tipL);
    var tipR = tipL.clone();
    tipR.position.x = 5.6;
    group.add(tipR);

    // tail: horizontal stabiliser + vertical fin
    var stab = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 1.4), teal);
    stab.position.set(0, 0.25, 3.0);
    group.add(stab);
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.0, 1.7), orange);
    fin.position.set(0, 1.05, 3.0);
    fin.rotation.x = 0.25;
    group.add(fin);

    // landing gear: three small wheels
    var wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 10);
    var wheelL = new THREE.Mesh(wheelGeo, dark);
    wheelL.rotation.z = Math.PI / 2;
    wheelL.position.set(-1.1, -1.05, -0.6);
    group.add(wheelL);
    var wheelR = wheelL.clone();
    wheelR.position.x = 1.1;
    group.add(wheelR);
    var wheelT = wheelL.clone();
    wheelT.position.set(0, -0.95, 2.6);
    group.add(wheelT);

    // propeller: hub + two blades, spins around Z at the nose.
    // At speed the blades blur into a faint disc (shown instead).
    var prop = new THREE.Group();
    var hub = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 10), dark);
    hub.rotation.x = -Math.PI / 2;
    prop.add(hub);
    var bladeMat = new THREE.MeshLambertMaterial({ color: 0x2b2f33 });
    var bladeGeo = new THREE.BoxGeometry(0.34, 3.0, 0.1);
    var blade1 = new THREE.Mesh(bladeGeo, bladeMat);
    prop.add(blade1);
    var blade2 = new THREE.Mesh(bladeGeo, bladeMat);
    blade2.rotation.z = Math.PI / 2;
    prop.add(blade2);
    var disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 28),
      new THREE.MeshBasicMaterial({
        color: 0x9aa4ab, transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    prop.add(disc);
    prop.position.z = -4.9;
    group.add(prop);

    // navigation lights: red port, green starboard, white tail
    function navLight(color, x, y, z) {
      var lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 8, 8),
        new THREE.MeshBasicMaterial({ color: color })
      );
      lamp.position.set(x, y, z);
      group.add(lamp);
      return lamp;
    }
    var lightL = navLight(0xff2a2a, -5.85, 0.05, -0.3);
    var lightR = navLight(0x2aff5a, 5.85, 0.05, -0.3);
    var lightT = navLight(0xffffff, 0, 0.35, 3.6);

    group.userData.prop = prop;
    group.userData.propBlades = [blade1, blade2];
    group.userData.propDisc = disc;
    group.userData.navLights = [lightL, lightR, lightT];
    return group;
  }
  SR.buildAircraft = buildAircraft;

  // Propeller spin follows throttle; at speed the blades blur into a disc.
  // Nav lights blink.
  function updateAircraft(aircraft, dt, throttle, time) {
    var prop = aircraft.userData.prop;
    if (prop) prop.rotation.z += dt * (4 + throttle * 55);
    var fast = throttle > 0.3;
    var blades = aircraft.userData.propBlades || [];
    var i;
    for (i = 0; i < blades.length; i += 1) blades[i].visible = !fast;
    if (aircraft.userData.propDisc) {
      aircraft.userData.propDisc.material.opacity = fast ? 0.16 : 0;
    }
    var lights = aircraft.userData.navLights || [];
    var on = (Math.floor(time * 1.4) % 2) === 0;
    for (i = 0; i < lights.length; i += 1) {
      lights[i].visible = on || i < 2;
    }
  }
  SR.updateAircraft = updateAircraft;
})();
