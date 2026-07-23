-- Persist a user's onboarding goals on their profile so they follow the
-- account across devices (they were localStorage-only). Additive and
-- backward-safe: a text[] of canonical goal-category names defaulting to
-- empty. The existing owner-write RLS on profiles already covers updating it.
--
-- The frontend degrades gracefully until this is applied: profile reads
-- default goals to [] when the column is absent, and the goal-sync write is
-- best-effort (a failure there never blocks editing, which stays backed by
-- localStorage). Once this lands, goals sync automatically.
alter table profiles
  add column if not exists goals text[] not null default '{}';
