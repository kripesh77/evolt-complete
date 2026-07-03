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
  padding-bottom: 48px;
`;

const HeaderCard = styled.View`
  border-width: 1px;
  border-color: ${colors.border};
  background-color: ${colors.background.secondary};
  border-radius: 18px;
  padding: ${spacing.lg}px;
  margin-bottom: ${spacing.xl}px;
`;

const Title = styled.Text`
  color: ${colors.text.primary};
  font-size: ${typography.sizes.xl}px;
  font-weight: 800;
  margin-bottom: ${spacing.xs}px;
`;

const Subtitle = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.md}px;
  line-height: 20px;
`;

const Label = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.sm}px;
  margin-top: ${spacing.sm}px;
`;

const Value = styled.Text`
  color: ${colors.text.primary};
  font-size: ${typography.sizes.md}px;
  font-weight: 700;
`;

const ButtonGroup = styled.View`
  gap: ${spacing.sm}px;
  margin-top: ${spacing.sm}px;
`;

const ErrorText = styled.Text`
  color: ${colors.error};
  font-size: ${typography.sizes.sm}px;
  margin-top: ${spacing.sm}px;
`;

const HelperText = styled.Text`
  color: ${colors.text.muted};
  font-size: ${typography.sizes.sm}px;
  margin-top: ${spacing.sm}px;
  line-height: 18px;
`;

export default function ProfileTabScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, updateProfile } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setCompany(user?.company ?? "");
  }, [user]);

  const handleSaveProfile = async () => {
    setProfileError("");
    setProfileMessage("");

    if (!name.trim()) {
      setProfileError("Name is required.");
      return;
    }

    try {
      setSavingProfile(true);
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        company: user?.role === "operator" ? company.trim() || undefined : undefined,
      });
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Unable to update profile.",
      );
    } finally {
      setSavingProfile(false);
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

  if (!isAuthenticated || !user) {
    return (
      <Container>
        <Content>
          <Title>Welcome</Title>
          <Subtitle>
            Sign in or create an account to manage your profile and requests.
          </Subtitle>
          <ButtonGroup>
            <PrimaryButton
              text="Sign In"
              onPress={() => router.push("/(tabs)/profile/signin")}
            />
            <PrimaryButton
              text="Create Account"
              onPress={() => router.push("/(tabs)/profile/signup")}
            />
          </ButtonGroup>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Content>
        <HeaderCard>
          <Title>Profile</Title>
          <Subtitle>
            Manage your account information, request a missing vehicle, or view
            the status of requests you already made.
          </Subtitle>

          <Label>Name</Label>
          <Value>{user.name}</Value>
          <Label>Email</Label>
          <Value>{user.email}</Value>
          <Label>Role</Label>
          <Value>{user.role}</Value>
        </HeaderCard>

        <FormSection title="Edit Information">
          <FormInput
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
          />
          <FormInput
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="Your phone number"
            keyboardType="phone-pad"
          />
          {user.role === "operator" ? (
            <FormInput
              label="Company"
              value={company}
              onChangeText={setCompany}
              placeholder="Company name"
            />
          ) : null}

          {profileError ? <ErrorText>{profileError}</ErrorText> : null}
          {profileMessage ? <HelperText>{profileMessage}</HelperText> : null}

          <PrimaryButton
            text={savingProfile ? "Saving..." : "Save Changes"}
            onPress={() => void handleSaveProfile()}
            loading={savingProfile}
            disabled={savingProfile}
          />
        </FormSection>

        <FormSection title="Vehicle Requests">
          <HelperText>
            Request a vehicle if it is not available in the catalog, or review
            the requests you submitted earlier.
          </HelperText>
          <ButtonGroup>
            <PrimaryButton
              text="Request a Vehicle"
              onPress={() => router.push("/(tabs)/profile/request")}
            />
            <PrimaryButton
              text="View Request Status"
              onPress={() => router.push("/(tabs)/profile/requests")}
              variant="secondary"
            />
          </ButtonGroup>
        </FormSection>

        <FormSection title="Session">
          <ButtonGroup>
            <PrimaryButton
              text="Sign Out"
              onPress={() => void logout()}
              variant="secondary"
            />
          </ButtonGroup>
        </FormSection>
      </Content>
    </Container>
  );
}
