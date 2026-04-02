import { borderRadius, colors, shadows, spacing } from "@/theme";
import styled from "styled-components/native";

export const Centered = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: ${spacing.xl}px;
  background-color: ${colors.background.default};
`;

export const Title = styled.Text`
  font-size: 22px;
  font-weight: 700;
  margin-bottom: ${spacing.md}px;
  text-align: center;
  color: ${colors.text.primary};
`;

export const Subtitle = styled.Text`
  font-size: 16px;
  color: ${colors.text.secondary};
  text-align: center;
  margin-bottom: ${spacing.xl}px;
`;

export const PermissionButton = styled.TouchableOpacity`
  background-color: ${colors.primary};
  padding-vertical: ${spacing.lg}px;
  padding-horizontal: ${spacing.xl}px;
  border-radius: ${borderRadius.full}px;
  ${shadows.md};
`;

export const PermissionButtonText = styled.Text`
  color: ${colors.text.light};
  font-size: 16px;
  font-weight: 600;
`;

export const LoadingText = styled.Text`
  margin-top: ${spacing.lg}px;
  font-size: 16px;
  color: ${colors.text.secondary};
`;
