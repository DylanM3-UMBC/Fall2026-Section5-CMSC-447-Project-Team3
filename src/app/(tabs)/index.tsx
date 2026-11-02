import { useEffect, useState } from "react";
import { FlatList, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import type { DocumentPickerAsset } from "expo-document-picker";
import { authenticatedFetch } from "@/lib/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyPlaceholder, FileCard, UploadedFile } from '../../../components/pdfprojectItemComponent';
import ProfileMenu from '../../../components/ProfileMenu';
import { MAX_FILE_SIZE } from "@/lib/supabase";

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


export default function Index() { 
  /* 
  Keeps track of which tab is active ('Your Projects' or 'Shared Projects') and updates the UI accordingly. 
  This state is used to conditionally render the content of each tab.
  */ 
  const [activeTab, setActiveTab] = useState('Your Projects');
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
 
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}> 
        <Image 
          source={require("../../../assets/images/myumbclogo.png")} 
          style={styles.image} 
        />
        <Text style={styles.title} numberOfLines={2}>UMBC Architectural/Engineering "Punch List" Project Dashboard</Text>
        <ProfileMenu />
      </View>
      
      <View style={styles.SideBarBox}>
        <View style={styles.TaskContainer}>
          <Text style={styles.BoxTitle}>Task Summary Reports</Text>
          <Text style={styles.placeholderText}>No Reports Generated</Text>
        </View>
        <View style={styles.CommentContainer}>
          <Text style={styles.BoxTitle}>Comments</Text>
          <Text style={styles.placeholderText}>Inbox Empty</Text>
        </View>
      </View>

   
      
      
      <View style={styles.ProjectContainer}>
        <Text style={styles.ProjectTitle}>Projects</Text>

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

          <View style={styles.CreateProjectButton}>
            <TouchableOpacity disabled={uploading || loading} onPress={() => { resetForm(); setShowCreate(true); }} style={styles.CreateProjectlinkButton}>
              <Text style={styles.CreateProjectText}>Create Project</Text>
            </TouchableOpacity>
          </View>
        {error ? (
          <View>
            <Text accessibilityRole="alert" style={{ color: "#a32121" }}>{error}</Text>
            <TouchableOpacity disabled={loading || uploading} onPress={loadProjects}>
              <Text>Reload projects</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        
        {activeTab === 'Your Projects' ? (
          /* Render your projects list view here */
          <FlatList
            data={files}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={loading ? <Text>Loading projects…</Text> : error ? null : <EmptyPlaceholder />}
            renderItem={({ item }) => <FileCard item={item} />}
          />  
        ) : (
          /* Render your shared projects list view here */
          <Text style={styles.placeholderText}>No Shared Projects...</Text>
        )}  
      </View>
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={closeCreate}>
        <View style={styles.modalBackdrop}>
          <View style={styles.createModal} accessibilityViewIsModal>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
              <Text style={styles.formTitle}>Create Project</Text>
              <Text style={styles.fieldLabel}>Floor Plan PDF *</Text>
              <TouchableOpacity accessibilityRole="button" disabled={uploading} onPress={pickPdf} style={styles.pdfPicker}>
                <Text>{pdf ? pdf.name : "Choose PDF"}</Text>
              </TouchableOpacity>
              <Text style={styles.fieldHint}>PDF only, up to 10 MB. Click to choose or replace.</Text>

              <Text style={styles.fieldLabel}>Project Name *</Text>
              <TextInput accessibilityLabel="Project Name, required" style={styles.formInput} value={projectName} onChangeText={setProjectName} editable={!uploading} placeholder="Enter project name" />

              <Text style={styles.fieldLabel}>Project Description</Text>
              <TextInput accessibilityLabel="Project Description" style={[styles.formInput, styles.descriptionInput]} value={description} onChangeText={setDescription} editable={!uploading} placeholder="Describe the project (optional)" multiline textAlignVertical="top" />
              {formError ? <Text accessibilityRole="alert" style={styles.formError}>{formError}</Text> : null}

              <View style={styles.formActions}>
                <TouchableOpacity accessibilityRole="button" disabled={uploading} onPress={closeCreate} style={[styles.formButton, uploading && styles.disabledButton]}>
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" disabled={uploading || !pdf || !projectName.trim()} onPress={createProject} style={[styles.formButton, styles.submitButton, (uploading || !pdf || !projectName.trim()) && styles.disabledButton]}>
                  <Text style={{ fontWeight: "600" }}>{uploading ? "Creating…" : "Submit"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}











const styles = StyleSheet.create({
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
  container: {
    flex: 1,
    flexWrap: "wrap",
    flexDirection: "row",
    width: "100%",
    height: "100%",
    backgroundColor: "#f8f9fa",
  },
  image: {
    width: 150,
    maxWidth: "25%",
    height: "100%",
    resizeMode: 'center',
  },
  header: {
    flex: 0,
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'center',
    justifyContent: "center",
   
    position: "absolute",
    top: "0%",
    width: "100%",
    height: "8%",

    backgroundColor: "#020202",
    borderColor: "#fdb515",
    borderStyle: "solid",
    borderBottomWidth: 4,
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: "#fbfbf8",
    fontSize: 24,
    fontWeight: "bold",
  },
  banner: {
    position: "absolute",
    top: 63,
    
    width: "100%",
    height: "10.8%",
  },
  // End Of Header




  BoxTitle: {
    position: "absolute",
    top: "5%",
    left: "5%",
    marginBottom: 20,
    color: "#000",
    fontSize: 22,
    fontWeight: "bold",
  }, 
  SideBarBox: {
    position: "absolute",
    right: "5%",
    top: "20%",
    
    width: "24%",
    height: "75%",
    //backgroundColor: "#b62626",

    alignItems: "stretch",
    justifyContent: "center",
    paddingVertical: 20,
    flexShrink: 0,
    flexGrow: 0,
    minHeight: 500, // Ensures the container has a minimum height for better layout
    minWidth: 200,  // Ensures the container has a minimum width for better layout

  },  
  CommentContainer: {
    marginBottom: "20%",
    width: "100%",
    height: "45%",

    backgroundColor: "transparent",
    borderColor: "#d7d9dd",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 3,

    // Soft drop shadow styling for mobile
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3)',
    elevation: 2,
    
    alignItems: 'stretch',
    justifyContent: "space-evenly",
    paddingTop: 50,

  },
  CommentBox: {
    width: "95%",

    flexDirection: 'row',
    marginHorizontal: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: "transparent",
    borderColor: "#d8d7d7",
    borderStyle: "solid",

    // Applies line to the bottom only, separating items natively
    borderBottomWidth: 2,
  },
  TaskContainer: {
    top: 20,
    marginTop: "15%",
    marginBottom: "37%",
    width: "100%",
    height: "45%",

    backgroundColor: "transparent",
    borderColor: "#d7d9dd",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 3,

    // Soft drop shadow styling for mobile
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3)',
    elevation: 2,      

    alignItems: 'center',
    justifyContent: "center",
    paddingTop: 20,

  },
  // End of Sidebar Components




  // Start of Project Container
  ProjectTitle: {
    position: "absolute",
    top: "2%",
    left: "5%",
    marginBottom: 20,
    color: "#000",
    fontSize: 33,
    fontWeight: "bold",
  },
  ProjectContainer: {
    position: "absolute",
    top: "20%",
    right: "45%",
    alignItems: 'stretch',
    justifyContent: "space-evenly",
    paddingTop: 90,
    paddingBottom: 50,
    width: "50%",
    height: "75%",
    backgroundColor: "transparent",
    borderColor: "#d7d9dd",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 3,    
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3)', // Soft drop shadow styling for mobile
    elevation: 2,      
    flexShrink: 0,
    flexGrow: 0,
    minHeight: 500, // Ensures the container has a minimum height for better layout
    minWidth: 700,  // Ensures the container has a minimum width for better layout
  },
  // End of Project Container





  // Start of Tab bar For Project Container
  tabBar: {
    position: "absolute",
    top: "5%",
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
  placeholderText: {
    flex: 1,
    margin: "26%",
    alignItems: 'center',
    justifyContent: "center",
    textAlign: 'center',
    marginTop: "28%",
    color: '#333',
    fontSize: 14,
  },
  // End of Tabs for Project Container
  


  
  
  CreateProjectButton: {
    position: "absolute",
    bottom: "0%",
    right: "-0.2%",
    width: "100.4%",
    height: "8%",
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderWidth: 2,
    borderRadius: 0,
    borderTopColor: "#d7d9dd",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    justifyContent: "center",
    alignItems: "flex-start"
  },
  CreateProjectlinkButton: {
    position: "relative",
    left: "2%",
    width: 110,
    height: "100%",
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderWidth: 2,
    borderRadius: 0,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "flex-start"
  },
  CreateProjectText: {
    marginLeft: "1.5%",
    fontSize: 15,
    color: "#007aff",
    fontWeight: '500', 
  },
});
