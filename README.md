# SKYLINE RIDGE

![best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)
![rank](https://make.fun/badge/best-flight-game-20261126-0057/rank.svg)
![reward](https://make.fun/badge/best-flight-game-20261126-0057/reward.svg)

A complete original 3D flight game for the [make.fun best flight game bounty](https://make.fun/bounty/best-flight-game-20261126-0057). One island, one runway, three sorties — fly it like you mean it.

## The game

You fly a teal-and-cream prop plane over a procedurally built island: coastline and beach ring, inland hills, one big mountain, a river and a lake, scattered trees and rocky outcrops, drifting clouds, and a paved runway with threshold markings near the east coast. The world is seeded, so it is identical every load.

The flight model rewards throttle and turn discipline: lift depends on speed, below stall speed the nose drops and the controls go mushy, and a hard pull at full speed buffets the wings. Fuel burns with throttle — run dry and you glide. Hard landings and terrain scrapes add damage; 100% damage ends the flight. Ground collision and ditching in the sea are crashes; a gentle touchdown on the runway is a landing.

## Missions

1. **RING RUN** — thread 8 glowing rings in order against a 4-minute clock. Each ring chimes, scores +100, and adds 8 seconds.
2. **ISLAND HOP** — visit 5 checkpoints around the island, then land back on the runway. No clock; fly it clean.
3. **CANYON TIME TRIAL** — 10 low gates through the valley in 3 minutes. Stay under 90 m.

## Controls

| Input | Action |
|---|---|
| W / S (or Shift / Ctrl) | Throttle up / down |
| Arrow Up / Down | Pitch up / down |
| Arrow Left / Right | Bank left / right |
| A / D | Rudder (yaw) |
| Mouse | Steer toward the pointer (banks and pitches the plane) |
| Mouse click (hold) | Speed boost — burns extra fuel |
| C | Toggle chase / cockpit camera |
| P or Esc | Pause |
| R | Restart sortie |
| M | Mute |

## HUD

Altitude (ft), airspeed (kts), heading with a compass strip, an artificial horizon, throttle / fuel / damage bars, score, mission text, and a timer — all lit and readable in flight. Warnings call out stalls, wing buffet, low fuel, and the canyon ceiling.

## Sound

Everything is synthesised with WebAudio — no audio files. The engine hum follows the throttle, wind noise grows with speed, rings chime, and touchdowns thud.

## How to play

Serve `game/` with any static server and open `index.html` in a desktop browser:

```sh
cd game && python3 -m http.server 8000
```

Pick a sortie on the title screen (or press 1, 2, or 3), throttle up with W, pull up gently once you pass stall speed, and fly the rings. Land on the runway to finish the Island Hop.

## Structure

- `game/index.html` — page, canvas, HUD DOM, overlays, script tags
- `game/src/config.js` — all tuning constants and mission definitions
- `game/src/random.js` — seeded RNG and value noise
- `game/src/terrain.js` — heightmap island, sea, runway, trees, rocks, clouds, sky, sun
- `game/src/aircraft.js` — the plane, built from Three.js primitives
- `game/src/input.js` — keyboard + mouse state
- `game/src/flight.js` — flight model: lift, stall, buffet, fuel, damage, crash/landing
- `game/src/missions.js` — ring sequencing, scoring, timers
- `game/src/hud.js` — HUD updates: instruments, compass, horizon, bars
- `game/src/audio.js` — WebAudio synth: engine, wind, chime, thud
- `game/src/shots.js` — deterministic `?shot=` screenshot poses
- `game/src/main.js` — game loop, camera, state machine, wiring
- `game/vendor/three.min.js` — Three.js 0.149.0 (vendored library)

Three.js is the only library, vendored under `game/vendor/`. The game makes no network requests at runtime.

## License

MIT — see [LICENSE](LICENSE).
