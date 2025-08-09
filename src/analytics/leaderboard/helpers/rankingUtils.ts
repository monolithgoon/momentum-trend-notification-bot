export function assignDenseRanks1Based<T>(
  items: T[],
  getSymbol: (item: T) => string,
  getValue: (item: T) => number
): Map<string, number> {
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a));
  const rankMap = new Map<string, number>();

  let lastValue: number | null = null;
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const value = getValue(item);

    if (lastValue === null || value !== lastValue) {
      currentRank = i + 1;
      lastValue = value;
    }

    rankMap.set(getSymbol(item), currentRank);
  }

  return rankMap;
}
