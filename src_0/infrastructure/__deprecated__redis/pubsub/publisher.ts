import { redisClient } from "../redis.service";

/**
 * Publish alert message to Redis pub/sub channel.
 */
export async function publishAlert(payload: object): Promise<void> {
	await redisClient.publish("alerts", JSON.stringify(payload));
}
