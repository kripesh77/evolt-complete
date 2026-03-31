import React from "react";
import styled from "styled-components/native";
import { colors, spacing, typography } from "../../theme";

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "email-address";
  error?: string;
  multiline?: boolean;
}

const Container = styled.View`
  margin-bottom: ${spacing.md}px;
`;

const Label = styled.Text`
  font-size: ${typography.sizes.md}px;
  font-weight: 600;
  color: ${colors.text.primary};
  margin-bottom: ${spacing.sm}px;
`;

const Input = styled.TextInput<{ hasError?: boolean }>`
  border-width: 1px;
  border-color: ${(props) => (props.hasError ? colors.error : colors.border)};
  border-radius: 10px;
  padding: ${spacing.md}px ${spacing.lg}px;
  font-size: ${typography.sizes.md}px;
  background-color: ${colors.background.secondary};
  color: ${colors.text.primary};
`;

const ErrorText = styled.Text`
  color: ${colors.error};
  font-size: ${typography.sizes.sm}px;
  margin-top: ${spacing.xs}px;
`;

export const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  error,
  multiline = false,
}) => {
  return (
    <Container>
      <Label>{label}</Label>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        keyboardType={keyboardType}
        hasError={!!error}
        multiline={multiline}
      />
      {error && <ErrorText>{error}</ErrorText>}
    </Container>
  );
};

interface FormSectionProps {
  title?: string;
  children: React.ReactNode;
}

const SectionContainer = styled.View`
  margin-bottom: ${spacing.lg}px;
`;

const SectionTitle = styled.Text`
  font-size: ${typography.sizes.md}px;
  font-weight: 600;
  color: ${colors.text.primary};
  margin-bottom: ${spacing.md}px;
`;

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
}) => {
  return (
    <SectionContainer>
      {title && <SectionTitle>{title}</SectionTitle>}
      {children}
    </SectionContainer>
  );
};
