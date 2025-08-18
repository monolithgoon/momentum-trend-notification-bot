import type { IPipelineComputePlanSpec } from "./kinetics/types/KineticsComputeSpecTypes";
import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { FIELD_KEYS, SnapshotMetricFieldKeyType } from "./kinetics/config/KineticsFieldBindings";
import type { EnrichedSnapshotType, HorizonSpanType } from "./kinetics/types/ComputedKineticsTypes";
import { KineticsPipeline_6 } from "./kinetics/core/KineticsPipeline_6_patched";

// Concrete enriched output type
export type EnrichedLeaderboardSnapshot = EnrichedSnapshotType<
	ILeaderboardTickerSnapshot_2,
	SnapshotMetricFieldKeyType,
	HorizonSpanType
>;

/* ------------------------------------------------------------------------
	 1️⃣ Resolve runtime keys
	 - Defines where to find ticker tickerSymbol and timestamp in the incoming snapshots.
------------------------------------------------------------------------ */
const symbolFieldKey = FIELD_KEYS.TICKER_SYMBOL_FIELD satisfies Extract<keyof ILeaderboardTickerSnapshot_2, string>;
const tsFieldKey = FIELD_KEYS.TIMESTAMP_FIELD satisfies Extract<keyof ILeaderboardTickerSnapshot_2, string>;

/**
 * Receives: ILeaderboardTickerSnapshot_2[]
 * Returns:  Map<string, EnrichedLeaderboardSnapshot>
 *
 * Enriches a batch of leaderboard snapshots with computed velocity, acceleration, and boost metrics.
 * - Metrics & horizons come from the provided `kineticsComputePlanSpec`.
 * - Writes to nested `derivedProps.metrics[metricKey][lookbackSpan]` (no flat magic-string fields).
 * - Timestamp & tickerSymbol fields are passed explicitly to the pipeline.
 */
export function computeNewBatchKinetics_4(
	snapshots: ILeaderboardTickerSnapshot_2[],
	historyBySymbolMap: Record<string, ILeaderboardTickerSnapshot_2[]>,
	kineticsComputePlanSpec: IPipelineComputePlanSpec,
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
	const pipeline = new KineticsPipeline_6<ILeaderboardTickerSnapshot_2>({
		pipelineComputeSpec: kineticsComputePlanSpec,
		symbolFieldKey: symbolFieldKey,
		timestampFieldKey: tsFieldKey,
	});

	/* ------------------------------------------------------------------------
		 4️⃣ Pre-process histories (sort, append current if newer)
		 - Collect ready symbols for a single pipeline call.
	------------------------------------------------------------------------ */
	const readySnapshots: ILeaderboardTickerSnapshot_2[] = [];
	const readyHistory: Record<string, ILeaderboardTickerSnapshot_2[]> = {};
	const results = new Map<string, EnrichedLeaderboardSnapshot>();

	for (const snapshot of snapshots) {
		const tickerSymbol = snapshot[symbolFieldKey];
		const ts = snapshot[tsFieldKey];

		let history = historyBySymbolMap[tickerSymbol] ?? [];

		// Retrieve & sort history in ascending timestamp order
		if (history.length > 1 && Number(history[0][tsFieldKey]) > Number(history[history.length - 1][tsFieldKey])) {
			history = history.slice().sort((a, b) => Number(a[tsFieldKey]) - Number(b[tsFieldKey]));
		}

		// Append current snapshot if newer than last
		const lastTs = history[history.length - 1]?.[tsFieldKey] as number | undefined;
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

			results.set(tickerSymbol, { ...snapshot, derivedProps });
			continue;
		}

		// Queue for batch processing
		readySnapshots.push(snapshot);
		readyHistory[tickerSymbol] = history;
	}

	/* ------------------------------------------------------------------------
		 5️⃣ Run enrichment pipeline for ready symbols
		 - Computes Velocity, Acceleration, Boosts → writes to `derivedProps.metrics`.
	------------------------------------------------------------------------ */
	if (readySnapshots.length) {
		const enriched = pipeline.processBatch(readySnapshots, readyHistory); // Map<string, EnrichedLeaderboardSnapshot>
		for (const s of readySnapshots) {
			results.set(s[symbolFieldKey], enriched.get(s[symbolFieldKey])!);
		}
	}

	/* ------------------------------------------------------------------------
		 ✅ Return results map keyed by tickerSymbol
	------------------------------------------------------------------------ */
	return results as Map<string, EnrichedLeaderboardSnapshot>;
}
