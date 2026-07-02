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

export default function SignUpScreen() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading } = useAuth();

  const [name, setName] = useState("");
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

    if (!name || !email || !password) {
      setError("Please fill in your name, email, and password.");
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password);
      router.replace("/(tabs)/profile");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create an account right now.",
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
        <Title>Create Account</Title>
        <Subtitle>Join EVolt and access your profile.</Subtitle>

        <FormSection>
          <FormInput
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
          />
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
            placeholder="Create a password"
          />
        </FormSection>

        {error ? <ErrorText>{error}</ErrorText> : null}

        <PrimaryButton
          text={submitting ? "Creating account..." : "Create Account"}
          onPress={() => void handleSubmit()}
        />
      </Content>
    </Container>
  );
}
