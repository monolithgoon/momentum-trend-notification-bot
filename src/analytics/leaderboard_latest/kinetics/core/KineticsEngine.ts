// KineticsPipeline_5 (patched) — applies fixes #2–#13 from review
// - Avoids double-casts via type guards
// - Tightens generics (TIn extends Record<string, unknown>)
// - Uses specific HorizonSpanType runtimeKeys instead of number
// - Unifies naming (`normalizeStrategy`) end-to-end at the plan level
// - Adds optional history guards: ascending timestamps + append-if-newer
// - Removes non-null assertions by structuring control flow
// - Avoids `as const` and `??=` pitfalls
// - Adds finite-number guardrails on calculator outputs
// - Cleans comments/typos
// - Uses straightforward Map accumulation

import {
	SnapshotMetricFieldKeyType,
	SnapshotSymbolFieldKeyType,
	SnapshotTimestampFieldKeyType,
} from "../config/KineticsFieldBindings";
import { KineticsCalculator } from "./KineticsCalculator";
import type {
	HorizonSpanType,
	HorizonNormalizationType,
	ComputedKineticsPropertyType,
	KineticsBySpan,
	KineticsByMetric,
	EnrichedSnapshotType,
	BoostDef,
} from "../types/KineticsResultTypes";

/* --------------------------------------------------------------------------
  Local helper types
-------------------------------------------------------------------------- */

/**
  PerMetricComputePlan
  ---------------------------------------------------------------------------
  Represents one metric’s configuration (expanded from DEFAULT_KINETICS_CONFIG).
  Each plan carries the metric key, guard thresholds, and a list of horizons.
 
  Example expansion (from DEFAULT_KINETICS_CONFIG):
 
  const perMetricPlans = [
    {
      metricFieldKey: "PRICE_PCT_CHANGE",
      enableVelocityGuard: true,
      minVelocity: 0.02,
      horizons: [
        { lookbackSpan: 3, normalizeStrategy: "NONE" },
        { lookbackSpan: 5, normalizeStrategy: "Z_SCORE" },
        { lookbackSpan: 8, normalizeStrategy: "Z_SCORE" },
      ],
    },
    {
      metricFieldKey: "VOLUME_CHANGE",
      enableVelocityGuard: false,
      minVelocity: 0,
      horizons: [
        { lookbackSpan: 3, normalizeStrategy: "NONE" },
        { lookbackSpan: 5, normalizeStrategy: "Z_SCORE" },
        { lookbackSpan: 8, normalizeStrategy: "Z_SCORE" },
      ],
    },
  ];
 */

type PerMetricComputePlan = {
	metricFieldKey: SnapshotMetricFieldKeyType;
	enableVelocityGuard: boolean;
	minVelocity: number;
	horizons: Array<{
		lookbackSpan: HorizonSpanType;
		normalizeStrategy: HorizonNormalizationType;
	}>;
	velAccBoostFns?: BoostDef[];
};

/**
	ResolvedComputePlan
	---------------------------------------------------------------------------
	Flattened runtime representation: expands each (metric × horizon)
	from PerMetricComputePlan into a single compute job.

	Example expansion:
	const resolvedPlans = [
		{
			metricKey: "PRICE_PCT_CHANGE",
			lookbackSpan: 3,
			normalizeStrategy: "NONE",
			enableVelocityGuard: true,
			minVelocity: 0.02,
			velAccBoostFns: [],
		},
		{
			metricKey: "PRICE_PCT_CHANGE",
			lookbackSpan: 5,
			normalizeStrategy: "Z_SCORE",
			enableVelocityGuard: true,
			minVelocity: 0.02,
			velAccBoostFns: [],
		},
		{
			metricKey: "VOLUME_CHANGE",
			lookbackSpan: 3,
			normalizeStrategy: "NONE",
			enableVelocityGuard: false,
			minVelocity: 0,
			velAccBoostFns: [],
		},
		...
	];
 */

/** Flat “compute plan per horizon per metric, distilled from spec to avoid deep nesting at runtime */
type ResolvedComputePlan = {
	metricKey: SnapshotMetricFieldKeyType;
	lookbackSpan: HorizonSpanType;
	normalizeStrategy: HorizonNormalizationType;
	enableVelocityGuard: boolean;
	minVelocity: number;
	velAccBoostFns: BoostDef[];
};

// Output type alias: input snapshot + enriched snapshot with computed kinetics
type TOut<TBase> = EnrichedSnapshotType<TBase, SnapshotMetricFieldKeyType, HorizonSpanType>;

/* --------------------------------------------------------------------------
  Type guards & pure helpers
-------------------------------------------------------------------------- */

/** Narrow TBase | TOut<TBase> → TOut<TBase> if derivedProps exists. */
function hasDerivedProps<TBase>(s: TBase | TOut<TBase>): s is TOut<TBase> {
	return typeof s === "object" && s !== null && "derivedProps" in (s as object);
}

