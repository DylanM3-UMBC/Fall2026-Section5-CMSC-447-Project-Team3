import { PDFDocument, StandardFonts, rgb, PDFName, PDFArray, PDFNumber } from 'pdf-lib';
import { SheetFile, TaskPin } from './types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function imageUrlToPngBytes(src: string): Promise<Uint8Array> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width || 400;
  canvas.height = img.naturalHeight || img.height || 300;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/png');
  const res = await fetch(dataUrl);
  return new Uint8Array(await res.arrayBuffer());
}

async function renderPinMinimapPngBytes(
  sheet: SheetFile,
  pin: TaskPin
): Promise<Uint8Array> {
  const img = await loadImage(sheet.fullImageUri);
  const scaleX = sheet.boardWidth ? sheet.width / sheet.boardWidth : 1;
  const scaleY = sheet.boardHeight ? sheet.height / sheet.boardHeight : 1;

  const pinImgX = pin.x * scaleX;
  const pinImgY = pin.y * scaleY;

  const cropW = Math.min(sheet.width, 480);
  const cropH = Math.min(sheet.height, 340);

  let sx = Math.max(0, pinImgX - cropW / 2);
  let sy = Math.max(0, pinImgY - cropH / 2);
  if (sx + cropW > sheet.width) sx = Math.max(0, sheet.width - cropW);
  if (sy + cropH > sheet.height) sy = Math.max(0, sheet.height - cropH);

  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, cropW, cropH);
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

  // Draw freehand strokes inside the cropped region
  ctx.save();
  ctx.translate(-sx, -sy);
  ctx.scale(scaleX, scaleY);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of sheet.strokes) {
    const path2D = new Path2D(stroke.path);
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.strokeWidth;
    ctx.stroke(path2D);
  }
  ctx.restore();

  // Draw transparent ring pin matching the editor aesthetic
  const markerX = pinImgX - sx;
  const markerY = pinImgY - sy;
  const ringColor = pin.status === 'resolved' ? '#2E7D32' : pin.color;

  ctx.beginPath();
  ctx.arc(markerX, markerY, 18, 0, Math.PI * 2);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = ringColor;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(pin.number), markerX, markerY);

  const dataUrl = canvas.toDataURL('image/png');
  const res = await fetch(dataUrl);
  return new Uint8Array(await res.arrayBuffer());
}

