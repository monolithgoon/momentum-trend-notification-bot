/**
  KineticsEngine.ts
  -----------------------------------------------------------------------------
  Core engine for computing velocity and acceleration metrics over historical
  financial snapshots. This module is part of the analytics pipeline for
  leaderboard and trend notification features.
 *
  SEMANTIC NOTES:
  - Computes per-metric, per-horizon velocity and acceleration using configurable
    normalization and guard strategies.
  - Designed for extensibility and safe batch processing of time series data.
 *
  POLICY NOTES:
  - No user data is stored or transmitted outside the analytics context.
  - All computations are performed in-memory; no persistent storage or external
    network calls are made.
 */

import {
	SnapshotMetricFieldKeyType,
	SnapshotSymbolFieldKeyType,
	SnapshotTimestampFieldKeyType,
} from "./KineticsFieldBindings";
import { KineticsCalculator } from "./KineticsCalculator";
import { TNormalizationKey } from "@analytics/math/normalization";
import { TLookbackSpan } from "./types/KineticsComputeSpecTypes";
import { TKineticsByMetric } from "./types/KineticsComputeResult.type";
import { TBaseSnapshot, TKineticsSnapshot } from "../../types/Snapshots.type";
import {
	appendIfNewerThanLast,
	buildFlattenedComputePlans,
	ensureAscByTimestamp,
	ensureNodeEntry,
	hasDerivedProps,
} from "./utils";

/** Local helper types - semantic: define compute plan structures */

// Configuration for a single metric, including velocity guard and horizon specs.
export type PerMetricComputePlan = {
	metricFieldKey: SnapshotMetricFieldKeyType;
	enableVelocityGuard: boolean;
	minVelocity: number;
	horizons: Array<{
		lookbackSpan: TLookbackSpan;
		normalizeStrategy: TNormalizationKey;
	}>;
	// velAccBoostFns?: BoostDef[]; // Policy: Boosts are optional and not included by default
};

// Flattened representation for runtime compute jobs (one per metric × horizon).
export type ResolvedComputePlan = {
	metricKey: SnapshotMetricFieldKeyType;
	lookbackSpan: TLookbackSpan;
	normalizeStrategy: TNormalizationKey;
	enableVelocityGuard: boolean;
	minVelocity: number;
	// velAccBoostFns: BoostDef[]; // Policy: Boosts are optional and not included by default
};

/**
  KineticsEngine - semantic: batch processor for snapshot enrichment    
  -----------------------------------------------------------------------------
  Main analytics engine for computing velocity and acceleration metrics.
 *
  SEMANTIC:
  - Accepts a batch of snapshots and historical data.
  - Applies configured compute plans to each snapshot.
  - Enriches each snapshot with computed kinetics under `derivedProps`.
 *
  POLICY:
  - Input data is not mutated; enrichment is applied to shallow copies.
  - No external side effects or persistent writes.
  - All error handling is internal; no exceptions are thrown to callers.
 */
export class KineticsEngine_2 {
	private readonly calculator = new KineticsCalculator();
	private readonly computePlans: ResolvedComputePlan[];

	/**
	 * Constructor
	 * @param pipelineCfg - Configuration for compute plans and field keys.
	 * Policy: Only required configuration is accepted; no sensitive data.
	 */
	constructor(
		private readonly pipelineCfg: {
			pipelineComputeSpec: { perMetricPlans: PerMetricComputePlan[] };
			tickerSymbolFieldKey: SnapshotSymbolFieldKeyType & keyof TBaseSnapshot;
			timestampFieldKey: SnapshotTimestampFieldKeyType & keyof TBaseSnapshot;
			options?: { autoSortAndAppendHistoryChk?: boolean };
		}
	) {
		this.computePlans = buildFlattenedComputePlans(pipelineCfg.pipelineComputeSpec.perMetricPlans);
	}

