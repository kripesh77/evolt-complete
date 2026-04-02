import { borderRadius, colors, shadows, spacing } from "@/theme";
import styled from "styled-components/native";

export const Container = styled.View`
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 1000;
  flex-direction: row;
  align-items: center;
`;

export const SearchInput = styled.TextInput`
  flex: 1;
  background-color: ${colors.background.default};
  padding-vertical: ${spacing.md}px;
  padding-horizontal: ${spacing.lg}px;
  border-radius: ${borderRadius.md}px;
  font-size: 16px;
  ${shadows.md};
`;

export const LoaderWrapper = styled.View`
  position: absolute;
  right: ${spacing.lg}px;
`;

export const ResultsContainer = styled.View`
  position: absolute;
  top: 60px;
  left: 10px;
  right: 10px;
  max-height: 200px;
  background-color: ${colors.background.default};
  border-radius: ${borderRadius.md}px;
  z-index: 999;
  ${shadows.md};
`;

export const ResultItem = styled.TouchableOpacity`
  padding-vertical: ${spacing.md}px;
  padding-horizontal: ${spacing.lg}px;
  border-bottom-width: 1px;
  border-bottom-color: ${colors.grey[200]};
`;

export const ResultText = styled.Text`
  font-size: 14px;
  color: ${colors.text.primary};
`;
