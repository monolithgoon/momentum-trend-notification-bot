import { verifyRedisConnection } from "@infrastructure/__deprecated__redis/redis.service";
import { initializeAlertListeners } from "./alertListeners";
// other imports...

export default async function bootstrap() {
	await verifyRedisConnection(); // <– Validate Redis
	await initializeAlertListeners(); // <– Now it’s safe to subscribe to Redis channels
	// Start scanner / scheduler / API server...
}
