// ---- DAEMON SERVICE SCHEDULER ----

import { APP_CONFIG } from "@config/index";
import { pauseForInternet } from "@net/pauseForInternet";
import runScannerTask from "@tasks/runScannerTask";

export function startAppDaemon(intervalMs: number = 5 * 60 * 1000) {
	let isRunning = false;

	async function safeRun() {
		if (isRunning) {
			console.log("⏳ Previous scan still running. Skipping this cycle.");
			return;
		}

		try {
			await pauseForInternet(); // Will block here if disconnected
			isRunning = true;
			await runScannerTask();
		} catch (err) {
			console.error("Daemon error:", err);
		} finally {
			isRunning = false;
		}
	}

	console.log(`📡 Scanner daemon started. Interval: ${intervalMs / 1000} seconds`);
	safeRun();
	setInterval(safeRun, intervalMs);
}

// WIP

// Updated startAppDaemon with failure cap
/**
 * Updated daemon with failure cap.
 * Shuts down after too many consecutive failures.
 */
export default function startAppDaemon_2(intervalMs: number = APP_CONFIG.APP_DAEMON_SAFE_RUN_INTERVAL_MS) {
	let isRunning = false;
	let firstRun = true;
	let consecutiveFailures = 0;

	async function safeRun() {
		if (isRunning) {
			console.log("⏳ Previous scan still running. Skipping this cycle.");
			return; // Prevent overlapping runs
		}

		try {
			await pauseForInternet(); // Wait for network connection

			if (firstRun) {
				console.log("🌐 Internet connection confirmed.");
				firstRun = false; // Only print this on the first successful run
			}

			isRunning = true; // Mark as running

			await runScannerTask();

			consecutiveFailures = 0; // ✅ Reset failure count on success
		} catch (err) {
			consecutiveFailures++;  
			console.error(`❌ Daemon error (${consecutiveFailures} failures):`, err);

			// Shut down after too many consecutive failures
			if (consecutiveFailures >= APP_CONFIG.APP_DAEMON_MAX_ALLOWED_CONSECUTIVE_FAILURES) {
				console.error("🛑 Max consecutive failures reached. Shutting down daemon.");
				process.exit(1); // Hard shutdown (could be replaced with graceful exit)
			}
		} finally {
			isRunning = false; // Always clear running flag
		}
	}

	console.log(`📡 Scanner daemon started. Interval: ${intervalMs / 1000}s`);
	safeRun();                      // Run immediately on start
	setInterval(safeRun, intervalMs); // Schedule recurring runs
}