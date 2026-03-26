import axios, { AxiosInstance, AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import {
  AuthResponse,
  ApiResponse,
  Station,
  User,
  VehicleProfile,
  RecommendedStation,
  RecommendationRequest,
} from "../types";

// Change this to your backend URL
// For Android emulator: http://10.0.2.2:3000
// For iOS simulator: http://localhost:3000
// For physical device: Use your computer's IP address
const API_BASE_URL = "https://0s2djcq5-3000.inc1.devtunnels.ms/api/v1";

// WebSocket URL (base URL without /api/v1)
export const WS_BASE_URL = "https://0s2djcq5-3000.inc1.devtunnels.ms";

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    // Request interceptor to add token
    this.api.interceptors.request.use(
      async (config) => {
        if (!this.token) {
          this.token = await SecureStore.getItemAsync("authToken");
        }
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();
        }
        return Promise.reject(error);
      },
    );
  }

  // Auth Methods
  async setToken(token: string) {
    this.token = token;
    await SecureStore.setItemAsync("authToken", token);
  }

  async clearToken() {
    this.token = null;
    await SecureStore.deleteItemAsync("authToken");
  }

  async getStoredToken(): Promise<string | null> {
    return await SecureStore.getItemAsync("authToken");
  }

  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.api.post("/auth/login", {
      email,
      password,
    });
    const body = response.data;
    console.log("[API] Login response:", JSON.stringify(body, null, 2));
    // Backend returns { status, data: { token, user } }
    const token = body.data?.token ?? body.token;
    const user = body.data?.user ?? body.user;
    if (token) {
      await this.setToken(token);
    }
    return {
      status: body.status ?? "success",
      token,
      data: { user },
    };
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    passwordConfirm: string;
  }): Promise<AuthResponse> {
    const response = await this.api.post("/auth/register", userData);
    const body = response.data;
    console.log("[API] Register response:", JSON.stringify(body, null, 2));
    // Backend returns { status, data: { token, user } }
    const token = body.data?.token ?? body.token;
    const user = body.data?.user ?? body.user;
    if (token) {
      await this.setToken(token);
    }
    return {
      status: body.status ?? "success",
      token,
      data: { user },
    };
  }

  async logout(): Promise<void> {
    try {
      await this.api.post("/auth/logout");
    } catch (error) {
      // Ignore logout errors
    }
    await this.clearToken();
  }

  async getMe(): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.get("/auth/me");
    const body = response.data;
    console.log("[API] getMe response:", JSON.stringify(body, null, 2));
    const user = body.data?.user ?? body.user;
    // Normalize to ApiResponse shape
    return {
      status: body.status ?? "success",
      data: { user },
    };
  }

  // Stations
  async getNearbyStations(
    longitude: number,
    latitude: number,
    maxDistance: number = 50000,
  ): Promise<ApiResponse<{ stations: Station[] }>> {
    // Backend expects radius in km at /recommendations/nearby
    const radiusKm = maxDistance / 1000;
    const response = await this.api.get<ApiResponse<{ stations: Station[] }>>(
      "/recommendations/nearby",
      {
        params: { longitude, latitude, radius: radiusKm },
      },
    );
    return response.data;
  }

  async getStation(id: string): Promise<ApiResponse<{ station: Station }>> {
    const response = await this.api.get<ApiResponse<{ station: Station }>>(
      `/stations/${id}`,
    );
    return response.data;
  }

  async getAllStations(): Promise<ApiResponse<{ stations: Station[] }>> {
    const response =
      await this.api.get<ApiResponse<{ stations: Station[] }>>("/stations");
    return response.data;
  }

  // Recommendations
  async getRecommendations(
    request: RecommendationRequest,
  ): Promise<ApiResponse<{ recommendations: RecommendedStation[] }>> {
    const response = await this.api.post<
      ApiResponse<{ recommendations: RecommendedStation[] }>
    >("/recommendations", request);
    return response.data;
  }

  // User Profile
  async updateProfile(
    data: Partial<User>,
  ): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.patch<ApiResponse<{ user: User }>>(
      "/auth/me",
      data,
    );
    return response.data;
  }

  async updatePassword(
    currentPassword: string,
    newPassword: string,
    newPasswordConfirm: string,
  ): Promise<AuthResponse> {
    const response = await this.api.patch<AuthResponse>("/auth/password", {
      currentPassword,
      newPassword,
      newPasswordConfirm,
    });
    await this.setToken(response.data.token);
    return response.data;
  }

  // Vehicle Profiles
  async addVehicleProfile(
    profile: Omit<VehicleProfile, "_id">,
  ): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.post<ApiResponse<{ user: User }>>(
      "/auth/vehicle-profiles",
      profile,
    );
    return response.data;
  }

  async updateVehicleProfile(
    vehicleId: string,
    profile: Partial<VehicleProfile>,
  ): Promise<ApiResponse<{ user: User }>> {
    // Backend only supports add/remove for vehicle profiles.
    // To "update", delete old and add new.
    await this.api.delete(`/auth/vehicle-profiles/${vehicleId}`);
    const response = await this.api.post<ApiResponse<{ user: User }>>(
      "/auth/vehicle-profiles",
      profile,
    );
    return response.data;
  }

  async deleteVehicleProfile(
    vehicleId: string,
  ): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.delete<ApiResponse<{ user: User }>>(
      `/auth/vehicle-profiles/${vehicleId}`,
    );
    return response.data;
  }

  // Favorites
  async addFavoriteStation(
    stationId: string,
  ): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.post<ApiResponse<{ user: User }>>(
      `/auth/favorites/${stationId}`,
    );
    return response.data;
  }

  async removeFavoriteStation(
    stationId: string,
  ): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.delete<ApiResponse<{ user: User }>>(
      `/auth/favorites/${stationId}`,
    );
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
