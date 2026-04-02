import React, { useState } from "react";
import { Switch, Alert } from "react-native";
import { useRouter } from "expo-router";
import styled from "styled-components/native";
import { useLocation } from "@/context/LocationContext";
import { useRecommendation } from "@/context/RecommendationContext";
import { useRouteRecommendations } from "@/hooks/useApi";
import { FormInput, FormSection } from "@/components/common/FormComponents";
import { Chip, ChipGroup } from "@/components/common/Chip";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { colors, spacing, typography } from "@/theme";
import type { ConnectorType } from "@/types";

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${colors.background.default};
`;

const Content = styled.View`
  padding: ${spacing.xl}px;
  padding-bottom: 40px;
`;

const Title = styled.Text`
  font-size: ${typography.sizes.xxl}px;
  font-weight: bold;
  color: ${colors.text.primary};
  margin-bottom: ${spacing.xs}px;
`;

const Subtitle = styled.Text`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.secondary};
  margin-bottom: ${spacing.xxl}px;
`;

const SwitchContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: ${colors.background.secondary};
  padding: ${spacing.lg}px;
  border-radius: 12px;
  margin-bottom: ${spacing.xl}px;
`;

const SwitchTextContainer = styled.View`
  flex: 1;
  margin-right: ${spacing.md}px;
`;

const SwitchLabel = styled.Text`
  font-size: ${typography.sizes.md}px;
  font-weight: 600;
  color: ${colors.text.primary};
`;

const SwitchDescription = styled.Text`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.secondary};
  margin-top: ${spacing.xs}px;
`;

const SectionSubtitle = styled.Text`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.secondary};
  margin-bottom: ${spacing.md}px;
`;

const SummaryContainer = styled.View`
  background-color: ${colors.background.secondary};
  padding: ${spacing.xl}px;
  border-radius: 12px;
  margin-bottom: ${spacing.xl}px;
`;

const SummaryTitle = styled.Text`
  font-size: ${typography.sizes.md}px;
  font-weight: 600;
  color: ${colors.text.primary};
  margin-bottom: ${spacing.lg}px;
`;

const SummaryRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: ${spacing.sm}px;
`;

const SummaryLabel = styled.Text`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.secondary};
`;

const SummaryValue = styled.Text`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.primary};
  font-weight: 500;
`;

const ErrorContainer = styled.View`
  background-color: ${colors.background.error};
  padding: ${spacing.lg}px;
  border-radius: 10px;
  margin-bottom: ${spacing.xl}px;
`;

const ErrorText = styled.Text`
  color: ${colors.error};
  font-size: ${typography.sizes.sm}px;
`;

const ButtonContainer = styled.View`
  margin-top: ${spacing.md}px;
`;

const OffsetInputRow = styled.View`
  flex-direction: row;
  align-items: flex-end;
  gap: ${spacing.md}px;
`;

const OffsetInputWrapper = styled.View`
  flex: 1;
`;

const UnitSelectorWrapper = styled.View`
  width: 120px;
  margin-bottom: ${spacing.md}px;
