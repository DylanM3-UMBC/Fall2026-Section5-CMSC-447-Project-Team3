import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface UploadedFile {
  id: string;
  name: string;
  uri: string;
  size?: number;
  uploadedAt: string;
}

export function PickerWrapper({ onFilePicked, children }: { onFilePicked: (file: any) => void; children: (trigger: () => void) => React.ReactNode }) {
  const handleTapAndList = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      onFilePicked(result.assets[0]); // Explicitly grab the first picked file index object
    } catch (error) {
      console.log('Error opening file picker');
    }
  };

  return <>{children(handleTapAndList)}</>;
}

export function FileCard({ item, onDelete }: { item: UploadedFile; onDelete: (id: string) => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <View style={styles.cardContainer}>
      <View style={styles.fileCardBody}>
        {/* Container remains structural, but is no longer clickable */}
        <View style={styles.contentArea}>
          
          {/* Only the text component layout intercepts touches now */}
          <TouchableOpacity 
            onPress={() => router.push({ pathname: '/edit-pdf', params: { pdfUri: item.uri, pdfName: item.name } })}
          >
            <Text style={styles.fileName} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>

          {item.size && (
            <Text style={styles.fileMeta}>
              {(item.size / 1024 / 1024).toFixed(2)} MB • {item.uploadedAt}
            </Text>
          )}
        </View>

        <View style={styles.rightActions}>
          <Text style={styles.pdfBadge}>PDF</Text>
          <TouchableOpacity style={styles.menuIconButton} onPress={() => setIsMenuOpen(!isMenuOpen)}>
            <Text style={styles.menuIconText}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isMenuOpen && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => { console.log(`Shared: ${item.name}`); setIsMenuOpen(false); }}>
            <Text style={styles.shareText}>🔗 Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButtonBorder]} onPress={() => { onDelete(item.id); setIsMenuOpen(false); }}>
            <Text style={styles.deleteText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function EmptyPlaceholder() {
  return <Text style={styles.emptyText}>No projects uploaded yet. Click Create Project to add pdf to start.</Text>;
}

const styles = StyleSheet.create({
  cardContainer: { backgroundColor: '#ffffff', borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e9ecef', overflow: 'hidden' },
  fileCardBody: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contentArea: { flex: 1 },
  
  // styled like a link text target
  fileName: { 
    fontSize: 15, 
    fontWeight: '500', 
   // color: '#007aff', // Changed color to blue so it clearly indicates a link
    color: "#000",
    textDecorationLine: 'underline', // Added underline styling
    alignSelf: 'flex-start', // Keeps the hit box limited exactly to the text length
    maxWidth: 200 
  },
  
  fileMeta: { fontSize: 12, color: '#868e96', marginTop: 4 },
  rightActions: { flexDirection: 'row', alignItems: 'center' },
  pdfBadge: { backgroundColor: '#ffe3e3', color: '#e03131', fontWeight: '700', fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, overflow: 'hidden', marginRight: 10 },
  menuIconButton: { paddingHorizontal: 10, paddingVertical: 4 },
  menuIconText: { fontSize: 20, fontWeight: 'bold', color: '#495057' },
  actionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f3f5', backgroundColor: '#fafbfc' },
  actionButton: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  deleteButtonBorder: { borderLeftWidth: 1, borderLeftColor: '#f1f3f5' },
  shareText: { fontSize: 13, color: '#007aff', fontWeight: '600' },
  deleteText: { fontSize: 13, color: '#e03131', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#000', marginTop: 200, fontSize: 14 }, //color: '#adb5bd'
});