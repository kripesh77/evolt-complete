import styled from "styled-components/native";
import { colors, spacing, borderRadius, shadows } from "../../theme";

export const Container = styled.View`
  position: absolute;
  bottom: 140px;
  left: ${spacing.xl}px;
  right: ${spacing.xl}px;
  background-color: rgba(0, 0, 0, 0.7);
  padding-vertical: ${spacing.md}px;
  padding-horizontal: ${spacing.lg}px;
  border-radius: ${borderRadius.md}px;
`;

export const Text = styled.Text`
  color: ${colors.text.light};
  font-size: 14px;
  text-align: center;
`;

export const CoordsContainer = styled.View`
  position: absolute;
  bottom: 100px;
  left: ${spacing.xl}px;
  right: ${spacing.xl}px;
  align-items: center;
`;

export const CoordsText = styled.Text`
  font-size: 12px;
  color: ${colors.text.secondary};
  background-color: ${colors.background.default};
  padding-vertical: ${spacing.sm}px;
  padding-horizontal: ${spacing.md}px;
  border-radius: ${borderRadius.md}px;
`;

export const BottomButton = styled.TouchableOpacity`
  background-color: ${colors.primary};
  padding-vertical: ${spacing.lg}px;
  padding-horizontal: ${spacing.xxl}px;
  border-radius: ${borderRadius.full}px;
  align-items: center;
  min-width: 200px;
  ${shadows.md};
`;

export const BottomButtonText = styled.Text`
  color: ${colors.text.light};
  font-size: 16px;
  font-weight: 600;
`;

export const ActivityIndicatorWrapper = styled.View`
  position: absolute;
  top: 60px;
  right: ${spacing.lg}px;
  background-color: ${colors.background.default};
  padding-vertical: ${spacing.sm}px;
  padding-horizontal: ${spacing.md}px;
  border-radius: ${borderRadius.md}px;
  flex-direction: row;
  align-items: center;
  ${shadows.md};
`;

export const LoadingText = styled.Text`
  margin-left: ${spacing.md}px;
  font-size: 12px;
  color: ${colors.text.secondary};
`;
