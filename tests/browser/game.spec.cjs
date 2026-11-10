const { test: base, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const path = require("node:path");
const entry = "/" + encodeURIComponent("ОСТРОВ_МЕЧТЫ_V34_ИГРАТЬ.html");
const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    if (testInfo.project.name === "canvas2d")
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type.startsWith("webgl")
            ? null
            : original.call(this, type, ...args);
        };
      });
    await use(page);
    expect(errors, "Unexpected browser errors").toEqual([]);
  },
});
test.beforeEach(async ({ page }) => {
  await page.goto(entry);
  await expect(page.locator("#startBtn")).toHaveText("НАЧАТЬ НОЧЬ");
});

test("start, walk, switch all cameras, and restart", async ({ page }) => {
  await expect(page.locator("#power")).toHaveText("ОТКЛЮЧЕНА");
  await page.locator("#startBtn").click();
  const before = await page.evaluate(() => window.__V31_TEST__.getGame().p.y);
  await page.keyboard.down("KeyW");
  try {
    await expect.poll(()=>page.evaluate(()=>window.__V31_TEST__.getGame().p.y)).toBeLessThan(before);
  } finally { await page.keyboard.up("KeyW"); }
  await page.keyboard.press("KeyM");
  await expect(page.locator("#camera")).toHaveClass(/visible/);
  for (const id of ["CAM10", "CAM13", "CAM14", "CAM15", "CAM16"]) {
    await page.locator(`[data-camera="${id}"]`).click();
    await expect(page.locator("#camName")).toContainText(id);
    await expect
      .poll(() =>
        page
          .locator("#cameraImage")
          .evaluate((im) => im.complete && im.naturalWidth === 1920),
      )
      .toBe(true);
  }
  await page.locator("#restartBtn").click();
  await expect(page.locator("#camera")).not.toHaveClass(/visible/);
  await expect(page.locator("body")).not.toHaveClass(/monitoring/);
  expect(
    await page.evaluate(() => window.__V31_TEST__.getGame().elapsed),
  ).toBeLessThan(2);
});

test("collect items, restore generator, survive, and reset", async ({
  page,
}) => {
  await page.locator("#startBtn").click();
  // Deterministic setup skips travel; real input and production update logic are exercised.
  await page.evaluate(() => {
    const g = window.__V31_TEST__.getGame();
    g.ai = [];
    g.p.x = 5.4;
    g.p.y = 5.3;
  });
  await page.keyboard.press("KeyE");
  await expect(page.locator("#items")).toContainText("Ключ ✓");
  await page.evaluate(() => {
    const g = window.__V31_TEST__.getGame();
    g.p.x = 15.2;
    g.p.y = 4.4;
  });
  await page.keyboard.press("KeyE");
  await expect(page.locator("#items")).toContainText("Предохранитель ✓");
  await page.evaluate(() => {
    const g = window.__V31_TEST__.getGame();
    g.p.x = 14.1;
    g.p.y = 14.6;
  });
  await page.keyboard.down("KeyE");
  await page.evaluate(() => {
    for (let i = 0; i < 130; i++) window.__V31_TEST__.update(0.05);
  });
  await page.keyboard.up("KeyE");
  await expect(page.locator("#power")).toHaveText("ВОССТАНОВЛЕНА");
  await page.evaluate(() => {
    const t = window.__V31_TEST__;
    t.getGame().elapsed = 359.99;
    t.update(0.05);
  });
  await expect(page.locator("#modalTitle")).toContainText("СМЕНА ЗАВЕРШЕНА");
  await page.locator("#startBtn").click();
  await expect(page.locator("#power")).toHaveText("ОТКЛЮЧЕНА");
  expect(
    await page.evaluate(() => window.__V31_TEST__.getGame().p.inv.size),
  ).toBe(0);
});

test("battery exhaustion ends the night", async ({ page }) => {
  await page.locator("#startBtn").click();
  await page.evaluate(() => {
    const t = window.__V31_TEST__;
    t.getGame().battery = 0.00001;
    t.update(0.05);
  });
  await expect(page.locator("#modalTitle")).toHaveText("НОЧЬ ПРОВАЛЕНА");
  await expect(page.locator("#modalBody")).toContainText("батарея");
});

test("records bounded frame, update and render timing reports", async ({
  page,
}, info) => {
  await page.locator("#startBtn").click();
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__DIDS_PERF__.reset());
  await page.waitForTimeout(3000);
  const metrics = await page.evaluate(() => window.__DIDS_PERF__.snapshot());
  expect(metrics.renderer).toBe(info.project.name);
  expect(metrics.samples).toBeGreaterThanOrEqual(10);
  expect(metrics.samples).toBeLessThanOrEqual(metrics.capacity);
  const cpuBudgetMs = Number(process.env.DIDS_CPU_P95_BUDGET_MS || 250);
  expect(metrics.update.p95Ms + metrics.render.p95Ms).toBeLessThan(cpuBudgetMs);
  const report = {
    schemaVersion: 1,
    scenario: "stationary-night-with-four-enemies",
    sampleDurationMs: 3000,
    warmupMs: 1000,
    viewport: { width: 1280, height: 720 },
    browser: await page.context().browser().version(),
    cpuBudgetMs,
    metrics,
    note: "CPU wall time for update/draw and requestAnimationFrame intervals; not GPU execution time. FPS is requestAnimationFrame cadence; WebGL may skip draws less than 25 ms apart.",
  };
  const dir = path.resolve("reports/performance");
  await fs.mkdir(dir, { recursive: true });
  const json = JSON.stringify(report, null, 2) + "\n";
  await fs.writeFile(path.join(dir, info.project.name + ".json"), json);
  await fs.writeFile(
    path.join(dir, info.project.name + ".md"),
    `# ${info.project.name}\n\nSamples: ${metrics.samples}; FPS: ${metrics.fps.toFixed(1)}\n\n| Timing | Mean ms | p95 ms | Max ms |\n|---|---:|---:|---:|\n` +
      ["frame", "update", "render"]
        .map(
          (k) =>
            `| ${k} | ${metrics[k].meanMs.toFixed(2)} | ${metrics[k].p95Ms.toFixed(2)} | ${metrics[k].maxMs.toFixed(2)} |`,
        )
        .join("\n") +
      "\n\n" +
      report.note +
      "\n",
  );
  await info.attach("performance", {
    body: json,
    contentType: "application/json",
  });
});
