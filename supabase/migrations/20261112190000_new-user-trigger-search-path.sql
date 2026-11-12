-- handle_new_auth_user runs with full privileges (SECURITY DEFINER) whenever someone signs
-- up, but didn't fix its search_path, so it would resolve unqualified names however the
-- session had search_path set. Its body already uses public.users, so pinning the path
-- changes nothing it does. Found by the rules lint (scripts/security/lint.js). Safe to re-run.

alter function public.handle_new_auth_user() set search_path = public;
