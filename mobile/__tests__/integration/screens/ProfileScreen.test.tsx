/**
 * Integration test for ProfileScreen
 * Tests guest view, authenticated view, navigation, logout
 */
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import ProfileScreen from "../../../src/screens/ProfileScreen";
import { useAuthStore } from "../../../src/store/authStore";

jest.mock("../../../src/store/authStore", () => ({ useAuthStore: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockAlert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

const mockLogout = jest.fn();

const mockUser = {
  _id: "user-1",
  name: "John Doe",
  email: "john@example.com",
  role: "user",
  isActive: true,
  vehicleProfiles: [
    {
      _id: "v-1",
      name: "Tesla Model 3",
      vehicleType: "car",
      batteryCapacity_kWh: 60,
      efficiency_kWh_per_km: 0.15,
      batteryPercent: 80,
      compatibleConnectors: ["CCS"],
    },
  ],
  favoriteStations: ["station-1", "station-2"],
};

describe("ProfileScreen Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // Guest view
  // ============================================================

  describe("Guest view", () => {
    beforeEach(() => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        logout: mockLogout,
      });
    });

    it("should show welcome greeting for guest", () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText("Welcome, Explorer!")).toBeTruthy();
    });

    it("should show Login and Create Account buttons", () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText("Login")).toBeTruthy();
      expect(getByText("Create Account")).toBeTruthy();
    });

    it("should display feature highlights", () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText("Save Vehicles")).toBeTruthy();
      expect(getByText("Favorite Stations")).toBeTruthy();
      expect(getByText("Smart Recommendations")).toBeTruthy();
    });

    it("should navigate to Login on Login button press", () => {
      const { getByText } = render(<ProfileScreen />);
      fireEvent.press(getByText("Login"));
      expect(mockNavigate).toHaveBeenCalledWith("Login");
    });

    it("should navigate to Register on Create Account press", () => {
      const { getByText } = render(<ProfileScreen />);
      fireEvent.press(getByText("Create Account"));
      expect(mockNavigate).toHaveBeenCalledWith("Register");
    });

    it("should show version text in guest view", () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText("Version 1.0.0")).toBeTruthy();
    });
  });

  // ============================================================
  // Authenticated view
  // ============================================================

  describe("Authenticated view", () => {
    beforeEach(() => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        logout: mockLogout,
      });
    });

    it("should display user info", () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText("John Doe")).toBeTruthy();
      expect(getByText("john@example.com")).toBeTruthy();
      expect(getByText("user")).toBeTruthy();
    });

    it("should display avatar initial", () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText("J")).toBeTruthy();
    });

    it("should display vehicle count", () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText("1")).toBeTruthy();
      expect(getByText("Vehicles")).toBeTruthy();
    });

    it("should display favorite count", () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText("2")).toBeTruthy();
      expect(getByText("Favorites")).toBeTruthy();
    });

    it("should display menu items", () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText("My Vehicles")).toBeTruthy();
      expect(getByText("Favorite Stations")).toBeTruthy();
      expect(getByText("Notifications")).toBeTruthy();
      expect(getByText("Settings")).toBeTruthy();
      expect(getByText("Help & Support")).toBeTruthy();
    });

    it("should navigate to VehicleProfiles on menu press", () => {
      const { getByText } = render(<ProfileScreen />);
      fireEvent.press(getByText("My Vehicles"));
      expect(mockNavigate).toHaveBeenCalledWith("VehicleProfiles");
    });

    it("should show logout confirmation dialog", () => {
      const { getByText } = render(<ProfileScreen />);
      fireEvent.press(getByText("Logout"));
      expect(mockAlert).toHaveBeenCalledWith(
        "Logout",
        "Are you sure you want to logout?",
        expect.arrayContaining([
          expect.objectContaining({ text: "Cancel" }),
          expect.objectContaining({ text: "Logout" }),
        ]),
      );
    });

    it("should call logout when confirmed", async () => {
      mockLogout.mockResolvedValue(undefined);
      const { getByText } = render(<ProfileScreen />);
      fireEvent.press(getByText("Logout"));

      const alertCalls = mockAlert.mock.calls;
      const logoutButton = alertCalls[0]![2]!.find(
        (btn: any) => btn.text === "Logout",
      );

      await act(async () => {
        await logoutButton.onPress();
      });

      expect(mockLogout).toHaveBeenCalled();
    });

    it("should show version text", () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText("Version 1.0.0")).toBeTruthy();
    });

    it("should show vehicle count in menu description", () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText("1 vehicles saved")).toBeTruthy();
    });

    it("should show favorite count in menu description", () => {
      const { getByText } = render(<ProfileScreen />);
      expect(getByText("2 stations saved")).toBeTruthy();
    });
  });
});
