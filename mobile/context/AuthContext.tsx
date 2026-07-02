import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authService, type AuthResponse, type AuthUser } from "@/services/auth";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role?: string,
    company?: string,
    phone?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = "evolt.auth.token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistAuth = async (authData: AuthResponse) => {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, authData.token);
    setToken(authData.token);
    setUser(authData.user);
  };

  const clearAuth = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (!storedToken) {
          setIsLoading(false);
          return;
        }

        const response = await authService.getCurrentUser(storedToken);
        setToken(storedToken);
        setUser(response.data.user);
      } catch (error) {
        await clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    const authData = await authService.login(email, password);
    await persistAuth(authData);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: string = "user",
    company?: string,
    phone?: string,
  ) => {
    const authData = await authService.register(
      name,
      email,
      password,
      role,
      company,
      phone,
    );
    await persistAuth(authData);
  };

  const logout = async () => {
    await clearAuth();
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      register,
      logout,
    }),
    [user, token, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
