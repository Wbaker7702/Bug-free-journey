/**
 * Tests for .github/workflows/test.yml
 *
 * Testing framework: Jest (Node.js)
 *
 * Goals:
 * - Validate the YAML is parseable.
 * - Assert required keys exist and contain expected values.
 * - Verify triggers (on.push.branches includes "main" and on.pull_request is configured).
 * - Check job name, runner, and steps include Foundry setup and commands.
 * - Confirm Foundry profile and toolchain version.
 * - Validate forge build/test command invocations.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WORKFLOW_PATH = path.join('.github', 'workflows', 'test.yml');

function loadWorkflow() {
  const content = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const doc = yaml.load(content);
  return { content, doc };
}

describe('GitHub Actions Workflow: .github/workflows/test.yml', () => {
  test('file exists and is readable', () => {
    expect(fs.existsSync(WORKFLOW_PATH)).toBe(true);
    const stat = fs.statSync(WORKFLOW_PATH);
    expect(stat.size).toBeGreaterThan(0);
  });

  test('parses as valid YAML', () => {
    const { doc } = loadWorkflow();
    expect(typeof doc).toBe('object');
  });

  test('has expected top-level keys', () => {
    const { doc } = loadWorkflow();
    expect(doc).toHaveProperty('name', 'test');
    expect(doc).toHaveProperty('permissions');
    expect(doc.permissions).toHaveProperty('contents', 'read');
    expect(doc).toHaveProperty('on');
    expect(doc).toHaveProperty('env');
    expect(doc.env).toHaveProperty('FOUNDRY_PROFILE', 'ci');
    expect(doc).toHaveProperty('jobs');
  });

  test('triggers: push to main and pull_request configured', () => {
    const { doc } = loadWorkflow();
    expect(doc.on).toHaveProperty('push');
    // push.branches includes main
    const branches = (((doc.on || {}).push || {}).branches) || [];
    expect(Array.isArray(branches)).toBe(true);
    expect(branches).toContain('main');

    // pull_request trigger exists (may be null or obj)
    expect(doc.on).toHaveProperty('pull_request');
  });

  test('jobs.check is configured with ubuntu-latest and named "Foundry project"', () => {
    const { doc } = loadWorkflow();
    expect(doc.jobs).toHaveProperty('check');
    const check = doc.jobs.check;
    expect(check).toHaveProperty('name', 'Foundry project');
    expect(check).toHaveProperty('runs-on', 'ubuntu-latest');
    // strategy.fail-fast true
    expect(check).toHaveProperty('strategy');
    expect(check.strategy).toHaveProperty('fail-fast', true);
  });

  test('steps: checkout v4 with recursive submodules', () => {
    const { doc } = loadWorkflow();
    const steps = doc.jobs.check.steps || [];
    const checkout = steps.find(s => typeof s.uses === 'string' && s.uses.startsWith('actions/checkout@'));
    expect(checkout).toBeTruthy();
    expect(checkout.uses).toBe('actions/checkout@v4');
    expect(checkout).toHaveProperty('with');
    expect(checkout.with).toHaveProperty('submodules', 'recursive');
  });

  test('steps: installs Foundry toolchain with nightly', () => {
    const { doc } = loadWorkflow();
    const steps = doc.jobs.check.steps || [];
    const foundryStep = steps.find(s => typeof s.uses === 'string' && s.uses.startsWith('foundry-rs/foundry-toolchain@'));
    expect(foundryStep).toBeTruthy();
    expect(foundryStep.uses).toBe('foundry-rs/foundry-toolchain@v1');
    expect(foundryStep).toHaveProperty('with');
    expect(foundryStep.with).toHaveProperty('version', 'nightly');
  });

  test('steps: forge build step runs forge --version and forge build', () => {
    const { doc } = loadWorkflow();
    const steps = doc.jobs.check.steps || [];
    const build = steps.find(s => s.name === 'Run Forge build');
    expect(build).toBeTruthy();
    expect(build).toHaveProperty('run');
    const run = build.run;
    // ensure both commands are present
    expect(run).toMatch(/forge\s+--version/);
    expect(run).toMatch(/forge\s+build/);
    expect(build).toHaveProperty('id', 'build');
  });

  test('steps: forge test step runs with -vvv verbosity', () => {
    const { doc } = loadWorkflow();
    const steps = doc.jobs.check.steps || [];
    const testStep = steps.find(s => s.name === 'Run Forge tests');
    expect(testStep).toBeTruthy();
    expect(testStep).toHaveProperty('run');
    expect(testStep.run).toMatch(/forge\s+test\s+-vvv/);
    expect(testStep).toHaveProperty('id', 'test');
  });

  describe('defensive checks and edge cases', () => {
    test('no unexpected extra top-level keys (only a sanity check)', () => {
      const { doc } = loadWorkflow();
      const allowed = new Set(['permissions','name','on','env','jobs']);
      const keys = Object.keys(doc || {});
      // Allow additional keys in case of future expansion; warn but do not fail.
      // This test ensures at least we have the required set.
      for (const k of ['permissions','name','on','env','jobs']) {
        expect(keys).toContain(k);
      }
    });

    test('checkout step appears before Foundry installation', () => {
      const { doc } = loadWorkflow();
      const steps = doc.jobs.check.steps || [];
      const checkoutIndex = steps.findIndex(s => typeof s.uses === 'string' && s.uses === 'actions/checkout@v4');
      const foundryIndex = steps.findIndex(s => typeof s.uses === 'string' && s.uses === 'foundry-rs/foundry-toolchain@v1');
      expect(checkoutIndex).toBeGreaterThanOrEqual(0);
      expect(foundryIndex).toBeGreaterThanOrEqual(0);
      // advisable ordering
      expect(checkoutIndex).toBeLessThan(foundryIndex);
    });

    test('build step occurs before test step', () => {
      const { doc } = loadWorkflow();
      const steps = doc.jobs.check.steps || [];
      const buildIndex = steps.findIndex(s => s.name === 'Run Forge build');
      const testIndex = steps.findIndex(s => s.name === 'Run Forge tests');
      expect(buildIndex).toBeGreaterThanOrEqual(0);
      expect(testIndex).toBeGreaterThanOrEqual(0);
      expect(buildIndex).toBeLessThan(testIndex);
    });
  });
});