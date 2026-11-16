export function calculateConversionRate(views: number, submissions: number): number {
  if (!Number.isFinite(views) || !Number.isFinite(submissions) || views <= 0 || submissions <= 0) {
    return 0;
  }
  return Math.round((submissions / views) * 10_000) / 100;
}
