import {
  AuthResponse,
  ApiResponse,
  Station,
  User,
  CreateStationDTO,
  UpdateStationDTO,
  OccupancyUpdateDTO,
  Port,
} from "@/types";

// Change this to your backend URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

class ApiService {
  private token: string | null = null;

  constructor() {
    // Try to get token from localStorage on init (client-side only)
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("authToken");
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Always prefer the token from localStorage on the client so multiple
    // module instances (server vs client bundles / HMR) pick up the latest
    // token without requiring a full page reload.
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

  // Auth Methods
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

  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }

  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await this.handleResponse<AuthResponse>(response);

    // Only allow operators and admins
    if (data.data.user.role !== "operator" && data.data.user.role !== "admin") {
      throw new Error(
        "Access denied. This portal is for station operators only.",
      );
    }

    this.setToken(data.data.token);
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(data.data.user));
    }
    return data;
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    passwordConfirm: string;
    role: "operator";
    company: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    const data = await this.handleResponse<AuthResponse>(response);
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
      // Ignore logout errors
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

  // Stations - My Stations (for operators)
  async getMyStations(): Promise<Station[]> {
    const response = await fetch(`${API_BASE_URL}/stations/my-stations`, {
      headers: this.getHeaders(),
    });
    const data =
      await this.handleResponse<ApiResponse<{ stations: Station[] }>>(response);
    return data.data.stations;
  }

  // Stations - Get Single
  async getStation(id: string): Promise<Station> {
    const response = await fetch(`${API_BASE_URL}/stations/${id}`, {
      headers: this.getHeaders(),
    });
    const data =
      await this.handleResponse<ApiResponse<{ station: Station }>>(response);
    return data.data.station;
  }

  // Stations - Create
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

  // Stations - Update
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

  // Stations - Delete
  async deleteStation(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/stations/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    await this.handleResponse<{ status: string }>(response);
  }

  // Stations - Add Port
  async addPort(
    stationId: string,
    port: Omit<Port, "occupied">,
  ): Promise<Station> {
    const response = await fetch(
      `${API_BASE_URL}/stations/${stationId}/ports`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(port),
      },
    );
    const data =
      await this.handleResponse<ApiResponse<{ station: Station }>>(response);
    return data.data.station;
  }

  // Stations - Update Occupancy
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

  // Get all stations (admin only or public)
  async getAllStations(params?: {
    status?: string;
    vehicleType?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  }): Promise<Station[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.vehicleType)
      searchParams.append("vehicleType", params.vehicleType);
    if (params?.lat) searchParams.append("lat", params.lat.toString());
    if (params?.lng) searchParams.append("lng", params.lng.toString());
    if (params?.radius) searchParams.append("radius", params.radius.toString());

    const url = `${API_BASE_URL}/stations${searchParams.toString() ? `?${searchParams}` : ""}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    const data =
      await this.handleResponse<ApiResponse<{ stations: Station[] }>>(response);
    return data.data.stations;
  }

  // Cloudinary - Get config
  async getCloudinaryConfig(): Promise<{
    cloudName: string;
    apiKey: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/stations/cloudinary-config`);
    const data = await this.handleResponse<
      ApiResponse<{ cloudName: string; apiKey: string }>
    >(response);
    return data.data;
  }

  // Cloudinary - Upload image directly to Cloudinary
  async uploadImageToCloudinary(
    file: File,
    cloudinaryConfig: { cloudName: string; apiKey: string },
  ): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ev_stations"); // You need to create this preset in Cloudinary
    formData.append("folder", "ev-stations");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error("Failed to upload image to Cloudinary");
    }

    const data = await response.json();
    return data.secure_url;
  }

  // Station Images - Add images (after uploading to Cloudinary)
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

  // Station Images - Delete image
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

  // Station Images - Delete all images
  async deleteAllStationImages(stationId: string): Promise<Station> {
    const response = await fetch(
      `${API_BASE_URL}/stations/${stationId}/images/all`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      },
    );
    const data =
      await this.handleResponse<ApiResponse<{ station: Station }>>(response);
    return data.data.station;
  }
}

// Export singleton instance
export const api = new ApiService();
export default api;
