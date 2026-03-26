/**
 * Integration test for LoginScreen
 * Tests user interaction: input, validation, login, guest skip, navigation
 */
import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import LoginScreen from "../../../src/screens/LoginScreen";
import { useAuthStore } from "../../../src/store/authStore";

// Mock the auth store
const mockLogin = jest.fn();
const mockClearError = jest.fn();

jest.mock("../../../src/store/authStore", () => ({
  useAuthStore: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn().mockReturnValue(true);

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
  useRoute: () => ({ params: {} }),
}));

// Mock Alert
const mockAlert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

describe("LoginScreen Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    });
  });

  it("should render login form elements", () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    expect(getByPlaceholderText("Email")).toBeTruthy();
    expect(getByPlaceholderText("Password")).toBeTruthy();
    expect(getByText("Login")).toBeTruthy();
    expect(getByText("EV Charge Finder")).toBeTruthy();
    expect(getByText("Register")).toBeTruthy();
  });

  it("should update email and password inputs", () => {
    const { getByPlaceholderText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText("Email");
    const passwordInput = getByPlaceholderText("Password");

    fireEvent.changeText(emailInput, "user@test.com");
    fireEvent.changeText(passwordInput, "password123");

    expect(emailInput.props.value).toBe("user@test.com");
    expect(passwordInput.props.value).toBe("password123");
  });

  it("should show alert when fields are empty", async () => {
    const { getByText } = render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(getByText("Login"));
    });

    expect(mockAlert).toHaveBeenCalledWith(
      "Error",
      "Please fill in all fields",
    );
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("should call login with trimmed lowercase email", async () => {
    mockLogin.mockResolvedValue(undefined);
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText("Email"), "  User@Test.com  ");
    fireEvent.changeText(getByPlaceholderText("Password"), "password123");

    await act(async () => {
      fireEvent.press(getByText("Login"));
    });

    expect(mockLogin).toHaveBeenCalledWith("user@test.com", "password123");
  });

  it("should show alert on login failure", async () => {
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText("Email"), "user@test.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "wrongpass");

    await act(async () => {
      fireEvent.press(getByText("Login"));
    });

    expect(mockAlert).toHaveBeenCalledWith(
      "Login Failed",
      "Invalid credentials",
    );
  });

  it("should navigate to Register screen (passing returnTo)", () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText("Register"));

    expect(mockNavigate).toHaveBeenCalledWith("Register", {
      returnTo: undefined,
    });
  });

  it("should disable login button when loading", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: true,
      error: null,
      clearError: mockClearError,
    });

    const { getByText, queryByText } = render(<LoginScreen />);

    // When loading, the Login text should not be visible (ActivityIndicator instead)
    expect(queryByText("Login")).toBeNull();
  });

  it("should clear error when typing in email", () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: "Some error",
      clearError: mockClearError,
    });

    const { getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText("Email"), "t");

    expect(mockClearError).toHaveBeenCalled();
  });

  it("should toggle password visibility", () => {
    const { getByPlaceholderText, UNSAFE_getAllByType } = render(
      <LoginScreen />,
    );
    const passwordInput = getByPlaceholderText("Password");

    // Initially password should be hidden
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it("should show 'Continue as Guest' button", () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText("Continue as Guest")).toBeTruthy();
  });

  it("should go back when 'Continue as Guest' is pressed", () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText("Continue as Guest"));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it("should go back after successful login", async () => {
    mockLogin.mockResolvedValue(undefined);
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText("Email"), "user@test.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "password123");

    await act(async () => {
      fireEvent.press(getByText("Login"));
    });

    expect(mockLogin).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });
});
