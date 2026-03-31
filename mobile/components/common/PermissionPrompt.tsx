import React from "react";
import { ActivityIndicator } from "react-native";
import {
  Centered,
  Title,
  Subtitle,
  PermissionButton,
  PermissionButtonText,
  LoadingText,
} from "./PermissionPrompt.styles";

interface PermissionPromptProps {
  title: string;
  subtitle: string;
  buttonText: string;
  onPress: () => void;
  isLoading?: boolean;
}

export function PermissionPrompt({
  title,
  subtitle,
  buttonText,
  onPress,
  isLoading = false,
}: PermissionPromptProps) {
  return (
    <Centered>
      <Title>{title}</Title>
      <Subtitle>{subtitle}</Subtitle>
      <PermissionButton onPress={onPress} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <PermissionButtonText>{buttonText}</PermissionButtonText>
        )}
      </PermissionButton>
    </Centered>
  );
}
