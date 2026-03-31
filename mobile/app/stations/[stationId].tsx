import React, { useState, useRef } from "react";
import {
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  FlatList,
  View,
  Text,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { useRecommendation } from "../../context/RecommendationContext";
import { colors, spacing, typography } from "../../theme";
import {
  formatOperatingHours,
  isStationOpen,
} from "../../services/operatingHours";
import type { RecommendedStation, NearbyStation } from "../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${colors.background.default};
`;

const HeroSection = styled.View`
  background-color: ${colors.primary};
  padding: ${spacing.xxl}px;
  padding-top: ${spacing.xxxl}px;
`;

const StationName = styled.Text`
  font-size: ${typography.sizes.xxl}px;
  font-weight: bold;
  color: ${colors.text.inverse};
  margin-bottom: ${spacing.sm}px;
`;

const StationAddress = styled.Text`
  font-size: ${typography.sizes.md}px;
  color: rgba(255, 255, 255, 0.9);
`;

const ScoreContainer = styled.View`
  position: absolute;
  top: ${spacing.lg}px;
  right: ${spacing.lg}px;
  background-color: rgba(255, 255, 255, 0.2);
  padding: ${spacing.sm}px ${spacing.md}px;
  border-radius: 20px;
`;

const ScoreText = styled.Text`
  font-size: ${typography.sizes.md}px;
  font-weight: 600;
  color: ${colors.text.inverse};
`;

const Content = styled.View`
  padding: ${spacing.xl}px;
`;

const Section = styled.View`
  margin-bottom: ${spacing.xl}px;
`;

const SectionTitle = styled.Text`
  font-size: ${typography.sizes.lg}px;
  font-weight: 600;
  color: ${colors.text.primary};
  margin-bottom: ${spacing.md}px;
`;

const Card = styled.View`
  background-color: ${colors.background.secondary};
  border-radius: 12px;
  padding: ${spacing.lg}px;
`;

const InfoRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-vertical: ${spacing.sm}px;
  border-bottom-width: 1px;
  border-bottom-color: ${colors.border};
`;

const InfoRowLast = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-vertical: ${spacing.sm}px;
`;

const InfoLabel = styled.Text`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.secondary};
`;

const InfoValue = styled.Text`
  font-size: ${typography.sizes.sm}px;
  font-weight: 500;
  color: ${colors.text.primary};
`;

const HighlightValue = styled.Text`
  font-size: ${typography.sizes.sm}px;
  font-weight: 600;
  color: ${colors.primary};
`;

const StatsGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${spacing.md}px;
`;

const StatCard = styled.View`
  flex: 1;
  min-width: 45%;
  background-color: ${colors.background.secondary};
  border-radius: 12px;
  padding: ${spacing.lg}px;
  align-items: center;
`;

const StatValue = styled.Text`
  font-size: ${typography.sizes.xxl}px;
  font-weight: bold;
  color: ${colors.primary};
`;

const StatLabel = styled.Text`
  font-size: ${typography.sizes.xs}px;
  color: ${colors.text.secondary};
  margin-top: ${spacing.xs}px;
  text-align: center;
`;

const StatusBadge = styled.View<{ status: string }>`
  background-color: ${({ status }) =>
    status === "operational" ? "#E8F5E9" : colors.background.error};
  padding: ${spacing.xs}px ${spacing.md}px;
  border-radius: 20px;
  align-self: flex-start;
  margin-top: ${spacing.md}px;
`;

const StatusText = styled.Text<{ status: string }>`
  font-size: ${typography.sizes.sm}px;
  font-weight: 500;
  color: ${({ status }) =>
    status === "operational" ? "#2E7D32" : colors.error};
`;

const NotFoundContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: ${spacing.xxl}px;
`;

const NotFoundText = styled.Text`
  font-size: ${typography.sizes.md}px;
  color: ${colors.text.secondary};
  text-align: center;
`;

// Image Carousel Styles
const ImageCarouselContainer = styled.View`
  width: 100%;
  height: 220px;
  background-color: ${colors.background.secondary};
`;

const CarouselImage = styled.Image`
  width: ${SCREEN_WIDTH}px;
  height: 220px;
`;

const CarouselIndicator = styled.View`
  position: absolute;
  bottom: 12px;
  left: 0;
  right: 0;
  flex-direction: row;
  justify-content: center;
  gap: 6px;
`;

const IndicatorDot = styled.View<{ active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background-color: ${({ active }) =>
    active ? colors.primary : "rgba(255,255,255,0.5)"};
`;

const NoImageContainer = styled.View`
  width: 100%;
  height: 220px;
  background-color: ${colors.background.secondary};
  justify-content: center;
  align-items: center;
`;

const NoImageText = styled.Text`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.secondary};
  margin-top: ${spacing.sm}px;
`;

