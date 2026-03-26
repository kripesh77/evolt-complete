/**
 * Unit tests for ApiService
 * Tests token management, auth, stations, recommendations, vehicle profiles, favorites
 */
import apiService, { WS_BASE_URL } from "../../../src/services/api";
import * as SecureStore from "expo-secure-store";

describe("ApiService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("exports", () => {
    it("should export apiService as default", () => {
      expect(apiService).toBeDefined();
      expect(typeof apiService).toBe("object");
    });

    it("should export WS_BASE_URL", () => {
      expect(WS_BASE_URL).toBeDefined();
      expect(typeof WS_BASE_URL).toBe("string");
      expect(WS_BASE_URL).toContain("http");
    });
  });

  describe("token management", () => {
    it("should set token in SecureStore", async () => {
      await apiService.setToken("test-token-123");

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "authToken",
        "test-token-123",
      );
    });

    it("should clear token from SecureStore", async () => {
      await apiService.clearToken();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("authToken");
    });

    it("should get stored token from SecureStore", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("stored-token");

      const token = await apiService.getStoredToken();

      expect(token).toBe("stored-token");
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith("authToken");
    });

    it("should return null when no token stored", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const token = await apiService.getStoredToken();

      expect(token).toBeNull();
    });
  });

  describe("API methods existence", () => {
    it("should have authentication methods", () => {
      expect(typeof apiService.login).toBe("function");
      expect(typeof apiService.register).toBe("function");
      expect(typeof apiService.logout).toBe("function");
      expect(typeof apiService.getMe).toBe("function");
    });

    it("should have station methods", () => {
      expect(typeof apiService.getNearbyStations).toBe("function");
      expect(typeof apiService.getStation).toBe("function");
      expect(typeof apiService.getAllStations).toBe("function");
    });

    it("should have recommendation methods", () => {
      expect(typeof apiService.getRecommendations).toBe("function");
    });

    it("should have vehicle profile methods", () => {
      expect(typeof apiService.addVehicleProfile).toBe("function");
      expect(typeof apiService.updateVehicleProfile).toBe("function");
      expect(typeof apiService.deleteVehicleProfile).toBe("function");
    });

    it("should have favorite methods", () => {
      expect(typeof apiService.addFavoriteStation).toBe("function");
      expect(typeof apiService.removeFavoriteStation).toBe("function");
    });

    it("should have profile update methods", () => {
      expect(typeof apiService.updateProfile).toBe("function");
      expect(typeof apiService.updatePassword).toBe("function");
    });
  });
});
