/**
 * FileStoragePort — JSONL/JSON file-based storage
 */
import { promises as fs } from "fs";
import path from "path";
import type { StoragePort } from "../ports/StoragePort";
import type { Snapshot, Enriched } from "../types";

export class FileStoragePort implements StoragePort {
  constructor(private readonly baseDir: string) {}
  private tagDir(tag: string) { return path.join(this.baseDir, tag); }
  private historyDir(tag: string) { return path.join(this.tagDir(tag), "history"); }
  private historyFile(tag: string, symbol: string) {
    const safe = symbol.replace(/[^A-Za-z0-9._-]/g, "_");
    return path.join(this.historyDir(tag), `${safe}.jsonl`);
  }
  private leaderboardFile(tag: string) { return path.join(this.tagDir(tag), "leaderboard.json"); }

  async initializeLeaderboardStore(tag: string): Promise<void> {
    await fs.mkdir(this.historyDir(tag), { recursive: true });
    const lf = this.leaderboardFile(tag);
    try { await fs.access(lf); } catch { await fs.writeFile(lf, "[]", "utf8"); }
  }

  async storeSnapshot(tag: string, symbol: string, snap: Snapshot): Promise<void> {
    const file = this.historyFile(tag, symbol);
    await fs.mkdir(path.dirname(file), { recursive: true });
    let lastTs: number | null = null;
    try {
      const buf = await fs.readFile(file, "utf8");
      const lastNL = buf.lastIndexOf("\n", buf.length - 2);
      const lastLine = buf.slice(lastNL + 1).trim();
      if (lastLine) {
        const last = JSON.parse(lastLine) as Snapshot;
        lastTs = last.timestamp__ld_tick ?? null;
      }
    } catch {}
    if (lastTs != null && lastTs === snap.timestamp__ld_tick) return;
    const line = JSON.stringify(snap) + "\n";
    await fs.appendFile(file, line, "utf8");
  }

  async readSnapshotHistory(tag: string, symbol: string, limit: number): Promise<Snapshot[]> {
    const file = this.historyFile(tag, symbol);
    try {
      const buf = await fs.readFile(file, "utf8");
      const lines = buf.trim().split(/\r?\n/);
      const tail = lines.slice(-limit);
      const arr = tail.map(l => JSON.parse(l) as Snapshot);
      return arr.sort((a,b) => a.timestamp__ld_tick - b.timestamp__ld_tick);
    } catch {
      return [];
    }
  }

  async persistLeaderboard(tag: string, items: Enriched[]): Promise<void> {
    const lf = this.leaderboardFile(tag);
    await fs.mkdir(path.dirname(lf), { recursive: true });
    const tmp = lf + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(items), "utf8");
    await fs.rename(tmp, lf);
  }

  async readLeaderboard(tag: string): Promise<Enriched[] | [] | null> {
    const lf = this.leaderboardFile(tag);
    try {
      const buf = await fs.readFile(lf, "utf8");
      return JSON.parse(buf) as Enriched[];
    } catch {
      return [];
    }
  }
}
