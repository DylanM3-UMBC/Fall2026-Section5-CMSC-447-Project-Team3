import React from 'react';
import { Platform } from 'react-native';
import WebSheetEditor from './SheetEditor.web';
import NativeSheetEditor from './SheetEditor.native';

export default function SheetEditor(props: React.ComponentProps<typeof WebSheetEditor>) {
  if (Platform.OS === 'web') {
    return <WebSheetEditor {...props} />;
  }
  return <NativeSheetEditor {...props} />;
}