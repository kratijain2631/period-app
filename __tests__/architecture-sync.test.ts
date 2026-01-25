import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

/**
 * Test to verify that architecture.md stays in sync with the actual codebase.
 * Uses AI (OpenAI) to evaluate if the documentation matches the code structure.
 *
 * This test will be skipped if OPENAI_API_KEY is not set.
 *
 * Usage:
 * - To run locally: Set OPENAI_API_KEY environment variable, then run `npm test`
 * - In CI: Add OPENAI_API_KEY as an environment variable in CircleCI project settings
 * - The test gracefully skips if no API key is provided, so it won't break CI
 *
 * The test evaluates:
 * - File structure matches what's described in architecture.md
 * - Key files mentioned actually exist
 * - Technologies/dependencies match package.json
 * - Patterns described are reflected in the codebase structure
 */
describe('Architecture Documentation Sync', () => {
  const architecturePath = path.join(__dirname, '..', 'architecture.md');
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  /**
   * Recursively get directory structure, excluding node_modules and other common ignores
   */
  const getDirectoryStructure = (dir: string, baseDir: string = dir, maxDepth: number = 3, currentDepth: number = 0): string[] => {
    if (currentDepth >= maxDepth) return [];
    
    const items: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        // Skip common ignored directories
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'dist' || 
            entry.name === 'build' ||
            entry.name === '__tests__') {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (entry.isDirectory()) {
          items.push(`${relativePath}/`);
          items.push(...getDirectoryStructure(fullPath, baseDir, maxDepth, currentDepth + 1));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
          items.push(relativePath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    
    return items.sort();
  };

  /**
   * Get key files mentioned in architecture.md
   */
  const getKeyFiles = (): string[] => {
    const keyFiles = [
      'app/navigation/AppNavigator.tsx',
      'app/services/healthkit/syncHealthData.ts',
      'app/services/healthkit/useCycleSyncLifecycle.ts',
      'app/services/healthkit/permissions.ts',
      'app/services/boops/useBoopQueueSync.ts',
      'app/state/sessionStore.ts',
      'app/state/connectionStore.ts',
      'app/storage/sqlite/cycleSnapshotStore.ts',
      'app/services/notifications/usePushNotifications.ts',
    ];

    return keyFiles.filter(file => {
      const fullPath = path.join(__dirname, '..', file);
      return fs.existsSync(fullPath);
    });
  };

  /**
   * Get dependencies from package.json
   */
  const getDependencies = (): { dependencies: Record<string, string>; devDependencies: Record<string, string> } => {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return {
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
      };
    } catch {
      return { dependencies: {}, devDependencies: {} };
    }
  };

  /**
   * Call OpenAI API to evaluate architecture sync
   */
  const evaluateArchitectureSync = async (
    architectureDoc: string,
    codebaseInfo: {
      directoryStructure: string[];
      keyFiles: string[];
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    }
  ): Promise<{ inSync: boolean; issues: string[]; score: number }> => {
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not set - skipping AI evaluation');
    }

    const prompt = [
      'You are evaluating whether an architecture documentation file is in sync with the actual codebase.',
      'Analyze the architecture.md document and compare it with the provided codebase information.',
      '',
      'Check for:',
      '1. File structure matches what is described',
      '2. Key files mentioned actually exist',
      '3. Technologies/dependencies listed match package.json',
      '4. Patterns described (feature-based organization, service layer, etc.) are reflected in structure',
      '5. Key directories and their purposes match reality',
      '',
      'Return ONLY valid JSON with this structure:',
      '{',
      '  "inSync": boolean,',
      '  "issues": string[],  // Array of specific issues found (empty if in sync)',
      '  "score": number      // 0-100 score of how in sync they are',
      '}',
      '',
      '---',
      'ARCHITECTURE DOCUMENTATION:',
      '---',
      architectureDoc,
      '',
      '---',
      'CODEBASE INFORMATION:',
      '---',
      'Directory Structure (sample):',
      codebaseInfo.directoryStructure.slice(0, 100).join('\n'),
      codebaseInfo.directoryStructure.length > 100 ? `\n... (${codebaseInfo.directoryStructure.length - 100} more items)` : '',
      '',
      'Key Files Checked:',
      codebaseInfo.keyFiles.join('\n'),
      '',
      'Dependencies:',
      JSON.stringify(codebaseInfo.dependencies, null, 2),
      '',
      'Dev Dependencies:',
      JSON.stringify(codebaseInfo.devDependencies, null, 2),
    ].join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openaiModel,
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'You output JSON only. Be precise and factual.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${text}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content ?? '{}';

    // Extract JSON from response (handle markdown code blocks)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const result = JSON.parse(jsonContent);
      return {
        inSync: result.inSync ?? false,
        issues: Array.isArray(result.issues) ? result.issues : [],
        score: typeof result.score === 'number' ? result.score : 0,
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${content.substring(0, 200)}`);
    }
  };

  it('should be in sync with the codebase', async () => {
    // Skip test if no API key (allows running tests without AI)
    if (!openaiApiKey) {
      console.warn('[architecture-sync] OPENAI_API_KEY not set - skipping AI evaluation');
      return;
    }

    // Read architecture.md
    const architectureDoc = fs.readFileSync(architecturePath, 'utf-8');

    // Gather codebase information
    const appDir = path.join(__dirname, '..', 'app');
    const directoryStructure = getDirectoryStructure(appDir);
    const keyFiles = getKeyFiles();
    const { dependencies, devDependencies } = getDependencies();

    // Evaluate with AI
    const result = await evaluateArchitectureSync(architectureDoc, {
      directoryStructure,
      keyFiles,
      dependencies,
      devDependencies,
    });

    // Report results
    if (!result.inSync) {
      console.error('\n[architecture-sync] Architecture documentation is out of sync!');
      console.error(`Score: ${result.score}/100\n`);
      console.error('Issues found:');
      result.issues.forEach((issue, i) => {
        console.error(`  ${i + 1}. ${issue}`);
      });
    }

    expect(result.inSync).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80); // Require at least 80% sync score
  }, 30000); // 30 second timeout for AI API call
});

