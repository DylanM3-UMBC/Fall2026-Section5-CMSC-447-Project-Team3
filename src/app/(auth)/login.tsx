import { Platform } from "expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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


    // This a helper function to help generate a json file you asked. This is only for testing purposes only
    const handleGenerateJson = () => {
        if (!email || !password) {
            //Alert.alert("Error", "Please fill in all fields");
            setShowPreview(true);
            setErrorMessage('Please fill in all fields');
            return;
        }

        if (password.length < 8) {
            //Alert.alert("Error", "Password must be at least 8 characters")
            setShowPreview(true);
            setErrorMessage('Password must be at least 8 characters');
            return;
        }

        try {
            // Convert the TypeScript object into a clean, pretty-printed JSON string
            const jsonString = JSON.stringify(dataToExport, null, 2);

            // Check if running on Web (Browser)
            if (Platform.OS === 'web') {
                // Create a temporary Blob containing your JSON data
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
        
                // Create an invisible anchor link and programmatically click it to trigger the download
                const link = document.createElement('a');
                link.href = url;
                link.download = 'User_Login_for_backend_data.json'; // The physical file name generated on your computer
                link.click();
        
                // Clean up memory
                URL.revokeObjectURL(url);
                console.log("JSON file generated and downloaded successfully!");
            } 
            else {
                // If testing on a real phone or emulator, remind to switch to web mode
                Alert.alert("Notice", "To generate a physical file on your computer, run this app in your web browser (Press 'w' in your terminal).");
            }
        } catch (error) {
            console.error("Failed to generate file:", error);
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
                        onChangeText={setPassword} 
                        placeholder="Password..." 
                        placeholderTextColor={"#999"}
                        autoComplete="password"
                        secureTextEntry
                        autoCapitalize="none"
                        style={styles.input}
                    />

                    <TouchableOpacity style={styles.button} onPress={handleGenerateJson} disabled={loading}>
                        <Text style={styles.buttonText}>Sign In</Text>
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