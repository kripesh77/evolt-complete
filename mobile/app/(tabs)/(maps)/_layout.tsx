import { Stack } from "expo-router";

export default function MapLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="vehicleInfo"
        options={{
          title: "Vehicle Information",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="destination"
        options={{
          title: "Select Destination",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="preferences"
        options={{
          title: "Preferences",
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
