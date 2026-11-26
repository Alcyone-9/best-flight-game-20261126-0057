// SKYLINE RIDGE — tuning constants and mission definitions.
// Every number the flight model, missions and world share lives here.
(function () {
  'use strict';
  var SR = window.SR = window.SR || {};

  SR.CONFIG = {
    // World
    worldSize: 2600,          // terrain plane, metres across
    islandRadius: 1050,       // island falls to sea at this radius
    seaLevel: 0,
    seed: 20261126,           // fixed seed: identical world every load

    // Flight model
    maxSpeed: 96,             // m/s at full throttle
    stallSpeed: 24,           // m/s — below this the nose drops
    cruiseSpeed: 58,
    accel: 14,                // m/s^2 toward throttle target speed
    maxRoll: 1.05,            // rad of bank
    rollRate: 2.2,            // rad/s toward target bank
    pitchRate: 0.85,          // rad/s
    yawRate: 0.35,            // rad/s from A/D keys
    turnFactor: 0.85,         // coordinated-turn strength
    buffetSpeed: 78,          // m/s — hard pull above this buffets
    gearHeight: 1.4,          // aircraft sits this high above ground

    // Fuel and damage
    fuelStart: 100,
    fuelBurn: 0.32,           // units/s at full throttle
    boostBurn: 0.55,          // extra units/s while boosting
    boostExtra: 0.35,         // throttle added by mouse click boost
    hardLandingVy: 6,         // m/s descent that starts hurting
    scrapeDistance: 5,        // m above terrain that counts as a scrape
    scrapeDamage: 6,          // damage/s while scraping

    // Runway (near the east coast, heading north)
    runway: { x: 640, z: 120, length: 320, width: 26, heading: 0 },

    // Camera
    chaseDistance: 15,
    chaseHeight: 4.6,
    camLag: 4.5,
  };

  // Mission definitions. Ring/gate positions are world coordinates.
  // Ring Run: 8 rings, coastal loop, 240 s.
  // Island Hop: 5 checkpoints, then land back on the runway.
  // Canyon Time Trial: 10 low gates through the valley, 180 s.
  SR.MISSIONS = [
    {
      id: 'rings',
      name: 'RING RUN',
      short: 'Fly the glowing rings in order, beat the clock.',
      timeLimit: 240,
      ringRadius: 13,
      rings: [
        [ 640,  55, -180], [ 420,  70, -520], [  60,  80, -640],
        [-380,  90, -480], [-640,  70, -120], [-520,  60,  320],
        [-140,  55,  560], [ 320,  60,  420],
      ],
    },
    {
      id: 'hop',
      name: 'ISLAND HOP',
      short: 'Visit all five checkpoints, then land on the runway.',
      timeLimit: 0,           // no clock — fly it clean
      ringRadius: 18,
      rings: [
        [ 640,  60, -260], [ -40,  95, -620], [-620,  80,  140],
        [-240,  70,  620], [ 420,  65,  540],
      ],
      landToFinish: true,
    },
    {
      id: 'canyon',
      name: 'CANYON TIME TRIAL',
      short: 'Low and fast through the valley gates. Stay under 90 m.',
      timeLimit: 180,
      ringRadius: 12,
      maxAlt: 90,
      rings: [
        [-260,  58, -360], [-330,  62, -180], [-300,  55,   20],
        [-380,  60,  200], [-330,  66,  380], [-260,  58,  540],
        [-160,  62,  660], [ -40,  55,  760], [ 120,  60,  700],
        [ 300,  58,  620],
      ],
    },
  ];

  SR.KEYS = {
    throttleUp: ['KeyW', 'ShiftLeft'],
    throttleDown: ['KeyS', 'ControlLeft'],
    pitchUp: ['ArrowUp'],
    pitchDown: ['ArrowDown'],
    rollLeft: ['ArrowLeft'],
    rollRight: ['ArrowRight'],
    yawLeft: ['KeyA'],
    yawRight: ['KeyD'],
    pause: ['KeyP', 'Escape'],
    restart: ['KeyR'],
    camera: ['KeyC'],
    mute: ['KeyM'],
    boost: ['Mouse0'],
  };
})();
