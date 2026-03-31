import React from "react";
import { ActivityIndicator } from "react-native";
import {
  Container,
  Text,
  CoordsContainer,
  CoordsText,
  BottomButton,
  BottomButtonText,
  ActivityIndicatorWrapper,
  LoadingText,
} from "./MapOverlays.styles";

interface InstructionsOverlayProps {
  text: string;
}

export function InstructionsOverlay({ text }: InstructionsOverlayProps) {
  return (
    <Container>
      <Text>{text}</Text>
    </Container>
  );
}

interface CoordsDisplayProps {
  latitude: number;
  longitude: number;
}

export function CoordsDisplay({ latitude, longitude }: CoordsDisplayProps) {
  return (
    <CoordsContainer>
      <CoordsText>
        {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </CoordsText>
    </CoordsContainer>
  );
}

interface BottomActionButtonProps {
  text: string;
  onPress: () => void;
  isLoading?: boolean;
}

export function BottomActionButton({
  text,
  onPress,
  isLoading = false,
}: BottomActionButtonProps) {
  return (
    <BottomButton onPress={onPress} disabled={isLoading}>
      <BottomButtonText>{text}</BottomButtonText>
    </BottomButton>
  );
}

interface LoadingIndicatorProps {
  text: string;
}

export function LoadingIndicatorOverlay({ text }: LoadingIndicatorProps) {
  return (
    <ActivityIndicatorWrapper>
      <ActivityIndicator size="small" color="#4CAF50" />
      <LoadingText>{text}</LoadingText>
    </ActivityIndicatorWrapper>
  );
}
