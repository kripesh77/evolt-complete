/**
 * Station Event Handlers
 *
 * Handles side effects when station events occur.
 * These handlers are decoupled from the controllers that emit events.
 */

import { eventBus } from "../EventBus.js";
import type {
  StationCreatedEvent,
  StationUpdatedEvent,
  StationDeletedEvent,
  StationStatusChangedEvent,
  StationPortAddedEvent,
  StationPortRemovedEvent,
} from "../types.js";

/**
 * Log station creation for analytics
 */
function handleStationCreated(event: StationCreatedEvent): void {
  console.log(
    `[EVENT] Station created: ${event.payload.name} (${event.payload.stationId})`,
  );
  // Future: Send to analytics service
  // Future: Notify admin of new station
  // Future: Index in search engine
}

/**
 * Handle station updates
 */
function handleStationUpdated(event: StationUpdatedEvent): void {
  console.log(
    `[EVENT] Station updated: ${event.payload.stationId}`,
    event.payload.changes,
  );
  // Future: Invalidate cache
  // Future: Update search index
}

/**
 * Handle station deletion
 */
function handleStationDeleted(event: StationDeletedEvent): void {
  console.log(`[EVENT] Station deleted: ${event.payload.stationId}`);
  // Future: Remove from search index
  // Future: Notify users who favorited this station
  // Future: Archive historical data
}

/**
 * Handle station status changes (active/inactive)
 */
function handleStationStatusChanged(event: StationStatusChangedEvent): void {
  console.log(
    `[EVENT] Station status changed: ${event.payload.stationId} ${event.payload.oldStatus} -> ${event.payload.newStatus}`,
  );
  // Future: Notify users with this in favorites
  // Future: Update real-time availability feeds
}

/**
 * Handle new port added to station
 */
function handlePortAdded(event: StationPortAddedEvent): void {
  console.log(
    `[EVENT] Port added to station ${event.payload.stationId}: ${event.payload.connectorType} (${event.payload.powerKW}kW)`,
  );
  // Future: Update station capacity metrics
  // Future: Notify interested users
}

/**
 * Handle port removal from station
 */
function handlePortRemoved(event: StationPortRemovedEvent): void {
  console.log(
    `[EVENT] Port removed from station ${event.payload.stationId}: ${event.payload.connectorType}`,
  );
  // Future: Update station capacity metrics
  // Future: Notify users if their favorite connector type removed
}

/**
 * Register all station event handlers
 */
export function registerStationHandlers(): void {
  eventBus.subscribe("station.created", handleStationCreated);
  eventBus.subscribe("station.updated", handleStationUpdated);
  eventBus.subscribe("station.deleted", handleStationDeleted);
  eventBus.subscribe("station.statusChanged", handleStationStatusChanged);
  eventBus.subscribe("station.portAdded", handlePortAdded);
  eventBus.subscribe("station.portRemoved", handlePortRemoved);

  console.log("[EventBus] Station handlers registered");
}
