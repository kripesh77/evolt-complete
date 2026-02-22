/**
 * Occupancy Event Handlers
 *
 * Handles side effects when occupancy events occur.
 * Useful for real-time notifications and analytics.
 */

import { eventBus } from "../EventBus.js";
import type {
  OccupancyUpdatedEvent,
  OccupancyIncrementedEvent,
  OccupancyDecrementedEvent,
  OccupancyFullEvent,
  OccupancyAvailableEvent,
} from "../types.js";

/**
 * Handle occupancy updates for analytics
 */
function handleOccupancyUpdated(event: OccupancyUpdatedEvent): void {
  const { stationId, connectorType, occupied, total } = event.payload;
  const percentage = Math.round((occupied / total) * 100);
  console.log(
    `[EVENT] Occupancy updated: Station ${stationId} - ${connectorType}: ${occupied}/${total} (${percentage}%)`,
  );
  // Future: Update real-time dashboard
  // Future: Record for usage analytics
}

/**
 * Handle occupancy increment
 */
function handleOccupancyIncremented(event: OccupancyIncrementedEvent): void {
  console.log(
    `[EVENT] Occupancy incremented: Station ${event.payload.stationId} - ${event.payload.connectorType}`,
  );
  // Future: Track usage patterns
}

/**
 * Handle occupancy decrement
 */
function handleOccupancyDecremented(event: OccupancyDecrementedEvent): void {
  console.log(
    `[EVENT] Occupancy decremented: Station ${event.payload.stationId} - ${event.payload.connectorType}`,
  );
  // Future: Notify waitlisted users
}

/**
 * Handle station becoming full
 * This is a critical event for user notifications
 */
function handleOccupancyFull(event: OccupancyFullEvent): void {
  console.log(
    `[EVENT] ⚠️ Station FULL: ${event.payload.stationId} - ${event.payload.connectorType}`,
  );
  // Future: Send push notifications to approaching users
  // Future: Update map markers in real-time
  // Future: Suggest alternative stations
}

/**
 * Handle station becoming available again
 * Important for users who were waiting
 */
function handleOccupancyAvailable(event: OccupancyAvailableEvent): void {
  console.log(
    `[EVENT] ✅ Station AVAILABLE: ${event.payload.stationId} - ${event.payload.connectorType} (${event.payload.freeSlots} slots)`,
  );
  // Future: Notify users who were waiting
  // Future: Update real-time availability
}

/**
 * Register all occupancy event handlers
 */
export function registerOccupancyHandlers(): void {
  eventBus.subscribe("occupancy.updated", handleOccupancyUpdated);
  eventBus.subscribe("occupancy.incremented", handleOccupancyIncremented);
  eventBus.subscribe("occupancy.decremented", handleOccupancyDecremented);
  eventBus.subscribe("occupancy.full", handleOccupancyFull);
  eventBus.subscribe("occupancy.available", handleOccupancyAvailable);

  console.log("[EventBus] Occupancy handlers registered");
}
