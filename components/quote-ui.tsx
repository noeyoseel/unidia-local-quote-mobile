import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps, ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";

import { useColors } from "@/hooks/use-colors";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      {eyebrow ? <Text style={[styles.eyebrow, { color: colors.tint }]}>{eyebrow}</Text> : null}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  tone = "primary",
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  tone?: "primary" | "dark" | "light";
}) {
  const colors = useColors();
  const backgroundColor = tone === "dark" ? "#10233D" : tone === "light" ? colors.surface : colors.tint;
  const color = tone === "light" ? colors.text : "#FFFFFF";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor, borderColor: tone === "light" ? colors.border : backgroundColor },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon ? <MaterialIcons name={icon} size={20} color={color} /> : null}
      <Text style={[styles.primaryButtonLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function SelectChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? colors.tint : colors.border,
          backgroundColor: selected ? "#EAF0FF" : colors.surface,
        },
        pressed && styles.pressed,
      ]}
    >
      {selected ? <MaterialIcons name="check-circle" size={17} color={colors.tint} /> : null}
      <Text style={[styles.chipLabel, { color: selected ? colors.tint : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  suffix,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <View style={[styles.field, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          returnKeyType="done"
          style={[styles.input, { color: colors.text }]}
        />
        {suffix ? <Text style={[styles.suffix, { color: colors.muted }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function StatusPill({ label, completed = false }: { label: string; completed?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.statusPill, { backgroundColor: completed ? "#E6F8F3" : "#FFF4E4" }]}>
      <View style={[styles.statusDot, { backgroundColor: completed ? colors.success : colors.warning }]} />
      <Text style={{ color: completed ? colors.success : colors.warning, fontSize: 12, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  eyebrow: { fontSize: 12, lineHeight: 17, fontWeight: "800", letterSpacing: 0.7 },
  title: { fontSize: 28, lineHeight: 35, fontWeight: "800", letterSpacing: -0.6 },
  description: { fontSize: 14, lineHeight: 21 },
  card: { borderWidth: 1, borderRadius: 18, padding: 18 },
  primaryButton: {
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonLabel: { fontSize: 16, lineHeight: 22, fontWeight: "800" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
  chip: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  chipLabel: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  fieldWrap: { gap: 7 },
  fieldLabel: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  field: { minHeight: 50, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center" },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, lineHeight: 22 },
  suffix: { paddingRight: 14, fontSize: 14, fontWeight: "600" },
  statusPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
});
