import type { ConnectorType, UserRole } from "../types/vehicle.js";

/**
 * Event Types - All possible events in the system
 */
export type EventType =
  // Station Events
  | "station.created"
  | "station.updated"
  | "station.deleted"
  | "station.statusChanged"
  | "station.portAdded"
  | "station.portRemoved"
  // Occupancy Events
  | "occupancy.updated"
  | "occupancy.incremented"
  | "occupancy.decremented"
  | "occupancy.full"
  | "occupancy.available"
  // User Events
  | "user.registered"
  | "user.loggedIn"
  | "user.updated"
  | "user.deactivated"
  | "user.passwordChanged"
  // Vehicle Profile Events
  | "vehicleProfile.added"
  | "vehicleProfile.removed"
  // Favorite Events
  | "favorite.added"
  | "favorite.removed"
  // Recommendation Events
  | "recommendation.requested"
  | "recommendation.completed"
  | "recommendation.emergency"
  // System Events
  | "system.error"
  | "system.startup"
  | "system.shutdown"
  // Wildcard for monitoring
  | "*";

/**
 * Base Event Interface
 */
export interface BaseEvent {
  type: EventType;
  timestamp: Date;
  correlationId?: string; // For tracing related events
  userId?: string; // User who triggered the event
}

/**
 * Station Events
 */
export interface StationCreatedEvent extends BaseEvent {
  type: "station.created";
  payload: {
    stationId: string;
    operatorId: string;
    name: string;
    location: { longitude: number; latitude: number };
    portCount: number;
  };
}

export interface StationUpdatedEvent extends BaseEvent {
  type: "station.updated";
  payload: {
    stationId: string;
    changes: Record<string, unknown>;
  };
}

export interface StationDeletedEvent extends BaseEvent {
  type: "station.deleted";
  payload: {
    stationId: string;
    operatorId: string;
  };
}

export interface StationStatusChangedEvent extends BaseEvent {
  type: "station.statusChanged";
  payload: {
    stationId: string;
    oldStatus: "active" | "inactive";
    newStatus: "active" | "inactive";
  };
}

export interface StationPortAddedEvent extends BaseEvent {
  type: "station.portAdded";
  payload: {
    stationId: string;
    connectorType: ConnectorType;
    vehicleType: "bike" | "car";
    powerKW: number;
  };
}

export interface StationPortRemovedEvent extends BaseEvent {
  type: "station.portRemoved";
  payload: {
    stationId: string;
    connectorType: ConnectorType;
    vehicleType: "bike" | "car";
  };
}

/**
 * Occupancy Events
 */
export interface OccupancyUpdatedEvent extends BaseEvent {
  type: "occupancy.updated";
  payload: {
    stationId: string;
    connectorType: ConnectorType;
    occupied: number;
    total: number;
  };
}

export interface OccupancyIncrementedEvent extends BaseEvent {
  type: "occupancy.incremented";
  payload: {
    stationId: string;
    connectorType: ConnectorType;
    occupied: number;
    total: number;
  };
}

export interface OccupancyDecrementedEvent extends BaseEvent {
  type: "occupancy.decremented";
  payload: {
    stationId: string;
    connectorType: ConnectorType;
    occupied: number;
    total: number;
  };
}

export interface OccupancyFullEvent extends BaseEvent {
  type: "occupancy.full";
  payload: {
    stationId: string;
    connectorType: ConnectorType;
  };
}

export interface OccupancyAvailableEvent extends BaseEvent {
  type: "occupancy.available";
  payload: {
    stationId: string;
    connectorType: ConnectorType;
    freeSlots: number;
  };
}

/**
 * User Events
 */
export interface UserRegisteredEvent extends BaseEvent {
  type: "user.registered";
  payload: {
    userId: string;
    email: string;
    role: UserRole;
    name: string;
  };
}

export interface UserLoggedInEvent extends BaseEvent {
  type: "user.loggedIn";
  payload: {
    userId: string;
    email: string;
    role: UserRole;
    ip?: string;
  };
}

