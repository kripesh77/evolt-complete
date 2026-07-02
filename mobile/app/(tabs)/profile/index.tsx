import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import styled from "styled-components/native";
import { Chip, ChipGroup } from "@/components/common/Chip";
import { FormInput, FormSection } from "@/components/common/FormComponents";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services";
import { colors, spacing, typography } from "@/theme";
import type {
  ConnectorType,
  VehicleRequest,
  VehicleRequestStatus,
  VehicleType,
} from "@/types";

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${colors.background.default};
`;

const Content = styled.View`
  padding: ${spacing.xl}px;
  padding-bottom: 48px;
`;

const HeaderCard = styled.View`
  border-width: 1px;
  border-color: ${colors.border};
  background-color: ${colors.background.secondary};
  border-radius: 18px;
  padding: ${spacing.lg}px;
  margin-bottom: ${spacing.xl}px;
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
`;

const Label = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.sm}px;
  margin-top: ${spacing.sm}px;
`;

const Value = styled.Text`
  color: ${colors.text.primary};
  font-size: ${typography.sizes.md}px;
  font-weight: 700;
`;

const ButtonSpacer = styled.View`
  height: ${spacing.md}px;
`;

const InlineActions = styled.View`
  gap: ${spacing.sm}px;
  margin-top: ${spacing.sm}px;
`;

const SectionHint = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.sm}px;
  margin-bottom: ${spacing.md}px;
  line-height: 18px;
`;

const Row = styled.View`
  flex-direction: row;
  gap: ${spacing.md}px;
`;

const RowItem = styled.View`
  flex: 1;
`;

const StatusPill = styled.View<{ status: VehicleRequestStatus }>`
  align-self: flex-start;
  padding: 6px 10px;
  border-radius: 999px;
  background-color: ${(props) => {
    switch (props.status) {
      case "approved":
        return "rgba(34, 197, 94, 0.15)";
      case "rejected":
        return "rgba(239, 68, 68, 0.15)";
      default:
        return "rgba(245, 158, 11, 0.15)";
    }
  }};
`;

const StatusText = styled.Text<{ status: VehicleRequestStatus }>`
  color: ${(props) => {
    switch (props.status) {
      case "approved":
        return colors.success;
      case "rejected":
        return colors.error;
      default:
        return colors.secondary;
    }
  }};
  font-size: ${typography.sizes.xs}px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const RequestCard = styled.View`
  border-width: 1px;
  border-color: ${colors.border};
  border-radius: 16px;
  background-color: ${colors.background.secondary};
  padding: ${spacing.md}px;
  margin-bottom: ${spacing.sm}px;
`;

const RequestTitle = styled.Text`
  color: ${colors.text.primary};
  font-size: ${typography.sizes.md}px;
  font-weight: 800;
  margin-bottom: 4px;
`;

const RequestMeta = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.sm}px;
  margin-bottom: 4px;
`;

const RequestNotes = styled.Text`
  color: ${colors.text.secondary};
  font-size: ${typography.sizes.sm}px;
  line-height: 18px;
  margin-top: ${spacing.xs}px;
`;

const Divider = styled.View`
  height: 1px;
  background-color: ${colors.border};
  margin: ${spacing.xl}px 0;
`;

const EmptyState = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.sm}px;
  line-height: 18px;
`;

const ErrorText = styled.Text`
  color: ${colors.error};
  font-size: ${typography.sizes.sm}px;
  margin-top: ${spacing.sm}px;
`;

