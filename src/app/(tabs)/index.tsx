import { useEffect, useState } from "react";
import { FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { DocumentPickerAsset } from "expo-document-picker";
import { authenticatedFetch } from "@/lib/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyPlaceholder, FileCard, PickerWrapper, UploadedFile } from '../../../components/pdfprojectItemComponent';
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

  const addFile = async (file: DocumentPickerAsset) => {
    if (uploading || loading) return;
    setError("");
    if (file.size && file.size > 10 * 1024 * 1024) {
      setError("PDF must be 10 MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("project_name", file.name);
      form.append("project_desc", "");
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
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not upload PDF.");
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

        <PickerWrapper onFilePicked={addFile}>
          {(openPicker) => (
          <View style={styles.CreateProjectButton}>
            <TouchableOpacity disabled={uploading || loading} onPress={openPicker} style={styles.CreateProjectlinkButton}>
              <Text style={styles.CreateProjectText}>{uploading ? "Uploading PDF…" : "Create Project"}</Text>
            </TouchableOpacity>
          </View>
          )}
        </PickerWrapper>
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
    </SafeAreaView>
  );
}











const styles = StyleSheet.create({
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
