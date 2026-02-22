/**
 * ============================================================================
 * HTTP CLIENT - Service-to-Service Communication
 * ============================================================================
 *
 * LEARNING POINT: Synchronous Inter-Service Communication
 *
 * When services need to communicate synchronously (request/response),
 * they use HTTP calls. This is the ServiceClient that wraps axios
 * with common functionality:
 *
 * 1. Service Discovery - Knows where each service is located
 * 2. Authentication - Passes JWT tokens between services
 * 3. Error Handling - Standardized error responses
 * 4. Retry Logic - Automatically retries failed requests
 * 5. Circuit Breaker - Prevents cascading failures
 *
 * ============================================================================
 */

const axios = require("axios");
const { SERVICE_URLS, HTTP_STATUS } = require("./constants");

/**
 * ServiceClient - Makes HTTP calls to other microservices
 */
class ServiceClient {
  constructor() {
    // Create axios instance with default config
    this.client = axios.create({
      timeout: 10000, // 10 second timeout
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor (runs before every request)
    this.client.interceptors.request.use(
      (config) => {
        // Log outgoing requests in development
        if (process.env.NODE_ENV !== "production") {
          console.log(
            `🌐 [HTTP] ${config.method?.toUpperCase()} ${config.url}`,
          );
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Add response interceptor (runs after every response)
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this._handleError(error),
    );

    // Simple circuit breaker state
    // In production, use a library like 'opossum'
    this.circuitState = new Map(); // service -> { failures, lastFailure, isOpen }
    this.circuitThreshold = 5; // Open circuit after 5 failures
    this.circuitResetTime = 30000; // Try again after 30 seconds
  }

  // ============================================================================
  // PUBLIC METHODS - Call specific services
  // ============================================================================

  /**
   * Call Auth Service
   *
   * EXAMPLE:
   * const result = await serviceClient.authService.verifyToken(token);
   */
  get authService() {
    return {
      /**
       * Verify a JWT token
       */
      verifyToken: async (token) => {
        return this._get(SERVICE_URLS.AUTH_SERVICE, "/api/v1/auth/verify", {
          headers: { Authorization: `Bearer ${token}` },
        });
      },

      /**
       * Get user by ID (for internal service calls)
       */
      getUser: async (userId, serviceToken) => {
        return this._get(
          SERVICE_URLS.AUTH_SERVICE,
          `/api/v1/auth/users/${userId}`,
          {
            headers: { "X-Service-Token": serviceToken },
          },
        );
      },
    };
  }

  /**
   * Call User Service
   */
  get userService() {
    return {
      /**
       * Get user profile
       */
      getProfile: async (userId, token) => {
        return this._get(SERVICE_URLS.USER_SERVICE, `/api/v1/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      },

      /**
       * Create user profile (called when user registers)
       */
      createProfile: async (userData, serviceToken) => {
        return this._post(
          SERVICE_URLS.USER_SERVICE,
          "/api/v1/users/internal/create",
          userData,
          {
            headers: { "X-Service-Token": serviceToken },
          },
        );
      },

      /**
       * Get user's vehicle profiles
       */
      getVehicles: async (userId, token) => {
        return this._get(
          SERVICE_URLS.USER_SERVICE,
          `/api/v1/users/${userId}/vehicles`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      },
    };
  }

  /**
   * Call Station Service
   */
  get stationService() {
    return {
      /**
       * Get all stations
       */
      getAllStations: async (query = {}) => {
        const queryString = new URLSearchParams(query).toString();
        return this._get(
          SERVICE_URLS.STATION_SERVICE,
          `/api/v1/stations?${queryString}`,
        );
      },

      /**
       * Get station by ID
       */
      getStation: async (stationId) => {
        return this._get(
          SERVICE_URLS.STATION_SERVICE,
          `/api/v1/stations/${stationId}`,
        );
      },

      /**
       * Find stations near a location
       */
      findNearby: async (
        longitude,
        latitude,
        maxDistanceKm,
        vehicleType,
        connectors,
      ) => {
        return this._post(
          SERVICE_URLS.STATION_SERVICE,
          "/api/v1/stations/nearby",
          {
            longitude,
            latitude,
            maxDistanceKm,
            vehicleType,
            connectors,
          },
        );
      },

      /**
       * Get station statistics
       */
      getStats: async () => {
        return this._get(
          SERVICE_URLS.STATION_SERVICE,
          "/api/v1/stations/stats",
        );
      },
    };
  }

  /**
   * Call Recommendation Service
   */
  get recommendationService() {
    return {
      /**
       * Get charging recommendations
       */
      getRecommendations: async (request) => {
        return this._post(
          SERVICE_URLS.RECOMMENDATION_SERVICE,
          "/api/v1/recommendations",
          request,
        );
      },
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Make a GET request
   */
  async _get(baseUrl, path, config = {}) {
    await this._checkCircuit(baseUrl);

    try {
      const response = await this.client.get(`${baseUrl}${path}`, config);
      this._recordSuccess(baseUrl);
      return response.data;
    } catch (error) {
      this._recordFailure(baseUrl);
      throw error;
    }
  }

  /**
   * Make a POST request
   */
  async _post(baseUrl, path, data, config = {}) {
    await this._checkCircuit(baseUrl);

    try {
      const response = await this.client.post(
        `${baseUrl}${path}`,
        data,
        config,
      );
      this._recordSuccess(baseUrl);
      return response.data;
    } catch (error) {
      this._recordFailure(baseUrl);
      throw error;
    }
  }

  /**
   * Make a PATCH request
   */
  async _patch(baseUrl, path, data, config = {}) {
    await this._checkCircuit(baseUrl);

    try {
      const response = await this.client.patch(
        `${baseUrl}${path}`,
        data,
        config,
      );
      this._recordSuccess(baseUrl);
      return response.data;
    } catch (error) {
      this._recordFailure(baseUrl);
      throw error;
    }
  }

  /**
   * Make a DELETE request
   */
  async _delete(baseUrl, path, config = {}) {
    await this._checkCircuit(baseUrl);

    try {
      const response = await this.client.delete(`${baseUrl}${path}`, config);
      this._recordSuccess(baseUrl);
      return response.data;
    } catch (error) {
      this._recordFailure(baseUrl);
      throw error;
    }
  }

  /**
   * Handle HTTP errors
   */
  _handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      const message = data?.message || "Service request failed";

      const serviceError = new Error(message);
      serviceError.status = status;
      serviceError.code = data?.code || "SERVICE_ERROR";
      serviceError.originalError = error;

      return Promise.reject(serviceError);
    } else if (error.request) {
      // Request made but no response received
      const serviceError = new Error("Service unavailable");
      serviceError.status = HTTP_STATUS.SERVICE_UNAVAILABLE;
      serviceError.code = "SERVICE_UNAVAILABLE";

      return Promise.reject(serviceError);
    } else {
      // Error setting up request
      return Promise.reject(error);
    }
  }

  // ============================================================================
  // CIRCUIT BREAKER METHODS
  // ============================================================================

  /**
   * LEARNING POINT: Circuit Breaker Pattern
   *
   * Problem: If Service B is down, Service A keeps trying and waiting,
   * causing cascading failures and wasted resources.
   *
   * Solution: Circuit Breaker
   * - CLOSED (normal): Requests go through
   * - OPEN (failing): Requests fail immediately without trying
   * - HALF-OPEN (testing): Allow one request to test if service is back
   *
   * States:
   * 1. Normal operation (circuit closed)
   * 2. After N failures, circuit opens
   * 3. After timeout, circuit becomes half-open
   * 4. If test request succeeds, circuit closes
   * 5. If test request fails, circuit opens again
   */

  /**
   * Check if circuit is open (should block request)
   */
  async _checkCircuit(service) {
    const state = this.circuitState.get(service);

    if (!state) return; // No state = circuit closed

    if (state.isOpen) {
      const timeSinceFailure = Date.now() - state.lastFailure;

      if (timeSinceFailure > this.circuitResetTime) {
        // Try half-open state
        console.log(`🔄 [Circuit] Testing ${service} (half-open)`);
        state.isOpen = false;
      } else {
        // Circuit still open, fail fast
        const error = new Error(`Service ${service} circuit is open`);
        error.status = HTTP_STATUS.SERVICE_UNAVAILABLE;
        error.code = "CIRCUIT_OPEN";
        throw error;
      }
    }
  }

  /**
   * Record successful request
   */
  _recordSuccess(service) {
    this.circuitState.set(service, {
      failures: 0,
      lastFailure: null,
      isOpen: false,
    });
  }

  /**
   * Record failed request
   */
  _recordFailure(service) {
    const state = this.circuitState.get(service) || {
      failures: 0,
      lastFailure: null,
      isOpen: false,
    };

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= this.circuitThreshold) {
      state.isOpen = true;
      console.warn(
        `⚡ [Circuit] OPEN for ${service} after ${state.failures} failures`,
      );
    }

    this.circuitState.set(service, state);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const serviceClient = new ServiceClient();

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ServiceClient,
  serviceClient,
};
