import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

function SareArea({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ height: "100%", width: "100%" }}>
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default SareArea;
