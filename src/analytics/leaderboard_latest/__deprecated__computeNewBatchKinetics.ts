import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface";
import { IKineticsComputePlanSpec } from "./kinetics/types/KineticsComputeSpecTypes";
import { KineticsPipeline_2 } from "./kinetics/core/KineticsPipeline";
import { KineticsSymbolFieldKey, KineticsTimestampFieldKey } from "./kinetics/types/FieldKeys";

/**
 * Enriches a batch of leaderboard snapshots with computed velocity, acceleration, and boost metrics.
 * - Metrics & horizons come from the provided `kineticsConfigSpec`.
 * - No hardcoded output field names — the pipeline uses kineticMetricFieldsMap.
 * - Timestamp & symbol fields are passed explicitly to the pipeline.
 */
export function computeNewBatchKinetics(
	snapshots: ILeaderboardTickerSnapshot_2[],
	historyBySymbolMap: Record<string, ILeaderboardTickerSnapshot_2[]>,
	kineticsConfigSpec: IKineticsComputePlanSpec,
	opts: { minRequiredSnapshots?: number } = {}
): Map<string, ILeaderboardTickerSnapshot_2> {
	/* ---------------------------------------------------------
     1️⃣ Resolve runtime keys
     - Defines where to find symbol and timestamp in snapshots.
  --------------------------------------------------------- */
	// Narrow, compile-checked keys against your snapshot type
	const symbolField = KineticsSymbolFieldKey.TICKER_SYMBOL_FIELD satisfies Extract<
		keyof ILeaderboardTickerSnapshot_2,
		string
	>;
	const tsField = KineticsTimestampFieldKey.LEADERBOARD_TIMESTAMP satisfies Extract<
		keyof ILeaderboardTickerSnapshot_2,
		string
	>;

	/* ---------------------------------------------------------
     2️⃣ Instantiate pipeline
     - Passes kineticsConfigSpec + runtime keys to KineticsPipeline_2.
  --------------------------------------------------------- */
	const pipeline = new KineticsPipeline_2<ILeaderboardTickerSnapshot_2>({
		kineticsCfg: kineticsConfigSpec,
		keys: {
			symbolFieldKey: symbolField,
			timestampFieldKey: tsField,
		},
	});

	/* ---------------------------------------------------------
     3️⃣ Determine minimum required history length
     - Acceleration requires +1 point over the largest velocity lookbackSpan.
  --------------------------------------------------------- */
	const maxLookback = Math.max(0, ...kineticsConfigSpec.metricsConfig.flatMap((m) => m.horizons.map((h) => h.lookbackSpan))) || 0;

	const minRequiredSnapshots = opts.minRequiredSnapshots ?? maxLookback + 1;

	/* ---------------------------------------------------------
     4️⃣ Process batch
     - Loops over each snapshot, merges it into history, 
       ensures order, and runs the enrichment pipeline.
  --------------------------------------------------------- */
	const results = new Map<string, ILeaderboardTickerSnapshot_2>();

	for (const snapshot of snapshots) {
		const symbol = snapshot[symbolField] as unknown as string;

		// Retrieve & sort history in ascending timestamp order
		let history = historyBySymbolMap[symbol] ?? [];
		if (history.length > 1 && Number(history[0][tsField]) > Number(history[history.length - 1][tsField])) {
			history = history.slice().sort((a, b) => Number(a[tsField]) - Number(b[tsField]));
		}

		// Append current snapshot if newer than last
		const lastTs = history[history.length - 1]?.[tsField] as number | undefined;
		if (lastTs == null || lastTs < (snapshot[tsField] as number)) {
			history.push(snapshot);
		}

		// Skip if insufficient history for all horizons
		if (history.length < minRequiredSnapshots) {
			results.set(symbol, snapshot);
			continue;
		}

		/* ---------------------------------------------------------
       🚀 Run enrichment pipeline
       - Computes Velocity, Acceleration, and Boosts for 
         all configured metrics & horizons.
    --------------------------------------------------------- */
		const enrichedMap = pipeline.processBatch([snapshot], { [symbol]: history });

		// Merge enriched snapshot into results
		results.set(symbol, enrichedMap.get(symbol) ?? snapshot);
	}

	/* ---------------------------------------------------------
     ✅ Return results map keyed by symbol
  --------------------------------------------------------- */
	return results;
}
