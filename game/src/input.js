// SKYLINE RIDGE — keyboard + mouse state, one shared input object.
(function () {
  'use strict';
  var SR = window.SR = window.SR || {};

  var keys = {};
  var mouse = { x: 0, y: 0, down: false, active: false };
  var pressed = {};   // edge-triggered keys, consumed by the loop

  function isDown(list) {
    var i;
    for (i = 0; i < list.length; i += 1) if (keys[list[i]]) return true;
    return false;
  }

  function initInput(canvas) {
    window.addEventListener('keydown', function (e) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) {
        e.preventDefault();
      }
      if (!keys[e.code]) pressed[e.code] = true;
      keys[e.code] = true;
    });
    window.addEventListener('keyup', function (e) {
      keys[e.code] = false;
    });
    window.addEventListener('blur', function () {
      keys = {};
      mouse.down = false;
    });
    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      mouse.active = true;
    });
    canvas.addEventListener('mousedown', function (e) {
      if (e.button === 0) { mouse.down = true; mouse.active = true; }
    });
    window.addEventListener('mouseup', function () { mouse.down = false; });
  }

  function wasPressed(code) {
    if (pressed[code]) { pressed[code] = false; return true; }
    return false;
  }

  function endFrame() { pressed = {}; }

  SR.Input = {
    init: initInput,
    keys: keys,
    mouse: mouse,
    isDown: isDown,
    wasPressed: wasPressed,
    endFrame: endFrame,
  };
})();
