import { api } from "@/services/api";
import type {
  NearbyStationsResponse,
  NominatimResult,
  RouteRecommendationRequest,
  RouteRecommendationResponse,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Query keys for cache management
export const queryKeys = {
  nearbyStations: (lng: number, lat: number, radius: number) =>
    ["nearbyStations", lng, lat, radius] as const,
  placeSearch: (query: string) => ["placeSearch", query] as const,
  recommendations: ["recommendations"] as const,
};

/**
 * Hook to fetch nearby stations
 */
export function useNearbyStations(
  longitude: number | undefined,
  latitude: number | undefined,
  radius: number = 5,
  enabled: boolean = true,
) {
  return useQuery<NearbyStationsResponse, Error>({
    queryKey: queryKeys.nearbyStations(longitude ?? 0, latitude ?? 0, radius),
    queryFn: () => api.getNearbyStations(longitude!, latitude!, radius),
    enabled: enabled && longitude !== undefined && latitude !== undefined,
    staleTime: 1000 * 60 * 2, // 2 minutes for location-based data
  });
}

/**
 * Hook to search places using Nominatim
 */
export function usePlaceSearch(query: string, enabled: boolean = true) {
  return useQuery<NominatimResult[], Error>({
    queryKey: queryKeys.placeSearch(query),
    queryFn: () => api.searchPlaces(query),
    enabled: enabled && query.length >= 3,
    staleTime: 1000 * 60 * 10, // 10 minutes for place searches
  });
}

/**
 * Hook to get route-aware recommendations (mutation)
 */
export function useRouteRecommendations() {
  const queryClient = useQueryClient();

  return useMutation<
    RouteRecommendationResponse,
    Error,
    RouteRecommendationRequest
  >({
    mutationFn: (request) => api.getRouteRecommendations(request),
    onSuccess: () => {
      // Invalidate nearby stations cache when we get new recommendations
      queryClient.invalidateQueries({ queryKey: ["nearbyStations"] });
    },
  });
}

/**
 * Hook to invalidate and refetch nearby stations
 */
export function useRefreshNearbyStations() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["nearbyStations"] });
  };
}
