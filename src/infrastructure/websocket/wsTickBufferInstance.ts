import { WebSocketTickerBuffer } from "./WebSocketTickerBuffer";

/**
 * 🧠 Architectural Note:
 *
 * This is a single shared instance of the WebSocketTickerBuffer class.
 * It persists in module scope across incoming WebSocket ticks.
 *
 * ❗ Defining this inside `handleWebSocketTickerUpdate()` would recreate
 * the buffer every tick — preventing accumulation and trend detection.
 *
 * ✅ Why it's module-scoped:
 * - Preserves history of each symbol over time
 * - Enables multi-tick logic (e.g. Keltner Channel breakout analysis)
 * - Avoids unnecessary reinitialization and memory thrashing
 *
 * Treat this as a per-session, per-source buffer.
 * If you introduce multiple sources (e.g. EODHD + Polygon),
 * isolate their buffer instances accordingly.
 */

export const wsTickBuffer = new WebSocketTickerBuffer();
