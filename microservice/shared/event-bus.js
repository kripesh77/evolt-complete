/**
 * ============================================================================
 * EVENT BUS - Inter-Service Communication
 * ============================================================================
 *
 * LEARNING POINT: Inter-Service Communication
 *
 * In microservices, services need to communicate. There are two main patterns:
 *
 * 1. SYNCHRONOUS (Request-Response):
 *    - Service A calls Service B and waits for response
 *    - Simple but creates tight coupling
 *    - If Service B is down, Service A fails
 *
 * 2. ASYNCHRONOUS (Event-Driven):
 *    - Service A publishes an event
 *    - Service B subscribes and handles it later
 *    - Loose coupling - services don't need to know about each other
 *    - More resilient - can queue messages if a service is down
 *
 * This Event Bus is a SIMPLE implementation for learning.
 * In production, you'd use:
 * - RabbitMQ
 * - Apache Kafka
 * - Redis Pub/Sub
 * - AWS SNS/SQS
 *
 * ============================================================================
 */

const EventEmitter = require("events");
const axios = require("axios");
const { SERVICE_URLS, EVENT_TYPES } = require("./constants");

/**
 * Simple Event Bus for inter-service communication
 *
 * This implementation uses:
 * 1. Local EventEmitter for events within the same process
 * 2. HTTP webhooks to notify other services (for cross-process events)
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners for scalability
    this.setMaxListeners(100);

    // Store subscribed services (for HTTP-based event delivery)
    // In production, this would be stored in Redis or a database
    this.subscribers = new Map();

    // Store event history (useful for debugging)
    this.eventHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Publish an event
   *
   * @param {string} eventType - The type of event (from EVENT_TYPES)
   * @param {object} payload - The event data
   * @param {object} metadata - Additional info (userId, timestamp, etc.)
   *
   * EXAMPLE:
   * eventBus.publish('user.registered', { userId: '123', email: 'test@test.com' });
   */
  publish(eventType, payload, metadata = {}) {
    const event = {
      type: eventType,
      payload,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        eventId: this._generateEventId(),
      },
    };

    // Store in history
    this._addToHistory(event);

    // Emit locally (for handlers in the same process)
    this.emit(eventType, event);
    this.emit("*", event); // Wildcard for logging all events

    // Log in development
    if (process.env.NODE_ENV !== "production") {
      console.log(`📤 [EventBus] Published: ${eventType}`, { payload });
    }

    // Notify HTTP subscribers (other services)
    this._notifyHttpSubscribers(event);

    return event;
  }

  /**
   * Subscribe to an event type
   *
   * @param {string} eventType - The type of event to listen for
   * @param {function} handler - Function to call when event is received
   * @returns {function} - Unsubscribe function
   *
   * EXAMPLE:
   * const unsubscribe = eventBus.subscribe('user.registered', (event) => {
   *   console.log('New user:', event.payload.userId);
   * });
   *
   * // Later, to stop listening:
   * unsubscribe();
   */
  subscribe(eventType, handler) {
    const wrappedHandler = (event) => {
      try {
        handler(event);
      } catch (error) {
        console.error(`❌ [EventBus] Handler error for ${eventType}:`, error);
      }
    };

    this.on(eventType, wrappedHandler);

    if (process.env.NODE_ENV !== "production") {
      console.log(`📥 [EventBus] Subscribed to: ${eventType}`);
    }

    // Return unsubscribe function
    return () => {
      this.off(eventType, wrappedHandler);
    };
  }

  /**
   * Subscribe to ALL events (useful for logging/monitoring)
   */
  subscribeAll(handler) {
    return this.subscribe("*", handler);
  }

  /**
   * Register an HTTP endpoint to receive events
   * This allows other services (in different processes) to receive events
   *
   * @param {string} eventType - Event type to subscribe to
   * @param {string} webhookUrl - URL to POST events to
   *
   * EXAMPLE:
   * // In User Service, register to receive auth events
   * eventBus.registerWebhook('user.registered', 'http://localhost:3002/events');
   */
  registerWebhook(eventType, webhookUrl) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    const urls = this.subscribers.get(eventType);
    if (!urls.includes(webhookUrl)) {
      urls.push(webhookUrl);
      console.log(
        `🔗 [EventBus] Webhook registered: ${eventType} -> ${webhookUrl}`,
      );
    }
  }

  /**
   * Unregister a webhook
   */
  unregisterWebhook(eventType, webhookUrl) {
    if (this.subscribers.has(eventType)) {
      const urls = this.subscribers.get(eventType);
      const index = urls.indexOf(webhookUrl);
      if (index > -1) {
        urls.splice(index, 1);
      }
    }
  }

  /**
   * Get event history (for debugging)
   */
  getHistory(eventType = null, limit = 10) {
    let history = this.eventHistory;

    if (eventType) {
      history = history.filter((e) => e.type === eventType);
    }

    return history.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Generate unique event ID
   */
  _generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add event to history
   */
  _addToHistory(event) {
    this.eventHistory.push(event);

    // Keep history size manageable
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Notify HTTP subscribers about an event
   * This sends HTTP POST requests to registered webhook URLs
   */
  async _notifyHttpSubscribers(event) {
    const urls = this.subscribers.get(event.type) || [];
    const wildcardUrls = this.subscribers.get("*") || [];

    const allUrls = [...new Set([...urls, ...wildcardUrls])];

    for (const url of allUrls) {
      try {
        await axios.post(url, event, {
          timeout: 5000, // 5 second timeout
          headers: {
            "Content-Type": "application/json",
            "X-Event-Type": event.type,
          },
        });
      } catch (error) {
        // Don't fail if a subscriber is down
        // In production, you'd retry or queue the event
        console.warn(`⚠️ [EventBus] Failed to notify ${url}:`, error.message);
      }
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
// We export a singleton so all parts of a service share the same event bus

const eventBus = new EventBus();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a standardized event object
 *
 * @param {string} type - Event type
 * @param {object} payload - Event data
 * @param {object} metadata - Additional metadata
 */
function createEvent(type, payload, metadata = {}) {
  return {
    type,
    payload,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  EventBus,
  eventBus,
  createEvent,
  EVENT_TYPES,
};
