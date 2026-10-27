import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";



// Define the TypeScript interface for User profile for login only
interface UserProfile {
    email: string;
    password: string;
    name: string;
    username: string;
    profileimage: string | null;
}



export default function onBoardingScreen() {
    const [showPreview, setShowPreview] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const { email } = useLocalSearchParams() as {email: string}; 
    const { password } = useLocalSearchParams() as {password: string};
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [profileImage, setProfileImage] = useState<string | null>(null);



    // This here is how actual data gets passed to be verified
    const dataToExport: UserProfile = {
        email: email,
        password: password,
        name: name,
        username: username,
        profileimage: profileImage
    };


    // This a helper function to help generate a json file you asked. This is only for testing purposes only
    const handleGenerateJson = () => {
        if (!name || !username) {
            //Alert.alert("Error", "Please fill in all fields to complete setup");
            setShowPreview(true);
            setErrorMessage('Please fill in all fields to complete setup');
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
                link.download = 'Created_User_Profile_for_backend_data.json'; // The physical file name generated on your computer
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




    const pickImage = async () => {
        const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== "granted") {
            Alert.alert("Permission needed", "We need camera roll permissions to select a profile image.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1,1],
            quality: 0.8,
        })
        if (!result.canceled && result.assets[0]) {
            setProfileImage(result.assets[0].uri);
        }
    }
    const takePhoto = async () => {
        const {status} = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== "granted") {
            Alert.alert("Permission needed", "We need camera permissions to take a photo.");
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1,1],
            quality: 0.8,
        })
        if (!result.canceled && result.assets[0]) {
            setProfileImage(result.assets[0].uri);
        }
    }
    const showImagePicker = () => {
        Alert.alert("Select Profile Image", "Choose an option",[
            {text: "Camera", onPress: takePhoto },
            {text: "Photo Library", onPress: pickImage},
            {text: "Cancel", style: "cancel"}
        ]);
    }
    const handleComplete = () => {}

    return (
        <SafeAreaView edges={["top", "bottom", "right", "left"]} style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Complete Your Profile</Text>
                    <Text style={styles.subtitle}>Add your information to get started</Text>
                </View>

                <View style={styles.form}>
                    <TouchableOpacity style={styles.imageContainer} onPress={showImagePicker}>
                        {profileImage ? (<Image source={{uri: profileImage}} style={styles.profileImage} />) : ( 
                            <View style={styles.placeholderImage}>
                                <Text style={styles.placeholderText}>+</Text>
                            </View>
                        )} 
                       
                        <View style={styles.editBadge}>
                            <Text style={styles.editText}>Edit</Text>
                        </View>
                    </TouchableOpacity>

                    <TextInput 
                        style={styles.input}
                        placeholder="Full Name" 
                        placeholderTextColor={"#999"}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        
                    />
                    <TextInput 
                        style={styles.input}
                        placeholder="Username" 
                        placeholderTextColor={"#999"}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoComplete="username"
                    />

                    <TouchableOpacity style={styles.button} onPress={handleGenerateJson}>
                        <Text style={styles.buttonText}>Complete Setup</Text>
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
        justifyContent: "center",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
    },
    header: {
        position: "relative",
        marginBottom: 100,
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
        alignItems: "center",
        justifyContent: "center"
    },
    form: {
        position: "relative",
        marginBottom: 200
    },
    imageContainer: {
        marginBottom: 32,
        position: "relative",
    },
    profileImage: {
        right: -95,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#f5f5f5",
    },
    placeholderImage: {
        right: -95,
        width: 120,
        height: 120,
        backgroundColor: "#f5f5f5",
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        borderWidth: 2,
        borderColor: "#e0e0e0",
        borderStyle: "dashed"
    },
    placeholderText: {
        fontSize: 48,
        color: "#999",
    },
    editBadge: {
        position: "absolute",
        bottom: 0,
        right: 110,
        backgroundColor: "#000",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    editText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    input: {
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 16,
        width: "100%",
        borderWidth: 1,
        borderColor: "#e0e0e0",
    },
    button: {
        backgroundColor: "#000",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        width: "100%",
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
        color: "#000",
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