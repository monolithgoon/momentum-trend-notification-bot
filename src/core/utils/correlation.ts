import { randomUUID } from "crypto";

/**
 * Generates a correlation ID with optional prefix for traceability.
 *
 * @param prefix Optional prefix like "scan", "notif", etc.
 * @returns Correlation ID string like "scan-xxx-yyy"
 */
export function generateCorrelationId(prefix?: string): string {
  let baseId: string;

  try {
    baseId = randomUUID(); // Node.js >=14.17.0
  } catch {
    baseId = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  }

  return prefix ? `${prefix}-${baseId}` : baseId;
}
