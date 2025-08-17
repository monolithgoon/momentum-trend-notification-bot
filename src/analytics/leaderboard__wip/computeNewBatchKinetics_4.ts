import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { APP_CONFIG_2 } from "src/config_2/app_config";
import { KineticsCalculator_3 } from "./KineticsCalculator_3";
import { MultiHorizonKineticsConfig } from "./MultiHorizonKineticsConfig";
import { AccelerationCalcFieldType, VelocityCalcFieldType } from "./types/snapshotFieldTypeAssertions";
/* ============================================================================
   🔹 ZEROED_KINETICS
   ----------------------------------------------------------------------------
   Default values for velocity, acceleration, and boost metrics when:
   - There are too few snapshots to compute
   - The velocity guard nullifies acceleration
============================================================================ */
const ZEROED_KINETICS = {
	pct_change_velocity__ld_tick: 0,
	pct_change_acceleration__ld_tick: 0,
	volume_velocity__ld_tick: 0,
	volume_acceleration__ld_tick: 0,
	price_velocity_boost__ld_tick: 0, // boost metric placeholder
} as const;

/* ============================================================================
   🔹 computeNewBatchKinetics_3
   ----------------------------------------------------------------------------
   Enrich a batch of leaderboard snapshots with computed velocity, acceleration,
   and boost metrics for both price (% change) and volume.
   
   Data flow:
   1. For each incoming snapshot, retrieve its recent snapshot history.
   2. Ensure the history is time-ascending and includes the current snapshot.
   3. If insufficient snapshots exist, assign ZEROED_KINETICS.
   4. Otherwise, use KineticsCalculator + MultiHorizonKineticsConfig to compute
      multi-horizon velocity, acceleration, and boost metrics.
   5. Select specific horizons (e.g., L3) to store in leaderboard snapshot fields.
   6. Apply optional velocity guard to nullify acceleration if drift is minimal.
============================================================================ */
export function computeNewBatchKinetics_4(
	snapshots: ILeaderboardTickerSnapshot_2[],
	historyBySymbolMap: Record<string, ILeaderboardTickerSnapshot_2[]>,
	opts: { minRequiredSnapshots?: number }
): Map<string, ILeaderboardTickerSnapshot_2> {
	const enrichedSnapshotsMap = new Map<string, ILeaderboardTickerSnapshot_2>();

	// Shared calculator instance (maintains per-ticker history internally)
	const calculator = new KineticsCalculator_3();

	// Compute minimum required snapshots dynamically from config
	const minRequiredSnapshots =
		opts.minRequiredSnapshots ??
		Math.max(
			...Object.values(MultiHorizonKineticsConfig.velocity)
				.flat()
				.map((w) => w.numLookbackSnapshots),
			...Object.values(MultiHorizonKineticsConfig.acceleration)
				.flat()
				.map((w) => w.numLookbackSnapshots)
		) + 1; // acceleration needs one more snapshot than velocity because it computes on the velocity series

	for (const snapshot of snapshots) {
		// ── 1) Retrieve & prepare history for this symbol ─────────────────────────
		let history: ILeaderboardTickerSnapshot_2[] = historyBySymbolMap[snapshot.ticker_symbol__ld_tick] ?? [];

		// Sort by time ascending
		if (history.length > 1 && history[0].timestamp__ld_tick > history[history.length - 1].timestamp__ld_tick) {
			history = history.slice().sort((a, b) => a.timestamp__ld_tick - b.timestamp__ld_tick);
		}

		// Append current snapshot if missing
		const lastTs = history[history.length - 1]?.timestamp__ld_tick;
		if (lastTs == null || lastTs < snapshot.timestamp__ld_tick) {
			history.push(snapshot);
		}

		// ── 2) Handle short histories ───────────────────────────────────────────
		if (history.length < minRequiredSnapshots) {
			enrichedSnapshotsMap.set(snapshot.ticker_symbol__ld_tick, {
				...snapshot,
				...ZEROED_KINETICS,
			});
			continue;
		}

		// ── 3) Compute full kinetics with boosts ─────────────────────────────────
		const kinetics = calculator.compute(snapshot.ticker_symbol__ld_tick, snapshot, MultiHorizonKineticsConfig);

		// ── 4) Extract the horizons we care about ────────────────────────────────
		const pctChgVel = kinetics.raw[`velocity_${VelocityCalcFieldType.PRICE_PCT_CHANGE}_L3`] ?? 0;
		const pctChgAcc = kinetics.raw[`acceleration_${AccelerationCalcFieldType.PRICE_PCT_CHANGE}_L3`] ?? 0;
		const volVel = kinetics.raw[`velocity_${VelocityCalcFieldType.VOLUME_CHANGE}_L3`] ?? 0;
		const volAcc = kinetics.raw[`acceleration_${AccelerationCalcFieldType.VOLUME_CHANGE}_L3`] ?? 0;

		// Boost example: `priceVelocityBoost` from KineticsCalculator boosts map
		const priceVelocityBoost = kinetics.boosts.priceVelocityBoost ?? 0;

		// ── 5) Optional velocity guard ───────────────────────────────────────────
		if (APP_CONFIG_2.leaderboard.usePctChgVelocityGuard) {
			const minSlope = APP_CONFIG_2.leaderboard.minPctChangeVelocity;
			if (pctChgVel < minSlope) {
				enrichedSnapshotsMap.set(snapshot.ticker_symbol__ld_tick, {
					...snapshot,
					pct_change_velocity__ld_tick: pctChgVel,
					pct_change_acceleration__ld_tick: 0,
					volume_velocity__ld_tick: volVel,
					volume_acceleration__ld_tick: 0,
					price_velocity_boost__ld_tick: 0, // nullify boost if velocity too low
				});
				continue;
			}
		}

		// ── 6) Store enriched snapshot ───────────────────────────────────────────
		enrichedSnapshotsMap.set(snapshot.ticker_symbol__ld_tick, {
			...snapshot,
			pct_change_velocity__ld_tick: pctChgVel,
			pct_change_acceleration__ld_tick: pctChgAcc,
			volume_velocity__ld_tick: volVel,
			volume_acceleration__ld_tick: volAcc,
			price_velocity_boost__ld_tick: priceVelocityBoost,
		});
	}

	return enrichedSnapshotsMap;
}