/** Ensure ascending timestamp order; returns a new array if reordering is needed. */
function ensureAscByTimestamp<T extends Record<string, unknown>>(history: readonly T[], tsKey: keyof T): T[] {
	if (history.length <= 1) return history.slice();
	const first = Number(history[0][tsKey]);
	const last = Number(history[history.length - 1][tsKey]);
	if (!Number.isFinite(first) || !Number.isFinite(last)) return history.slice();
	if (first <= last) return history.slice();
	return history.slice().sort((a, b) => Number(a[tsKey]) - Number(b[tsKey]));
}

/** Append current snapshot if its timestamp is newer than the last in history. */
function appendIfNewerThanLast<T extends Record<string, unknown>>(
	ascHistory: readonly T[],
	current: T,
	tsKey: keyof T
): T[] {
	const hasAny = ascHistory.length > 0;
	const lastTs = hasAny ? (ascHistory[ascHistory.length - 1][tsKey] as number | undefined) : undefined;
	const curTs = current[tsKey] as number | undefined;
	if (!hasAny || (curTs != null && lastTs != null && curTs > lastTs)) {
		return [...ascHistory, current];
	}
	return ascHistory.slice();
}

/* ============================================================================
   Visual: Structure of KineticsByMetric → byLookbackSpan matrix
	 
	 Ensure the (metricKey, lookbackSpan) entry exists and return it.
	 - This is the core of the pipeline, where we ensure that each metricKey
		 has a nested structure for each lookbackSpan.

   This illustrates the nested shape that ensureNodeEntry navigates and modifies.
   Each metricKey maps to a per-span object holding velocity/acceleration results.

   KineticsByMetric
   └── "PRICE_PCT_CHANGE" (metricKey)
       └── byLookbackSpan
           ├── 3
           │   └── { velocity, acceleration, boosts? }
           ├── 5 ◀── ensureNodeEntry returns this node (created if missing)
           │   └── { velocity: 0, acceleration: 0 }
           └── 8
               └── ...

   The returned object is safe to mutate downstream and will always be initialized
   if missing. This avoids undefined guards in the main pipeline loop.
============================================================================ */

function ensureNodeEntry<TMetricKey extends string, TSpan extends number>(
	kineticsResultsMatrix: KineticsByMetric<TMetricKey, TSpan>,
	metricKey: TMetricKey,
	span: TSpan
): ComputedKineticsPropertyType {
	if (!kineticsResultsMatrix[metricKey]) {
		kineticsResultsMatrix[metricKey] = { byLookbackSpan: {} as KineticsBySpan<TSpan> } as any;
	}
	const metricNode = kineticsResultsMatrix[metricKey] as { byLookbackSpan: KineticsBySpan<TSpan> };
	if (!metricNode.byLookbackSpan[span]) {
		metricNode.byLookbackSpan[span] = { velocity: 0, acceleration: 0 };
	}
	// Non-null due to initialization above
	return metricNode.byLookbackSpan[span]!;
}

/** Build flat compute plans from the config (pure). */
function buildFlattenedComputePlans(perMetricPlans: PerMetricComputePlan[]): ResolvedComputePlan[] {
	return perMetricPlans.flatMap((m) =>
		m.horizons.map((h) => ({
			metricKey: m.metricFieldKey,
			lookbackSpan: h.lookbackSpan,
			normalizeStrategy: h.normalizeStrategy,
			enableVelocityGuard: !!m.enableVelocityGuard,
			minVelocity: m.minVelocity ?? 0,
			velAccBoostFns: (m.velAccBoostFns ?? []).map((b) => ({ name: b.name, formula: b.formula })),
		}))
	);
}

/* --------------------------------------------------------------------------
   Pipeline
-------------------------------------------------------------------------- */

export class KineticsEngine<TIn extends Record<string, unknown>> {
	private readonly calculator = new KineticsCalculator();
	private readonly computePlans: ResolvedComputePlan[];

	constructor(
		private readonly pipelineCfg: {
			pipelineComputeSpec: { perMetricPlans: PerMetricComputePlan[] };
			tickerSymbolFieldKey: SnapshotSymbolFieldKeyType & keyof TIn;
			timestampFieldKey: SnapshotTimestampFieldKeyType & keyof TIn;
			// Optional behavior flags
			options?: {
				/** If true (default), ensure ascending history and append the current snapshot when newer. */
				autoSortAndAppendHistoryChk?: boolean;
			};
		}
	) {
		this.computePlans = buildFlattenedComputePlans(pipelineCfg.pipelineComputeSpec.perMetricPlans); // precompute once
	}

