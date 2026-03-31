import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import * as Location from "expo-location";
import type { GeoLocation } from "../types";

interface LocationContextType {
  location: GeoLocation | null;
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(
  undefined,
);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      setLocation({
        longitude: loc.coords.longitude,
        latitude: loc.coords.latitude,
      });
    } catch (err) {
      setError("Failed to get current location");
      console.error("Location error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setHasPermission(granted);

      if (granted) {
        await getCurrentLocation();
      } else {
        setError("Location permission denied");
      }

      return granted;
    } catch (err) {
      setError("Failed to request permission");
      console.error("Permission error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentLocation]);

  const refreshLocation = useCallback(async () => {
    if (hasPermission) {
      await getCurrentLocation();
    }
  }, [hasPermission, getCurrentLocation]);

  // Check permission and get location on mount
  useEffect(() => {
    const initLocation = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        const granted = status === "granted";
        setHasPermission(granted);

        if (granted) {
          await getCurrentLocation();
        } else {
          // Request permission if not granted
          await requestPermission();
        }
      } catch (err) {
        setError("Failed to initialize location");
        setIsLoading(false);
      }
    };

    initLocation();
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        hasPermission,
        isLoading,
        error,
        requestPermission,
        refreshLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
