import * as ReactNative from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

/**
 * Get the API base URL. On web this defaults to the current origin (the
 * app and API are served from the same Railway service), so it's only
 * needed on native where the app and API run on different hosts.
 */
export function getApiBaseUrl(): string {
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    return `${window.location.protocol}//${window.location.host}`;
  }

  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "unidia-user-info";
