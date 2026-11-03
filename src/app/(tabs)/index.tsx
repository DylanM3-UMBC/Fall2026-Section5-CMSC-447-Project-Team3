<<<<<<< HEAD
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from "expo-image-picker";
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, ImageStyle, Platform, ScrollView, StyleSheet, Text, TextStyle, TouchableOpacity, useWindowDimensions, View, ViewStyle } from 'react-native';
import { EmptyPlaceholder, FileCard, PickerWrapper, UploadedFile } from '../../../components/pdfprojectItemComponent';
import ProfileMenu from '../../../components/ProfileMenu';

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
=======
import { useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyPlaceholder, FileCard, PickerWrapper, UploadedFile } from '../../components/pdfprojectItemComponent';




export default function Index() { 
  /* 
  Keeps track of which tab is active ('Your Projects' or 'Shared Projects') and updates the UI accordingly. 
  This state is used to conditionally render the content of each tab.
  */ 
  const [activeTab, setActiveTab] = useState('Your Projects');
  const [projTitle, setProjTitle] = useState("");
  const [showPreview, setShowPreview] = useState(false)
  const [selectedId, setSelectedId] = useState<string>();

>>>>>>> 53188e76662c6bd9b3591a4a32cc79ddcb01e4d3
  
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const addFile = (f: any) => setFiles((p) => [...p, {
    id: Math.random().toString(36).substring(2, 9),
    name: f.name || 'Unnamed PDF',
    uri: f.uri,
    size: f.size,
    uploadedAt: new Date().toLocaleTimeString(),
  }]);
<<<<<<< HEAD



  
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
                <View style={{ position: 'absolute', right: -150 }}>
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
=======
 
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}> 
        <Image 
          source={require("../../assets/images/myumbclogo.png")} 
          style={styles.image} 
        />
        <Text style={styles.title}>UMBC Architectural/Engineering "Punch List" Project Dashboard</Text>
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
>>>>>>> 53188e76662c6bd9b3591a4a32cc79ddcb01e4d3
          >
            <View style={styles.centerLayoutWrapper}>
              
              {/* UPPER ZONE: Events & Dates */}
              <View style={styles.heroSection}>
                <Image source={require("../../../assets/images/umbc_night_sign.png")} style={styles.profileBannerImage}/>

<<<<<<< HEAD
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


                  <PickerWrapper onFilePicked={addFile}>
                    {(openPicker) => (
                    <View>
                      {/* The touch layer isolates strictly around the text boundaries */}
                      <TouchableOpacity style={styles.createProjectButton}  onPress={openPicker}>
                        <Text style={styles.createProjectText}>Create Project +</Text>
                      </TouchableOpacity>
                    </View>
                    )}
                  </PickerWrapper>

                  
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
                      ListEmptyComponent={<EmptyPlaceholder />}
                      renderItem={({ item }) => <FileCard item={item} onDelete={(id) => setFiles((p) => p.filter(x => x.id !== id))} />}
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
      position: 'sticky',
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
      position: 'absolute',
      left: -500,
      width: "100%",
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
=======
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
            <TouchableOpacity onPress={openPicker} style={styles.CreateProjectlinkButton}>
              <Text style={styles.CreateProjectText}>Create Project</Text>
            </TouchableOpacity>
          </View>
          )}
        </PickerWrapper>
        
        {activeTab === 'Your Projects' ? (
          /* Render your projects list view here */
          <FlatList
            data={files}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<EmptyPlaceholder />}
            renderItem={({ item }) => <FileCard item={item} onDelete={(id) => setFiles((p) => p.filter(x => x.id !== id))} />}
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
    position: "absolute",
    top: "0%",
    left: "2%",
    width: 150,
    height: "100%",
    resizeMode: 'center',
  },
  header: {
    flex: 0,
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
>>>>>>> 53188e76662c6bd9b3591a4a32cc79ddcb01e4d3
    
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

<<<<<<< HEAD
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
=======
  },  
  CommentContainer: {
    marginBottom: "20%",
    width: "100%",
    height: "45%",
>>>>>>> 53188e76662c6bd9b3591a4a32cc79ddcb01e4d3

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

<<<<<<< HEAD
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
=======
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
>>>>>>> 53188e76662c6bd9b3591a4a32cc79ddcb01e4d3
