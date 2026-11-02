import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);

  const name = [user?.user_metadata.first_name, user?.user_metadata.last_name]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ") || user?.email || "Your account";

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setError("");
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      // The root layout automatically returns to the auth screens.
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile menu"
        accessibilityState={{ expanded: open }}
        style={styles.iconButton}
        onPress={() => { setError(""); setOpen(true); }}
      >
        <Ionicons name="person-circle-outline" size={32} color="#fdb515" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Close profile menu"
            onPress={() => setOpen(false)}
          />
          <View style={[styles.menu, { marginTop: insets.top + 64 }]} accessibilityViewIsModal>
            <View style={styles.menuHeader}>
              <Text style={styles.heading}>Profile</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close profile menu" onPress={() => setOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#333" />
              </Pressable>
            </View>
            <Text style={styles.name}>{name}</Text>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: signingOut, busy: signingOut }}
              disabled={signingOut}
              onPress={signOut}
              style={[styles.signOut, signingOut && { opacity: 0.6 }]}
            >
              <Ionicons name="log-out-outline" size={20} color="#a32121" />
              <Text style={styles.signOutText}>{signingOut ? "Signing out…" : "Sign out"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  overlay: { flex: 1, alignItems: "flex-end", backgroundColor: "rgba(0,0,0,0.2)" },
  menu: { width: 280, maxWidth: "90%", marginRight: 16, padding: 20, backgroundColor: "white", borderRadius: 12, elevation: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.18)" },
  menuHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { fontSize: 14, color: "#666" },
  closeButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 18, fontWeight: "600", color: "#222", marginBottom: 24 },
  error: { color: "#a32121", marginBottom: 12 },
  signOut: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 16, minHeight: 44 },
  signOutText: { color: "#a32121", fontSize: 16, fontWeight: "600" },
});
