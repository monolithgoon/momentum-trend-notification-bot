// infrastructure/storage/RedisStorageHealthChecker.ts

import { Redis } from "ioredis";
import { StorageHealthChecker } from "./StorageHealthChecker";

export class RedisStorageHealthChecker implements StorageHealthChecker {
  public readonly name = "RedisStorage";

  constructor(private redisClient: Redis) {}

  async verifyWriteAccess(): Promise<void> {
    try {
      await this.redisClient.set("test_storage_check", "ok", "EX", 5);
      console.log(`✅ ${this.name} access verified.`);
    } catch (err) {
      console.error(`❌ ${this.name} write check failed:`, err);
      throw new Error("Redis storage check failed.");
    }
  }
}
