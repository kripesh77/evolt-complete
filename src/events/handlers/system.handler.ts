/**
 * System Event Handlers
 *
 * Handles system-level events like errors, startup, and shutdown.
 */

import { eventBus } from "../EventBus.js";
import type {
  SystemErrorEvent,
  SystemStartupEvent,
  SystemShutdownEvent,
} from "../types.js";

/**
 * Handle system errors
 */
function handleSystemError(event: SystemErrorEvent): void {
  console.error(`[EVENT] ❌ System Error: ${event.payload.error}`);
  if (event.payload.stack) {
    console.error(event.payload.stack);
  }
  // Future: Send to error tracking service (Sentry, etc.)
  // Future: Alert on-call team for critical errors
  // Future: Log to persistent error store
}

/**
 * Handle system startup
 */
function handleSystemStartup(event: SystemStartupEvent): void {
  console.log(
    `[EVENT] 🚀 System started: ${event.payload.environment} v${event.payload.version} on port ${event.payload.port}`,
  );
  // Future: Notify monitoring service
  // Future: Initialize health check endpoints
  // Future: Warm up caches
}

/**
 * Handle system shutdown
 */
function handleSystemShutdown(event: SystemShutdownEvent): void {
  console.log(`[EVENT] 🛑 System shutting down: ${event.payload.reason}`);
  console.log(`  Uptime: ${Math.round(event.payload.uptime / 1000)}s`);
  // Future: Graceful connection cleanup
  // Future: Flush pending writes
  // Future: Notify monitoring service
}

/**
 * Register all system event handlers
 */
export function registerSystemHandlers(): void {
  eventBus.subscribe("system.error", handleSystemError);
  eventBus.subscribe("system.startup", handleSystemStartup);
  eventBus.subscribe("system.shutdown", handleSystemShutdown);

  console.log("[EventBus] System handlers registered");
}
