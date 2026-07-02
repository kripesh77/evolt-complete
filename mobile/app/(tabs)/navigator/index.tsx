import React from "react";
import styled from "styled-components/native";
import { colors, spacing, typography } from "@/theme";

const Container = styled.View`
  flex: 1;
  background-color: ${colors.background.default};
  justify-content: center;
  align-items: center;
  padding: ${spacing.xl}px;
`;

const Title = styled.Text`
  color: ${colors.text.primary};
  font-size: ${typography.sizes.xl}px;
  font-weight: 700;
  margin-bottom: ${spacing.sm}px;
`;

const Subtitle = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.md}px;
  text-align: center;
`;

export default function NavigatorScreen() {
  return (
    <Container>
      <Title>Navigator</Title>
      <Subtitle>
        Route planning and navigation experiences will appear here.
      </Subtitle>
    </Container>
  );
}
