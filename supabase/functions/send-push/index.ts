// Delivers queued pushes from push_outbox through Expo. Only the database calls
// this (its insert trigger and retry job), proven by the vault secret.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { rejectUnlessScheduled } from '../_shared/cronAuth.ts';
import { createSendPushHandler } from './handler.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

Deno.serve(createSendPushHandler({
  supabase,
  authorize: (req) => rejectUnlessScheduled(req, supabase),
  // Optional: only required once Expo's "enhanced push security" is turned on.
  expoAccessToken: Deno.env.get('EXPO_PUSH_ACCESS_TOKEN') ?? Deno.env.get('EXPO_ACCESS_TOKEN') ?? '',
}));
