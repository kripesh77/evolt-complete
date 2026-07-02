import React from "react";
import { ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import styled from "styled-components/native";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing, typography } from "@/theme";

const Container = styled.View`
  flex: 1;
  background-color: ${colors.background.default};
  justify-content: center;
  padding: ${spacing.xl}px;
`;

const Title = styled.Text`
  color: ${colors.text.primary};
  font-size: ${typography.sizes.xl}px;
  font-weight: 700;
  margin-bottom: ${spacing.sm}px;
`;

const Subtitle = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.md}px;
  margin-bottom: ${spacing.xl}px;
`;

const ButtonSpacer = styled.View`
  height: ${spacing.md}px;
`;

export default function ProfileTabScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <Container>
        <ActivityIndicator size="large" color={colors.primary} />
      </Container>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Container>
        <Title>Welcome</Title>
        <Subtitle>
          Sign in or create an account to manage your profile.
        </Subtitle>
        <PrimaryButton
          text="Sign In"
          onPress={() => router.push("/(tabs)/profile/signin")}
        />
        <ButtonSpacer />
        <PrimaryButton
          text="Create Account"
          onPress={() => router.push("/(tabs)/profile/signup")}
        />
      </Container>
    );
  }

  return (
    <Container>
      <Title>Profile</Title>
      <Subtitle>Signed in as {user.name}</Subtitle>
      <PrimaryButton text="Sign Out" onPress={() => void logout()} />
    </Container>
  );
}
