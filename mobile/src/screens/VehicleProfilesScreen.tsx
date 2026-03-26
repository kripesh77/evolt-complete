import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList, VehicleProfile } from "../types";
import { useAuthStore } from "../store/authStore";

type VehicleProfilesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "VehicleProfiles"
>;

export default function VehicleProfilesScreen() {
  const navigation = useNavigation<VehicleProfilesScreenNavigationProp>();
  const { user, deleteVehicle } = useAuthStore();

  const handleDeleteVehicle = (vehicle: VehicleProfile) => {
    Alert.alert(
      "Delete Vehicle",
      `Are you sure you want to delete "${vehicle.name || vehicle.vehicleType}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (vehicle._id) {
                await deleteVehicle(vehicle._id);
              }
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ],
    );
  };

  const renderVehicleCard = (vehicle: VehicleProfile, index: number) => (
    <View key={vehicle._id || index} style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleIconContainer}>
          <Ionicons
            name={vehicle.vehicleType === "car" ? "car" : "bicycle"}
            size={28}
            color="#4CAF50"
          />
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>
            {vehicle.name || vehicle.vehicleType}
          </Text>
          <Text style={styles.vehicleType}>
            {vehicle.vehicleType === "car" ? "Electric Car" : "Electric Bike"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteVehicle(vehicle)}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>

      <View style={styles.vehicleDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Battery Capacity</Text>
            <Text style={styles.detailValue}>
              {vehicle.batteryCapacity_kWh} kWh
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Current Battery</Text>
            <Text style={styles.detailValue}>{vehicle.batteryPercent}%</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Efficiency</Text>
            <Text style={styles.detailValue}>
              {vehicle.efficiency_kWh_per_km} kWh/km
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Connectors</Text>
            <Text style={styles.detailValue}>
              {vehicle.compatibleConnectors?.join(", ") || "None"}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() =>
          vehicle._id &&
          navigation.navigate("EditVehicle", { vehicleId: vehicle._id })
        }
      >
        <Ionicons name="pencil-outline" size={16} color="#4CAF50" />
        <Text style={styles.editButtonText}>Edit Vehicle</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {!user?.vehicleProfiles || user.vehicleProfiles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>No Vehicles Added</Text>
            <Text style={styles.emptyDescription}>
              Add your electric vehicle to get personalized charging
              recommendations
            </Text>
          </View>
        ) : (
          user.vehicleProfiles.map((vehicle, index) =>
            renderVehicleCard(vehicle, index),
          )
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddVehicle")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 40,
  },
  vehicleCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  vehicleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  vehicleType: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  vehicleDetails: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: "#666",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginTop: 2,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: "#f0f0f0",
  },
  editButtonText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 6,
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});
