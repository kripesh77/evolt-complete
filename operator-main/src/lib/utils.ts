import { OperatingHours } from "@/types";

/**
 * Format operating hours for display
 */
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

    // Check if it's overnight operation
    if (operatingHours.openTime > operatingHours.closeTime) {
      return `${openTime} - ${closeTime} (overnight)`;
    }

    return `${openTime} - ${closeTime}`;
  }

  return "Hours not available";
}

/**
 * Check if station is currently open
 */
export function isStationOpen(operatingHours?: OperatingHours): boolean {
  if (!operatingHours) return false;

  if (operatingHours.type === "24/7") {
    return true;
  }

  if (
    operatingHours.type === "custom" &&
    operatingHours.openTime &&
    operatingHours.closeTime
  ) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    // Normal hours (e.g., 9:00 - 21:00)
    if (operatingHours.openTime <= operatingHours.closeTime) {
      return (
        currentTime >= operatingHours.openTime &&
        currentTime <= operatingHours.closeTime
      );
    }

    // Overnight hours (e.g., 19:00 - 06:00)
    return (
      currentTime >= operatingHours.openTime ||
      currentTime <= operatingHours.closeTime
    );
  }

  return false;
}

/**
 * Get status text for operating hours
 */
export function getOperatingStatus(operatingHours?: OperatingHours): string {
  if (!operatingHours) return "Unknown";

  if (isStationOpen(operatingHours)) {
    return "Open now";
  }

  if (operatingHours.type === "custom" && operatingHours.openTime) {
    const [hours, minutes] = operatingHours.openTime.split(":");
    const hour24 = parseInt(hours || "0");
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? "PM" : "AM";
    return `Closed • Opens ${hour12}:${minutes} ${period}`;
  }

  return "Closed";
}
