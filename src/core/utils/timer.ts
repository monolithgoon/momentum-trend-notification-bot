import logger from "@infrastructure/logger";

/**
 * Starts a timer and returns a `stop()` function to log duration.
 *
 * @param label Name of metric or context
 * @param context Optional key-value pairs for log correlation (e.g., correlationId)
 */
export default function timer(label: string, context: Record<string, any> = {}): () => void {
  const start = Date.now();

  return () => {
    const duration = Date.now() - start;
    logger.info({ ...context, [label]: duration }, `⏱️ ${label}: ${duration}ms`);
  };
}
