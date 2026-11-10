const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "reports/browser-tests.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:8765",
    viewport: { width: 1280, height: 720 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      ...(process.env.DIDS_CHROMIUM_PATH
        ? { executablePath: process.env.DIDS_CHROMIUM_PATH }
        : {}),
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  projects: [
    { name: "webgl", use: { browserName: "chromium" } },
    { name: "canvas2d", use: { browserName: "chromium" } },
  ],
  webServer: {
    command:
      "python3 -m http.server 8765 --bind 127.0.0.1 --directory game/legacy_v34",
    url: "http://127.0.0.1:8765",
    reuseExistingServer: false,
  },
});
