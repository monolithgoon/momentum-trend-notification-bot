/** StoragePort — persistence contract */
import type { Snapshot, Enriched } from "../types";
export interface StoragePort {
  initializeLeaderboardStore(tag: string): Promise<void>;
  storeSnapshot(tag: string, symbol: string, snap: Snapshot): Promise<void>;
  readSnapshotHistory(tag: string, symbol: string, limit: number): Promise<Snapshot[]>;
  persistLeaderboard(tag: string, items: Enriched[]): Promise<void>;
  readLeaderboard(tag: string): Promise<Enriched[] | [] | null>;
}
