import { getDocument } from 'pdfjs-serverless';
import { SheetFile } from './types';

async function renderPageToImage(page: any, scale: number) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create 2D canvas context');

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return {
    uri: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height,
  };
}

export async function splitPdfIntoSheets(
  uri: string,
  fileName: string,
  onProgress?: (current: number, total: number) => void
): Promise<SheetFile[]> {
  const baseName = fileName.replace(/\.pdf$/i, '');

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  // Worker is already embedded inside pdfjs-serverless!
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  const totalPages = pdf.numPages;
  const sheets: SheetFile[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum, totalPages);

    const page = await pdf.getPage(pageNum);
    const thumb = await renderPageToImage(page, 0.4);
    const fullPage = await renderPageToImage(page, 2.0);

    sheets.push({
      id: `${Date.now()}_page_${pageNum}`,
      sheetNumber: pageNum,
      title: `${baseName} - Sheet ${pageNum}`,
      thumbnailUri: thumb.uri,
      fullImageUri: fullPage.uri,
      width: fullPage.width,
      height: fullPage.height,
      strokes: Array.of(),
      pins: Array.of(),
    });

  }

  return sheets;
}
