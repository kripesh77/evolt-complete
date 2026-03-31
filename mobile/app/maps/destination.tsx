import React, { useState, useRef, useCallback } from "react";
import { Keyboard } from "react-native";
import { useRouter } from "expo-router";
import MapView from "react-native-maps";
import styled from "styled-components/native";
import { useLocation } from "../../context/LocationContext";
import { useRecommendation } from "../../context/RecommendationContext";
import { PlaceSearch } from "../../components/maps/PlaceSearch";
import {
  InstructionsOverlay,
  CoordsDisplay,
  BottomActionButton,
} from "../../components/maps/MapOverlays";
import { colors, spacing } from "../../theme";
import type { NominatimResult, GeoLocation } from "../../types";

const Container = styled.View`
  flex: 1;
`;

const Map = styled(MapView)`
  flex: 1;
`;

const CenterMarkerContainer = styled.View`
  position: absolute;
  top: 50%;
  left: 50%;
  margin-left: -15px;
  margin-top: -40px;
  align-items: center;
`;

const MarkerPin = styled.View`
  width: 30px;
  height: 30px;
  border-radius: 15px;
  background-color: ${colors.primary};
  border-width: 3px;
  border-color: ${colors.background.default};
  elevation: 5;
`;

const MarkerShadow = styled.View`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: rgba(0, 0, 0, 0.2);
  margin-top: 5px;
`;

const ButtonContainer = styled.View`
  position: absolute;
  bottom: 30px;
  left: ${spacing.xl}px;
  right: ${spacing.xl}px;
`;

export default function DestinationScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { location } = useLocation();
  const { setDestination } = useRecommendation();

  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(
    null
  );
  const [mapRegion, setMapRegion] = useState({
    latitude: location?.latitude || 27.7172,
    longitude: location?.longitude || 85.324,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const handleSelectPlace = (place: NominatimResult) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

    setSelectedLocation({ latitude: lat, longitude: lng });
    Keyboard.dismiss();

    const newRegion = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
    setMapRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 500);
  };

  const handleRegionChange = (region: typeof mapRegion) => {
    setMapRegion(region);
    setSelectedLocation({
      latitude: region.latitude,
      longitude: region.longitude,
    });
  };

  const handleNext = () => {
    const dest = selectedLocation || {
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
    };

    setDestination({
      longitude: dest.longitude,
      latitude: dest.latitude,
    });

    router.push("/maps/preferences");
  };

  return (
    <Container>
      <PlaceSearch onSelectPlace={handleSelectPlace} />

      <Map
        ref={mapRef}
        initialRegion={mapRegion}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
      />

      <CenterMarkerContainer>
        <MarkerPin />
        <MarkerShadow />
      </CenterMarkerContainer>

      <InstructionsOverlay text="Move the map to position the marker at your destination" />

      <CoordsDisplay
        latitude={mapRegion.latitude}
        longitude={mapRegion.longitude}
      />

      <ButtonContainer>
        <BottomActionButton text="Next: Set Preferences" onPress={handleNext} />
      </ButtonContainer>
    </Container>
  );
}
