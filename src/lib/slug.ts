/** URL-safe slug from an event name. */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'event';
}

/** Appends -2, -3, … until `exists` returns false. */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => boolean | Promise<boolean>,
): Promise<string> {
  let slug = base;
  let i = 2;
  while (await exists(slug)) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}
