import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import styled from "styled-components/native";
import { Chip, ChipGroup } from "@/components/common/Chip";
import { FormInput, FormSection } from "@/components/common/FormComponents";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services";
import { colors, spacing, typography } from "@/theme";
import type { ConnectorType, VehicleType } from "@/types";

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${colors.background.default};
`;

const Content = styled.View`
  padding: ${spacing.xl}px;
  padding-bottom: 48px;
`;

const Title = styled.Text`
  color: ${colors.text.primary};
  font-size: ${typography.sizes.xl}px;
  font-weight: 800;
  margin-bottom: ${spacing.xs}px;
`;

const Subtitle = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.md}px;
  line-height: 20px;
  margin-bottom: ${spacing.xl}px;
`;

const ErrorText = styled.Text`
  color: ${colors.error};
  font-size: ${typography.sizes.sm}px;
  margin-top: ${spacing.sm}px;
`;

const HelperText = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.sm}px;
  margin-top: ${spacing.sm}px;
  line-height: 18px;
`;

const ImageCard = styled.View`
  border-width: 1px;
  border-color: ${colors.border};
  border-radius: 16px;
  overflow: hidden;
  background-color: ${colors.background.secondary};
  margin-bottom: ${spacing.md}px;
`;

const ImagePreview = styled(Image)`
  width: 100%;
  height: 220px;
`;

const ImagePlaceholder = styled.View`
  width: 100%;
  height: 220px;
  align-items: center;
  justify-content: center;
  background-color: ${colors.background.tertiary};
`;

const ImagePlaceholderText = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.sm}px;
  font-weight: 700;
`;

const ButtonGroup = styled.View`
  gap: ${spacing.sm}px;
`;

const Divider = styled.View`
  height: 1px;
  background-color: ${colors.border};
  margin: ${spacing.xl}px 0;
`;

const VEHICLE_TYPES = [
  { label: "Car", value: "car" },
  { label: "Bike", value: "bike" },
] as const;

const CONNECTOR_OPTIONS: ConnectorType[] = [
  "AC_SLOW",
  "Type2",
  "CCS",
  "CHAdeMO",
];

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function parseConnectorParam(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as ConnectorType[];
}

