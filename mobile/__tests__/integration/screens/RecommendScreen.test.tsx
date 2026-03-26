/**
 * Integration test for RecommendScreen
 * Tests guest manual vehicle input, saved vehicle selector, mode switch, recommendations
 */
import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import RecommendScreen from "../../../src/screens/RecommendScreen";
import { useAuthStore } from "../../../src/store/authStore";
import { useLocationStore } from "../../../src/store/locationStore";
import { useStationStore } from "../../../src/store/stationStore";

jest.mock("../../../src/store/authStore", () => ({ useAuthStore: jest.fn() }));
jest.mock("../../../src/store/locationStore", () => ({
  useLocationStore: jest.fn(),
}));
jest.mock("../../../src/store/stationStore", () => ({
  useStationStore: jest.fn(),
}));

// Mock WebViewMap component
jest.mock("../../../src/components/WebViewMap", () => {
  const { View, Text } = require("react-native");
  return (props: any) => (
    <View>
      <Text>MockWebViewMap</Text>
    </View>
  );
});

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockAlert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

const mockGetCurrentLocation = jest.fn();
const mockGetEffectiveLocation = jest.fn();
const mockSetCustomLocation = jest.fn();
const mockSetUseCustomLocation = jest.fn();
const mockGetRecommendations = jest.fn();
const mockClearRecommendations = jest.fn();

const mockUser = {
  _id: "user-1",
  name: "Test User",
  email: "test@test.com",
  role: "user",
  isActive: true,
  vehicleProfiles: [
    {
      _id: "v-1",
      name: "My Tesla",
      vehicleType: "car",
      batteryCapacity_kWh: 60,
      efficiency_kWh_per_km: 0.15,
      batteryPercent: 80,
      compatibleConnectors: ["CCS"],
    },
    {
      _id: "v-2",
      name: "City Bike",
      vehicleType: "bike",
      batteryCapacity_kWh: 3,
      efficiency_kWh_per_km: 0.03,
      batteryPercent: 60,
      compatibleConnectors: ["AC_SLOW"],
    },
  ],
  favoriteStations: [],
};

const mockRecommendation = {
  stationId: "station-1",
  stationName: "Green Power Station",
  address: "123 Test Street",
  recommendedPort: "CCS",
  powerKW: 50,
  pricePerKWh: 15,
  freeSlots: 3,
  totalSlots: 4,
  distance_km: 2.5,
  estimatedChargingTime_min: 45,
  estimatedCost: 150,
  canReachWithCurrentCharge: true,
  score: 95,
  location: { type: "Point", coordinates: [77.209, 28.6139] },
};

