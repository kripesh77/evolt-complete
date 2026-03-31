import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import styled from "styled-components/native";
import { api, RouteToStationResponse } from "@/services/api";
import { socketService, OccupancyChangedPayload } from "@/services/socket";
import { colors, spacing, typography } from "@/theme";

const Container = styled.View`
  flex: 1;
  background-color: ${colors.background.default};
`;

const MapContainer = styled.View`
  flex: 1;
`;

const LoadingOverlay = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const LoadingText = styled.Text`
  margin-top: ${spacing.md}px;
  font-size: ${typography.sizes.md}px;
  color: ${colors.text.secondary};
`;

// Bottom Card Overlay
const CardOverlay = styled.View`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: ${colors.background.secondary};
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: ${spacing.lg}px;
  shadow-color: #000;
  shadow-offset: 0px -2px;
  shadow-opacity: 0.1;
  shadow-radius: 8px;
  elevation: 5;
`;

const CardHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing.md}px;
`;

const StationName = styled.Text`
  font-size: ${typography.sizes.lg}px;
  font-weight: 600;
  color: ${colors.text.primary};
  flex: 1;
`;

const CloseButton = styled.TouchableOpacity`
  padding: ${spacing.xs}px;
`;

const RouteInfo = styled.View`
  flex-direction: row;
  gap: ${spacing.lg}px;
  margin-bottom: ${spacing.md}px;
`;

const InfoItem = styled.View`
  flex: 1;
  align-items: center;
`;

const InfoValue = styled.Text`
  font-size: ${typography.sizes.xl}px;
  font-weight: bold;
  color: ${colors.primary};
`;

const InfoLabel = styled.Text`
  font-size: ${typography.sizes.xs}px;
  color: ${colors.text.secondary};
  margin-top: ${spacing.xs}px;
`;

const PortsSection = styled.View`
  margin-top: ${spacing.md}px;
`;

const SectionTitle = styled.Text`
  font-size: ${typography.sizes.sm}px;
  font-weight: 600;
  color: ${colors.text.primary};
  margin-bottom: ${spacing.sm}px;
`;

const PortItem = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-vertical: ${spacing.sm}px;
  border-bottom-width: 1px;
  border-bottom-color: ${colors.border};
`;

const PortInfo = styled.View`
  flex: 1;
`;

const PortType = styled.Text`
  font-size: ${typography.sizes.sm}px;
  font-weight: 500;
  color: ${colors.text.primary};
`;

const PortDetails = styled.Text`
  font-size: ${typography.sizes.xs}px;
  color: ${colors.text.secondary};
  margin-top: 2px;
`;

const PortOccupancy = styled.View<{ hasSlots: boolean }>`
  flex-direction: row;
  align-items: center;
  padding: ${spacing.xs}px ${spacing.sm}px;
  background-color: ${({ hasSlots }) =>
    hasSlots ? "rgba(46, 125, 50, 0.1)" : "rgba(198, 40, 40, 0.1)"};
  border-radius: 12px;
`;

const OccupancyText = styled.Text<{ hasSlots: boolean }>`
  font-size: ${typography.sizes.sm}px;
  font-weight: 600;
  color: ${({ hasSlots }) => (hasSlots ? "#2E7D32" : "#C62828")};
  margin-left: ${spacing.xs}px;
`;

interface Port {
  connectorType: string;
  vehicleType: string;
  powerKW: number;
  total: number;
  occupied: number;
  pricePerKWh: number;
}

