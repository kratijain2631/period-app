import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { createGuidanceHandler } from './handler.ts';

Deno.serve(createGuidanceHandler((authorization) => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('PROJECT_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } },
), {
  apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
  model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
}));