const ToggleRow = styled.View`
  flex-direction: row;
  gap: ${spacing.sm}px;
  margin-bottom: ${spacing.md}px;
`;

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProfileTabScreen() {
  const router = useRouter();
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    logout,
    updateProfile,
  } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestType, setRequestType] = useState<VehicleType>("car");
  const [requestMake, setRequestMake] = useState("");
  const [requestModelName, setRequestModelName] = useState("");
  const [requestVariant, setRequestVariant] = useState("");
  const [requestBatteryCapacity, setRequestBatteryCapacity] = useState("");
  const [requestEfficiency, setRequestEfficiency] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestConnectors, setRequestConnectors] = useState<ConnectorType[]>(
    [],
  );
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});

  const savedVehicleProfiles = user?.vehicleProfiles ?? [];
  const operatorOnly = user?.role === "operator";

  const requestConnectorOptions = useMemo(
    () => ["AC_SLOW", "Type2", "CCS", "CHAdeMO"] as ConnectorType[],
    [],
  );

  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setCompany(user?.company ?? "");
  }, [user]);

  const loadRequests = useCallback(async () => {
    if (!token) return;

    setLoadingRequests(true);
    setRequestError("");

    try {
      const response = await api.getMyVehicleRequests(token);
      setRequests(response.requestedVehicles);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "Unable to load vehicle requests right now.",
      );
    } finally {
      setLoadingRequests(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadRequests();
  }, [token, loadRequests]);

  const handleSaveProfile = async () => {
    setProfileError("");
    setProfileMessage("");

    if (!name.trim()) {
      setProfileError("Name is required.");
      return;
    }

    try {
      setSavingProfile(true);
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        company: operatorOnly ? company.trim() || undefined : undefined,
      });
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Unable to update profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

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

  const handleSubmitVehicleRequest = async () => {
    setRequestError("");
    setRequestMessage("");

    if (!token) return;
    if (!validateRequest()) return;

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
        notes: requestNotes.trim() || undefined,
      });

      setRequestMessage("Vehicle request submitted successfully.");
      setRequestMake("");
      setRequestModelName("");
      setRequestVariant("");
      setRequestBatteryCapacity("");
      setRequestEfficiency("");
      setRequestNotes("");
      setRequestConnectors([]);
      setShowRequestForm(false);
      await loadRequests();
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

  if (!isAuthenticated || !user) {
    return (
      <Container>
        <Content>
          <Title>Welcome</Title>
          <Subtitle>
            Sign in or create an account to manage your profile and requests.
          </Subtitle>
          <PrimaryButton
            text="Sign In"
            onPress={() => router.push("/(tabs)/profile/signin")}
          />
          <ButtonSpacer />
          <PrimaryButton
            text="Create Account"
            onPress={() => router.push("/(tabs)/profile/signup")}
          />
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Content>
        <HeaderCard>
          <Title>Profile</Title>
          <Subtitle>
            Manage your account details and request a vehicle if it is missing
            from the catalog.
          </Subtitle>

          <Label>Name</Label>
          <Value>{user.name}</Value>
          <Label>Email</Label>
          <Value>{user.email}</Value>
          <Label>Role</Label>
          <Value>{user.role}</Value>
        </HeaderCard>

        <FormSection title="Edit Information">
          <SectionHint>
            Update your display name and contact details here. Email changes are
            not editable from this screen.
          </SectionHint>

          <FormInput label="Name" value={name} onChangeText={setName} placeholder="Your name" />
          <FormInput
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="Your phone number"
            keyboardType="phone-pad"
          />
          {operatorOnly ? (
            <FormInput
              label="Company"
              value={company}
              onChangeText={setCompany}
              placeholder="Company name"
            />
          ) : null}

          {profileError ? <ErrorText>{profileError}</ErrorText> : null}
          {profileMessage ? <Subtitle>{profileMessage}</Subtitle> : null}

          <PrimaryButton
            text={savingProfile ? "Saving..." : "Save Changes"}
            onPress={() => void handleSaveProfile()}
            loading={savingProfile}
            disabled={savingProfile}
          />
        </FormSection>

        <FormSection title="Your Vehicles">
          {savedVehicleProfiles.length > 0 ? (
            <>
              <SectionHint>
                These are the vehicle profiles already saved to your account.
              </SectionHint>
              {savedVehicleProfiles.map((vehicle) => (
                <RequestCard key={vehicle._id ?? `${vehicle.make}-${vehicle.modelName}-${vehicle.variant ?? "base"}`}>
                  <RequestTitle>
                    {vehicle.make} {vehicle.modelName}
                  </RequestTitle>
                  <RequestMeta>
                    {vehicle.variant ? `${vehicle.variant} • ` : ""}
                    {vehicle.vehicleType === "bike" ? "Bike" : "Car"}
                  </RequestMeta>
                  <RequestMeta>
                    {vehicle.batteryCapacity_kWh} kWh • {vehicle.compatibleConnectors.join(", ")}
                  </RequestMeta>
                </RequestCard>
              ))}
            </>
          ) : (
            <EmptyState>
              You do not have any saved vehicles yet. Use the vehicle search flow
              to add one.
            </EmptyState>
          )}
        </FormSection>

        <Divider />

        <FormSection title="Vehicle Requests">
          <SectionHint>
            If the vehicle you need is not available, submit a request from here.
          </SectionHint>

          <ToggleRow>
            <PrimaryButton
              text={showRequestForm ? "Hide Request Form" : "Request a Vehicle"}
              onPress={() => setShowRequestForm((current) => !current)}
            />
            <PrimaryButton
              text="Refresh Status"
              onPress={() => void loadRequests()}
              variant="secondary"
            />
          </ToggleRow>

          {showRequestForm ? (
            <>
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
                  options={["Car", "Bike"]}
                  selectedIndex={requestType === "car" ? 0 : 1}
                  onSelect={(index) =>
                    setRequestType(index === 0 ? "car" : "bike")
                  }
                />
              </FormSection>

              <Row>
                <RowItem>
                  <FormInput
                    label="Battery Capacity (kWh)"
                    value={requestBatteryCapacity}
                    onChangeText={setRequestBatteryCapacity}
                    placeholder="Optional"
                    keyboardType="decimal-pad"
                    error={requestErrors.batteryCapacity}
                  />
                </RowItem>
                <RowItem>
                  <FormInput
                    label="Efficiency (kWh/km)"
                    value={requestEfficiency}
                    onChangeText={setRequestEfficiency}
                    placeholder="Optional"
                    keyboardType="decimal-pad"
                    error={requestErrors.efficiency}
                  />
                </RowItem>
              </Row>

              <FormSection title="Compatible Connectors">
                <ChipGroup>
                  {requestConnectorOptions.map((connector) => (
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

              {requestError ? <ErrorText>{requestError}</ErrorText> : null}
              {requestMessage ? <Subtitle>{requestMessage}</Subtitle> : null}

              <PrimaryButton
                text={submittingRequest ? "Submitting..." : "Submit Request"}
                onPress={() => void handleSubmitVehicleRequest()}
                loading={submittingRequest}
                disabled={submittingRequest}
              />
            </>
          ) : null}

          <Divider />

          <SectionHint>Your previous requests and their status.</SectionHint>
          {loadingRequests ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
          {requestError && !loadingRequests ? <ErrorText>{requestError}</ErrorText> : null}
          {!loadingRequests && requests.length === 0 ? (
            <EmptyState>No vehicle requests yet.</EmptyState>
          ) : null}
          {requests.map((request) => (
            <RequestCard key={request._id ?? `${request.make}-${request.modelName}-${request.createdAt ?? "request"}`}>
              <StatusPill status={request.status}>
                <StatusText status={request.status}>{request.status}</StatusText>
              </StatusPill>
              <RequestTitle>
                {request.make} {request.modelName}
              </RequestTitle>
              <RequestMeta>
                {request.variant ? `${request.variant} • ` : ""}
                {request.vehicleType === "bike" ? "Bike" : "Car"}
              </RequestMeta>
              <RequestMeta>
                {formatDate(request.createdAt)}
              </RequestMeta>
              {request.notes ? <RequestNotes>{request.notes}</RequestNotes> : null}
              {request.reviewNotes ? (
                <RequestNotes>Review: {request.reviewNotes}</RequestNotes>
              ) : null}
            </RequestCard>
          ))}
        </FormSection>

        <InlineActions>
          <PrimaryButton text="Sign Out" onPress={() => void logout()} variant="secondary" />
        </InlineActions>
      </Content>
    </Container>
  );
}
