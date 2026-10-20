-- Profile body fields, round two.
--
-- * `age` (a number that silently goes stale) becomes `birth_year`. Age is
--   computed at read time so it ticks over on its own. Existing ages are
--   backfilled as (this year - age), the best we can do.
-- * `weight` and `height` were stored in pounds and inches with nothing in
--   the name saying so, which is how the UI ended up showing bare numbers.
--   They become `weight_kg` and `height_cm` (canonical metric; the UI
--   converts to the viewer's unit system). Existing values are converted.
-- * `sex` is normalised to male | female | intersex | null.
-- * Sanity bounds: 0.4 lb was accepted before.
--
-- Idempotent: each step checks the column it is about to touch.

do $$
begin
  -- age -> birth_year
  if exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'age') then
    alter table profiles add column if not exists birth_year integer;
    update profiles
      set birth_year = extract(year from now())::int - age::int
      where age is not null and birth_year is null;
    alter table profiles drop column age;
  else
    alter table profiles add column if not exists birth_year integer;
  end if;

  -- weight (lb) -> weight_kg
  if exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'weight') then
    alter table profiles rename column weight to weight_kg;
    update profiles set weight_kg = round((weight_kg * 0.45359237)::numeric, 2) where weight_kg is not null;
  end if;

  -- height (in) -> height_cm
  if exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'height') then
    alter table profiles rename column height to height_cm;
    update profiles set height_cm = round((height_cm * 2.54)::numeric, 1) where height_cm is not null;
  end if;
end $$;

-- Normalise free-text sex values; anything unrecognised is cleared.
update profiles
  set sex = case
    when lower(trim(sex)) in ('male', 'm', 'man') then 'male'
    when lower(trim(sex)) in ('female', 'f', 'woman') then 'female'
    when lower(trim(sex)) in ('intersex') then 'intersex'
    else null
  end
  where sex is not null;

-- Clear values outside the new bounds rather than fail the migration.
update profiles set weight_kg = null where weight_kg is not null and (weight_kg < 20 or weight_kg > 500);
update profiles set height_cm = null where height_cm is not null and (height_cm < 90 or height_cm > 260);
update profiles set body_fat_percentage = null where body_fat_percentage is not null and (body_fat_percentage < 1 or body_fat_percentage > 75);
update profiles set birth_year = null where birth_year is not null and (birth_year < 1900 or birth_year > extract(year from now())::int - 18);

alter table profiles
  drop constraint if exists profiles_body_fat_check,
  add constraint profiles_body_fat_check check (body_fat_percentage is null or (body_fat_percentage >= 1 and body_fat_percentage <= 75)),
  drop constraint if exists profiles_weight_kg_check,
  add constraint profiles_weight_kg_check check (weight_kg is null or (weight_kg >= 20 and weight_kg <= 500)),
  drop constraint if exists profiles_height_cm_check,
  add constraint profiles_height_cm_check check (height_cm is null or (height_cm >= 90 and height_cm <= 260)),
  drop constraint if exists profiles_birth_year_check,
  add constraint profiles_birth_year_check check (birth_year is null or (birth_year >= 1900 and birth_year <= extract(year from now())::int - 18)),
  drop constraint if exists profiles_sex_check,
  add constraint profiles_sex_check check (sex is null or sex in ('male', 'female', 'intersex'));

-- Settings: the single followers/following toggles split into count + list,
-- and the redundant "body-stats section" toggle goes away (the section shows
-- whenever any body field is visible).
update profiles
  set settings = (coalesce(settings, '{}'::jsonb)
    || jsonb_build_object(
      'showFollowersCount', coalesce((settings->>'showFollowersCount')::boolean, (settings->>'showFollowers')::boolean, false),
      'showFollowersList',  coalesce((settings->>'showFollowersList')::boolean,  (settings->>'showFollowers')::boolean, false),
      'showFollowingCount', coalesce((settings->>'showFollowingCount')::boolean, (settings->>'showFollowing')::boolean, false),
      'showFollowingList',  coalesce((settings->>'showFollowingList')::boolean,  (settings->>'showFollowing')::boolean, false)
    )) - 'showFollowers' - 'showFollowing' - 'showBodyStats'
  where settings is null
     or settings ? 'showFollowers' or settings ? 'showFollowing' or settings ? 'showBodyStats'
     or not (settings ? 'showFollowersCount');
