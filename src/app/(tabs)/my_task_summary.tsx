import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextStyle, useWindowDimensions, View, ViewStyle } from 'react-native';

const current = new Date();
const current_day: string = current.toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',  
  year: 'numeric'
});

interface DashboardStyles {
  screenContainer: ViewStyle;
  stickyHeaderWrapper: ViewStyle;
  topNavbar: ViewStyle;
  innerNavbar: ViewStyle;
  navLogo: TextStyle;
  mainScroll: ViewStyle;
  scrollContent: ViewStyle;
  centerLayoutWrapper: ViewStyle;
  heroSection: ViewStyle;
  dateText: TextStyle;
  gridRow: ViewStyle;
  taskSummaryReportSection: ViewStyle;
  sectionTitle: TextStyle;
}

export default function my_task_summary() {
  const { width } = useWindowDimensions(); 
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);
  useEffect(() => {
      setHasHydrated(true);
    }, []);

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
                        <Text style={styles.navLogo}>myUMBC</Text>
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
                        <Text style={styles.dateText}>{current_day}</Text>
                    </View>

                    {/* LOWER ZONE: 2-Column Side-by-Side Content Grid */}
                    <View style={styles.gridRow}>
                        {/* LOWER LEFT: Task Summary Report Feed Section */}
                        <View style={styles.taskSummaryReportSection}>
                            <Text style={styles.sectionTitle}>My Task Summary Reports</Text>
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
    navLogo: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
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
    },
    heroSection: {
      width: '100%',
      marginBottom: 32,
      paddingHorizontal: 15,
    },
    dateText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#007BFF', 
      marginBottom: 8,
    },
    gridRow: {
      width: '100%',
      flexDirection: 'row', 
      paddingHorizontal: 15,
    },
    taskSummaryReportSection: {
      flex: 7.2, 
      paddingRight: 24,
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
  });
};
