import {
  AuthResponse,
  ApiResponse,
  Station,
  User,
  Vehicle,
  VehicleRequest,
  CreateStationDTO,
  UpdateStationDTO,
  CreateVehicleDTO,
  ConnectorType,
  Port,
  OccupancyUpdateDTO,
  VehicleRequestStatus,
} from "@/types";

const API_BASE_URL = "https://evolt-7i1j.onrender.com/api/v1";

class ApiService {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("authToken");
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    let token: string | null = this.token;
    if (typeof window !== "undefined") {
      token = localStorage.getItem("authToken") || token;
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
      const error = await response
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `HTTP error ${response.status}`);
    }
    return response.json();
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("authToken", token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    }
  }

  getStoredToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("authToken");
    }
    return this.token;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await this.handleResponse<AuthResponse>(response);

    if (data.data.user.role !== "admin") {
      throw new Error("Access denied. This portal is for administrators only.");
    }

    this.setToken(data.data.token);
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(data.data.user));
    }
    return data;
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: this.getHeaders(),
      });
    } catch {
      // ignore
    }
    this.clearToken();
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getHeaders(),
    });
    const data =
      await this.handleResponse<ApiResponse<{ user: User }>>(response);
    return data.data.user;
  }

  // Users
  async getUsers(params?: {
    role?: string;
    isActive?: boolean;
  }): Promise<User[]> {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.append("role", params.role);
    if (params?.isActive !== undefined)
      searchParams.append("isActive", String(params.isActive));

    const url = `${API_BASE_URL}/auth/users${searchParams.toString() ? `?${searchParams}` : ""}`;
    const response = await fetch(url, { headers: this.getHeaders() });
    const data =
      await this.handleResponse<ApiResponse<{ users: User[] }>>(response);
    return data.data.users;
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/users/${id}/status`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify({ isActive }),
    });
    const data =
      await this.handleResponse<ApiResponse<{ user: User }>>(response);
    return data.data.user;
  }

  // Stations
  async getAllStations(params?: { status?: string }): Promise<Station[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);

    const url = `${API_BASE_URL}/stations${searchParams.toString() ? `?${searchParams}` : ""}`;
    const response = await fetch(url, { headers: this.getHeaders() });
    const data =
      await this.handleResponse<ApiResponse<{ stations: Station[] }>>(response);
    return data.data.stations;
  }

  async getStation(id: string): Promise<Station> {
    const response = await fetch(`${API_BASE_URL}/stations/${id}`, {
      headers: this.getHeaders(),
    });
    const data =
      await this.handleResponse<ApiResponse<{ station: Station }>>(response);
    return data.data.station;
  }

  async createStation(stationData: CreateStationDTO): Promise<Station> {
    const response = await fetch(`${API_BASE_URL}/stations`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(stationData),
    });
    const data =
      await this.handleResponse<ApiResponse<{ station: Station }>>(response);
    return data.data.station;
  }

  async updateStation(
    id: string,
    stationData: UpdateStationDTO,
  ): Promise<Station> {
    const response = await fetch(`${API_BASE_URL}/stations/${id}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify(stationData),
    });
    const data =
      await this.handleResponse<ApiResponse<{ station: Station }>>(response);
    return data.data.station;
  }

  async updateOccupancy(
    stationId: string,
    occupancyData: OccupancyUpdateDTO,
  ): Promise<Station> {
    const response = await fetch(
      `${API_BASE_URL}/stations/${stationId}/occupancy`,
      {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify(occupancyData),
      },
    );
    const data =
      await this.handleResponse<ApiResponse<{ station: Station }>>(response);
    return data.data.station;
  }

  async addStationImages(
    stationId: string,
    imageUrls: string[],
  ): Promise<Station> {
    const response = await fetch(
      `${API_BASE_URL}/stations/${stationId}/images`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ imageUrls }),
      },
    );
    const data =
      await this.handleResponse<ApiResponse<{ station: Station }>>(response);
    return data.data.station;
  }

  async deleteStationImage(
    stationId: string,
    imageUrl: string,
  ): Promise<Station> {
    const response = await fetch(
      `${API_BASE_URL}/stations/${stationId}/images`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
        body: JSON.stringify({ imageUrl }),
      },
    );
    const data =
      await this.handleResponse<ApiResponse<{ station: Station }>>(response);
    return data.data.station;
  }

  async deleteStation(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/stations/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    await this.handleResponse<{ status: string }>(response);
  }

  async getCloudinaryConfig(): Promise<{
    cloudName: string;
    apiKey: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/stations/cloudinary-config`);
    const data =
      await this.handleResponse<
        ApiResponse<{ cloudName: string; apiKey: string }>
      >(response);
    return data.data;
  }

  async uploadImageToCloudinary(
    file: File,
    cloudinaryConfig: { cloudName: string; apiKey: string },
  ): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ev_stations");
    formData.append("folder", "ev-stations");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
      { method: "POST", body: formData },
    );

    if (!response.ok) {
      throw new Error("Failed to upload image to Cloudinary");
    }

    const data = await response.json();
    return data.secure_url;
  }

  // Vehicles
  async searchVehicles(params?: {
    q?: string;
    vehicleType?: string;
    limit?: number;
  }): Promise<Vehicle[]> {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.append("q", params.q);
    if (params?.vehicleType)
      searchParams.append("vehicleType", params.vehicleType);
    if (params?.limit) searchParams.append("limit", String(params.limit));

    const url = `${API_BASE_URL}/vehicles${searchParams.toString() ? `?${searchParams}` : ""}`;
    const response = await fetch(url, { headers: this.getHeaders() });
    const data =
      await this.handleResponse<ApiResponse<{ vehicles: Vehicle[] }>>(response);
    return data.data.vehicles;
  }

  async createVehicle(vehicleData: CreateVehicleDTO): Promise<Vehicle> {
    const response = await fetch(`${API_BASE_URL}/vehicles`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(vehicleData),
    });
    const data =
      await this.handleResponse<ApiResponse<{ vehicle: Vehicle }>>(response);
    return data.data.vehicle;
  }

  async getVehicleRequests(params?: {
    status?: VehicleRequestStatus;
    limit?: number;
  }): Promise<VehicleRequest[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.limit) searchParams.append("limit", String(params.limit));

    const url = `${API_BASE_URL}/vehicles/listrequests${searchParams.toString() ? `?${searchParams}` : ""}`;
    const response = await fetch(url, { headers: this.getHeaders() });
    const data =
      await this.handleResponse<ApiResponse<{ requests: VehicleRequest[] }>>(
        response,
      );
    return data.data.requests;
  }

  async approveVehicleRequest(
    id: string,
    data?: {
      vehicleData?: {
        batteryCapacity_kWh: number;
        compatibleConnectors: ConnectorType[];
        make?: string;
        modelName?: string;
        variant?: string;
        vehicleType?: string;
      };
      reviewNotes?: string;
    },
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/vehicles/requests/${id}/approve`,
      {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify(data || {}),
      },
    );
    await this.handleResponse<ApiResponse<unknown>>(response);
  }

  async rejectVehicleRequest(id: string, reviewNotes?: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/vehicles/requests/${id}/reject`,
      {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify({ reviewNotes }),
      },
    );
    await this.handleResponse<ApiResponse<unknown>>(response);
  }
}

export const api = new ApiService();
export default api;
