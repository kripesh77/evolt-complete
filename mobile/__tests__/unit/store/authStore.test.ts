/**
 * Unit tests for authStore (Zustand store)
 * Tests login, register, logout, checkAuth, vehicle CRUD, favorites
 */
import { useAuthStore } from "../../../src/store/authStore";
import apiService from "../../../src/services/api";

// Mock the API service
jest.mock("../../../src/services/api", () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
    getStoredToken: jest.fn(),
    clearToken: jest.fn(),
    addVehicleProfile: jest.fn(),
    updateVehicleProfile: jest.fn(),
    deleteVehicleProfile: jest.fn(),
    addFavoriteStation: jest.fn(),
    removeFavoriteStation: jest.fn(),
  },
}));

const mockUser = {
  _id: "user-1",
  name: "Test User",
  email: "test@example.com",
  role: "user" as const,
  isActive: true,
  vehicleProfiles: [],
  favoriteStations: [],
};

const mockVehicle = {
  _id: "vehicle-1",
  name: "Test Car",
  vehicleType: "car" as const,
  batteryCapacity_kWh: 60,
  efficiency_kWh_per_km: 0.15,
  batteryPercent: 80,
  compatibleConnectors: ["CCS" as const],
};

describe("authStore", () => {
  beforeEach(() => {
    // Reset the store to initial state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("login", () => {
    it("should login successfully and set user", async () => {
      (apiService.login as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        token: "test-token",
      });

      await useAuthStore.getState().login("test@example.com", "password123");

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set loading state during login", async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      (apiService.login as jest.Mock).mockReturnValue(loginPromise);

      const loginAction = useAuthStore
        .getState()
        .login("test@example.com", "password123");

      // Should be loading
      expect(useAuthStore.getState().isLoading).toBe(true);

      resolveLogin!({ data: { user: mockUser }, token: "test-token" });
      await loginAction;

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it("should handle login failure with API error message", async () => {
      (apiService.login as jest.Mock).mockRejectedValue({
        response: { data: { message: "Invalid credentials" } },
      });

      await expect(
        useAuthStore.getState().login("test@example.com", "wrongpassword"),
      ).rejects.toThrow("Invalid credentials");

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Invalid credentials");
    });

    it("should handle login failure with fallback message", async () => {
      (apiService.login as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );

      await expect(
        useAuthStore.getState().login("test@example.com", "password123"),
      ).rejects.toThrow("Login failed");

      expect(useAuthStore.getState().error).toBe("Login failed");
    });
  });

  describe("register", () => {
    it("should register successfully and set user", async () => {
      (apiService.register as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        token: "test-token",
      });

      await useAuthStore
        .getState()
        .register(
          "Test User",
          "test@example.com",
          "password123",
          "password123",
        );

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it("should handle registration failure", async () => {
      (apiService.register as jest.Mock).mockRejectedValue({
        response: { data: { message: "Email already exists" } },
      });

      await expect(
        useAuthStore
          .getState()
          .register("Test", "test@example.com", "pass", "pass"),
      ).rejects.toThrow("Email already exists");

      expect(useAuthStore.getState().error).toBe("Email already exists");
    });
  });

  describe("logout", () => {
    it("should clear user state on logout", async () => {
      // Set authenticated state first
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });

      (apiService.logout as jest.Mock).mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it("should clear state even if API logout fails", async () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      });

      (apiService.logout as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );

      // logout uses try/finally (no catch), so the error propagates
      // but state is still cleared in the finally block
      await expect(useAuthStore.getState().logout()).rejects.toThrow(
        "Network error",
      );

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe("checkAuth", () => {
    it("should authenticate when valid token exists", async () => {
      (apiService.getStoredToken as jest.Mock).mockResolvedValue("valid-token");
      (apiService.getMe as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it("should not authenticate when no token", async () => {
      (apiService.getStoredToken as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it("should clear auth when token is invalid", async () => {
      (apiService.getStoredToken as jest.Mock).mockResolvedValue(
        "expired-token",
      );
      (apiService.getMe as jest.Mock).mockRejectedValue(
        new Error("Unauthorized"),
      );

      await useAuthStore.getState().checkAuth();

      expect(apiService.clearToken).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it("should not block the UI (isLoading stays false during checkAuth)", async () => {
      (apiService.getStoredToken as jest.Mock).mockResolvedValue("valid-token");
      (apiService.getMe as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      // isLoading should remain false throughout checkAuth
      expect(useAuthStore.getState().isLoading).toBe(false);
      await useAuthStore.getState().checkAuth();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe("clearError", () => {
    it("should clear the error state", () => {
      useAuthStore.setState({ error: "Some error" });
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe("updateUser", () => {
    it("should update user in state", () => {
      const updatedUser = { ...mockUser, name: "Updated Name" };
      useAuthStore.getState().updateUser(updatedUser);
      expect(useAuthStore.getState().user).toEqual(updatedUser);
    });
  });

  describe("vehicle operations", () => {
    const userWithVehicle = {
      ...mockUser,
      vehicleProfiles: [mockVehicle],
    };

    it("should add a vehicle profile", async () => {
      (apiService.addVehicleProfile as jest.Mock).mockResolvedValue({
        data: { user: userWithVehicle },
      });

      const { _id, ...vehicleData } = mockVehicle;
      await useAuthStore.getState().addVehicle(vehicleData);

      expect(useAuthStore.getState().user).toEqual(userWithVehicle);
    });

    it("should throw on add vehicle failure", async () => {
      (apiService.addVehicleProfile as jest.Mock).mockRejectedValue({
        response: { data: { message: "Vehicle limit reached" } },
      });

      await expect(
        useAuthStore.getState().addVehicle({
          vehicleType: "car",
          batteryCapacity_kWh: 60,
          efficiency_kWh_per_km: 0.15,
          batteryPercent: 80,
          compatibleConnectors: ["CCS"],
        }),
      ).rejects.toThrow("Vehicle limit reached");
    });

    it("should update a vehicle profile", async () => {
      const updatedUser = {
        ...mockUser,
        vehicleProfiles: [{ ...mockVehicle, name: "Updated Car" }],
      };
      (apiService.updateVehicleProfile as jest.Mock).mockResolvedValue({
        data: { user: updatedUser },
      });

      await useAuthStore
        .getState()
        .updateVehicle("vehicle-1", { name: "Updated Car" });
      expect(useAuthStore.getState().user).toEqual(updatedUser);
    });

    it("should delete a vehicle profile", async () => {
      const userWithNoVehicles = { ...mockUser, vehicleProfiles: [] };
      (apiService.deleteVehicleProfile as jest.Mock).mockResolvedValue({
        data: { user: userWithNoVehicles },
      });

      await useAuthStore.getState().deleteVehicle("vehicle-1");
      expect(useAuthStore.getState().user?.vehicleProfiles).toHaveLength(0);
    });
  });

  describe("favorites", () => {
    it("should add a favorite station", async () => {
      const userWithFav = {
        ...mockUser,
        favoriteStations: ["station-1"],
      };
      (apiService.addFavoriteStation as jest.Mock).mockResolvedValue({
        data: { user: userWithFav },
      });

      await useAuthStore.getState().addFavorite("station-1");
      expect(useAuthStore.getState().user?.favoriteStations).toContain(
        "station-1",
      );
    });

    it("should remove a favorite station", async () => {
      const userNoFav = { ...mockUser, favoriteStations: [] };
      (apiService.removeFavoriteStation as jest.Mock).mockResolvedValue({
        data: { user: userNoFav },
      });

      await useAuthStore.getState().removeFavorite("station-1");
      expect(useAuthStore.getState().user?.favoriteStations).toHaveLength(0);
    });

    it("should throw on favorite operation failure", async () => {
      (apiService.addFavoriteStation as jest.Mock).mockRejectedValue({
        response: { data: { message: "Station not found" } },
      });

      await expect(
        useAuthStore.getState().addFavorite("bad-id"),
      ).rejects.toThrow("Station not found");
    });
  });
});
