import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument } from 'pdf-lib';
import { SheetFile } from './types';

/**
 * Native Mobile PDF Splitter (src/pdfSplitter.ts)
 * Automatically resolved by Expo/Metro on iOS & Android instead of pdfSplitter.web.ts.
 * Reads the uploaded PDF's page count and exact page dimensions via expo-file-system & pdf-lib.
 */

function base64ToUint8Array(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = clean.length;
  let bufferLength = (len * 3) / 4;
  if (clean[len - 1] === '=') bufferLength--;
  if (clean[len - 2] === '=') bufferLength--;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;

  for (let i = 0; i < len; i += 4) {
    const encoded1 = chars.indexOf(clean[i]);
    const encoded2 = chars.indexOf(clean[i + 1]);
    const encoded3 = chars.indexOf(clean[i + 2]);
    const encoded4 = chars.indexOf(clean[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64 && encoded3 !== -1) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== 64 && encoded4 !== -1) {
      bytes[p++] = ((encoded3 & 3) << 6) | encoded4;
    }
  }

  return bytes;
}

function createPlaceholderBlueprintSvg(pageNum: number, width: number, height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#FFFFFF"/>
    <rect x="24" y="24" width="${Math.max(40, width - 48)}" height="${Math.max(40, height - 48)}" fill="none" stroke="#CBD5E1" stroke-width="3"/>
    <line x1="24" y1="88" x2="${Math.max(64, width - 24)}" y2="88" stroke="#E2E8F0" stroke-width="2"/>
    <text x="44" y="64" font-family="sans-serif" font-size="22" font-weight="bold" fill="#334155">SHEET ${pageNum}</text>
    <text x="${Math.max(44, width - 260)}" y="64" font-family="sans-serif" font-size="14" fill="#64748B">${Math.round(width)} x ${Math.round(height)} pt</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function splitPdfIntoSheets(
  pdfUri: string,
  fileName: string
): Promise<SheetFile[]> {
  // 1. Read the picked PDF file as Base64 from the device filesystem
  const base64Data = await FileSystem.readAsStringAsync(pdfUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 2. Parse the PDF structure with pdf-lib to extract page count and exact aspect ratios
  const pdfBytes = base64ToUint8Array(base64Data);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  const baseName = fileName.replace(/\.pdf$/i, '');
  const docId = `doc_${Date.now()}`;
  const sheets: SheetFile[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const safeWidth = Math.max(400, Math.round(width));
    const safeHeight = Math.max(400, Math.round(height));
    const pageNum = i + 1;

    // Generates a clean dimension-matched blueprint sheet frame for Expo Go.
    // (If using an Expo Development Build with react-native-pdf-thumbnail,
    // you can swap this URI with PdfThumbnail.generate(pdfUri, i).)
    const sheetImageUri = createPlaceholderBlueprintSvg(pageNum, safeWidth, safeHeight);
    
    sheets.push({
      id: `sheet_${Date.now()}_page_${pageNum}`,
      sheetNumber: pageNum,
      title: `${baseName} - Page ${pageNum}`,
      thumbnailUri: '',
      fullImageUri: '',
      width,
      height,
      strokes: Array.of(),
      pins: Array.of(),
      textNotes: Array.of(),
    });

  }

  return sheets;
}
