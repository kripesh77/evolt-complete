import { RADIUS_OPTIONS } from "@/constants";
import React from "react";
import {
  Button,
  ButtonText,
  Container,
  Dropdown,
  DropdownItem,
  DropdownItemText,
} from "./RadiusSelector.styles";

interface RadiusSelectorProps {
  selectedRadius: number;
  onRadiusChange: (radius: number) => void;
}

export function RadiusSelector({
  selectedRadius,
  onRadiusChange,
}: RadiusSelectorProps) {
  const [showDropdown, setShowDropdown] = React.useState(false);

  return (
    <Container>
      <Button onPress={() => setShowDropdown(!showDropdown)}>
        <ButtonText>{selectedRadius} km</ButtonText>
      </Button>

      {showDropdown && (
        <Dropdown>
          {RADIUS_OPTIONS.map((radius) => (
            <DropdownItem
              key={radius}
              isSelected={radius === selectedRadius}
              onPress={() => {
                onRadiusChange(radius);
                setShowDropdown(false);
              }}
            >
              <DropdownItemText isSelected={radius === selectedRadius}>
                {radius} km
              </DropdownItemText>
            </DropdownItem>
          ))}
        </Dropdown>
      )}
    </Container>
  );
}
