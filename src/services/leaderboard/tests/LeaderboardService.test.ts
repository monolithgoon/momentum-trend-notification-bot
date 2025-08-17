import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/models/LeaderboardRestTickerSnapshot.interface";
import { LeaderboardService } from "../__deprecated__LeaderboardService";
import { NormalizedRestTickerSnapshot } from "@core/models/rest_api/models/NormalizedRestTickerSnapshot.interface";

// Mock APP_CONFIG
const APP_CONFIG = {
  MIN_LEADERBOARD_TICKER_HISTORY_COUNT: 2,
};

// Mock Storage Implementation
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
    if (this.snapshots[leaderboardName][ticker].length > 5) {
      this.snapshots[leaderboardName][ticker].pop();
    }
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

// Mock Sorter
const mockSorter = {
  sort: (arr: LeaderboardRestTickerSnapshot[]) =>
    [...arr].sort((a, b) => b.leaderboard_momentum_score - a.leaderboard_momentum_score),
};

// Mock KineticsCalculator
const mockKineticsCalculator = {
  computePercChangeVelocity: (history: NormalizedRestTickerSnapshot[]) =>
    (history[0]?.change_pct ?? 0) - (history[1]?.change_pct ?? 0),
  computePercChangeAcceleration: (history: NormalizedRestTickerSnapshot[]) =>
    history.length > 2
      ? (history[0]?.change_pct ?? 0) - 2 * (history[1]?.change_pct ?? 0) + (history[2]?.change_pct ?? 0)
      : 0,
};

describe("LeaderboardService", () => {
  let storage: MockLeaderboardStorage;
  let service: LeaderboardService;

  beforeEach(() => {
    storage = new MockLeaderboardStorage();
    service = new LeaderboardService(storage as any);
  });

  it("should process snapshots and create a sorted leaderboard", async () => {
    const leaderboardTag = "test-strategy";
    const initialSnapshots: NormalizedRestTickerSnapshot[] = [
      { ticker: "AAA", timestamp: 98, ordinal_sort_position: 0, change_pct: 1.0 },
      { ticker: "AAA", timestamp: 99, ordinal_sort_position: 0, change_pct: 1.1 },
      { ticker: "BBB", timestamp: 195, ordinal_sort_position: 1, change_pct: -0.3 },
      { ticker: "BBB", timestamp: 197, ordinal_sort_position: 1, change_pct: -0.4 },
    ];

    // Pre-populate storage with enough history for AAA and BBB
    await storage.storeSnapshot(leaderboardTag, "AAA", initialSnapshots[0]);
    await storage.storeSnapshot(leaderboardTag, "AAA", initialSnapshots[1]);
    await storage.storeSnapshot(leaderboardTag, "BBB", initialSnapshots[2]);
    await storage.storeSnapshot(leaderboardTag, "BBB", initialSnapshots[3]);

    const testData: ITaggedLeaderboardSnapshotsBatch = {
      scan_strategy_tag: leaderboardTag,
      normalized_leaderboard_snapshots: [
        { ticker: "AAA", timestamp: 100, ordinal_sort_position: 0, change_pct: 1.2 },
        { ticker: "BBB", timestamp: 200, ordinal_sort_position: 1, change_pct: -0.5 },
      ],
    };

    const result: LeaderboardRestTickerSnapshot[] = await service.rankAndUpdateLeaderboard(
      testData,
      mockSorter,
      mockKineticsCalculator
    );

    // Should be sorted by leaderboard_momentum_score descending
    expect(result).toHaveLength(2);
    expect(result[0].leaderboard_momentum_score).toBeGreaterThanOrEqual(result[1].leaderboard_momentum_score);

    // perc_change_velocity and pct_change_acceleration calculations should be correct
    expect(result[0]).toHaveProperty("ticker");
    expect(result[0]).toHaveProperty("timestamp");
    expect(result[0]).toHaveProperty("perc_change_velocity");
    expect(result[0]).toHaveProperty("pct_change_acceleration");
    expect(result[0]).toHaveProperty("leaderboard_momentum_score");
    expect(result[0]).toHaveProperty("leaderboard_rank");

    // The storage should have the current leaderboard
    const leaderboard = await service.retreiveLeaderboard(leaderboardTag);
    expect(leaderboard).toEqual(result);
  });

  it("should skip tickers without enough history", async () => {
    const leaderboardTag = "insufficient-history";
    const testData: ITaggedLeaderboardSnapshotsBatch = {
      scan_strategy_tag: leaderboardTag,
      normalized_leaderboard_snapshots: [
        { ticker: "CCC", timestamp: 150, ordinal_sort_position: 0, change_pct: 0.9 }, // only one snapshot
      ],
    };

    // No pre-population for CCC, so not enough history
    const result = await service.rankAndUpdateLeaderboard(
      testData,
      mockSorter,
      mockKineticsCalculator
    );

    expect(result).toHaveLength(0);
    const leaderboard = await service.retreiveLeaderboard(leaderboardTag);
    expect(leaderboard).toEqual([]);
  });
});