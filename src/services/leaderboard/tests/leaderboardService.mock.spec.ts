import { NormalizedRestTickerSnapshot } from "@core/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { LeaderboardRestTickerSnapshot } from "@core/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";
import { LeaderboardService } from "../LeaderboardService";
import { GenericTickerSorter } from "@core/generics/GenericTickerSorter.interface";
import { LeaderboardKineticsCalculator } from "../KineticsCalculator";
import { LeaderboardSnapshotsMap } from "@core/snapshots/rest_api/types/LeaderboardSnapshotsMap";

// --- Mock Config ---
const APP_CONFIG = {
  MIN_LEADERBOARD_TICKER_HISTORY_COUNT: 2
};

// --- Mock Storage ---
class MockLeaderboardStorage {
  public leaderboards: Record<string, LeaderboardRestTickerSnapshot[]> = {};
  public snapshots: Record<string, Record<string, NormalizedRestTickerSnapshot[]>> = {};

  initializeLeaderboardStore(name: string) {
    if (!this.leaderboards[name]) this.leaderboards[name] = [];
    if (!this.snapshots[name]) this.snapshots[name] = {};
  }
  async storeSnapshot(leaderboardName: string, ticker: string, snapshot: NormalizedRestTickerSnapshot) {
    if (!this.snapshots[leaderboardName][ticker]) this.snapshots[leaderboardName][ticker] = [];
    this.snapshots[leaderboardName][ticker].unshift(snapshot);
  }
  async retrieveAllSnapshotsForTicker(leaderboardName: string, ticker: string) {
    return this.snapshots[leaderboardName][ticker] || [];
  }
  async persistLeaderboard(leaderboardName: string, data: LeaderboardRestTickerSnapshot[]) {
    this.leaderboards[leaderboardName] = [...data];
  }
  async retreiveLeaderboard(leaderboardName: string) {
    return this.leaderboards[leaderboardName] || null;
  }
}

// --- Mock Sorter ---
const mockSorter: GenericTickerSorter<LeaderboardRestTickerSnapshot, LeaderboardRestTickerSnapshot> = {
  sort: (arr) => arr.sort((a, b) => b.leaderboard_momentum_score - a.leaderboard_momentum_score) // descending by leaderboard_momentum_score
};

// --- Mock KineticsCalculator ---
const mockKineticsCalculator: LeaderboardKineticsCalculator = {
  computePercChangeVelocity: (history) => (history[0]?.timestamp ?? 0) - (history[1]?.timestamp ?? 0), // fake perc_change_velocity
  computePercChangeAcceleration: (history) => history.length > 2 ? 1 : 0 // fake pct_change_acceleration
};

// --- Mock Data In ---
const testData: LeaderboardSnapshotsMap = {
  scan_strategy_tag: "test-strategy",
  normalized_leaderboard_tickers: [
    { ticker: "AAA", timestamp: 100, ordinal_sort_position: 0, change_pct: 1.2 },
    { ticker: "BBB", timestamp: 200, ordinal_sort_position: 1, change_pct: -0.5 }
  ]
};

// --- Test Service Lifecycle ---
async function testLeaderboardServiceLifecycle() {
  const storage = new MockLeaderboardStorage();
  const service = new LeaderboardService(storage as any);

  // Pre-populate with enough snapshots for perc_change_velocity/perc_change_acceleration calculation
  await storage.storeSnapshot("test-strategy", "AAA", { ticker: "AAA", timestamp: 98, ordinal_sort_position: 0, change_pct: 1.0 });
  await storage.storeSnapshot("test-strategy", "AAA", { ticker: "AAA", timestamp: 99, ordinal_sort_position: 0, change_pct: 1.1 });
  await storage.storeSnapshot("test-strategy", "BBB", { ticker: "BBB", timestamp: 195, ordinal_sort_position: 1, change_pct: -0.3 });
  await storage.storeSnapshot("test-strategy", "BBB", { ticker: "BBB", timestamp: 197, ordinal_sort_position: 1, change_pct: -0.4 });
  await storage.storeSnapshot("test-strategy", "BBB", { ticker: "BBB", timestamp: 197, ordinal_sort_position: 1, change_pct: -0.5 });

  // Process incoming data
  const result: LeaderboardRestTickerSnapshot[] = await service.rankAndUpdateLeaderboard(
    testData,
    mockSorter,
    mockKineticsCalculator
  );

  // --- Mock Data Out ---
  console.log("Processed Leaderboard:", result);

  // Read back leaderboard
  const current = await service.retreiveLeaderboard("test-strategy");
  console.log("Current Leaderboard:", current);
}

testLeaderboardServiceLifecycle().catch(console.error);