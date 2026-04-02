import { PermissionPrompt } from "@/components/common/PermissionPrompt";
import {
  BottomActionButton,
  LoadingIndicatorOverlay,
} from "@/components/maps/MapOverlays";
import { RadiusSelector } from "@/components/maps/RadiusSelector";
import { useLocation } from "@/context/LocationContext";
import { useRecommendation } from "@/context/RecommendationContext";
import { useNearbyStations } from "@/hooks/useApi";
import { colors, spacing } from "@/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import styled from "styled-components/native";

const Container = styled.View`
  flex: 1;
`;

const Map = styled(MapView)`
  flex: 1;
`;

const StationCountContainer = styled.View`
  position: absolute;
  top: 60px;
  right: ${spacing.lg}px;
  background-color: ${colors.background.default};
  padding: ${spacing.sm}px ${spacing.md}px;
  border-radius: 8px;
  elevation: 3;
`;

const StationCountText = styled.Text`
  font-size: 12px;
  color: ${colors.text.primary};
  font-weight: 500;
`;

const ResultsInfoContainer = styled.View`
  position: absolute;
  top: 60px;
  right: ${spacing.lg}px;
  background-color: ${colors.background.default};
  padding: ${spacing.md}px ${spacing.lg}px;
  border-radius: 8px;
  elevation: 3;
`;

const ResultsInfoTitle = styled.Text`
  font-size: 14px;
  color: ${colors.primary};
  font-weight: 600;
`;

const ResultsInfoSubtitle = styled.Text`
  font-size: 12px;
  color: ${colors.text.secondary};
  margin-top: ${spacing.xs}px;
`;

const ButtonsContainer = styled.View`
  position: absolute;
  bottom: 40px;
  left: 0;
  right: 0;
  align-items: center;
`;

export default function HomeScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { location, hasPermission, isLoading, requestPermission } =
    useLocation();
  const {
    hasResults,
    routeInfo,
    searchArea,
    recommendations,
    clearAll,
    radius,
    setRadius,
    setNearbyStations,
  } = useRecommendation();

  // Use React Query for fetching nearby stations
  const {
    data: nearbyStationsData,
    isLoading: loadingStations,
    refetch: refetchStations,
  } = useNearbyStations(
    location?.longitude,
    location?.latitude,
    radius,
    hasPermission && !hasResults && !!location,
  );

  const nearbyStations = nearbyStationsData?.data?.stations ?? [];

  // Sync nearby stations to context for use in stations tab
  useEffect(() => {
    if (nearbyStations.length > 0) {
      setNearbyStations(nearbyStations);
    }
  }, [nearbyStations, setNearbyStations]);

  // Center map on route when results are available
  useEffect(() => {
    if (hasResults && routeInfo?.polyline && mapRef.current) {
      const coordinates = routeInfo.polyline.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true,
      });
    }
  }, [hasResults, routeInfo]);

  const handleClearResults = () => {
    clearAll();
    refetchStations();
  };

  if (isLoading) {
    return (
      <Container>
        <PermissionPrompt
          title="Getting your location..."
          subtitle=""
          buttonText=""
          onPress={() => {}}
          isLoading={true}
        />
      </Container>
    );
  }

  if (!hasPermission) {
    return (
      <Container>
        <PermissionPrompt
          title="Location Access Required"
          subtitle="We need your location to find nearby EV charging stations"
          buttonText="Grant Location Access"
          onPress={requestPermission}
        />
      </Container>
    );
  }

  const initialRegion = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: 27.7172,
        longitude: 85.324,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

  const polygonCoordinates = searchArea?.coordinates[0]?.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));

  const polylineCoordinates = routeInfo?.polyline.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));

  return (
    <Container>
      <Map
        ref={mapRef}
        initialRegion={initialRegion}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton
      >
        {hasResults && polygonCoordinates && (
          <Polygon
            coordinates={polygonCoordinates}
            fillColor="rgba(76, 175, 80, 0.2)"
            strokeColor="rgba(76, 175, 80, 0.8)"
            strokeWidth={2}
          />
        )}

        {hasResults && polylineCoordinates && (
          <Polyline
            coordinates={polylineCoordinates}
            strokeColor="#2196F3"
            strokeWidth={4}
          />
        )}

        {hasResults &&
          recommendations?.map((station) => (
            <Marker
              key={station.stationId}
              coordinate={{
                latitude: station.location.latitude,
                longitude: station.location.longitude,
              }}
              title={station.stationName}
              description={`${station.distanceKm.toFixed(1)} km • Score: ${(station.score * 100).toFixed(0)}%`}
              pinColor="#4CAF50"
              onCalloutPress={() =>
                router.push({
                  pathname: "/stations/[stationId]",
                  params: {
                    stationId: station.stationId,
                    isRecommended: "true",
                  },
                })
              }
            />
          ))}

        {!hasResults &&
          nearbyStations.map((station) => (
            <Marker
              key={station.stationId}
              coordinate={{
                latitude: station.location.coordinates[1],
                longitude: station.location.coordinates[0],
              }}
              title={station.name}
              description={station.address}
              pinColor="#FF5722"
              onCalloutPress={() =>
                router.push({
                  pathname: "/stations/[stationId]",
                  params: {
                    stationId: station.stationId,
                    isRecommended: "false",
                  },
                })
              }
            />
          ))}
      </Map>

      {!hasResults && (
        <RadiusSelector selectedRadius={radius} onRadiusChange={setRadius} />
      )}

      {loadingStations && !hasResults && (
        <LoadingIndicatorOverlay text="Loading stations..." />
      )}

      {!hasResults && nearbyStations.length > 0 && (
        <StationCountContainer>
          <StationCountText>
            {nearbyStations.length} station
            {nearbyStations.length !== 1 ? "s" : ""} nearby
          </StationCountText>
        </StationCountContainer>
      )}

      {hasResults && (
        <ResultsInfoContainer>
          <ResultsInfoTitle>
            {recommendations?.length} stations along route
          </ResultsInfoTitle>
          <ResultsInfoSubtitle>
            {routeInfo?.totalDistanceKm.toFixed(1)} km •{" "}
            {Math.round(routeInfo?.totalDurationMinutes || 0)} min
          </ResultsInfoSubtitle>
        </ResultsInfoContainer>
      )}

      <ButtonsContainer>
        {hasResults ? (
          <BottomActionButton
            text="Clear & Go Back"
            onPress={handleClearResults}
          />
        ) : (
          <BottomActionButton
            text="Get Recommendation"
            onPress={() => router.push("/vehicleInfo")}
          />
        )}
      </ButtonsContainer>
    </Container>
  );
}
