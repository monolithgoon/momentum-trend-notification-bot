import { APP_CONFIG } from "@config/index";
import startAppDaemon_2 from "./app/daemon";
import gracefulDaemonShutdown from "./app/daemonShutdownHandler";

// ---- index.ts (entry point) ----

(async () => {
	try {
		console.log("🚀 Bootstrapping app...");

		// Start the scanner daemon with configured interval
		setTimeout(() => {
			startAppDaemon_2(APP_CONFIG.APP_DAEMON_SAFE_RUN_INTERVAL_MS);
		}, 0); // async kickoff, non-blocking

		console.log("✅ App fully initialized.");
	} catch (err) {
		console.error("❌ App failed to initialize:", err);
		await gracefulDaemonShutdown(`Too many app daemon failures`);
	}
})();
