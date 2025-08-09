import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { LeaderboardStorage } from "@services/leaderboard/LeaderboardStorage.interface";
import { APP_CONFIG_2 } from "src/config_2/app_config";
import { ILeaderboardTickerSnapshot } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface";
import { ILeaderboardStorage } from "./types/ILeaderboardStorage.interface";

export class FileLeaderboardStorage implements ILeaderboardStorage {
	private readonly storageDir = path.resolve("storage");
	private readonly maxNumSnapshotsStored = APP_CONFIG_2.leaderboard.maxSnapshotsStoredPerTicker;

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

	async storeSnapshot(
		leaderboardName: string,
		ticker: string,
		snapshot: ILeaderboardTickerSnapshot
	): Promise<void> {
		const file = this.tickerFile(leaderboardName, ticker);

		let snapshots: ILeaderboardTickerSnapshot[] = [];

		try {
			const raw = await fs.readFile(file, "utf8");
			snapshots = JSON.parse(raw);
		} catch (_) {}

		snapshots.unshift(snapshot);
		snapshots = snapshots.slice(0, this.maxNumSnapshotsStored);

		await fs.writeFile(file, JSON.stringify(snapshots, null, 2));
	}

	async retrieveAllSnapshotsForTicker(
		leaderboardName: string,
		ticker: string
	): Promise<ILeaderboardTickerSnapshot[]> {
		const file = this.tickerFile(leaderboardName, ticker);
		try {
			const raw = await fs.readFile(file, "utf8");
			return JSON.parse(raw);
		} catch (_) {
			return [];
		}
	}

	async readSnapshotHistoryForTicker(
		leaderboardName: string,
		ticker: string,
		limit: number
	): Promise<ILeaderboardTickerSnapshot[]> {
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
	async persistLeaderboard(leaderboardName: string, leaderboard: ILeaderboardTickerSnapshot[]): Promise<void> {
		const filePath = this.leaderboardFile(leaderboardName);

		if (!existsSync(filePath)) {
			throw new Error(`❌ Leaderboard file does not exist: ${filePath}`);
		}

		await fs.writeFile(filePath, JSON.stringify(leaderboard, null, 2));
	}

	async retrieveLeaderboard(leaderboardName: string): Promise<ILeaderboardTickerSnapshot[]> {
		const filePath = this.leaderboardFile(leaderboardName);

		try {
			const content = await fs.readFile(filePath, "utf-8");
			const parsed = JSON.parse(content) as ILeaderboardTickerSnapshot[];

			if (!Array.isArray(parsed)) {
				throw new Error("Leaderboard file is not an array.");
			}

			return parsed;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return []; // file doesn't exist yet
			}

			console.error(`Error reading leaderboard "${leaderboardName}":`, error);
			throw error;
		}
	}
}
