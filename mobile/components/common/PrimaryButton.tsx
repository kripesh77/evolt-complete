import { colors, spacing, typography } from "@/theme";
import React from "react";
import { ActivityIndicator } from "react-native";
import styled from "styled-components/native";

interface PrimaryButtonProps {
  text: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

const Button = styled.TouchableOpacity<{
  variant: "primary" | "secondary" | "danger";
  isDisabled?: boolean;
}>`
  background-color: ${(props) => {
    if (props.isDisabled) return colors.text.muted;
    switch (props.variant) {
      case "secondary":
        return colors.background.default;
      case "danger":
        return colors.secondary;
      default:
        return colors.primary;
    }
  }};
  padding: ${spacing.md}px ${spacing.xl}px;
  border-radius: 30px;
  align-items: center;
  justify-content: center;
  elevation: 3;
  ${(props) =>
    props.variant === "secondary" &&
    `
    border-width: 2px;
    border-color: ${colors.primary};
  `}
`;

const ButtonText = styled.Text<{ variant: "primary" | "secondary" | "danger" }>`
  color: ${(props) =>
    props.variant === "secondary" ? colors.primary : colors.text.inverse};
  font-size: ${typography.sizes.md}px;
  font-weight: 600;
`;

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  text,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
}) => {
  return (
    <Button
      onPress={onPress}
      disabled={disabled || loading}
      isDisabled={disabled}
      variant={variant}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "secondary" ? colors.primary : colors.text.inverse}
        />
      ) : (
        <ButtonText variant={variant}>{text}</ButtonText>
      )}
    </Button>
  );
};
