import { API_URL, supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Define the TypeScript interface for User profile for login only
interface UserProfile {
  email: string;
  password: string;
}

export default function loginScreen() {
    const [showPreview, setShowPreview] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState<boolean>(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    
    // This here is how actual data gets passed to be verified
    const dataToExport: UserProfile = {
        email: email,
        password: password
    };


    const handleSignIn = async () => {
        if (loading) return;

        setErrorMessage("");
        setShowPreview(false);

        if (!email.trim() || !password) {
            setErrorMessage("Enter your email and password.");
            setShowPreview(true);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: email.trim(),
                password,
            }),
            });

            const result = await response.json();

            if (!response.ok) {
            throw new Error(result.error || "Sign-in failed.");
            }

            if (
            !result.session?.access_token ||
            !result.session?.refresh_token
            ) {
            throw new Error("The server did not return a session.");
            }

            const { data, error } = await supabase.auth.setSession({
            access_token: result.session.access_token,
            refresh_token: result.session.refresh_token,
            });

            if (error) throw error;
            if (!data.session) throw new Error("Unable to save your session.");

            setPassword("");
            router.replace("/(tabs)");
        } catch (error) {
            setErrorMessage(
            error instanceof Error ? error.message : "Unable to sign in.",
            );
            setShowPreview(true);
        } finally {
            setLoading(false);
        }
    };


    return (
        <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign In to Continue</Text>
                <View style={styles.form}>
                    <TextInput
                        onChangeText={setEmail}
                        placeholder="Email..." 
                        placeholderTextColor={"#999"}
                        keyboardType="email-address"
                        autoComplete="email"
                        autoCapitalize="none"
                        style={styles.input}
                    />
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Password..." 
                        placeholderTextColor={"#999"}
                        autoComplete="password"
                        secureTextEntry
                        autoCapitalize="none"
                        style={styles.input}
                    />

                    <TouchableOpacity style={styles.button} onPress={handleSignIn} disabled={loading}>
                        <Text style={styles.buttonText}> {loading ? "Signing in…" : "Sign In"} </Text>
                    </TouchableOpacity> 

                    <TouchableOpacity style={styles.linkButton} onPress={() => router.push("/(auth)/signup")}>
                        <Text style={styles.linkButtonText}>
                            Don't have an account? <Text style={styles.linkButtonTextBold}>Sign Up</Text>
                        </Text>
                    </TouchableOpacity> 
                </View>
            </View>


            <Modal visible={showPreview} transparent animationType="fade">
                <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Error</Text>
                    <Text style={styles.descriptionInput}> {errorMessage} </Text>
                    <View style={styles.modalButtons}>
                        <TouchableOpacity 
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => {
                            setShowPreview(false);
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
    },
    content: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 32,
        color: "#665",
    },
    form: {
        width: "100%",
    },
    input: {
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#e0e0e0"
    },
    button: {
        backgroundColor: "#000",
        padding: 16,
        borderRadius: 12,
        alignItems: "center"
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: 600,
    },
    linkButton: {
        marginTop: 24,
        alignItems: "center"
    },
    linkButtonText: {
        color: "#665",
        fontSize: 14,
    },
    linkButtonTextBold: {
        fontWeight: 600,
        color: "#000"
    },








    
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#f63c3c",
  },
  descriptionInput: {
    width: "100%",
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    color: "#000",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#ff0000",
  },
  cancelButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
})
