(function () {
  "use strict";
  window.DIDS = window.DIDS || {};
  window.DIDS.cameraState = function (game, cam, world) {
    const { inRoom, areas } = world;
    if (game.battery <= 0) return 8;
    let enemies = game.ai.filter((a) => inRoom(a.x, a.y) === cam);
    if (!enemies.length) return 0;
    let a = enemies[0],
      area = areas.find((r) => r[0] === cam),
      mid = [(area[1] + area[3]) / 2, (area[2] + area[4]) / 2];
    let dis = Math.hypot(a.x - mid[0], a.y - mid[1]);
    if (cam === "CAM16" && Math.hypot(a.x - 24.7, a.y - 15.2) < 2.1) return 9;
    return dis < 1.5 ? 3 : a.x < mid[0] ? 2 : 4;
  };
})();
