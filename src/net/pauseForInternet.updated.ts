import dns from "dns/promises";
import { APP_CONFIG_2 } from "src/config_2/app_config";

const { hosts, timeoutMs } = APP_CONFIG_2.internet;

/**
 * Retry loop that waits until the internet is reachable before proceeding.
 */
export async function pauseForInternet({
  retryIntervalMs = 2000,
  maxRetries = 10,
}: {
  retryIntervalMs?: number;
  maxRetries?: number;
} = {}) {
  let retries = 0;
  let previouslyOffline = false;

  while (retries < maxRetries) {
    try {
      for (const host of hosts) {
        await dns.lookup(host, { all: true, family: 4 });
      }
      if (previouslyOffline) {
        console.log("✅ Internet connection restored.");
      }
      return;
    } catch {
      if (!previouslyOffline) {
        console.warn("⚠️ No internet connection. Pausing...");
        previouslyOffline = true;
      }
      await new Promise((res) => setTimeout(res, retryIntervalMs));
      retries++;
    }
  }

  throw new Error("❌ Maximum retries reached. Internet still unavailable.");
}
