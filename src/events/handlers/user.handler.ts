/**
 * User Event Handlers
 *
 * Handles side effects for user-related events.
 * Useful for notifications, analytics, and security.
 */

import { eventBus } from "../EventBus.js";
import type {
  UserRegisteredEvent,
  UserLoggedInEvent,
  UserUpdatedEvent,
  UserDeactivatedEvent,
  UserPasswordChangedEvent,
  VehicleProfileAddedEvent,
  VehicleProfileRemovedEvent,
  FavoriteAddedEvent,
  FavoriteRemovedEvent,
} from "../types.js";

/**
 * Handle new user registration
 */
function handleUserRegistered(event: UserRegisteredEvent): void {
  const { email, role, name } = event.payload;
  console.log(`[EVENT] User registered: ${name} (${email}) as ${role}`);
  // Future: Send welcome email
  // Future: Track registration analytics
  // Future: Trigger onboarding workflow
}

/**
 * Handle user login
 */
function handleUserLoggedIn(event: UserLoggedInEvent): void {
  console.log(
    `[EVENT] User logged in: ${event.payload.email} (${event.payload.role})`,
  );
  // Future: Log login for security audit
  // Future: Update last login timestamp
  // Future: Check for suspicious login patterns
}

/**
 * Handle user profile updates
 */
function handleUserUpdated(event: UserUpdatedEvent): void {
  console.log(
    `[EVENT] User updated: ${event.payload.userId} - Changed: ${event.payload.changes.join(", ")}`,
  );
  // Future: Invalidate cached user data
  // Future: Track profile completeness
}

/**
 * Handle user deactivation
 */
function handleUserDeactivated(event: UserDeactivatedEvent): void {
  console.log(
    `[EVENT] ⚠️ User deactivated: ${event.payload.userId} by ${event.payload.deactivatedBy}`,
  );
  if (event.payload.reason) {
    console.log(`  Reason: ${event.payload.reason}`);
  }
  // Future: Revoke all active tokens
  // Future: Send notification to user
  // Future: Archive user data
}

/**
 * Handle password change
 */
function handlePasswordChanged(event: UserPasswordChangedEvent): void {
  console.log(`[EVENT] Password changed for user: ${event.payload.userId}`);
  // Future: Send security notification email
  // Future: Invalidate other sessions
  // Future: Log security audit
}

/**
 * Handle vehicle profile added
 */
function handleVehicleProfileAdded(event: VehicleProfileAddedEvent): void {
  console.log(
    `[EVENT] Vehicle profile added for user ${event.payload.userId}: ${event.payload.vehicleType}`,
  );
  // Future: Personalize recommendations
  // Future: Track vehicle type analytics
}

/**
 * Handle vehicle profile removed
 */
function handleVehicleProfileRemoved(event: VehicleProfileRemovedEvent): void {
  console.log(
    `[EVENT] Vehicle profile removed: ${event.payload.profileId} from user ${event.payload.userId}`,
  );
  // Future: Update recommendation cache
}

/**
 * Handle favorite station added
 */
function handleFavoriteAdded(event: FavoriteAddedEvent): void {
  console.log(
    `[EVENT] Favorite added: User ${event.payload.userId} -> Station ${event.payload.stationId}`,
  );
  // Future: Track popular stations
  // Future: Enable push notifications for this station
}

/**
 * Handle favorite station removed
 */
function handleFavoriteRemoved(event: FavoriteRemovedEvent): void {
  console.log(
    `[EVENT] Favorite removed: User ${event.payload.userId} -> Station ${event.payload.stationId}`,
  );
  // Future: Update popular stations metrics
}

/**
 * Register all user event handlers
 */
export function registerUserHandlers(): void {
  eventBus.subscribe("user.registered", handleUserRegistered);
  eventBus.subscribe("user.loggedIn", handleUserLoggedIn);
  eventBus.subscribe("user.updated", handleUserUpdated);
  eventBus.subscribe("user.deactivated", handleUserDeactivated);
  eventBus.subscribe("user.passwordChanged", handlePasswordChanged);
  eventBus.subscribe("vehicleProfile.added", handleVehicleProfileAdded);
  eventBus.subscribe("vehicleProfile.removed", handleVehicleProfileRemoved);
  eventBus.subscribe("favorite.added", handleFavoriteAdded);
  eventBus.subscribe("favorite.removed", handleFavoriteRemoved);

  console.log("[EventBus] User handlers registered");
}
