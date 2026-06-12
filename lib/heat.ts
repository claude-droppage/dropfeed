export interface HeatScoreInput {
  ageInDays: number
  newVariantsLast14Days: number
  /** total active ad variants for this product/brand */
  totalVariants: number
  euCountriesCount: number
  isActive: boolean
  /** days since brand started scaling; undefined = not scaling */
  scalingSince?: number
}

/**
 * Computes heat score (0–100) for an ad.
 *
 * Weights per PRD section 9:
 *   40% lifetime (log-scaled, 60+ days = max)
 *   25% scaling speed (new variants in last 14 days)
 *   15% variant count (more = actively testing & winning)
 *   10% geographic reach (EU countries)
 *   10% freshness (active bonus + young-but-already-scaling bonus)
 */
export function computeHeatScore(input: HeatScoreInput): number {
  const lifetimeScore =
    Math.min(Math.log(input.ageInDays + 1) / Math.log(61), 1) * 40

  const scalingScore = Math.min(input.newVariantsLast14Days / 10, 1) * 25

  const variantScore = Math.min(input.totalVariants / 20, 1) * 15

  const geoScore = Math.min(input.euCountriesCount / 8, 1) * 10

  let freshnessScore = input.isActive ? 5 : 0
  if (
    input.scalingSince !== undefined &&
    input.scalingSince <= 14 &&
    input.ageInDays >= 7
  ) {
    freshnessScore += 5
  }

  return Math.round(
    Math.min(
      lifetimeScore + scalingScore + variantScore + geoScore + freshnessScore,
      100,
    ),
  )
}
