/**
 * @file Test Runner Framework
 * @description Lightweight vanilla JS test framework. No dependencies. Works in browser + Node.
 * @version 5.1.0
 * @license MIT
 *
 * Usage in browser:
 *   <script src="./js/services/config.js"></script>
 *   <script src="./tests/test-runner.js"></script>
 *   <script src="./tests/unit/config.test.js"></script>
 *   <script>TestRunner.run();</script>
 *
 * Usage in Node:
 *   node tests/test-runner.js tests/unit/config.test.js
 */
(function (global) {
  'use strict';

  // === Test State ===
  const state = {
    suites: [],
    currentSuite: null,
    beforeEachFns: [],
    afterEachFns: [],
    results: {
      passed: 0,
      failed: 0,
      total: 0,
      duration: 0,
      errors: [],
    },
    startTime: 0,
  };

  // === Assertion Library ===
  const assertions = {
    /**
     * Skip the current test. Optional reason for diagnostics.
     * @param {string} [reason] - why this test was skipped
     */
    skip(reason) {
      const err = new Error(reason || 'Test skipped');
      err.__skipped = true;
      throw err;
    },
    equal(actual, expected, msg) {
      if (actual !== expected) {
        throw new Error(msg || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    notEqual(actual, expected, msg) {
      if (actual === expected) {
        throw new Error(msg || `Expected ${JSON.stringify(actual)} to differ from ${JSON.stringify(expected)}`);
      }
    },
    deepEqual(actual, expected, msg) {
      const a = JSON.stringify(actual);
      const e = JSON.stringify(expected);
      if (a !== e) {
        throw new Error(msg || `Deep equal failed: ${a} !== ${e}`);
      }
    },
    ok(value, msg) {
      if (!value) throw new Error(msg || `Expected truthy, got ${JSON.stringify(value)}`);
    },
    notOk(value, msg) {
      if (value) throw new Error(msg || `Expected falsy, got ${JSON.stringify(value)}`);
    },
    truthy(value, msg) { assertions.ok(!!value, msg); },
    falsy(value, msg) { assertions.notOk(!!value, msg); },
    throws(fn, msg) {
      let threw = false;
      try { fn(); } catch (_) { threw = true; }
      if (!threw) throw new Error(msg || 'Expected function to throw');
    },
    async rejects(promise, msg) {
      return promise.then(
        () => { throw new Error(msg || 'Expected promise to reject'); },
        () => {} // expected
      );
    },
    async resolves(promise, msg) {
      return promise.then(
        () => {},
        (err) => { throw new Error(msg || 'Expected promise to resolve: ' + err.message); }
      );
    },
    greaterThan(a, b, msg) {
      if (!(a > b)) throw new Error(msg || `Expected ${a} > ${b}`);
    },
    lessThan(a, b, msg) {
      if (!(a < b)) throw new Error(msg || `Expected ${a} < ${b}`);
    },
    hasProperty(obj, key, msg) {
      if (!(key in (obj || {}))) throw new Error(msg || `Expected object to have property '${key}'`);
    },
    isInstanceOf(obj, Cls, msg) {
      if (!(obj instanceof Cls)) throw new Error(msg || `Expected instance of ${Cls.name}`);
    },
    includes(arr, item, msg) {
      if (!Array.isArray(arr) || !arr.includes(item)) {
        throw new Error(msg || `Expected array to include ${JSON.stringify(item)}`);
      }
    },
    match(str, regex, msg) {
      if (typeof str !== 'string' || !regex.test(str)) {
        throw new Error(msg || `Expected "${str}" to match ${regex}`);
      }
    },
  };

  // === Suite/Case API ===
  function describe(name, fn) {
    const suite = {
      name,
      tests: [],
      beforeEach: [],
      afterEach: [],
    };
    state.suites.push(suite);
    const prevSuite = state.currentSuite;
    state.currentSuite = suite;
    try {
      fn();
    } finally {
      state.currentSuite = prevSuite;
    }
  }

  function it(name, fn) {
    if (!state.currentSuite) {
      // Auto-create default suite if it() called outside describe()
      describe('Default Suite', () => {});
    }
    state.currentSuite.tests.push({ name, fn });
  }

  function beforeEach(fn) {
    if (state.currentSuite) state.currentSuite.beforeEach.push(fn);
    else state.beforeEachFns.push(fn);
  }
  function afterEach(fn) {
    if (state.currentSuite) state.currentSuite.afterEach.push(fn);
    else state.afterEachFns.push(fn);
  }

  // === Test Execution ===
  async function runTest(test, suite) {
    const start = performance.now();
    try {
      // Run beforeEach
      for (const fn of [...state.beforeEachFns, ...suite.beforeEach]) {
        await fn();
      }
      // Run the test
      await test.fn();
      // Run afterEach
      for (const fn of [...suite.afterEach, ...state.afterEachFns]) {
        await fn();
      }
      const duration = performance.now() - start;
      state.results.passed++;
      state.results.total++;
      return { name: test.name, status: 'PASS', duration };
    } catch (err) {
      const duration = performance.now() - start;
      // Check if it was intentionally skipped
      if (err && err.__skipped) {
        state.results.total++;
        return { name: test.name, status: 'SKIP', duration, reason: err.message };
      }
      state.results.failed++;
      state.results.total++;
      const error = { name: test.name, status: 'FAIL', duration, error: err.message, stack: err.stack };
      state.results.errors.push(error);
      return error;
    }
  }

  // === Persistent Listener Restoration ===
  // Some tests (e.g., EventBus.clear() tests) accidentally remove persistent listeners
  // wired by services/index.js. After each suite, restore them so subsequent suites
  // (especially integration tests) still have the analytics tracking working.
  function restorePersistentListeners() {
    if (typeof global.EventBus === 'undefined' || typeof global.AnalyticsService === 'undefined') return;
    if (global.EventBus.listenerCount('order:created') === 0) {
      global.EventBus.on('order:created', (o) => {
        try {
          global.AnalyticsService.track('order_created', {
            id: o && o.id,
            total: o && (o.total || (o.order && o.order.total)),
          });
        } catch (_) {}
      });
    }
  }

  async function runTest(test, suite) {
    const start = performance.now();
    try {
      // Run beforeEach
      for (const fn of [...state.beforeEachFns, ...suite.beforeEach]) {
        await fn();
      }
      // Run the test
      await test.fn();
      // Run afterEach
      for (const fn of [...suite.afterEach, ...state.afterEachFns]) {
        await fn();
      }
      const duration = performance.now() - start;
      state.results.passed++;
      state.results.total++;
      return { name: test.name, status: 'PASS', duration };
    } catch (err) {
      const duration = performance.now() - start;
      // Check if it was intentionally skipped
      if (err && err.__skipped) {
        state.results.total++;
        return { name: test.name, status: 'SKIP', duration, reason: err.message };
      }
      state.results.failed++;
      state.results.total++;
      const error = { name: test.name, status: 'FAIL', duration, error: err.message, stack: err.stack };
      state.results.errors.push(error);
      return error;
    }
  }

  async function run() {
    state.startTime = Date.now();
    state.results = { passed: 0, failed: 0, total: 0, duration: 0, errors: [] };

    const report = { suites: [], summary: null };

    for (const suite of state.suites) {
      const suiteStart = Date.now();
      const suiteReport = { name: suite.name, tests: [], duration: 0 };
      for (const test of suite.tests) {
        const result = await runTest(test, suite);
        suiteReport.tests.push(result);
      }
      suiteReport.duration = Date.now() - suiteStart;
      report.suites.push(suiteReport);
      // Restore persistent listeners that may have been removed by this suite
      restorePersistentListeners();
    }

    state.results.duration = Date.now() - state.startTime;
    report.summary = { ...state.results };
    return report;
  }

  // === Reporter ===
  const Reporter = {
    /**
     * Format report as plain text.
     */
    text(report) {
      const lines = [];
      lines.push('═'.repeat(70));
      lines.push('  BlinkGo v5.1 — Test Results');
      lines.push('═'.repeat(70));
      lines.push('');
      for (const suite of report.suites) {
        lines.push(`📁 ${suite.name} (${suite.duration}ms)`);
        for (const test of suite.tests) {
          let icon, color, suffix = '';
          if (test.status === 'PASS') { icon = '✓'; color = '\x1b[32m'; }
          else if (test.status === 'SKIP') { icon = '⏭'; color = '\x1b[33m'; suffix = ' (skipped)'; }
          else { icon = '✗'; color = '\x1b[31m'; }
          lines.push(`   ${color}${icon}\x1b[0m ${test.name} (${test.duration.toFixed(1)}ms)${suffix}`);
          if (test.error) {
            lines.push(`       ${test.error}`);
          }
        }
      }
      lines.push('');
      lines.push('─'.repeat(70));
      const s = report.summary;
      lines.push(`  Total: ${s.total}  Passed: \x1b[32m${s.passed}\x1b[0m  Failed: \x1b[31m${s.failed}\x1b[0m  Duration: ${s.duration}ms`);
      lines.push('─'.repeat(70));
      return lines.join('\n');
    },

    /**
     * Format report as HTML.
     */
    html(report) {
      const s = report.summary;
      const passedPct = s.total > 0 ? Math.round((s.passed / s.total) * 100) : 0;
      let html = `
        <div class="test-report">
          <div class="test-summary ${s.failed === 0 ? 'all-pass' : 'has-fail'}">
            <div class="summary-num">${passedPct}%</div>
            <div class="summary-detail">
              <strong>${s.passed}</strong> / ${s.total} passed
              ${s.failed > 0 ? `· <span class="fail-count">${s.failed} failed</span>` : ''}
            </div>
            <div class="summary-time">${s.duration}ms</div>
          </div>`;
      for (const suite of report.suites) {
        html += `<div class="test-suite">
          <div class="suite-header">📁 ${suite.name} <span class="suite-time">${suite.duration}ms</span></div>
          <div class="suite-tests">`;
        for (const test of suite.tests) {
          let cls, icon, suffix = '';
          if (test.status === 'PASS') { cls = 'test-pass'; icon = '✓'; }
          else if (test.status === 'SKIP') { cls = 'test-skip'; icon = '⏭'; suffix = ' (skipped)'; }
          else { cls = 'test-fail'; icon = '✗'; }
          html += `<div class="test-case ${cls}">
            <span class="test-icon">${icon}</span>
            <span class="test-name">${test.name}</span>
            <span class="test-duration">${test.duration.toFixed(1)}ms</span>
            ${suffix ? `<span class="test-suffix">${suffix}</span>` : ''}
          </div>`;
          if (test.error) {
            html += `<div class="test-error">${test.error}</div>`;
          }
          if (test.reason) {
            html += `<div class="test-skip-reason">⏭ ${test.reason}</div>`;
          }
        }
        html += `</div></div>`;
      }
      html += `</div>`;
      return html;
    },

    /**
     * Format report as JSON.
     */
    json(report) {
      return JSON.stringify(report, null, 2);
    },
  };

  // === Node.js support ===
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { describe, it, beforeEach, afterEach, run, ...assertions, Reporter };
  }

  // === Browser global ===
  const TestRunner = {
    describe,
    it,
    beforeEach,
    afterEach,
    run,
    ...assertions,
    Reporter,
    state,
  };
  global.TestRunner = TestRunner;
  global.describe = describe;
  global.it = it;
  global.beforeEach = beforeEach;
  global.afterEach = afterEach;
})(typeof window !== 'undefined' ? window : globalThis);