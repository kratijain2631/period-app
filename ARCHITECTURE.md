# Architecture

## Overview
- App: period-app (Expo + React Native)
- Entry: App.tsx (Expo AppEntry via package.json main)
- Runtime: Expo SDK + React Native
- Testing: Jest (jest-expo preset)
- CI: GitHub Actions and CircleCI run npm test

## Structure
- app/ Product features, screens, services, and storage.
- packages/ Shared domain modules and utilities.
- supabase/ Supabase config and local tooling.
- types/ Shared TypeScript types.
- plugins/ Expo/Metro plugins and build hooks.
- implementation-docs/ Design and implementation notes.
- reference/ Reference material.
- overall/ High-level planning notes.
- prompts/ Prompt artifacts.

## Configuration
- app.json: Expo app configuration.
- eas.json: EAS build configuration.
- babel.config.js: Babel configuration.
- metro.config.js: Metro bundler configuration.
- jest.config.js: Jest configuration.

## Key Scripts
- npm run start: expo start --dev-client
- npm run android: expo run:android
- npm run ios: expo run:ios
- npm run web: expo start --web
- npm run test: jest

## Notes
- This file is auto-generated. Update scripts/generate-architecture-md.js to change its contents.
