export interface Operating Hours {
  type: "24/7" | "custom";
  openTime?: string; // HH:mm format
  closeTime?: string; // HH:mm format
  weekdayHours?: OperatingHours;
  weekendHours?: OperatingHours;
}
