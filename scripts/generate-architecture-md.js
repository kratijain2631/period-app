const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const exists = (rel) => fs.existsSync(path.join(root, rel));

const lines = [];
lines.push('# Architecture');
lines.push('');
lines.push('## Overview');
lines.push(`- App: ${pkg.name} (Expo + React Native)`);
lines.push('- Entry: App.tsx (Expo AppEntry via package.json main)');
lines.push('- Runtime: Expo SDK + React Native');
lines.push('- Testing: Jest (jest-expo preset)');
lines.push('- CI: GitHub Actions and CircleCI run npm test');
lines.push('');
lines.push('## Structure');
const sections = [
  ['app/', 'Product features, screens, services, and storage.'],
  ['packages/', 'Shared domain modules and utilities.'],
  ['supabase/', 'Supabase config and local tooling.'],
  ['types/', 'Shared TypeScript types.'],
  ['plugins/', 'Expo/Metro plugins and build hooks.'],
  ['implementation-docs/', 'Design and implementation notes.'],
  ['reference/', 'Reference material.'],
  ['overall/', 'High-level planning notes.'],
  ['prompts/', 'Prompt artifacts.'],
];
sections.forEach(([dir, desc]) => {
  if (exists(dir)) {
    lines.push(`- ${dir} ${desc}`);
  }
});
lines.push('');
lines.push('## Configuration');
if (exists('app.json')) lines.push('- app.json: Expo app configuration.');
if (exists('eas.json')) lines.push('- eas.json: EAS build configuration.');
if (exists('babel.config.js')) lines.push('- babel.config.js: Babel configuration.');
if (exists('metro.config.js')) lines.push('- metro.config.js: Metro bundler configuration.');
if (exists('jest.config.js')) lines.push('- jest.config.js: Jest configuration.');
lines.push('');
lines.push('## Key Scripts');
const scripts = pkg.scripts || {};
['start', 'android', 'ios', 'web', 'test'].forEach((script) => {
  if (scripts[script]) {
    lines.push(`- npm run ${script}: ${scripts[script]}`);
  }
});
lines.push('');
lines.push('## Notes');
lines.push('- This file is auto-generated. Update scripts/generate-architecture-md.js to change its contents.');

const outputPath = path.join(root, 'ARCHITECTURE.md');
fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
