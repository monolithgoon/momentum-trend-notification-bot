import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { ILeaderboardStorage } from "../types/ILeaderboardStorage.interface";
import { APP_CONFIG_2 } from "src/config_2/app_config";
import { KineticsCalculator } from "@analytics/leaderboard/__deprecated__KineticsCalculator";

export async function computeNewBatchKinetics(
	newBatchMap: Map<string, ILeaderboardTickerSnapshot_2>,
	leaderboardTag: string,
	storage: ILeaderboardStorage
): Promise<Map<string, ILeaderboardTickerSnapshot_2>> {
	/**
	 * Enriches each ticker snapshot in the current batch by:
	 * - Retrieving previous snapshot history for the ticker
	 * - Computing velocity and acceleration metrics for volume and percent change
	 * - Initializing leaderboard entry with default sub-rankings and appearance count
	 *
	 * Returns: Map of ticker symbol : enriched leaderboard ticker
	 */

	const enrichedBatchMap: Map<string, ILeaderboardTickerSnapshot_2> = new Map(); // Init. map to hold enriched ticker data
	const snapshots = newBatchMap.values();

	for (const snapshot of snapshots) {
		try {
			const snapshotHistory = await storage.readSnapshotHistoryForTicker(
				leaderboardTag,
				snapshot.ticker_symbol__ld_tick,
				+Infinity
			);

			if (snapshotHistory.length < APP_CONFIG_2.leaderboard.minSnapshotsRequiredForKinetics) {
				continue;
			}

			console.log({ snapshot: snapshot.ticker_symbol__ld_tick, historyLength: snapshotHistory.length });

			const kinetics = new KineticsCalculator(snapshotHistory);
			const pcVel = kinetics.computeVelocity("pct_change__ld_tick");
			const pcAccel = kinetics.computeAcceleration("pct_change__ld_tick");
			const volVel = kinetics.computeVelocity("volume__ld_tick");
			const volAccel = kinetics.computeAcceleration("volume__ld_tick");

			const enrichedSnapshot: ILeaderboardTickerSnapshot_2 = {
				...snapshot,
				pct_change_velocity__ld_tick: pcVel,
				pct_change_acceleration__ld_tick: pcAccel,
				volume_velocity__ld_tick: volVel,
				volume_acceleration__ld_tick: volAccel,
			};

			// console.log({ enrichedSnapshot });

			enrichedBatchMap.set(snapshot.ticker_symbol__ld_tick, enrichedSnapshot);
		} catch (err) {
			console.error(`[LeaderboardEngine] Error computing kinetics for ${snapshot.ticker_symbol__ld_tick}:`, err);
		}
	}

	return enrichedBatchMap;
}
