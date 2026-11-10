(function () {
  "use strict";
  window.DIDS = window.DIDS || {};
  const routes = {
    Рио: [
      [5, 4],
      [9, 5],
      [14, 5],
      [14, 9],
      [23, 9],
      [23, 13],
    ],
    Атлас: [
      [6, 6],
      [14, 9],
      [14, 14],
      [18, 14],
      [23, 14],
    ],
    Спектр: [
      [23, 4],
      [14, 5],
      [14, 9],
      [14, 15],
      [23, 9],
    ],
    Полночь: [
      [23, 13],
      [23, 9],
      [23, 6],
      [23, 9],
      [23, 13],
    ],
  };
  const AI_SPECS = [
    ["Рио", "CAM10", 5.5, 4.5, 0.31],
    ["Атлас", "CAM15", 14.4, 12.5, 0.29],
    ["Спектр", "CAM14", 23.5, 4.5, 0.25],
    ["Полночь", "CAM16", 23.5, 13.5, 0.24],
  ];
  window.DIDS.createState = function () {
    return {
      running: false,
      over: false,
      p: {
        x: 23.5,
        y: 15.5,
        a: -Math.PI / 2,
        hp: 100,
        energy: 100,
        z: 0,
        vz: 0,
        inv: new Set(),
      },
      battery: 100,
      grid: false,
      door: false,
      monitor: false,
      cam: "CAM16",
      elapsed: 0,
      repair: 0,
      doorTimer: 0,
      ai: AI_SPECS.map(([name, cam, x, y, speed]) => ({
        name,
        cam,
        x,
        y,
        speed,
        route: routes[name].map((point) => [...point]),
        step: 0,
        path: [],
        repath: 0,
        alert: 0,
        lastSeen: null,
        mode: "PATROL",
      })),
      flashlight: false,
      flashCharge: 100,
      lookPitch: 0,
      noise: 0,
      detected: false,
      collected: new Set(),
      night: 1,
      log: [],
      reason: "",
      static: 0,
      damageCooldown: 0,
      lights: false,
    };
  };
})();