	/**
    Processes a batch of snapshots, enriching each with computed kinetics.
   
    SEMANTIC:
    - For each snapshot:
      - Extracts symbol and retrieves history.
      - Ensures history is sorted and up-to-date.
      - Computes velocity and acceleration for each configured plan.
      - Applies velocity guard if enabled.
      - Stores results in a nested structure under `derivedProps`.
   
    POLICY:
    - No mutation of input arrays or objects.
    - All computations are deterministic and reproducible.
    - No external calls or side effects.
   
    @param snapshots - Array of input snapshots.
    @param historyBySymbol - Map of symbol to historical snapshots.
    @returns Map of symbol to enriched snapshot.
   */
	public processBatch(
		snapshots: readonly TBaseSnapshot[],
		historyBySymbol: Record<string, readonly TBaseSnapshot[]>
	): Map<string, TKineticsSnapshot> {
		const output = new Map<string, TKineticsSnapshot>();
		const autoSortAndAppendHistoryChk = this.pipelineCfg.options?.autoSortAndAppendHistoryChk ?? true;

		for (const snapshot of snapshots) {
			const tickerSymbol = String(snapshot[this.pipelineCfg.tickerSymbolFieldKey]);
			if (!tickerSymbol) continue;

			// History handling - semantic: ensure correct ordering and completeness
			const rawHistory = historyBySymbol[tickerSymbol] ?? [];
			const ascHistory = autoSortAndAppendHistoryChk
				? ensureAscByTimestamp(rawHistory, this.pipelineCfg.timestampFieldKey)
				: rawHistory.slice();
			const history = autoSortAndAppendHistoryChk
				? appendIfNewerThanLast(ascHistory, snapshot, this.pipelineCfg.timestampFieldKey)
				: ascHistory;

			// Enriched snapshot - semantic: attach computed kinetics in derivedProps
			const derivedProps: {
				computedKinetics: {
					byMetric: TKineticsByMetric;
				};
			} = hasDerivedProps(snapshot)
				? (snapshot.derivedProps as {
						computedKinetics: {
							byMetric: TKineticsByMetric;
						};
				  })
				: { computedKinetics: { byMetric: {} as TKineticsByMetric } };

			const enrichedSnapshot: TKineticsSnapshot = {
				...snapshot,
				derivedProps,
			};

			const kineticsResultsMatrix = enrichedSnapshot.derivedProps.computedKinetics.byMetric as TKineticsByMetric;

			// Run compute plans - semantic: per-metric, per-horizon computation
			for (const plan of this.computePlans) {
				const velRaw = this.calculator.computeVelocity_2(
					history,
					plan.metricKey,
					plan.lookbackSpan,
					plan.normalizeStrategy,
					this.pipelineCfg.timestampFieldKey
				);

				const accelRaw = this.calculator.computeAcceleration_2(
					history,
					plan.metricKey,
					plan.lookbackSpan,
					plan.normalizeStrategy,
					this.pipelineCfg.timestampFieldKey
				);

        console.log({ symbol: tickerSymbol, span: plan.lookbackSpan, velRaw, accelRaw });

				// Policy: Guard against non-finite results
				const vel = Number.isFinite(velRaw) ? velRaw : 0;
				const acc = Number.isFinite(accelRaw) ? accelRaw : 0;
				const finalAcc = plan.enableVelocityGuard && Math.abs(vel) < plan.minVelocity ? 0 : acc;

				// Policy: Ensure nested structure exists before assignment
				const entry = ensureNodeEntry(kineticsResultsMatrix, plan.metricKey, plan.lookbackSpan);
				entry.velocity = vel;
				entry.acceleration = finalAcc;

				// Policy: Boosts are not processed in this implementation
				// if (plan.velAccBoostFns.length) {
				//   entry.velAccBoostFns = entry.velAccBoostFns ?? {};
				//   for (const boost of plan.velAccBoostFns) {
				//     try {
				//       entry.velAccBoostFns[boost.name] = boost.formula(vel, finalAcc);
				//     } catch {
				//       // ignore boost errors
				//     }
				//   }
				// }
			}

			output.set(tickerSymbol, enrichedSnapshot);
		}
		return output;
	}
}
