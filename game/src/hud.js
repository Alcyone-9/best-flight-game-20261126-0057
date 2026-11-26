// SKYLINE RIDGE — HUD: altitude, airspeed, heading, compass strip,
// artificial horizon, throttle / fuel / damage bars, score, mission, timer.
(function () {
  'use strict';
  var SR = window.SR = window.SR || {};

  var el = {};
  var horizonCtx = null;

  function initHud() {
    var ids = ['alt', 'spd', 'hdg', 'compass-strip', 'horizon',
      'throttle-fill', 'fuel-fill', 'damage-fill', 'score', 'mission',
      'timer', 'banner', 'warn', 'fuel-num', 'damage-num'];
    var i;
    for (i = 0; i < ids.length; i += 1) el[ids[i]] = document.getElementById(ids[i]);
    if (el.horizon) horizonCtx = el.horizon.getContext('2d');
  }
  SR.initHud = initHud;

  function drawHorizon(pitch, roll) {
    if (!horizonCtx) return;
    var c = horizonCtx, w = 140, h = 140;
    c.save();
    c.clearRect(0, 0, w, h);
    // round mask
    c.beginPath(); c.arc(w / 2, h / 2, 66, 0, Math.PI * 2); c.clip();
    c.translate(w / 2, h / 2);
    c.rotate(-roll);
    var pitchPx = Math.max(-60, Math.min(60, pitch * 90));
    // sky and ground
    c.fillStyle = '#3f8fd2'; c.fillRect(-80, -80 + pitchPx, 160, 80);
    c.fillStyle = '#7a5a34'; c.fillRect(-80, pitchPx, 160, 80);
    c.strokeStyle = '#ffffff'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-80, pitchPx); c.lineTo(80, pitchPx); c.stroke();
    c.restore();
    // fixed aircraft symbol
    c.strokeStyle = '#ffcf3f'; c.lineWidth = 3;
    c.beginPath();
    c.moveTo(w / 2 - 26, h / 2); c.lineTo(w / 2 - 8, h / 2);
    c.moveTo(w / 2 + 8, h / 2); c.lineTo(w / 2 + 26, h / 2);
    c.moveTo(w / 2, h / 2 - 4); c.lineTo(w / 2, h / 2 + 4);
    c.stroke();
    // rim
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2;
    c.beginPath(); c.arc(w / 2, h / 2, 67, 0, Math.PI * 2); c.stroke();
  }

  function drawCompass(headingDeg) {
    if (!el['compass-strip']) return;
    var strip = el['compass-strip'];
    var points = ['N', '30', '60', 'E', '120', '150', 'S', '210', '240', 'W', '300', '330'];
    var html = '';
    var i, deg, off;
    for (i = -2; i <= 2; i += 1) {
      deg = Math.round((headingDeg + i * 30) / 30) * 30;
      var norm = ((deg % 360) + 360) % 360;
      var label = points[Math.round(norm / 30) % 12];
      off = ((deg - headingDeg) / 30) * 44;
      html += '<span style="left:' + (50 + off) + '%">' + label + '</span>';
    }
    strip.innerHTML = html;
  }

  var bannerUntil = 0;
  function showBanner(text, seconds) {
    if (!el.banner) return;
    el.banner.textContent = text;
    el.banner.style.opacity = '1';
    bannerUntil = performance.now() + (seconds || 2.2) * 1000;
  }
  SR.showBanner = showBanner;

  function updateHud(f, mission, timeNow) {
    if (!el.alt) return;
    var altFt = Math.max(0, Math.round(f.pos.y * 3.281));
    var kts = Math.round(f.speed * 1.944);
    var hdg = Math.round(((f.heading * 180 / Math.PI) % 360 + 360) % 360);
    el.alt.textContent = altFt.toLocaleString('en-US') + ' ft';
    el.spd.textContent = kts + ' kt';
    el.hdg.textContent = (hdg < 100 ? (hdg < 10 ? '00' : '0') : '') + hdg + '°';
    drawCompass(hdg);
    drawHorizon(f.pitch, f.roll);
    el['throttle-fill'].style.width = Math.round(f.throttle * 100) + '%';
    el['fuel-fill'].style.width = Math.round(f.fuel) + '%';
    el['fuel-fill'].style.background = f.fuel < 20 ? '#e0483e' : '#3fce6d';
    el['fuel-num'].textContent = Math.round(f.fuel) + '%';
    el['damage-fill'].style.width = Math.round(f.damage) + '%';
    el['damage-num'].textContent = Math.round(f.damage) + '%';
    el.score.textContent = mission ? mission.score : 0;
    if (mission) {
      el.mission.textContent = SR.missionStatusText(mission);
      el.timer.textContent = mission.def.timeLimit > 0
        ? SR.formatTime(mission.timeLeft) : SR.formatTime(mission.elapsed);
      el.timer.style.color = mission.def.timeLimit > 0 && mission.timeLeft < 30
        ? '#ff6b5e' : '#eaf6ff';
    }
    // warnings
    var warn = '';
    if (f.stalled) warn = 'STALL — NOSE DOWN, ADD POWER';
    else if (f.buffeting) warn = 'WING BUFFET — EASE THE PULL';
    else if (f.fuel > 0 && f.fuel < 20) warn = 'LOW FUEL — FIND THE RUNWAY';
    else if (f.fuel <= 0) warn = 'FUEL EMPTY — GLIDING';
    else if (mission && mission.def.maxAlt && f.pos.y > mission.def.maxAlt && f.airborne) {
      warn = 'TOO HIGH — CANYON CEILING ' + Math.round(mission.def.maxAlt * 3.281) + ' FT';
    }
    el.warn.textContent = warn;
    el.warn.style.opacity = warn ? '1' : '0';
    if (timeNow > bannerUntil && el.banner) el.banner.style.opacity = '0';
  }
  SR.updateHud = updateHud;
})();
