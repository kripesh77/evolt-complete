/**
 * Integration test for StationDetailsScreen
 * Tests station data display, favorite toggle, directions
 */
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { Linking, Alert } from "react-native";
import StationDetailsScreen from "../../../src/screens/StationDetailsScreen";
import { useStationStore } from "../../../src/store/stationStore";
import { useAuthStore } from "../../../src/store/authStore";

jest.mock("../../../src/store/stationStore", () => ({
  useStationStore: jest.fn(),
}));
jest.mock("../../../src/store/authStore", () => ({ useAuthStore: jest.fn() }));

// Mock WebViewMap component
jest.mock("../../../src/components/WebViewMap", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef((props, ref) =>
      React.createElement(View, { testID: "web-view-map" }),
    ),
  };
});

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { stationId: "station-1" } }),
}));

const mockAlert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

jest.spyOn(Linking, "openURL").mockImplementation(() => Promise.resolve(true));

const mockFetchStation = jest.fn();
const mockAddFavorite = jest.fn();
const mockRemoveFavorite = jest.fn();

const mockStation = {
  _id: "station-1",
  name: "Green Power Station",
  location: { type: "Point", coordinates: [77.209, 28.6139] },
  address: "123 Test Street, Delhi",
  ports: [
    {
      connectorType: "CCS",
      vehicleType: "car",
      powerKW: 50,
      total: 4,
      occupied: 1,
      pricePerKWh: 15,
    },
    {
      connectorType: "Type2",
      vehicleType: "car",
      powerKW: 22,
      total: 2,
      occupied: 0,
      pricePerKWh: 12,
    },
  ],
  operatingHours: "24/7",
  status: "active",
};

const mockUser = {
  _id: "user-1",
  name: "Test User",
  email: "test@test.com",
  role: "user",
  isActive: true,
  vehicleProfiles: [],
  favoriteStations: [],
};

describe("StationDetailsScreen Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchStation.mockResolvedValue(mockStation);

    (useStationStore as unknown as jest.Mock).mockReturnValue({
      selectedStation: mockStation,
      fetchStation: mockFetchStation,
      isLoading: false,
      error: null,
    });

    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: mockUser,
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite,
    });
  });

  it("should display station name and address", () => {
    const { getByText } = render(<StationDetailsScreen />);

    expect(getByText("Green Power Station")).toBeTruthy();
    expect(getByText("123 Test Street, Delhi")).toBeTruthy();
  });

  it("should display station status", () => {
    const { getByText } = render(<StationDetailsScreen />);
    expect(getByText("Active")).toBeTruthy();
  });

  it("should show available ports count", () => {
    const { getByText } = render(<StationDetailsScreen />);

    // Total: 4+2=6, Occupied: 1+0=1, Available: 5
    expect(getByText("5")).toBeTruthy();
    // Total ports
    expect(getByText("6")).toBeTruthy();
  });

  it("should display port cards", () => {
    const { getByText } = render(<StationDetailsScreen />);

    expect(getByText("CCS")).toBeTruthy();
    expect(getByText("Type2")).toBeTruthy();
    expect(getByText("50 kW")).toBeTruthy();
    expect(getByText("22 kW")).toBeTruthy();
  });

  it("should display port prices", () => {
    const { getByText } = render(<StationDetailsScreen />);

    expect(getByText("₹15/kWh")).toBeTruthy();
    expect(getByText("₹12/kWh")).toBeTruthy();
  });

  it("should display operating hours", () => {
    const { getByText } = render(<StationDetailsScreen />);
    expect(getByText("24/7")).toBeTruthy();
  });

  it("should show port availability", () => {
    const { getByText } = render(<StationDetailsScreen />);

    // CCS: 3/4 available
    expect(getByText("3/4")).toBeTruthy();
    // Type2: 2/2 available
    expect(getByText("2/2")).toBeTruthy();
  });

  it("should open directions", () => {
    const { getByText } = render(<StationDetailsScreen />);

    fireEvent.press(getByText("Get Directions"));

    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://www.google.com/maps/dir/?api=1&destination=28.6139,77.209",
    );
  });

  it("should fetch station on mount", () => {
    render(<StationDetailsScreen />);
    expect(mockFetchStation).toHaveBeenCalledWith("station-1");
  });

  it("should show loading state", () => {
    (useStationStore as unknown as jest.Mock).mockReturnValue({
      selectedStation: null,
      fetchStation: mockFetchStation,
      isLoading: true,
      error: null,
    });

    const { UNSAFE_getByType } = render(<StationDetailsScreen />);
    // ActivityIndicator should be rendered
  });

  it("should show error state", () => {
    (useStationStore as unknown as jest.Mock).mockReturnValue({
      selectedStation: null,
      fetchStation: mockFetchStation,
      isLoading: false,
      error: "Station not found",
    });

    const { getByText } = render(<StationDetailsScreen />);
    expect(getByText("Station not found")).toBeTruthy();
    expect(getByText("Retry")).toBeTruthy();
  });

  it("should retry fetch on error", () => {
    (useStationStore as unknown as jest.Mock).mockReturnValue({
      selectedStation: null,
      fetchStation: mockFetchStation,
      isLoading: false,
      error: "Station not found",
    });

    const { getByText } = render(<StationDetailsScreen />);
    fireEvent.press(getByText("Retry"));

    // fetchStation should be called again (initial + retry)
    expect(mockFetchStation).toHaveBeenCalledTimes(2);
  });

  it("should display port types count", () => {
    const { getByText } = render(<StationDetailsScreen />);
    expect(getByText("2")).toBeTruthy(); // 2 port types
    expect(getByText("Port Types")).toBeTruthy();
  });
});
