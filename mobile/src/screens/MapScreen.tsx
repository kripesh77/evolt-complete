import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList, Station } from "../types";
import { useLocationStore } from "../store/locationStore";
import { useStationStore } from "../store/stationStore";
import WebViewMap, { WebViewMapRef } from "../components/WebViewMap";

type MapScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Map"
>;

const { width, height } = Dimensions.get("window");

export default function MapScreen() {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const mapRef = useRef<WebViewMapRef>(null);

  const {
    currentLocation,
    customLocation,
    useCustomLocation,
    getCurrentLocation,
    getEffectiveLocation,
  } = useLocationStore();

  const { nearbyStations, fetchNearbyStations, isLoading } = useStationStore();
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showStationModal, setShowStationModal] = useState(false);

  // Default to Delhi if no location
  const defaultRegion = {
    latitude: 28.6139,
    longitude: 77.209,
  };

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    if (!currentLocation) {
      await getCurrentLocation();
    }
    const location = getEffectiveLocation();
    if (location) {
      await fetchNearbyStations(location, 50000);
      mapRef.current?.animateToRegion(location);
    }
  };

  const getMarkerColor = (station: Station) => {
    const totalPorts = (station.ports || []).reduce(
      (sum, p) => sum + p.total,
      0,
    );
    const occupiedPorts = (station.ports || []).reduce(
      (sum, p) => sum + p.occupied,
      0,
    );
    const availableRatio = (totalPorts - occupiedPorts) / totalPorts;

    if (availableRatio > 0.5) return "#4CAF50";
    if (availableRatio > 0) return "#FF9800";
    return "#F44336";
  };

  const handleMarkerPress = (stationId: string) => {
    const station = nearbyStations.find((s) => s._id === stationId);
    if (station) {
      setSelectedStation(station);
      setShowStationModal(true);
    }
  };

  const effectiveLocation = getEffectiveLocation();

  const markers = nearbyStations.map((station) => ({
    id: station._id,
    latitude: station.location.coordinates[1],
    longitude: station.location.coordinates[0],
    color: getMarkerColor(station),
    title: station.name,
    type: "station" as const,
  }));

  return (
    <View style={styles.container}>
      <WebViewMap
        ref={mapRef}
        style={styles.map}
        initialRegion={effectiveLocation || defaultRegion}
        markers={markers}
        userLocation={currentLocation}
        customLocation={useCustomLocation ? customLocation : null}
        onMarkerPress={handleMarkerPress}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      )}

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            const location = getEffectiveLocation();
            if (location) mapRef.current?.animateToRegion(location);
          }}
        >
          <Ionicons name="locate" size={24} color="#333" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={loadStations}>
          <Ionicons name="refresh" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#4CAF50" }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#FF9800" }]} />
          <Text style={styles.legendText}>Busy</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#F44336" }]} />
          <Text style={styles.legendText}>Full</Text>
        </View>
      </View>

      <Modal
        visible={showStationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStationModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStationModal(false)}
        >
          <View style={styles.modalContent}>
            {selectedStation && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedStation.name}</Text>
                  <TouchableOpacity onPress={() => setShowStationModal(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalAddress}>
                  {selectedStation.address}
                </Text>

                <View style={styles.modalDetails}>
                  <View style={styles.modalDetailRow}>
                    <Ionicons name="time-outline" size={18} color="#666" />
                    <Text style={styles.modalDetailText}>
                      {selectedStation.operatingHours}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Ionicons name="flash" size={18} color="#4CAF50" />
                    <Text style={styles.modalDetailText}>
                      {selectedStation.ports
                        .map((p) => p.connectorType)
                        .join(", ")}
                    </Text>
                  </View>

                  <View style={styles.modalPortsContainer}>
                    {selectedStation.ports.map((port, index) => (
                      <View key={index} style={styles.portBadge}>
                        <Text style={styles.portText}>
                          {port.connectorType}: {port.total - port.occupied}/
                          {port.total}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() => {
                    setShowStationModal(false);
                    navigation.navigate("StationDetails", {
                      stationId: selectedStation._id,
                    });
                  }}
                >
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  loadingContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -20,
  },
  controlsContainer: {
    position: "absolute",
    right: 16,
    top: 60,
  },
  controlButton: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  legend: {
    position: "absolute",
    bottom: 100,
    left: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  modalAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  modalDetails: {
    marginBottom: 20,
  },
  modalDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  modalDetailText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 10,
  },
  modalPortsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  portBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  portText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
  },
  viewDetailsButton: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 12,
  },
  viewDetailsText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
});
