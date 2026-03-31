import React, { useState } from "react";
import { useRouter } from "expo-router";
import styled from "styled-components/native";
import { useRecommendation } from "../../context/RecommendationContext";
import { FormInput, FormSection } from "../../components/common/FormComponents";
import { SegmentedControl } from "../../components/common/SegmentedControl";
import { Chip, ChipGroup } from "../../components/common/Chip";
import { PrimaryButton } from "../../components/common/PrimaryButton";
import { colors, spacing, typography } from "../../theme";
import { CONNECTOR_OPTIONS } from "../../constants";
import type { VehicleType, ConnectorType } from "../../types";

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

const ButtonContainer = styled.View`
  margin-top: ${spacing.xl}px;
`;

const VEHICLE_TYPES = [
  { value: "car", label: "Car" },
  { value: "bike", label: "Bike" },
] as const;

export default function VehicleInfoScreen() {
  const router = useRouter();
  const { setVehicleProfile } = useRecommendation();

  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [batteryCapacity, setBatteryCapacity] = useState("60");
  const [efficiency, setEfficiency] = useState("0.2");
  const [batteryPercent, setBatteryPercent] = useState("30");
  const [selectedConnectors, setSelectedConnectors] = useState<ConnectorType[]>([
    "CCS",
    "Type2",
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableConnectors = CONNECTOR_OPTIONS.filter(
    (c) => c.forVehicle === vehicleType
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

    router.push("/maps/destination");
  };

  return (
    <Container>
      <Content>
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

        <ButtonContainer>
          <PrimaryButton text="Next: Select Destination" onPress={handleNext} />
        </ButtonContainer>
      </Content>
    </Container>
  );
}
