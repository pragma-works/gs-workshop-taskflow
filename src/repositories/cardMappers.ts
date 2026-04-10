export function mapCardWithResolvedLabels<TLabel, TCard extends { labels: Array<{ label: TLabel }> }>(
  card: TCard,
): Omit<TCard, 'labels'> & { labels: TLabel[] } {
  const { labels, ...rest } = card

  return {
    ...rest,
    labels: labels.map(({ label }) => label),
  }
}