export default function NavigationScreen() {
  const router = useRouter();
  const { stationId, stationName, latitude, longitude } = useLocalSearchParams<{
    stationId: string;
    stationName: string;
    latitude: string;
    longitude: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [routeData, setRouteData] = useState<
    RouteToStationResponse["data"] | null
  >(null);
  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);
  const [ports, setPorts] = useState<Port[]>([]);
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );

  // Parse station coordinates
  const stationCoords = {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
  };

  // Initialize: Get route and setup location tracking
  useEffect(() => {
    initializeNavigation();
    return () => cleanup();
  }, [stationId]);

  const initializeNavigation = async () => {
    try {
      setIsLoading(true);

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location permission is required for navigation.",
          [{ text: "OK", onPress: () => router.back() }],
        );
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation(currentLocation);

      // Fetch route from backend
      const route = await api.getRouteToStation(
        stationId,
        currentLocation.coords.longitude,
        currentLocation.coords.latitude,
      );
      setRouteData(route.data);
      setPorts(route.data.ports);

      // Start location tracking (5 second interval)
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // 5 seconds
          distanceInterval: 10, // or 10 meters, whichever comes first
        },
        (location) => {
          setUserLocation(location);
        },
      );

      // Subscribe to station socket for real-time occupancy updates
      socketService.connect();
      socketService.subscribeToStation(stationId, handleOccupancyChanged);

      // Fit map to show route
      if (mapRef.current && route.data.route.polyline.length > 0) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(
            [
              {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
              },
              ...route.data.route.polyline.map((coord) => ({
                latitude: coord[1],
                longitude: coord[0],
              })),
              stationCoords,
            ],
            {
              edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
              animated: true,
            },
          );
        }, 500);
      }
    } catch (error) {
      console.error("Navigation initialization error:", error);
      Alert.alert(
        "Error",
        "Failed to initialize navigation. Please try again.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOccupancyChanged = useCallback(
    (payload: OccupancyChangedPayload) => {
      // Update ports state
      setPorts((prevPorts) =>
        prevPorts.map((port) =>
          port.connectorType === payload.connectorType
            ? { ...port, occupied: payload.occupied, total: payload.total }
            : port,
        ),
      );

      // Show toast notification
      const freeSlots = payload.total - payload.occupied;
      Toast.show({
        type: freeSlots > 0 ? "success" : "error",
        text1: "Occupancy Updated",
        text2: `${payload.connectorType}: ${freeSlots} slot${freeSlots !== 1 ? "s" : ""} available`,
        position: "top",
        visibilityTime: 5000,
      });
    },
    [],
  );

  const cleanup = () => {
    // Stop location tracking
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    // Unsubscribe from socket
    socketService.unsubscribeFromStation(stationId);
  };

  const handleClose = () => {
    cleanup();
    router.back();
  };

  if (isLoading) {
    return (
      <Container>
        <Stack.Screen options={{ headerShown: false }} />
        <LoadingOverlay>
          <ActivityIndicator size="large" color={colors.primary} />
          <LoadingText>Loading navigation...</LoadingText>
        </LoadingOverlay>
      </Container>
    );
  }

  if (!routeData || !userLocation) {
    return (
      <Container>
        <Stack.Screen options={{ headerShown: false }} />
        <LoadingOverlay>
          <Text>Failed to load navigation data</Text>
        </LoadingOverlay>
      </Container>
    );
  }

  // Convert polyline to map coordinates
  const polylineCoords = routeData.route.polyline.map((coord) => ({
    latitude: coord[1],
    longitude: coord[0],
  }));

  return (
    <Container>
      <Stack.Screen options={{ headerShown: false }} />

      <MapContainer>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          followsUserLocation={true}
        >
          {/* Route Polyline */}
          <Polyline
            coordinates={polylineCoords}
            strokeColor={colors.primary}
            strokeWidth={4}
          />

          {/* Station Marker */}
          <Marker
            coordinate={stationCoords}
            title={routeData.stationName}
            description={routeData.stationAddress}
          >
            <View style={styles.markerContainer}>
              <Ionicons name="flash" size={24} color="#FFF" />
            </View>
          </Marker>
        </MapView>
      </MapContainer>

      {/* Bottom Card Overlay */}
      <CardOverlay>
        <CardHeader>
          <StationName numberOfLines={1}>{routeData.stationName}</StationName>
          <CloseButton onPress={handleClose}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </CloseButton>
        </CardHeader>

        <RouteInfo>
          <InfoItem>
            <InfoValue>{routeData.route.totalDistanceKm.toFixed(1)}</InfoValue>
            <InfoLabel>Distance (km)</InfoLabel>
          </InfoItem>
          <InfoItem>
            <InfoValue>
              {Math.round(routeData.route.totalDurationMinutes)}
            </InfoValue>
            <InfoLabel>ETA (min)</InfoLabel>
          </InfoItem>
        </RouteInfo>

        <PortsSection>
          <SectionTitle>Port Availability</SectionTitle>
          {ports.map((port, index) => {
            const freeSlots = port.total - port.occupied;
            const hasSlots = freeSlots > 0;
            return (
              <PortItem key={`${port.connectorType}-${index}`}>
                <PortInfo>
                  <PortType>{port.connectorType}</PortType>
                  <PortDetails>
                    {port.powerKW} kW • Rs. {port.pricePerKWh}/kWh
                  </PortDetails>
                </PortInfo>
                <PortOccupancy hasSlots={hasSlots}>
                  <Ionicons
                    name={hasSlots ? "checkmark-circle" : "close-circle"}
                    size={16}
                    color={hasSlots ? "#2E7D32" : "#C62828"}
                  />
                  <OccupancyText hasSlots={hasSlots}>
                    {freeSlots}/{port.total}
                  </OccupancyText>
                </PortOccupancy>
              </PortItem>
            );
          })}
        </PortsSection>
      </CardOverlay>

      {/* Toast Container */}
      <Toast />
    </Container>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#FFF",
  },
});
