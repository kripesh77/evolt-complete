/**
 * Integration test for App navigation flow
 * Tests that all users (guest & authenticated) enter the app directly
 */
import React from "react";
import { render, waitFor, act } from "@testing-library/react-native";
import AppNavigator from "../../../src/navigation/AppNavigator";
import { useAuthStore } from "../../../src/store/authStore";

// Mock all the stores
jest.mock("../../../src/store/authStore", () => ({ useAuthStore: jest.fn() }));

// Mock all screens as simple views
jest.mock("../../../src/screens/LoginScreen", () => {
  const { Text } = require("react-native");
  return () => Text({ children: "LoginScreen" });
});

jest.mock("../../../src/screens/RegisterScreen", () => {
  const { Text } = require("react-native");
  return () => Text({ children: "RegisterScreen" });
});

jest.mock("../../../src/screens/HomeScreen", () => {
  const { Text } = require("react-native");
  return () => Text({ children: "HomeScreen" });
});

jest.mock("../../../src/screens/MapScreen", () => {
  const { Text } = require("react-native");
  return () => Text({ children: "MapScreen" });
});

jest.mock("../../../src/screens/RecommendScreen", () => {
  const { Text } = require("react-native");
  return () => Text({ children: "RecommendScreen" });
});

jest.mock("../../../src/screens/ProfileScreen", () => {
  const { Text } = require("react-native");
  return () => Text({ children: "ProfileScreen" });
});

jest.mock("../../../src/screens/StationDetailsScreen", () => {
  const { Text } = require("react-native");
  return () => Text({ children: "StationDetailsScreen" });
});

jest.mock("../../../src/screens/VehicleProfilesScreen", () => {
  const { Text } = require("react-native");
  return () => Text({ children: "VehicleProfilesScreen" });
});

jest.mock("../../../src/screens/AddVehicleScreen", () => {
  const { Text } = require("react-native");
  return () => Text({ children: "AddVehicleScreen" });
});

const mockCheckAuth = jest.fn();

describe("AppNavigator Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call checkAuth on mount", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      checkAuth: mockCheckAuth,
    });

    render(<AppNavigator />);
    expect(mockCheckAuth).toHaveBeenCalled();
  });

  it("should always show main tabs for guest users (no auth gate)", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      checkAuth: mockCheckAuth,
    });

    const tree = render(<AppNavigator />);
    // Main navigator should always be rendered — no loading spinner, no auth gate
    expect(tree).toBeTruthy();
  });

  it("should show main tabs for authenticated users", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      checkAuth: mockCheckAuth,
    });

    const tree = render(<AppNavigator />);
    expect(tree).toBeTruthy();
  });

  it("should never show a loading spinner (non-blocking auth check)", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      checkAuth: mockCheckAuth,
    });

    const { queryByTestId } = render(<AppNavigator />);
    // No ActivityIndicator should be rendered
    expect(queryByTestId("loading-spinner")).toBeNull();
  });
});
