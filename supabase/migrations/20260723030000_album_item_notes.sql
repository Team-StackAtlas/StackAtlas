-- Per-item notes on album items ("Good info on dosing on page 2").
-- Additive: a nullable text column on library_album_items. The existing
-- library_album_items_owner_write policy already grants the album owner ALL
-- (insert/update/delete) on their items, so updating the note needs no new
-- policy; the library_album_items_read policy already exposes the row (and
-- thus the note) to public-album viewers, which is the intended behavior
-- (notes read as captions on a shared album).
alter table library_album_items
  add column if not exists note text;
