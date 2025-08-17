import { KineticsMetricFieldKeyType } from "../types/RuntimeMetricFieldKeys";
import { IKineticsComputePlanSpec, IKineticsRuntimeFieldKeys } from "../types/KineticsComputeSpecTypes";
import { NormalizationStrategies } from "../types/NormalizationStrategies";
import { KineticsCalculator } from "./KineticsCalculator";

// WIP
type ComputedKineticsPropertyType = { velocity: number; acceleration: number; boosts?: Record<string, number> };
type ComputedKineticsResultsType<TKmf extends string, TLb extends number> = Record<TKmf, Partial<Record<TLb, ComputedKineticsPropertyType>>>;
type EnrichedSnapshotType<T, TKmf extends string, TLb extends number> = T & { derivedProps: { metrics: ComputedKineticsResultsType<TKmf, TLb> } };

// TKmf = your metric key union; TLb = your lookbackSpan union (number if not literal)
type TKmf = KineticsMetricFieldKeyType;
type TLb = number;

/** Derived metric entry stored per metric key + lookbackSpan */
type ComputedKineticsEntryType = {
	velocity: number;
	acceleration: number;
	boosts?: Record<string, number>;
};
// WIP

type Job = {
	metricKey: KineticsMetricFieldKeyType;
	lookbackSpan: number;
	normalize?: NormalizationStrategies;
	enableVelocityGuard: boolean;
	minVelocity: number;
	boosts: Array<{ name: string; formula: (v: number, a: number) => number }>;
};

/** === KineticsPipeline (functional version, nested `derivedProps` shape; comments preserved) === */

export class KineticsPipeline_3<TIn extends Record<string, any>> {
	private readonly calc = new KineticsCalculator();

	constructor(
		private readonly cfg: {
			/** keep naming as-is to match your existing code */
			kineticsCfg: IKineticsComputePlanSpec;
			keys: IKineticsRuntimeFieldKeys<TIn>;
		}
	) {}

	/** Precompute flat jobs to avoid deep nesting during execution */
	private get jobs(): Job[] {
		const metrics = this.cfg.kineticsCfg.metricsConfig;
		return metrics.flatMap((m) =>
			m.horizons.flatMap((h) => ({
				metricKey: m.metricFieldKey,
				lookbackSpan: h.lookbackSpan,
				normalize: h.normalize,
				enableVelocityGuard: !!m.enableVelocityGuard,
				minVelocity: m.minVelocity ?? 0,
				boosts: (m.boosts ?? []).map((b) => ({ name: b.name, formula: b.formula })),
			}))
		);
	}

	/**
	 * Compute velocity, acceleration, and boost metrics for a batch of snapshots.
	 *
	 * @param snapshots        - Latest snapshot objects (one per symbol)
	 * @param historyBySymbol  - Map from symbol → array of historical snapshots
	 * @returns                - Map from symbol → enriched snapshot (with `derivedProps.metrics`)
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
		const pairs: Array<[string, TIn]> = [];

		for (const snapshot of snapshots) {
			// Extract the symbol from the configured field
			const rawSymbol = snapshot[this.cfg.keys.symbolFieldKey];
			if (rawSymbol == null) continue;
			const symbol = String(rawSymbol);

			// Historical series for this symbol
			const history = historyBySymbol[symbol] ?? [];

			// // Clone the snapshot to avoid mutating the original
			// const enrichedSnapshot: TIn = { ...snapshot };

			// // Ensure nested structure exists
			// const derivedProps = ((enrichedSnapshot as any).derivedProps ??= {
			// 	metrics: {} as Record<KineticsMetricFieldKeyType, Partial<Record<number, ComputedKineticsEntryType>>>,
			// });

			// ✅ replace the `as any` line with this:
			const enrichedSnapshot: EnrichedSnapshotType<TIn, TKmf, TLb> = {
				...snapshot,
				derivedProps: (snapshot as Partial<EnrichedSnapshotType<TIn, TKmf, TLb>>).derivedProps ?? { metrics: {} as ComputedKineticsResultsType<TKmf, TLb> },
			};

			const derivedProps = enrichedSnapshot.derivedProps; // fully typed

			//
			const metricsBag = derivedProps.metrics as Record<
				KineticsMetricFieldKeyType,
				Partial<Record<number, ComputedKineticsEntryType>>
			>;

			for (const job of this.jobs) {
				/* ---------------------------------------------------------
           1️⃣ Compute Velocity (1st derivative)
           - Uses the specified metric field key.
           - Lookback controls how many historical points to use.
           - Normalization applied if strategy != NONE.
        --------------------------------------------------------- */
				const vel = this.calc.computeVelocity_2(
					history,
					job.metricKey,
					job.lookbackSpan,
					job.normalize,
					this.cfg.keys.timestampFieldKey as keyof TIn
				);

				/* ---------------------------------------------------------
           2️⃣ Compute Acceleration (2nd derivative)
           - Uses the velocity series for the metric.
           - Same lookbackSpan as velocity computation.
           - Normalization applied if strategy != NONE.
        --------------------------------------------------------- */
				const accVal = this.calc.computeAcceleration_2(
					history,
					job.metricKey,
					job.lookbackSpan,
					job.normalize,
					this.cfg.keys.timestampFieldKey as keyof TIn
				);

				/* ---------------------------------------------------------
           3️⃣ Velocity Guard (optional)
           - If enabled, zero out acceleration when velocity is
             below the configured minVelocity threshold.
        --------------------------------------------------------- */
				const finalAcc = job.enableVelocityGuard && Math.abs(vel) < job.minVelocity ? 0 : accVal;

				/* ---------------------------------------------------------
           4️⃣ Store Computed Metrics
           - Store velocity and acceleration keyed by horizon.
        --------------------------------------------------------- */
				const metricBucket = (metricsBag[job.metricKey] ??= {} as Partial<Record<number, ComputedKineticsEntryType>>);

				const entry = (metricBucket[job.lookbackSpan] ??= { velocity: 0, acceleration: 0 } as ComputedKineticsEntryType);

				entry.velocity = vel;
				entry.acceleration = finalAcc;

				/* ---------------------------------------------------------
           5️⃣ Apply Boosts (optional)
           - Boost formulas are custom functions of velocity & acceleration.
        --------------------------------------------------------- */
				if (job.boosts.length) {
					const boosts = (entry.boosts ??= {});
					for (const b of job.boosts) {
						boosts[b.name] = b.formula(vel, finalAcc);
					}
				}
			}

			pairs.push([symbol, enrichedSnapshot]);
		}

		return new Map(pairs);
	}
}