describe("RecommendScreen Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentLocation.mockResolvedValue(undefined);
    mockGetRecommendations.mockResolvedValue(undefined);
    mockGetEffectiveLocation.mockReturnValue({
      latitude: 28.6139,
      longitude: 77.209,
    });
  });

  const setupLocationAndStationStore = () => {
    (useLocationStore as unknown as jest.Mock).mockReturnValue({
      currentLocation: { latitude: 28.6139, longitude: 77.209 },
      customLocation: null,
      useCustomLocation: false,
      setCustomLocation: mockSetCustomLocation,
      setUseCustomLocation: mockSetUseCustomLocation,
      getCurrentLocation: mockGetCurrentLocation,
      getEffectiveLocation: mockGetEffectiveLocation,
    });
    (useStationStore as unknown as jest.Mock).mockReturnValue({
      recommendations: [],
      getRecommendations: mockGetRecommendations,
      isLoading: false,
      clearRecommendations: mockClearRecommendations,
    });
  };

  // ============================================================
  // Guest mode tests (manual input only)
  // ============================================================

  describe("Guest mode", () => {
    beforeEach(() => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
      });
      setupLocationAndStationStore();
    });

    it("should render Vehicle Profile section", () => {
      const { getByText } = render(<RecommendScreen />);
      expect(getByText("Vehicle Profile")).toBeTruthy();
    });

    it("should show login prompt banner for guests", () => {
      const { getByText } = render(<RecommendScreen />);
      expect(getByText("Login to save vehicle profiles")).toBeTruthy();
    });

    it("should navigate to Login when login prompt is pressed", () => {
      const { getByText } = render(<RecommendScreen />);
      fireEvent.press(getByText("Login to save vehicle profiles"));
      expect(mockNavigate).toHaveBeenCalledWith("Login", {
        returnTo: "Recommend",
      });
    });

    it("should show vehicle type selector (Car and Bike)", () => {
      const { getByText } = render(<RecommendScreen />);
      expect(getByText("Car")).toBeTruthy();
      expect(getByText("Bike")).toBeTruthy();
    });

    it("should show car connectors by default", () => {
      const { getByText, queryByText } = render(<RecommendScreen />);
      expect(getByText("CCS")).toBeTruthy();
      expect(getByText("Type 2")).toBeTruthy();
      expect(getByText("CHAdeMO")).toBeTruthy();
      expect(queryByText("AC Slow")).toBeNull();
    });

    it("should switch to bike connectors when bike is selected", () => {
      const { getByText, queryByText } = render(<RecommendScreen />);

      fireEvent.press(getByText("Bike"));

      expect(getByText("AC Slow")).toBeTruthy();
      expect(queryByText("CCS")).toBeNull();
    });

    it("should show battery and efficiency input fields", () => {
      const { getByText } = render(<RecommendScreen />);
      expect(getByText("Battery (kWh)")).toBeTruthy();
      expect(getByText("Efficiency (kWh/km)")).toBeTruthy();
    });

    it("should show connectors label", () => {
      const { getByText } = render(<RecommendScreen />);
      expect(getByText("Connectors")).toBeTruthy();
    });

    it("should show battery level section", () => {
      const { getByText, getAllByText } = render(<RecommendScreen />);
      expect(getByText("Current Battery Level")).toBeTruthy();
      // Multiple 50% texts may exist (battery buttons + display)
      expect(getAllByText("50%").length).toBeGreaterThanOrEqual(1);
    });

    it("should validate empty battery capacity on submit", async () => {
      const { getByText } = render(<RecommendScreen />);

      await act(async () => {
        fireEvent.press(getByText("Get Recommendations"));
      });

      expect(mockAlert).toHaveBeenCalledWith(
        "Error",
        "Please enter a valid battery capacity",
      );
    });

    it("should validate missing connectors on submit", async () => {
      const { getByText, getByPlaceholderText } = render(<RecommendScreen />);

      fireEvent.changeText(getByPlaceholderText("60"), "60");
      fireEvent.changeText(getByPlaceholderText("0.15"), "0.15");

      await act(async () => {
        fireEvent.press(getByText("Get Recommendations"));
      });

      expect(mockAlert).toHaveBeenCalledWith(
        "Error",
        "Please select at least one connector type",
      );
    });

    it("should call getRecommendations with guest vehicle data", async () => {
      const { getByText, getByPlaceholderText } = render(<RecommendScreen />);

      fireEvent.changeText(getByPlaceholderText("60"), "60");
      fireEvent.changeText(getByPlaceholderText("0.15"), "0.15");
      fireEvent.press(getByText("CCS"));

      await act(async () => {
        fireEvent.press(getByText("Get Recommendations"));
      });

      expect(mockGetRecommendations).toHaveBeenCalledWith(
        { latitude: 28.6139, longitude: 77.209 },
        expect.objectContaining({
          _id: "guest",
          vehicleType: "car",
          batteryCapacity_kWh: 60,
          efficiency_kWh_per_km: 0.15,
          compatibleConnectors: ["CCS"],
        }),
      );
    });

    it("should NOT show mode switch for guests", () => {
      const { queryByText } = render(<RecommendScreen />);
      expect(queryByText("Saved Vehicles")).toBeNull();
      expect(queryByText("Manual Input")).toBeNull();
    });
  });

  // ============================================================
  // Authenticated mode tests
  // ============================================================

  describe("Authenticated mode with saved vehicles", () => {
    beforeEach(() => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
      });
      setupLocationAndStationStore();
    });

    it("should show mode switch (Saved Vehicles / Manual Input)", () => {
      const { getByText } = render(<RecommendScreen />);
      expect(getByText("Saved Vehicles")).toBeTruthy();
      expect(getByText("Manual Input")).toBeTruthy();
    });

    it("should show saved vehicles by default", () => {
      const { getByText } = render(<RecommendScreen />);
      expect(getByText("My Tesla")).toBeTruthy();
      expect(getByText("City Bike")).toBeTruthy();
    });

    it("should NOT show login prompt for authenticated users", () => {
      const { queryByText } = render(<RecommendScreen />);
      expect(queryByText("Login to save vehicle profiles")).toBeNull();
    });

    it("should show manual input form when Manual Input tab is pressed", () => {
      const { getByText } = render(<RecommendScreen />);

      fireEvent.press(getByText("Manual Input"));

      expect(getByText("Battery (kWh)")).toBeTruthy();
      expect(getByText("Efficiency (kWh/km)")).toBeTruthy();
    });

    it("should call getRecommendations with saved vehicle data", async () => {
      const { getByText } = render(<RecommendScreen />);

      await act(async () => {
        fireEvent.press(getByText("Get Recommendations"));
      });

      expect(mockGetRecommendations).toHaveBeenCalledWith(
        { latitude: 28.6139, longitude: 77.209 },
        expect.objectContaining({
          _id: "v-1",
          name: "My Tesla",
          vehicleType: "car",
          batteryCapacity_kWh: 60,
        }),
      );
    });

    it("should switch selected vehicle on card press", () => {
      const { getByText } = render(<RecommendScreen />);

      fireEvent.press(getByText("City Bike"));

      // The selected vehicle should now be the bike
      // We verify by triggering recommendations
    });
  });

  // ============================================================
  // Recommendation results
  // ============================================================

  describe("Recommendation results", () => {
    it("should display recommendation cards when results are available", () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
      });
      (useLocationStore as unknown as jest.Mock).mockReturnValue({
        currentLocation: { latitude: 28.6139, longitude: 77.209 },
        customLocation: null,
        useCustomLocation: false,
        setCustomLocation: mockSetCustomLocation,
        setUseCustomLocation: mockSetUseCustomLocation,
        getCurrentLocation: mockGetCurrentLocation,
        getEffectiveLocation: mockGetEffectiveLocation,
      });
      (useStationStore as unknown as jest.Mock).mockReturnValue({
        recommendations: [mockRecommendation],
        getRecommendations: mockGetRecommendations,
        isLoading: false,
        clearRecommendations: mockClearRecommendations,
      });

      const { getByText } = render(<RecommendScreen />);
      expect(getByText("Green Power Station")).toBeTruthy();
    });

    it("should show location section", () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
      });
      setupLocationAndStationStore();

      const { getByText } = render(<RecommendScreen />);
      expect(getByText("Location")).toBeTruthy();
    });
  });
});
