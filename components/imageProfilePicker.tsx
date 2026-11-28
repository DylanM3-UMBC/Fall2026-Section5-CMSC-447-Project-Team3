import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

type SetImageCallback = (uri: string | null) => void;

const pickImage = async (onSelect: SetImageCallback) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'We need camera roll permissions to select a profile image.');
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect:[1,1],
    quality: 0.8,
  });
  if (!result.canceled && result.assets[0]) {
    onSelect(result.assets[0].uri);
  }
};

const takePhoto = async (onSelect: SetImageCallback) => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'We need camera permissions to take a photo.');
    return;
  }
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect:[1,1],
    quality: 0.8,
  });
  if (!result.canceled && result.assets[0]) {
    onSelect(result.assets[0].uri);
  }
};

export const showImagePicker = async (onSelect: SetImageCallback) => {
  if (Platform.OS === 'web') {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      onSelect(result.assets[0].uri);
    }
    return;
  }

  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    Alert.alert('Select Profile Image', 'Choose an option', [
      { text: 'Camera', onPress: () => takePhoto(onSelect) },
      { text: 'Photo Library', onPress: () => pickImage(onSelect) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
};
