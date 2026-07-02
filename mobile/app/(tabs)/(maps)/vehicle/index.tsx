import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { default as styled } from "styled-components/native";
import { useAuth } from "@/context/AuthContext";
import { useRecommendation } from "@/context/RecommendationContext";
import { FormInput, FormSection } from "@/components/common/FormComponents";
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
  margin-bottom: ${spacing.sm}px;
  line-height: 20px;
`;

const ButtonContainer = styled.View`
  margin-top: ${spacing.xl}px;
`;

const ResultCard = styled.View`
  flex-direction: row;
  align-items: center;
  border-width: 1px;
  border-color: ${colors.border};
  border-radius: 14px;
  padding: ${spacing.md}px;
  margin-bottom: ${spacing.sm}px;
  background-color: ${colors.background.secondary};
`;

const ResultImagePlaceholder = styled.View`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background-color: ${colors.background.default};
  border-width: 1px;
  border-color: ${colors.border};
  margin-right: ${spacing.md}px;
  justify-content: center;
  align-items: center;
`;

const ResultImageText = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.xs}px;
  font-weight: 600;
  text-transform: uppercase;
`;

const ResultContent = styled.View`
  flex: 1;
`;

const ResultTitle = styled.Text`
  color: ${colors.text.primary};
  font-size: ${typography.sizes.lg}px;
  font-weight: 700;
  margin-bottom: ${spacing.xs}px;
`;

const BottomText = styled(ResultTitle)`
  text-align: center;
  margin-bottom: 10px;
`;

const ResultModel = styled.Text`
  color: ${colors.text.primary};
  font-size: ${typography.sizes.md}px;
  font-weight: 600;
  margin-bottom: ${spacing.xs}px;
`;

const ResultVariant = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.sm}px;
  margin-bottom: ${spacing.xs}px;
`;

const ResultSubtitle = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.sm}px;
`;

const ResultActions = styled.View`
  margin-top: ${spacing.sm}px;
  gap: ${spacing.sm}px;
`;

const ResultActionButton = styled.TouchableOpacity<{
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}>`
  padding: ${spacing.sm}px ${spacing.md}px;
  border-radius: 999px;
  align-items: center;
  justify-content: center;
  background-color: ${(props) =>
    props.variant === "secondary"
      ? colors.background.default
      : props.variant === "danger"
        ? colors.secondary
        : colors.primary};
  border-width: ${(props) => (props.variant === "secondary" ? 1 : 0)}px;
  border-color: ${colors.primary};
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
`;

const ResultActionText = styled.Text<{ variant?: "primary" | "secondary" }>`
  color: ${(props) =>
    props.variant === "secondary" ? colors.primary : colors.text.inverse};
  font-size: ${typography.sizes.sm}px;
  font-weight: 700;
`;

const SearchActions = styled.View`
  margin-top: ${spacing.sm}px;
`;

