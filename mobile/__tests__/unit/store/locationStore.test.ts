/**
 * Unit tests for locationStore (Zustand store)
 * Tests location permissions, GPS, custom locations
 */
import { useLocationStore } from "../../../src/store/locationStore";
import * as Location from "expo-location";

describe("locationStore", () => {
  beforeEach(() => {
    useLocationStore.setState({
      currentLocation: null,
      customLocation: null,
      useCustomLocation: false,
      isLoading: false,
      error: null,
      permissionGranted: false,
    });
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      const state = useLocationStore.getState();
      expect(state.currentLocation).toBeNull();
      expect(state.customLocation).toBeNull();
      expect(state.useCustomLocation).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.permissionGranted).toBe(false);
    });
  });

  describe("getEffectiveLocation", () => {
    it("should return current location when custom location not set", () => {
      useLocationStore.setState({
        currentLocation: { latitude: 28.6139, longitude: 77.209 },
        useCustomLocation: false,
      });

      const location = useLocationStore.getState().getEffectiveLocation();
      expect(location).toEqual({ latitude: 28.6139, longitude: 77.209 });
    });

    it("should return custom location when enabled", () => {
      useLocationStore.setState({
        currentLocation: { latitude: 28.6139, longitude: 77.209 },
        customLocation: { latitude: 19.076, longitude: 72.8777 },
        useCustomLocation: true,
      });

      const location = useLocationStore.getState().getEffectiveLocation();
      expect(location).toEqual({ latitude: 19.076, longitude: 72.8777 });
    });

    it("should return current location when custom is enabled but not set", () => {
      useLocationStore.setState({
        currentLocation: { latitude: 28.6139, longitude: 77.209 },
        customLocation: null,
        useCustomLocation: true,
      });

      const location = useLocationStore.getState().getEffectiveLocation();
      expect(location).toEqual({ latitude: 28.6139, longitude: 77.209 });
    });

    it("should return null when no location is available", () => {
      const location = useLocationStore.getState().getEffectiveLocation();
      expect(location).toBeNull();
    });
  });

  describe("requestPermission", () => {
    it("should request and grant permission", async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: "granted",
      });

      const result = await useLocationStore.getState().requestPermission();

      expect(result).toBe(true);
      expect(useLocationStore.getState().permissionGranted).toBe(true);
    });

    it("should handle denied permission", async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: "denied",
      });

      const result = await useLocationStore.getState().requestPermission();

      expect(result).toBe(false);
      expect(useLocationStore.getState().permissionGranted).toBe(false);
    });

    it("should handle permission request error", async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockRejectedValue(new Error("Permission error"));

      const result = await useLocationStore.getState().requestPermission();

      expect(result).toBe(false);
      expect(useLocationStore.getState().error).toBe(
        "Failed to request location permission",
      );
    });
  });

  describe("getCurrentLocation", () => {
    it("should get current location when permission granted", async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "granted",
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 28.6139, longitude: 77.209 },
      });

      await useLocationStore.getState().getCurrentLocation();

      const state = useLocationStore.getState();
      expect(state.currentLocation).toEqual({
        latitude: 28.6139,
        longitude: 77.209,
      });
      expect(state.isLoading).toBe(false);
      expect(state.permissionGranted).toBe(true);
    });

    it("should request permission if not yet granted", async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "denied",
      });
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: "granted",
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: { latitude: 28.6139, longitude: 77.209 },
      });

      await useLocationStore.getState().getCurrentLocation();

      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(useLocationStore.getState().currentLocation).not.toBeNull();
    });

    it("should set error when permission denied", async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "denied",
      });
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({
        status: "denied",
      });

      await useLocationStore.getState().getCurrentLocation();

      const state = useLocationStore.getState();
      expect(state.error).toBe(
        "Location permission denied. Please enable in settings.",
      );
      expect(state.isLoading).toBe(false);
      expect(state.currentLocation).toBeNull();
    });

    it("should handle location fetch error", async () => {
      (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "granted",
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
        new Error("GPS unavailable"),
      );

      await useLocationStore.getState().getCurrentLocation();

      expect(useLocationStore.getState().error).toBe("GPS unavailable");
      expect(useLocationStore.getState().isLoading).toBe(false);
    });
  });

  describe("setCustomLocation", () => {
    it("should set custom location and enable custom mode", () => {
      const customLoc = { latitude: 19.076, longitude: 72.8777 };
      useLocationStore.getState().setCustomLocation(customLoc);

      const state = useLocationStore.getState();
      expect(state.customLocation).toEqual(customLoc);
      expect(state.useCustomLocation).toBe(true);
    });

    it("should handle null for clearing custom location", () => {
      useLocationStore.setState({
        customLocation: { latitude: 19.076, longitude: 72.8777 },
        useCustomLocation: true,
      });

      useLocationStore.getState().setCustomLocation(null);
      expect(useLocationStore.getState().customLocation).toBeNull();
    });
  });

  describe("setUseCustomLocation", () => {
    it("should toggle custom location mode", () => {
      useLocationStore.getState().setUseCustomLocation(true);
      expect(useLocationStore.getState().useCustomLocation).toBe(true);

      useLocationStore.getState().setUseCustomLocation(false);
      expect(useLocationStore.getState().useCustomLocation).toBe(false);
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      useLocationStore.setState({ error: "Some location error" });
      useLocationStore.getState().clearError();
      expect(useLocationStore.getState().error).toBeNull();
    });
  });
});
