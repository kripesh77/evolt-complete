import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  RootStackParamList,
  VehicleProfile,
  VehicleType,
  ConnectorType,
  RecommendedStation,
  GeoLocation,
} from "../types";
import { useAuthStore } from "../store/authStore";
import { useLocationStore } from "../store/locationStore";
import { useStationStore } from "../store/stationStore";
import WebViewMap from "../components/WebViewMap";

type RecommendScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Recommend"
>;

const { width, height } = Dimensions.get("window");

const VEHICLE_TYPES: { type: VehicleType; label: string; icon: string }[] = [
  { type: "bike", label: "Bike", icon: "bicycle" },
  { type: "car", label: "Car", icon: "car" },
];

const CONNECTOR_OPTIONS: {
  type: ConnectorType;
  label: string;
  vehicleTypes: VehicleType[];
}[] = [
  { type: "AC_SLOW", label: "AC Slow", vehicleTypes: ["bike"] },
  { type: "Type2", label: "Type 2", vehicleTypes: ["car"] },
  { type: "CCS", label: "CCS", vehicleTypes: ["car"] },
  { type: "CHAdeMO", label: "CHAdeMO", vehicleTypes: ["car"] },
];

export default function RecommendScreen() {
  const navigation = useNavigation<RecommendScreenNavigationProp>();
  const { user, isAuthenticated } = useAuthStore();
  const {
    currentLocation,
    customLocation,
    useCustomLocation,
    setCustomLocation,
    setUseCustomLocation,
    getCurrentLocation,
    getEffectiveLocation,
  } = useLocationStore();
  const {
    recommendations,
    getRecommendations,
    isLoading,
    clearRecommendations,
  } = useStationStore();

  // Saved profile selection (authenticated only)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleProfile | null>(
    null,
  );

  // Guest manual vehicle input state
  const [guestVehicleType, setGuestVehicleType] = useState<VehicleType>("car");
  const [guestBatteryCapacity, setGuestBatteryCapacity] = useState("");
  const [guestEfficiency, setGuestEfficiency] = useState("");
  const [guestConnectors, setGuestConnectors] = useState<ConnectorType[]>([]);

  // Shared state
  const [batteryPercent, setBatteryPercent] = useState(50);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [tempLocation, setTempLocation] = useState<GeoLocation | null>(null);

  // Whether user wants to use saved profile or manual input
  const hasSavedProfiles =
    isAuthenticated && user?.vehicleProfiles && user.vehicleProfiles.length > 0;
  const [useManualInput, setUseManualInput] = useState(!hasSavedProfiles);

  useEffect(() => {
    if (!currentLocation) {
      getCurrentLocation();
    }
    if (hasSavedProfiles && user?.vehicleProfiles) {
      setSelectedVehicle(user.vehicleProfiles[0]);
      setBatteryPercent(user.vehicleProfiles[0].batteryPercent || 50);
      setUseManualInput(false);
    } else {
      setUseManualInput(true);
    }
  }, [user, isAuthenticated]);

  const buildVehicleProfile = (): VehicleProfile | null => {
    if (!useManualInput && selectedVehicle) {
      return { ...selectedVehicle, batteryPercent };
    }

    // Build from manual input
    const capacity = parseFloat(guestBatteryCapacity);
    const eff = parseFloat(guestEfficiency);
    if (!capacity || capacity <= 0) {
      Alert.alert("Error", "Please enter a valid battery capacity");
      return null;
    }
    if (!eff || eff <= 0) {
      Alert.alert("Error", "Please enter a valid efficiency");
      return null;
    }
    if (guestConnectors.length === 0) {
      Alert.alert("Error", "Please select at least one connector type");
      return null;
    }

    return {
      _id: "guest",
      name: "Guest Vehicle",
      vehicleType: guestVehicleType,
      batteryCapacity_kWh: capacity,
      efficiency_kWh_per_km: eff,
      batteryPercent,
      compatibleConnectors: guestConnectors,
    };
  };

  const handleGetRecommendations = async () => {
    const vehicle = buildVehicleProfile();
    if (!vehicle) return;

    const location = getEffectiveLocation();
    if (!location) {
      Alert.alert("Error", "Please enable location or set a custom location");
      return;
    }

    try {
      await getRecommendations(location, vehicle);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleLocationSelect = (location: GeoLocation) => {
    setCustomLocation(location);
    setShowLocationPicker(false);
  };

  const toggleGuestConnector = (connector: ConnectorType) => {
    setGuestConnectors((prev) =>
      prev.includes(connector)
        ? prev.filter((c) => c !== connector)
        : [...prev, connector],
    );
  };

  const filteredGuestConnectors = CONNECTOR_OPTIONS.filter((c) =>
    c.vehicleTypes.includes(guestVehicleType),
  );

  // ── Render: Vehicle Mode Switcher ──
  const renderVehicleModeSwitch = () => {
    if (!hasSavedProfiles) return null; // Only show toggle for authenticated users with profiles

    return (
      <View style={styles.modeSwitch}>
        <TouchableOpacity
          style={[
            styles.modeOption,
            !useManualInput && styles.modeOptionActive,
          ]}
          onPress={() => setUseManualInput(false)}
        >
          <Ionicons
            name="bookmarks"
            size={16}
            color={!useManualInput ? "#fff" : "#4CAF50"}
          />
          <Text
            style={[
              styles.modeOptionText,
              !useManualInput && styles.modeOptionTextActive,
            ]}
          >
            Saved Vehicles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeOption, useManualInput && styles.modeOptionActive]}
          onPress={() => setUseManualInput(true)}
        >
          <Ionicons
            name="create"
            size={16}
            color={useManualInput ? "#fff" : "#4CAF50"}
          />
          <Text
            style={[
              styles.modeOptionText,
              useManualInput && styles.modeOptionTextActive,
            ]}
          >
            Manual Input
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render: Saved Vehicle Selector ──
  const renderSavedVehicleSelector = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {user!.vehicleProfiles!.map((vehicle, index) => (
        <TouchableOpacity
          key={vehicle._id || index}
          style={[
            styles.vehicleCard,
            selectedVehicle?._id === vehicle._id && styles.vehicleCardSelected,
          ]}
          onPress={() => {
            setSelectedVehicle(vehicle);
            setBatteryPercent(vehicle.batteryPercent || 50);
          }}
        >
          <Ionicons
            name={vehicle.vehicleType === "car" ? "car" : "bicycle"}
            size={24}
            color={selectedVehicle?._id === vehicle._id ? "#fff" : "#4CAF50"}
          />
          <Text
            style={[
              styles.vehicleName,
              selectedVehicle?._id === vehicle._id &&
                styles.vehicleNameSelected,
            ]}
          >
            {vehicle.name || vehicle.vehicleType}
          </Text>
          <Text
            style={[
              styles.vehicleInfo,
              selectedVehicle?._id === vehicle._id &&
                styles.vehicleInfoSelected,
            ]}
          >
            {vehicle.batteryCapacity_kWh} kWh
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ── Render: Manual Vehicle Input Form (Guest) ──
  const renderManualVehicleInput = () => (
    <View>
      {/* Login Prompt for guests */}
      {!isAuthenticated && (
        <TouchableOpacity
          style={styles.loginPrompt}
          onPress={() =>
            navigation.navigate("Login", { returnTo: "Recommend" })
          }
        >
          <Ionicons name="log-in-outline" size={18} color="#4CAF50" />
          <Text style={styles.loginPromptText}>
            Login to save vehicle profiles
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
        </TouchableOpacity>
      )}

      {/* Vehicle Type Selector */}
      <View style={styles.miniRow}>
        {VEHICLE_TYPES.map((t) => (
          <TouchableOpacity
            key={t.type}
            style={[
              styles.miniTypeBtn,
              guestVehicleType === t.type && styles.miniTypeBtnActive,
            ]}
            onPress={() => {
              setGuestVehicleType(t.type);
              setGuestConnectors([]);
            }}
          >
            <Ionicons
              name={t.icon as any}
              size={20}
              color={guestVehicleType === t.type ? "#fff" : "#4CAF50"}
            />
            <Text
              style={[
                styles.miniTypeText,
                guestVehicleType === t.type && styles.miniTypeTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Battery Capacity & Efficiency */}
      <View style={styles.inputRow}>
        <View style={styles.inputCol}>
          <Text style={styles.inputLabel}>Battery (kWh)</Text>
          <TextInput
            style={styles.formInput}
            placeholder={guestVehicleType === "car" ? "60" : "3"}
            keyboardType="decimal-pad"
            value={guestBatteryCapacity}
            onChangeText={setGuestBatteryCapacity}
          />
        </View>
        <View style={styles.inputCol}>
          <Text style={styles.inputLabel}>Efficiency (kWh/km)</Text>
          <TextInput
            style={styles.formInput}
            placeholder={guestVehicleType === "car" ? "0.15" : "0.03"}
            keyboardType="decimal-pad"
            value={guestEfficiency}
            onChangeText={setGuestEfficiency}
          />
        </View>
      </View>

      {/* Connectors */}
      <Text style={styles.inputLabel}>Connectors</Text>
      <View style={styles.connectorRow}>
        {filteredGuestConnectors.map((c) => (
          <TouchableOpacity
            key={c.type}
            style={[
              styles.connectorChip,
              guestConnectors.includes(c.type) && styles.connectorChipActive,
            ]}
            onPress={() => toggleGuestConnector(c.type)}
          >
            <Text
              style={[
                styles.connectorChipText,
                guestConnectors.includes(c.type) &&
                  styles.connectorChipTextActive,
              ]}
            >
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderVehicleSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Vehicle Profile</Text>
      {renderVehicleModeSwitch()}
      {!useManualInput && hasSavedProfiles
        ? renderSavedVehicleSelector()
        : renderManualVehicleInput()}
    </View>
  );

  const renderBatterySlider = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Current Battery Level</Text>
      <View style={styles.batteryContainer}>
        <View style={styles.batteryBar}>
          <View style={[styles.batteryFill, { width: `${batteryPercent}%` }]} />
        </View>
        <Text style={styles.batteryText}>{batteryPercent}%</Text>
      </View>
      <View style={styles.batteryButtons}>
        {[10, 25, 50, 75, 100].map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.batteryButton,
              batteryPercent === value && styles.batteryButtonSelected,
            ]}
            onPress={() => setBatteryPercent(value)}
          >
            <Text
              style={[
                styles.batteryButtonText,
                batteryPercent === value && styles.batteryButtonTextSelected,
              ]}
            >
              {value}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderLocationSection = () => {
    const location = getEffectiveLocation();

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.locationOptions}>
          <TouchableOpacity
            style={[
              styles.locationOption,
              !useCustomLocation && styles.locationOptionSelected,
            ]}
            onPress={() => setUseCustomLocation(false)}
          >
            <Ionicons
              name="navigate"
              size={20}
              color={!useCustomLocation ? "#fff" : "#4CAF50"}
            />
            <Text
              style={[
                styles.locationOptionText,
                !useCustomLocation && styles.locationOptionTextSelected,
              ]}
            >
              Current Location
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.locationOption,
              useCustomLocation && styles.locationOptionSelected,
            ]}
            onPress={() => setShowLocationPicker(true)}
          >
            <Ionicons
              name="pin"
              size={20}
              color={useCustomLocation ? "#fff" : "#4CAF50"}
            />
            <Text
              style={[
                styles.locationOptionText,
                useCustomLocation && styles.locationOptionTextSelected,
              ]}
            >
              Custom Location
            </Text>
          </TouchableOpacity>
        </View>

        {location && (
          <Text style={styles.locationText}>
            📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            {useCustomLocation ? " (Custom)" : " (GPS)"}
          </Text>
        )}
      </View>
    );
  };

  const renderRecommendationCard = (rec: RecommendedStation, index: number) => (
    <TouchableOpacity
      key={rec.stationId}
      style={[styles.recCard, index === 0 && styles.topRecCard]}
      onPress={() =>
        navigation.navigate("StationDetails", { stationId: rec.stationId })
      }
    >
      {index === 0 && (
        <View style={styles.topBadge}>
          <Ionicons name="star" size={12} color="#fff" />
          <Text style={styles.topBadgeText}>Best Match</Text>
        </View>
      )}

      <View style={styles.recHeader}>
        <View style={styles.recInfo}>
          <Text style={styles.recName} numberOfLines={1}>
            {rec.stationName}
          </Text>
          <Text style={styles.recAddress} numberOfLines={1}>
            {rec.address}
          </Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{Math.round(rec.score)}</Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </View>
      </View>

      <View style={styles.recDetails}>
        <View style={styles.recDetailItem}>
          <Ionicons name="navigate-outline" size={16} color="#666" />
          <Text style={styles.recDetailText}>
            {rec.distance_km.toFixed(1)} km
          </Text>
        </View>
        <View style={styles.recDetailItem}>
          <Ionicons name="flash" size={16} color="#4CAF50" />
          <Text style={styles.recDetailText}>{rec.recommendedPort}</Text>
        </View>
        <View style={styles.recDetailItem}>
          <Ionicons name="speedometer-outline" size={16} color="#666" />
          <Text style={styles.recDetailText}>{rec.powerKW} kW</Text>
        </View>
      </View>

      <View style={styles.recFooter}>
        <View style={styles.recFooterItem}>
          <Text style={styles.recFooterLabel}>Slots</Text>
          <Text style={styles.recFooterValue}>
            {rec.freeSlots}/{rec.totalSlots}
          </Text>
        </View>
        <View style={styles.recFooterItem}>
          <Text style={styles.recFooterLabel}>Time</Text>
          <Text style={styles.recFooterValue}>
            {rec.estimatedChargingTime_min} min
          </Text>
        </View>
        <View style={styles.recFooterItem}>
          <Text style={styles.recFooterLabel}>Cost</Text>
          <Text style={styles.recFooterValue}>
            ₹{rec.estimatedCost.toFixed(0)}
          </Text>
        </View>
      </View>

      {!rec.canReachWithCurrentCharge && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={14} color="#FF9800" />
          <Text style={styles.warningText}>
            May not reach with current battery
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {renderLocationSection()}
        {renderVehicleSelector()}
        {renderBatterySlider()}

        <TouchableOpacity
          style={[styles.getRecButton, isLoading && styles.disabledButton]}
          onPress={handleGetRecommendations}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="bulb" size={20} color="#fff" />
              <Text style={styles.getRecButtonText}>Get Recommendations</Text>
            </>
          )}
        </TouchableOpacity>

        {recommendations.length > 0 && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>Recommended Stations</Text>
              <TouchableOpacity onPress={clearRecommendations}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {recommendations.map((rec, index) =>
              renderRecommendationCard(rec, index),
            )}
          </View>
        )}
      </ScrollView>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Location</Text>
            <TouchableOpacity
              onPress={() => tempLocation && handleLocationSelect(tempLocation)}
              disabled={!tempLocation}
            >
              <Text
                style={[styles.doneText, !tempLocation && styles.disabledText]}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <WebViewMap
            style={styles.pickerMap}
            initialRegion={{
              latitude:
                customLocation?.latitude ||
                currentLocation?.latitude ||
                28.6139,
              longitude:
                customLocation?.longitude ||
                currentLocation?.longitude ||
                77.209,
            }}
            onMapPress={(location) => {
              setTempLocation(location);
            }}
            customLocation={tempLocation}
            userLocation={currentLocation}
            interactive={true}
          />

          <View style={styles.centerMarker}>
            <Ionicons name="location" size={40} color="#F44336" />
          </View>

          <View style={styles.pickerFooter}>
            <Text style={styles.pickerHint}>
              Move the map to position the marker at your desired location
            </Text>
          </View>
        </View>
      </Modal>
    </View>
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  // ── Mode Switch ──
  modeSwitch: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    padding: 3,
  },
  modeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeOptionActive: {
    backgroundColor: "#4CAF50",
  },
  modeOptionText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "500",
    color: "#4CAF50",
  },
  modeOptionTextActive: {
    color: "#fff",
  },
  // ── Login Prompt ──
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  loginPromptText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#4CAF50",
    fontWeight: "500",
  },
  // ── Manual Input ──
  miniRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  miniTypeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E8F5E9",
  },
  miniTypeBtnActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  miniTypeText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
  },
  miniTypeTextActive: {
    color: "#fff",
  },
  inputRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  connectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  connectorChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E8F5E9",
  },
  connectorChipActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  connectorChipText: {
    fontSize: 12,
    color: "#333",
  },
  connectorChipTextActive: {
    color: "#fff",
  },
  // ── Saved vehicle cards ──
  vehicleCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginRight: 12,
    alignItems: "center",
    minWidth: 100,
    borderWidth: 2,
    borderColor: "#E8F5E9",
  },
  vehicleCardSelected: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginTop: 8,
  },
  vehicleNameSelected: {
    color: "#fff",
  },
  vehicleInfo: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  vehicleInfoSelected: {
    color: "#E8F5E9",
  },
  // ── Battery ──
  batteryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  batteryBar: {
    flex: 1,
    height: 20,
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 15,
  },
  batteryFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 10,
  },
  batteryText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    width: 50,
    textAlign: "right",
  },
  batteryButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  batteryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  batteryButtonSelected: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  batteryButtonText: {
    fontSize: 14,
    color: "#666",
  },
  batteryButtonTextSelected: {
    color: "#fff",
  },
  // ── Location ──
  locationOptions: {
    flexDirection: "row",
    marginBottom: 12,
  },
  locationOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E8F5E9",
  },
  locationOptionSelected: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  locationOptionText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4CAF50",
  },
  locationOptionTextSelected: {
    color: "#fff",
  },
  locationText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  // ── Get Recs Button ──
  getRecButton: {
    flexDirection: "row",
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  getRecButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  // ── Results ──
  resultsSection: {
    marginTop: 10,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  clearText: {
    color: "#F44336",
    fontSize: 14,
  },
  recCard: {
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
  topRecCard: {
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  topBadge: {
    position: "absolute",
    top: -10,
    right: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  recHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  recInfo: {
    flex: 1,
    marginRight: 10,
  },
  recName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  recAddress: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  scoreContainer: {
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  scoreLabel: {
    fontSize: 10,
    color: "#666",
  },
  recDetails: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },
  recDetailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  recDetailText: {
    fontSize: 13,
    color: "#333",
    marginLeft: 5,
  },
  recFooter: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
  },
  recFooterItem: {
    alignItems: "center",
  },
  recFooterLabel: {
    fontSize: 11,
    color: "#666",
  },
  recFooterValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E0",
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    fontSize: 12,
    color: "#FF9800",
    marginLeft: 6,
  },
  // ── Modal ──
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  doneText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
  },
  disabledText: {
    color: "#ccc",
  },
  pickerMap: {
    flex: 1,
  },
  centerMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -40,
  },
  pickerFooter: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e0e0e0",
  },
  pickerHint: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
