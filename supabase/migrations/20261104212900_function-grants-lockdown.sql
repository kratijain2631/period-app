-- Revoking from public doesn't remove Supabase's direct grants to anon and authenticated,
-- so these functions could still be called with only the public key. The reminder
-- functions are for the phase-change-reminder edge function (service role) only, and
-- search_users is for signed-in users. Applied by hand to staging and production on
-- 2026-11-04. Recorded here so the repo matches them. Safe to re-run.

revoke execute on function public.due_phase_reminders() from anon, authenticated;
revoke execute on function public.mark_phase_reminded(uuid, timestamptz) from anon, authenticated;
revoke execute on function public.search_users(text, int) from anon;