export interface UserUpdatedEvent extends BaseEvent {
  type: "user.updated";
  payload: {
    userId: string;
    changes: string[]; // Field names that changed
  };
}

export interface UserDeactivatedEvent extends BaseEvent {
  type: "user.deactivated";
  payload: {
    userId: string;
    deactivatedBy: string;
    reason?: string;
  };
}

export interface UserPasswordChangedEvent extends BaseEvent {
  type: "user.passwordChanged";
  payload: {
    userId: string;
  };
}

/**
 * Vehicle Profile Events
 */
export interface VehicleProfileAddedEvent extends BaseEvent {
  type: "vehicleProfile.added";
  payload: {
    userId: string;
    profileId: string;
    vehicleType: "bike" | "car";
  };
}

export interface VehicleProfileRemovedEvent extends BaseEvent {
  type: "vehicleProfile.removed";
  payload: {
    userId: string;
    profileId: string;
  };
}

/**
 * Favorite Events
 */
export interface FavoriteAddedEvent extends BaseEvent {
  type: "favorite.added";
  payload: {
    userId: string;
    stationId: string;
  };
}

export interface FavoriteRemovedEvent extends BaseEvent {
  type: "favorite.removed";
  payload: {
    userId: string;
    stationId: string;
  };
}

/**
 * Recommendation Events
 */
export interface RecommendationRequestedEvent extends BaseEvent {
  type: "recommendation.requested";
  payload: {
    vehicleType: "bike" | "car";
    location: { longitude: number; latitude: number };
    batteryPercent: number;
    limit: number;
  };
}

export interface RecommendationCompletedEvent extends BaseEvent {
  type: "recommendation.completed";
  payload: {
    vehicleType: "bike" | "car";
    resultCount: number;
    topStationId?: string;
    processingTimeMs: number;
  };
}

export interface RecommendationEmergencyEvent extends BaseEvent {
  type: "recommendation.emergency";
  payload: {
    vehicleType: "bike" | "car";
    location: { longitude: number; latitude: number };
    batteryPercent: number;
    reachableDistance: number;
  };
}

/**
 * System Events
 */
export interface SystemErrorEvent extends BaseEvent {
  type: "system.error";
  payload: {
    error: string;
    stack?: string;
    context?: Record<string, unknown>;
  };
}

export interface SystemStartupEvent extends BaseEvent {
  type: "system.startup";
  payload: {
    environment: string;
    version: string;
    port: number;
  };
}

export interface SystemShutdownEvent extends BaseEvent {
  type: "system.shutdown";
  payload: {
    reason: string;
    uptime: number;
  };
}

/**
 * Union type of all events
 */
export type AppEvent =
  | StationCreatedEvent
  | StationUpdatedEvent
  | StationDeletedEvent
  | StationStatusChangedEvent
  | StationPortAddedEvent
  | StationPortRemovedEvent
  | OccupancyUpdatedEvent
  | OccupancyIncrementedEvent
  | OccupancyDecrementedEvent
  | OccupancyFullEvent
  | OccupancyAvailableEvent
  | UserRegisteredEvent
  | UserLoggedInEvent
  | UserUpdatedEvent
  | UserDeactivatedEvent
  | UserPasswordChangedEvent
  | VehicleProfileAddedEvent
  | VehicleProfileRemovedEvent
  | FavoriteAddedEvent
  | FavoriteRemovedEvent
  | RecommendationRequestedEvent
  | RecommendationCompletedEvent
  | RecommendationEmergencyEvent
  | SystemErrorEvent
  | SystemStartupEvent
  | SystemShutdownEvent;

/**
 * Event handler type
 */
export type EventHandler<T extends AppEvent> = (
  event: T,
) => void | Promise<void>;

/**
 * Helper to create events with timestamp
 */
export function createEvent<T extends AppEvent>(
  type: T["type"],
  payload: T["payload"],
  options?: { correlationId?: string; userId?: string },
): T {
  return {
    type,
    payload,
    timestamp: new Date(),
    ...options,
  } as T;
}
