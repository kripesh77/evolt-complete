/**
 * ============================================================================
 * EVENT HANDLERS - User Service
 * ============================================================================
 *
 * LEARNING POINT: Event-Driven Architecture
 *
 * When Auth Service publishes 'user.registered' event,
 * User Service subscribes to it and creates a user profile.
 *
 * This is LOOSE COUPLING:
 * - Auth Service doesn't need to know about User Service
 * - Auth Service just publishes an event
 * - User Service listens and acts accordingly
 *
 * Benefits:
 * - Services don't depend on each other directly
 * - Can add new listeners without changing publishers
 * - More resilient (if User Service is down, event can be queued)
 *
 * ============================================================================
 */

const UserProfile = require("../models/UserProfile");
const { eventBus, EVENT_TYPES } = require("../../../shared/event-bus");

/**
 * Handle incoming events
 */
async function handleEvent(event) {
  switch (event.type) {
    case EVENT_TYPES.USER_REGISTERED:
      await handleUserRegistered(event.payload);
      break;
    default:
      console.log(`[User] Unknown event type: ${event.type}`);
  }
}

/**
 * Handle user.registered event
 * Creates a user profile when a new user registers
 */
async function handleUserRegistered(payload) {
  try {
    const { userId, email, name, role, company } = payload;

    console.log(`📝 [User] Creating profile for new user: ${email}`);

    // Create profile (or find existing)
    const profile = await UserProfile.findOrCreate({
      userId,
      email,
      name,
      role,
      company,
    });

    console.log(`✅ [User] Profile created for: ${email}`);
  } catch (error) {
    console.error("❌ [User] Failed to create profile:", error.message);
  }
}

/**
 * Setup event handlers
 */
function setupEventHandlers() {
  // Subscribe to user.registered events
  eventBus.subscribe(EVENT_TYPES.USER_REGISTERED, async (event) => {
    await handleUserRegistered(event.payload);
  });

  console.log("📡 [User] Event handlers setup complete");
}

module.exports = {
  setupEventHandlers,
  handleEvent,
  handleUserRegistered,
};
