"use strict";
const {
  W,
  H,
  FOV,
  MAPW,
  MAPH,
  DAY_SECONDS,
  CAMS,
  NAMES,
  STATE_FILES,
  STATE_NAMES,
} = window.DIDS.config;
const $ = (id) => document.getElementById(id),
  view = $("view"),
  mini = $("map"),
  camIMG = $("cameraImage");
const world = window.DIDS.createWorld(() => game);
const {
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
} = world;
const keys = {},
  POINTER_SPEED = 0.0025;
let last = 0,
  game,
  touchMove = { x: 0, y: 0 },
  lastTouchX = null;
let renderer3d = null;
function init() {
  $("camera").classList.remove("visible");
  document.body.classList.remove("monitoring");
  game = window.DIDS.createState();
  $("modal").classList.remove("hide");
  $("modalTitle").textContent = "ОСТРОВ МЕЧТЫ · НОЧЬ 1";
  $("modalBody").textContent =
    "Обходите пять помещений от первого лица. Найдите ключ и предохранитель, запустите генератор в CAM-15 и переживите смену до 07:00. Камеры работают от резервного питания. Электричество в парке отключено.";
  $("startBtn").textContent = "НАЧАТЬ НОЧЬ";
  camIMG.removeAttribute("src");
  renderCamera();
  report("Вы на посту охраны.");
  hud();
}
function report(s) {
  game.log.unshift(`[${timeText()}] ${s}`);
  game.log = game.log.slice(0, 7);
  $("events").textContent = game.log.join("\n");
}
function timeText() {
  let m = Math.min(420, Math.floor((game.elapsed / DAY_SECONDS) * 420));
  return (
    String(Math.floor(m / 60)).padStart(2, "0") +
    ":" +
    String(m % 60).padStart(2, "0")
  );
}
const updateAI = window.DIDS.createAI({
  getGame: () => game,
  keys,
  world,
  report,
  onHit() {
    $("hit").classList.add("active");
    setTimeout(() => $("hit").classList.remove("active"), 250);
  },
});
function nearProp(type, d = 1.1) {
  return props.find(
    (a) => a.type === type && Math.hypot(a.x - game.p.x, a.y - game.p.y) < d,
  );
}
function interact() {
  if (!game.running || game.monitor) return;
  let nearest = props
    .filter(
      (o) =>
        ["key", "fuse", "kit"].includes(o.type) &&
        !game.collected.has(o.type) &&
        Math.hypot(o.x - game.p.x, o.y - game.p.y) < 1.05,
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - game.p.x, a.y - game.p.y) -
        Math.hypot(b.x - game.p.x, b.y - game.p.y),
    )[0];
  if (nearest) {
    game.collected.add(nearest.type);
    game.p.inv.add(nearest.type);
    if (nearest.type === "kit") {
      game.p.hp = Math.min(100, game.p.hp + 35);
      report("Аптечка: здоровье восстановлено");
    } else
      report(
        nearest.type === "key"
          ? "Найден ключ от генераторной"
          : "Найден предохранитель",
      );
    return;
  }
  if (nearProp("generator", 1.4)) {
    if (!game.p.inv.has("key") || !game.p.inv.has("fuse")) {
      report("Генератор: необходимы ключ и предохранитель");
      return;
    }
    return;
  }
  if (nearProp("console", 1.6)) {
    game.door = !game.door;
    report(game.door ? "Шлюз закрыт" : "Шлюз открыт");
    return;
  }
  report("Ничего доступного рядом");
}
function finish(win, why) {
  game.running = false;
  game.over = true;
  game.monitor = false;
  $("camera").classList.remove("visible");
  $("modal").classList.remove("hide");
  $("modalTitle").textContent = win
    ? "07:00 · СМЕНА ЗАВЕРШЕНА"
    : "НОЧЬ ПРОВАЛЕНА";
  $("modalBody").textContent = why;
  $("startBtn").textContent = "НАЧАТЬ ЗАНОВО";
  document.exitPointerLock?.();
}
function update(dt) {
  if (!game.running) return;
  dt = Math.min(0.05, dt);
  const p = game.p;
  game.elapsed += dt;
  game.damageCooldown = Math.max(0, game.damageCooldown - dt);
  game.static = Math.max(0, game.static - dt);
  if (!game.monitor) {
    let fw =
        Number(!!(keys.KeyW || keys.ArrowUp)) -
        Number(!!(keys.KeyS || keys.ArrowDown)),
      strafe = Number(!!keys.KeyD) - Number(!!keys.KeyA);
    fw += -touchMove.y;
    strafe += touchMove.x;
    const norm = Math.max(1, Math.hypot(fw, strafe));
    let crouch = keys.ControlLeft || keys.ControlRight || keys.KeyC,
      run = (keys.ShiftLeft || keys.ShiftRight) && p.energy > 2 && !crouch;
    let speed = crouch ? 1.15 : run ? 3.35 : 2.15;
    let vx =
        ((Math.cos(p.a) * fw - Math.sin(p.a) * strafe) / norm) * speed * dt,
      vy = ((Math.sin(p.a) * fw + Math.cos(p.a) * strafe) / norm) * speed * dt;
    walk(p, vx, vy);
    game.noise =
      Math.hypot(fw, strafe) > 0.1 ? (run ? 6.7 : crouch ? 1.05 : 3.25) : 0.2;
    if (game.flashlight) {
      game.flashCharge = Math.max(0, game.flashCharge - dt * 1.45);
      if (game.flashCharge === 0) game.flashlight = false;
    } else game.flashCharge = Math.min(100, game.flashCharge + dt * 0.12);
    p.energy = Math.max(
      0,
      Math.min(100, p.energy + (run && (fw || strafe) ? -25 : 16) * dt),
    );
    if (keys.ArrowLeft) p.a -= 1.8 * dt;
    if (keys.ArrowRight) p.a += 1.8 * dt;
    if (p.z > 0 || p.vz > 0) {
      p.z = Math.max(0, p.z + p.vz * dt);
      p.vz -= 11 * dt;
      if (p.z === 0) p.vz = 0;
    }
    if (
      keys.KeyE &&
      nearProp("generator", 1.4) &&
      p.inv.has("fuse") &&
      p.inv.has("key") &&
      !game.grid
    ) {
      game.repair = Math.min(100, game.repair + dt * 16);
      if (game.repair === 100) {
        game.grid = true;
        game.battery = Math.min(100, game.battery + 30);
        report("Центральное питание восстановлено. Вывески включены!");
      }
    }
  }
  game.battery = Math.max(
    0,
    game.battery -
      dt * (game.grid ? 0.028 : 0.045) +
      (game.monitor ? -0.085 * dt : 0) +
      (game.door ? -0.17 * dt : 0),
  );
  updateAI(dt);
  if (game.battery === 0) {
    finish(false, "Резервная батарея разрядилась, охрана осталась без связи.");
    return;
  }
  if (p.hp <= 0) {
    finish(false, "Аниматроники нашли охранника.");
    return;
  }
  if (game.elapsed >= DAY_SECONDS) {
    finish(
      game.grid,
      game.grid
        ? "Генератор запущен. Вы продержались до 07:00!"
        : "Наступило 07:00, но питание парка так и не восстановлено.",
    );
    return;
  }
  hud();
}
function showMonitor() {
  if (!game.running) return;
  if (game.monitor) {
    game.monitor = false;
    $("camera").classList.remove("visible");
    camIMG.removeAttribute("src");
    document.body.classList.remove("monitoring");
  } else {
    if (game.battery <= 1) return;
    game.monitor = true;
    $("camera").classList.add("visible");
    document.body.classList.add("monitoring");
    document.exitPointerLock?.();
    renderCamera();
  }
  hud();
}
function chooseCam(i) {
  if (!game.monitor || i < 0 || i >= 5) return;
  game.cam = CAMS[i];
  game.static = 0.3;
  renderCamera();
}
function renderCamera() {
  if (!game.monitor) return;
  const id = game.cam,
    s = window.DIDS.cameraState(game, id, world),
    path = STATE_FILES[id][s];
  if (camIMG.getAttribute("src") !== path) camIMG.src = path;
  $("camName").textContent = id + " · " + NAMES[id];
  $("camState").textContent = STATE_NAMES[id][s] + " · " + timeText();
  document
    .querySelectorAll("[data-camera]")
    .forEach((e) => e.classList.toggle("current", e.dataset.camera === id));
}
function hud() {
  if (!game) return;
  $("clock").textContent = timeText();
  $("battery").textContent = Math.ceil(game.battery) + "%";
  $("power").textContent = game.grid ? "ВОССТАНОВЛЕНА" : "ОТКЛЮЧЕНА";
  $("hp").textContent = Math.max(0, Math.ceil(game.p.hp)) + "%";
  $("stamina").textContent = Math.ceil(game.p.energy) + "%";
  $("stealth").textContent = game.detected ? "ОБНАРУЖЕН" : "СКРЫТ";
  $("flashCharge").textContent = Math.ceil(game.flashCharge) + "%";
  $("loc").textContent =
    NAMES[inRoom(game.p.x, game.p.y)] || "Служебный переход";
  $("items").textContent = ["key", "fuse"]
    .map((v) =>
      game.p.inv.has(v)
        ? v === "key"
          ? "Ключ ✓"
          : "Предохранитель ✓"
        : v === "key"
          ? "Ключ —"
          : "Предохранитель —",
    )
    .join(" · ");
  $("task").textContent = game.grid
    ? "Питание восстановлено. Доживите до 07:00."
    : `Найдите ключ и предохранитель, запустите генератор (CAM-15). ${Math.floor(game.repair)}%`;
  $("monitorBtn").textContent = game.monitor
    ? "ЗАКРЫТЬ ПЛАНШЕТ [M]"
    : "ПЛАНШЕТ CCTV [M]";
  $("interactTip").textContent = nearProp("generator", 1.4)
    ? "Удерживайте E для запуска генератора"
    : nearProp("console", 1.6)
      ? "E — закрыть / открыть шлюз"
      : "E — подобрать / использовать";
  if (game.monitor) renderCamera();
}
const draw = window.DIDS.createRendering({
  getGame: () => game,
  getRenderer: () => renderer3d,
  world,
  keys,
  view,
  mini,
});
const metrics = window.DIDS.createMetrics();
function frame(t) {
  const begin = performance.now();
  const interval = last ? t - last : 0;
  update(interval / 1000);
  const updated = performance.now();
  last = t;
  draw();
  metrics.record(interval, updated - begin, performance.now() - updated);
  requestAnimationFrame(frame);
}
window.__DIDS_PERF__ = {
  reset: () => metrics.reset(),
  snapshot: () => ({
    ...metrics.snapshot(),
    renderer: renderer3d ? "webgl" : "canvas2d",
  }),
};
function start() {
  if (game.over) init();
  game.running = true;
  $("modal").classList.add("hide");
  view.focus();
  report("Смена началась. Ищите предметы.");
  hud();
}
window.addEventListener("keydown", (e) => {
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
      e.code,
    )
  )
    e.preventDefault();
  keys[e.code] = true;
  if (!game.running) return;
  if (e.repeat && ["KeyM", "KeyF", "KeyR", "Space", "KeyE"].includes(e.code))
    return;
  if (e.code === "KeyM") showMonitor();
  if (e.code === "KeyL" && !game.monitor && game.flashCharge > 0)
    game.flashlight = !game.flashlight;
  if (e.code === "KeyE") interact();
  if (e.code === "KeyF" && nearProp("console", 1.6)) interact();
  if (e.code === "KeyR") {
    init();
    start();
  }
  if (
    e.code === "Space" &&
    !game.monitor &&
    game.p.z === 0 &&
    game.p.energy > 13
  ) {
    game.p.z = 0.02;
    game.p.vz = 4.3;
    game.p.energy -= 13;
  }
  if (game.monitor && e.code.startsWith("Digit"))
    chooseCam(+e.code.slice(-1) - 1);
});
window.addEventListener("keyup", (e) => (keys[e.code] = false));
window.addEventListener("blur", () => {
  for (const k in keys) delete keys[k];
  touchMove.x = 0;
  touchMove.y = 0;
});
view.addEventListener("click", () => {
  if (game.running && !game.monitor && document.pointerLockElement !== view) {
    view.requestPointerLock?.().catch(() => {});
  }
});
document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === view && game.running && !game.monitor)
    ((game.p.a += e.movementX * POINTER_SPEED),
      (game.lookPitch = Math.max(
        -0.42,
        Math.min(0.42, game.lookPitch - e.movementY * 0.0018),
      )));
});
$("startBtn").onclick = start;
$("monitorBtn").onclick = showMonitor;
$("interactBtn").onclick = interact;
$("doorBtn").onclick = () => {
  if (nearProp("console", 1.6)) interact();
  else report("Дверь управляется с поста охраны в CAM-16");
};
$("restartBtn").onclick = () => {
  init();
  start();
};
for (let i = 0; i < 5; i++) {
  $("camList").insertAdjacentHTML(
    "beforeend",
    `<button data-camera="${CAMS[i]}">${i + 1} · ${CAMS[i]}</button>`,
  );
}
document
  .querySelectorAll("[data-camera]")
  .forEach(
    (b) => (b.onclick = () => chooseCam(CAMS.indexOf(b.dataset.camera))),
  );
