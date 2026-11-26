import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ImageStyle, ScrollView, StyleSheet, Text, TextStyle, TouchableOpacity, useWindowDimensions, View, ViewStyle } from 'react-native';
import { showImagePicker } from '../../../components/imageProfilePicker';
import WeeklyTaskChart from '../../../components/weeklyTaskChart';

interface DashboardStyles {
  screenContainer: ViewStyle;
  stickyHeaderWrapper: ViewStyle;
  topNavbar: ViewStyle;
  innerNavbar: ViewStyle;
  mainScroll: ViewStyle;
  scrollContent: ViewStyle;
  centerLayoutWrapper: ViewStyle;
  heroSection: ViewStyle;
  gridRow: ViewStyle;
  leftProjectColumn: ViewStyle;
  rightGroupsColumn: ViewStyle;
  sidebarContainer: ViewStyle;
  groupCardItem: ViewStyle;
  TaskSummaryButton: ViewStyle
  profilebannerBox: ViewStyle
  scrollBoxWrapper: ViewStyle
  tabBar: ViewStyle
  tabButton: ViewStyle
  activeTabButton: ViewStyle
  createProjectButton: ViewStyle;
  imageContainer: ViewStyle;
  placeholderImage: ViewStyle;  
  editBadge: ViewStyle;
  chartCardContainer: ViewStyle;


  navLogo: ImageStyle;
  profileBannerImage: ImageStyle
  profileImage: ImageStyle;   

  
  profileName: TextStyle;
  sectionTitleProjects: TextStyle
  sectionTitle: TextStyle;
  TaskSummaryText: TextStyle
  groupCardText: TextStyle;
  tabText: TextStyle
  activeTabText: TextStyle
  placeholderText_Project: TextStyle
  createProjectText: TextStyle;
  placeholderText: TextStyle;
  editText: TextStyle;
}

const myWeeklyTasks = [
  { day: 'Mon', tasks: 0 },
  { day: 'Tue', tasks: 0 },
  { day: 'Wed', tasks: 0 },
  { day: 'Thu', tasks: 0 },
  { day: 'Fri', tasks: 0 },
  { day: 'Sat', tasks: 0 },
  { day: 'Sun', tasks: 0 },
];
const SIDEBAR_DATA = [
  { title: 'UMBC Campus', icon: '🎓' },
  { title: 'Security', icon: '🛡️' },
  { title: 'Alerts', icon: '📢' },
  { title: 'Events', icon: '📅' },
];

export default function Index() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Your Projects');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // getHours() always returns 0-23 regardless of 12h/24h phone settings, 0 to 11 = AM | 12 to 23 = PM
  const isPM = currentTime.getHours() >= 12;
  
  
  // 1. All hook dependencies execute unconditionally at the top level
  const { width } = useWindowDimensions(); 
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // 2. Generate styles safely
  const styles = createStyles(width);
  
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
                <View style={styles.profilebannerBox}>
                  <Image source={
                    isPM
                      ? require('../../../assets/images/umbc_night_book.png') // Shown from 12:00 PM to 11:59 PM
                      : require("../../../assets/images/umbc_day_sign.png")   // Shown from 12:00 AM to 11:59 AM 
                    } 
                    style={styles.profileBannerImage}
                  />
                </View>

                <TouchableOpacity style={styles.imageContainer} onPress={() => showImagePicker(setProfileImage)}>
                  {profileImage ? (<Image source={{uri: profileImage}} style={styles.profileImage} />) : ( 
                    <View style={styles.placeholderImage}>
                      <Text style={styles.placeholderText}>+</Text>
                    </View>
                  )} 
                  
                  <View style={styles.editBadge}>
                    <Text style={styles.editText}>Edit</Text>
                  </View>
                </TouchableOpacity>

                <Text style={styles.profileName}>Your Fullname</Text>
              </View>

              {/* LOWER ZONE: 2-Column Side-by-Side Content Grid */}
              <View style={styles.gridRow}>
                
                {/* LOWER LEFT: Project Feed Section */}
                <View style={styles.leftProjectColumn}>
                  <Text style={styles.sectionTitleProjects}>My Projects</Text>
                  <View>
                    {/*Integration of the My Projects page*/}
                    {/* The touch layer isolates strictly around the text boundaries */}
                    <TouchableOpacity style={styles.createProjectButton}  onPress={() => router.push("/my_projects_page")}>
                      <Text style={styles.createProjectText}>Go To My Projects</Text>
                    </TouchableOpacity>
                  </View>
                                   
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
                    <View style={styles.chartCardContainer}>
                      <WeeklyTaskChart
                        data={myWeeklyTasks}
                        height={240}
                        lineColor="#10B981"
                        pointColor="#10B981"
                      />
                    </View>
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
                    <Text style={styles.sectionTitle}>Recent</Text>
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
    profilebannerBox:{
      position: "relative",
      width: "100%",
      aspectRatio: 3.5, // Controls the exact banner shape
      top: 0,
      borderWidth: 3,
      borderColor: "transparent",
      borderRadius: 12,
      overflow: "hidden",
    },
    profileBannerImage: {
      width: "100%",
      height: "100%",       // Matches the exact height of profilebannerBox
      resizeMode: "cover",  // Fills edge-to-edge with zero white bars
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
    tabBar: {  // Start of Tab bar For Project Container
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
      marginBottom: 12, 
      alignSelf: 'flex-start', 
    },
    createProjectButton: {
      alignSelf: 'flex-end', 
      padding: 8,
      paddingHorizontal: 20,
      paddingVertical: 6,
      marginBottom:0,
      marginTop: -70,
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
    chartCardContainer: {
      width: '100%',
      backgroundColor: "transparent",
      borderColor: "#d7d9dd",
      borderStyle: "solid",
      borderWidth: 1,
      borderRadius: 3,
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3)',
    },
  });
};
