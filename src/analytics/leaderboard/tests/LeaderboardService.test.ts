// tests/LeaderboardService.test.ts

import { LeaderboardService, LeaderboardSnapshotSorter } from "../LeaderboardService";
import { InMemoryLeaderboardStorage } from "../InMemoryLeaderboardStorage";
import { LeaderboardKineticsCalculator } from "../LeaderboardKineticsCalculator";
import { generateMockSnapshots } from "@data/snapshots/rest_api/generateMockSnapshots";

test("LeaderboardService ranks tickers by score", async () => {
	const storage = new InMemoryLeaderboardStorage();
	const sorter = new LeaderboardSnapshotSorter("score", "desc");
	const kinetics = new LeaderboardKineticsCalculator();

	const service = new LeaderboardService(storage, sorter, kinetics);

	const snapshots = generateMockSnapshots(["AAPL", "MSFT"], 3);

	// Push snapshots in chunks like real-time stream simulation
	await service.processSnapshots(snapshots.slice(0, 2));
	await service.processSnapshots(snapshots.slice(2, 4));
	await service.processSnapshots(snapshots.slice(4, 6));

	const leaderboard = await service.getCurrentLeaderboard();

	expect(leaderboard).not.toBeNull();
	expect(leaderboard!.length).toBe(2);
	expect(leaderboard![0].ticker).toBe("AAPL"); // Higher score due to higher pct change
});
