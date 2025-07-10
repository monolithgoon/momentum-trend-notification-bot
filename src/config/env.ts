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
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
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
  TELEGRAM_BOT_TOKEN: getOptionalEnvVar("TELEGRAM_BOT_TOKEN"),
  TELEGRAM_CHAT_ID: getOptionalEnvVar("TELEGRAM_CHAT_ID"),
};
