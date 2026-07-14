import * as ReactNative from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

/**
 * Get the API base URL.
 *
 * In production, the web build and the API are served from the same
 * Railway service, so the current origin is correct. In local dev,
 * `pnpm dev` runs Metro on 8081 and the API server separately on 3000
 * (see server/_core/index.ts), so requests from the Metro-served page
 * need to be pointed at port 3000 explicitly.
 */
export function getApiBaseUrl(): string {
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    if (__DEV__) {
      return `${window.location.protocol}//${window.location.hostname}:3000`;
    }
    return `${window.location.protocol}//${window.location.host}`;
  }

  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "unidia-user-info";
