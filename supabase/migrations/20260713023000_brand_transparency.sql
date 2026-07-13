-- Brand transparency signals (handoff §17/§29): a flexible jsonb record per
-- brand rather than a rigid column set, since the signal list will evolve
-- (COA availability, per-batch COAs, named third-party lab, testing methods,
-- public contact, documentation links). Import packs may set it; the brand
-- page renders known keys with an honest empty state. No ranking mechanics.

alter table brands add column if not exists transparency jsonb;

create or replace function admin_import_brands(p_batch_id uuid, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  item jsonb; product jsonb; ing jsonb; idx integer := -1;
  v_id uuid; v_product_id uuid; v_slug text; v_sub uuid; v_ref text;
  inserted integer := 0; updated integer := 0; skipped integer := 0;
  errors jsonb := '[]'::jsonb; warnings jsonb := '[]'::jsonb;
  existed boolean;
begin
  if auth.uid() is null or not is_site_owner() then raise exception 'site_owner role is required'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'p_rows must be a JSON array'; end if;

  for item in select value from jsonb_array_elements(p_rows) loop
    idx := idx + 1;
    begin
      v_slug := import_slugify(item->>'slug');
      if v_slug = '' then raise exception 'slug is required'; end if;
      if nullif(btrim(item->>'name'), '') is null then raise exception 'name is required'; end if;

      select id into v_id from brands where slug = v_slug;
      existed := v_id is not null;

      insert into brands as b (slug, name, description, shipping_reliability, contamination_reports, transparency, updated_at)
      values (
        v_slug,
        btrim(item->>'name'),
        nullif(btrim(item->>'description'), ''),
        nullif(btrim(item->>'shipping_reliability'), '')::numeric,
        coalesce(nullif(btrim(item->>'contamination_reports'), '')::integer, 0),
        case when jsonb_typeof(item->'transparency') = 'object' then item->'transparency' else null end,
        now()
      )
      on conflict (slug) do update set
        name = excluded.name,
        description = coalesce(excluded.description, b.description),
        shipping_reliability = coalesce(excluded.shipping_reliability, b.shipping_reliability),
        contamination_reports = excluded.contamination_reports,
        transparency = coalesce(excluded.transparency, b.transparency),
        updated_at = now()
      returning id into v_id;

      if item ? 'products' then
        for product in select value from jsonb_array_elements(item->'products') loop
          if nullif(btrim(product->>'name'), '') is null then
            warnings := warnings || jsonb_build_object('index', idx, 'message', 'product without a name skipped');
            continue;
          end if;
          v_sub := import_resolve_substance(product->>'substance_slug');
          if nullif(btrim(product->>'substance_slug'), '') is not null and v_sub is null then
            warnings := warnings || jsonb_build_object('index', idx, 'message', 'unknown product substance: ' || (product->>'substance_slug'));
          end if;

          insert into brand_products as bp (brand_id, substance_id, name)
          values (v_id, v_sub, btrim(product->>'name'))
          on conflict (brand_id, name) do update set substance_id = coalesce(excluded.substance_id, bp.substance_id)
          returning id into v_product_id;

          if product ? 'ingredients' then
            delete from brand_ingredients where brand_product_id = v_product_id;
            for ing in select value from jsonb_array_elements(product->'ingredients') loop
              if nullif(btrim(ing->>'name'), '') is not null then
                insert into brand_ingredients (brand_product_id, name, amount)
                values (v_product_id, btrim(ing->>'name'), nullif(btrim(ing->>'amount'), ''));
              end if;
            end loop;
          end if;

          if product ? 'health_labels' then
            delete from brand_health_labels where brand_product_id = v_product_id;
            for v_ref in select value #>> '{}' from jsonb_array_elements(product->'health_labels') loop
              if btrim(coalesce(v_ref, '')) <> '' then
                insert into brand_health_labels (brand_product_id, label) values (v_product_id, btrim(v_ref));
              end if;
            end loop;
          end if;
        end loop;
      end if;

      if existed then updated := updated + 1; else inserted := inserted + 1; end if;
    exception when others then
      skipped := skipped + 1;
      errors := errors || jsonb_build_object('index', idx, 'message', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('inserted', inserted, 'updated', updated, 'skipped', skipped,
                            'errors', errors, 'warnings', warnings, 'batch_id', p_batch_id);
end $$;

notify pgrst, 'reload schema';
