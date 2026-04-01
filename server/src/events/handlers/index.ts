/**
 * Event Handler Registration Index
 *
 * This file registers all event handlers on application startup.
 * Import and call initializeEventHandlers() in your app.ts or server.ts
 */

import { registerStationHandlers } from "./station.handler.js";
import { registerOccupancyHandlers } from "./occupancy.handler.js";
import { registerUserHandlers } from "./user.handler.js";
import { registerSystemHandlers } from "./system.handler.js";

let initialized = false;

/**
 * Initialize all event handlers
 * Should be called once during application startup
 */
export function initializeEventHandlers(): void {
  if (initialized) {
    console.warn("[EventBus] Event handlers already initialized");
    return;
  }

  registerStationHandlers();
  registerOccupancyHandlers();
  registerUserHandlers();
  registerSystemHandlers();

  initialized = true;
  console.log("[EventBus] All event handlers initialized");
}

/**
 * Re-export individual registration functions for testing
 */
export {
  registerStationHandlers,
  registerOccupancyHandlers,
  registerUserHandlers,
  registerSystemHandlers,
};
