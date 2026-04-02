import { API_BASE_URL, NOMINATIM_CONFIG } from "@/constants";
import type {
  NearbyStationsResponse,
  NominatimResult,
  RouteRecommendationRequest,
  RouteRecommendationResponse,
} from "@/types";

// Route to station response type
export interface RouteToStationResponse {
  status: string;
  data: {
    stationId: string;
    stationName: string;
    stationAddress: string;
    stationLocation: {
      longitude: number;
      latitude: number;
    };
    route: {
      polyline: [number, number][];
      totalDistanceKm: number;
      totalDurationMinutes: number;
    };
    ports: Array<{
      connectorType: string;
      vehicleType: string;
      powerKW: number;
      total: number;
      occupied: number;
      pricePerKWh: number;
    }>;
    operatingHours?: {
      type: "24/7" | "custom";
      openTime?: string;
      closeTime?: string;
    };
    images?: string[];
  };
}

export const api = {
  /**
   * Fetch nearby stations
   */
  async getNearbyStations(
    longitude: number,
    latitude: number,
    radius: number = 5,
  ): Promise<NearbyStationsResponse> {
    const params = new URLSearchParams({
      longitude: longitude.toString(),
      latitude: latitude.toString(),
      radius: radius.toString(),
    });

    const response = await fetch(
      `${API_BASE_URL}/recommendations/nearby?${params}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch nearby stations: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Get route-aware recommendations
   */
  async getRouteRecommendations(
    request: RouteRecommendationRequest,
  ): Promise<RouteRecommendationResponse> {
    const batteryPercent = request.vehicleProfile.batteryPercent;
    console.log(batteryPercent);
    console.log(
      `${API_BASE_URL}/recommendations/${batteryPercent < 15 ? "emergency" : "route"}`,
    );
    const response = await fetch(
      `${API_BASE_URL}/recommendations/${batteryPercent < 15 ? "emergency" : "route"}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get recommendations: ${error}`);
    }

    return response.json();
  },

  /**
   * Get route to a specific station for navigation
   */
  async getRouteToStation(
    stationId: string,
    longitude: number,
    latitude: number,
  ): Promise<RouteToStationResponse> {
    const params = new URLSearchParams({
      longitude: longitude.toString(),
      latitude: latitude.toString(),
    });

    const response = await fetch(
      `${API_BASE_URL}/stations/${stationId}/route?${params}`,
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get route to station: ${error}`);
    }

    return response.json();
  },

  /**
   * Search places using Nominatim (OpenStreetMap)
   */
  async searchPlaces(query: string): Promise<NominatimResult[]> {
    if (!query || query.length < 3) return [];

    const params = new URLSearchParams({
      q: query,
      format: NOMINATIM_CONFIG.defaultFormat,
      limit: String(NOMINATIM_CONFIG.defaultLimit),
      countrycodes: NOMINATIM_CONFIG.defaultCountryCodes,
    });

    const response = await fetch(`${NOMINATIM_CONFIG.baseUrl}?${params}`, {
      headers: {
        "User-Agent": "EVChargingApp/1.0",
      },
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  },
};

export default api;
