// infrastructure/storage/StorageHealthChecker.ts

export interface StorageHealthChecker {
  name: string;
  verifyWriteAccess(): Promise<void>;
}
