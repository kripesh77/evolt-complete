import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { useStationStore } from "./src/store/stationStore";

export default function App() {
  const connectWebSocket = useStationStore((s) => s.connectWebSocket);
  const disconnectWebSocket = useStationStore((s) => s.disconnectWebSocket);

  useEffect(() => {
    connectWebSocket();
    return () => {
      disconnectWebSocket();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
