import React from "react";
import {
  Container,
  ButtonContainer,
  ButtonText,
} from "./SegmentedControl.styles";

// Simple index-based SegmentedControl
interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function SegmentedControl({
  options,
  selectedIndex,
  onSelect,
}: SegmentedControlProps) {
  return (
    <Container>
      {options.map((option, index) => (
        <ButtonContainer
          key={option}
          isSelected={index === selectedIndex}
          onPress={() => onSelect(index)}
        >
          <ButtonText isSelected={index === selectedIndex}>{option}</ButtonText>
        </ButtonContainer>
      ))}
    </Container>
  );
}

// Value-based SegmentedControl
interface SegmentedControlOption<T> {
  value: T;
  label: string;
}

interface SegmentedControlValueProps<T> {
  options: SegmentedControlOption<T>[];
  selectedValue: T;
  onValueChange: (value: T) => void;
}

export function SegmentedControlValue<T extends string | number>({
  options,
  selectedValue,
  onValueChange,
}: SegmentedControlValueProps<T>) {
  return (
    <Container>
      {options.map((option) => (
        <ButtonContainer
          key={String(option.value)}
          isSelected={option.value === selectedValue}
          onPress={() => onValueChange(option.value)}
        >
          <ButtonText isSelected={option.value === selectedValue}>
            {option.label}
          </ButtonText>
        </ButtonContainer>
      ))}
    </Container>
  );
}
