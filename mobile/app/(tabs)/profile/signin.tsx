import React, { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import styled from "styled-components/native";
import { FormInput, FormSection } from "@/components/common/FormComponents";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { colors, spacing, typography } from "@/theme";

const Container = styled.ScrollView`
  flex: 1;
  background-color: ${colors.background.default};
`;

const Content = styled.View`
  padding: ${spacing.xl}px;
  padding-bottom: 40px;
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

const ErrorText = styled.Text`
  color: ${colors.error};
  font-size: ${typography.sizes.sm}px;
  margin-top: ${spacing.sm}px;
`;

export default function SignInScreen() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/(tabs)/profile");
    }
  }, [isAuthenticated, isLoading]);

  const handleSubmit = async () => {
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/(tabs)/profile");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to sign in right now.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Content>
          <ActivityIndicator size="large" color={colors.primary} />
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Content>
        <Title>Sign In</Title>
        <Subtitle>Access your profile and saved preferences.</Subtitle>

        <FormSection>
          <FormInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
          />
          <FormInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            keyboardType="default"
          />
        </FormSection>

        {error ? <ErrorText>{error}</ErrorText> : null}

        <PrimaryButton
          text={submitting ? "Signing in..." : "Sign In"}
          onPress={() => void handleSubmit()}
        />
      </Content>
    </Container>
  );
}
