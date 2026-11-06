import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from "react-native";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setAuthReady(true);
      });

    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    // Browsers manage their own refresh lifecycle.
    if (Platform.OS === "web") return;

    const updateAutoRefresh = (state: string) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    updateAutoRefresh(AppState.currentState);
    const listener = AppState.addEventListener("change", updateAutoRefresh);

    return () => {
      listener.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  // Wait for INITIAL_SESSION before deciding which routes are available.
  if (!authReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" accessibilityLabel="Restoring session" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="(tabs)" options={{ orientation: "landscape" }} />
      </Stack.Protected>
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="(auth)" options={{ orientation: "portrait" }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
