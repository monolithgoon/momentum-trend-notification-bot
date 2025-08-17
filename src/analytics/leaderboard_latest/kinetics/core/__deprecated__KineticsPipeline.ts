import { kineticMetricFieldsMap } from "../schema/kineticMetricFieldsMap";
import { IKineticsComputePlanSpec,IKineticsRuntimeFieldKeys } from "../types/KineticsComputeSpecTypes";
import { KineticsCalculator } from "./KineticsCalculator";

/* =============================================================================
  🔹 KineticsPipeline_2
  -----------------------------------------------------------------------------
  Orchestrates velocity & acceleration calculations for leaderboard snapshots.

  Purpose:
  --------
  - Acts as the main coordination layer for the Kinetics system.
  - Takes in raw snapshot data + historical series for each symbol.
  - Computes 1st derivative (velocity) and 2nd derivative (acceleration)
    across multiple metric types and horizons as defined in config.
  - Optionally applies "boosts" (custom formulas) to enrich final metrics.

  Policy:
  -------
  - This class does **not** assume any fixed field names for timestamps
    or metrics; it relies entirely on the `kineticsConfigSpec` and field maps.
  - Operates on generic `TIn` types that represent leaderboard snapshot shapes.
  - Produces a **Map** keyed by symbol, with enriched snapshots as values.
============================================================================= */

export class KineticsPipeline_2<TIn extends Record<string, any>> {
	private readonly calc = new KineticsCalculator();

	constructor(
		private readonly cfg: {
			kineticsCfg: IKineticsComputePlanSpec;
			keys: IKineticsRuntimeFieldKeys<TIn>;
		}
	) {}

	/**
	 * Compute velocity, acceleration, and boost metrics for a batch of snapshots.
	 *
	 * @param snapshots        - Latest snapshot objects (one per symbol)
	 * @param historyBySymbol  - Map from symbol → array of historical snapshots
	 * @param kineticsConfigSpec   - Runtime config controlling metrics, horizons, normalization, and boosts
	 * @returns                - Map from symbol → enriched snapshot
	 *
	 * How it works:
	 * -------------
	 * 1. Loops over each latest snapshot in the batch.
	 * 2. Looks up the full historical series for the symbol.
	 * 3. For each metric fiekd key + horizon defined in `kineticsConfigSpec`:
	 *    a. Computes velocity using the configured lookbackSpan.
	 *    b. Computes acceleration from the velocity series.
	 *    c. Applies velocity guard if enabled (zeroing acceleration).
	 *    d. Stores computed values in the enriched snapshot object.
	 *    e. Applies any configured "boosts" (custom formulas).
	 * 4. Returns all enriched snapshots as a Map for easy downstream merging.
	 */

	processBatch(snapshots: TIn[], historyBySymbol: Record<string, TIn[]>): Map<string, TIn> {
		const results = new Map<string, TIn>();

		for (const snapshot of snapshots) {
			// Extract the symbol from the configured field
			const rawSymbol = snapshot[this.cfg.keys.symbolFieldKey];
			if (rawSymbol == null) continue;
			const symbol = String(rawSymbol);

			// Historical series for this symbol
			const history = historyBySymbol[symbol] ?? [];

			// Clone the snapshot to avoid mutating the original
			const enriched: TIn = { ...snapshot };

			for (const metricCfg of this.cfg.kineticsCfg.metricsConfig) {
				const mapEntry = kineticMetricFieldsMap[metricCfg.metricFieldKey];
				if (!mapEntry) continue; // Unknown metric; skip silently.

				for (const horizon of metricCfg.horizons) {
					const lookbackSpan = horizon.lookbackSpan;
					const normalize = horizon.normalize;

					// If output field names aren't defined for this lookbackSpan, skip.
					const velKey = mapEntry.velocity[lookbackSpan];
					const accKey = mapEntry.acceleration[lookbackSpan];
					if (!velKey || !accKey) continue;

					/* ---------------------------------------------------------
             1️⃣ Compute Velocity (1st derivative)
             - Uses the specified metric field key.
             - Lookback controls how many historical points to use.
             - Normalization applied if strategy != NONE.
          --------------------------------------------------------- */
					const vel = this.calc.computeVelocity_2(
						history,
						metricCfg.metricFieldKey,
						lookbackSpan,
						normalize,
						this.cfg.keys.timestampFieldKey as keyof TIn
					);

					/* ---------------------------------------------------------
             2️⃣ Compute Acceleration (2nd derivative)
             - Uses the velocity series for the metric.
             - Same lookbackSpan as velocity computation.
             - Normalization applied if strategy != NONE.
          --------------------------------------------------------- */
					const acc = this.calc.computeAcceleration_2(
						history,
						metricCfg.metricFieldKey,
						lookbackSpan,
						normalize,
						this.cfg.keys.timestampFieldKey as keyof TIn
					);

					/* ---------------------------------------------------------
             3️⃣ Velocity Guard (optional)
             - If enabled, zero out acceleration when velocity is
               below the configured minVelocity threshold.
          --------------------------------------------------------- */
					let finalAcc = acc;
					if (metricCfg.enableVelocityGuard) {
						const minV = metricCfg.minVelocity ?? 0;
						if (Math.abs(vel) < minV) finalAcc = 0;
					}

					/* ---------------------------------------------------------
             4️⃣ Store Computed Metrics
             - Use kineticMetricFieldsMap to avoid hardcoding keys.
             - Store velocity and acceleration keyed by horizon.
          --------------------------------------------------------- */
					(enriched as any)[velKey] = vel;
					(enriched as any)[accKey] = finalAcc;

					/* ---------------------------------------------------------
             5️⃣ Apply Boosts (optional)
             - Boost formulas are custom functions of velocity & acceleration.
             - Stored in the same map structure as velocity/acceleration.
          --------------------------------------------------------- */
					if (metricCfg.boosts?.length) {
						for (const boost of metricCfg.boosts) {
							const boostField = mapEntry.boosts[boost.name]?.[lookbackSpan];
							if (!boostField) continue;
							(enriched as any)[boostField] = boost.formula(vel, finalAcc);
						}
					}
				}
			}

			results.set(symbol, enriched);
		}

		return results;
	}
}
