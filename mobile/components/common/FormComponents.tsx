import React, { useRef, useState } from "react";
import { Dimensions, Modal, Pressable, Text, View } from "react-native";
import styled from "styled-components/native";

import { colors, spacing, typography } from "@/theme";

interface FormInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "email-address";
  error?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  information?: string;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const TOOLTIP_WIDTH = Math.min(280, SCREEN_WIDTH - 32);

const Container = styled.View`
  margin-bottom: ${spacing.md}px;
`;

const LabelRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${spacing.sm}px;
`;

const Label = styled.Text`
  font-size: ${typography.sizes.md}px;
  font-weight: 600;
  color: ${colors.text.primary};
`;

const InfoIconButton = styled.Pressable`
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: ${colors.background.secondary};
  border-width: 1px;
  border-color: ${colors.border};
  align-items: center;
  justify-content: center;
  margin-left: 6px;
`;

const InfoIconText = styled.Text`
  color: ${colors.text.secondary};
  font-size: 12px;
  font-weight: 700;
`;

const Tooltip = styled.View<{
  left: number;
  top: number;
}>`
  position: absolute;

  left: ${(p) => p.left}px;
  top: ${(p) => p.top - 30}px;

  width: ${TOOLTIP_WIDTH}px;

  background-color: ${colors.background.light};

  border-width: 1px;
  border-color: ${colors.border};

  border-radius: 10px;

  padding: ${spacing.sm}px ${spacing.md}px;

  elevation: 8;
  shadow-color: #000;
  shadow-opacity: 0.2;
  shadow-radius: 8px;
  shadow-offset: 0px 2px;
`;

const TooltipText = styled.Text`
  font-size: ${typography.sizes.sm}px;
  color: ${colors.text.secondary};
  line-height: 18px;
`;

const InputContainer = styled.View<{ hasError?: boolean }>`
  flex-direction: row;
  align-items: center;

  border-width: 1px;
  border-color: ${(props) => (props.hasError ? colors.error : colors.border)};

  border-radius: 10px;

  background-color: ${colors.background.secondary};
`;

const Input = styled.TextInput`
  flex: 1;
  padding: ${spacing.md}px ${spacing.lg}px;
  font-size: ${typography.sizes.md}px;
  color: ${colors.text.primary};
`;

const ToggleButton = styled.Pressable`
  padding: ${spacing.md}px;
`;

const ToggleText = styled.Text`
  color: ${colors.primary};
  font-size: ${typography.sizes.sm}px;
  font-weight: 600;
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
  secureTextEntry = false,
  information,
}) => {
  const [hidden, setHidden] = useState(secureTextEntry);

  const [showInfo, setShowInfo] = useState(false);

  const [tooltipPos, setTooltipPos] = useState({
    left: 16,
    top: 0,
  });

  const infoRef = useRef<View>(null);

  const hasInformation =
    typeof information === "string" && information.trim().length > 0;

  const openTooltip = () => {
    if (!infoRef.current) return;

    infoRef.current.measureInWindow((x, y, width, height) => {
      let left = x;

      if (left + TOOLTIP_WIDTH > SCREEN_WIDTH - 16) {
        left = SCREEN_WIDTH - TOOLTIP_WIDTH - 16;
      }

      if (left < 16) {
        left = 16;
      }

      setTooltipPos({
        left,
        top: y + height + 8,
      });

      setShowInfo(true);
    });
  };

  const toggleTooltip = () => {
    if (showInfo) {
      setShowInfo(false);
    } else {
      openTooltip();
    }
  };

  return (
    <Container>
      <LabelRow>
        <Label>{label}</Label>

        {hasInformation && (
          <View ref={infoRef} collapsable={false}>
            <InfoIconButton
              onPress={toggleTooltip}
              accessibilityRole="button"
              accessibilityLabel="Information"
            >
              <InfoIconText>i</InfoIconText>
            </InfoIconButton>
          </View>
        )}
      </LabelRow>

      <Modal
        visible={showInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfo(false)}
      >
        <Pressable
          style={{
            flex: 1,
          }}
          onPress={() => setShowInfo(false)}
        >
          <Tooltip left={tooltipPos.left} top={tooltipPos.top}>
            <TooltipText>{information}</TooltipText>
          </Tooltip>
        </Pressable>
      </Modal>
      <InputContainer hasError={!!error}>
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.muted}
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={hidden}
        />

        {secureTextEntry && (
          <ToggleButton onPress={() => setHidden((prev) => !prev)}>
            <ToggleText>{hidden ? "Show" : "Hide"}</ToggleText>
          </ToggleButton>
        )}
      </InputContainer>

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
