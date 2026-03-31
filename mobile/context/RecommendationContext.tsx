import React, { createContext, useContext, useState, ReactNode } from "react";
import type {
  VehicleProfile,
  GeoLocation,
  Preferences,
  RecommendedStation,
  RouteInfo,
  GeoPolygon,
  NearbyStation,
} from "../types";

interface RecommendationContextType {
  // Flow data
  vehicleProfile: VehicleProfile | null;
  destination: GeoLocation | null;
  preferences: Preferences | null;

  // Map settings
  radius: number;
  routeOffsetKm: number;

  // Results
  recommendations: RecommendedStation[] | null;
  routeInfo: RouteInfo | null;
  searchArea: GeoPolygon | null;

  // Nearby stations (for stations tab)
  nearbyStations: NearbyStation[];

  // Actions
  setVehicleProfile: (profile: VehicleProfile) => void;
  setDestination: (dest: GeoLocation) => void;
  setPreferences: (prefs: Preferences) => void;
  setRadius: (radius: number) => void;
  setRouteOffsetKm: (offset: number) => void;
  setResults: (
    recommendations: RecommendedStation[],
    routeInfo: RouteInfo,
    searchArea: GeoPolygon,
  ) => void;
  setNearbyStations: (stations: NearbyStation[]) => void;
  clearAll: () => void;
  hasResults: boolean;
}

const RecommendationContext = createContext<
  RecommendationContextType | undefined
>(undefined);

export function RecommendationProvider({ children }: { children: ReactNode }) {
  const [vehicleProfile, setVehicleProfileState] =
    useState<VehicleProfile | null>(null);
  const [destination, setDestinationState] = useState<GeoLocation | null>(null);
  const [preferences, setPreferencesState] = useState<Preferences | null>(null);
  const [radius, setRadiusState] = useState(5);
  const [routeOffsetKm, setRouteOffsetKmState] = useState(5);
  const [recommendations, setRecommendations] = useState<
    RecommendedStation[] | null
  >(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [searchArea, setSearchArea] = useState<GeoPolygon | null>(null);
  const [nearbyStations, setNearbyStationsState] = useState<NearbyStation[]>(
    [],
  );

  const setVehicleProfile = (profile: VehicleProfile) => {
    setVehicleProfileState(profile);
  };

  const setDestination = (dest: GeoLocation) => {
    setDestinationState(dest);
  };

  const setPreferences = (prefs: Preferences) => {
    setPreferencesState(prefs);
  };

  const setRadius = (r: number) => {
    setRadiusState(r);
  };

  const setRouteOffsetKm = (offset: number) => {
    setRouteOffsetKmState(offset);
  };

  const setResults = (
    recs: RecommendedStation[],
    route: RouteInfo,
    area: GeoPolygon,
  ) => {
    setRecommendations(recs);
    setRouteInfo(route);
    setSearchArea(area);
  };

  const setNearbyStations = (stations: NearbyStation[]) => {
    setNearbyStationsState(stations);
  };

  const clearAll = () => {
    setVehicleProfileState(null);
    setDestinationState(null);
    setPreferencesState(null);
    setRecommendations(null);
    setRouteInfo(null);
    setSearchArea(null);
  };

  return (
    <RecommendationContext.Provider
      value={{
        vehicleProfile,
        destination,
        preferences,
        radius,
        routeOffsetKm,
        recommendations,
        routeInfo,
        searchArea,
        nearbyStations,
        setVehicleProfile,
        setDestination,
        setPreferences,
        setRadius,
        setRouteOffsetKm,
        setResults,
        setNearbyStations,
        clearAll,
        hasResults: recommendations !== null,
      }}
    >
      {children}
    </RecommendationContext.Provider>
  );
}

export function useRecommendation() {
  const context = useContext(RecommendationContext);
  if (context === undefined) {
    throw new Error(
      "useRecommendation must be used within a RecommendationProvider",
    );
  }
  return context;
}
