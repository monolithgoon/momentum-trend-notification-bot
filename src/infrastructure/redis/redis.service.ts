import { createClient } from "redis";
import { InternalTickerSnapshot } from "../../core/interfaces/internalTickerSnapshot.interface";

const redisClient = createClient();
await redisClient.connect();

/**
 * Save a new snapshot to Redis under the ticker's time series key.
 * Keeps the list trimmed to a max length (default: 100).
 */
export async function saveSnapshotToRedis(
  ticker: string,
  snapshot: InternalTickerSnapshot,
  limit: number = 100
): Promise<void> {
  const key = `snapshots:${ticker}`;
  await redisClient.lPush(key, JSON.stringify(snapshot));
  await redisClient.lTrim(key, 0, limit - 1);
}

/**
 * Get recent N snapshots for a given ticker from Redis.
 */
export async function getRecentSnapshots(
  ticker: string,
  count: number = 3
): Promise<InternalTickerSnapshot[]> {
  const key = `snapshots:${ticker}`;
  const raw = await redisClient.lRange(key, 0, count - 1);
  return raw.map((entry) => JSON.parse(entry) as InternalTickerSnapshot);
}

/**
 * Publish alert message to Redis pub/sub channel.
 */
export async function publishAlert(payload: object): Promise<void> {
  await redisClient.publish("alerts", JSON.stringify(payload));
}
/**
 * Subscribe to Redis pub/sub channel for alerts.
 * Calls the provided callback with parsed message data.
 */