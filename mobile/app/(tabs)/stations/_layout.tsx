import { Stack } from "expo-router";

export default function StationsLayout() {
  return (
    <Stack screenOptions={{ animation: "simple_push" }}>
      <Stack.Screen
        name="index"
        options={{
          title: "Stations",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[stationId]"
        options={{
          title: "Station Details",
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
