import { promises as fs } from "fs";
import path from "path";
import logger from "@infrastructure/logger";

const TEST_FILE_NAME = ".storage_access_check.tmp";

/**
 * Verifies that the app can write to a specified storage directory.
 * Throws if access is denied or disk is full.
 */
export async function verifyStorageWriteAccess(dirPath: string = "./data/tmp"): Promise<void> {
  const testFilePath = path.join(dirPath, TEST_FILE_NAME);

  try {
    await fs.mkdir(dirPath, { recursive: true }); // Ensure directory exists
    await fs.writeFile(testFilePath, "test");
    await fs.unlink(testFilePath);

    logger.info({ dirPath }, `Storage write access verified: ${dirPath}`);
  } catch (err) {
    logger.error({ dirPath, error: err }, `Cannot write to storage path: ${dirPath}`);
    throw new Error(`Storage write access failed: ${dirPath}`);
  }
}
