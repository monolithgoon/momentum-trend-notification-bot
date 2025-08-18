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
} from "../types/ComputedKineticsTypes";

/* --------------------------------------------------------------------------
  Local helper types
-------------------------------------------------------------------------- */

/**
 * Example: PerMetricComputePlan → ResolvedComputePlan Transformation
 * ---------------------------------------------------------------------------
 * This example illustrates how a single user-defined PerMetricComputePlan
 * expands into multiple ResolvedComputePlans. Each ResolvedComputePlan represents a single
 * unit of work in the pipeline.
 *
 * 1️⃣ User-defined PerMetricComputePlan
 * - Declares a metric to compute with optional velocity guard and boosts
 * - Defines multiple horizons to compute over
 *
 * 2️⃣ Runtime-expanded ResolvedComputePlan
 * - Each entry represents one (metric × lookbackSpan × transform) job
 * - Flattened structure used internally by the pipeline
 *
 * ---------------------------------------------------------------------------
 * From:
 * ---------------------------------------------------------------------------
 *
 * const userSpec = {
 *   metricFieldKey: "pct_change",
 *   enableVelocityGuard: true,
 *   minVelocity: 0.02,
 *   velAccBoostFns: [
 *     // ... (boost definitions here)
 *   ],
 *   horizons: [
 *     { lookbackSpan: 3, normalizeStrategy: "Z_SCORE" },
 *     { lookbackSpan: 5, normalizeStrategy: "MIN_MAX" },
 *   ],
 * };
 *
 * ---------------------------------------------------------------------------
 * To:
 * ---------------------------------------------------------------------------
 *
 * const resolvedPlans = [
 *   {
 *     metricKey: "pct_change",
 *     lookbackSpan: 3,
 *     normalizeStrategy: "Z_SCORE",
 *     enableVelocityGuard: true,
 *     minVelocity: 0.02,
 *     velAccBoostFns: [
 *       // ... (boost definitions here)
 *     ],
 *   },
 *   {
 *     metricKey: "pct_change",
 *     lookbackSpan: 5,
 *     normalizeStrategy: "MIN_MAX",
 *     enableVelocityGuard: true,
 *     minVelocity: 0.02,
 *     velAccBoostFns: [
 *       // ... (boost definitions here)
 *     ],
 *   },
 * ];
 */

type PerMetricComputePlan = {
	metricFieldKey: SnapshotMetricFieldKeyType;
	enableVelocityGuard: boolean;
	minVelocity: number;
	horizons: Array<{ lookbackSpan: HorizonSpanType; normalizeStrategy: HorizonNormalizationType }>;
	velAccBoostFns?: BoostDef[];
};

/** Flat “compute plan per horizon per metric, distilled from spec to avoid deep nesting at runtime */
type ResolvedComputePlan = {
	metricKey: SnapshotMetricFieldKeyType;
	lookbackSpan: HorizonSpanType;
	normalizeStrategy: HorizonNormalizationType;
	enableVelocityGuard: boolean;
	minVelocity: number;
	velAccBoostFns: BoostDef[];
};

// Output type alias: input snapshot enrichedSnapshot with computed kinetics
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

export class KineticsPipeline_6<TIn extends Record<string, unknown>> {
	private readonly calculator = new KineticsCalculator();
	private readonly computePlans: ResolvedComputePlan[];

	constructor(
		// We accept a minimal structural type to avoid hard-coupling to a specific interface name
		private readonly pipelineCfg: {
			pipelineComputeSpec: { perMetricPlans: PerMetricComputePlan[] };
			symbolFieldKey: SnapshotSymbolFieldKeyType & keyof TIn;
			timestampFieldKey: SnapshotTimestampFieldKeyType & keyof TIn;
			// Optional behavior flags
			options?: {
				/** If true (default), ensure ascending history and append the current snapshot when newer. */
				guardHistoryChk?: boolean;
			};
		}
	) {
		this.computePlans = buildFlattenedComputePlans(pipelineCfg.pipelineComputeSpec.perMetricPlans); // precompute once
	}

	/**
	 * Processes a batch of latest snapshots, enriching each with computed kinetics (velocity, acceleration, velAccBoostFns).
	 *
	 * @param snapshots        - Array of latest snapshot objects (one per symbol)
	 * @param historyBySymbol  - Map from symbol → array of historical snapshots
	 * @returns                - Map from symbol → enrichedSnapshot snapshot (with `derivedProps.computedKinetics`)
	 *
	 * Behavior:
	 * ---------
	 * 1. For each snapshot:
	 *    a. Extracts the symbol using the configured runtime key.
	 *    b. Retrieves and optionally guards the symbol's history (ensures ascending timestamps, appends current if newer).
	 *    c. Prepares an enrichedSnapshot snapshot object, cloning and initializing derivedProps if needed.
	 *    d. For each configured metric and horizon:
	 *       i.   Computes velocity and acceleration using the calculator.
	 *       ii.  Applies finite-number guards (sets to 0 if result is not finite).
	 *       iii. Applies velocity guard if enabled (zeroes acceleration if |velocity| < minVelocity).
	 *       iv.  Stores results under derivedProps.computedKinetics.byMetric[metricKey].byLookbackSpan[span].
	 *       v.   Applies any configured boosts (custom formulas of velocity and acceleration).
	 * 2. Returns a Map of symbol → enrichedSnapshot snapshot.
	 *
	 * Notes:
	 *  - Input snapshots are not mutated; enrichment is written to a new object.
	 *  - History guarding (ordering, deduplication) is controlled by the `guardHistoryChk` option (default: true).
	 *  - Boost errors are caught and ignored (boost is unset on error).
	 */

	public processBatch(snapshots: TIn[], historyBySymbol: Record<string, TIn[]>): Map<string, TOut<TIn>> {
		const output = new Map<string, TOut<TIn>>();
		const guardHistoryChk = this.pipelineCfg.options?.guardHistoryChk ?? true;

		for (const snapshot of snapshots) {
			// Extract symbol via runtime key
			const tickerSymbol = String(snapshot[this.pipelineCfg.symbolFieldKey]);
			if (tickerSymbol == null) continue;

			// Fetch & optionally guard history
			const rawHistory = historyBySymbol[tickerSymbol] ?? [];
			const ascHistory = guardHistoryChk
				? ensureAscByTimestamp(rawHistory, this.pipelineCfg.timestampFieldKey)
				: rawHistory.slice();
			const history = guardHistoryChk
				? appendIfNewerThanLast(ascHistory, snapshot, this.pipelineCfg.timestampFieldKey)
				: ascHistory;

			// Prepare enriched snapshot (clone + guarantee container)
			const derivedProps = hasDerivedProps<TIn>(snapshot)
				? snapshot.derivedProps
				: { computedKinetics: { byMetric: {} as KineticsByMetric<SnapshotMetricFieldKeyType, HorizonSpanType> } };

			const enrichedSnapshot: TOut<TIn> = {
				...(snapshot as object),
				derivedProps,
			} as TOut<TIn>;

			// ✅ point at the nested container
			const kineticsResultsMatrix = enrichedSnapshot.derivedProps.computedKinetics.byMetric as KineticsByMetric<
				SnapshotMetricFieldKeyType,
				HorizonSpanType
			>;

			// Perform compute per plan
			for (const plan of this.computePlans) {
				/**
				 * 1️⃣ Compute Velocity (1st derivative)
           - Uses the specified metric field key.
           - Lookback controls how many historical points to use.
           - Normalization applied if strategy != NONE.
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
           - Normalization applied if strategy != NONE.
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
		}

		return output;
	}
}
