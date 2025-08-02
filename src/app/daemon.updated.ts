// ---- DAEMON SERVICE SCHEDULER ----

import { APP_CONFIG_2 } from "src/config_2/app_config";
import { pauseForInternet } from "@net/pauseForInternet";
import { runLiveMarketScannerTask_3 } from "@tasks/runLiveMarketScannerTask_3";
// import { flushLogsAndMetrics } from "@infrastructure/telemetry"; // hypothetical
import { onAppStart, onAppReady, onAppShutdown } from "@infrastructure/lifecycle/daemonLifecycleHooks"; // lifecycle hooks
import { FileStorageHealthChecker } from "@infrastructure/storage/FileStorageHealthChecker";

let isRunning = false;
let firstRun = true;
let numDaemonStartFailures = 0; // Track daemon run consecutive failures
let intervalRef: NodeJS.Timeout | undefined;

export default function startAppDaemon(intervalMs: number = APP_CONFIG_2.daemon.safeRunInterval) {
	intervalRef = setInterval(runDaemonCycleSafely, intervalMs); // Schedule the daemon
	onAppStart(`📟 Market scanner daemon started. Interval: ${intervalMs / 1000}s`);

	process.on("SIGINT", gracefulShutdown);
	process.on("SIGTERM", gracefulShutdown);
}

/**
 * Safely executes the main daemon cycle, ensuring only one instance runs at a time.
 *
 * - Prevents overlapping executions by checking and setting the `isRunning` flag.
 * - Verifies internet connectivity and file storage write access before proceeding.
 * - On the first run, logs readiness and triggers the `onAppReady` callback.
 * - Executes the main market scanner task and resets failure count on success.
 * - Handles errors by incrementing a failure counter and logs errors.
 * - Initiates a graceful shutdown if consecutive failures exceed the configured maximum.
 * - Always resets the `isRunning` flag after execution, regardless of outcome.
 */

async function runDaemonCycleSafely() {
	if (isRunning) {
		console.log("⏳ Previous scan still running. Skipping this cycle.");
		return;
	}

	// Mark as running to prevent overlapping scans
	isRunning = true;
	try {
		await pauseForInternet();
		await new FileStorageHealthChecker().verifyWriteAccess(); // fail fast before main market scan task

		if (firstRun) {
			console.log("🌐 Internet + Redis connection confirmed.");
			onAppReady("✅ Daemon ready");
			firstRun = false;
		}

    // 🟢 Run the main market scanner task
		await runLiveMarketScannerTask_3();

		numDaemonStartFailures = 0;
	} catch (err) {
		numDaemonStartFailures++;
		console.error(`❌ Daemon error (${numDaemonStartFailures} failures):`, err);

		if (numDaemonStartFailures >= APP_CONFIG_2.daemon.maxFailures) {
			await gracefulShutdown(`Too many failures (${numDaemonStartFailures})`);
		}
	} finally {
		isRunning = false;
	}
}

async function gracefulShutdown(reason = "Shutdown signal received") {
	console.log("🛑 Gracefully shutting down daemon...", { reason });
	onAppShutdown(reason);

	if (intervalRef) clearInterval(intervalRef);

	try {
		// await flushLogsAndMetrics(); // optional hook
	} finally {
		process.exit(0);
	}
}
