import React from "react";
import { Container, Label, Row, RowLabel, RowValue } from "./InfoCard.styles";

interface InfoCardProps {
  title: string;
  items: Array<{
    label: string;
    value: string;
  }>;
}

export function InfoCard({ title, items }: InfoCardProps) {
  return (
    <Container>
      <Label>{title}</Label>
      {items.map((item, index) => (
        <Row key={index}>
          <RowLabel>{item.label}</RowLabel>
          <RowValue>{item.value}</RowValue>
        </Row>
      ))}
    </Container>
  );
}
