import { Stack } from "expo-router";
import { AuthProvider } from "@/context/AuthContext";

function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" />
      </Stack>
    </AuthProvider>
  );
}

export default RootLayout;
