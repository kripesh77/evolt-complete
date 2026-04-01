/**
 * Events Module - Main Export
 *
 * This module provides an event-driven architecture for the application.
 *
 * Usage:
 * ```typescript
 * import { eventBus, createEvent, initializeEventHandlers } from './events/index.js';
 *
 * // Initialize handlers on startup
 * initializeEventHandlers();
 *
 * // Publish events from anywhere
 * eventBus.publish(createEvent('station.created', {
 *   stationId: '123',
 *   operatorId: '456',
 *   name: 'New Station',
 *   location: { longitude: 77.5, latitude: 12.9 },
 *   portCount: 4
 * }));
 * ```
 */

// Export the singleton event bus
export { eventBus } from "./EventBus.js";

// Export event types and factory
export { createEvent } from "./types.js";
export type {
  EventType,
  BaseEvent,
  AppEvent,
  EventHandler,
  // Station events
  StationCreatedEvent,
  StationUpdatedEvent,
  StationDeletedEvent,
  StationStatusChangedEvent,
  StationPortAddedEvent,
  StationPortRemovedEvent,
  // Occupancy events
  OccupancyUpdatedEvent,
  OccupancyIncrementedEvent,
  OccupancyDecrementedEvent,
  OccupancyFullEvent,
  OccupancyAvailableEvent,
  // User events
  UserRegisteredEvent,
  UserLoggedInEvent,
  UserUpdatedEvent,
  UserDeactivatedEvent,
  UserPasswordChangedEvent,
  VehicleProfileAddedEvent,
  VehicleProfileRemovedEvent,
  FavoriteAddedEvent,
  FavoriteRemovedEvent,
  // Recommendation events
  RecommendationRequestedEvent,
  RecommendationCompletedEvent,
  RecommendationEmergencyEvent,
  // System events
  SystemErrorEvent,
  SystemStartupEvent,
  SystemShutdownEvent,
} from "./types.js";

// Export handler initialization
export { initializeEventHandlers } from "./handlers/index.js";
