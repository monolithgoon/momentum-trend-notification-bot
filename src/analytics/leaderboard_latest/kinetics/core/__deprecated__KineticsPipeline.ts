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

/** --------------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------------- */

/**
 * PerMetricComputePlan
 * ---------------------------------------------------------------------------
 * Represents one metric’s configuration (expanded from DEFAULT_KINETICS_CONFIG).
 * Each plan carries the metric key, guard thresholds, and a list of horizons.
 *
 * Example expansion (from DEFAULT_KINETICS_CONFIG):
 *
 * const perMetricPlans = [
 *   {
 *     metricFieldKey: "PRICE_PCT_CHANGE",
 *     enableVelocityGuard: true,
 *     minVelocity: 0.02,
 *     horizons: [
 *       { lookbackSpan: 3, normalizeStrategy: "NONE" },
 *       { lookbackSpan: 5, normalizeStrategy: "Z_SCORE" },
 *       { lookbackSpan: 8, normalizeStrategy: "Z_SCORE" },
 *     ],
 *   },
 *   {
 *     metricFieldKey: "VOLUME_CHANGE",
 *     enableVelocityGuard: false,
 *     minVelocity: 0,
 *     horizons: [
 *       { lookbackSpan: 3, normalizeStrategy: "NONE" },
 *       { lookbackSpan: 5, normalizeStrategy: "Z_SCORE" },
 *       { lookbackSpan: 8, normalizeStrategy: "Z_SCORE" },
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
type ResolvedComputePlan = {
	metricKey: SnapshotMetricFieldKeyType;
	lookbackSpan: HorizonSpanType;
	normalizeStrategy: HorizonNormalizationType;
	enableVelocityGuard: boolean;
	minVelocity: number;
	velAccBoostFns: BoostDef[];
};

type TOut<TBase> = EnrichedSnapshotType<TBase, SnapshotMetricFieldKeyType, HorizonSpanType>;

/** --------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

function hasDerivedProps<TBase>(s: TBase | TOut<TBase>): s is TOut<TBase> {
	return typeof s === "object" && s !== null && "derivedProps" in (s as object);
}

function ensureAscByTimestamp<T extends Record<string, unknown>>(history: T[], tsKey: keyof T): T[] {
	if (history.length <= 1) return history.slice();
	const first = Number(history[0][tsKey]);
	const last = Number(history[history.length - 1][tsKey]);
	if (!Number.isFinite(first) || !Number.isFinite(last)) return history.slice();
	if (first <= last) return history.slice();
	return history.slice().sort((a, b) => Number(a[tsKey]) - Number(b[tsKey]));
}

function appendIfNewerThanLast<T extends Record<string, unknown>>(ascHistory: T[], current: T, tsKey: keyof T): T[] {
	const hasAny = ascHistory.length > 0;
	const lastTs = hasAny ? (ascHistory[ascHistory.length - 1][tsKey] as number | undefined) : undefined;
	const curTs = current[tsKey] as number | undefined;
	if (!hasAny || (curTs != null && lastTs != null && curTs > lastTs)) {
		return [...ascHistory, current];
	}
	return ascHistory.slice();
}

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
	return metricNode.byLookbackSpan[span]!;
}

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

/** --------------------------------------------------------------------------
 * Pipeline
 * -------------------------------------------------------------------------- */

export class KineticsPipeline_6<TIn extends Record<string, unknown>> {
	private readonly calculator = new KineticsCalculator();
	private readonly computePlans: ResolvedComputePlan[];

	constructor(
		private readonly pipelineCfg: {
			pipelineComputeSpec: { perMetricPlans: PerMetricComputePlan[] };
			tickerSymbolFieldKey: SnapshotSymbolFieldKeyType & keyof TIn;
			timestampFieldKey: SnapshotTimestampFieldKeyType & keyof TIn;
			options?: { autoSortAndAppendHistoryChk?: boolean };
		}
	) {
		this.computePlans = buildFlattenedComputePlans(pipelineCfg.pipelineComputeSpec.perMetricPlans);
	}

