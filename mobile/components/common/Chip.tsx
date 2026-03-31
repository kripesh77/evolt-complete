import React from "react";
import { Container, ChipButton, ChipText } from "./Chip.styles";

// Simple Chip component
interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <ChipButton isSelected={selected} onPress={onPress}>
      <ChipText isSelected={selected}>{label}</ChipText>
    </ChipButton>
  );
}

// ChipGroup wrapper
interface ChipGroupProps {
  children: React.ReactNode;
}

export function ChipGroup({ children }: ChipGroupProps) {
  return <Container>{children}</Container>;
}

// Generic ChipGroup for value-based selections
interface ChipOption<T> {
  value: T;
  label: string;
}

interface ChipSelectProps<T> {
  options: ChipOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
}

export function ChipSelect<T extends string>({
  options,
  selected,
  onToggle,
}: ChipSelectProps<T>) {
  return (
    <Container>
      {options.map((option) => (
        <ChipButton
          key={option.value}
          isSelected={selected.includes(option.value)}
          onPress={() => onToggle(option.value)}
        >
          <ChipText isSelected={selected.includes(option.value)}>
            {option.label}
          </ChipText>
        </ChipButton>
      ))}
    </Container>
  );
}
