import React, { useState } from "react";
import { useRouter } from "expo-router";
import styled from "styled-components/native";
import { useRecommendation } from "@/context/RecommendationContext";
import { FormInput, FormSection } from "@/components/common/FormComponents";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { Chip, ChipGroup } from "@/components/common/Chip";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { colors, spacing, typography } from "@/theme";
import { CONNECTOR_OPTIONS } from "@/constants";
import { api } from "@/services";
import type { VehicleType, ConnectorType, VehicleCatalogItem } from "@/types";

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${colors.background.default};
`;

const Content = styled.View`
  padding: ${spacing.xl}px;
  padding-bottom: 40px;
`;

const ErrorText = styled.Text`
  color: ${colors.error};
  font-size: ${typography.sizes.sm}px;
  margin-top: ${spacing.xs}px;
`;

const HelperText = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.sm}px;
  margin-top: ${spacing.sm}px;
  line-height: 20px;
`;

const ButtonContainer = styled.View`
  margin-top: ${spacing.xl}px;
`;

const ResultCard = styled.TouchableOpacity`
  border-width: 1px;
  border-color: ${colors.border};
  border-radius: 12px;
  padding: ${spacing.md}px;
  margin-bottom: ${spacing.sm}px;
  background-color: ${colors.background.secondary};
`;

const ResultTitle = styled.Text`
  color: ${colors.text.primary};
  font-size: ${typography.sizes.md}px;
  font-weight: 600;
  margin-bottom: ${spacing.xs}px;
`;

