// infrastructure/storage/FileStorageHealthChecker.ts

import { promises as fs } from "fs";
import path from "path";
import { StorageHealthChecker } from "./StorageHealthChecker";

export class FileStorageHealthChecker implements StorageHealthChecker {
  public readonly name = "FileStorage";
  private testFileName = ".storage_access_check.tmp";

  constructor(private dirPath: string = "./data/tmp") {}

  public async verifyWriteAccess(): Promise<void> {
    const filePath = path.join(this.dirPath, this.testFileName);
    try {
      await fs.mkdir(this.dirPath, { recursive: true });
      await fs.writeFile(filePath, "test");
      await fs.unlink(filePath);
      console.log(`✅ ${this.name} access verified:`, this.dirPath);
    } catch (err) {
      console.error(`❌ ${this.name} write check failed:`, err);
      throw new Error(`Storage check failed: ${this.dirPath}`);
    }
  }
}
