// Loads the public catalog (substances/brands/stacks) from Supabase and maps
// it into the existing mock-shaped interfaces (`Substance`, `Brand`, `Stack`)
// so pages can render Supabase-backed data through the same shape they
// already consume from `src/data/mockData`.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  TYPE_TAGS,
  HEALTH_LABELS,
  type Substance,
  type Brand,
  type Stack,
  type Domain,
  type TypeTag,
  type AdministrationMethod,
  type HealthLabel,
} from '../../data/mockData';
import { inferCanonicalCategories } from '../../lib/categoryInference';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ADMINISTRATION_METHODS: AdministrationMethod[] = ['👄 Oral', '💉 Injectable', '🧴 Topical', '👅 Sublingual'];

const SUBSTANCE_SELECT =
  'id, slug, name, classification, description, average_dosage, length_of_cycle, tolerance_buildup, ' +
  'risk_level, most_popular_brand_id, formula, origin, how_obtained, half_life, ' +
  'substance_aliases(alias), ' +
  'substance_routes(category_routes(domain,category)), ' +
  'substance_type_tags(type_tags(label)), ' +
  'substance_administration_methods(administration_methods(label)), ' +
  'substance_markers(markers(label)), ' +
  'substance_effects(kind,value), ' +
  // substance_pairings has two FKs into substances (substance_id, pairs_with_id);
  // the `!substance_id` hint tells PostgREST which one links back to this row.
  'substance_pairings!substance_id(pairs_with_id)';

const BRAND_SELECT =
  'id, slug, name, description, shipping_reliability, contamination_reports, transparency, ' +
  'brand_products(name, substance_id, brand_ingredients(name,amount), brand_health_labels(label))';

const STACK_SELECT = 'id, name, description, creator_id, status, created_at, stack_components(substance_id)';

/** Matches a stored type_tag label back to the full emoji-prefixed TypeTag union member. */
function mapTypeTag(label: string | undefined): TypeTag | null {
  if (!label) return null;
  const byFull = TYPE_TAGS.find((t) => t.full === label);
  if (byFull) return byFull.full;
  const byLabel = TYPE_TAGS.find((t) => t.label === label);
  return byLabel ? byLabel.full : null;
}

/** Matches a stored administration_method label back to the emoji-prefixed union member. */
function mapAdministration(label: string | undefined): AdministrationMethod | null {
  if (!label) return null;
  const direct = ADMINISTRATION_METHODS.find((m) => m === label);
  if (direct) return direct;
  const bySuffix = ADMINISTRATION_METHODS.find((m) => m.endsWith(label));
  return bySuffix ?? null;
}

function mapHealthLabel(label: string | undefined): HealthLabel | null {
  if (!label) return null;
  return (HEALTH_LABELS as readonly string[]).includes(label) ? (label as HealthLabel) : null;
}

function mapSubstances(rows: any[], brandIdToSlug: Map<string, string>, substanceIdToName: Map<string, string>): Substance[] {
  return rows.map((row) => {
    const paths = (row.substance_routes ?? [])
      .map((r: any) => r.category_routes)
      .filter(Boolean)
      .map((cr: any) => ({ domain: cr.domain as Domain, category: cr.category as string }));

    // Raw type-tag labels carry the importer's taxonomic category + research
    // areas (e.g. "Vitamin", "bone health"), most of which aren't recognized
    // TypeTag values and get dropped below. They're the signal we use to
    // infer big-category membership for substances the importer left without
    // route paths, so they still appear under the category cards.
    const rawTypeTagLabels = (row.substance_type_tags ?? [])
      .map((t: any) => t.type_tags?.label)
      .filter((l: unknown): l is string => typeof l === 'string');

    const typeTags = rawTypeTagLabels
      .map((label: string) => mapTypeTag(label))
      .filter((t: TypeTag | null): t is TypeTag => t !== null);

    const administration = (row.substance_administration_methods ?? [])
      .map((a: any) => mapAdministration(a.administration_methods?.label))
      .filter((a: AdministrationMethod | null): a is AdministrationMethod => a !== null);

    const markers = (row.substance_markers ?? [])
      .map((m: any) => m.markers?.label)
      .filter((m: unknown): m is string => typeof m === 'string');

    const healthRisks = (row.substance_effects ?? [])
      .filter((e: any) => e.kind === 'health_risk')
      .map((e: any) => e.value as string);

    const subjectiveEffects = (row.substance_effects ?? [])
      .filter((e: any) => e.kind === 'subjective_effect')
      .map((e: any) => e.value as string);

    const possiblePairings = (row.substance_pairings ?? [])
      .map((p: any) => substanceIdToName.get(p.pairs_with_id))
      .filter((n: string | undefined): n is string => !!n);

    const aliases = (row.substance_aliases ?? [])
      .map((a: any) => a.alias)
      .filter((a: unknown): a is string => typeof a === 'string' && a.trim() !== '');

    // Fall back to inferred big categories when the importer gave a substance
    // no route paths, so it isn't stranded outside every category card. Real
    // route paths always win.
    const resolvedPaths = paths.length > 0
      ? paths
      : inferCanonicalCategories([...rawTypeTagLabels, markers.join(' '), row.description, row.name])
          .map((category) => ({ domain: 'Body' as Domain, category }));

    return {
      id: row.slug,
      name: row.name,
      aliases: aliases.length > 0 ? aliases : undefined,
      formula: row.formula ?? undefined,
      description: row.description,
      paths: resolvedPaths,
      typeTags,
      classification: row.classification,
      administration,
      averageDosage: row.average_dosage ?? '',
      lengthOfCycle: row.length_of_cycle ?? '',
      mostPopularBrandId: row.most_popular_brand_id ? brandIdToSlug.get(row.most_popular_brand_id) ?? '' : '',
      healthRisks,
      subjectiveEffects,
      toleranceBuildup: row.tolerance_buildup ?? '',
      possiblePairings,
      // risk_level is nullable in Supabase. Leave it undefined when unset rather
      // than fabricating a value — showing "Moderate" for a substance the
      // importer never assessed (e.g. aged garlic) is misleading. The substance
      // page simply hides the risk tile when this is absent.
      riskLevel: (row.risk_level as Substance['riskLevel']) ?? undefined,
      markers: markers.length > 0 ? markers : undefined,
      origin: row.origin ?? undefined,
      howObtained: row.how_obtained ?? undefined,
      halfLife: row.half_life ?? undefined,
    };
  });
}

