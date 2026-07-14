import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/quote-ui";
import { useColors } from "@/hooks/use-colors";

type DialogButton = {
  label: string;
  tone?: "primary" | "dark" | "light";
  onPress: () => void;
};

type DialogState = {
  title: string;
  message?: string;
  buttons: DialogButton[];
} | null;

let showDialogImpl: ((state: DialogState) => void) | null = null;

/** Mount once near the app root so notify()/confirm() have somewhere to render. */
export function DialogHost() {
  const colors = useColors();
  const [dialog, setDialog] = useState<DialogState>(null);

  useEffect(() => {
    showDialogImpl = setDialog;
    return () => {
      showDialogImpl = null;
    };
  }, []);

  if (!dialog) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => setDialog(null)}>
      <Pressable style={styles.backdrop} onPress={() => setDialog(null)}>
        <Pressable style={[styles.card, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: colors.text }]}>{dialog.title}</Text>
          {dialog.message ? <Text style={[styles.message, { color: colors.muted }]}>{dialog.message}</Text> : null}
          <View style={styles.buttonColumn}>
            {dialog.buttons.map((button, index) => (
              <PrimaryButton
                key={index}
                label={button.label}
                tone={button.tone ?? "primary"}
                onPress={() => {
                  setDialog(null);
                  button.onPress();
                }}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Single-button info/error message, styled to match the app instead of a raw browser alert(). */
export function notify(title: string, message?: string): Promise<void> {
  return new Promise((resolve) => {
    showDialogImpl?.({
      title,
      message,
      buttons: [{ label: "확인", tone: "dark", onPress: () => resolve() }],
    });
  });
}

/** Two-way confirm (cancel vs. confirm). Resolves true if the user confirmed. */
export function confirm(title: string, message: string | undefined, confirmLabel = "확인"): Promise<boolean> {
  return new Promise((resolve) => {
    showDialogImpl?.({
      title,
      message,
      buttons: [
        { label: "취소", tone: "light", onPress: () => resolve(false) },
        { label: confirmLabel, tone: "dark", onPress: () => resolve(true) },
      ],
    });
  });
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(16, 35, 61, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 22,
    gap: 14,
  },
  title: { fontSize: 17, lineHeight: 23, fontWeight: "900" },
  message: { fontSize: 14, lineHeight: 21 },
  buttonColumn: { gap: 10, marginTop: 4 },
});
