import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  RootStackParamList,
  VehicleType,
  ConnectorType,
  VehicleProfile,
} from "../types";
import { useAuthStore } from "../store/authStore";

type AddVehicleRouteProp = RouteProp<RootStackParamList, "EditVehicle">;
type AddVehicleNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "AddVehicle"
>;

const VEHICLE_TYPES: { type: VehicleType; label: string; icon: string }[] = [
  { type: "bike", label: "Electric Bike", icon: "bicycle" },
  { type: "car", label: "Electric Car", icon: "car" },
];

const CONNECTOR_OPTIONS: {
  type: ConnectorType;
  label: string;
  vehicleTypes: VehicleType[];
}[] = [
  { type: "AC_SLOW", label: "AC Slow (1-5 kW)", vehicleTypes: ["bike"] },
  { type: "Type2", label: "Type 2 (7-22 kW)", vehicleTypes: ["car"] },
  { type: "CCS", label: "CCS (50-350 kW)", vehicleTypes: ["car"] },
  { type: "CHAdeMO", label: "CHAdeMO (50+ kW)", vehicleTypes: ["car"] },
];

interface Props {
  isEditing?: boolean;
}

export default function AddVehicleScreen({ isEditing = false }: Props) {
  const navigation = useNavigation<AddVehicleNavProp>();
  const route = useRoute<AddVehicleRouteProp>();
  const { user, isAuthenticated, addVehicle, updateVehicle } = useAuthStore();

  const vehicleId = (route.params as any)?.vehicleId;
  const existingVehicle = user?.vehicleProfiles?.find(
    (v) => v._id === vehicleId,
  );

  const [name, setName] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [batteryCapacity, setBatteryCapacity] = useState("");
  const [efficiency, setEfficiency] = useState("");
  const [batteryPercent, setBatteryPercent] = useState("50");
  const [selectedConnectors, setSelectedConnectors] = useState<ConnectorType[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (existingVehicle) {
      setName(existingVehicle.name || "");
      setVehicleType(existingVehicle.vehicleType);
      setBatteryCapacity(existingVehicle.batteryCapacity_kWh.toString());
      setEfficiency(existingVehicle.efficiency_kWh_per_km.toString());
      setBatteryPercent(existingVehicle.batteryPercent.toString());
      setSelectedConnectors(existingVehicle.compatibleConnectors || []);
    }
  }, [existingVehicle]);

  const toggleConnector = (connector: ConnectorType) => {
    setSelectedConnectors((prev) =>
      prev.includes(connector)
        ? prev.filter((c) => c !== connector)
        : [...prev, connector],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a vehicle name");
      return;
    }
    if (!batteryCapacity || parseFloat(batteryCapacity) <= 0) {
      Alert.alert("Error", "Please enter a valid battery capacity");
      return;
    }
    if (!efficiency || parseFloat(efficiency) <= 0) {
      Alert.alert("Error", "Please enter a valid efficiency");
      return;
    }
    if (selectedConnectors.length === 0) {
      Alert.alert("Error", "Please select at least one connector type");
      return;
    }

    const vehicleData: Omit<VehicleProfile, "_id"> = {
      name: name.trim(),
      vehicleType,
      batteryCapacity_kWh: parseFloat(batteryCapacity),
      efficiency_kWh_per_km: parseFloat(efficiency),
      batteryPercent: parseInt(batteryPercent) || 50,
      compatibleConnectors: selectedConnectors,
    };

    // Guest users — prompt to login to save, but still go back
    if (!isAuthenticated) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to save vehicle profiles. Would you like to login now?",
        [
          {
            text: "Skip",
            style: "cancel",
            onPress: () => navigation.goBack(),
          },
          {
            text: "Login",
            onPress: () =>
              navigation.navigate("Login", { returnTo: "AddVehicle" }),
          },
        ],
      );
      return;
    }

    setIsLoading(true);
    try {
      if (existingVehicle && vehicleId) {
        await updateVehicle(vehicleId, vehicleData);
        Alert.alert("Success", "Vehicle updated successfully");
      } else {
        await addVehicle(vehicleData);
        Alert.alert("Success", "Vehicle added successfully");
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConnectors = CONNECTOR_OPTIONS.filter((c) =>
    c.vehicleTypes.includes(vehicleType),
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {/* Vehicle Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Vehicle Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., My Tesla Model 3"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Vehicle Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Vehicle Type</Text>
          <View style={styles.typeContainer}>
            {VEHICLE_TYPES.map((type) => (
              <TouchableOpacity
                key={type.type}
                style={[
                  styles.typeButton,
                  vehicleType === type.type && styles.typeButtonSelected,
                ]}
                onPress={() => {
                  setVehicleType(type.type);
                  setSelectedConnectors([]);
                }}
              >
                <Ionicons
                  name={type.icon as any}
                  size={28}
                  color={vehicleType === type.type ? "#fff" : "#4CAF50"}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    vehicleType === type.type && styles.typeLabelSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Battery Capacity */}
        <View style={styles.section}>
          <Text style={styles.label}>Battery Capacity (kWh)</Text>
          <TextInput
            style={styles.input}
            placeholder={vehicleType === "car" ? "e.g., 60" : "e.g., 3"}
            keyboardType="decimal-pad"
            value={batteryCapacity}
            onChangeText={setBatteryCapacity}
          />
          <Text style={styles.hint}>
            {vehicleType === "car"
              ? "Typical range: 40-100 kWh for cars"
              : "Typical range: 1-5 kWh for bikes"}
          </Text>
        </View>

        {/* Efficiency */}
        <View style={styles.section}>
          <Text style={styles.label}>Efficiency (kWh/km)</Text>
          <TextInput
            style={styles.input}
            placeholder={vehicleType === "car" ? "e.g., 0.15" : "e.g., 0.03"}
            keyboardType="decimal-pad"
            value={efficiency}
            onChangeText={setEfficiency}
          />
          <Text style={styles.hint}>
            How much energy your vehicle uses per kilometer
          </Text>
        </View>

        {/* Current Battery */}
        <View style={styles.section}>
          <Text style={styles.label}>Current Battery Level (%)</Text>
          <View style={styles.batterySlider}>
            {[10, 25, 50, 75, 100].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.batteryButton,
                  parseInt(batteryPercent) === value &&
                    styles.batteryButtonSelected,
                ]}
                onPress={() => setBatteryPercent(value.toString())}
              >
                <Text
                  style={[
                    styles.batteryButtonText,
                    parseInt(batteryPercent) === value &&
                      styles.batteryButtonTextSelected,
                  ]}
                >
                  {value}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Compatible Connectors */}
        <View style={styles.section}>
          <Text style={styles.label}>Compatible Connectors</Text>
          <View style={styles.connectorsContainer}>
            {filteredConnectors.map((connector) => (
              <TouchableOpacity
                key={connector.type}
                style={[
                  styles.connectorButton,
                  selectedConnectors.includes(connector.type) &&
                    styles.connectorButtonSelected,
                ]}
                onPress={() => toggleConnector(connector.type)}
              >
                <Ionicons
                  name="flash"
                  size={18}
                  color={
                    selectedConnectors.includes(connector.type)
                      ? "#fff"
                      : "#4CAF50"
                  }
                />
                <Text
                  style={[
                    styles.connectorText,
                    selectedConnectors.includes(connector.type) &&
                      styles.connectorTextSelected,
                  ]}
                >
                  {connector.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.disabledButton]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {existingVehicle ? "Update Vehicle" : "Add Vehicle"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    fontStyle: "italic",
  },
  typeContainer: {
    flexDirection: "row",
  },
  typeButton: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#E8F5E9",
  },
  typeButtonSelected: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  typeLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  typeLabelSelected: {
    color: "#fff",
  },
  batterySlider: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  batteryButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: "#fff",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  batteryButtonSelected: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  batteryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  batteryButtonTextSelected: {
    color: "#fff",
  },
  connectorsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  connectorButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8F5E9",
  },
  connectorButtonSelected: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  connectorText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#333",
  },
  connectorTextSelected: {
    color: "#fff",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
