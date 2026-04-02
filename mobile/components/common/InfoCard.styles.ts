import { borderRadius, colors, shadows, spacing } from "@/theme";
import styled from "styled-components/native";

export const Container = styled.View`
  background-color: ${colors.background.light};
  padding: ${spacing.lg}px;
  border-radius: ${borderRadius.md}px;
  margin-bottom: ${spacing.lg}px;
  ${shadows.md};
`;

export const Label = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: ${colors.text.primary};
  margin-bottom: ${spacing.lg}px;
`;

export const Row = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing.md}px;
`;

export const RowLabel = styled.Text`
  font-size: 14px;
  color: ${colors.text.secondary};
`;

export const RowValue = styled.Text`
  font-size: 14px;
  color: ${colors.text.primary};
  font-weight: 500;
`;
