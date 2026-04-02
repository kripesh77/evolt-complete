import { LocationProvider } from "@/context/LocationContext";
import { RecommendationProvider } from "@/context/RecommendationContext";
import { SocketProvider } from "@/context/SocketContext";
import { QueryProvider } from "@/services/queryClient";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";

function TabLayout() {
  return (
    <QueryProvider>
      <SocketProvider>
        <LocationProvider>
          <RecommendationProvider>
            <Tabs>
              <Tabs.Screen
                name="(maps)"
                options={{
                  headerShown: false,
                  tabBarLabel: "Map",
                  tabBarIcon: ({ color, size }) => (
                    <FontAwesome name="map" size={size} color={color} />
                  ),
                }}
              />
              <Tabs.Screen
                name="stations"
                options={{
                  headerShown: false,
                  tabBarLabel: "Stations",
                  tabBarIcon: ({ color, size }) => (
                    <FontAwesome name="bolt" size={size} color={color} />
                  ),
                }}
              />
            </Tabs>
          </RecommendationProvider>
        </LocationProvider>
      </SocketProvider>
    </QueryProvider>
  );
}

export default TabLayout;
