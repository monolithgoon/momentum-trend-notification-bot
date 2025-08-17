import { KineticsMetricFieldKeyType } from "../types/RuntimeMetricFieldKeys";
import { IKineticsComputePlanSpec, IKineticsRuntimeFieldKeys } from "../types/KineticsComputeSpecTypes";
import { KineticsCalculator } from "./KineticsCalculator";
import {
	EnrichedSnapshotType,
	HorizonNormalizationType,
	HorizonSpanType,
	ComputedKineticsPropertyType,
	ComputedKineticsResultsType,
	KineticsBySpan,
} from "../types/ComputedKineticsTypes";

/* -----------------------------------------------------------------------------
   Output type alias: input snapshot enriched with computed kinetics
----------------------------------------------------------------------------- */
type TOut<T> = EnrichedSnapshotType<T, KineticsMetricFieldKeyType, HorizonSpanType>;

/* -----------------------------------------------------------------------------
   Flat “compute plan per horizon per metric, distilled from spec to avoid deep nesting at runtime
----------------------------------------------------------------------------- */
type PerMetricComputePlanSpecType = {
	metricFieldKey: KineticsMetricFieldKeyType;
	enableVelocityGuard: boolean;
	minVelocity: number;
	lookbackSpan: HorizonSpanType;
	normalizeStrat: HorizonNormalizationType;
	boosts: Array<{ name: string; formula: (v: number, a: number) => number }>;
};

/** === KineticsPipeline (functional version, nested computed kinetics shape; comments preserved) === */
export class KineticsPipeline_5<TIn extends Record<string, number | string | boolean | {}>> {
	private readonly calculator = new KineticsCalculator();
	private readonly computePlans: PerMetricComputePlanSpecType[];

	constructor(
		private readonly computeSpec: {
			kineticsCompPlSpc: IKineticsComputePlanSpec;
			runtimeKeys: IKineticsRuntimeFieldKeys<TIn>;
		}
	) {
		this.computePlans = this.buildFlattenedComputePlans(computeSpec.kineticsCompPlSpc); // precompute once
	}