	/**
	 * Process a batch of snapshots and return enriched snapshots with computed kinetics.
	 *
	 * @param snapshots       Array of latest snapshot objects (one per symbol).
	 * @param historyBySymbol Map of symbol → array of historical snapshots.
	 * @returns               Map of symbol → enriched snapshot containing `derivedProps.computedKinetics`.
	 *
	 * Behavior:
	 * ---------
	 * 1. For each snapshot:
	 *    a. Extract symbol using the configured runtime key.
	 *    b. Retrieve history for that symbol; optionally guard ordering & append current if newer.
	 *    c. Clone snapshot into an enriched form with `derivedProps` initialized if missing.
	 *    d. For each configured metric × horizon:
	 *       i.   Compute velocity and acceleration via calculator.
	 *       ii.  Apply finite-number guards (replace NaN/Inf with 0).
	 *       iii. Apply velocity guard (zero acceleration if |velocity| < minVelocity).
	 *       iv.  Store results under `derivedProps.computedKinetics.byMetric[metricKey].byLookbackSpan[span]`.
	 *       v.   If boosts are configured, compute them (errors are caught & ignored).
	 * 2. Collect enriched snapshots into a Map keyed by symbol.
	 *
	 * Notes:
	 * - Input snapshots are not mutated; enrichment is applied to shallow copies.
	 * - History guard behavior is controlled by `autoSortAndAppendHistoryChk` (default: true).
	 * - Boost failures do not throw; unset values are left absent.
	 */
	processBatch(snapshots: TIn[], historyBySymbol: Record<string, TIn[]>): Map<string, TOut<TIn>> {
		const output = new Map<string, TOut<TIn>>();

		for (const snapshot of snapshots) {
			const tickerSymbol = snapshot[this.pipelineCfg.tickerSymbolFieldKey] as string;
			if (!tickerSymbol) continue;

			// Prepare history
			let history = historyBySymbol[tickerSymbol] ?? [];
			if (this.pipelineCfg.options?.autoSortAndAppendHistoryChk) {
				history = appendIfNewerThanLast(
					ensureAscByTimestamp(history, this.pipelineCfg.timestampFieldKey),
					snapshot,
					this.pipelineCfg.timestampFieldKey
				);
			}

			// Prepare enriched snapshot
			const enrichedSnapshot: TOut<TIn> = hasDerivedProps(snapshot)
				? { ...snapshot }
				: ({ ...snapshot, derivedProps: { computedKinetics: { byMetric: {} } } } as TOut<TIn>);

			const kineticsResultsMatrix = enrichedSnapshot.derivedProps.computedKinetics.byMetric as KineticsByMetric<
				SnapshotMetricFieldKeyType,
				HorizonSpanType
			>;

			// Execute compute plans
			for (const plan of this.computePlans) {
				const velRaw = this.calculator.computeVelocity_2(
					history,
					plan.metricKey,
					plan.lookbackSpan,
					plan.normalizeStrategy,
					this.pipelineCfg.timestampFieldKey
				);
				const accRaw = this.calculator.computeAcceleration_2(
					history,
					plan.metricKey,
					plan.lookbackSpan,
					plan.normalizeStrategy,
					this.pipelineCfg.timestampFieldKey
				);

				const vel = Number.isFinite(velRaw) ? velRaw : 0;
				const acc = Number.isFinite(accRaw) ? accRaw : 0;

				const finalAcc = plan.enableVelocityGuard && Math.abs(vel) < plan.minVelocity ? 0 : acc;

				const entry = ensureNodeEntry(kineticsResultsMatrix, plan.metricKey, plan.lookbackSpan);
				entry.velocity = vel;
				entry.acceleration = finalAcc;

				if (plan.velAccBoostFns.length) {
					entry.velAccBoostFns = entry.velAccBoostFns ?? {};
					for (const boost of plan.velAccBoostFns) {
						try {
							entry.velAccBoostFns[boost.name] = boost.formula(vel, finalAcc);
						} catch {
							// Ignore boost computation errors
						}
					}
				}
			}

			output.set(tickerSymbol, enrichedSnapshot);
		}

		return output;
	}
}
