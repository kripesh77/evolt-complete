import { OperatingHours } from "@/types";

export function formatOperatingHours(operatingHours?: OperatingHours): string {
  if (!operatingHours) return "Hours not available";

  if (operatingHours.type === "24/7") {
    return "24/7";
  }

  if (
    operatingHours.type === "custom" &&
    operatingHours.openTime &&
    operatingHours.closeTime
  ) {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":");
      const hour24 = parseInt(hours || "0");
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const period = hour24 >= 12 ? "PM" : "AM";
      return `${hour12}:${minutes} ${period}`;
    };

    const openTime = formatTime(operatingHours.openTime);
    const closeTime = formatTime(operatingHours.closeTime);

    if (operatingHours.openTime > operatingHours.closeTime) {
      return `${openTime} - ${closeTime} (overnight)`;
    }

    return `${openTime} - ${closeTime}`;
  }

  return "Hours not available";
}
