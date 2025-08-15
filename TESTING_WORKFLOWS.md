Configuration Test Suite for .github/workflows/test.yml

This repository primarily uses Foundry for smart contract tests. To validate the GitHub Actions workflow configuration, we include a small Node-based Jest test suite that parses and asserts the workflow YAML.

How to run the tests:

1. Install Node.js (v16+ recommended)
2. Install dev dependencies:

    npm install

3. Run the tests:

    npm test

Validation includes:

- YAML syntax validation
- Required top-level keys and their expected values (permissions, env, triggers)
- Job and steps configuration including Foundry toolchain setup and forge commands

Note: These tests do not replace running the workflow in GitHub Actions, but they help catch configuration regressions early.