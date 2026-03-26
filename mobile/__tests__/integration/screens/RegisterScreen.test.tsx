/**
 * Integration test for RegisterScreen
 * Tests registration flow: validation, submission, navigation
 */
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import RegisterScreen from "../../../src/screens/RegisterScreen";
import { useAuthStore } from "../../../src/store/authStore";

const mockRegister = jest.fn();
const mockClearError = jest.fn();

jest.mock("../../../src/store/authStore", () => ({
  useAuthStore: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const mockAlert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

describe("RegisterScreen Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      register: mockRegister,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    });
  });

  // Helper: "Create Account" appears both as the page title and button text.
  // getAllByText returns them in document order; the last one is the button.
  const pressCreateAccount = (getAllByText: Function) => {
    const els = getAllByText("Create Account");
    fireEvent.press(els[els.length - 1]!);
  };

  it("should render all registration fields", () => {
    const { getByPlaceholderText, getAllByText, getByText } = render(
      <RegisterScreen />,
    );

    expect(getByPlaceholderText("Full Name")).toBeTruthy();
    expect(getByPlaceholderText("Email")).toBeTruthy();
    expect(getByPlaceholderText("Password")).toBeTruthy();
    expect(getByPlaceholderText("Confirm Password")).toBeTruthy();
    expect(getAllByText("Create Account").length).toBeGreaterThanOrEqual(1);
    expect(getByText("Login")).toBeTruthy();
  });

  it("should show alert when fields are empty", async () => {
    const { getAllByText } = render(<RegisterScreen />);

    await act(async () => {
      pressCreateAccount(getAllByText);
    });

    expect(mockAlert).toHaveBeenCalledWith(
      "Error",
      "Please fill in all fields",
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("should show alert when passwords don't match", async () => {
    const { getByPlaceholderText, getAllByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText("Full Name"), "Test User");
    fireEvent.changeText(getByPlaceholderText("Email"), "test@test.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "password123");
    fireEvent.changeText(
      getByPlaceholderText("Confirm Password"),
      "password456",
    );

    await act(async () => {
      pressCreateAccount(getAllByText);
    });

    expect(mockAlert).toHaveBeenCalledWith("Error", "Passwords do not match");
  });

  it("should show alert when password is too short", async () => {
    const { getByPlaceholderText, getAllByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText("Full Name"), "Test User");
    fireEvent.changeText(getByPlaceholderText("Email"), "test@test.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "short");
    fireEvent.changeText(getByPlaceholderText("Confirm Password"), "short");

    await act(async () => {
      pressCreateAccount(getAllByText);
    });

    expect(mockAlert).toHaveBeenCalledWith(
      "Error",
      "Password must be at least 8 characters",
    );
  });

  it("should call register with correct data", async () => {
    mockRegister.mockResolvedValue(undefined);
    const { getByPlaceholderText, getAllByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText("Full Name"), "  Test User  ");
    fireEvent.changeText(getByPlaceholderText("Email"), "  Test@Test.com  ");
    fireEvent.changeText(getByPlaceholderText("Password"), "password123");
    fireEvent.changeText(
      getByPlaceholderText("Confirm Password"),
      "password123",
    );

    await act(async () => {
      pressCreateAccount(getAllByText);
    });

    expect(mockRegister).toHaveBeenCalledWith(
      "Test User",
      "test@test.com",
      "password123",
      "password123",
    );
  });

  it("should show alert on registration failure", async () => {
    mockRegister.mockRejectedValue(new Error("Email already exists"));
    const { getByPlaceholderText, getAllByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText("Full Name"), "Test User");
    fireEvent.changeText(getByPlaceholderText("Email"), "existing@test.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "password123");
    fireEvent.changeText(
      getByPlaceholderText("Confirm Password"),
      "password123",
    );

    await act(async () => {
      pressCreateAccount(getAllByText);
    });

    expect(mockAlert).toHaveBeenCalledWith(
      "Registration Failed",
      "Email already exists",
    );
  });

  it("should navigate back to login", () => {
    const { getByText } = render(<RegisterScreen />);

    fireEvent.press(getByText("Login"));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it("should clear error when typing", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      register: mockRegister,
      isLoading: false,
      error: "Some existing error",
      clearError: mockClearError,
    });

    const { getByPlaceholderText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText("Full Name"), "a");

    expect(mockClearError).toHaveBeenCalled();
  });
});
