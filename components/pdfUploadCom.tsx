import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

export const pickAndUploadPDF = async (uploadUrl: string): Promise<void> => {
  try {
    // 1. Open the system document picker filtered to PDFs
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true, // Crucial for Android/iOS path stability
    });

    // Exit early if the user canceled the picker
    if (result.canceled || !result.assets || result.assets.length === 0) {
      console.log('User canceled the picker');
      return;
    }

    const pickedFile = result.assets[0];
    const formData = new FormData();

    // 2. Normalize payload based on runtime platform
    if (Platform.OS === 'web') {
      // On Web, expo-document-picker provides the native DOM File object directly
      const webFile = pickedFile.file; 
      if (!webFile) throw new Error('Web file object missing');
      
      formData.append('file', webFile);
    } else {
      // On iOS and Android, construct the native object structure expected by Fetch/FormData
      const nativeFilePayload = {
        uri: pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.mimeType || 'application/pdf',
      };

      // Cast as 'any' to bypass strict web-only TypeScript constraints on FormData values
      formData.append('file', nativeFilePayload as any);
    }

    // 3. Perform the HTTP POST Upload
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        // CRITICAL: Do not set Content-Type header manually.
        // Leaving it empty allows the system to auto-generate the multipart boundary hash.
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Upload successful!', data);
    } else {
      const errorText = await response.text();
      console.error('Upload failed with status:', response.status, errorText);
    }

  } catch (error) {
    console.error('An error occurred during picking/uploading:', error);
  }
};
