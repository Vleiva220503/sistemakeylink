/**
 * Resolves the display image URL for a product using a consistent cascade:
 *   1. Primary product image (from product_images table)
 *   2. First product image (if no primary is set)
 *   3. Brand logo (brands.logo_url or brand.logo_url — handles both aliases)
 *   4. null → SafeImage will fall back to the business logo (/logo-mundo-calzado.png)
 *
 * The function handles two brand property name conventions:
 *   - `brands` (plural) — used when querying products directly (no alias)
 *   - `brand`  (singular) — used when using Supabase alias `brand:brands(...)`
 *
 * @param product - A partial product object, typically from a Supabase join.
 * @param variantImageUrl - Optional direct image URL on the variant row itself.
 */
export function resolveProductImage(
  product?: {
    product_images?: { url: string; is_primary: boolean; sort_order?: number }[] | null
    brands?: { logo_url?: string | null; name?: string } | null
    brand?:  { logo_url?: string | null; name?: string } | null
  } | null,
  variantImageUrl?: string | null,
): string | null {
  if (!product) return null

  // 1. Variant-level image (highest priority)
  if (variantImageUrl) return variantImageUrl

  // 2. Primary product image
  const images = product.product_images
  if (images && images.length > 0) {
    const primary = images.find(i => i.is_primary)
    if (primary?.url) return primary.url
    if (images[0]?.url) return images[0].url
  }

  // 3. Brand logo — handles both "brand" (POS alias) and "brands" (direct query)
  const brandLogoUrl =
    product.brand?.logo_url   // alias used in pos-terminal / ventas query
    ?? product.brands?.logo_url // direct join used in inventario / productos queries

  if (brandLogoUrl) return brandLogoUrl

  // 4. No image — SafeImage component will show the business fallback logo
  return null
}
