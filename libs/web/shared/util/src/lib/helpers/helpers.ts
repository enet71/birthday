export function findRange<T extends { from: number; to: number }>(
  value: number,
  ranges: T[],
): T {
  return ranges.find(({ from, to }: T) => value >= from && value <= to)!;
}