const pad = $("movePad");
pad.addEventListener("pointerdown", (e) => {
  pad.setPointerCapture(e.pointerId);
  const r = pad.getBoundingClientRect();
  touchMove.x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
  touchMove.y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
});
pad.addEventListener("pointermove", (e) => {
  if (e.buttons === 0) return;
  const r = pad.getBoundingClientRect();
  touchMove.x = Math.max(
    -1,
    Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 2)),
  );
  touchMove.y = Math.max(
    -1,
    Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 2)),
  );
});
for (const n of ["pointerup", "pointercancel", "lostpointercapture"])
  pad.addEventListener(n, () => {
    touchMove = { x: 0, y: 0 };
  });
let lookX = null;
$("lookPad").addEventListener("pointerdown", (e) => {
  lookX = e.clientX;
  $("lookPad").setPointerCapture(e.pointerId);
});
$("lookPad").addEventListener("pointermove", (e) => {
  if (lookX !== null && game.running && !game.monitor) {
    game.p.a += (e.clientX - lookX) * 0.009;
    lookX = e.clientX;
  }
});
for (const n of ["pointerup", "pointercancel"])
  $("lookPad").addEventListener(n, () => {
    lookX = null;
  });
$("touchJump").onclick = () => {
  if (game.p.z === 0) {
    game.p.z = 0.02;
    game.p.vz = 4.3;
  }
};
$("touchE").onclick = interact;
$("touchM").onclick = showMonitor;
// Public hooks for automated validation (not required for play)
window.__V32_TEST__ = { lineOfSight, updateAI, getAI: () => game.ai };
window.__V31_TEST__ = {
  grid,
  props,
  states: STATE_FILES,
  getGame: () => game,
  reset: init,
  update,
  render: draw,
  chooseCam,
  interact,
  bfs,
  carve,
};
try {
  renderer3d = window.V33Renderer?.create(grid, props, keys) || null;
} catch (err) {
  console.warn("3D fallback:", err);
}
init();
requestAnimationFrame(frame);
