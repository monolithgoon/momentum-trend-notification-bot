import { redisClient } from "../redis.service";

/**
 * Subscribe to Redis pub/sub channel for alerts.
 * Calls the provided callback with parsed message data.
 */

export function subscribeToAlerts(callback: (msg: any) => void): void {
	redisClient.subscribe("alerts", (message: string) => {
		try {
			const data = JSON.parse(message);
			callback(data);
		} catch (err) {
			console.error("Invalid alert message:", message);
		}
	});
}