export default function VehicleSearchScreen() {
  const router = useRouter();
  const { user, addVehicleProfile, removeVehicleProfile } = useAuth();
  const { setVehicleProfile } = useRecommendation();

  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VehicleCatalogItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleCatalogItem | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [addingVehicleId, setAddingVehicleId] = useState<string | null>(null);
  const [removingVehicleId, setRemovingVehicleId] = useState<string | null>(
    null,
  );

  const [batteryPercent, setBatteryPercent] = useState("");
  const [efficiency, setEfficiency] = useState("");
  const [selectedConnectors, setSelectedConnectors] = useState<ConnectorType[]>(
    [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchedOnce = useRef<boolean>(false);
  const [showSearchSection, setShowSearchSection] = useState(false);

  const availableConnectors = CONNECTOR_OPTIONS.filter(
    (connector) => connector.forVehicle === vehicleType,
  );

  const savedVehicleProfiles = user?.vehicleProfiles ?? [];
  const hasSavedVehicleProfiles = savedVehicleProfiles.length > 0;

  useEffect(() => {
    if (!selectedVehicle && !hasSavedVehicleProfiles) {
      setShowSearchSection(true);
    }
  }, [hasSavedVehicleProfiles, selectedVehicle]);

  const isSavedVehicle = (vehicle: VehicleCatalogItem) =>
    savedVehicleProfiles.some((savedVehicle) => {
      if (vehicle._id && savedVehicle._id) {
        return savedVehicle._id === vehicle._id;
      }

      return (
        savedVehicle.make === vehicle.make &&
        savedVehicle.modelName === vehicle.modelName &&
        savedVehicle.variant === vehicle.variant &&
        savedVehicle.vehicleType === vehicle.vehicleType
      );
    });

  const toggleConnector = (connector: ConnectorType) => {
    setSelectedConnectors((prev) => {
      if (prev.includes(connector)) {
        return prev.filter((item) => item !== connector);
      }
      return [...prev, connector];
    });
  };

  const applyVehicleSelection = (vehicle: VehicleCatalogItem) => {
    setSelectedVehicle(vehicle);
    setVehicleType(vehicle.vehicleType);
    setBatteryPercent("");
    setEfficiency("");
    setSelectedConnectors(vehicle.compatibleConnectors);
    setSearchError("");
    setActionMessage("");
  };

  const openSearchSection = () => {
    setShowSearchSection(true);
    setActionMessage("");
  };

  const openSavedVehiclesSection = () => {
    setShowSearchSection(false);
    setActionMessage("");
  };

  const handleAddVehicleProfile = async (vehicle: VehicleCatalogItem) => {
    if (!vehicle._id) {
      setActionMessage("This vehicle cannot be saved right now.");
      return;
    }

    if (isSavedVehicle(vehicle)) {
      setActionMessage("This vehicle is already in your profile.");
      return;
    }

    try {
      setAddingVehicleId(vehicle._id);
      await addVehicleProfile(vehicle._id);
      setActionMessage("Vehicle added to your profile.");
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "Unable to save vehicle.",
      );
    } finally {
      setAddingVehicleId(null);
    }
  };

  const handleRemoveVehicleProfile = async (vehicle: VehicleCatalogItem) => {
    if (!vehicle._id) {
      setActionMessage("This vehicle cannot be removed right now.");
      return;
    }

    if (!isSavedVehicle(vehicle)) {
      setActionMessage("This vehicle is not in your profile.");
      return;
    }

    try {
      setRemovingVehicleId(vehicle._id);
      await removeVehicleProfile(vehicle._id);
      setActionMessage("Vehicle removed from your profile.");
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "Unable to remove vehicle.",
      );
    } finally {
      setRemovingVehicleId(null);
    }
  };

  const handleSearchVehicles = async (query: string) => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 3) {
      setSearchResults([]);
      //   setSearchError("Type at least 3 letters to search");
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const response = await api.searchVehicles(trimmedQuery);
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
      searchedOnce.current = true;
    }
  };

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      //   setSearchError(searchQuery.trim().length === 0 ? "" : "Type at least 3 letters to search.");
      return;
    }

    setSearchError("");
    debounceTimerRef.current = setTimeout(() => {
      void handleSearchVehicles(searchQuery);
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const percent = parseFloat(batteryPercent);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      newErrors.batteryPercent = "Battery percent must be between 0 and 100";
    }

    const eff = parseFloat(efficiency);
    if (isNaN(eff) || eff <= 0 || eff > 1) {
      newErrors.efficiency = "Efficiency must be between 0 and 1 kWh/km";
    }

    if (selectedConnectors.length === 0) {
      newErrors.connectors = "Select at least one connector type";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!selectedVehicle) return;
    if (!validate()) return;

    setVehicleProfile({
      vehicleType: selectedVehicle.vehicleType,
      batteryCapacity_kWh: selectedVehicle.batteryCapacity_kWh,
      efficiency_kWh_per_km: parseFloat(efficiency),
      batteryPercent: parseFloat(batteryPercent),
      compatibleConnectors: selectedConnectors,
    });

    router.push("/destination");
  };

  return (
    <Container>
      <Content>
        {selectedVehicle ? (
          <>
            <FormSection title="Selected Vehicle">
              <ResultCard>
                <ResultImagePlaceholder>
                  <ResultImageText>Image</ResultImageText>
                </ResultImagePlaceholder>

                <ResultContent>
                  <ResultTitle>{selectedVehicle.make}</ResultTitle>
                  <ResultModel>{selectedVehicle.modelName}</ResultModel>
                  {selectedVehicle.variant ? (
                    <ResultVariant>{selectedVehicle.variant}</ResultVariant>
                  ) : null}
                  <ResultSubtitle>
                    {selectedVehicle.vehicleType === "bike" ? "Bike" : "Car"} •{" "}
                    {selectedVehicle.batteryCapacity_kWh} kWh •{" "}
                    {selectedVehicle.compatibleConnectors.join(", ")}
                  </ResultSubtitle>
                </ResultContent>
              </ResultCard>
            </FormSection>

            <HelperText>
              Vehicle details come from your saved profile or the catalog. You
              still enter battery percentage and efficiency manually.
            </HelperText>

            <FormInput
              label="Current Battery (%)"
              value={batteryPercent}
              onChangeText={setBatteryPercent}
              keyboardType="decimal-pad"
              placeholder="e.g., 30"
              error={errors.batteryPercent}
            />

            <FormInput
              label="Efficiency (kWh/km)"
              value={efficiency}
              onChangeText={setEfficiency}
              keyboardType="decimal-pad"
              placeholder="e.g., 0.2"
              error={errors.efficiency}
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
              {errors.connectors ? (
                <ErrorText>{errors.connectors}</ErrorText>
              ) : null}
            </FormSection>
          </>
        ) : hasSavedVehicleProfiles && !showSearchSection ? (
          <FormSection title="Your Vehicles">
            <HelperText>
              These are your saved vehicles. Choose one explicitly when you want
              to use it.
            </HelperText>

            {savedVehicleProfiles.map((vehicle) => {
              return (
                <ResultCard
                  key={
                    vehicle._id ??
                    `${vehicle.make}-${vehicle.modelName}-${vehicle.variant ?? "base"}`
                  }
                >
                  <ResultImagePlaceholder>
                    <ResultImageText>Image</ResultImageText>
                  </ResultImagePlaceholder>

                  <ResultContent>
                    <ResultTitle>{vehicle.make}</ResultTitle>
                    <ResultModel>{vehicle.modelName}</ResultModel>
                    {vehicle.variant ? (
                      <ResultVariant>{vehicle.variant}</ResultVariant>
                    ) : null}
                    <ResultSubtitle>
                      {vehicle.vehicleType === "bike" ? "Bike" : "Car"} •{" "}
                      {vehicle.batteryCapacity_kWh} kWh •{" "}
                      {vehicle.compatibleConnectors.join(", ")}
                    </ResultSubtitle>

                    <ResultActions>
                      <ResultActionButton
                        onPress={() => applyVehicleSelection(vehicle)}
                        activeOpacity={0.85}
                      >
                        <ResultActionText>Use this vehicle</ResultActionText>
                      </ResultActionButton>

                      <ResultActionButton
                        onPress={() => void handleRemoveVehicleProfile(vehicle)}
                        activeOpacity={0.85}
                        variant="danger"
                        disabled={removingVehicleId === vehicle._id}
                      >
                        <ResultActionText>
                          {removingVehicleId === vehicle._id
                            ? "Removing..."
                            : "Remove from profile"}
                        </ResultActionText>
                      </ResultActionButton>
                    </ResultActions>
                  </ResultContent>
                </ResultCard>
              );
            })}

            <ButtonContainer>
              <PrimaryButton
                text="Search for a vehicle"
                onPress={openSearchSection}
              />
            </ButtonContainer>
          </FormSection>
        ) : null}

        {!selectedVehicle && showSearchSection ? (
          <>
            <FormSection title="Search Vehicle">
              <FormInput
                label="Search by make or model"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (searchError) {
                    setSearchError("");
                  }
                  if (actionMessage) {
                    setActionMessage("");
                  }
                }}
                placeholder="e.g. Tesla Model 3"
              />

              {searchError ? <ErrorText>{searchError}</ErrorText> : null}
              {actionMessage ? <HelperText>{actionMessage}</HelperText> : null}
              {isSearching ? (
                <HelperText>Searching the catalog...</HelperText>
              ) : null}
              <HelperText>
                Search results include both bikes and cars.
              </HelperText>
            </FormSection>

            {hasSavedVehicleProfiles ? (
              <ButtonContainer>
                <PrimaryButton
                  text="Back to my vehicles"
                  onPress={openSavedVehiclesSection}
                  variant="secondary"
                />
              </ButtonContainer>
            ) : null}

            {searchResults.length > 0 && (
              <FormSection title="Search Results">
                {searchResults.map((vehicle) => (
                  <ResultCard
                    key={
                      vehicle._id ??
                      `${vehicle.make}-${vehicle.modelName}-${vehicle.variant ?? "base"}`
                    }
                  >
                    <ResultImagePlaceholder>
                      <ResultImageText>Image</ResultImageText>
                    </ResultImagePlaceholder>

                    <ResultContent>
                      <ResultTitle>{vehicle.make}</ResultTitle>
                      <ResultModel>{vehicle.modelName}</ResultModel>
                      {vehicle.variant ? (
                        <ResultVariant>{vehicle.variant}</ResultVariant>
                      ) : null}
                      <ResultSubtitle>
                        {vehicle.vehicleType === "bike" ? "Bike" : "Car"} •{" "}
                        {vehicle.batteryCapacity_kWh} kWh •{" "}
                        {vehicle.compatibleConnectors.join(", ")}
                      </ResultSubtitle>

                      <ResultActions>
                        <ResultActionButton
                          onPress={() => applyVehicleSelection(vehicle)}
                          activeOpacity={0.85}
                        >
                          <ResultActionText>Use this vehicle</ResultActionText>
                        </ResultActionButton>

                        {user ? (
                          isSavedVehicle(vehicle) ? (
                            <ResultActionButton
                              onPress={() =>
                                void handleRemoveVehicleProfile(vehicle)
                              }
                              activeOpacity={0.85}
                              variant="danger"
                              disabled={removingVehicleId === vehicle._id}
                            >
                              <ResultActionText>
                                {removingVehicleId === vehicle._id
                                  ? "Removing..."
                                  : "Remove from profile"}
                              </ResultActionText>
                            </ResultActionButton>
                          ) : (
                            <ResultActionButton
                              onPress={() =>
                                void handleAddVehicleProfile(vehicle)
                              }
                              activeOpacity={0.85}
                              variant="secondary"
                              disabled={addingVehicleId === vehicle._id}
                            >
                              <ResultActionText variant="secondary">
                                {addingVehicleId === vehicle._id
                                  ? "Adding..."
                                  : "Add to my vehicles"}
                              </ResultActionText>
                            </ResultActionButton>
                          )
                        ) : null}
                      </ResultActions>
                    </ResultContent>
                  </ResultCard>
                ))}
              </FormSection>
            )}
          </>
        ) : null}

        {selectedVehicle ? (
          <ButtonContainer>
            <PrimaryButton
              text="Next: Select Destination"
              onPress={handleNext}
            />
          </ButtonContainer>
        ) : null}

        {!selectedVehicle && showSearchSection && searchedOnce.current ? (
          <SearchActions>
            <BottomText>Didn&apos;t find your vehicle?</BottomText>
            <PrimaryButton
              text="Enter Manually"
              onPress={() => router.push("/vehicle/manual")}
            />
          </SearchActions>
        ) : null}
      </Content>
    </Container>
  );
}