function addInternalPageLink(
  pdfDoc: PDFDocument,
  sourcePage: any,
  targetPage: any,
  rect: [number, number, number, number]
) {
  const context = pdfDoc.context;
  const destArray = PDFArray.withContext(context);
  destArray.push(targetPage.ref);
  destArray.push(PDFName.of('XYZ'));
  destArray.push(PDFNumber.of(0));
  destArray.push(PDFNumber.of(targetPage.getHeight()));
  destArray.push(PDFNumber.of(0));

  const linkAnnot = context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: rect,
    Border: [0, 0, 0],
    Dest: destArray,
  });

  const linkAnnotRef = context.register(linkAnnot);
  const existingAnnots = sourcePage.node.lookup(PDFName.of('Annots'));
  if (existingAnnots instanceof PDFArray) {
    existingAnnots.push(linkAnnotRef);
  } else {
    const newAnnots = PDFArray.withContext(context);
    newAnnots.push(linkAnnotRef);
    sourcePage.node.set(PDFName.of('Annots'), newAnnots);
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (!word) continue;
    if ((current + ' ' + word).trim().length <= maxChars) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

export async function exportSheetsToPdf(
  sheets: SheetFile[],
  onProgress?: (current: number, total: number) => void
) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Collect all task pins across every sheet in numerical order
  const allEntries: { sheet: SheetFile; pin: TaskPin }[] = [];
  for (const sheet of sheets) {
    for (const pin of sheet.pins || []) {
      allEntries.push({ sheet, pin });
    }
  }
  allEntries.sort((a, b) => a.pin.number - b.pin.number);

  const pageWidth = 612;  // Standard Letter width (pt)
  const pageHeight = 792; // Standard Letter height (pt)
  const margin = 40;

  if (allEntries.length === 0) {
    const emptyPage = pdfDoc.addPage([pageWidth, pageHeight]);
    emptyPage.drawText('No Task Pins Found', {
      x: margin,
      y: pageHeight - 70,
      size: 20,
      font: fontBold,
      color: rgb(0.1, 0.12, 0.15),
    });
    emptyPage.drawText('Place at least one task pin on a sheet before exporting.', {
      x: margin,
      y: pageHeight - 100,
      size: 12,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5),
    });
  } else {
    // 1. Reserve front Glossary page(s) first so internal jump links target exact report pages
    const rowsPerGlossaryPage = 24;
    const glossaryPageCount = Math.ceil(allEntries.length / rowsPerGlossaryPage);
    const glossaryPages = Array.from({ length: glossaryPageCount }, () =>
      pdfDoc.addPage([pageWidth, pageHeight])
    );

    const reportPages: any[] = [];
    const totalSteps = allEntries.length;

    // 2. Build one dedicated Task Detail Report page per pin
    for (let i = 0; i < allEntries.length; i++) {
      onProgress?.(i + 1, totalSteps);
      const { sheet, pin } = allEntries[i];
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      reportPages.push(page);

      let cursorY = pageHeight - margin;

      // Top Header Bar
      page.drawRectangle({
        x: margin,
        y: cursorY - 28,
        width: pageWidth - margin * 2,
        height: 28,
        color: rgb(0.15, 0.17, 0.21),
      });
      page.drawText('TASK DETAIL REPORT', {
        x: margin + 12,
        y: cursorY - 18,
        size: 11,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      page.drawText(`Page ${glossaryPageCount + i + 1}`, {
        x: pageWidth - margin - 55,
        y: cursorY - 18,
        size: 10,
        font: fontRegular,
        color: rgb(0.8, 0.83, 0.88),
      });

      cursorY -= 56;

      // Muted #Number + Bold Task Title
      const numLabel = `#${pin.number}`;
      page.drawText(numLabel, {
        x: margin,
        y: cursorY,
        size: 20,
        font: fontBold,
        color: rgb(0.45, 0.49, 0.54),
      });
      const numWidth = fontBold.widthOfTextAtSize(numLabel + '  ', 20);
      page.drawText(pin.title, {
        x: margin + numWidth,
        y: cursorY,
        size: 20,
        font: fontBold,
        color: rgb(0.1, 0.12, 0.15),
      });

      cursorY -= 16;
      page.drawLine({
        start: { x: margin, y: cursorY },
        end: { x: pageWidth - margin, y: cursorY },
        thickness: 1,
        color: rgb(0.85, 0.87, 0.9),
      });

      cursorY -= 22;

      // 3-Column Metadata Grid + Location Minimap on Right
      const col1X = margin;
      const col2X = margin + 165;
      const mapBoxW = 200;
      const mapBoxH = 145;
      const mapBoxX = pageWidth - margin - mapBoxW;
      const mapBoxY = cursorY - mapBoxH + 10;

      // Column 1: Status, Type, Sheet
      page.drawText('STATUS', {
        x: col1X,
        y: cursorY,
        size: 9,
        font: fontBold,
        color: rgb(0.45, 0.49, 0.54),
      });
      page.drawText(pin.status === 'resolved' ? 'Resolved' : 'Open', {
        x: col1X,
        y: cursorY - 14,
        size: 12,
        font: fontBold,
        color: pin.status === 'resolved' ? rgb(0.18, 0.49, 0.2) : rgb(0.8, 0.2, 0.2),
      });

      page.drawText('TYPE', {
        x: col1X,
        y: cursorY - 40,
        size: 9,
        font: fontBold,
        color: rgb(0.45, 0.49, 0.54),
      });
      page.drawText(pin.type || '-', {
        x: col1X,
        y: cursorY - 54,
        size: 12,
        font: fontRegular,
        color: rgb(0.12, 0.14, 0.18),
      });

      page.drawText('SHEET', {
        x: col1X,
        y: cursorY - 80,
        size: 9,
        font: fontBold,
        color: rgb(0.45, 0.49, 0.54),
      });
      const sheetLines = wrapText(sheet.title, 22);
      sheetLines.slice(0, 2).forEach((line, idx) => {
        page.drawText(line, {
          x: col1X,
          y: cursorY - 94 - idx * 14,
          size: 11,
          font: fontRegular,
          color: rgb(0.12, 0.14, 0.18),
        });
      });

      // Column 2: Comments Count & Photos Count
      const comments = pin.comments || [];
      const photos = pin.photos || [];

      page.drawText('COMMENTS', {
        x: col2X,
        y: cursorY,
        size: 9,
        font: fontBold,
        color: rgb(0.45, 0.49, 0.54),
      });
      page.drawText(`${comments.length} note(s)`, {
        x: col2X,
        y: cursorY - 14,
        size: 12,
        font: fontRegular,
        color: rgb(0.12, 0.14, 0.18),
      });

      page.drawText('ATTACHED PHOTOS', {
        x: col2X,
        y: cursorY - 40,
        size: 9,
        font: fontBold,
        color: rgb(0.45, 0.49, 0.54),
      });
      page.drawText(`${photos.length} photo(s)`, {
        x: col2X,
        y: cursorY - 54,
        size: 12,
        font: fontRegular,
        color: rgb(0.12, 0.14, 0.18),
      });

      // Column 3: Location Preview Minimap
      page.drawText('LOCATION PREVIEW', {
        x: mapBoxX,
        y: cursorY + 12,
        size: 9,
        font: fontBold,
        color: rgb(0.45, 0.49, 0.54),
      });

      try {
        const minimapBytes = await renderPinMinimapPngBytes(sheet, pin);
        const minimapImg = await pdfDoc.embedPng(minimapBytes);
        page.drawImage(minimapImg, {
          x: mapBoxX,
          y: mapBoxY,
          width: mapBoxW,
          height: mapBoxH,
        });
      } catch {
        // Fallback placeholder if minimap fails
      }

      page.drawRectangle({
        x: mapBoxX,
        y: mapBoxY,
        width: mapBoxW,
        height: mapBoxH,
        borderWidth: 1,
        borderColor: rgb(0.75, 0.78, 0.82),
      });

      cursorY = mapBoxY - 26;

      // Comments & Notes Section
      page.drawText('COMMENTS & FIELD NOTES', {
        x: margin,
        y: cursorY,
        size: 11,
        font: fontBold,
        color: rgb(0.15, 0.17, 0.21),
      });
      cursorY -= 16;

      if (comments.length === 0) {
        page.drawText('No comments recorded for this task.', {
          x: margin,
          y: cursorY,
          size: 10,
          font: fontRegular,
          color: rgb(0.5, 0.54, 0.58),
        });
        cursorY -= 20;
      } else {
        for (const comment of comments.slice(0, 6)) {
          page.drawText(`[${comment.createdAt}]`, {
            x: margin,
            y: cursorY,
            size: 9,
            font: fontBold,
            color: rgb(0.4, 0.45, 0.5),
          });
          cursorY -= 13;
          const wrapped = wrapText(comment.text, 85);
          for (const line of wrapped.slice(0, 2)) {
            page.drawText(line, {
              x: margin + 8,
              y: cursorY,
              size: 10,
              font: fontRegular,
              color: rgb(0.12, 0.14, 0.18),
            });
            cursorY -= 13;
          }
          cursorY -= 4;
        }
      }

      cursorY -= 12;

      // Photos Section (2x2 Grid)
      if (photos.length > 0 && cursorY > 140) {
        page.drawText('SITE PHOTOS', {
          x: margin,
          y: cursorY,
          size: 11,
          font: fontBold,
          color: rgb(0.15, 0.17, 0.21),
        });
        cursorY -= 14;

        const photoW = 250;
        const photoH = 155;
        const gap = 24;

        for (let pIdx = 0; pIdx < Math.min(photos.length, 4); pIdx++) {
          const col = pIdx % 2;
          const row = Math.floor(pIdx / 2);
          const px = margin + col * (photoW + gap);
          const py = cursorY - (row + 1) * photoH - row * 14;

          if (py < margin) break;

          try {
            const pBytes = await imageUrlToPngBytes(photos[pIdx]);
            const pImg = await pdfDoc.embedPng(pBytes);
            page.drawImage(pImg, {
              x: px,
              y: py,
              width: photoW,
              height: photoH,
            });
            page.drawRectangle({
              x: px,
              y: py,
              width: photoW,
              height: photoH,
              borderWidth: 1,
              borderColor: rgb(0.8, 0.82, 0.85),
            });
          } catch {
            // Skip unreadable photo
          }
        }
      }
    }

    // 3. Populate the Front Glossary / Index Page(s) with Clickable Jump Links
    for (let gIdx = 0; gIdx < glossaryPages.length; gIdx++) {
      const gPage = glossaryPages[gIdx];
      let gy = pageHeight - margin;

      gPage.drawText('TASK GLOSSARY & INDEX', {
        x: margin,
        y: gy - 18,
        size: 18,
        font: fontBold,
        color: rgb(0.1, 0.12, 0.15),
      });
      gPage.drawText(
        `Total Tasks: ${allEntries.length}  |  Click any task row below to jump directly to its report page`,
        {
          x: margin,
          y: gy - 36,
          size: 10,
          font: fontRegular,
          color: rgb(0.4, 0.45, 0.5),
        }
      );

      gy -= 62;

      // Table Header
      gPage.drawRectangle({
        x: margin,
        y: gy - 22,
        width: pageWidth - margin * 2,
        height: 22,
        color: rgb(0.15, 0.17, 0.21),
      });
      gPage.drawText('#', { x: margin + 8, y: gy - 15, size: 9, font: fontBold, color: rgb(1, 1, 1) });
      gPage.drawText('TASK NAME', { x: margin + 40, y: gy - 15, size: 9, font: fontBold, color: rgb(1, 1, 1) });
      gPage.drawText('TYPE', { x: margin + 235, y: gy - 15, size: 9, font: fontBold, color: rgb(1, 1, 1) });
      gPage.drawText('SHEET', { x: margin + 325, y: gy - 15, size: 9, font: fontBold, color: rgb(1, 1, 1) });
      gPage.drawText('STATUS', { x: margin + 435, y: gy - 15, size: 9, font: fontBold, color: rgb(1, 1, 1) });
      gPage.drawText('PAGE', { x: margin + 495, y: gy - 15, size: 9, font: fontBold, color: rgb(1, 1, 1) });

      gy -= 24;

      const sliceStart = gIdx * rowsPerGlossaryPage;
      const sliceEnd = Math.min(allEntries.length, sliceStart + rowsPerGlossaryPage);

      for (let idx = sliceStart; idx < sliceEnd; idx++) {
        const { sheet, pin } = allEntries[idx];
        const targetPage = reportPages[idx];
        const targetPageNumber = glossaryPageCount + idx + 1;
        const rowH = 24;

        if ((idx - sliceStart) % 2 === 1) {
          gPage.drawRectangle({
            x: margin,
            y: gy - rowH,
            width: pageWidth - margin * 2,
            height: rowH,
            color: rgb(0.96, 0.97, 0.98),
          });
        }

        const textY = gy - 16;
        gPage.drawText(`#${pin.number}`, {
          x: margin + 8,
          y: textY,
          size: 10,
          font: fontBold,
          color: rgb(0, 0.4, 0.8),
        });
        gPage.drawText(pin.title.slice(0, 30), {
          x: margin + 40,
          y: textY,
          size: 10,
          font: fontBold,
          color: rgb(0, 0.4, 0.8),
        });
        gPage.drawText((pin.type || '-').slice(0, 14), {
          x: margin + 235,
          y: textY,
          size: 9,
          font: fontRegular,
          color: rgb(0.2, 0.23, 0.27),
        });
        gPage.drawText(sheet.title.slice(0, 18), {
          x: margin + 325,
          y: textY,
          size: 9,
          font: fontRegular,
          color: rgb(0.2, 0.23, 0.27),
        });
        gPage.drawText(pin.status === 'resolved' ? 'Resolved' : 'Open', {
          x: margin + 435,
          y: textY,
          size: 9,
          font: fontBold,
          color: pin.status === 'resolved' ? rgb(0.18, 0.49, 0.2) : rgb(0.8, 0.2, 0.2),
        });
        gPage.drawText(`p. ${targetPageNumber}`, {
          x: margin + 495,
          y: textY,
          size: 9,
          font: fontRegular,
          color: rgb(0.3, 0.35, 0.4),
        });

        // Attach clickable PDF jump link over the entire glossary row
        addInternalPageLink(pdfDoc, gPage, targetPage, [
          margin,
          gy - rowH,
          pageWidth - margin,
          gy,
        ]);

        gy -= rowH;
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `Task_Reports_${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
