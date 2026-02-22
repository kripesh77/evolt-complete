/**
 * ============================================================================
 * EVENT HANDLERS - Auth Service
 * ============================================================================
 *
 * LEARNING POINT: Event Handlers
 *
 * Event handlers respond to events from the event bus.
 * For Auth Service, we might listen for:
 * - Password reset requests
 * - Account deletion requests
 * - etc.
 *
 * Currently, Auth Service mostly PUBLISHES events rather than subscribing.
 *
 * ============================================================================
 */

const { eventBus, EVENT_TYPES } = require("../../../shared/event-bus");

/**
 * Setup event handlers for Auth Service
 */
function setupEventHandlers() {
  // Log all events in this service (useful for debugging)
  if (process.env.NODE_ENV !== "production") {
    eventBus.subscribeAll((event) => {
      console.log(`📬 [Auth] Event received: ${event.type}`);
    });
  }

  // Example: Listen for user deletion request from User Service
  // eventBus.subscribe('user.deleteRequested', async (event) => {
  //   const { userId } = event.payload;
  //   await User.findByIdAndUpdate(userId, { isActive: false });
  //   console.log(`[Auth] User ${userId} deactivated`);
  // });

  console.log("📡 [Auth] Event handlers setup complete");
}

module.exports = {
  setupEventHandlers,
};
