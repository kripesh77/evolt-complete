import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList, Station } from "../types";
import { useAuthStore } from "../store/authStore";
import { useLocationStore } from "../store/locationStore";
import { useStationStore } from "../store/stationStore";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, isAuthenticated } = useAuthStore();
  const {
    currentLocation,
    getCurrentLocation,
    getEffectiveLocation,
    isLoading: locationLoading,
    permissionGranted,
  } = useLocationStore();
  const {
    nearbyStations,
    fetchNearbyStations,
    isLoading: stationsLoading,
  } = useStationStore();
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleShareLocation = async () => {
    await getCurrentLocation();
  };

  const handleGetNearbyStations = async () => {
    const location = getEffectiveLocation();
    if (location) {
      await fetchNearbyStations(location, 30000); // 30km radius
      setHasSearched(true);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (currentLocation) {
      await handleGetNearbyStations();
    }
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const renderStationCard = (station: Station, index: number) => {
    const totalPorts = (station.ports || []).reduce(
      (sum, p) => sum + p.total,
      0,
    );
    const occupiedPorts = (station.ports || []).reduce(
      (sum, p) => sum + p.occupied,
      0,
    );
    const availablePorts = totalPorts - occupiedPorts;
    const isAvailable = availablePorts > 0;

    return (
      <TouchableOpacity
        key={station._id}
        style={styles.stationCard}
        onPress={() =>
          navigation.navigate("StationDetails", { stationId: station._id })
        }
      >
        <View style={styles.stationHeader}>
          <View style={styles.stationInfo}>
            <Text style={styles.stationName} numberOfLines={1}>
              {station.name}
            </Text>
            <Text style={styles.stationAddress} numberOfLines={1}>
              {station.address}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isAvailable ? styles.availableBadge : styles.busyBadge,
            ]}
          >
            <Text style={styles.statusText}>
              {isAvailable ? `${availablePorts} Available` : "Busy"}
            </Text>
          </View>
        </View>

        <View style={styles.stationDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="flash" size={16} color="#4CAF50" />
            <Text style={styles.detailText}>
              {station.ports.map((p) => p.connectorType).join(", ")}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{station.operatingHours}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#4CAF50"]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>
            {isAuthenticated ? user?.name || "User" : "Explorer"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <Ionicons name="person-circle-outline" size={40} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Location Prompt Card */}
      {!currentLocation && (
        <View style={styles.locationCard}>
          <View style={styles.locationCardIcon}>
            <Ionicons name="location" size={36} color="#4CAF50" />
          </View>
          <Text style={styles.locationCardTitle}>Share Your Location</Text>
          <Text style={styles.locationCardDesc}>
            Allow location access to find EV charging stations near you
          </Text>
          <TouchableOpacity
            style={styles.shareLocationButton}
            onPress={handleShareLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text style={styles.shareLocationText}>Share My Location</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Get Nearby Stations Button — shown after location is available */}
      {currentLocation && !hasSearched && (
        <View style={styles.locationCard}>
          <Ionicons name="checkmark-circle" size={36} color="#4CAF50" />
          <Text style={styles.locationCardTitle}>Location Shared!</Text>
          <Text style={styles.locationCardDesc}>
            Tap below to discover charging stations near you
          </Text>
          <TouchableOpacity
            style={styles.shareLocationButton}
            onPress={handleGetNearbyStations}
            disabled={stationsLoading}
          >
            {stationsLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="search" size={20} color="#fff" />
                <Text style={styles.shareLocationText}>
                  Get Nearby Stations
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      {hasSearched && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("Recommend")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="bulb" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.actionText}>Get{"\n"}Recommendations</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("Map")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="map" size={24} color="#2196F3" />
            </View>
            <Text style={styles.actionText}>View{"\n"}Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (isAuthenticated) {
                navigation.navigate("VehicleProfiles");
              } else {
                navigation.navigate("Login", { returnTo: "VehicleProfiles" });
              }
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="car" size={24} color="#FF9800" />
            </View>
            <Text style={styles.actionText}>My{"\n"}Vehicles</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Vehicle Profile Summary — only for authenticated users */}
      {isAuthenticated &&
        user?.vehicleProfiles &&
        user.vehicleProfiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Vehicles</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {user.vehicleProfiles.map((vehicle, index) => (
                <View key={vehicle._id || index} style={styles.vehicleCard}>
                  <Ionicons
                    name={vehicle.vehicleType === "car" ? "car" : "bicycle"}
                    size={20}
                    color="#4CAF50"
                  />
                  <Text style={styles.vehicleName}>
                    {vehicle.name || vehicle.vehicleType}
                  </Text>
                  <Text style={styles.vehicleBattery}>
                    {vehicle.batteryPercent}% Battery
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      {/* Nearby Stations */}
      {hasSearched && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Stations</Text>
            {stationsLoading ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <TouchableOpacity onPress={handleGetNearbyStations}>
                <Ionicons name="refresh" size={20} color="#4CAF50" />
              </TouchableOpacity>
            )}
          </View>

          {nearbyStations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flash-off-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>No stations found nearby</Text>
            </View>
          ) : (
            nearbyStations
              .slice(0, 5)
              .map((station, index) => renderStationCard(station, index))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: "#666",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  profileButton: {
    padding: 5,
  },
  locationCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  locationCardIcon: {
    marginBottom: 8,
  },
  locationCardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
    marginBottom: 6,
  },
  locationCardDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  shareLocationButton: {
    flexDirection: "row",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  shareLocationText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
    fontWeight: "500",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  vehicleCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginRight: 12,
    alignItems: "center",
    minWidth: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginTop: 8,
  },
  vehicleBattery: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  stationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  stationInfo: {
    flex: 1,
    marginRight: 10,
  },
  stationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  stationAddress: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  availableBadge: {
    backgroundColor: "#E8F5E9",
  },
  busyBadge: {
    backgroundColor: "#FFEBEE",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
  stationDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 5,
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 10,
    textAlign: "center",
  },
});
