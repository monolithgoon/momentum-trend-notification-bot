import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { version as APP_VERSION } from "../../../package.json";

// Load environment variables from appropriate .env file
const NODE_ENV = process.env.NODE_ENV || "development";
const BASE_ENV_PATH = path.resolve(process.cwd(), `.env`);
const ENV_PATH = path.resolve(process.cwd(), `.env.${NODE_ENV}`);

function loadEnv(): void {
	if (!NODE_ENV) {
		throw new Error("❌ Missing NODE_ENV in environment variables.");
	}

	if (fs.existsSync(ENV_PATH)) {
		dotenv.config({ path: ENV_PATH });
	} else if (fs.existsSync(BASE_ENV_PATH)) {
		dotenv.config({ path: BASE_ENV_PATH });
	} else {
		console.warn("⚠️ No .env file found.");
	}
}

function getEnvVar<T extends string>(key: T, required = false): string | undefined {
	const value = process.env[key];
	if (required && !value) {
		throw new Error(`❌ Missing required env variable: ${key}`);
	}
	return value;
}

loadEnv();

// Define expected env variable schema
interface EnvVars {
	EODHD_API_KEY: string;
	POLYGON_API_KEY?: string;
  FMP_API_KEY?: string;
	// telegram
	TELEGRAM_BOT_TOKEN?: string;
	TELEGRAM_CHAT_ID?: string;
	// redis
	REDIS_HOST: string;
	REDIS_PORT: string;
	REDIS_USERNAME?: string;
	REDIS_PASSWORD?: string;
	REDIS_TLS?: string; // e.g. "true" to enable TLS
}

// Extract required and optional environment variables
const envVars: EnvVars = {
	EODHD_API_KEY: getEnvVar("EODHD_API_KEY", true)!,
	POLYGON_API_KEY: getEnvVar("POLYGON_API_KEY"),
	FMP_API_KEY: getEnvVar("FMP_API_KEY"),
	TELEGRAM_BOT_TOKEN: getEnvVar("TELEGRAM_BOT_TOKEN"),
	TELEGRAM_CHAT_ID: getEnvVar("TELEGRAM_CHAT_ID"),
	REDIS_HOST: getEnvVar("REDIS_HOST", true)!,
	REDIS_PORT: getEnvVar("REDIS_PORT", true)!,
	REDIS_USERNAME: getEnvVar("REDIS_USERNAME"),
	REDIS_PASSWORD: getEnvVar("REDIS_PASSWORD"),
	REDIS_TLS: getEnvVar("REDIS_TLS"),
};

// Final unified config object
export const ENV: EnvVars & {
	NODE_ENV: string;
	DEBUG_MODE: boolean;
	VERSION: string;
} = {
	...envVars,
	NODE_ENV,
	DEBUG_MODE: getEnvVar("DEBUG_MODE") === "true",
	VERSION: APP_VERSION,
};
