(function () {
  "use strict";
  window.DIDS = window.DIDS || {};
  window.DIDS.createRendering = function ({
    getGame,
    getRenderer,
    world,
    keys,
    view,
    mini,
  }) {
    const { W, H, FOV, MAPW, MAPH } = window.DIDS.config;
    const { grid, props, areas } = world;
    const cx = view.getContext("2d", { alpha: false }),
      mx = mini.getContext("2d");
    let renderFrame = 0;
    const spriteImages = {};
    for (const [cam, file] of Object.entries({
      CAM10: "assets/CAM10_character.png",
      CAM13: "assets/CAM13_character.png",
      CAM14: "assets/CAM14_character.png",
      CAM15: "assets/CAM15_character.png",
      CAM16: "assets/CAM16_character.png",
    })) {
      let im = new Image();
      im.src = file;
      spriteImages[cam] = im;
    }
    const sprites = {};
    for (const type of [
      "crate",
      "barrel",
      "tool",
      "key",
      "fuse",
      "kit",
      "generator",
      "console",
    ]) {
      let c = document.createElement("canvas");
      c.width = 96;
      c.height = 128;
      let t = c.getContext("2d");
      const box = (col, x, y, w, h) => {
        t.fillStyle = col;
        t.fillRect(x, y, w, h);
      };
      if (type === "crate") {
        box("#48372c", 10, 43, 76, 70);
        box("#80634a", 13, 46, 68, 9);
        box("#a7835b", 15, 104, 67, 8);
        box("#967458", 15, 51, 7, 56);
        box("#967458", 73, 51, 7, 56);
        t.strokeStyle = "#bd9b68";
        t.lineWidth = 4;
        t.beginPath();
        t.moveTo(17, 51);
        t.lineTo(79, 103);
        t.moveTo(79, 51);
        t.lineTo(17, 103);
        t.stroke();
      }
      if (type === "barrel") {
        box("#263a3d", 15, 25, 66, 90);
        box("#6a3d35", 16, 33, 64, 18);
        box("#6a3d35", 16, 90, 64, 14);
        t.fillStyle = "#72898b";
        t.beginPath();
        t.ellipse(48, 25, 33, 10, 0, 0, Math.PI * 2);
        t.fill();
        box("#b6874d", 17, 56, 61, 3);
      }
      if (type === "tool") {
        box("#252f36", 13, 37, 70, 79);
        box("#657378", 12, 35, 72, 10);
        box("#354249", 13, 60, 70, 5);
        box("#354249", 13, 83, 70, 5);
        for (let i = 0; i < 3; i++) box("#a48965", 41, 55 + i * 24, 15, 3);
      }
      if (type === "key") {
        t.strokeStyle = "#d5bc71";
        t.lineWidth = 8;
        t.beginPath();
        t.arc(48, 44, 19, 0, Math.PI * 2);
        t.moveTo(48, 64);
        t.lineTo(48, 115);
        t.lineTo(62, 115);
        t.moveTo(48, 91);
        t.lineTo(64, 91);
        t.stroke();
      }
      if (type === "fuse") {
        box("#e3e9cc", 28, 35, 40, 78);
        box("#ba7d30", 24, 30, 48, 12);
        box("#ba7d30", 24, 105, 48, 12);
        box("#a5c6cd", 35, 47, 26, 46);
      }
      if (type === "kit") {
        box("#a9aaa5", 15, 50, 66, 58);
        box("#b74f43", 43, 56, 10, 46);
        box("#b74f43", 26, 74, 45, 10);
        box("#536365", 30, 40, 36, 11);
      }
      if (type === "generator") {
        box("#2b3536", 8, 36, 80, 84);
        box("#8a7443", 8, 31, 80, 12);
        box("#ba9b5b", 23, 58, 50, 17);
        box("#8fa396", 26, 84, 17, 13);
        box("#8c4641", 52, 84, 17, 13);
      }
      if (type === "console") {
        box("#32413f", 12, 35, 72, 81);
        box("#4e6460", 9, 32, 78, 16);
        box("#171f20", 22, 53, 52, 32);
        box("#92d8bd", 28, 58, 25, 7);
        box("#b48360", 38, 99, 26, 9);
      }
      sprites[type] = c;
    }
    function renderWorld() {
      const game = getGame(),
        renderer3d = getRenderer();
      if (renderer3d) {
        renderer3d.draw(game);
        return;
      }
      const p = game.p;
      let img = cx.createLinearGradient(0, 0, 0, H);
      img.addColorStop(0, game.grid ? "#18242a" : "#0b131a");
      img.addColorStop(0.51, "#20282d");
      img.addColorStop(0.51, "#191c1b");
      img.addColorStop(1, "#0d1213");
      cx.fillStyle = img;
      cx.fillRect(0, 0, W, H);
      let zbuff = new Float32Array(W),
        pitch =
          p.z * 88 +
          (keys.ControlLeft || keys.ControlRight || keys.KeyC ? 23 : 0);
      for (let x = 0; x < W; x += 2) {
        let ang = p.a + Math.atan(((2 * x) / W - 1) * Math.tan(FOV / 2)),
          dirx = Math.cos(ang),
          diry = Math.sin(ang),
          mapx = Math.floor(p.x),
          mapy = Math.floor(p.y),
          deltaX = Math.abs(1 / (dirx || 0.00001)),
          deltaY = Math.abs(1 / (diry || 0.00001)),
          stepx = dirx < 0 ? -1 : 1,
          stepy = diry < 0 ? -1 : 1,
          sdx = dirx < 0 ? (p.x - mapx) * deltaX : (mapx + 1 - p.x) * deltaX,
          sdy = diry < 0 ? (p.y - mapy) * deltaY : (mapy + 1 - p.y) * deltaY,
          side = 0,
          hit = 0;
        for (let n = 0; n < 48; n++) {
          if (sdx < sdy) {
            sdx += deltaX;
            mapx += stepx;
            side = 0;
          } else {
            sdy += deltaY;
            mapy += stepy;
            side = 1;
          }
          if (
            mapx < 0 ||
            mapy < 0 ||
            mapx >= MAPW ||
            mapy >= MAPH ||
            grid[mapy][mapx]
          ) {
            hit = 1;
            break;
          }
        }
        let perp =
          side === 0
            ? (mapx - p.x + (1 - stepx) / 2) / (dirx || 0.001)
            : (mapy - p.y + (1 - stepy) / 2) / (diry || 0.001);
        perp = Math.max(0.03, perp * Math.cos(ang - p.a));
        zbuff[x] = zbuff[x + 1] = perp;
        const height = Math.min(H * 3, H / perp),
          top = H / 2 - height / 2 + pitch,
          texcoord = side === 0 ? p.y + perp * diry : p.x + perp * dirx,
          brick = Math.floor((((texcoord % 1) + 1) % 1) * 7),
          stripe = brick % 4 === 0 ? 9 : 0,
          light =
            Math.max(0, 65 - perp * 7) +
            (game.flashlight
              ? Math.max(0, 68 - perp * 14) *
                Math.max(0, 1 - Math.abs(x - W / 2) / (W * 0.48))
              : 0),
          base = side === 0 ? 35 : 28,
          metal = (mapx + mapy) % 7 === 0;
        cx.fillStyle = `rgb(${Math.floor(base + light * 0.44 + stripe)},${Math.floor(base + light * 0.56 + stripe)},${Math.floor(base + light * 0.59 + stripe)})`;
        cx.fillRect(x, Math.floor(top), 2, Math.ceil(height));
        let fog = Math.min(0.69, Math.max(0, perp - 3) * 0.06);
        cx.fillStyle = `rgba(8,13,17,${fog})`;
        cx.fillRect(x, Math.floor(top), 2, Math.ceil(height));
        if (height > 6) {
          cx.fillStyle = metal ? "#6b5848" : "#1d2226";
          cx.fillRect(
            x,
            Math.floor(top + height * 0.18),
            2,
            Math.max(1, height * 0.012),
          );
          cx.fillRect(
            x,
            Math.floor(top + height * 0.71),
            2,
            Math.max(1, height * 0.009),
          );
          if ((brick === 0 || brick === 6) && height > 65) {
            cx.fillStyle = "#6e6960";
            cx.fillRect(x, top + height * 0.35, 2, height * 0.015);
          }
        }
        if (perp < 6) {
          const floorTop = Math.max(H / 2, top + height),
            f = Math.min(0.18, (6 - perp) * 0.023);
          cx.fillStyle = `rgba(122,144,150,${f})`;
          cx.fillRect(x, floorTop, 2, H - floorTop);
        }
      }
      let entries = [];
      for (const prop of props) {
        if (game.collected.has(prop.type)) continue;
        entries.push({
          ...prop,
          icon: sprites[prop.type],
          size:
            prop.type === "generator"
              ? 1.2
              : prop.type === "console"
                ? 1.05
                : prop.type === "key" ||
                    prop.type === "fuse" ||
                    prop.type === "kit"
                  ? 0.65
                  : 0.85,
        });
      }
      for (const ai of game.ai)
        entries.push({
          x: ai.x,
          y: ai.y,
          icon: spriteImages[ai.cam],
          size: 1.45,
          enemy: 1,
        });
      entries.sort(
        (a, b) =>
          Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y),
      );
      for (const item of entries) {
        let dist = Math.hypot(item.x - p.x, item.y - p.y),
          angle = Math.atan2(item.y - p.y, item.x - p.x) - p.a;
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        if (Math.abs(angle) > FOV * 0.67 || dist < 0.12) continue;
        const zz = dist * Math.cos(angle),
          screenX = W / 2 + ((Math.tan(angle) / Math.tan(FOV / 2)) * W) / 2,
          sh = (H / zz) * item.size,
          sw = sh * (item.enemy ? 0.58 : 0.73),
          left = screenX - sw / 2,
          top = H / 2 + H / (2 * zz) - sh + pitch,
          im = item.icon;
        if (!im || (im instanceof HTMLImageElement && !im.complete)) continue;
        for (
          let sx = Math.max(0, Math.floor(left));
          sx < Math.min(W, Math.ceil(left + sw));
          sx += 2
        ) {
          if (zz > zbuff[sx] - 0.18) continue;
          let u = (sx - left) / sw;
          try {
            cx.drawImage(
              im,
              Math.max(0, Math.floor(u * im.width)),
              0,
              Math.max(1, Math.ceil((2 / sw) * im.width)),
              im.height,
              sx,
              top,
              2,
              sh,
            );
          } catch (e) {}
        }
      }
      // vignette + crosshair + soft film grain
      let grad = cx.createRadialGradient(
        W / 2,
        H / 2,
        45,
        W / 2,
        H / 2,
        W * 0.59,
      );
      grad.addColorStop(0, "#0000");
      grad.addColorStop(1, "#000a");
      cx.fillStyle = grad;
      cx.fillRect(0, 0, W, H);
      cx.strokeStyle = "#cee3d880";
      cx.lineWidth = 1;
      cx.beginPath();
      cx.moveTo(W / 2 - 6, H / 2);
      cx.lineTo(W / 2 - 2, H / 2);
      cx.moveTo(W / 2 + 2, H / 2);
      cx.lineTo(W / 2 + 6, H / 2);
      cx.moveTo(W / 2, H / 2 - 6);
      cx.lineTo(W / 2, H / 2 - 2);
      cx.moveTo(W / 2, H / 2 + 2);
      cx.lineTo(W / 2, H / 2 + 6);
      cx.stroke();
    }
    function renderMap() {
      const game = getGame();
      mx.fillStyle = "#071116";
      mx.fillRect(0, 0, 290, 200);
      const unit = 8.4,
        ox = 23,
        oy = 14;
      for (let y = 0; y < MAPH; y++)
        for (let x = 0; x < MAPW; x++) {
          mx.fillStyle = grid[y][x] ? "#37484b" : "#10272c";
          mx.fillRect(ox + x * unit, oy + y * unit, unit - 0.6, unit - 0.6);
        }
      for (const [cam, x1, y1, x2, y2] of areas) {
        mx.strokeStyle = "#678c82";
        mx.strokeRect(
          ox + x1 * unit,
          oy + y1 * unit,
          (x2 - x1 + 1) * unit,
          (y2 - y1 + 1) * unit,
        );
        mx.fillStyle = "#b5d8c0";
        mx.font = "9px monospace";
        mx.fillText(
          cam.replace("CAM", ""),
          ox + (x1 + 1) * unit,
          oy + (y1 + 1.5) * unit,
        );
      }
      if (game.door) {
        mx.fillStyle = "#e6a171";
        mx.fillRect(ox + 23 * unit, oy + 11 * unit, unit, unit);
      }
      for (const a of game.ai) {
        mx.fillStyle = "#d67770";
        mx.beginPath();
        mx.arc(ox + a.x * unit, oy + a.y * unit, 3.2, 0, Math.PI * 2);
        mx.fill();
      }
      const p = game.p;
      mx.fillStyle = "#a7f5c7";
      mx.beginPath();
      mx.arc(ox + p.x * unit, oy + p.y * unit, 4.5, 0, Math.PI * 2);
      mx.fill();
      mx.strokeStyle = "#a7f5c7";
      mx.beginPath();
      mx.moveTo(ox + p.x * unit, oy + p.y * unit);
      mx.lineTo(
        ox + (p.x + Math.cos(p.a) * 1.6) * unit,
        oy + (p.y + Math.sin(p.a) * 1.6) * unit,
      );
      mx.stroke();
    }
    function draw() {
      const game = getGame();
      if (!game) return;
      if (!game.monitor) renderWorld();
      if (renderFrame++ % 3 === 0) renderMap();
    }

    return draw;
  };
})();