	/**
	 * Compute velocity, acceleration, and boost metrics for a batch of snapshots.
	 *
	 * @param snapshots        - Latest snapshot objects (one per symbol)
	 * @param historyBySymbol  - Map from symbol → array of historical snapshots
	 * @returns                - Map from symbol → enriched snapshot (with `derivedProps.computedKinetics`)
	 *
	 * How it works:
	 * -------------
	 * 1. Loops over each latest snapshot in the batch.
	 * 2. Looks up the full historical series for the symbol.
	 * 3. For each metric fiekd key + horizon defined in `kineticsComputePlanSpec`:
	 *    a. Computes velocity using the configured horizons.
	 *    b. Computes acceleration from the velocity series.
	 *    c. Applies velocity guard if enabled (zeroing acceleration).
	 *    d. Stores computed values in the enriched snapshot object.
	 *    e. Applies any configured "boosts" (custom formulas).
	 * 4. Returns all enriched snapshots as a Map for easy downstream merging.
	 */
	public processBatch(snapshots: TIn[], historyBySymbol: Record<string, TIn[]>): Map<string, TOut<TIn>> {
		// TODO -> need to understand how the fuck this works
		// const output: Array<[string, TOut<TIn>]> = [];
		const output: Array<[string, EnrichedSnapshotType<TIn, KineticsMetricFieldKeyType, HorizonSpanType>]> = [];

		for (const snapshot of snapshots) {
			// Extract the symbol from the configured field
			const rawTickerSymbol = snapshot[this.computeSpec.runtimeKeys.symbolFieldKey];
			if (rawTickerSymbol == null) continue;

			const symbol = String(rawTickerSymbol);

			// Historical series for this symbol
			const history = historyBySymbol[symbol] ?? [];

			// ensure enriched shape (no `any`)
			const maybeDerived = (snapshot as unknown as Partial<TOut<TIn>>).derivedProps;

			// Clone and ensure derivedProps shape (no `any` casts)
			const enrichedSnapshot: TOut<TIn> = {
				...snapshot,
				derivedProps:
					maybeDerived ??
					({
						computedKinetics: {
							byMetric: {} as Partial<
								Record<
									KineticsMetricFieldKeyType,
									{ byLookbackSpan: Partial<Record<number, ComputedKineticsPropertyType>> }
								>
							>,
						},
					} as const),
			};

			// ✅ point at the nested container
			const computedKineticsResultsMatrix = enrichedSnapshot.derivedProps.computedKinetics.byMetric;

			for (const plan of this.computePlans) {
				/* ---------------------------------------------------------
           1️⃣ Compute Velocity (1st derivative)
           - Uses the specified metric field key.
           - Lookback controls how many historical points to use.
           - Normalization applied if strategy != NONE.
        --------------------------------------------------------- */
				const vel = this.calculator.computeVelocity_2(
					history,
					plan.metricFieldKey,
					plan.lookbackSpan,
					plan.normalizeStrat,
					this.computeSpec.runtimeKeys.timestampFieldKey
				);

				/* ---------------------------------------------------------
           2️⃣ Compute Acceleration (2nd derivative)
           - Uses the velocity series for the metric.
           - Same lookbackSpan as velocity computation.
           - Normalization applied if strategy != NONE.
        --------------------------------------------------------- */
				const accVal = this.calculator.computeAcceleration_2(
					history,
					plan.metricFieldKey,
					plan.lookbackSpan,
					plan.normalizeStrat,
					this.computeSpec.runtimeKeys.timestampFieldKey
				);

				/* ---------------------------------------------------------
           3️⃣ Velocity Guard (optional)
           - If enabled, zero out acceleration when velocity is
             below the configured minVelocity threshold.
        --------------------------------------------------------- */
				const finalAccel = plan.enableVelocityGuard && Math.abs(vel) < plan.minVelocity ? 0 : accVal;

				/* ---------------------------------------------------------
           4️⃣ Store Computed Metrics
           - Store velocity and acceleration keyed by horizon.
        --------------------------------------------------------- */
				const entry = this.constructKineticsResultsEntry(
					computedKineticsResultsMatrix,
					plan.metricFieldKey,
					plan.lookbackSpan
				);
				entry.velocity = vel;
				entry.acceleration = finalAccel;

				/* ---------------------------------------------------------
           5️⃣ Apply Boosts (optional)
           - Boost formulas are custom functions of velocity & acceleration.
        --------------------------------------------------------- */
				if (plan.boosts.length) {
					const boosts = (entry.boosts ??= {});
					for (const b of plan.boosts) {
						boosts[b.name] = b.formula(vel, finalAccel);
					}
				}
			}

			output.push([symbol, enrichedSnapshot]);
		}

		return new Map(output);
	}

	/** Build flat, per horizon span, compute plans for each metric (volume, pct_change) from the plan spec (pure). */
	private buildFlattenedComputePlans(computeSpec: IKineticsComputePlanSpec): PerMetricComputePlanSpecType[] {
		return computeSpec.perMetricPlans.flatMap((mPlan) =>
			mPlan.horizons.map((h) => ({
				metricFieldKey: mPlan.metricFieldKey,
				enableVelocityGuard: !!mPlan.enableVelocityGuard,
				minVelocity: mPlan.minVelocity ?? 0,
				lookbackSpan: h.lookbackSpan as HorizonSpanType,
				normalizeStrat: h.normalizeStrategy,
				boosts: (mPlan.boosts ?? []).map((boost) => ({ name: boost.name, formula: boost.formula })),
			}))
		);
	}

	// ✅ initializer with clear flow and correct types
	private constructKineticsResultsEntry(
		matrix: ComputedKineticsResultsType<KineticsMetricFieldKeyType, HorizonSpanType>,
		metricFieldKey: KineticsMetricFieldKeyType,
		lookbackSpan: HorizonSpanType
	): ComputedKineticsPropertyType {
		// Guarantee metric (eg. pct_change, volume) node
		if (!matrix[metricFieldKey]) {
			matrix[metricFieldKey] = { byLookbackSpan: {} as KineticsBySpan<HorizonSpanType> };
		}

		const metricNode = matrix[metricFieldKey]!; // now guaranteed

		// Guarantee lookback span node
		if (!metricNode.byLookbackSpan[lookbackSpan]) {
			metricNode.byLookbackSpan[lookbackSpan] = { velocity: 0, acceleration: 0 };
		}

		return metricNode.byLookbackSpan[lookbackSpan]!;
	}
}
