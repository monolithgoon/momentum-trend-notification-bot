// Parallel history fetch → finite-safe velocity & acceleration → pass-through on short history.

import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { APP_CONFIG_2 } from "src/config_2/app_config";
import { KineticsCalcOpts, KineticsCalculator_2 } from "@analytics/leaderboard/KineticsCalculator_2";

/** Shape expected by KineticsCalculator (numeric-only numOnlyFieldsHistory) */
type KineticsInputFields = {
	timestamp__ld_tick: number;
	pct_change__ld_tick: number;
	volume__ld_tick: number;
};

const ZEROED_KINETICS = {
	pct_change_velocity__ld_tick: 0,
	pct_change_acceleration__ld_tick: 0,
	volume_velocity__ld_tick: 0,
	volume_acceleration__ld_tick: 0,
} as const;

/** Narrow a full snapshot down to the numeric fields used by kinetics */
const projectKineticsFields = (s: ILeaderboardTickerSnapshot_2): KineticsInputFields => ({
	timestamp__ld_tick: s.timestamp__ld_tick,
	pct_change__ld_tick: s.pct_change__ld_tick,
	volume__ld_tick: s.volume__ld_tick,
});

/**
 * Enrich the current batch with velocity & acceleration for price (% change) and volume.
 * - Uses pre-fetched per-symbol snapshotHistorySet (from readHistoryForSymbols__ok)
 * - Ensures time-ascending numOnlyFieldsHistory
 * - Finite-safe outputs (NaN/±Inf → 0 via KineticsCalculator)
 * - Symbols with short snapshotHistorySet are passed through with zeroed kinetics (not dropped)
 */

export function computeNewBatchKinetics_3(
	snapshots: ILeaderboardTickerSnapshot_2[],
	historyBySymbolMap: Record<string, ILeaderboardTickerSnapshot_2[]>,
	opts: { velWindow: number; accWindow: number; minRequiredPoints?: number; appendCurrentIfMissing?: boolean }
): Map<string, ILeaderboardTickerSnapshot_2> {
	// ── 1) Gather inputs & derive windowing/limits ────────────────────────────────

	const velWindow = opts.velWindow;
	const accWindow = opts.accWindow;
	const minRequiredPoints = opts.minRequiredPoints ?? Math.max(velWindow, accWindow) + 1; // +1 since acceleration needs Δ of velocity
	const appendCurrent = opts.appendCurrentIfMissing ?? true;

	// ── 2) Compute kinetics per symbol using provided histories ───────────────────
	const enrichedSnapshotsMap = new Map<string, ILeaderboardTickerSnapshot_2>();

	for (const snapshot of snapshots) {
		// Pull bounded lookback snapshotHistorySet for this symbol from the pre-fetched map
		const snapshotHistorySet: ILeaderboardTickerSnapshot_2[] =
			historyBySymbolMap[snapshot.ticker_symbol__ld_tick] ?? [];

		// Project to numeric-only series used by calculator
		let numOnlyFieldsHistory: KineticsInputFields[] = snapshotHistorySet.map(projectKineticsFields);

		// Ensure time-ascending (defensive safety)
		if (
			numOnlyFieldsHistory.length > 1 &&
			numOnlyFieldsHistory[0].timestamp__ld_tick >
				numOnlyFieldsHistory[numOnlyFieldsHistory.length - 1].timestamp__ld_tick
		) {
			numOnlyFieldsHistory = numOnlyFieldsHistory
				.slice()
				.sort((a, b) => a.timestamp__ld_tick - b.timestamp__ld_tick);
		}

		// WIP
		// If storage snapshotHistorySet doesn't include the current snapshot sample, append it (idempotent-ish)
		const lastTs = numOnlyFieldsHistory[numOnlyFieldsHistory.length - 1]?.timestamp__ld_tick;
		if (lastTs == null || lastTs < snapshot.timestamp__ld_tick) {
			numOnlyFieldsHistory = [...numOnlyFieldsHistory, projectKineticsFields(snapshot)];
		}

		// Not enough snapshotHistorySet → pass-through with zero kinetics (don't drop the symbol)
		if (numOnlyFieldsHistory.length < minRequiredPoints) {
			enrichedSnapshotsMap.set(snapshot.ticker_symbol__ld_tick, { ...snapshot, ...ZEROED_KINETICS });
			continue;
		}

		// Finite-safe calculator (already time-sorted above)
		const kineticsOpts: KineticsCalcOpts = {
			velWindow,
			accWindow,
			fallback: 0,
			sortByTimeAsc: false,
		};
		
		const kinetics = new KineticsCalculator_2(numOnlyFieldsHistory, kineticsOpts);

		// Compute velocity & acceleration for price (% change) and volume
		// Note: pct_change_velocity is the slope of pct_change__ld_tick over the velWindow
		const pctChgVel = kinetics.computeVelocity("pct_change__ld_tick");
		const pctChgAcc = kinetics.computeAcceleration("pct_change__ld_tick");
		const volVel = kinetics.computeVelocity("volume__ld_tick");
		const volAccel = kinetics.computeAcceleration("volume__ld_tick");

		// Optional: velocity guard to suppress accel noise if drift is near-zero
		if (APP_CONFIG_2.leaderboard.usePctChgVelocityGuard) {
			const minSlope = APP_CONFIG_2.leaderboard.minPctChangeVelocity;
			if (pctChgVel < minSlope) {
				enrichedSnapshotsMap.set(snapshot.ticker_symbol__ld_tick, {
					...snapshot,
					pct_change_velocity__ld_tick: pctChgVel,
					pct_change_acceleration__ld_tick: 0,
					volume_velocity__ld_tick: volVel,
					volume_acceleration__ld_tick: 0,
				});
				continue;
			}
		}

		enrichedSnapshotsMap.set(snapshot.ticker_symbol__ld_tick, {
			...snapshot,
			pct_change_velocity__ld_tick: pctChgVel,
			pct_change_acceleration__ld_tick: pctChgAcc,
			volume_velocity__ld_tick: volVel,
			volume_acceleration__ld_tick: volAccel,
		});
	}

	return enrichedSnapshotsMap;
}
