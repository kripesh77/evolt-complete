import React from "react";
import { FlatList, RefreshControl, Image, View } from "react-native";
import { useRouter } from "expo-router";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useLocation } from "../../../context/LocationContext";
import { useRecommendation } from "../../../context/RecommendationContext";
import { useNearbyStations } from "../../../hooks/useApi";
import { PermissionPrompt } from "../../../components/common/PermissionPrompt";
import { colors, spacing, typography } from "../../../theme";
import {
  formatOperatingHours,
  isStationOpen,
} from "../../../services/operatingHours";
import type { NearbyStation, RecommendedStation } from "../../../types";

const Container = styled.View`
  flex: 1;
  background-color: ${colors.background.default};
`;

const Header = styled.View`
  padding: ${spacing.lg}px;
  background-color: ${colors.background.secondary};
  border-bottom-width: 1px;
  border-bottom-color: ${colors.border};
`;

const HeaderTitle = styled.Text`
  font-size: ${typography.sizes.lg}px;
  font-weight: 600;
  color: ${colors.text.primary};
`;

const HeaderSubtitle = styled.Text`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.secondary};
  margin-top: ${spacing.xs}px;
`;

const EmptyContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: ${spacing.xxl}px;
`;

const EmptyText = styled.Text`
  font-size: ${typography.sizes.md}px;
  color: ${colors.text.secondary};
  text-align: center;
`;

const StationCard = styled.TouchableOpacity`
  background-color: ${colors.background.default};
  padding: ${spacing.lg}px;
  border-bottom-width: 1px;
  border-bottom-color: ${colors.border};
  flex-direction: row;
`;

const StationThumbnail = styled.View`
  width: 70px;
  height: 70px;
  border-radius: 8px;
  background-color: ${colors.background.secondary};
  margin-right: ${spacing.md}px;
  overflow: hidden;
  justify-content: center;
  align-items: center;
`;

const StationThumbnailImage = styled.Image`
  width: 70px;
  height: 70px;
`;

const StationInfo = styled.View`
  flex: 1;
`;

const StationName = styled.Text`
  font-size: ${typography.sizes.md}px;
  font-weight: 600;
  color: ${colors.text.primary};
  margin-bottom: ${spacing.xs}px;
`;

const StationAddress = styled.Text`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.secondary};
  margin-bottom: ${spacing.sm}px;
`;

const StationMeta = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${spacing.md}px;
`;

const MetaBadge = styled.View<{
  variant?: "primary" | "secondary" | "success";
}>`
  background-color: ${({ variant }) => {
    switch (variant) {
      case "primary":
        return colors.primaryLight;
      case "success":
        return "#E8F5E9";
      default:
        return colors.background.secondary;
    }
  }};
  padding: ${spacing.xs}px ${spacing.sm}px;
  border-radius: 4px;
`;

const MetaText = styled.Text<{ variant?: "primary" | "secondary" | "success" }>`
  font-size: ${typography.sizes.xs}px;
  font-weight: 500;
  color: ${({ variant }) => {
    switch (variant) {
      case "primary":
        return colors.primary;
      case "success":
        return "#2E7D32";
      default:
        return colors.text.secondary;
    }
  }};
`;

const ScoreBadge = styled.View`
  background-color: ${colors.primary};
  padding: ${spacing.xs}px ${spacing.sm}px;
  border-radius: 4px;
`;

const ScoreText = styled.Text`
  font-size: ${typography.sizes.xs}px;
  font-weight: 600;
  color: ${colors.text.inverse};
`;

const OpenClosedBadge = styled.View<{ isOpen: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ isOpen }) =>
    isOpen ? "rgba(46, 125, 50, 0.1)" : "rgba(198, 40, 40, 0.1)"};
  padding: ${spacing.xs}px ${spacing.sm}px;
  border-radius: 4px;
`;

const OpenClosedText = styled.Text<{ isOpen: boolean }>`
  font-size: ${typography.sizes.xs}px;
  font-weight: 500;
  color: ${({ isOpen }) => (isOpen ? "#2E7D32" : "#C62828")};
  margin-left: 4px;
