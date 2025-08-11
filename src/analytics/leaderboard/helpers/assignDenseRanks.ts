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


// Dense rank (1 = best) for descending metrics; NaN/undefined → worst
function denseRankDescending(values: Array<[string, number]>): Map<string, number> {
  // sanitize: non-finite → -Infinity so they sort to the bottom
  const cleaned = values.map(([sym, v]) => [sym, Number.isFinite(v) ? v : -Infinity] as [string, number]);

  // sort high → low
  cleaned.sort((a, b) => b[1] - a[1]);

  const ranks = new Map<string, number>();
  let rank = 0;
  let prevVal: number | undefined;

  for (let i = 0; i < cleaned.length; i++) {
    const [sym, val] = cleaned[i];
    if (i === 0 || val !== prevVal) {
      rank = rank + 1; // dense: next distinct value increments by 1
      prevVal = val;
    }
    ranks.set(sym, rank);
  }
  return ranks;
}