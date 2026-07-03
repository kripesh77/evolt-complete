import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import styled from "styled-components/native";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services";
import { colors, spacing, typography } from "@/theme";
import type { VehicleRequest, VehicleRequestStatus } from "@/types";

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
  line-height: 18px;
`;

const HeaderRow = styled.View`
  flex-direction: row;
  gap: ${spacing.sm}px;
  margin-bottom: ${spacing.xl}px;
`;

const RequestCard = styled.View`
  border-width: 1px;
  border-color: ${colors.border};
  border-radius: 16px;
  background-color: ${colors.background.secondary};
  padding: ${spacing.md}px;
  margin-bottom: ${spacing.sm}px;
`;

const RequestTopRow = styled.View`
  flex-direction: row;
  gap: ${spacing.md}px;
`;

const RequestImage = styled(Image)`
  width: 72px;
  height: 72px;
  border-radius: 12px;
  background-color: ${colors.background.tertiary};
`;

const RequestImagePlaceholder = styled.View`
  width: 72px;
  height: 72px;
  border-radius: 12px;
  background-color: ${colors.background.tertiary};
  align-items: center;
  justify-content: center;
`;

const RequestImageText = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.xs}px;
  font-weight: 700;
`;

const RequestBody = styled.View`
  flex: 1;
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
  margin-bottom: ${spacing.sm}px;
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

const ButtonGroup = styled.View`
  gap: ${spacing.sm}px;
`;

const Section = styled.View`
  margin-bottom: ${spacing.xl}px;
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

function buildReRequestParams(request: VehicleRequest) {
  return {
    pathname: "/(tabs)/profile/request" as const,
    params: {
      make: request.make,
      modelName: request.modelName,
      variant: request.variant ?? "",
      vehicleType: request.vehicleType,
      batteryCapacity_kWh: request.batteryCapacity_kWh?.toString() ?? "",
      efficiency_kWh_per_km: request.efficiency_kWh_per_km?.toString() ?? "",
      compatibleConnectors: request.compatibleConnectors?.join(",") ?? "",
      notes: request.notes ?? "",
      image: request.image ?? "",
    },
  };
}

export default function VehicleRequestsScreen() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading } = useAuth();

  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState("");

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
          <Title>Vehicle Requests</Title>
          <Subtitle>You must sign in to see your request history.</Subtitle>
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
        <Title>Vehicle Requests</Title>
        <Subtitle>
          Track pending, approved, and rejected requests from one place.
        </Subtitle>

        <HeaderRow>
          <PrimaryButton
            text="Refresh"
            onPress={() => void loadRequests()}
            variant="secondary"
          />
          <PrimaryButton
            text="Request a Vehicle"
            onPress={() => router.push("/(tabs)/profile/request")}
          />
        </HeaderRow>

        {requestError ? <ErrorText>{requestError}</ErrorText> : null}
        {loadingRequests ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : null}

        {!loadingRequests && requests.length === 0 ? (
          <HelperText>No vehicle requests yet.</HelperText>
        ) : null}

        {requests.map((request) => (
          <RequestCard key={request._id ?? `${request.make}-${request.modelName}-${request.createdAt ?? "request"}`}>
            <StatusPill status={request.status}>
              <StatusText status={request.status}>{request.status}</StatusText>
            </StatusPill>

            <RequestTopRow>
              {request.image ? (
                <RequestImage source={{ uri: request.image }} />
              ) : (
                <RequestImagePlaceholder>
                  <RequestImageText>No image</RequestImageText>
                </RequestImagePlaceholder>
              )}

              <RequestBody>
                <RequestTitle>
                  {request.make} {request.modelName}
                </RequestTitle>
                <RequestMeta>
                  {request.variant ? `${request.variant} • ` : ""}
                  {request.vehicleType === "bike" ? "Bike" : "Car"}
                </RequestMeta>
                <RequestMeta>{formatDate(request.createdAt)}</RequestMeta>
                {request.batteryCapacity_kWh ? (
                  <RequestMeta>{request.batteryCapacity_kWh} kWh</RequestMeta>
                ) : null}
                {request.efficiency_kWh_per_km ? (
                  <RequestMeta>{request.efficiency_kWh_per_km} kWh/km</RequestMeta>
                ) : null}
              </RequestBody>
            </RequestTopRow>

            {request.notes ? <RequestNotes>{request.notes}</RequestNotes> : null}
            {request.reviewNotes ? (
              <RequestNotes>Review: {request.reviewNotes}</RequestNotes>
            ) : null}

            {request.status === "rejected" ? (
              <Section>
                <ButtonGroup>
                  <PrimaryButton
                    text="Re-request with changes"
                    onPress={() =>
                      router.push(buildReRequestParams(request))
                    }
                  />
                </ButtonGroup>
              </Section>
            ) : null}
          </RequestCard>
        ))}
      </Content>
    </Container>
  );
}
