import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Production Supabase project refs. Test tooling refuses to touch these. */
export const PRODUCTION_PROJECT_REFS = ['mmomoyszozclfjdvjbeb'];

export const REPO_ROOT = path.resolve(__dirname, '../..');
export const STAGING_ENV_FILE = path.join(REPO_ROOT, '.env.staging');

export type StagingEnv = {
  /** Every variable in .env.staging (used to start Metro). */
  raw: Record<string, string>;
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  personaPassword?: string;
};

export const assertNotProduction = (url: string) => {
  const hit = PRODUCTION_PROJECT_REFS.find((ref) => url.includes(ref));
  if (hit) {
    throw new Error(
      `.env.staging points at the PRODUCTION project (${hit}). Test accounts must only live in staging.`,
    );
  }
};

export const loadStagingEnv = (): StagingEnv => {
  if (!fs.existsSync(STAGING_ENV_FILE)) {
    throw new Error(
      'Missing .env.staging. Copy scripts/test-accounts/staging.env.example to .env.staging and fill it in (see docs/TEST_ACCOUNTS.md).',
    );
  }
  const raw = dotenv.parse(fs.readFileSync(STAGING_ENV_FILE));
  const url = raw.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = raw.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anonKey) {
    throw new Error('.env.staging needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
  assertNotProduction(url);

  const serviceRoleKey = raw.SUPABASE_SERVICE_ROLE_KEY || undefined;
  // The service-role key bypasses RLS. Anything named EXPO_PUBLIC_* is bundled into
  // the app, so refuse to run if the key has been put in a public variable.
  if (serviceRoleKey) {
    const leaked = Object.entries(raw).find(
      ([key, value]) => key.startsWith('EXPO_PUBLIC_') && value === serviceRoleKey,
    );
    if (leaked) {
      throw new Error(`${leaked[0]} contains the service-role key. It must never be an EXPO_PUBLIC_ variable.`);
    }
  }

  return {
    raw,
    url,
    anonKey,
    serviceRoleKey,
    personaPassword: raw.TEST_PERSONA_PASSWORD || undefined,
  };
};

const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;

export const createServiceClient = (env: StagingEnv): SupabaseClient => {
  if (!env.serviceRoleKey) {
    throw new Error('.env.staging needs SUPABASE_SERVICE_ROLE_KEY (staging project → Settings → API).');
  }
  return createClient(env.url, env.serviceRoleKey, noSession);
};

export const createAnonClient = (env: StagingEnv): SupabaseClient =>
  createClient(env.url, env.anonKey, noSession);

export const requirePersonaPassword = (env: StagingEnv): string => {
  if (!env.personaPassword || env.personaPassword.length < 8) {
    throw new Error('.env.staging needs TEST_PERSONA_PASSWORD (at least 8 characters), shared by all personas.');
  }
  return env.personaPassword;
};

/** Finds auth users by email (paginates the admin API). */
export const findUsersByEmail = async (
  admin: SupabaseClient,
  emails: readonly string[],
): Promise<Map<string, string>> => {
  const wanted = new Set(emails.map((e) => e.toLowerCase()));
  const found = new Map<string, string>();
  for (let page = 1; page < 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    data.users.forEach((user) => {
      const email = user.email?.toLowerCase();
      if (email && wanted.has(email)) found.set(email, user.id);
    });
    if (data.users.length < 1000) break;
  }
  return found;
};
