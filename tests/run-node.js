/**
 * @file Node.js Test Runner
 * @description Runs tests in Node.js environment by polyfilling browser APIs.
 * @example
 *   node tests/run-node.js
 *   node tests/run-node.js --unit
 *   node tests/run-node.js --integration
 */
'use strict';

// === Polyfills ===
global.window = global;
global.self = global;
global.performance = global.performance || { now: () => Date.now() };
global.AbortController = global.AbortController || class {
  constructor() { this.signal = { aborted: false }; }
  abort() { this.signal.aborted = true; }
};

if (typeof global.fetch === 'undefined') {
  global.fetch = async () => ({
    ok: false,
    status: 0,
    statusText: 'No fetch in Node test env',
    json: async () => ({}),
  });
}

if (typeof global.localStorage === 'undefined') {
  const storage = {};
  global.localStorage = {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { for (const k in storage) delete storage[k]; },
    key: (i) => Object.keys(storage)[i] || null,
    get length() { return Object.keys(storage).length; },
  };
}

if (typeof global.document === 'undefined') {
  global.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    readyState: 'complete',
    createElement: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
    getElementById: () => null,
  };
}

// === Load services in correct order ===
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SERVICE_ORDER = [
  'config.js',
  'logger.js',
  'error.js',
  'event-bus.js',
  'repository.js',
  'map-service.js',
  'analytics.js',
  'index.js',
];

console.log('📦 Loading services...');
for (const file of SERVICE_ORDER) {
  const filePath = path.join(ROOT, 'js', 'services', file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing service file: ${file}`);
    process.exit(1);
  }
  try {
    const code = fs.readFileSync(filePath, 'utf-8');
    // Execute in global context
    new Function(code)();
    console.log(`  ✓ ${file}`);
  } catch (err) {
    console.error(`❌ Failed to load ${file}: ${err.message}`);
    process.exit(1);
  }
}

// === Load test framework ===
console.log('\n📦 Loading test framework...');
const testRunnerCode = fs.readFileSync(path.join(__dirname, 'test-runner.js'), 'utf-8');
new Function(testRunnerCode)();
console.log('  ✓ test-runner.js');

// === Determine which tests to run ===
const args = process.argv.slice(2);
const onlyUnit = args.includes('--unit');
const onlyIntegration = args.includes('--integration');

const testDirs = [];
if (onlyUnit) testDirs.push('unit');
else if (onlyIntegration) testDirs.push('integration');
else {
  testDirs.push('unit', 'integration');
}

console.log(`\n🧪 Loading tests from: ${testDirs.join(', ')}`);
let loadedCount = 0;
for (const dir of testDirs) {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) continue;
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.test.js')).sort();
  for (const file of files) {
    const code = fs.readFileSync(path.join(dirPath, file), 'utf-8');
    try {
      new Function(code)();
      console.log(`  ✓ ${dir}/${file}`);
      loadedCount++;
    } catch (err) {
      console.error(`❌ Failed to load ${dir}/${file}: ${err.message}`);
      process.exit(1);
    }
  }
}

if (loadedCount === 0) {
  console.error('❌ No tests found!');
  process.exit(1);
}

// === Run tests ===
console.log(`\n🏃 Running ${TestRunner.state.suites.length} test suites...\n`);

TestRunner.run().then(report => {
  console.log(TestRunner.Reporter.text(report));
  console.log('');
  process.exit(report.summary.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('❌ Test runner crashed:', err);
  console.error(err.stack);
  process.exit(2);
});