import styled from "styled-components/native";
import { colors, spacing, typography, borderRadius, shadows } from "./index";

// Common styled components
export const Container = styled.View`
  flex: 1;
  background-color: ${colors.background.default};
`;

export const ScrollContent = styled.ScrollView`
  flex: 1;
  background-color: ${colors.background.default};
`;

export const Section = styled.View`
  padding: ${spacing.lg}px;
`;

export const SectionTitle = styled.Text`
  font-size: ${typography.fontSize.lg}px;
  font-weight: ${typography.fontWeight.semibold};
  color: ${colors.text.primary};
  margin-bottom: ${spacing.md}px;
`;

export const SectionSubtitle = styled.Text`
  font-size: ${typography.fontSize.sm}px;
  color: ${colors.text.secondary};
  margin-bottom: ${spacing.lg}px;
`;

export const Input = styled.TextInput`
  border-width: 1px;
  border-color: ${(props) => (props.hasError ? colors.danger : colors.border)};
  border-radius: ${borderRadius.md}px;
  padding-vertical: ${spacing.md}px;
  padding-horizontal: ${spacing.lg}px;
  font-size: ${typography.fontSize.base}px;
  background-color: ${colors.background.light};
  color: ${colors.text.primary};
  margin-bottom: ${spacing.md}px;
`;

export const Button = styled.TouchableOpacity`
  background-color: ${(props) =>
    props.variant === "danger"
      ? colors.danger
      : props.variant === "secondary"
        ? colors.secondary
        : colors.primary};
  padding-vertical: ${spacing.lg}px;
  padding-horizontal: ${spacing.xl}px;
  border-radius: ${borderRadius.full}px;
  align-items: center;
  justify-content: center;
  ${shadows.md};
`;

export const ButtonText = styled.Text`
  color: ${colors.text.light};
  font-size: ${typography.fontSize.base}px;
  font-weight: ${typography.fontWeight.semibold};
`;

export const ErrorText = styled.Text`
  color: ${colors.danger};
  font-size: ${typography.fontSize.xs}px;
  margin-top: ${spacing.sm}px;
`;

export const Label = styled.Text`
  font-size: ${typography.fontSize.base}px;
  font-weight: ${typography.fontWeight.medium};
  color: ${colors.text.primary};
  margin-bottom: ${spacing.sm}px;
`;

export const Card = styled.View`
  background-color: ${colors.background.default};
  border-radius: ${borderRadius.md}px;
  padding: ${spacing.lg}px;
  margin-bottom: ${spacing.lg}px;
  ${shadows.md};
`;

export const FlexRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

export const FlexCenter = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const CenteredContainer = styled(FlexCenter)`
  padding: ${spacing.xl}px;
`;