export default function VehicleRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token, isAuthenticated, isLoading } = useAuth();

  const [requestType, setRequestType] = useState<VehicleType>("car");
  const [requestMake, setRequestMake] = useState("");
  const [requestModelName, setRequestModelName] = useState("");
  const [requestVariant, setRequestVariant] = useState("");
  const [requestBatteryCapacity, setRequestBatteryCapacity] = useState("");
  const [requestEfficiency, setRequestEfficiency] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestConnectors, setRequestConnectors] = useState<ConnectorType[]>([]);
  const [vehicleImageUrl, setVehicleImageUrl] = useState("");
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const make = paramValue(params.make);
    const modelName = paramValue(params.modelName);
    const variant = paramValue(params.variant);
    const vehicleType = paramValue(params.vehicleType);
    const batteryCapacity = paramValue(params.batteryCapacity_kWh);
    const efficiency = paramValue(params.efficiency_kWh_per_km);
    const connectors = paramValue(params.compatibleConnectors);
    const notes = paramValue(params.notes);
    const image = paramValue(params.image);

    if (make) setRequestMake(make);
    if (modelName) setRequestModelName(modelName);
    if (variant) setRequestVariant(variant);
    if (vehicleType === "bike" || vehicleType === "car") {
      setRequestType(vehicleType);
    }
    if (batteryCapacity) setRequestBatteryCapacity(batteryCapacity);
    if (efficiency) setRequestEfficiency(efficiency);
    if (connectors) setRequestConnectors(parseConnectorParam(connectors));
    if (notes) setRequestNotes(notes);
    if (image) setVehicleImageUrl(image);
  }, [params]);

  const toggleConnector = (connector: ConnectorType) => {
    setRequestConnectors((prev) =>
      prev.includes(connector)
        ? prev.filter((item) => item !== connector)
        : [...prev, connector],
    );
  };

  const validateRequest = () => {
    const newErrors: Record<string, string> = {};

    if (!requestMake.trim()) {
      newErrors.make = "Make is required.";
    }
    if (!requestModelName.trim()) {
      newErrors.modelName = "Model name is required.";
    }
    if (!vehicleImageUrl) {
      newErrors.image = "Please upload one vehicle image.";
    }

    if (requestBatteryCapacity.trim()) {
      const capacity = Number(requestBatteryCapacity);
      if (Number.isNaN(capacity) || capacity <= 0 || capacity > 200) {
        newErrors.batteryCapacity = "Battery capacity must be between 0 and 200 kWh.";
      }
    }

    if (requestEfficiency.trim()) {
      const efficiency = Number(requestEfficiency);
      if (Number.isNaN(efficiency) || efficiency <= 0 || efficiency > 1) {
        newErrors.efficiency = "Efficiency must be between 0 and 1 kWh/km.";
      }
    }

    setRequestErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickImage = async () => {
    setRequestError("");
    setRequestMessage("");

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setRequestError("Media library permission is required to upload an image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    try {
      setUploadingImage(true);
      const asset = result.assets[0];
      const cloudinaryConfig = await api.getCloudinaryConfig();
      const uploadedUrl = await api.uploadImageToCloudinary(
        {
          uri: asset.uri,
          name: asset.fileName ?? "vehicle-request.jpg",
          type: asset.mimeType ?? "image/jpeg",
        },
        cloudinaryConfig,
      );

      setVehicleImageUrl(uploadedUrl);
      setRequestMessage("Vehicle image uploaded successfully.");
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Unable to upload image.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    setRequestError("");
    setRequestMessage("");

    if (!token) {
      setRequestError("You must be signed in to request a vehicle.");
      return;
    }

    if (!validateRequest()) {
      return;
    }

    try {
      setSubmittingRequest(true);
      await api.submitVehicleRequest(token, {
        make: requestMake.trim(),
        modelName: requestModelName.trim(),
        variant: requestVariant.trim() || undefined,
        vehicleType: requestType,
        batteryCapacity_kWh: requestBatteryCapacity.trim()
          ? Number(requestBatteryCapacity)
          : undefined,
        efficiency_kWh_per_km: requestEfficiency.trim()
          ? Number(requestEfficiency)
          : undefined,
        compatibleConnectors:
          requestConnectors.length > 0 ? requestConnectors : undefined,
        image: vehicleImageUrl,
        notes: requestNotes.trim() || undefined,
      });

      router.replace("/(tabs)/profile/requests");
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "Unable to submit vehicle request.",
      );
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Content>
          <ActivityIndicator size="large" color={colors.primary} />
        </Content>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return (
      <Container>
        <Content>
          <Title>Request a Vehicle</Title>
          <Subtitle>
            Sign in first to submit a vehicle request.
          </Subtitle>
          <PrimaryButton
            text="Go to Sign In"
            onPress={() => router.replace("/(tabs)/profile/signin")}
          />
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Content>
        <Title>Request a Vehicle</Title>
        <Subtitle>
          Submit one vehicle image, fill in the available details, and send the
          request to the team for review.
        </Subtitle>

        <FormSection title="Vehicle Image">
          {vehicleImageUrl ? (
            <ImageCard>
              <ImagePreview source={{ uri: vehicleImageUrl }} resizeMode="cover" />
            </ImageCard>
          ) : (
            <ImageCard>
              <ImagePlaceholder>
                <ImagePlaceholderText>No image uploaded yet</ImagePlaceholderText>
              </ImagePlaceholder>
            </ImageCard>
          )}

          <ButtonGroup>
            <PrimaryButton
              text={uploadingImage ? "Uploading..." : vehicleImageUrl ? "Replace Image" : "Upload Vehicle Image"}
              onPress={() => void handlePickImage()}
              loading={uploadingImage}
              disabled={uploadingImage || submittingRequest}
            />
            {vehicleImageUrl ? (
              <PrimaryButton
                text="Remove Image"
                onPress={() => setVehicleImageUrl("")}
                variant="secondary"
              />
            ) : null}
          </ButtonGroup>
          {requestErrors.image ? <ErrorText>{requestErrors.image}</ErrorText> : null}
        </FormSection>

        <FormSection title="Vehicle Details">
          <FormInput
            label="Make"
            value={requestMake}
            onChangeText={setRequestMake}
            placeholder="e.g. Tesla"
            error={requestErrors.make}
          />
          <FormInput
            label="Model"
            value={requestModelName}
            onChangeText={setRequestModelName}
            placeholder="e.g. Model Y"
            error={requestErrors.modelName}
          />
          <FormInput
            label="Variant"
            value={requestVariant}
            onChangeText={setRequestVariant}
            placeholder="Optional"
          />

          <FormSection title="Vehicle Type">
            <SegmentedControl
              options={VEHICLE_TYPES.map((option) => option.label)}
              selectedIndex={requestType === "car" ? 0 : 1}
              onSelect={(index) => setRequestType(VEHICLE_TYPES[index].value)}
            />
          </FormSection>

          <FormInput
            label="Battery Capacity (kWh)"
            value={requestBatteryCapacity}
            onChangeText={setRequestBatteryCapacity}
            placeholder="Optional"
            keyboardType="decimal-pad"
            error={requestErrors.batteryCapacity}
          />
          <FormInput
            label="Efficiency (kWh/km)"
            value={requestEfficiency}
            onChangeText={setRequestEfficiency}
            placeholder="Optional"
            keyboardType="decimal-pad"
            error={requestErrors.efficiency}
          />

          <FormSection title="Compatible Connectors">
            <ChipGroup>
              {CONNECTOR_OPTIONS.map((connector) => (
                <Chip
                  key={connector}
                  label={connector}
                  selected={requestConnectors.includes(connector)}
                  onPress={() => toggleConnector(connector)}
                />
              ))}
            </ChipGroup>
          </FormSection>

          <FormInput
            label="Notes"
            value={requestNotes}
            onChangeText={setRequestNotes}
            placeholder="Tell us why you need this vehicle"
            multiline
          />

          <HelperText>
            Only one image is allowed. If you pick another, it replaces the
            current one.
          </HelperText>
          {requestMessage ? <HelperText>{requestMessage}</HelperText> : null}
          {requestError ? <ErrorText>{requestError}</ErrorText> : null}
        </FormSection>

        <FormSection title="Submit Request">
          <ButtonGroup>
            <PrimaryButton
              text={submittingRequest ? "Submitting..." : "Send Request"}
              onPress={() => void handleSubmit()}
              loading={submittingRequest}
              disabled={submittingRequest || uploadingImage}
            />
            <PrimaryButton
              text="Back to Profile"
              onPress={() => router.replace("/(tabs)/profile")}
              variant="secondary"
            />
          </ButtonGroup>
        </FormSection>

        <Divider />
        <HelperText>
          If your request gets rejected later, you can open it from the request
          history page, adjust the details, and submit a new request.
        </HelperText>
      </Content>
    </Container>
  );
}
