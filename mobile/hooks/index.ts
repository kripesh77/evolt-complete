import type { ConnectorType } from "@/types";
import { useCallback, useRef } from "react";

// Re-export API hooks
export * from "./useApi";

export function useVehicleFormValidation() {
  const validate = (
    batteryCapacity: string,
    efficiency: string,
    batteryPercent: string,
    selectedConnectors: ConnectorType[],
  ): Record<string, string> => {
    const errors: Record<string, string> = {};

    const capacity = parseFloat(batteryCapacity);
    if (isNaN(capacity) || capacity <= 0 || capacity > 200) {
      errors.batteryCapacity = "Battery capacity must be between 0 and 200 kWh";
    }

    const eff = parseFloat(efficiency);
    if (isNaN(eff) || eff <= 0 || eff > 1) {
      errors.efficiency = "Efficiency must be between 0 and 1 kWh/km";
    }

    const percent = parseFloat(batteryPercent);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      errors.batteryPercent = "Battery percent must be between 0 and 100";
    }

    if (selectedConnectors.length === 0) {
      errors.connectors = "Select at least one connector type";
    }

    return errors;
  };

  return { validate };
}

export function useDestinationValidation() {
  const validate = (
    latitude: number,
    longitude: number,
  ): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      errors.latitude = "Invalid latitude";
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      errors.longitude = "Invalid longitude";
    }

    return errors;
  };

  return { validate };
}

export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  );
}
