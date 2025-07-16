import dns from "dns/promises";
const DNS_CHECK_HOSTS = ["google.com", "cloudflare.com", "1.1.1.1"];
const DEFAULT_TIMEOUT_MS = 3000;

/**
 * Narrative explanation of the waitForInternet() retry loop:
 *
 * This function keeps checking if the internet is reachable before letting the app continue.
 *
 * It tries to ping a known URL using a quick HEAD request.
 *
 * If the internet is reachable:
 *   - It exits the loop.
 *   - If we had previously been offline, it logs that the connection is restored.
 *
 * If the internet is not reachable:
 *   - On the first failure, it logs a warning that we’re offline.
 *   - Then it waits for a short delay before trying again.
 *   - With each retry, the wait time increases (exponential backoff), up to a maximum.
 *
 * The loop continues until either:
 *   - The internet comes back, or
 *   - The maximum number of retries is reached, in which case it throws an error.
 */

export async function waitForInternet({
	retryIntervalMs = 2000,
	maxRetries = Infinity,
	backoffFactor = 1.5,
	maxIntervalMs = 60000,
}: {
	retryIntervalMs?: number;
	maxRetries?: number;
	backoffFactor?: number;
	maxIntervalMs?: number;
} = {}): Promise<void> {
	let retries = 0;
	let currentDelay = retryIntervalMs;
	let wasOffline = false;

	while (retries < maxRetries) {
		const internetOk = await checkInternet();

		if (internetOk) {
			if (wasOffline) {
				console.log("✅ Internet connection restored.");
			}
			return;
		}

		if (!wasOffline) {
			console.warn("📴 Internet unavailable. Waiting for reconnection...");
			wasOffline = true;
		}

		await delay(currentDelay);
		currentDelay = Math.min(currentDelay * backoffFactor, maxIntervalMs);
		retries++;
	}

	throw new Error("❌ Failed to reconnect to the internet after multiple attempts.");
}

/**
 * Attempts to resolve multiple known DNS hosts to verify internet connectivity.
 * Returns true if any resolve successfully within the timeout.
 */
export async function checkInternet(): Promise<boolean> {
	for (const host of DNS_CHECK_HOSTS) {
		console.log(`🌐 Checking internet connection via DNS: ${host}`);

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

		try {
			// Wrap dns.resolve in a Promise.race with an AbortSignal-based timeout
			await Promise.race([
				dns.resolve(host),
				new Promise((_, reject) =>
					controller.signal.addEventListener("abort", () => reject(new Error(`Timeout resolving ${host}`)))
				),
			]);

			clearTimeout(timeoutId);
			return true;
		} catch (err) {
			clearTimeout(timeoutId);
			console.warn(`⚠️ DNS resolve failed for ${host}: ${err}`);
			continue;
		}
	}

	return false;
}

function delay(ms: number): Promise<void> {
	return new Promise((res) => setTimeout(res, ms));
}
