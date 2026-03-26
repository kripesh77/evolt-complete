import { create } from "zustand";
import * as Location from "expo-location";
import { GeoLocation } from "../types";

interface LocationState {
  currentLocation: GeoLocation | null;
  customLocation: GeoLocation | null;
  useCustomLocation: boolean;
  isLoading: boolean;
  error: string | null;
  permissionGranted: boolean;

  // Get effective location (custom if set, otherwise current)
  getEffectiveLocation: () => GeoLocation | null;

  // Actions
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<void>;
  setCustomLocation: (location: GeoLocation | null) => void;
  setUseCustomLocation: (value: boolean) => void;
  clearError: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  currentLocation: null,
  customLocation: null,
  useCustomLocation: false,
  isLoading: false,
  error: null,
  permissionGranted: false,

  getEffectiveLocation: () => {
    const state = get();
    if (state.useCustomLocation && state.customLocation) {
      return state.customLocation;
    }
    return state.currentLocation;
  },

  requestPermission: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      set({ permissionGranted: granted });
      return granted;
    } catch (error) {
      set({ error: "Failed to request location permission" });
      return false;
    }
  },

  getCurrentLocation: async () => {
    set({ isLoading: true, error: null });
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const granted = await get().requestPermission();
        if (!granted) {
          set({
            error: "Location permission denied. Please enable in settings.",
            isLoading: false,
          });
          return;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      set({
        currentLocation: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        isLoading: false,
        permissionGranted: true,
      });
    } catch (error: any) {
      set({
        error: error.message || "Failed to get current location",
        isLoading: false,
      });
    }
  },

  setCustomLocation: (location: GeoLocation | null) => {
    set({ customLocation: location });
    if (location) {
      set({ useCustomLocation: true });
    }
  },

  setUseCustomLocation: (value: boolean) => {
    set({ useCustomLocation: value });
  },

  clearError: () => set({ error: null }),
}));
