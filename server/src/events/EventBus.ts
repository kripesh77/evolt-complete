import { EventEmitter } from "events";
import type { AppEvent, EventHandler, EventType } from "./types.js";

/**
 * Singleton Event Bus for application-wide event handling
 * Implements a publish-subscribe pattern for loose coupling
 */
class EventBus extends EventEmitter {
  private static instance: EventBus;
  private handlers: Map<EventType, Set<EventHandler<AppEvent>>> = new Map();

  private constructor() {
    super();
    // Increase max listeners for scalability
    this.setMaxListeners(100);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Publish an event
   */
  publish<T extends AppEvent>(event: T): void {
    const eventWithTimestamp = {
      ...event,
      timestamp: event.timestamp || new Date(),
    };

    // Emit for both specific type and wildcard listeners
    this.emit(event.type, eventWithTimestamp);
    this.emit("*", eventWithTimestamp);

    // Log in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[EventBus] Published: ${event.type}`, {
        payload: event.payload,
      });
    }
  }

  /**
   * Subscribe to an event type
   */
  subscribe<T extends AppEvent>(
    eventType: T["type"],
    handler: EventHandler<T>,
  ): () => void {
    const wrappedHandler = (event: T) => {
      try {
        handler(event);
      } catch (error) {
        console.error(`[EventBus] Handler error for ${eventType}:`, error);
        this.emit("error", { eventType, error });
      }
    };

    this.on(eventType, wrappedHandler);

    // Track handlers for cleanup
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(wrappedHandler as EventHandler<AppEvent>);

    // Return unsubscribe function
    return () => {
      this.off(eventType, wrappedHandler);
      this.handlers
        .get(eventType)
        ?.delete(wrappedHandler as EventHandler<AppEvent>);
    };
  }

  /**
   * Subscribe to all events (for logging/monitoring)
   * The wildcard "*" receives all events
   */
  subscribeAll(handler: EventHandler<AppEvent>): () => void {
    // Use internal listener that receives all events
    const wrappedHandler = (event: AppEvent) => {
      handler(event);
    };

    // Store in handlers map
    if (!this.handlers.has("*")) {
      this.handlers.set("*", new Set());
    }
    this.handlers.get("*")!.add(wrappedHandler as EventHandler<AppEvent>);

    // Listen to all emitter events
    const listener = (event: AppEvent) => wrappedHandler(event);
    this.on("*", listener);

    return () => {
      this.off("*", listener);
      this.handlers.get("*")?.delete(wrappedHandler as EventHandler<AppEvent>);
    };
  }

  /**
   * Async publish - waits for all handlers to complete
   */
  async publishAsync<T extends AppEvent>(event: T): Promise<void> {
    const eventWithTimestamp = {
      ...event,
      timestamp: event.timestamp || new Date(),
    };

    const listeners = this.listeners(event.type) as EventHandler<T>[];

    await Promise.all(
      listeners.map(async (listener) => {
        try {
          await listener(eventWithTimestamp);
        } catch (error) {
          console.error(
            `[EventBus] Async handler error for ${event.type}:`,
            error,
          );
        }
      }),
    );
  }

  /**
   * Get subscriber count for an event type
   */
  getSubscriberCount(eventType: EventType): number {
    return this.listenerCount(eventType);
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clearAll(): void {
    this.removeAllListeners();
    this.handlers.clear();
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();
export default eventBus;
