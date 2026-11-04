#!/usr/bin/env node
/**
 * Entry point for the test-account tooling (see docs/TEST_ACCOUNTS.md).
 *
 *   node scripts/test-accounts/run.js seed               # create/reset all personas on staging
 *   node scripts/test-accounts/run.js actors <command>   # act as personas (post, react, boop, …)
 *   node scripts/test-accounts/run.js start              # start Metro against staging
 *
 * Loads the TypeScript sources directly (via sucrase) so the scripts reuse the
 * app's own cycle model in packages/domain.
 */
const path = require('path');
const Module = require('module');

require('sucrase/register/ts');

// packages/domain/cycles/models.ts imports an enum from the native HealthKit
// library, which can't load under Node. Point it at a plain-JS stand-in.
const healthkitStub = path.join(__dirname, 'healthkit-stub.js');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveWithHealthkitStub(request, ...rest) {
  if (request === '@kingstinct/react-native-healthkit') {
    return healthkitStub;
  }
  return originalResolve.call(this, request, ...rest);
};

const [command, ...args] = process.argv.slice(2);

const commands = {
  seed: () => require('./seed.ts').main(args),
  actors: () => require('./actors.ts').main(args),
  start: () => require('./startStaging.ts').main(args),
};

if (!command || !commands[command]) {
  console.log('Usage: node scripts/test-accounts/run.js <seed|actors|start> [args]');
  process.exit(command ? 1 : 0);
}

Promise.resolve()
  .then(() => commands[command]())
  .catch((error) => {
    console.error(`\n✖ ${error && error.message ? error.message : error}`);
    process.exit(1);
  });
