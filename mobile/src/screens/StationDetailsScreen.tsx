import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Dimensions,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList, Port } from "../types";
import { useStationStore } from "../store/stationStore";
import { useAuthStore } from "../store/authStore";
import WebViewMap from "../components/WebViewMap";

type StationDetailsRouteProp = RouteProp<RootStackParamList, "StationDetails">;

const { width } = Dimensions.get("window");

export default function StationDetailsScreen() {
  const route = useRoute<StationDetailsRouteProp>();
  const { stationId } = route.params;

  const { selectedStation, fetchStation, isLoading, error } = useStationStore();
  const { user, addFavorite, removeFavorite } = useAuthStore();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    fetchStation(stationId);
  }, [stationId]);

  useEffect(() => {
    if (user && selectedStation) {
      setIsFavorite(
        user.favoriteStations?.includes(selectedStation._id) || false,
      );
    }
  }, [user, selectedStation]);

  const handleToggleFavorite = async () => {
    if (!selectedStation) return;
    try {
      if (isFavorite) {
        await removeFavorite(selectedStation._id);
      } else {
        await addFavorite(selectedStation._id);
      }
      setIsFavorite(!isFavorite);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const openDirections = () => {
    if (!selectedStation) return;
    const [lng, lat] = selectedStation.location.coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  const getConnectorIcon = (type: string) => {
    switch (type) {
      case "AC_SLOW":
        return "flash-outline";
      case "Type2":
        return "flash";
      case "CCS":
        return "flash";
      case "CHAdeMO":
        return "flash";
      default:
        return "flash-outline";
    }
  };

  const renderPortCard = (port: Port, index: number) => {
    const available = port.total - port.occupied;
    const availabilityPercent = (available / port.total) * 100;

    return (
      <View key={index} style={styles.portCard}>
        <View style={styles.portHeader}>
          <View style={styles.portIconContainer}>
            <Ionicons
              name={getConnectorIcon(port.connectorType)}
              size={24}
              color="#4CAF50"
            />
          </View>
          <View style={styles.portInfo}>
            <Text style={styles.portType}>{port.connectorType}</Text>
            <Text style={styles.portVehicle}>
              {port.vehicleType === "car" ? "🚗 Car" : "🛵 Bike"}
            </Text>
          </View>
          <View
            style={[
              styles.availabilityBadge,
              available > 0 ? styles.availableBadge : styles.busyBadge,
            ]}
          >
            <Text style={styles.availabilityText}>
              {available}/{port.total}
            </Text>
          </View>
        </View>

        <View style={styles.portDetails}>
          <View style={styles.portDetailItem}>
            <Text style={styles.portDetailLabel}>Power</Text>
            <Text style={styles.portDetailValue}>{port.powerKW} kW</Text>
          </View>
          <View style={styles.portDetailItem}>
            <Text style={styles.portDetailLabel}>Price</Text>
            <Text style={styles.portDetailValue}>₹{port.pricePerKWh}/kWh</Text>
          </View>
          <View style={styles.portDetailItem}>
            <Text style={styles.portDetailLabel}>Available</Text>
            <Text style={styles.portDetailValue}>{available} slots</Text>
          </View>
        </View>

        <View style={styles.availabilityBar}>
          <View
            style={[
              styles.availabilityFill,
              { width: `${availabilityPercent}%` },
              availabilityPercent > 50
                ? styles.greenFill
                : availabilityPercent > 0
                  ? styles.orangeFill
                  : styles.redFill,
            ]}
          />
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error || !selectedStation) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>{error || "Station not found"}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchStation(stationId)}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalPorts = (selectedStation.ports || []).reduce(
    (sum, p) => sum + p.total,
    0,
  );
  const occupiedPorts = (selectedStation.ports || []).reduce(
    (sum, p) => sum + p.occupied,
    0,
  );
  const availablePorts = totalPorts - occupiedPorts;

  return (
    <ScrollView style={styles.container}>
      {/* Map Preview */}
      <WebViewMap
        style={styles.mapPreview}
        initialRegion={{
          latitude: selectedStation.location.coordinates[1],
          longitude: selectedStation.location.coordinates[0],
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        markers={[
          {
            id: selectedStation._id,
            latitude: selectedStation.location.coordinates[1],
            longitude: selectedStation.location.coordinates[0],
            title: selectedStation.name,
            type: "station",
          },
        ]}
        interactive={false}
      />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.stationName}>{selectedStation.name}</Text>
            <View
              style={[
                styles.statusBadge,
                selectedStation.status === "active"
                  ? styles.activeBadge
                  : styles.inactiveBadge,
              ]}
            >
              <Text style={styles.statusText}>
                {selectedStation.status === "active" ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleToggleFavorite}>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={28}
              color={isFavorite ? "#F44336" : "#666"}
            />
          </TouchableOpacity>
        </View>

        {/* Address */}
        <View style={styles.addressContainer}>
          <Ionicons name="location-outline" size={20} color="#666" />
          <Text style={styles.address}>{selectedStation.address}</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{availablePorts}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalPorts}</Text>
            <Text style={styles.statLabel}>Total Ports</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{selectedStation.ports.length}</Text>
            <Text style={styles.statLabel}>Port Types</Text>
          </View>
        </View>

        {/* Operating Hours */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#4CAF50" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Operating Hours</Text>
              <Text style={styles.infoValue}>
                {selectedStation.operatingHours}
              </Text>
            </View>
          </View>
        </View>

        {/* Ports Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Chargers</Text>
          {selectedStation.ports.map((port, index) =>
            renderPortCard(port, index),
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.directionsButton}
            onPress={openDirections}
          >
            <Ionicons name="navigate" size={20} color="#fff" />
            <Text style={styles.directionsButtonText}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginTop: 15,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  mapPreview: {
    width: width,
    height: 200,
  },
  mapMarker: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#fff",
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
    marginRight: 15,
  },
  stationName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: "#E8F5E9",
  },
  inactiveBadge: {
    backgroundColor: "#FFEBEE",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 15,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoContent: {
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  portCard: {
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
  portHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  portIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  portInfo: {
    flex: 1,
    marginLeft: 12,
  },
  portType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  portVehicle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  availabilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  availableBadge: {
    backgroundColor: "#E8F5E9",
  },
  busyBadge: {
    backgroundColor: "#FFEBEE",
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  portDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  portDetailItem: {
    alignItems: "center",
  },
  portDetailLabel: {
    fontSize: 11,
    color: "#666",
  },
  portDetailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginTop: 2,
  },
  availabilityBar: {
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
  },
  availabilityFill: {
    height: "100%",
    borderRadius: 3,
  },
  greenFill: {
    backgroundColor: "#4CAF50",
  },
  orangeFill: {
    backgroundColor: "#FF9800",
  },
  redFill: {
    backgroundColor: "#F44336",
  },
  actionButtons: {
    marginBottom: 30,
  },
  directionsButton: {
    flexDirection: "row",
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  directionsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