function mapBrands(rows: any[], substanceIdToSlug: Map<string, string>): Brand[] {
  return rows.map((row) => {
    const products = row.brand_products ?? [];

    const productIds = products
      .map((p: any) => (p.substance_id ? substanceIdToSlug.get(p.substance_id) : undefined))
      .filter((id: string | undefined): id is string => !!id);

    const productCatalog = products.map((p: any) => ({
      name: p.name,
      substanceId: p.substance_id ? substanceIdToSlug.get(p.substance_id) : undefined,
      ingredients: (p.brand_ingredients ?? []).map((ing: any) => ({
        name: ing.name,
        amount: ing.amount ?? undefined,
      })),
      healthLabels: (p.brand_health_labels ?? [])
        .map((h: any) => mapHealthLabel(h.label))
        .filter((h: HealthLabel | null): h is HealthLabel => h !== null),
    }));

    return {
      id: row.slug,
      name: row.name,
      description: row.description ?? undefined,
      products: productIds.length > 0 ? productIds : undefined,
      productCatalog: productCatalog.length > 0 ? productCatalog : undefined,
      shippingReliability: row.shipping_reliability != null ? Number(row.shipping_reliability) : 0,
      contaminationReports: row.contamination_reports ?? 0,
      transparency: row.transparency ?? undefined,
      // Not modeled in the catalog schema yet (per-user star ratings and 3rd
      // party testing links live elsewhere / haven't landed); default so the
      // shape stays valid until those surfaces are wired up.
      thirdPartyTestingLinks: [],
      userRating: 0,
      ratingCount: 0,
    };
  });
}

function mapStacks(rows: any[], substanceIdToSlug: Map<string, string>, substanceIdToName: Map<string, string>): Stack[] {
  return rows
    .map((row) => {
      const substances = (row.stack_components ?? [])
        .map((c: any) => {
          const slug = substanceIdToSlug.get(c.substance_id);
          const name = substanceIdToName.get(c.substance_id);
          return slug && name ? { id: slug, name } : null;
        })
        .filter((c: { id: string; name: string } | null): c is { id: string; name: string } => c !== null);

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        substances,
        creatorId: row.creator_id ?? '',
        createdAt: row.created_at,
        status: row.status,
      };
    });
}

export async function loadSupabaseCatalog(
  client: SupabaseClient,
): Promise<{ substances: Substance[]; brands: Brand[]; stacks: Stack[] } | null> {
  try {
    const [substancesRes, brandsRes, stacksRes] = await Promise.all([
      client.from('substances').select(SUBSTANCE_SELECT),
      client.from('brands').select(BRAND_SELECT),
      client.from('stacks').select(STACK_SELECT),
    ]);

    if (substancesRes.error) throw substancesRes.error;
    if (brandsRes.error) throw brandsRes.error;
    if (stacksRes.error) throw stacksRes.error;

    const rawSubstances = substancesRes.data ?? [];
    const rawBrands = brandsRes.data ?? [];
    const rawStacks = stacksRes.data ?? [];

    const substanceIdToSlug = new Map<string, string>(rawSubstances.map((s: any) => [s.id, s.slug]));
    const substanceIdToName = new Map<string, string>(rawSubstances.map((s: any) => [s.id, s.name]));
    const brandIdToSlug = new Map<string, string>(rawBrands.map((b: any) => [b.id, b.slug]));

    return {
      substances: mapSubstances(rawSubstances, brandIdToSlug, substanceIdToName),
      brands: mapBrands(rawBrands, substanceIdToSlug),
      stacks: mapStacks(rawStacks, substanceIdToSlug, substanceIdToName),
    };
  } catch (error) {
    console.warn('[catalog] Failed to load Supabase catalog; falling back to mock data.', error);
    return null;
  }
}
