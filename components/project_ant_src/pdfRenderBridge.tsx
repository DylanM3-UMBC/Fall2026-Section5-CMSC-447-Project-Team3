import React from 'react';
import { Platform } from 'react-native';
import WebPdfRenderBridge from './pdfRenderBridge.web';
import NativePdfRenderBridge from './pdfRenderBridge.native';

export default function PdfRenderBridge(
  props: React.ComponentProps<typeof NativePdfRenderBridge>
) {
  if (Platform.OS === 'web') {
    return <WebPdfRenderBridge />;
  }
  return <NativePdfRenderBridge {...props} />;
}
