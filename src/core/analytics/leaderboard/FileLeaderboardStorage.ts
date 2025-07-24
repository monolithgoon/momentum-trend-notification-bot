import fs from "fs/promises";
import path from "path";
import { LeaderboardStorage } from "./leaderboardStorage.interface";
import { LeaderboardRestTickerSnapshot } from "@data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";
import { existsSync } from "fs";

export class FileLeaderboardStorage implements LeaderboardStorage {
	private readonly storageDir = path.resolve("storage");
	private readonly MAX_SNAPSHOTS_STORED_PER_TICKER = 10;

	constructor() {
		fs.mkdir(this.storageDir, { recursive: true }).catch(console.error);
	}

	private leaderboardFile(leaderboardName: string): string {
		return path.join(this.storageDir, `${leaderboardName}_leaderboard.json`);
	}

	private tickerFile(leaderboardName: string, ticker: string): string {
		return path.join(this.storageDir, `${leaderboardName}_${ticker}.json`);
	}

	/**
	 * Create a leaderboard file if it doesn't already exist.
	 */
	async initializeLeaderboardStore(leaderboardName: string): Promise<void> {
		const filePath = this.leaderboardFile(leaderboardName);

		if (!existsSync(filePath)) {
			await fs.writeFile(filePath, JSON.stringify([], null, 2));
			console.log(`📁 Created leaderboard file: ${filePath}`);
		}
	}

	async storeSnapshot(leaderboardName: string, ticker: string, snapshot: LeaderboardRestTickerSnapshot): Promise<void> {
		const file = this.tickerFile(leaderboardName, ticker);

		let snapshots: LeaderboardRestTickerSnapshot[] = [];
    
		try {
			const raw = await fs.readFile(file, "utf8");
			snapshots = JSON.parse(raw);
		} catch (_) {}

		snapshots.unshift(snapshot);
		snapshots = snapshots.slice(0, this.MAX_SNAPSHOTS_STORED_PER_TICKER);

		await fs.writeFile(file, JSON.stringify(snapshots, null, 2));
	}

	async retrieveAllSnapshotsForTicker(
		leaderboardName: string,
		ticker: string
	): Promise<LeaderboardRestTickerSnapshot[]> {
		const file = this.tickerFile(leaderboardName, ticker);
		try {
			const raw = await fs.readFile(file, "utf8");
			return JSON.parse(raw);
		} catch (_) {
			return [];
		}
	}

	async retrieveRecentSnapshots(
		leaderboardName: string,
		ticker: string,
		limit: number
	): Promise<LeaderboardRestTickerSnapshot[]> {
		const all = await this.retrieveAllSnapshotsForTicker(leaderboardName, ticker);
		return all.slice(0, limit);
	}

	async hasMinimumSnapshots(leaderboardName: string, ticker: string, min: number): Promise<boolean> {
		const snapshots = await this.retrieveAllSnapshotsForTicker(leaderboardName, ticker);
		return snapshots.length >= min;
	}

	/**
	 * Persist leaderboard data only if the file exists.
	 */
	async persistLeaderboard(leaderboardName: string, leaderboard: LeaderboardRestTickerSnapshot[]): Promise<void> {
		const filePath = this.leaderboardFile(leaderboardName);

		if (!existsSync(filePath)) {
			throw new Error(`❌ Leaderboard file does not exist: ${filePath}`);
		}

		await fs.writeFile(filePath, JSON.stringify(leaderboard, null, 2));
	}

	async retrieveLeaderboard(leaderboardName: string): Promise<LeaderboardRestTickerSnapshot[] | null> {
		try {
			const raw = await fs.readFile(this.leaderboardFile(leaderboardName), "utf8");
			return JSON.parse(raw);
		} catch (_) {
			return null;
		}
	}
}
