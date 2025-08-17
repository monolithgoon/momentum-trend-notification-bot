import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { ILeaderboardStorage } from "../types/ILeaderboardStorage.interface";
import { APP_CONFIG_2 } from "src/config_2/app_config";
import { KineticsCalcOpts, KineticsCalculator_2 } from "@analytics/leaderboard/KineticsCalculator_2";

/** Shape expected by KineticsCalculator (numeric-only tickerHistory) */
type KineticsInputFields  = {
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
const prepareKineticsData = (s: ILeaderboardTickerSnapshot_2): KineticsInputFields  => ({
  timestamp__ld_tick: s.timestamp__ld_tick,
  pct_change__ld_tick: s.pct_change__ld_tick,
  volume__ld_tick: s.volume__ld_tick,
});

/**
 * Enrich the current batch with velocity & acceleration for price (% change) and volume.
 * - Fetches per-symbol history in parallel (bounded lookback)
 * - Ensures time-ascending tickerHistory
 * - Finite-safe outputs (NaN/±Inf → 0 via KineticsCalculator)
 * - Symbols with short history are passed through with zeroed kinetics (not dropped)
 */
export async function computeNewBatchKinetics_2(
  batchMap: Map<string, ILeaderboardTickerSnapshot_2>,
  leaderboardTag: string,
  storage: ILeaderboardStorage
): Promise<Map<string, ILeaderboardTickerSnapshot_2>> {
  // ── 1) Gather inputs & derive windowing/limits ────────────────────────────────
  const snapshots = [...batchMap.values()];

  const velWindow = APP_CONFIG_2.leaderboard.velWindow;        // e.g., 20
  const accWindow = APP_CONFIG_2.leaderboard.accWindow;        // e.g., 20
  const minRequiredPoints = Math.max(velWindow, accWindow) + 1; // +1 for Δy in accel
  const lookbackBars =
    APP_CONFIG_2.leaderboard.maxSnapshotHistoryLookback ??
    Math.max(velWindow, accWindow) * 6; // window + warmup

  // ── 2) Fetch per-symbol history in parallel (bounded lookback) ───────────────
  const historiesPerTicker= await Promise.all(
    snapshots.map((snap) =>
      storage
        .readSnapshotHistoryForTicker(leaderboardTag, snap.ticker_symbol__ld_tick, lookbackBars)
        .catch(() => [] as ILeaderboardTickerSnapshot_2[])
    )
  );

  // ── 3) Compute kinetics per symbol; keep outputs finite & consistent ─────────
  const enrichedSnapshotsMap = new Map<string, ILeaderboardTickerSnapshot_2>();

  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];

    // Project to numeric-only series used by calculator
    let tickerHistory: KineticsInputFields [] = historiesPerTicker[i].map(prepareKineticsData);

    // Ensure time-ascending before analysis (upstream safety)
    if (
      tickerHistory.length > 1 &&
      tickerHistory[0].timestamp__ld_tick > tickerHistory[tickerHistory.length - 1].timestamp__ld_tick
    ) {
      tickerHistory = tickerHistory.slice().sort((a, b) => a.timestamp__ld_tick - b.timestamp__ld_tick);
    }

    // If your storage excludes the current bar, optionally append it here:
    // if (!tickerHistory.length || tickerHistory[tickerHistory.length - 1]?.timestamp__ld_tick !== snapshot.timestamp__ld_tick) {
    //   tickerHistory = [...tickerHistory, prepareKineticsData(snapshot)];
    // }

    // Not enough history → pass-through with zero kinetics (don't drop the symbol)
    if (tickerHistory.length < minRequiredPoints) {
      enrichedSnapshotsMap.set(snapshot.ticker_symbol__ld_tick, { ...snapshot, ...ZEROED_KINETICS });
      continue;
    }

    // Finite-safe calculator (also sorts internally if asked)
    const kineticsOpts: KineticsCalcOpts = {
      velWindow,
      accWindow,
      fallback: 0,
      sortByTimeAsc: false, // already sorted above
    };
    const kinetics = new KineticsCalculator_2(tickerHistory, kineticsOpts);

    const pctChgVel   = kinetics.computeVelocity("pct_change__ld_tick");
    const pctChgAcc = kinetics.computeAcceleration("pct_change__ld_tick");
    const volVel   = kinetics.computeVelocity("volume__ld_tick");
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