// Operating Hours Badge
const OperatingHoursBadge = styled.View<{ isOpen: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${({ isOpen }) =>
    isOpen ? "rgba(46, 125, 50, 0.1)" : "rgba(198, 40, 40, 0.1)"};
  padding: ${spacing.xs}px ${spacing.sm}px;
  border-radius: 12px;
  margin-top: ${spacing.xs}px;
  align-self: flex-start;
`;

const OperatingHoursText = styled.Text<{ isOpen: boolean }>`
  font-size: ${typography.sizes.xs}px;
  font-weight: 500;
  color: ${({ isOpen }) => (isOpen ? "#2E7D32" : "#C62828")};
  margin-left: ${spacing.xs}px;
`;

// Visit Button
const VisitButton = styled.TouchableOpacity`
  background-color: ${colors.primary};
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: ${spacing.md}px;
  border-radius: 12px;
  margin-top: ${spacing.lg}px;
`;

const VisitButtonText = styled.Text`
  font-size: ${typography.sizes.md}px;
  font-weight: 600;
  color: ${colors.text.inverse};
  margin-left: ${spacing.sm}px;
`;

// Image Carousel Component
const ImageCarousel: React.FC<{ images: string[] }> = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  if (!images || images.length === 0) {
    return (
      <NoImageContainer>
        <Ionicons
          name="image-outline"
          size={48}
          color={colors.text.secondary}
        />
        <NoImageText>No images available</NoImageText>
      </NoImageContainer>
    );
  }

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  return (
    <ImageCarouselContainer>
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        keyExtractor={(item, index) => `image-${index}`}
        renderItem={({ item }) => (
          <CarouselImage source={{ uri: item }} resizeMode="cover" />
        )}
      />
      {images.length > 1 && (
        <CarouselIndicator>
          {images.map((_, index) => (
            <IndicatorDot key={index} active={index === activeIndex} />
          ))}
        </CarouselIndicator>
      )}
    </ImageCarouselContainer>
  );
};

export default function StationDetailScreen() {
  const router = useRouter();
  const { stationId, isRecommended } = useLocalSearchParams<{
    stationId: string;
    isRecommended: string;
  }>();

  const { recommendations, nearbyStations } = useRecommendation();

  // Find the station based on whether it's recommended or nearby
  const isRecommendedStation = isRecommended === "true";

  let station: RecommendedStation | NearbyStation | undefined;

  if (isRecommendedStation && recommendations) {
    station = recommendations.find((s) => s.stationId === stationId);
  } else {
    station = nearbyStations.find((s) => s.stationId === stationId);
  }

  if (!station) {
    return (
      <NotFoundContainer>
        <NotFoundText>Station not found</NotFoundText>
      </NotFoundContainer>
    );
  }

  // Get station coordinates for navigation
  const getStationCoords = () => {
    if ("location" in station! && "latitude" in station!.location) {
      // RecommendedStation
      return {
        latitude: (station as RecommendedStation).location.latitude,
        longitude: (station as RecommendedStation).location.longitude,
      };
    } else {
      // NearbyStation
      const nearbyStation = station as NearbyStation;
      return {
        latitude: nearbyStation.location.coordinates[1],
        longitude: nearbyStation.location.coordinates[0],
      };
    }
  };

  // Handle Visit Station button press
  const handleVisitStation = () => {
    const coords = getStationCoords();
    const name =
      "stationName" in station!
        ? (station as RecommendedStation).stationName
        : (station as NearbyStation).name;

    router.push({
      pathname: "/navigation",
      params: {
        stationId: station!.stationId,
        stationName: name,
        latitude: coords.latitude.toString(),
        longitude: coords.longitude.toString(),
      },
    });
  };

  // Check if station is open
  const stationOpen = station.operatingHours
    ? isStationOpen(station.operatingHours)
    : true;
  const operatingHoursText = station.operatingHours
    ? formatOperatingHours(station.operatingHours)
    : "24/7";

  // Type guard to check if it's a RecommendedStation
  const isRecommended_ = (
    s: RecommendedStation | NearbyStation,
  ): s is RecommendedStation => {
    return "score" in s;
  };

  if (isRecommended_(station)) {
    // Render recommended station details
    return (
      <>
        <Stack.Screen options={{ title: station.stationName }} />
        <Container>
          {/* Image Carousel */}
          <ImageCarousel images={station.images || []} />

          <HeroSection>
            <ScoreContainer>
              <ScoreText>{(station.score * 100).toFixed(0)}% Match</ScoreText>
            </ScoreContainer>
            <StationName>{station.stationName}</StationName>
            <StationAddress>{station.address}</StationAddress>
            <OperatingHoursBadge isOpen={stationOpen}>
              <Ionicons
                name={stationOpen ? "checkmark-circle" : "close-circle"}
                size={14}
                color={stationOpen ? "#2E7D32" : "#C62828"}
              />
              <OperatingHoursText isOpen={stationOpen}>
                {stationOpen ? "Open" : "Closed"} • {operatingHoursText}
              </OperatingHoursText>
            </OperatingHoursBadge>
          </HeroSection>

          <Content>
            <StatsGrid>
              <StatCard>
                <StatValue>{station.distanceKm.toFixed(1)}</StatValue>
                <StatLabel>Distance (km)</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{station.powerKW}</StatValue>
                <StatLabel>Power (kW)</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>
                  {station.freeSlots}/{station.totalSlots}
                </StatValue>
                <StatLabel>Available Slots</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{station.estimatedChargeTimeMinutes}</StatValue>
                <StatLabel>Charge Time (min)</StatLabel>
              </StatCard>
            </StatsGrid>

            <Section>
              <SectionTitle>Charging Details</SectionTitle>
              <Card>
                <InfoRow>
                  <InfoLabel>Recommended Port</InfoLabel>
                  <HighlightValue>{station.recommendedPort}</HighlightValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Price per kWh</InfoLabel>
                  <InfoValue>Rs. {station.pricePerKWh.toFixed(2)}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Estimated Cost</InfoLabel>
                  <HighlightValue>
                    Rs. {station.estimatedCost.toFixed(2)}
                  </HighlightValue>
                </InfoRow>
                <InfoRowLast>
                  <InfoLabel>Estimated Wait</InfoLabel>
                  <InfoValue>
                    {station.estimatedWaitMinutes > 0
                      ? `${station.estimatedWaitMinutes} min`
                      : "No wait"}
                  </InfoValue>
                </InfoRowLast>
              </Card>
            </Section>

            {station.drivingDurationMinutes && (
              <Section>
                <SectionTitle>Travel Information</SectionTitle>
                <Card>
                  <InfoRow>
                    <InfoLabel>Driving Distance</InfoLabel>
                    <InfoValue>{station.distanceKm.toFixed(1)} km</InfoValue>
                  </InfoRow>
                  <InfoRowLast>
                    <InfoLabel>Driving Duration</InfoLabel>
                    <InfoValue>
                      {Math.round(station.drivingDurationMinutes)} min
                    </InfoValue>
                  </InfoRowLast>
                </Card>
              </Section>
            )}

            <Section>
              <SectionTitle>Location</SectionTitle>
              <Card>
                <InfoRow>
                  <InfoLabel>Latitude</InfoLabel>
                  <InfoValue>{station.location.latitude.toFixed(6)}</InfoValue>
                </InfoRow>
                <InfoRowLast>
                  <InfoLabel>Longitude</InfoLabel>
                  <InfoValue>{station.location.longitude.toFixed(6)}</InfoValue>
                </InfoRowLast>
              </Card>
            </Section>

            {/* Visit Station Button */}
            <VisitButton onPress={handleVisitStation}>
              <Ionicons name="navigate" size={20} color={colors.text.inverse} />
              <VisitButtonText>Visit This Station</VisitButtonText>
            </VisitButton>
          </Content>
        </Container>
      </>
    );
  }

  // Render nearby station details (less info available)
  return (
    <>
      <Stack.Screen options={{ title: station.name }} />
      <Container>
        {/* Image Carousel */}
        <ImageCarousel images={station.images || []} />

        <HeroSection>
          <StationName>{station.name}</StationName>
          <StationAddress>{station.address}</StationAddress>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
            }}
          >
            <StatusBadge status={station.status}>
              <StatusText status={station.status}>{station.status}</StatusText>
            </StatusBadge>
            <OperatingHoursBadge isOpen={stationOpen}>
              <Ionicons
                name={stationOpen ? "checkmark-circle" : "close-circle"}
                size={14}
                color={stationOpen ? "#2E7D32" : "#C62828"}
              />
              <OperatingHoursText isOpen={stationOpen}>
                {operatingHoursText}
              </OperatingHoursText>
            </OperatingHoursBadge>
          </View>
        </HeroSection>

        <Content>
          <StatsGrid>
            <StatCard>
              <StatValue>{station.distanceKm.toFixed(1)}</StatValue>
              <StatLabel>Distance (km)</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{station.portSummary.carPorts}</StatValue>
              <StatLabel>Car Ports</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{station.portSummary.bikePorts}</StatValue>
              <StatLabel>Bike Ports</StatLabel>
            </StatCard>
          </StatsGrid>

          <Section>
            <SectionTitle>Location</SectionTitle>
            <Card>
              <InfoRow>
                <InfoLabel>Latitude</InfoLabel>
                <InfoValue>
                  {station.location.coordinates[1].toFixed(6)}
                </InfoValue>
              </InfoRow>
              <InfoRowLast>
                <InfoLabel>Longitude</InfoLabel>
                <InfoValue>
                  {station.location.coordinates[0].toFixed(6)}
                </InfoValue>
              </InfoRowLast>
            </Card>
          </Section>

          {/* Visit Station Button */}
          <VisitButton onPress={handleVisitStation}>
            <Ionicons name="navigate" size={20} color={colors.text.inverse} />
            <VisitButtonText>Visit This Station</VisitButtonText>
          </VisitButton>
        </Content>
      </Container>
    </>
  );
}
