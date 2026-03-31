// Vehicle Types
export type VehicleType = "bike" | "car";
export type ConnectorType = "AC_SLOW" | "Type2" | "CCS" | "CHAdeMO";

// Operating Hours
export interface OperatingHours {
  type: "24/7" | "custom";
  openTime?: string; // HH:mm format
  closeTime?: string; // HH:mm format
  weekdayHours?: OperatingHours;
  weekendHours?: OperatingHours;
}

// Location
export interface GeoLocation {
  longitude: number;
  latitude: number;
}

// Vehicle Profile
export interface VehicleProfile {
  vehicleType: VehicleType;
  batteryCapacity_kWh: number;
  efficiency_kWh_per_km: number;
  batteryPercent: number;
  compatibleConnectors: ConnectorType[];
}

// Preferences
export interface Preferences {
  preferredConnector?: ConnectorType;
  preferFastCharging: boolean;
}

// Route Recommendation Request
export interface RouteRecommendationRequest {
  vehicleProfile: VehicleProfile;
  currentLocation: GeoLocation;
  destination: GeoLocation;
  routeOffsetKm: number;
  preferences?: Preferences;
  limit?: number;
}

// Station Port
export interface Port {
  connectorType: ConnectorType;
  vehicleType: VehicleType;
  powerKW: number;
  total: number;
  occupied: number;
  pricePerKWh: number;
}

// Nearby Station Response
export interface NearbyStation {
  stationId: string;
  name: string;
  address: string;
  distanceKm: number;
  status: string;
  operatingHours?: OperatingHours; // Make optional temporarily
  images?: string[]; // Cloudinary URLs
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  portSummary: {
    bikePorts: number;
    carPorts: number;
  };
}

// Recommended Station
export interface RecommendedStation {
  stationId: string;
  stationName: string;
  address: string;
  recommendedPort: ConnectorType;
  powerKW: number;
  pricePerKWh: number;
  freeSlots: number;
  totalSlots: number;
  estimatedWaitMinutes: number;
  distanceKm: number;
  drivingDurationMinutes?: number;
  estimatedCost: number;
  estimatedChargeTimeMinutes: number;
  score: number;
  operatingHours?: OperatingHours; // Make optional temporarily
  images?: string[]; // Cloudinary URLs
  location: {
    longitude: number;
    latitude: number;
  };
}

// Route Info from backend
export interface RouteInfo {
  totalDistanceKm: number;
  totalDurationMinutes: number;
  routeOffsetKm: number;
  stationsFound: number;
  polyline: [number, number][];
}

// GeoJSON Polygon
export interface GeoPolygon {
  type: "Polygon";
  coordinates: [number, number][][];
}

// Route Recommendation Response
export interface RouteRecommendationResponse {
  status: string;
  results: number;
  data: {
    recommendations: RecommendedStation[];
    routeInfo: RouteInfo;
    searchArea: GeoPolygon;
    meta: {
      vehicleType: VehicleType;
      batteryPercent: number;
      from: GeoLocation;
      to: GeoLocation;
    };
  };
}

// Nearby Stations Response
export interface NearbyStationsResponse {
  status: string;
  results: number;
  data: {
    stations: NearbyStation[];
    meta: {
      searchRadius: number;
      vehicleType: string;
    };
  };
}

// Recommendation flow state
export interface RecommendationFlowState {
  vehicleProfile?: VehicleProfile;
  destination?: GeoLocation;
  preferences?: Preferences;
}

// Nominatim search result
export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}
