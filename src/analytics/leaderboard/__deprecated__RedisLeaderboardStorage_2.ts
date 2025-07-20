import { redisClient } from "@infrastructure/__deprecated__redis/redis.service";
import { LeaderboardStorage } from "./leaderboardStorage.interface";
import { NormalizedRestTickerSnapshot } from "@data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { LeaderboardRestTickerSnapshot } from "@data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";

export class RedisLeaderboardStorage implements LeaderboardStorage {
	private readonly MAX_SNAPSHOTS = 10;

	constructor(private readonly redis = redisClient) {}

	async storeSnapshot(ticker: string, snapshot: NormalizedRestTickerSnapshot): Promise<void> {
		const key = `snapshots:${ticker}`;
		await this.redis.lPush(key, JSON.stringify(snapshot));
		await this.redis.lTrim(key, 0, this.MAX_SNAPSHOTS - 1);
	}

	async retrieveAllSnapshotsForTicker(ticker: string): Promise<NormalizedRestTickerSnapshot[]> {
		const key = `snapshots:${ticker}`;
		const entries = await this.redis.lRange(key, 0, -1);
		return entries.map((entry) => JSON.parse(entry));
	}

	async retrieveRecentSnapshots(ticker: string, limit: number): Promise<NormalizedRestTickerSnapshot[]> {
		const key = `snapshots:${ticker}`;
		const entries = await this.redis.lRange(key, 0, limit - 1);
		return entries.map((entry) => JSON.parse(entry));
	}

	async hasMinimumSnapshots(ticker: string, min: number): Promise<boolean> {
		const key = `snapshots:${ticker}`;
		const count = await this.redis.lLen(key);
		return count >= min;
	}

	async setLeaderboard(leaderboard: LeaderboardRestTickerSnapshot[]): Promise<void> {
		await this.redis.set("leaderboard:current", JSON.stringify(leaderboard));
	}

	async getCurrentLeaderboard(): Promise<LeaderboardRestTickerSnapshot[] | null> {
		const data = await this.redis.get("leaderboard:current");
		return data ? JSON.parse(data) : null;
	}
}
