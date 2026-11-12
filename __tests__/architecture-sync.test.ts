import * as fs from 'fs';
import * as path from 'path';

/**
 * Keeps architecture.md honest without calling an AI: every path it names must exist, every
 * folder at the levels it describes must be in it, and every technology it lists must be in
 * package.json at the version it states. Placeholder paths like
 * `app/features/{feature-name}/screens/` are skipped.
 */
const ROOT = path.join(__dirname, '..');
const doc = fs.readFileSync(path.join(ROOT, 'architecture.md'), 'utf-8');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const packages: Record<string, string> = { ...packageJson.dependencies, ...packageJson.devDependencies };

const exists = (relative: string) => fs.existsSync(path.join(ROOT, relative));
const isPlaceholder = (value: string) => /[{}]|YYYY/.test(value);

/** Paths from the file tree: top-level lines are roots, `├──`/`└──` lines nest by 4 columns. */
const treePaths = (): string[] => {
  const block = doc.match(/```\n(app\/[\s\S]*?)```/);
  if (!block) throw new Error('architecture.md has no file tree starting with app/');
  const paths: string[] = [];
  const parents: string[] = [];
  block[1].split('\n').forEach((line) => {
    const nested = line.match(/^([│ ]*)[├└]── (\S+)/);
    const top = line.match(/^(\S+\/)/);
    if (nested) {
      const depth = nested[1].length / 4 + 1;
      parents.length = depth;
      const full = parents.join('') + nested[2];
      parents[depth] = nested[2];
      paths.push(full);
    } else if (top) {
      parents.length = 0;
      parents[0] = top[1];
      paths.push(top[1]);
    }
  });
  return paths;
};

/** Backticked values that look like repo paths, e.g. `app/state/` or `supabase/functions/x/index.ts`. */
const inlinePaths = (): string[] =>
  [...doc.matchAll(/`([^`\s]+)`/g)]
    .map((match) => match[1])
    .filter((value) => value.includes('/') && !isPlaceholder(value) && !value.startsWith('@'));

/** Backticked bare file names, e.g. `syncHealthData.ts`, must exist somewhere under app/. */
const bareFileNames = (): string[] =>
  [...doc.matchAll(/`([\w.-]+\.(?:ts|tsx|md))`/g)].map((match) => match[1]);

const findUnder = (dir: string, name: string): boolean =>
  fs.readdirSync(dir, { withFileTypes: true }).some((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return false;
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? findUnder(full, name) : entry.name === name;
  });

// Levels the doc describes folder by folder. A new folder here must be added to its tree.
const DOCUMENTED_LEVELS = ['app', 'app/features', 'app/services', 'supabase/functions'];

const foldersAt = (level: string): string[] =>
  fs.readdirSync(path.join(ROOT, level), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '__tests__')
    .map((entry) => `${level}/${entry.name}/`);

// How the doc names each technology, mapped to its package.
const TECHNOLOGY_PACKAGES: Record<string, string> = {
  'React Native': 'react-native',
  Expo: 'expo',
  TypeScript: 'typescript',
  Zustand: 'zustand',
  Supabase: '@supabase/supabase-js',
  '@kingstinct/react-native-healthkit': '@kingstinct/react-native-healthkit',
  'expo-sqlite': 'expo-sqlite',
  'React Navigation': '@react-navigation/native',
};

/** Bullets under "Key Technologies", as `**Name version**`. */
const technologies = (): Array<{ name: string; version?: string }> => {
  const section = doc.split('## Key Technologies')[1]?.split('\n## ')[0] ?? '';
  return [...section.matchAll(/\*\*([^*]+)\*\*/g)].map((match) => {
    const parts = match[1].trim().match(/^(.*?)(?:\s+([~^]?\d[\w.~^-]*))?$/)!;
    return { name: parts[1], version: parts[2] };
  });
};

describe('architecture.md matches the codebase', () => {
  // Guards against the parsing silently matching nothing after a doc rewrite.
  it('finds the tree, paths and technologies to check', () => {
    expect(treePaths().length).toBeGreaterThan(20);
    expect(inlinePaths().length).toBeGreaterThan(10);
    expect(technologies().length).toBeGreaterThanOrEqual(5);
  });

  it('names only paths that exist', () => {
    const missing = [...new Set([...treePaths(), ...inlinePaths()])].filter((value) => !exists(value));
    expect(missing).toEqual([]);
  });

  it('includes every folder at the levels it describes', () => {
    const named = new Set(treePaths());
    const missing = DOCUMENTED_LEVELS.flatMap(foldersAt).filter((folder) => !named.has(folder));
    expect(missing).toEqual([]);
  });

  it('names only files that exist', () => {
    const missing = bareFileNames().filter((name) => !findUnder(path.join(ROOT, 'app'), name) && !exists(name));
    expect(missing).toEqual([]);
  });

  it('lists only technologies that are in package.json, at the stated version', () => {
    const problems = technologies().flatMap(({ name, version }) => {
      const pkg = TECHNOLOGY_PACKAGES[name];
      if (!pkg) return [`"${name}" has no package mapping in this test`];
      if (!packages[pkg]) return [`${name} (${pkg}) is not in package.json`];
      if (version && packages[pkg].replace(/^[~^]/, '') !== version.replace(/^[~^]/, '')) {
        return [`${name} is ${version} in the doc but ${packages[pkg]} in package.json`];
      }
      return [];
    });
    expect(problems).toEqual([]);
  });
});
