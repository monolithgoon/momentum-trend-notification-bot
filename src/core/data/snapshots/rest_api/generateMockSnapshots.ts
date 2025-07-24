import { NormalizedRestTickerSnapshot } from "@core/data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";

type MockSnapshotOptions = {
	changePctRange?: [number, number];
	trend?: "increasing" | "flat" | "random";
	seed?: number; // For deterministic generation
};

export function generateMockSnapshots(
	tickers: string[],
	numPerTicker: number,
	options: MockSnapshotOptions = {}
): NormalizedRestTickerSnapshot[] {
	const now = Date.now();
	const snapshots: NormalizedRestTickerSnapshot[] = [];

	const {
		changePctRange = [0, 200],
		trend = "random",
		seed,
	} = options;

	let random = Math.random;

	if (typeof seed === "number") {
		// Simple LCG (Linear Congruential Generator) for deterministic RNG
		let s = seed;
		random = () => {
			s = (s * 16807) % 2147483647;
			return (s % 1000) / 1000;
		};
	}

	for (const ticker_name__nz_tick of tickers) {
		let base = changePctRange[0] + random() * (changePctRange[1] - changePctRange[0]);

		for (let i = 0; i < numPerTicker; i++) {
			const timestamp = now - (numPerTicker - i) * 1000;
			let change_pct: number;

			if (trend === "increasing") {
				change_pct = base + i * 0.1;
			} else if (trend === "flat") {
				change_pct = base;
			} else {
				change_pct = parseFloat(
					(
						changePctRange[0] +
						random() * (changePctRange[1] - changePctRange[0])
					).toFixed(2)
				);
			}

			snapshots.push({
				ticker_name__nz_tick,
				timestamp,
				change_pct,
				price: 100 + random() * 10,
				volume: 1000 + Math.floor(random() * 500),
				ordinal_sort_position: i
			});
		}
	}

	// Sort descending per ticker by timestamp (optional)
	return snapshots.sort((a, b) =>
		a.ticker_name__nz_tick === b.ticker_name__nz_tick
			? b.timestamp - a.timestamp
			: a.ticker_name__nz_tick.localeCompare(b.ticker_name__nz_tick)
	);
}
