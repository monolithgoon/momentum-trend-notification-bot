import type { IKineticsComputePlanSpec } from "./kinetics/types/KineticsComputeSpecTypes";
import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import {
	KineticsSymbolFieldKey,
	KineticsTimestampFieldKey,
	type KineticsMetricFieldKeyType,
} from "./kinetics/types/RuntimeMetricFieldKeys";
import type {
	EnrichedSnapshotType,
	HorizonSpanType,
} from "./kinetics/types/ComputedKineticsTypes";
import { KineticsPipeline_5 } from "./kinetics/core/KineticsPipeline_4 copy";

// Concrete enriched output type
export type EnrichedLeaderboardSnapshot = EnrichedSnapshotType<
	ILeaderboardTickerSnapshot_2,
	KineticsMetricFieldKeyType,
	HorizonSpanType
>;

/* ------------------------------------------------------------------------
	 1️⃣ Resolve runtime keys
	 - Defines where to find ticker symbol and timestamp in the incoming snapshots.
------------------------------------------------------------------------ */
const symbolField = KineticsSymbolFieldKey.TICKER_SYMBOL_FIELD satisfies Extract<
	keyof ILeaderboardTickerSnapshot_2,
	string
>;

const tsField = KineticsTimestampFieldKey.LEADERBOARD_TIMESTAMP satisfies Extract<
	keyof ILeaderboardTickerSnapshot_2,
	string
>;

/**
 * Receives: ILeaderboardTickerSnapshot_2[]
 * Returns:  Map<string, EnrichedLeaderboardSnapshot>
 *
 * Enriches a batch of leaderboard snapshots with computed velocity, acceleration, and boost metrics.
 * - Metrics & horizons come from the provided `kineticsComputePlanSpec`.
 * - Writes to nested `derivedProps.metrics[metricKey][lookbackSpan]` (no flat magic-string fields).
 * - Timestamp & symbol fields are passed explicitly to the pipeline.
 */
export function computeNewBatchKinetics_4(
	snapshots: ILeaderboardTickerSnapshot_2[],
	historyBySymbolMap: Record<string, ILeaderboardTickerSnapshot_2[]>,
	kineticsComputePlanSpec: IKineticsComputePlanSpec,
	opts: { minRequiredSnapshots?: number } = {}
): Map<string, EnrichedLeaderboardSnapshot> {
	/* ------------------------------------------------------------------------
		 2️⃣ Determine minimum required history length
		 - Acceleration requires +1 point over the largest velocity lookbackSpan.
	------------------------------------------------------------------------ */
	const maxLookbackSpan =
		Math.max(0, ...kineticsComputePlanSpec.perMetricPlans.flatMap((m) => m.horizons.map((h) => h.lookbackSpan))) || 0;
	const minRequiredSnapshots = opts.minRequiredSnapshots ?? maxLookbackSpan + 1;

	/* ------------------------------------------------------------------------
		 3️⃣ Instantiate pipeline (no widening; full snapshot in/out)
		 - Passes kineticsComputePlanSpec + runtime keys to Kinetics Pipeline.
	------------------------------------------------------------------------ */
	const pipeline = new KineticsPipeline_5<ILeaderboardTickerSnapshot_2>({
		kineticsCompPlSpc: kineticsComputePlanSpec,
		runtimeKeys: {
			symbolFieldKey: symbolField,
			timestampFieldKey: tsField,
		},
	});

	/* ------------------------------------------------------------------------
		 4️⃣ Pre-process histories (sort, append current if newer)
		 - Collect ready symbols for a single pipeline call.
	------------------------------------------------------------------------ */
	const readySnapshots: ILeaderboardTickerSnapshot_2[] = [];
	const readyHistory: Record<string, ILeaderboardTickerSnapshot_2[]> = {};
	const results = new Map<string, EnrichedLeaderboardSnapshot>();

	for (const snapshot of snapshots) {
		const symbol = snapshot[symbolField];
		const ts = snapshot[tsField];

		let history = historyBySymbolMap[symbol] ?? [];

		// Retrieve & sort history in ascending timestamp order
		if (history.length > 1 && Number(history[0][tsField]) > Number(history[history.length - 1][tsField])) {
			history = history.slice().sort((a, b) => Number(a[tsField]) - Number(b[tsField]));
		}

		// Append current snapshot if newer than last
		const lastTs = history[history.length - 1]?.[tsField] as number | undefined;
		if (lastTs == null || lastTs < (ts as number)) history.push(snapshot);

		// Not enough history → return snapshot with empty derivedProps
		if (history.length < minRequiredSnapshots) {
			const maybeDerived = (snapshot as unknown as Partial<EnrichedLeaderboardSnapshot>).derivedProps;
			const derivedProps: EnrichedLeaderboardSnapshot["derivedProps"] =
				maybeDerived ??
				({
					computedKinetics: {
						byMetric: {},
					},
				} as const);

			results.set(symbol, { ...snapshot, derivedProps });
			continue;
		}

		// Queue for batch processing
		readySnapshots.push(snapshot);
		readyHistory[symbol] = history;
	}

	/* ------------------------------------------------------------------------
		 5️⃣ Run enrichment pipeline for ready symbols
		 - Computes Velocity, Acceleration, Boosts → writes to `derivedProps.metrics`.
	------------------------------------------------------------------------ */
	if (readySnapshots.length) {
		const enriched = pipeline.processBatch(readySnapshots, readyHistory); // Map<string, EnrichedLeaderboardSnapshot>
		for (const s of readySnapshots) {
			results.set(s[symbolField], enriched.get(s[symbolField])!);
		}
	}

	/* ------------------------------------------------------------------------
		 ✅ Return results map keyed by symbol
	------------------------------------------------------------------------ */
	return results as Map<string, EnrichedLeaderboardSnapshot>;
}
