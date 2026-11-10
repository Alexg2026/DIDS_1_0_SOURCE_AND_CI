const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
function load() {
  const context = vm.createContext({ window: {} });
  for (const file of ["config", "state", "world", "ai", "camera", "metrics"])
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "../game/legacy_v34/modules", file + ".js"),
        "utf8",
      ),
      context,
    );
  return context.window.DIDS;
}
test("state and world instances do not share mutable state", () => {
  const d = load(),
    a = d.createState(),
    b = d.createState();
  a.p.inv.add("key");
  a.ai[0].route[0][0] = 99;
  assert.equal(b.p.inv.size, 0);
  assert.equal(b.ai[0].route[0][0], 5);
  const x = d.createWorld(() => a),
    y = d.createWorld(() => b);
  x.carve(0, 0, 0, 0);
  assert.equal(y.grid[0][0], 1);
  assert.equal(b.grid, false);
});
test("routes cross rooms while walls, props and the closed door block actors", () => {
  const d = load(),
    g = d.createState(),
    w = d.createWorld(() => g);
  for (const route of [
    [5, 5, 23, 15],
    [23, 5, 14, 15],
  ])
    assert.ok(w.bfs(...route).length);
  assert.equal(w.blocked(0, 0), true);
  assert.equal(w.blocked(4.4, 3.5), true);
  assert.equal(w.lineOfSight(5, 5, 5, 6), true);
  assert.equal(w.lineOfSight(5, 5, 14, 15), false);
  g.door = true;
  assert.equal(w.blocked(23.5, 11.5, 0.17, true), true);
  assert.equal(w.bfs(23, 10, 24, 15).length, 0);
});
test("AI detects visible player and applies attack cooldown", () => {
  const d = load(),
    g = d.createState(),
    w = d.createWorld(() => g);
  let hits = 0;
  g.ai = [g.ai[0]];
  g.ai[0].x = g.p.x;
  g.ai[0].y = g.p.y - 0.3;
  g.damageCooldown = 0;
  const update = d.createAI({
    getGame: () => g,
    keys: {},
    world: w,
    report() {},
    onHit() {
      hits++;
    },
  });
  for (let i = 0; i < 12; i++) update(0.05);
  assert.equal(g.detected, true);
  assert.equal(g.ai[0].mode, "SEARCH");
  assert.equal(g.p.hp, 73);
  assert.equal(hits, 1);
});
test("camera selects empty, critical and blackout states", () => {
  const d = load(),
    g = d.createState(),
    w = d.createWorld(() => g);
  g.ai = [];
  assert.equal(d.cameraState(g, "CAM10", w), 0);
  g.ai = [{ x: 24.7, y: 15.2 }];
  assert.equal(d.cameraState(g, "CAM16", w), 9);
  g.battery = 0;
  assert.equal(d.cameraState(g, "CAM16", w), 8);
});
test("metrics use a bounded buffer, nearest-rank p95, and reset", () => {
  const d = load(),
    m = d.createMetrics(3);
  for (const n of [10, 20, 30, 40]) m.record(n, n / 10, n / 5);
  let r = m.snapshot();
  assert.equal(r.samples, 3);
  assert.equal(r.frame.meanMs, 30);
  assert.equal(r.frame.p95Ms, 40);
  m.record(NaN, 1, 1);
  assert.equal(m.snapshot().samples, 3);
  m.reset();
  r = m.snapshot();
  assert.equal(r.samples, 0);
  assert.equal(r.fps, 0);
});
