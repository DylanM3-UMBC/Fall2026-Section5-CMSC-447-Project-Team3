import { supabase, MAX_FILE_SIZE } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/api";
import type { DocumentPickerAsset } from "expo-document-picker";
import type { User } from "@supabase/supabase-js";
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from "expo-image-picker";
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, ImageStyle, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, useWindowDimensions, View, ViewStyle } from 'react-native';
import { EmptyPlaceholder, FileCard, UploadedFile } from '../../../components/pdfprojectItemComponent';
import ProfileMenu from '../../../components/ProfileMenu';

interface Project {
  project_name: string;
  pdf_url: string;
}

function toFileCard(project: Project): UploadedFile {
  return {
    id: project.pdf_url,
    name: project.project_name,
    uri: project.pdf_url,
    uploadedAt: "",
  };
}


interface DashboardStyles {
  screenContainer: ViewStyle;
  stickyHeaderWrapper: ViewStyle;
  topNavbar: ViewStyle;
  innerNavbar: ViewStyle;
  navLogo: ImageStyle;
  mainScroll: ViewStyle;
  scrollContent: ViewStyle;
  centerLayoutWrapper: ViewStyle;
  heroSection: ViewStyle;
  profileName: TextStyle;
  gridRow: ViewStyle;
  leftProjectColumn: ViewStyle;
  rightGroupsColumn: ViewStyle;
  sidebarContainer: ViewStyle;
  sectionTitleProjects: TextStyle
  sectionTitle: TextStyle;
  groupCardItem: ViewStyle;
  TaskSummaryButton: ViewStyle
  TaskSummaryText: TextStyle
  groupCardText: TextStyle;
  profileBannerImage: ImageStyle
  scrollBoxWrapper: ViewStyle
  tabBar: ViewStyle
  tabButton: ViewStyle
  activeTabButton: ViewStyle
  tabText: TextStyle
  activeTabText: TextStyle
  placeholderText_Project: TextStyle
  createProjectButton: ViewStyle;
  createProjectText: TextStyle;

  imageContainer: ViewStyle;
  profileImage: ImageStyle;      // Uses ImageStyle because it targets the actual user photo
  placeholderImage: ViewStyle;    // Uses ViewStyle because it acts as the dashed container box
  placeholderText: TextStyle;
  editBadge: ViewStyle;
  editText: TextStyle;

}

const SIDEBAR_DATA = [
  { title: 'UMBC Campus', icon: '🎓' },
  { title: 'Security', icon: '🛡️' },
  { title: 'Alerts', icon: '📢' },
  { title: 'Events', icon: '📅' },
];

