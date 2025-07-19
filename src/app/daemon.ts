// ---- DAEMON SERVICE SCHEDULER ----

import { APP_CONFIG } from "@config/index";
import { pauseForInternet } from "@net/pauseForInternet";
import runProgram from "../program";

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
			await runProgram();
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

// ---- START DAEMON ----

startAppDaemon(APP_CONFIG.SCAN_DAEMON_INTERVAL_MS); // Every 1 minute

// WIP

// Updated startAppDaemon with failure cap
export default function startAppDaemon_2(intervalMs: number = APP_CONFIG.SCAN_DAEMON_INTERVAL_MS) {
	let isRunning = false;
	let firstRun = true;
	let consecutiveFailures = 0;
	const MAX_CONSECUTIVE_FAILURES = 5; // TODO - MOVE TO APP_CONFIG

	async function safeRun() {
		if (isRunning) {
			console.log("⏳ Previous scan still running. Skipping.");
			return;
		}

		try {
			await pauseForInternet(); // Will block here if disconnected

			if (firstRun) {
				console.log("🌐 Internet connection confirmed.");
				firstRun = false;
			}

			isRunning = true;

			await runProgram();

			consecutiveFailures = 0; // ✅ Reset on success
		} catch (err) {
			consecutiveFailures++;
			console.error(`❌ Daemon error (${consecutiveFailures} failures):`, err);

			if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
				console.error("🛑 Max consecutive failures reached. Shutting down daemon.");
				process.exit(1); // hard kill – you could replace with emit / graceful shutdown
			}
		} finally {
			isRunning = false;
		}
	}

	console.log(`📡 Scanner daemon started. Interval: ${intervalMs / 1000}s`);
	safeRun();
	setInterval(safeRun, intervalMs);
}
