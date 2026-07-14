import { Alert, Platform } from "react-native";

/** Single-button info/error message. react-native-web's Alert.alert is a no-op, so route to window.alert there. */
export function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** Two-way confirm (cancel vs. confirm). Resolves true if the user confirmed. */
export function confirm(title: string, message: string | undefined, confirmLabel = "확인"): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "취소", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
