import { NormalizedRestTickerSnapshot } from "./types/NormalizedRestTickerSnapshot.interface";

// Simple in-memory store for previous snapshots (could be replaced with Redis later)
const snapshotHistory: Record<string, NormalizedRestTickerSnapshot[]> = {};

// Append to history and return past snapshots
function updateHistory(ticker: string, snapshot: NormalizedRestTickerSnapshot) {
  if (!snapshotHistory[ticker]) {
    snapshotHistory[ticker] = [];
  }

  snapshotHistory[ticker].push(snapshot);

  // Limit history size
  if (snapshotHistory[ticker].length > 5) {
    snapshotHistory[ticker].shift(); // remove oldest
  }

  return snapshotHistory[ticker];
}

export function computeVelocity(snapshot: NormalizedRestTickerSnapshot): number {
  const history = updateHistory(snapshot.ticker, snapshot);
  if (history.length < 2) return 0;

  const prev = history[history.length - 2];
  const deltaPct = snapshot.change_pct - prev.change_pct;
  const deltaTime = (snapshot.timestamp - prev.timestamp) / 1000; // seconds

  return deltaTime > 0 ? deltaPct / deltaTime : 0;
}

export function computeAcceleration(snapshot: NormalizedRestTickerSnapshot): number {
  const history = snapshotHistory[snapshot.ticker];
  if (!history || history.length < 3) return 0;

  const s1 = history[history.length - 3];
  const s2 = history[history.length - 2];
  const s3 = history[history.length - 1];

  const v1 = (s2.change_pct - s1.change_pct) / ((s2.timestamp - s1.timestamp) / 1000);
  const v2 = (s3.change_pct - s2.change_pct) / ((s3.timestamp - s2.timestamp) / 1000);

  const deltaTime = (s3.timestamp - s2.timestamp) / 1000;

  return deltaTime > 0 ? (v2 - v1) / deltaTime : 0;
}
