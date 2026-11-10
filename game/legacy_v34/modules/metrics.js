(function () {
  "use strict";
  window.DIDS = window.DIDS || {};
  // Bounded ring buffer: no growth during long nights. All times are milliseconds.
  window.DIDS.createMetrics = function (capacity = 600) {
    if (!Number.isInteger(capacity) || capacity < 1)
      throw new RangeError("Invalid metrics capacity");
    const samples = new Array(capacity);
    let count = 0,
      cursor = 0;
    function reset() {
      count = 0;
      cursor = 0;
    }
    function record(interval, update, render) {
      if (
        ![interval, update, render].every(
          (n) => Number.isFinite(n) && n >= 0,
        ) ||
        interval === 0
      )
        return;
      samples[cursor] = { interval, update, render };
      cursor = (cursor + 1) % capacity;
      count = Math.min(count + 1, capacity);
    }
    function summarize(values) {
      values.sort((a, b) => a - b);
      const n = values.length;
      return {
        meanMs: n ? values.reduce((a, b) => a + b, 0) / n : 0,
        p95Ms: n ? values[Math.ceil(n * 0.95) - 1] : 0,
        maxMs: n ? values[n - 1] : 0,
      };
    }
    function snapshot() {
      const rows = samples.slice(0, count);
      const frame = summarize(rows.map((s) => s.interval));
      return {
        samples: count,
        capacity,
        frame,
        update: summarize(rows.map((s) => s.update)),
        render: summarize(rows.map((s) => s.render)),
        fps: frame.meanMs ? 1000 / frame.meanMs : 0,
      };
    }
    return { record, reset, snapshot };
  };
})();
