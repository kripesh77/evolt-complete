import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "../store/authStore";
import { RootStackParamList, MainTabParamList } from "../types";

// Screens
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import MapScreen from "../screens/MapScreen";
import RecommendScreen from "../screens/RecommendScreen";
import StationDetailsScreen from "../screens/StationDetailsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import VehicleProfilesScreen from "../screens/VehicleProfilesScreen";
import AddVehicleScreen from "../screens/AddVehicleScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator — always accessible (guest & authenticated)
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case "HomeTab":
              iconName = focused ? "home" : "home-outline";
              break;
            case "MapTab":
              iconName = focused ? "map" : "map-outline";
              break;
            case "RecommendTab":
              iconName = focused ? "bulb" : "bulb-outline";
              break;
            case "ProfileTab":
              iconName = focused ? "person" : "person-outline";
              break;
            default:
              iconName = "ellipse";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#4CAF50",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: "#4CAF50",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          title: "EV Charge Finder",
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapScreen}
        options={{
          tabBarLabel: "Map",
          title: "Station Map",
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="RecommendTab"
        component={RecommendScreen}
        options={{
          tabBarLabel: "Recommend",
          title: "Get Recommendations",
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          title: "My Profile",
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator — no auth gate, everyone enters the app directly
export default function AppNavigator() {
  const { checkAuth } = useAuthStore();

  // Silently try to restore session in background — never blocks the UI
  React.useEffect(() => {
    checkAuth();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#4CAF50" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        {/* Tabs — always the initial route */}
        <Stack.Screen
          name="Main"
          component={MainTabNavigator}
          options={{ headerShown: false }}
        />

        {/* Auth screens — presented as modals from anywhere */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title: "Login",
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{
            title: "Register",
            presentation: "modal",
            headerShown: false,
          }}
        />

        {/* Stack screens — accessible regardless of auth */}
        <Stack.Screen
          name="StationDetails"
          component={StationDetailsScreen}
          options={{ title: "Station Details" }}
        />
        <Stack.Screen
          name="VehicleProfiles"
          component={VehicleProfilesScreen}
          options={{ title: "My Vehicles" }}
        />
        <Stack.Screen
          name="AddVehicle"
          component={AddVehicleScreen}
          options={{ title: "Add Vehicle" }}
        />
        <Stack.Screen
          name="EditVehicle"
          component={AddVehicleScreen}
          options={{ title: "Edit Vehicle" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
