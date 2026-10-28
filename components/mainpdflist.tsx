import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface UploadedFile {
  id: string;
  name: string;
  uri: string;
  size?: number;
  uploadedAt: string;
}

export default function App() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  // State tracking which specific card's menu option bar is open
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleTapAndList = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true, 
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const fileDetails = result.assets[0];

      const newFileItem: UploadedFile = {
        id: Math.random().toString(36).substring(2, 9),
        name: fileDetails.name || 'Unnamed PDF',
        uri: fileDetails.uri,
        size: fileDetails.size,
        uploadedAt: new Date().toLocaleTimeString(),
      };

      setUploadedFiles((prevFiles) => [...prevFiles, newFileItem]);
    } catch (error) {
      console.log('Error opening file picker');
    }
  };

  const handleGoToEditPage = (file: UploadedFile) => {
    router.push({
      pathname: '/edit-pdf',
      params: { 
        pdfUri: file.uri, 
        pdfName: file.name 
      }
    });
  };

  // Toggles the options dropdown visibility for a card
  const toggleMenu = (id: string) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  // Cross-platform delete routine (bypasses system Alert modal traps)
  const handleDeleteFile = (id: string) => {
    setUploadedFiles((prevFiles) => prevFiles.filter(file => file.id !== id));
    setActiveMenuId(null); // Auto-close menu
  };

  const handleShareFile = (name: string) => {
    console.log(`Share triggered for: ${name}`);
    setActiveMenuId(null); // Auto-close menu
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleTapAndList} style={styles.buttonWrapper}>
        <Text style={styles.textButton}>[ Tap here to choose PDF ]</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Uploaded History Documents</Text>

      <FlatList
        data={uploadedFiles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No files uploaded yet. Tap above to start.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <View style={styles.fileCardBody}>
              {/* Left Side: Clickable content area links to edit-pdf screen */}
              <TouchableOpacity style={styles.clickableArea} onPress={() => handleGoToEditPage(item)}>
                <View>
                  <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                  {item.size && (
                    <Text style={styles.fileMeta}>
                      {(item.size / 1024 / 1024).toFixed(2)} MB • {item.uploadedAt}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* Right Side: Options Button Container */}
              <View style={styles.rightActions}>
                <Text style={styles.pdfBadge}>PDF</Text>
                <TouchableOpacity style={styles.menuIconButton} onPress={() => toggleMenu(item.id)}>
                  <Text style={styles.menuIconText}>⋮</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* CONDITIONAL OPTION BAR: Only opens if activeMenuId matches card ID */}
            {activeMenuId === item.id && (
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => handleShareFile(item.name)}
                >
                  <Text style={styles.shareText}>🔗 Share</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButtonBorder]} 
                  onPress={() => handleDeleteFile(item.id)}
                >
                  <Text style={styles.deleteText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  buttonWrapper: {
    alignItems: 'center',
    marginBottom: 30,
  },
  textButton: {
    fontSize: 18,
    color: '#007aff',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingBottom: 20,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  fileCardBody: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clickableArea: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
    maxWidth: 200,
  },
  fileMeta: {
    fontSize: 12,
    color: '#868e96',
    marginTop: 4,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfBadge: {
    backgroundColor: '#ffe3e3',
    color: '#e03131',
    fontWeight: '700',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  menuIconButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  menuIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#495057',
  },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    backgroundColor: '#fafbfc',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#f1f3f5',
  },
  shareText: {
    fontSize: 13,
    color: '#007aff',
    fontWeight: '600',
  },
  deleteText: {
    fontSize: 13,
    color: '#e03131',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#adb5bd',
    marginTop: 40,
    fontSize: 14,
  },
});
