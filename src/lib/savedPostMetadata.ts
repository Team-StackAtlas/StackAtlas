import { BRANDS, type Post, STACKS, SUPPLEMENTS } from '../data/mockData';
import type { SavedItem } from '../hooks/useSaved';

export function getSavedPostMetadata(post: Post): Omit<SavedItem, 'id' | 'type' | 'savedAt'> {
  const supplement = SUPPLEMENTS.find((item) => item.id === post.supplementId);
  const brand = BRANDS.find((item) => item.id === post.brandId);
  const stack = STACKS.find((item) => item.id === post.stackId);
  const related = supplement
    ? { relatedType: 'substance', relatedId: supplement.id, relatedName: supplement.name }
    : brand
      ? { relatedType: 'brand', relatedId: brand.id, relatedName: brand.name }
      : stack
        ? { relatedType: 'stack', relatedId: stack.id, relatedName: stack.name }
        : undefined;

  return {
    title: post.title,
    description: post.content,
    siteName: post.author.displayName ?? post.author.username,
    originalCreatedAt: post.createdAt,
    bearings: post.bearings,
    ...related,
  };
}