`;

// Component for nearby station item
function NearbyStationItem({
  station,
  onPress,
}: {
  station: NearbyStation;
  onPress: () => void;
}) {
  const stationOpen = station.operatingHours
    ? isStationOpen(station.operatingHours)
    : true;

  return (
    <StationCard onPress={onPress}>
      <StationThumbnail>
        {station.images && station.images.length > 0 ? (
          <StationThumbnailImage
            source={{ uri: station.images[0] }}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="flash" size={28} color={colors.text.secondary} />
        )}
      </StationThumbnail>
      <StationInfo>
        <StationName>{station.name}</StationName>
        <StationAddress numberOfLines={1}>{station.address}</StationAddress>
        <StationMeta>
          <MetaBadge variant="primary">
            <MetaText variant="primary">
              {station.distanceKm.toFixed(1)} km
            </MetaText>
          </MetaBadge>
          <MetaBadge>
            <MetaText>
              {station.portSummary.carPorts} car •{" "}
              {station.portSummary.bikePorts} bike
            </MetaText>
          </MetaBadge>
          <OpenClosedBadge isOpen={stationOpen}>
            <Ionicons
              name={stationOpen ? "checkmark-circle" : "close-circle"}
              size={12}
              color={stationOpen ? "#2E7D32" : "#C62828"}
            />
            <OpenClosedText isOpen={stationOpen}>
              {stationOpen ? "Open" : "Closed"}
            </OpenClosedText>
          </OpenClosedBadge>
        </StationMeta>
      </StationInfo>
    </StationCard>
  );
}

// Component for recommended station item
function RecommendedStationItem({
  station,
  onPress,
}: {
  station: RecommendedStation;
  onPress: () => void;
}) {
  const stationOpen = station.operatingHours
    ? isStationOpen(station.operatingHours)
    : true;

  return (
    <StationCard onPress={onPress}>
      <StationThumbnail>
        {station.images && station.images.length > 0 ? (
          <StationThumbnailImage
            source={{ uri: station.images[0] }}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="flash" size={28} color={colors.text.secondary} />
        )}
      </StationThumbnail>
      <StationInfo>
        <StationName>{station.stationName}</StationName>
        <StationAddress numberOfLines={1}>{station.address}</StationAddress>
        <StationMeta>
          <ScoreBadge>
            <ScoreText>{(station.score * 100).toFixed(0)}%</ScoreText>
          </ScoreBadge>
          <MetaBadge variant="primary">
            <MetaText variant="primary">
              {station.distanceKm.toFixed(1)} km
            </MetaText>
          </MetaBadge>
          <MetaBadge variant="success">
            <MetaText variant="success">
              {station.freeSlots}/{station.totalSlots}
            </MetaText>
          </MetaBadge>
          <OpenClosedBadge isOpen={stationOpen}>
            <Ionicons
              name={stationOpen ? "checkmark-circle" : "close-circle"}
              size={12}
              color={stationOpen ? "#2E7D32" : "#C62828"}
            />
            <OpenClosedText isOpen={stationOpen}>
              {stationOpen ? "Open" : "Closed"}
            </OpenClosedText>
          </OpenClosedBadge>
        </StationMeta>
      </StationInfo>
    </StationCard>
  );
}

export default function StationsListScreen() {
  const router = useRouter();
  const { location, hasPermission, isLoading, requestPermission } =
    useLocation();
  const {
    hasResults,
    recommendations,
    radius,
    setNearbyStations,
    nearbyStations: contextNearbyStations,
  } = useRecommendation();

  // Fetch nearby stations when we don't have recommendations
  const {
    data: nearbyStationsData,
    isLoading: loadingStations,
    refetch,
    isRefetching,
  } = useNearbyStations(
    location?.longitude,
    location?.latitude,
    radius,
    hasPermission && !hasResults && !!location,
  );

  const nearbyStations = nearbyStationsData?.data?.stations ?? [];

  // Sync nearby stations to context
  React.useEffect(() => {
    if (nearbyStations.length > 0) {
      setNearbyStations(nearbyStations);
    }
  }, [nearbyStations, setNearbyStations]);

  if (isLoading) {
    return (
      <Container>
        <PermissionPrompt
          title="Getting your location..."
          subtitle=""
          buttonText=""
          onPress={() => {}}
          isLoading={true}
        />
      </Container>
    );
  }

  if (!hasPermission) {
    return (
      <Container>
        <PermissionPrompt
          title="Location Access Required"
          subtitle="We need your location to find nearby EV charging stations"
          buttonText="Grant Location Access"
          onPress={requestPermission}
        />
      </Container>
    );
  }

  const handleStationPress = (stationId: string, isRecommended: boolean) => {
    router.push({
      pathname: "/stations/[stationId]",
      params: { stationId, isRecommended: String(isRecommended) },
    });
  };

  // Show recommended stations if we have results
  if (hasResults && recommendations) {
    return (
      <Container>
        <Header>
          <HeaderTitle>Recommended Stations</HeaderTitle>
          <HeaderSubtitle>
            {recommendations.length} stations found along your route
          </HeaderSubtitle>
        </Header>
        <FlatList
          data={recommendations}
          keyExtractor={(item) => item.stationId}
          renderItem={({ item }) => (
            <RecommendedStationItem
              station={item}
              onPress={() => handleStationPress(item.stationId, true)}
            />
          )}
          ListEmptyComponent={
            <EmptyContainer>
              <EmptyText>No stations found along your route</EmptyText>
            </EmptyContainer>
          }
        />
      </Container>
    );
  }

  // Show nearby stations
  return (
    <Container>
      <Header>
        <HeaderTitle>Nearby Stations</HeaderTitle>
        <HeaderSubtitle>
          Stations within {radius} km of your location
        </HeaderSubtitle>
      </Header>
      <FlatList
        data={nearbyStations}
        keyExtractor={(item) => item.stationId}
        renderItem={({ item }) => (
          <NearbyStationItem
            station={item}
            onPress={() => handleStationPress(item.stationId, false)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          loadingStations ? (
            <EmptyContainer>
              <EmptyText>Loading stations...</EmptyText>
            </EmptyContainer>
          ) : (
            <EmptyContainer>
              <EmptyText>No stations found nearby</EmptyText>
            </EmptyContainer>
          )
        }
      />
    </Container>
  );
}
