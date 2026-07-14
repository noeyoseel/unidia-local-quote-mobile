import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Card, PageHeader, PrimaryButton } from "@/components/quote-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { trpc } from "@/lib/trpc";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setError(undefined);
    setIsSubmitting(true);
    try {
      const { sessionToken, user } = await Api.login(email.trim(), password);
      await Auth.setSessionToken(sessionToken);
      await Auth.setUserInfo({
        id: user.id,
        openId: user.openId,
        name: user.name,
        email: user.email,
        loginMethod: user.loginMethod,
        lastSignedIn: new Date(user.lastSignedIn ?? Date.now()),
      });
      // The tab layout's auth.me query was cached as "not logged in" before
      // this login happened — invalidate it so it refetches instead of
      // bouncing straight back to /login on stale cached data.
      await utils.auth.me.invalidate();
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <PageHeader
            eyebrow="UNIDIA"
            title="로그인"
            description="승인된 계정으로만 접속할 수 있습니다."
          />
          <Card style={styles.formCard}>
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>이메일</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />
            </View>
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>비밀번호</Text>
              <View style={[styles.passwordRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="비밀번호"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showPassword}
                  style={[styles.passwordInput, { color: colors.text }]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={8}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
            </View>
            {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
            <PrimaryButton
              label={isSubmitting ? "로그인 중…" : "로그인"}
              onPress={submit}
              disabled={isSubmitting}
            />
            {isSubmitting ? <ActivityIndicator color={colors.tint} /> : null}
          </Card>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 18, gap: 14 },
  formCard: { gap: 14 },
  fieldWrap: { gap: 7 },
  fieldLabel: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  passwordRow: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  passwordInput: { flex: 1, fontSize: 16, paddingVertical: 12 },
  error: { fontSize: 13, lineHeight: 19, fontWeight: "700" },
});
