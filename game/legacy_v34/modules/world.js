(function () {
  "use strict";
  window.DIDS = window.DIDS || {};
  window.DIDS.createWorld = function (getGame) {
    const { MAPW, MAPH } = window.DIDS.config;
    const grid = Array.from({ length: MAPH }, () => Array(MAPW).fill(1));
    function carve(x1, y1, x2, y2) {
      for (let y = y1; y <= y2; y++)
        for (let x = x1; x <= x2; x++) grid[y][x] = 0;
    }
    carve(2, 2, 8, 7);
    carve(11, 2, 17, 7);
    carve(20, 2, 26, 7);
    carve(11, 11, 17, 17);
    carve(20, 11, 26, 17);
    carve(3, 8, 25, 10);
    carve(13, 8, 15, 17);
    carve(22, 8, 24, 17);
    carve(8, 4, 11, 5);
    carve(17, 4, 20, 5);
    carve(17, 13, 22, 14);
    const areas = [
      ["CAM10", 2, 2, 8, 7],
      ["CAM13", 11, 2, 17, 7],
      ["CAM14", 20, 2, 26, 7],
      ["CAM15", 11, 11, 17, 17],
      ["CAM16", 20, 11, 26, 17],
    ];
    const props = [
      { type: "crate", x: 4.4, y: 3.5 },
      { type: "crate", x: 6.7, y: 6.1 },
      { type: "tool", x: 12.4, y: 4.0 },
      { type: "crate", x: 16.5, y: 6.1 },
      { type: "tool", x: 21.3, y: 3.8 },
      { type: "crate", x: 25.6, y: 6.3 },
      { type: "barrel", x: 12.3, y: 16.6 },
      { type: "tool", x: 16.5, y: 12.8 },
      { type: "barrel", x: 21.1, y: 16.6 },
      { type: "crate", x: 26.1, y: 13.6 },
      { type: "key", x: 5.4, y: 5.3 },
      { type: "fuse", x: 15.2, y: 4.4 },
      { type: "kit", x: 21.5, y: 5.5 },
      { type: "generator", x: 14.1, y: 14.6 },
      { type: "console", x: 24.7, y: 15.2 },
    ];
    const SOLID = new Set(["crate", "barrel", "tool"]);
    function blocked(x, y, rad = 0.17, actor = false) {
      if (x < 1 || y < 1 || x >= MAPW - 1 || y >= MAPH - 1) return true;
      for (const [sx, sy] of [
        [-rad, -rad],
        [rad, -rad],
        [-rad, rad],
        [rad, rad],
      ]) {
        if (grid[Math.floor(y + sy)][Math.floor(x + sx)]) return true;
        if (
          getGame().door &&
          actor &&
          Math.floor(x + sx) === 23 &&
          Math.floor(y + sy) === 11
        )
          return true;
      }
      for (const prop of props) {
        if (
          SOLID.has(prop.type) &&
          Math.abs(prop.x - x) < 0.44 + rad &&
          Math.abs(prop.y - y) < 0.44 + rad
        )
          return true;
      }
      if (actor && getGame().door && Math.hypot(x - 24.7, y - 15.2) < 2.15)
        return true;
      return false;
    }
    function inRoom(x, y) {
      let a = areas.find(
        ([, x1, y1, x2, y2]) =>
          x >= x1 && x <= x2 + 1 && y >= y1 && y <= y2 + 1,
      );
      return a ? a[0] : "PASSAGE";
    }
    function walk(p, dx, dy, rad = 0.2, actor = false) {
      if (!blocked(p.x + dx, p.y, rad, actor)) p.x += dx;
      if (!blocked(p.x, p.y + dy, rad, actor)) p.y += dy;
    }
    function bfs(sx, sy, tx, ty, door = true) {
      sx = Math.floor(sx);
      sy = Math.floor(sy);
      tx = Math.floor(tx);
      ty = Math.floor(ty);
      if (sx === tx && sy === ty) return [];
      const todo = [[sx, sy]],
        seen = new Set([sx + "," + sy]),
        par = new Map();
      let found = false;
      while (todo.length) {
        let [x, y] = todo.shift();
        for (let [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          let nx = x + dx,
            ny = y + dy,
            k = nx + "," + ny;
          if (
            nx < 1 ||
            nx >= MAPW - 1 ||
            ny < 1 ||
            ny >= MAPH - 1 ||
            grid[ny][nx] ||
            seen.has(k) ||
            (door &&
              getGame().door &&
              Math.hypot(nx + 0.5 - 24.7, ny + 0.5 - 15.2) < 2.15) ||
            props.some(
              (o) =>
                SOLID.has(o.type) &&
                Math.floor(o.x) === nx &&
                Math.floor(o.y) === ny,
            )
          )
            continue;
          seen.add(k);
          par.set(k, [x, y]);
          if (nx === tx && ny === ty) {
            found = true;
            break;
          }
          todo.push([nx, ny]);
        }
        if (found) break;
      }
      if (!found) return [];
      let path = [],
        cur = [tx, ty];
      while (cur[0] !== sx || cur[1] !== sy) {
        path.push([cur[0] + 0.5, cur[1] + 0.5]);
        cur = par.get(cur.join(","));
        if (!cur) return [];
      }
      return path.reverse();
    }
    function lineOfSight(x1, y1, x2, y2) {
      const d = Math.hypot(x2 - x1, y2 - y1),
        n = Math.max(1, Math.ceil(d / 0.12));
      for (let i = 1; i < n; i++) {
        const x = x1 + ((x2 - x1) * i) / n,
          y = y1 + ((y2 - y1) * i) / n;
        if (
          grid[Math.floor(y)]?.[Math.floor(x)] ||
          props.some(
            (o) => SOLID.has(o.type) && Math.hypot(o.x - x, o.y - y) < 0.32,
          )
        )
          return false;
      }
      return true;
    }
    return {
      grid,
      props,
      areas,
      SOLID,
      carve,
      blocked,
      inRoom,
      walk,
      bfs,
      lineOfSight,
    };
  };
})();
