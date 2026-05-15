import { Stack } from "expo-router";
import SafeArea from "@/components/common/SareArea";
import { TransitionPresets } from "@react-navigation/stack";

function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" />
    </Stack>
  );
}

export default RootLayout;
