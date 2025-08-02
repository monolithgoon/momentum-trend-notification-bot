// ---- DAEMON SERVICE SCHEDULER ----

import { APP_CONFIG_2 } from "src/config_2/app_config";
import { pauseForInternet } from "@net/pauseForInternet";
import { runLiveMarketScannerTask_3 } from "@tasks/runLiveMarketScannerTask_3";

/**
 * Starts the app daemon with a failure cap.
 * Shuts down after too many consecutive failures.
 */
export default function startAppDaemon_2(
	intervalMs: number = APP_CONFIG_2.daemon.safeRunInterval
) {
	let isRunning = false;
	let firstRun = true;
	let consecutiveFailures = 0;

	async function safeRun() {
		if (isRunning) {
			console.log("⏳ Previous scan still running. Skipping this cycle.");
			return;
		}

		isRunning = true;
		try {
			await pauseForInternet();

			if (firstRun) {
				console.log("🌐 Internet connection confirmed.");
				firstRun = false;
			}

			await runLiveMarketScannerTask_3();
			consecutiveFailures = 0;
		} catch (err) {
			consecutiveFailures++;
			console.error(`❌ Daemon error (${consecutiveFailures} failures):`, err);

			if (consecutiveFailures >= APP_CONFIG_2.daemon.maxFailures) {
				console.error("🛑 Max consecutive failures reached. Shutting down daemon.");
				process.exit(1);
			}
		} finally {
			isRunning = false;
		}
	}

	console.log(`📡 Scanner daemon started. Interval: ${intervalMs / 1000}s`);
	safeRun();
	setInterval(safeRun, intervalMs);
}

// export function startAppDaemon(intervalMs: number = 5 * 60 * 1000) {
// 	let isRunning = false;

// 	async function safeRun() {
// 		if (isRunning) {
// 			console.log("⏳ Previous scan still running. Skipping this cycle.");
// 			return;
// 		}

// 		try {
// 			await pauseForInternet(); // Will block here if disconnected
// 			isRunning = true;
// 			await runLiveMarketScannerTask();
// 		} catch (err) {
// 			console.error("Daemon error:", err);
// 		} finally {
// 			isRunning = false;
// 		}
// 	}

// 	console.log(`📡 Scanner daemon started. Interval: ${intervalMs / 1000} seconds`);
// 	safeRun();
// 	setInterval(safeRun, intervalMs);
// }

/**
 * Updated startAppDaemon with failure cap.
 * Shuts down after too many consecutive failures.
 */
