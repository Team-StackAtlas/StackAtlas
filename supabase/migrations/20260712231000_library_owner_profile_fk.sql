-- The library service embeds profiles(username) from library_albums, which
-- PostgREST can only resolve through a direct foreign key. owner_id already
-- references users(id); profiles shares that id space (profiles.id -> users.id),
-- so this adds the direct relationship the embed needs.

do $$ begin
  alter table library_albums
    add constraint library_albums_owner_profile_fk
    foreign key (owner_id) references profiles (id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
