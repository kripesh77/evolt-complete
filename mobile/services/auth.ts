import { API_BASE_URL } from "@/constants";
import type { VehicleCatalogItem } from "@/types";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  company?: string;
  phone?: string;
  vehicleProfiles?: VehicleCatalogItem[];
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface AuthMeResponse {
  status: string;
  data: {
    user: AuthUser;
  };
}

export interface AddVehicleProfileResponse {
  status: string;
  message?: string;
  data: {
    vehicleProfiles: VehicleCatalogItem[];
  };
}

export interface RemoveVehicleProfileResponse {
  status: string;
  message?: string;
  data: {
    vehicleProfiles: VehicleCatalogItem[];
  };
}

export interface UpdateMeResponse {
  status: string;
  data: {
    user: AuthUser;
  };
}

class AuthService {
  private async request<T>(
    path: string,
    init?: RequestInit,
    token?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data?.message || data?.error || "Authentication request failed";
      throw new Error(message);
    }

    return data as T;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const payload = await this.request<{ status: string; data: AuthResponse }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );

    return payload.data;
  }

  async register(
    name: string,
    email: string,
    password: string,
    role: string = "user",
    company?: string,
    phone?: string,
  ): Promise<AuthResponse> {
    const payload = await this.request<{ status: string; data: AuthResponse }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ name, email, password, role, company, phone }),
      },
    );

    return payload.data;
  }

  async getCurrentUser(token: string): Promise<AuthMeResponse> {
    return this.request<AuthMeResponse>("/auth/me", undefined, token);
  }

  async updateMe(
    token: string,
    payload: { name?: string; company?: string; phone?: string },
  ): Promise<UpdateMeResponse> {
    return this.request<UpdateMeResponse>(
      "/auth/me",
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      token,
    );
  }

  async addVehicleProfile(
    token: string,
    vehicleId: string,
  ): Promise<AddVehicleProfileResponse> {
    return this.request<AddVehicleProfileResponse>(
      "/auth/vehicle-profiles",
      {
        method: "POST",
        body: JSON.stringify({ vehicleId }),
      },
      token,
    );
  }

  async removeVehicleProfile(
    token: string,
    vehicleId: string,
  ): Promise<RemoveVehicleProfileResponse> {
    return this.request<RemoveVehicleProfileResponse>(
      `/auth/vehicle-profiles/${vehicleId}`,
      {
        method: "DELETE",
      },
      token,
    );
  }
}

export const authService = new AuthService();
export default authService;
