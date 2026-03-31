// API endpoints - Update this to your backend URL
export const API_BASE_URL = "https://0s2djcq5-3000.inc1.devtunnels.ms/api/v1";

// Default values
export const DEFAULT_RADIUS_KM = 5;
export const DEFAULT_ROUTE_OFFSET_KM = 5;
export const DEFAULT_BATTERY_PERCENT = 30;

// Radius options for nearby stations search
export const RADIUS_OPTIONS = [5, 10, 20] as const;

// Vehicle type options
export const VEHICLE_TYPES = [
  { value: "car" as const, label: "Car" },
  { value: "bike" as const, label: "Bike" },
];

// Connector options
export const CONNECTOR_OPTIONS = [
  { value: "CCS" as const, label: "CCS", forVehicle: "car" as const },
  { value: "Type2" as const, label: "Type 2", forVehicle: "car" as const },
  { value: "CHAdeMO" as const, label: "CHAdeMO", forVehicle: "car" as const },
  { value: "AC_SLOW" as const, label: "AC Slow", forVehicle: "bike" as const },
];

// Validation constants
export const VALIDATION = {
  batteryCapacity: {
    min: 0,
    max: 200,
  },
  efficiency: {
    min: 0,
    max: 1,
  },
  batteryPercent: {
    min: 0,
    max: 100,
  },
  routeOffset: {
    min: 0,
    max: 50,
  },
};

// Search debounce delay (ms)
export const SEARCH_DEBOUNCE_MS = 500;

// Nominatim API settings
export const NOMINATIM_CONFIG = {
  baseUrl: "https://nominatim.openstreetmap.org/search",
  defaultCountryCodes: "np", // Nepal - change as needed
  defaultFormat: "json",
  defaultLimit: 5,
};
