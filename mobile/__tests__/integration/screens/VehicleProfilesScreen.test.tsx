/**
 * Integration test for VehicleProfilesScreen
 * Tests vehicle list display, add/delete flows
 */
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import VehicleProfilesScreen from "../../../src/screens/VehicleProfilesScreen";
import { useAuthStore } from "../../../src/store/authStore";

jest.mock("../../../src/store/authStore", () => ({ useAuthStore: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockAlert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

const mockDeleteVehicle = jest.fn();

const mockUser = {
  _id: "user-1",
  name: "Test User",
  email: "test@test.com",
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
      compatibleConnectors: ["CCS", "Type2"],
    },
    {
      _id: "v-2",
      name: "Ather 450X",
      vehicleType: "bike",
      batteryCapacity_kWh: 3.7,
      efficiency_kWh_per_km: 0.03,
      batteryPercent: 65,
      compatibleConnectors: ["AC_SLOW"],
    },
  ],
  favoriteStations: [],
};

describe("VehicleProfilesScreen Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: mockUser,
      deleteVehicle: mockDeleteVehicle,
    });
  });

  it("should display all vehicles", () => {
    const { getByText } = render(<VehicleProfilesScreen />);

    expect(getByText("Tesla Model 3")).toBeTruthy();
    expect(getByText("Ather 450X")).toBeTruthy();
  });

  it("should display vehicle details", () => {
    const { getByText } = render(<VehicleProfilesScreen />);

    expect(getByText("60 kWh")).toBeTruthy();
    expect(getByText("80%")).toBeTruthy();
    expect(getByText("0.15 kWh/km")).toBeTruthy();
    expect(getByText("CCS, Type2")).toBeTruthy();
  });

  it("should show vehicle type labels", () => {
    const { getByText } = render(<VehicleProfilesScreen />);

    expect(getByText("Electric Car")).toBeTruthy();
    expect(getByText("Electric Bike")).toBeTruthy();
  });

  it("should show empty state when no vehicles", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { ...mockUser, vehicleProfiles: [] },
      deleteVehicle: mockDeleteVehicle,
    });

    const { getByText } = render(<VehicleProfilesScreen />);

    expect(getByText("No Vehicles Added")).toBeTruthy();
    expect(
      getByText(
        "Add your electric vehicle to get personalized charging recommendations",
      ),
    ).toBeTruthy();
  });

  it("should navigate to AddVehicle on FAB press", () => {
    const { getByText } = render(<VehicleProfilesScreen />);

    // The FAB renders Ionicons name="add", which our mock renders as text "add"
    fireEvent.press(getByText("add"));

    expect(mockNavigate).toHaveBeenCalledWith("AddVehicle");
  });

  it("should show delete icons for each vehicle", () => {
    const { getAllByText } = render(<VehicleProfilesScreen />);

    // The trash-outline Ionicons mock renders text "trash-outline"
    const deleteIcons = getAllByText("trash-outline");
    expect(deleteIcons.length).toBe(2); // one per vehicle
  });

  it("should navigate to EditVehicle screen", () => {
    const { getAllByText } = render(<VehicleProfilesScreen />);

    const editButtons = getAllByText("Edit Vehicle");
    fireEvent.press(editButtons[0]!);

    expect(mockNavigate).toHaveBeenCalledWith("EditVehicle", {
      vehicleId: "v-1",
    });
  });
});