export default function Index() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);

  const name = [user?.user_metadata.first_name, user?.user_metadata.last_name]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ") || user?.email || "Your account";

  const [activeTab, setActiveTab] = useState('Your Projects');
  const router = useRouter();
  // 1. All hook dependencies execute unconditionally at the top level
  const { width } = useWindowDimensions(); 
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);


  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // 2. Generate styles safely
  const styles = createStyles(width);
  
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [pdf, setPdf] = useState<DocumentPickerAsset | null>(null);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  const resetForm = () => {
    setPdf(null);
    setProjectName("");
    setDescription("");
    setFormError("");
  };

  const closeCreate = () => {
    if (uploading) return;
    setShowCreate(false);
    resetForm();
  };

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const selected = result.assets[0];
      if (selected.size && selected.size > MAX_FILE_SIZE) {
        setFormError("PDF must be 10 MB or smaller.");
        return;
      }
      setPdf(selected);
      setProjectName(selected.name);
      setFormError("");
    } catch {
      setFormError("Could not open the file picker. Please try again.");
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch("/projects");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load projects.");
      setFiles(data.projects.map(toFileCard));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const createProject = async () => {
    if (uploading || loading) return;
    setFormError("");
    if (!pdf || !projectName.trim()) {
      setFormError("Floor Plan PDF and Project Name are required.");
      return;
    }
    const file = pdf;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("project_name", projectName.trim());
      form.append("project_desc", description.trim());
      if (Platform.OS === "web") {
        if (!file.file) throw new Error("Could not read the selected PDF. Please select it again.");
        form.append("pdf", file.file, file.name);
      } else {
        // React Native accepts a file URI object for multipart uploads.
        form.append("pdf", {
          uri: file.uri,
          name: file.name,
          type: "application/pdf",
        } as unknown as Blob);
      }

      const response = await authenticatedFetch("/projects", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create project.");
      setFiles((previous) => [toFileCard(data.project), ...previous]);
      setActiveTab("Your Projects");
      setShowCreate(false);
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not upload PDF.");
    } finally {
      setUploading(false);
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
  const showImagePicker = async () => {
    if (Platform.OS === 'web') {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*', // Limit selection to images only
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
       setProfileImage(result.assets[0].uri);
      }
      return;
    }
    if (Platform.OS === 'android' || Platform.OS === "ios"){
      Alert.alert("Select Profile Image", "Choose an option",[
        {text: "Camera", onPress: takePhoto },
        {text: "Photo Library", onPress: pickImage},
        {text: "Cancel", style: "cancel"}
      ]);
    }
  }

  return (
    <View style={styles.screenContainer}>
      {!hasHydrated ? (
        // Render a basic layout shell matching the server tree size
        <View style={{ flex: 1, backgroundColor: '#fff' }} />
      ) : (
        <>
          {/* 1. STICKY MOUNT LAYER: Keeps header pinned at the top naturally */}
          <View style={styles.stickyHeaderWrapper}>
            <View style={styles.topNavbar}>
              <View style={styles.innerNavbar}>
                <Image 
                  source={require("../../../assets/images/myumbclogo.png")} 
                  style={styles.navLogo} 
                />
                <View style={{ marginLeft: 'auto' }}>
                  <ProfileMenu />
                </View>
              </View>

            </View>
          </View>

          {/* 2. MAIN SCROLL CONTAINER */}
          <ScrollView 
            style={styles.mainScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
          >
            <View style={styles.centerLayoutWrapper}>
              
              {/* UPPER ZONE: Events & Dates */}
              <View style={styles.heroSection}>
                <Image source={require("../../../assets/images/umbc_day_sign.png")} style={styles.profileBannerImage}/>

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

                <Text style={styles.profileName}>{name}</Text>
              </View>

              {/* LOWER ZONE: 2-Column Side-by-Side Content Grid */}
              <View style={styles.gridRow}>
                
                {/* LOWER LEFT: Project Feed Section */}
                <View style={styles.leftProjectColumn}>

                  <Text style={styles.sectionTitleProjects}>Projects</Text>


                  <TouchableOpacity
                    style={styles.createProjectButton}
                    disabled={loading || uploading}
                    onPress={() => { resetForm(); setShowCreate(true); }}
                  >
                    <Text style={styles.createProjectText}>Create Project +</Text>
                  </TouchableOpacity>
                  {error ? (
                    <View>
                      <Text accessibilityRole="alert" style={{ color: "#a32121" }}>{error}</Text>
                      <TouchableOpacity disabled={loading || uploading} onPress={loadProjects}>
                        <Text>Reload projects</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  
                  <View style={styles.tabBar}>
                    <TouchableOpacity 
                      onPress={() => setActiveTab('Your Projects')}
                      style={[styles.tabButton, activeTab === 'Your Projects' && styles.activeTabButton]}
                    >
                      <Text style={[styles.tabText, activeTab === 'Your Projects' && styles.activeTabText]}>
                        Your Projects
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => setActiveTab('Shared Projects')}
                      style={[styles.tabButton, activeTab === 'Shared Projects' && styles.activeTabButton]}
                    >
                      <Text style={[styles.tabText, activeTab === 'Shared Projects' && styles.activeTabText]}>
                        Shared Projects
                      </Text>
                    </TouchableOpacity>
                  </View>


                  {activeTab === 'Your Projects' ? (
                    <FlatList
                      data={files}
                      keyExtractor={(item) => item.id}
                      ListEmptyComponent={loading ? <Text>Loading projects…</Text> : error ? null : <EmptyPlaceholder />}
                      renderItem={({ item }) => <FileCard item={item} />}
                      nestedScrollEnabled={true} 
                      scrollEnabled={false}
                      showsVerticalScrollIndicator={true}
                      
                    />
                  ) : (
                    /* Render your shared projects list view here */
                    <Text style={styles.placeholderText_Project}>No Shared Projects...</Text>
                  )}  
                </View>

                

                {/* LOWER RIGHT: Sidebar Layout */}
                <View style={styles.rightGroupsColumn}>
                  
                  {/* FIRST MODULE: Upper Task Summary Groups */}
                  <View style={styles.sidebarContainer}>
                    <Text style={styles.sectionTitle}>Task Summary Reports</Text>
                    <TouchableOpacity style={styles.TaskSummaryButton} onPress={() => router.push("/my_task_summary")}>
                        <Text style={styles.TaskSummaryText}>0 Reports</Text>
                    </TouchableOpacity>
                    
                  </View>

                  {/* SECOND MODULE: Comments Groups underneath */}
                  <View style={styles.sidebarContainer}>
                    <Text style={styles.sectionTitle}>Comments</Text>
                    
                    <View style={styles.scrollBoxWrapper}>
                      {/* Clean, error-free alternative to FlatList that uses your exact dynamic properties */}
                      <ScrollView 
                        nestedScrollEnabled={true} 
                        showsVerticalScrollIndicator={true}
                      >
                        {SIDEBAR_DATA.map((singleItem, index) => (
                          <View key={index}>
                            {/* This acts exactly like your renderItem body, passing down your item object parameter natively */}
                            <View style={styles.groupCardItem}>
                              <Text style={styles.groupCardText}>
                                {singleItem.icon}  {singleItem.title}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </View>

                </View>

              </View>
            </View>
          </ScrollView>
        </>
      )}
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={closeCreate}>
        <View style={formStyles.modalBackdrop}>
          <View style={formStyles.createModal} accessibilityViewIsModal>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={formStyles.formContent}>
              <Text style={formStyles.formTitle}>Create Project</Text>
              <Text style={formStyles.fieldLabel}>Floor Plan PDF *</Text>
              <TouchableOpacity accessibilityRole="button" disabled={uploading} onPress={pickPdf} style={formStyles.pdfPicker}>
                <Text>{pdf ? pdf.name : "Choose PDF"}</Text>
              </TouchableOpacity>
              <Text style={formStyles.fieldHint}>PDF only, up to 10 MB. Click to choose or replace.</Text>

              <Text style={formStyles.fieldLabel}>Project Name *</Text>
              <TextInput accessibilityLabel="Project Name, required" style={formStyles.formInput} value={projectName} onChangeText={setProjectName} editable={!uploading} placeholder="Enter project name" />

              <Text style={formStyles.fieldLabel}>Project Description</Text>
              <TextInput accessibilityLabel="Project Description" style={[formStyles.formInput, formStyles.descriptionInput]} value={description} onChangeText={setDescription} editable={!uploading} placeholder="Describe the project (optional)" multiline textAlignVertical="top" />
              {formError ? <Text accessibilityRole="alert" style={formStyles.formError}>{formError}</Text> : null}

              <View style={formStyles.formActions}>
                <TouchableOpacity accessibilityRole="button" disabled={uploading} onPress={closeCreate} style={[formStyles.formButton, uploading && formStyles.disabledButton]}>
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" disabled={uploading || !pdf || !projectName.trim()} onPress={createProject} style={[formStyles.formButton, formStyles.submitButton, (uploading || !pdf || !projectName.trim()) && formStyles.disabledButton]}>
                  <Text style={{ fontWeight: "600" }}>{uploading ? "Creating…" : "Submit"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (width: number): DashboardStyles => {
  const isWebWide = width > 1200;
  const contentWidth = isWebWide ? 1160 : width * 0.95;

  return StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: '#fff',
    },
    stickyHeaderWrapper: {
      position: 'absolute',
      top: 0,
      zIndex: 100,
      width: '100%',
    },
    topNavbar: {
      width: '100%',
      height: 56,
      backgroundColor: '#000',
      borderBottomWidth: 4,
      borderBottomColor: '#F8B125', 
      justifyContent: 'center',
      alignItems: 'center',
    },
    innerNavbar: {
      width: contentWidth,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
    },
    scrollBoxWrapper: {
      height: 210, 
      width: '100%',
      backgroundColor: '#fff',
      borderRadius: 8,
    },
    navLogo: {
      width: 150,
      height: 50,
      resizeMode: 'contain',
    },
    mainScroll: {
      flex: 1,
    },
    scrollContent: {
      alignItems: 'center',
      paddingBottom: 60,
    },
    centerLayoutWrapper: {
      width: contentWidth,
      paddingTop: 24, 
      borderWidth: 0,
    },
    heroSection: {
      width: '100%',
      bottom: 30,
      marginBottom: 12,
      paddingHorizontal: 15,
      borderWidth: 0,
    },
    profileBannerImage: {
      width: "100%",
      resizeMode: 'cover',
    },


    profileName: {
      fontSize: 30,
      fontWeight: 'bold',
      color: '#000', 
      marginBottom: 0,
      marginLeft: 140,
    },
    gridRow: {
      width: '100%',
      flexDirection: 'row', 
      paddingHorizontal: 15,
    },
    leftProjectColumn: {
      flex: 7.2, 
      paddingRight: 24,
      borderWidth: 0,
    },
    rightGroupsColumn: {
      flex: 2.8, 
      flexDirection: 'column', // Stacks the modules vertically below each other
    },
    sidebarContainer: {
      width: '100%',
      marginBottom: 32, // Spacing gap separating the top widget block from the bottom widget block
    },

    sectionTitleProjects: {
      fontSize: 30,
      top: -12.2,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
      paddingBottom: 8,
    },
    
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
      paddingBottom: 8,
    },

    TaskSummaryButton: {
      alignSelf: 'center',       
    },
    TaskSummaryText: {
      fontSize: 14,
      color: '#ff0000',
      fontWeight: '500',
      
    },

    groupCardItem: {
      width: '100%',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: '#F9F9F9',
      borderRadius: 6,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: "#000", //'#EAEAEA'
    },
    groupCardText: {
      fontSize: 14,
      color: '#444',
      fontWeight: '500',
    },


    // Start of Tab bar For Project Container
    tabBar: {
      position: "absolute",
      top: "0%",
      left: "25%",

      flexDirection: 'row',
      marginBottom: 16,
      gap: 24,
    },
    tabButton: {
      paddingBottom: 8,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent', // Invisible line when inactive
    },
    activeTabButton: {
      borderBottomColor: '#fdb515', // Solid black line indicator when active
    },
    tabText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#9e9e9e', // Faded gray for inactive text
    },
    activeTabText: {
      color: '#000000', // Bold black text for active state
    },
    placeholderText_Project: {
      flex: 1,
      margin: "26%",
      alignItems: 'center',
      justifyContent: "center",
      textAlign: 'center',
      marginTop: "28%",
      color: '#333',
      fontSize: 14,
    },

    textLinkSpacing: {
      // Only apply layout margins to separate items, avoid adding padding!
      marginBottom: 12, 
      // This forces the touch boundary box to collapse tightly around the font glyphs
      alignSelf: 'flex-start', 
    },

    createProjectButton: {
      // Zero internal padding ensures only the explicit text area responds to clicks
      alignSelf: 'flex-end', 
      padding: 8,
      paddingHorizontal: 20,
      paddingVertical: 6,
      marginBottom: 2,
      marginTop: -10,
      borderRadius: 6,
      borderColor: "#10B981",
      borderWidth: 3,           
    },
    createProjectText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#10B981',             
    },


    imageContainer: {
      marginBottom: 32,
      position: "absolute",
      bottom: -30,
      left: 10,
      zIndex: 10,
    },
    profileImage: {
      right: 0,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: "#f5f5f5",
    },
    placeholderImage: {
      right: 0,
      width: 120,
      height: 120,
      backgroundColor: "#f5f5f5",
      borderRadius: 60,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      borderWidth: 2,
      borderColor: "#e0e0e0",
      borderStyle: "solid"
    },
    placeholderText: {
      fontSize: 48,
      color: "#999",
    },
    editBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
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
  });
};

const formStyles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
  createModal: { width: 520, maxWidth: "100%", maxHeight: "90%", borderRadius: 12, backgroundColor: "#fff" },
  formContent: { padding: 24 },
  formTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  fieldLabel: { fontSize: 15, fontWeight: "600", marginBottom: 8, marginTop: 12 },
  pdfPicker: { padding: 14, borderWidth: 1, borderColor: "#aaa", borderStyle: "dashed", borderRadius: 6 },
  fieldHint: { color: "#666", fontSize: 12, marginTop: 6 },
  formInput: { borderWidth: 1, borderColor: "#aaa", borderRadius: 6, padding: 12, fontSize: 16, color: "#222" },
  descriptionInput: { minHeight: 110 },
  formError: { color: "#a32121", marginTop: 12 },
  formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 24 },
  formButton: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 6, backgroundColor: "#eee" },
  submitButton: { backgroundColor: "#fdb515" },
  disabledButton: { opacity: 0.5 },
});
