/**
 * ============================================================================
 * EVENT HANDLERS - Station Service
 * ============================================================================
 */

const { eventBus, EVENT_TYPES } = require("../../../shared/event-bus");

/**
 * Handle incoming events
 */
async function handleEvent(event) {
  switch (event.type) {
    // Handle any events the station service needs to respond to
    default:
      console.log(`[Station] Unhandled event type: ${event.type}`);
  }
}

/**
 * Setup event handlers
 */
function setupEventHandlers() {
  // Station service mostly publishes events, but could subscribe to:
  // - User deleted events (to clean up orphaned stations)
  // - etc.

  console.log("📡 [Station] Event handlers setup complete");
}

module.exports = {
  setupEventHandlers,
  handleEvent,
};
