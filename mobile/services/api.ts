import { API_BASE_URL, NOMINATIM_CONFIG } from "@/constants";
import type {
  NearbyStationsResponse,
  NominatimResult,
  MyVehicleRequestsResponse,
  RouteRecommendationRequest,
  RouteRecommendationResponse,
  SubmitVehicleRequestPayload,
  SubmitVehicleRequestResponse,
  VehicleSearchResponse,
} from "@/types";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
}

export interface CloudinaryUploadFile {
  uri: string;
  name?: string;
  type?: string;
}

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
   * Search the vehicle catalog by make/model/variant.
   */
  async searchVehicles(
    query: string,
    vehicleType?: "bike" | "car",
  ): Promise<VehicleSearchResponse> {
    const params = new URLSearchParams();

    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (vehicleType) {
      params.set("vehicleType", vehicleType);
    }

    const response = await fetch(`${API_BASE_URL}/vehicles?${params}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to search vehicles: ${error}`);
    }

    return response.json();
  },

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

  async getCloudinaryConfig(): Promise<CloudinaryConfig> {
    const response = await fetch(`${API_BASE_URL}/stations/cloudinary-config`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Cloudinary config: ${error}`);
    }

    const data = await response.json();
    return data.data;
  },

  async uploadImageToCloudinary(
    file: CloudinaryUploadFile,
    cloudinaryConfig: CloudinaryConfig,
  ): Promise<string> {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name ?? "vehicle-request.jpg",
      type: file.type ?? "image/jpeg",
    } as never);
    formData.append("upload_preset", "ev_stations");
    formData.append("folder", "vehicle-requests");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload image to Cloudinary: ${error}`);
    }

    const data = await response.json();
    return data.secure_url as string;
  },

  async getMyVehicleRequests(token: string): Promise<MyVehicleRequestsResponse> {
    const response = await fetch(`${API_BASE_URL}/vehicles/requests`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch your vehicle requests: ${error}`);
    }

    return response.json();
  },

  async submitVehicleRequest(
    token: string,
    payload: SubmitVehicleRequestPayload,
  ): Promise<SubmitVehicleRequestResponse> {
    const response = await fetch(`${API_BASE_URL}/vehicles/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to submit vehicle request: ${error}`);
    }

    return response.json();
  },
};

export default api;
