import { borderRadius, colors, shadows, spacing } from "@/theme";
import styled from "styled-components/native";

export const Container = styled.View`
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
`;

export const Button = styled.TouchableOpacity`
  background-color: ${colors.background.default};
  padding-vertical: ${spacing.md}px;
  padding-horizontal: ${spacing.lg}px;
  border-radius: ${borderRadius.md}px;
  ${shadows.md};
`;

export const ButtonText = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: ${colors.text.primary};
`;

export const Dropdown = styled.View`
  margin-top: ${spacing.sm}px;
  background-color: ${colors.background.default};
  border-radius: ${borderRadius.md}px;
  ${shadows.md};
`;

interface DropdownItemProps {
  isSelected?: boolean;
}

export const DropdownItem = styled.TouchableOpacity<DropdownItemProps>`
  padding-vertical: ${spacing.md}px;
  padding-horizontal: ${spacing.xl}px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ isSelected }) =>
    isSelected ? colors.primaryLight : colors.grey[200]};
  background-color: ${({ isSelected }) =>
    isSelected ? colors.primaryLight : colors.background.default};
`;

interface DropdownItemTextProps {
  isSelected?: boolean;
}

export const DropdownItemText = styled.Text<DropdownItemTextProps>`
  font-size: 14px;
  color: ${({ isSelected }) =>
    isSelected ? colors.primary : colors.text.primary};
  font-weight: ${({ isSelected }) => (isSelected ? "600" : "400")};
`;