const ResultSubtitle = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.sm}px;
`;

const VEHICLE_TYPES = [
  { value: "car", label: "Car" },
  { value: "bike", label: "Bike" },
] as const;

type EntryMode = "manual" | "search";

export default function VehicleInfoScreen() {
  const router = useRouter();
  const { setVehicleProfile } = useRecommendation();

  const [entryMode, setEntryMode] = useState<EntryMode>("manual");
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [batteryCapacity, setBatteryCapacity] = useState("60");
  const [efficiency, setEfficiency] = useState("0.2");
  const [batteryPercent, setBatteryPercent] = useState("30");
  const [selectedConnectors, setSelectedConnectors] = useState<ConnectorType[]>(
    ["CCS", "Type2"],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VehicleCatalogItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableConnectors = CONNECTOR_OPTIONS.filter(
    (c) => c.forVehicle === vehicleType,
  );

  const toggleConnector = (connector: ConnectorType) => {
    setSelectedConnectors((prev) => {
      if (prev.includes(connector)) {
        return prev.filter((c) => c !== connector);
      }
      return [...prev, connector];
    });
  };

  const handleVehicleTypeChange = (type: string) => {
    const vehicleTypeValue = type as VehicleType;
    setVehicleType(vehicleTypeValue);
    if (vehicleTypeValue === "bike") {
      setSelectedConnectors(["AC_SLOW"]);
      setBatteryCapacity("3");
      setEfficiency("0.03");
    } else {
      setSelectedConnectors(["CCS", "Type2"]);
      setBatteryCapacity("60");
      setEfficiency("0.2");
    }
  };

  const applyVehicleSelection = (vehicle: VehicleCatalogItem) => {
    const selectedVehicleType = vehicle.vehicleType;
    const supportedConnectors = vehicle.compatibleConnectors.filter(
      (connector) =>
        CONNECTOR_OPTIONS.some(
          (option) =>
            option.value === connector &&
            option.forVehicle === selectedVehicleType,
        ),
    );

    setVehicleType(selectedVehicleType);
    setBatteryCapacity(String(vehicle.batteryCapacity_kWh));
    setEfficiency(selectedVehicleType === "bike" ? "0.03" : "0.2");
    setBatteryPercent("30");
    setSelectedConnectors(
      supportedConnectors.length > 0
        ? supportedConnectors
        : selectedVehicleType === "bike"
          ? ["AC_SLOW"]
          : ["CCS"],
    );
    setSearchQuery(
      [vehicle.make, vehicle.modelName, vehicle.variant]
        .filter(Boolean)
        .join(" "),
    );
    setSearchError("");
    setEntryMode("manual");
  };

  const handleSearchVehicles = async () => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchError("Enter a make or model to search the catalog.");
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const response = await api.searchVehicles(query, vehicleType);
      setSearchResults(response.data.vehicles);

      if (response.data.vehicles.length === 0) {
        setSearchError(
          "No vehicles matched that search. Try manual entry instead.",
        );
      }
    } catch (error) {
      setSearchResults([]);
      setSearchError(
        error instanceof Error
          ? error.message
          : "Unable to search vehicles right now.",
      );
    } finally {
      setIsSearching(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const capacity = parseFloat(batteryCapacity);
    if (isNaN(capacity) || capacity <= 0 || capacity > 200) {
      newErrors.batteryCapacity =
        "Battery capacity must be between 0 and 200 kWh";
    }

    const eff = parseFloat(efficiency);
    if (isNaN(eff) || eff <= 0 || eff > 1) {
      newErrors.efficiency = "Efficiency must be between 0 and 1 kWh/km";
    }

    const percent = parseFloat(batteryPercent);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      newErrors.batteryPercent = "Battery percent must be between 0 and 100";
    }

    if (selectedConnectors.length === 0) {
      newErrors.connectors = "Select at least one connector type";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;

    setVehicleProfile({
      vehicleType,
      batteryCapacity_kWh: parseFloat(batteryCapacity),
      efficiency_kWh_per_km: parseFloat(efficiency),
      batteryPercent: parseFloat(batteryPercent),
      compatibleConnectors: selectedConnectors,
    });

    router.push("/destination");
  };

  return (
    <Container>
      <Content>
        <FormSection title="How do you want to add your vehicle?">
          <SegmentedControl
            options={["Search Vehicle", "Manual Entry"]}
            selectedIndex={entryMode === "search" ? 0 : 1}
            onSelect={(index) => {
              const nextMode = index === 0 ? "search" : "manual";
              setEntryMode(nextMode);
              setSearchError("");
              if (nextMode === "manual") {
                setSearchResults([]);
              }
            }}
          />
        </FormSection>

        {entryMode === "search" ? (
          <>
            <FormInput
              label="Search by make or model"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (searchError) {
                  setSearchError("");
                }
              }}
              placeholder="e.g. Tesla Model 3"
            />

            <ButtonContainer>
              <PrimaryButton
                text={isSearching ? "Searching..." : "Search Vehicle Catalog"}
                onPress={handleSearchVehicles}
              />
            </ButtonContainer>

            {searchError ? <ErrorText>{searchError}</ErrorText> : null}
            {isSearching ? (
              <HelperText>Searching the catalog...</HelperText>
            ) : null}

            {searchResults.length > 0 && (
              <FormSection title="Search Results">
                {searchResults.map((vehicle) => (
                  <ResultCard
                    key={
                      vehicle._id ??
                      `${vehicle.make}-${vehicle.modelName}-${vehicle.variant ?? "base"}`
                    }
                    onPress={() => applyVehicleSelection(vehicle)}
                    activeOpacity={0.85}
                  >
                    <ResultTitle>
                      {[vehicle.make, vehicle.modelName, vehicle.variant]
                        .filter(Boolean)
                        .join(" ")}
                    </ResultTitle>
                    <ResultSubtitle>
                      {vehicle.vehicleType === "bike" ? "Bike" : "Car"} •{" "}
                      {vehicle.batteryCapacity_kWh} kWh •{" "}
                      {vehicle.compatibleConnectors.join(", ")}
                    </ResultSubtitle>
                  </ResultCard>
                ))}
              </FormSection>
            )}

            <HelperText>
              Choose a result to prefill the form, or switch to manual entry if
              you want to type the values yourself.
            </HelperText>
          </>
        ) : (
          <>
            <FormSection title="Vehicle Type">
              <SegmentedControl
                options={VEHICLE_TYPES.map((t) => t.label)}
                selectedIndex={vehicleType === "car" ? 0 : 1}
                onSelect={(index) =>
                  handleVehicleTypeChange(VEHICLE_TYPES[index].value)
                }
              />
            </FormSection>

            <FormInput
              label="Battery Capacity (kWh)"
              value={batteryCapacity}
              onChangeText={setBatteryCapacity}
              keyboardType="decimal-pad"
              placeholder="e.g., 60"
              error={errors.batteryCapacity}
            />

            <FormInput
              label="Efficiency (kWh/km)"
              value={efficiency}
              onChangeText={setEfficiency}
              keyboardType="decimal-pad"
              placeholder="e.g., 0.2"
              error={errors.efficiency}
            />

            <FormInput
              label="Current Battery (%)"
              value={batteryPercent}
              onChangeText={setBatteryPercent}
              keyboardType="decimal-pad"
              placeholder="e.g., 30"
              error={errors.batteryPercent}
            />

            <FormSection title="Compatible Connectors">
              <ChipGroup>
                {availableConnectors.map((connector) => (
                  <Chip
                    key={connector.value}
                    label={connector.label}
                    selected={selectedConnectors.includes(connector.value)}
                    onPress={() => toggleConnector(connector.value)}
                  />
                ))}
              </ChipGroup>
              {errors.connectors && <ErrorText>{errors.connectors}</ErrorText>}
            </FormSection>
          </>
        )}

        <ButtonContainer>
          <PrimaryButton text="Next: Select Destination" onPress={handleNext} />
        </ButtonContainer>
      </Content>
    </Container>
  );
}
