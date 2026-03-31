import styled from "styled-components/native";
import { colors, spacing, borderRadius } from "../../theme";

export const Container = styled.View`
  flex-direction: row;
  gap: ${spacing.md}px;
`;

interface SegmentProps {
  isSelected?: boolean;
}

export const ButtonContainer = styled.TouchableOpacity<SegmentProps>`
  flex: 1;
  padding-vertical: ${spacing.lg}px;
  padding-horizontal: ${spacing.lg}px;
  border-radius: ${borderRadius.md}px;
  border-width: 2px;
  border-color: ${({ isSelected }) =>
    isSelected ? colors.primary : colors.border};
  background-color: ${({ isSelected }) =>
    isSelected ? colors.primaryLight : colors.background.default};
  align-items: center;
`;

export const ButtonText = styled.Text<SegmentProps>`
  font-size: 16px;
  color: ${({ isSelected }) =>
    isSelected ? colors.primary : colors.text.secondary};
  font-weight: ${({ isSelected }) => (isSelected ? "600" : "400")};
`;
