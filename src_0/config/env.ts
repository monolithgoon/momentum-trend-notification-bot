// src/config.ts
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || "development";

if (!process.env.NODE_ENV) {
	throw new Error("Missing NODE_ENV in environment variables.");
}

const basePath = path.resolve(process.cwd(), `.env`);
const envPath = path.resolve(process.cwd(), `.env.${NODE_ENV}`);

if (fs.existsSync(envPath)) {
	dotenv.config({ path: envPath });
} else if (fs.existsSync(basePath)) {
	dotenv.config({ path: basePath });
} else {
	console.warn("⚠️ No .env file found.");
}

// Define expected environment variable schema
interface EnvVars {
	EODHD_API_KEY: string;
	POLYGON_API_KEY?: string;
	// telegram
	TELEGRAM_BOT_TOKEN?: string;
	TELEGRAM_CHAT_ID?: string;
	// redis
	REDIS_HOST: string;
	REDIS_PORT?: string;
	REDIS_USERNAME?: string;
	REDIS_PASSWORD?: string;
	REDIS_TLS?: string; // e.g. "true" to enable TLS
}

// Utility functions to extract environment variables
function getRequiredEnvVar(key: string): string {
	const val = process.env[key];
	if (!val) throw new Error(`❌ ${key} is required`);
	return val;
}

function getOptionalEnvVar(key: string): string | undefined {
	return process.env[key];
}

// Extract environment variables
export const ENV: EnvVars = {
	EODHD_API_KEY: getRequiredEnvVar("EODHD_API_KEY"),
	POLYGON_API_KEY: getOptionalEnvVar("POLYGON_API_KEY"),
	// telegram
	TELEGRAM_BOT_TOKEN: getOptionalEnvVar("TELEGRAM_BOT_TOKEN"),
	TELEGRAM_CHAT_ID: getOptionalEnvVar("TELEGRAM_CHAT_ID"),
	// redis
	REDIS_HOST: getRequiredEnvVar("REDIS_HOST"),
	REDIS_PORT: getRequiredEnvVar("REDIS_PORT"),
	REDIS_USERNAME: getOptionalEnvVar("REDIS_USERNAME"),
	REDIS_PASSWORD: getOptionalEnvVar("REDIS_PASSWORD"),
	REDIS_TLS: getOptionalEnvVar("REDIS_TLS"),
};