`;

type OffsetUnit = "km" | "m";

export default function PreferencesScreen() {
  const router = useRouter();
  const { location } = useLocation();
  const {
    vehicleProfile,
    destination,
    setPreferences,
    setResults,
    routeOffsetKm,
    setRouteOffsetKm,
  } = useRecommendation();

  const [preferFastCharging, setPreferFastCharging] = useState(true);
  const [preferredConnector, setPreferredConnector] = useState<
    ConnectorType | undefined
  >(vehicleProfile?.compatibleConnectors[0]);

  // Offset state
  const [offsetValue, setOffsetValue] = useState(String(routeOffsetKm));
  const [offsetUnit, setOffsetUnit] = useState<OffsetUnit>("km");
  const [offsetError, setOffsetError] = useState<string | undefined>();

  const availableConnectors = vehicleProfile?.compatibleConnectors || [];

  // Use React Query mutation for recommendations
  const recommendationsMutation = useRouteRecommendations();

  const validateOffset = (value: string, unit: OffsetUnit): number | null => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setOffsetError("Offset must be a positive number");
      return null;
    }

    // Convert to km if needed
    const kmValue = unit === "m" ? numValue / 1000 : numValue;

    if (kmValue > 50) {
      setOffsetError("Offset cannot exceed 50 km");
      return null;
    }

    if (kmValue < 0.1) {
      setOffsetError("Offset must be at least 100 meters");
      return null;
    }

    setOffsetError(undefined);
    return kmValue;
  };

  const handleOffsetChange = (value: string) => {
    setOffsetValue(value);
    if (value) {
      validateOffset(value, offsetUnit);
    } else {
      setOffsetError(undefined);
    }
  };

  const handleUnitChange = (index: number) => {
    const newUnit: OffsetUnit = index === 0 ? "km" : "m";
    setOffsetUnit(newUnit);

    // Convert the value when switching units
    if (offsetValue) {
      const numValue = parseFloat(offsetValue);
      if (!isNaN(numValue)) {
        if (newUnit === "m" && offsetUnit === "km") {
          setOffsetValue(String(numValue * 1000));
        } else if (newUnit === "km" && offsetUnit === "m") {
          setOffsetValue(String(numValue / 1000));
        }
      }
    }
  };

  const handleSubmit = () => {
    if (!location || !vehicleProfile || !destination) {
      Alert.alert(
        "Error",
        "Missing required information. Please go back and try again.",
      );
      return;
    }

    const finalOffsetKm = validateOffset(offsetValue, offsetUnit);
    if (finalOffsetKm === null) {
      return;
    }

    setRouteOffsetKm(finalOffsetKm);

    const preferences = {
      preferredConnector,
      preferFastCharging,
    };

    setPreferences(preferences);

    recommendationsMutation.mutate(
      {
        vehicleProfile,
        currentLocation: location,
        destination,
        routeOffsetKm: finalOffsetKm,
        preferences,
        limit: 10,
      },
      {
        onSuccess: (response) => {
          setResults(
            response.data.recommendations,
            response.data.routeInfo,
            response.data.searchArea,
          );
          router.replace("/");
        },
        onError: (err) => {
          console.error("Recommendation error:", err);
        },
      },
    );
  };

  return (
    <Container>
      <Content>
        <Title>Charging Preferences</Title>
        <Subtitle>
          Customize your recommendations based on your preferences
        </Subtitle>

        <SwitchContainer>
          <SwitchTextContainer>
            <SwitchLabel>Prefer Fast Charging</SwitchLabel>
            <SwitchDescription>
              Prioritize stations with higher power output
            </SwitchDescription>
          </SwitchTextContainer>
          <Switch
            value={preferFastCharging}
            onValueChange={setPreferFastCharging}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={preferFastCharging ? colors.primary : "#f4f3f4"}
          />
        </SwitchContainer>

        <FormSection title="Preferred Connector">
          <SectionSubtitle>
            Select your preferred connector type (optional)
          </SectionSubtitle>
          <ChipGroup>
            <Chip
              label="Any"
              selected={!preferredConnector}
              onPress={() => setPreferredConnector(undefined)}
            />
            {availableConnectors.map((connector) => (
              <Chip
                key={connector}
                label={connector}
                selected={preferredConnector === connector}
                onPress={() => setPreferredConnector(connector)}
              />
            ))}
          </ChipGroup>
        </FormSection>

        <FormSection title="Route Offset">
          <SectionSubtitle>
            How far from the route should we search for stations?
          </SectionSubtitle>
          <OffsetInputRow>
            <OffsetInputWrapper>
              <FormInput
                label=""
                value={offsetValue}
                onChangeText={handleOffsetChange}
                keyboardType="decimal-pad"
                placeholder={offsetUnit === "km" ? "e.g., 5" : "e.g., 5000"}
                error={offsetError}
              />
            </OffsetInputWrapper>
            <UnitSelectorWrapper>
              <SegmentedControl
                options={["km", "m"]}
                selectedIndex={offsetUnit === "km" ? 0 : 1}
                onSelect={handleUnitChange}
              />
            </UnitSelectorWrapper>
          </OffsetInputRow>
        </FormSection>

        <SummaryContainer>
          <SummaryTitle>Summary</SummaryTitle>
          <SummaryRow>
            <SummaryLabel>Vehicle Type:</SummaryLabel>
            <SummaryValue>{vehicleProfile?.vehicleType}</SummaryValue>
          </SummaryRow>
          <SummaryRow>
            <SummaryLabel>Battery:</SummaryLabel>
            <SummaryValue>
              {vehicleProfile?.batteryPercent}% of{" "}
              {vehicleProfile?.batteryCapacity_kWh} kWh
            </SummaryValue>
          </SummaryRow>
          <SummaryRow>
            <SummaryLabel>Destination:</SummaryLabel>
            <SummaryValue>
              {destination?.latitude.toFixed(4)},{" "}
              {destination?.longitude.toFixed(4)}
            </SummaryValue>
          </SummaryRow>
          <SummaryRow>
            <SummaryLabel>Route Offset:</SummaryLabel>
            <SummaryValue>
              {offsetUnit === "km"
                ? offsetValue
                : (parseFloat(offsetValue) / 1000).toFixed(2)}{" "}
              km
            </SummaryValue>
          </SummaryRow>
        </SummaryContainer>

        {recommendationsMutation.error && (
          <ErrorContainer>
            <ErrorText>
              {recommendationsMutation.error instanceof Error
                ? recommendationsMutation.error.message
                : "Failed to get recommendations"}
            </ErrorText>
          </ErrorContainer>
        )}

        <ButtonContainer>
          <PrimaryButton
            text="Get Recommendations"
            onPress={handleSubmit}
            loading={recommendationsMutation.isPending}
            disabled={recommendationsMutation.isPending}
          />
        </ButtonContainer>
      </Content>
    </Container>
  );
}
