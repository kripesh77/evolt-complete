import { borderRadius, colors, spacing } from "@/theme";
import styled from "styled-components/native";

export const Container = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${spacing.md}px;
`;

interface ChipProps {
  isSelected?: boolean;
}

export const ChipButton = styled.TouchableOpacity<ChipProps>`
  padding-vertical: ${spacing.md}px;
  padding-horizontal: ${spacing.xl}px;
  border-radius: ${borderRadius.full}px;
  border-width: 2px;
  border-color: ${({ isSelected }) =>
    isSelected ? colors.primary : colors.border};
  background-color: ${({ isSelected }) =>
    isSelected ? colors.primaryLight : colors.background.default};
`;

export const ChipText = styled.Text<ChipProps>`
  font-size: 14px;
  color: ${({ isSelected }) =>
    isSelected ? colors.primary : colors.text.secondary};
  font-weight: ${({ isSelected }) => (isSelected ? "600" : "400")};
`;
