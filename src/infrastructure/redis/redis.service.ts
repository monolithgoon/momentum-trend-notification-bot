import Redis from "ioredis";
import { APP_CONFIG } from "@config/index";

export function getRedisConnectionOptions() {
	let {
		REDIS_HOST: host,
		REDIS_PORT: port,
		REDIS_USERNAME: username,
		REDIS_PASSWORD: password,
		REDIS_TLS: tls,
	} = APP_CONFIG;

	if (Number.isNaN(port)) {
		throw new Error("Invalid REDIS_PORT: must be a number");
	}

	const protocol = tls === "true" ? "rediss" : "redis";

	const url =
		username && password ? `${protocol}://${username}:${password}@${host}:${port}` : `${protocol}://${host}:${port}`;

	return {
		url,
		// You could also return object-form instead:
		// host: host,
		// port,
		// username: username,
		// password: password,
		// tls: REDIS_TLS === "true" ? {} : undefined,
	};
}

export const redisClient = new Redis(getRedisConnectionOptions().url, {
	// Waits 2s before trying again. Stop retrying after 10 attempts.
	retryStrategy: (attempts) => {
		if (attempts > 10) {
			console.error("❌ Too many Redis retry attempts. Giving up.");
			return null; // Stop retrying
		}
		const delay = Math.min(attempts * 200, 2000); // cap at 2s
		console.warn(`🔄 Redis reconnect attempt ${attempts}...`);
		return delay;
	},

	// Optional: close if Redis doesn't respond within X ms
	connectTimeout: 5000,
});

export async function connectRedis(): Promise<Redis> {
	if (redisClient.status !== "ready") {
		console.log(`🔌 Redis status: ${redisClient.status}. Attempting to connect...`);

		try {
			await redisClient.connect();
			console.log("✅ Redis connected");
		} catch (err) {
			console.error("❌ Failed to connect to Redis:", err);
			throw err;
		}
	} else {
		console.log("⚡ Redis already connected.");
	}

	return redisClient;
}

export async function verifyRedisConnection() {
	try {
		await redisClient.ping(); // quick check
		console.log("✅ Redis is alive");
	} catch (err) {
		console.error("❌ Redis ping failed:", err);
		process.exit(1); // or rethrow
	}
}

redisClient.on("connect", () => {
	console.log("✅ Redis connected");
});

redisClient.on("reconnecting", () => {
	console.warn("🔄 Redis reconnecting...");
});

redisClient.on("ready", () => {
	console.log("🚀 Redis ready to use");
});

redisClient.on("end", () => {
	console.warn("🛑 Redis connection closed");
});

redisClient.on("error", (err) => {
	console.error("❌ Redis error:", err);
});

// REMOVE - REPLACED
// Official Redis client
// import { createClient } from "redis";
// import { APP_CONFIG } from "@config/index";

// export const redisClient = createClient({ url: APP_CONFIG.REDIS_URL });

// redisClient.on("error", (err) => console.error("❌ Redis Client Error", err));

// export async function connectRedis() {
// 	if (!redisClient.isOpen) {
// 		await redisClient.connect();
// 		console.log("✅ Redis connected");
// 	}
// }
