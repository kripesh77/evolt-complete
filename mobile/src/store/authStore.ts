import { create } from "zustand";
import { User, VehicleProfile } from "../types";
import apiService from "../services/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirm: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: User) => void;

  // Vehicle Profile Actions
  addVehicle: (profile: Omit<VehicleProfile, "_id">) => Promise<void>;
  updateVehicle: (
    vehicleId: string,
    profile: Partial<VehicleProfile>,
  ) => Promise<void>;
  deleteVehicle: (vehicleId: string) => Promise<void>;

  // Favorites
  addFavorite: (stationId: string) => Promise<void>;
  removeFavorite: (stationId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.login(email, password);
      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const message = error.response?.data?.message || "Login failed";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (
    name: string,
    email: string,
    password: string,
    passwordConfirm: string,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.register({
        name,
        email,
        password,
        passwordConfirm,
      });
      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const message = error.response?.data?.message || "Registration failed";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiService.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    // Non-blocking: silently restore session without showing a loading state
    try {
      const token = await apiService.getStoredToken();
      if (!token) {
        return;
      }

      const response = await apiService.getMe();
      set({
        user: response.data.user,
        isAuthenticated: true,
      });
    } catch (error) {
      await apiService.clearToken();
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },

  clearError: () => set({ error: null }),

  updateUser: (user: User) => set({ user }),

  addVehicle: async (profile: Omit<VehicleProfile, "_id">) => {
    try {
      const response = await apiService.addVehicleProfile(profile);
      set({ user: response.data.user });
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to add vehicle";
      throw new Error(message);
    }
  },

  updateVehicle: async (
    vehicleId: string,
    profile: Partial<VehicleProfile>,
  ) => {
    try {
      const response = await apiService.updateVehicleProfile(
        vehicleId,
        profile,
      );
      set({ user: response.data.user });
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to update vehicle";
      throw new Error(message);
    }
  },

  deleteVehicle: async (vehicleId: string) => {
    try {
      const response = await apiService.deleteVehicleProfile(vehicleId);
      set({ user: response.data.user });
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to delete vehicle";
      throw new Error(message);
    }
  },

  addFavorite: async (stationId: string) => {
    try {
      const response = await apiService.addFavoriteStation(stationId);
      set({ user: response.data.user });
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to add favorite";
      throw new Error(message);
    }
  },

  removeFavorite: async (stationId: string) => {
    try {
      const response = await apiService.removeFavoriteStation(stationId);
      set({ user: response.data.user });
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to remove favorite";
      throw new Error(message);
    }
  },
}));