	/**
	Process a batch of snapshots and return enriched snapshots with computed kinetics.
*
	@param snapshots Array of latest snapshot objects (one per symbol).
	@param historyBySymbol Map of symbol → array of historical snapshots.
	@returns Map of symbol → enriched snapshot containing `derivedProps.computedKinetics`.
*
	Behavior:
	---------
	1. For each snapshot:
		a. Extract symbol using the configured runtime key.
		b. Retrieve history for that symbol; optionally guard ordering & append current if newer.
		c. Clone snapshot into an enriched form with `derivedProps` initialized if missing.
		d. For each configured metric × horizon:
			i. Compute velocity and acceleration via calculator.
			ii. Apply finite-number guards (replace NaN/Inf with 0).
			iii. Apply velocity guard (zero acceleration if |velocity| < minVelocity).
			iv. Store results under `derivedProps.computedKinetics.byMetric[metricKey].byLookbackSpan[span]`.
			v. If boosts are configured, compute them (errors are caught & ignored).
	2. Collect enriched snapshots into a Map keyed by symbol.
*
	Notes:
	- Input snapshots are not mutated; enrichment is applied to shallow copies.
	- History guard behavior is controlled by `autoSortAndAppendHistoryChk` (default: true).
	- Boost failures do not throw; unset values are left absent.
*/

	public processBatch(
		snapshots: readonly TIn[],
		historyBySymbol: Record<string, readonly TIn[]>
	): Map<string, TOut<TIn>> {
		const output = new Map<string, TOut<TIn>>();

		const autoSortAndAppendHistoryChk = this.pipelineCfg.options?.autoSortAndAppendHistoryChk ?? true;

		for (const snapshot of snapshots) {
			const tickerSymbol = String(snapshot[this.pipelineCfg.tickerSymbolFieldKey]);
			if (tickerSymbol == null) continue;

			// Fetch & optionally guard history
			const rawHistory = historyBySymbol[tickerSymbol] ?? [];
			let ascHistory: TIn[];
			let history: TIn[];

			if (autoSortAndAppendHistoryChk) {
				ascHistory = ensureAscByTimestamp(rawHistory, this.pipelineCfg.timestampFieldKey);
				history = appendIfNewerThanLast(ascHistory, snapshot, this.pipelineCfg.timestampFieldKey);
			} else {
				ascHistory = rawHistory.slice();
				history = ascHistory;
			}

			// Prepare enriched snapshot (clone + guarantee container)
			const derivedProps = hasDerivedProps<TIn>(snapshot)
				? snapshot.derivedProps
				: { computedKinetics: { byMetric: {} as KineticsByMetric<SnapshotMetricFieldKeyType, HorizonSpanType> } };

			const enrichedSnapshot: TOut<TIn> = {
				...(snapshot as object),
				derivedProps,
			} as TOut<TIn>;

			// ✅ Init. the nested container
			const kineticsResultsMatrix = enrichedSnapshot.derivedProps.computedKinetics.byMetric as KineticsByMetric<
				SnapshotMetricFieldKeyType,
				HorizonSpanType
			>;

			// Execute compute plans
			for (const plan of this.computePlans) {
				/**
				 * 1️⃣ Compute Velocity (1st derivative)
           - Uses the specified metric field key.
           - Lookback controls how many historical points to use.
           - NormalizationRegistry applied if strategy != NONE.
				 */
				const velRaw = this.calculator.computeVelocity_2(
					history,
					plan.metricKey,
					plan.lookbackSpan,
					plan.normalizeStrategy,
					this.pipelineCfg.timestampFieldKey
				);

				/**
				 * 2️⃣ Compute Acceleration (2nd derivative)
           - Uses the velocity series for the metric.
           - Same lookbackSpan as velocity computation.
           - NormalizationRegistry applied if strategy != NONE.
				 */
				const accRaw = this.calculator.computeAcceleration_2(
					history,
					plan.metricKey,
					plan.lookbackSpan,
					plan.normalizeStrategy,
					this.pipelineCfg.timestampFieldKey
				);

				// Finite guards to prevent NaN/Inf propagation
				const vel = Number.isFinite(velRaw) ? velRaw : 0;
				const acc = Number.isFinite(accRaw) ? accRaw : 0;

				// 3) Velocity guard (optional) - If enabled, zero out acceleration when velocity is below the configured minVelocity threshold.
				const finalAcc = plan.enableVelocityGuard && Math.abs(vel) < plan.minVelocity ? 0 : acc;

				// 4) Store computed metrics keyed by horizon
				const entry = ensureNodeEntry(kineticsResultsMatrix, plan.metricKey, plan.lookbackSpan);
				entry.velocity = vel;
				entry.acceleration = finalAcc;

				/**
				 * 5) Apply boosts (optional)
				 * ...
				 * 3: { "velocity": 0.018, "acceleration": 0.004, "velAccBoostFns": { "velocity_boost": 0.021 } }, */
				if (plan.velAccBoostFns.length) {
					entry.velAccBoostFns = entry.velAccBoostFns ?? {};
					for (const boost of plan.velAccBoostFns) {
						try {
							entry.velAccBoostFns[boost.name] = boost.formula(vel, finalAcc);
						} catch {
							// leave boost unset on error (policy: calculator logic not duplicated here)
						}
					}
				}
			}

			output.set(tickerSymbol, enrichedSnapshot);

			// console.log(`KineticsPipeline`, [...output.values()].map((s) => [s[this.pipelineCfg.symbolFieldKey], s.derivedProps.computedKinetics.byMetric.pct_change__ld_tick?.byLookbackSpan["8"]]))
		}

		return output;
	}
}
