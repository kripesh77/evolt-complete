import { Stack } from "expo-router";

export default function StationsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Stations",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="[stationId]"
        options={{
          title: "Station Details",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="navigateTo"
        options={{
          title: "Navigation",
          headerStyle: { backgroundColor: "#16A34A" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "600" },
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
