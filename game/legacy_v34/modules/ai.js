(function () {
  "use strict";
  window.DIDS = window.DIDS || {};
  window.DIDS.createAI = function ({ getGame, keys, world, report, onHit }) {
    const { lineOfSight, bfs, walk } = world;
    function updateAI(dt) {
      const game = getGame(),
        p = game.p;
      let alerted = false;
      for (const a of game.ai) {
        a.repath -= dt;
        const d = Math.hypot(a.x - p.x, a.y - p.y),
          visible = d < 7 && lineOfSight(a.x, a.y, p.x, p.y),
          crouch = keys.ControlLeft || keys.ControlRight || keys.KeyC,
          spotted =
            visible && d < (game.flashlight ? 7 : 4.7) && !(crouch && d > 2.5),
          heard = d < game.noise;
        if (spotted || heard) {
          a.alert = Math.min(8, a.alert + dt * (spotted ? 3 : 2));
          a.lastSeen = [p.x, p.y];
        } else a.alert = Math.max(0, a.alert - dt * 0.85);
        const chase = a.alert > 1.2 && a.lastSeen;
        a.mode = chase ? "SEARCH" : "PATROL";
        if (chase) alerted = true;
        let t = chase ? a.lastSeen : a.route[a.step];
        if (
          !chase &&
          Math.hypot(a.x - (t[0] + 0.5), a.y - (t[1] + 0.5)) < 0.75
        ) {
          a.step = (a.step + 1) % a.route.length;
          t = a.route[a.step];
          a.repath = 0;
        }
        if (a.repath <= 0 || !a.path.length) {
          a.path = bfs(a.x, a.y, t[0], t[1]);
          a.repath = chase ? 0.45 : 2.2;
        }
        if (a.path.length) {
          const dest = a.path[0],
            dx = dest[0] - a.x,
            dy = dest[1] - a.y,
            l = Math.hypot(dx, dy);
          if (l < 0.14) a.path.shift();
          else {
            const sp =
              a.speed * (chase ? 1.8 : 1) * (game.elapsed > 180 ? 1.12 : 1);
            walk(a, (dx / l) * sp * dt, (dy / l) * sp * dt, 0.22, true);
          }
        }
        if (chase && Math.hypot(a.x - t[0], a.y - t[1]) < 0.8 && !visible)
          a.alert = Math.max(0, a.alert - dt * 2);
        if (d < 0.64 && game.damageCooldown <= 0 && p.z < 0.13) {
          p.hp -= 27;
          game.damageCooldown = 1.6;
          report("Атака: " + a.name + "! -27 здоровья");
          onHit();
        }
      }
      if (alerted && !game.detected) report("Аниматроник обнаружил движение!");
      game.detected = alerted;
    }

    return updateAI;
  };
})();
