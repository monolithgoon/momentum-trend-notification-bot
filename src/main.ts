import { APP_CONFIG_2 } from "./config_2/app_config";
import { registerAllListeners } from "./listeners/registerListeners";
import gracefulDaemonShutdown from "./app/daemonShutdownHandler";
import startMainDaemon from "./app/daemon.updated";

// Main entry point for bootstrapping the application
export async function bootstrapApp(): Promise<void> {
  try {
    console.log("🚀 Bootstrapping app...");

    // Step 1: Register all event listeners
    await setupListeners();

    // Step 2: Start the main daemon process (non-blocking)
    launchAppDaemonNonBlocking();

    console.log("✅ App fully initialized.");
  } catch (err) {
    console.error("❌ App failed to initialize:", err);
    // Step 3: Gracefully shut down the daemon on failure
    await gracefulDaemonShutdown("Too many app daemon failures");
  }
}

// Registers all listeners required for the app
async function setupListeners(): Promise<void> {
  registerAllListeners();
  // await verifyRedisConnection(); // optionally restore later
}

/**
 * 🚦 Launch the daemon after the current event loop tick.
 *
 * Using `setTimeout(..., 0)` defers execution of the daemon until after
 * the rest of the synchronous app bootstrap completes. This ensures:
 *
 * - The app doesn't block on I/O-heavy tasks like verifying internet,
 *   scanning, or connecting to Redis.
 * - Logging and listener registration finish first for better visibility.
 * - Your `main.ts` can safely say "App initialized" before long async tasks begin.
 *
 * This is especially useful in CLI apps, daemons, or background workers
 * where startup speed and sequencing matter.
 */

function launchAppDaemonNonBlocking(): void {
  setTimeout(() => {
    startMainDaemon(APP_CONFIG_2.daemon.safeRunInterval);
  }, 0);
}