import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { SheetFile, TaskPin } from './types';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function toBase64ImageUri(uri: string): Promise<string> {
  if (!uri) return '';
  if (uri.startsWith('data:image')) return uri;
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = uri.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
    return `data:image/${ext};base64,${base64}`;
  } catch {
    return uri;
  }
}

interface ReportItem {
  pin: TaskPin;
  sheet: SheetFile;
  reportPageNumber: number;
}

export async function exportSheetsToPdf(
  sheets: SheetFile[],
  projectName: string = 'Project Task Report'
): Promise<void> {
  const allTasks: ReportItem[] = [];
  let pageCounter = 2;

  for (const sheet of sheets) {
    const sortedPins = [...(sheet.pins || [])].sort((a, b) => a.number - b.number);
    for (const pin of sortedPins) {
      allTasks.push({
        pin,
        sheet,
        reportPageNumber: pageCounter++,
      });
    }
  }

  if (allTasks.length === 0) {
    throw new Error('No task pins found to export.');
  }

  const glossaryRowsHtml = allTasks
    .map(({ pin, sheet, reportPageNumber }) => {
      const isResolved = pin.status === 'resolved';
      const statusColor = isResolved ? '#2E7D32' : '#E53935';
      const statusLabel = isResolved ? 'Resolved' : 'Open';
      const taskType = escapeHtml(pin.type || 'Issue');

      return `
        <tr>
          <td class="col-num"><a href="#task-${pin.number}">#${pin.number}</a></td>
          <td class="col-title"><a href="#task-${pin.number}">${escapeHtml(pin.title)}</a></td>
          <td>${taskType}</td>
          <td>${escapeHtml(sheet.title)}</td>
          <td style="color: ${statusColor}; font-weight: 700;">${statusLabel}</td>
          <td class="col-page"><a href="#task-${pin.number}">Page ${reportPageNumber}</a></td>
        </tr>
      `;
    })
    .join('');

  const taskPagesHtmlParts: string[] = [];

  for (const { pin, sheet } of allTasks) {
    const isResolved = pin.status === 'resolved';
    const ringColor = isResolved ? '#2E7D32' : pin.color || '#E53935';
    const statusLabel = isResolved ? 'Resolved' : 'Open';
    const taskType = escapeHtml(pin.type || 'Issue');

    const boardW = sheet.boardWidth || sheet.width || 800;
    const boardH = sheet.boardHeight || sheet.height || 600;
    const pctX = Math.max(5, Math.min(95, (pin.x / boardW) * 100));
    const pctY = Math.max(5, Math.min(95, (pin.y / boardH) * 100));

    const sheetImgSrc = await toBase64ImageUri(sheet.fullImageUri || sheet.thumbnailUri);

    const commentsHtml =
      pin.comments && pin.comments.length > 0
        ? pin.comments
            .map(
              (c) => `
              <div class="comment-item">
                <div class="comment-meta">${escapeHtml(c.createdAt)}</div>
                <div class="comment-text">${escapeHtml(c.text)}</div>
              </div>
            `
            )
            .join('')
        : `<div class="empty-note">No comments recorded for this task.</div>`;

    const photoSrcs: string[] = [];
    for (const pUri of (pin.photos || []).slice(0, 4)) {
      const converted = await toBase64ImageUri(pUri);
      if (converted) photoSrcs.push(converted);
    }

    const photosHtml =
      photoSrcs.length > 0
        ? `<div class="photo-grid">
            ${photoSrcs
              .map(
                (src) => `
                <div class="photo-card">
                  <img src="${src}" />
                </div>
              `
              )
              .join('')}
          </div>`
        : `<div class="empty-note">No site photos attached.</div>`;

    taskPagesHtmlParts.push(`
      <div id="task-${pin.number}" class="report-page">
        <div class="top-bar">
          <span>&mdash; Task Detail Report</span>
          <span>Sheet: ${escapeHtml(sheet.title)}</span>
        </div>

        <div class="task-header">
          <span class="task-num">#${pin.number}</span>
          <span class="task-title">${escapeHtml(pin.title)}</span>
        </div>

        <div class="meta-grid">
          <div class="meta-col">
            <div class="meta-label">Status</div>
            <div class="meta-val" style="color: ${ringColor}; font-weight: 700;">${statusLabel}</div>

            <div class="meta-label">Type</div>
            <div class="meta-val">${taskType}</div>

            <div class="meta-label">Sheet</div>
            <div class="meta-val">${escapeHtml(sheet.title)}</div>
          </div>

          <div class="meta-col">
            <div class="meta-label">Comments</div>
            <div class="meta-val">${pin.comments?.length || 0} recorded</div>

            <div class="meta-label">Attached Photos</div>
            <div class="meta-val">${pin.photos?.length || 0} photo(s)</div>
          </div>

          <div class="meta-col">
            <div class="meta-label">Location Preview</div>
            <div class="minimap-box">
              ${
                sheetImgSrc
                  ? `<img class="minimap-img" src="${sheetImgSrc}" />`
                  : `<div class="minimap-grid"></div>`
              }
              <div
                class="pin-ring"
                style="
                  left: ${pctX}%;
                  top: ${pctY}%;
                  border-color: ${ringColor};
                  color: ${ringColor};
                "
              >${pin.number}</div>
            </div>
          </div>
        </div>

        <div class="section-title">Comments &amp; Field Notes</div>
        <div class="comments-box">${commentsHtml}</div>

        <div class="section-title">Photos</div>
        ${photosHtml}
      </div>
    `);
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page {
            size: letter portrait;
            margin: 32px;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
            color: #212529;
            margin: 0;
            padding: 0;
          }
          .glossary-page {
            page-break-after: always;
          }
          .glossary-header {
            background: #1A1D24;
            color: #FFFFFF;
            padding: 16px 20px;
            border-radius: 6px;
            margin-bottom: 18px;
          }
          .glossary-header h1 {
            margin: 0 0 4px 0;
            font-size: 20px;
          }
          .glossary-header p {
            margin: 0;
            font-size: 12px;
            color: #ADB5BD;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th {
            background: #F1F3F5;
            text-align: left;
            padding: 10px 8px;
            border-bottom: 2px solid #CED4DA;
            color: #495057;
          }
          td {
            padding: 9px 8px;
            border-bottom: 1px solid #E9ECEF;
          }
          td a {
            color: #0066CC;
            text-decoration: none;
            font-weight: 600;
          }
          .col-num { width: 52px; }
          .col-page { width: 72px; text-align: right; }

          .report-page {
            page-break-before: always;
          }
          .top-bar {
            display: flex;
            justify-content: space-between;
            background: #1A1D24;
            color: #FFFFFF;
            padding: 10px 14px;
            font-size: 11px;
            border-radius: 4px;
            margin-bottom: 14px;
          }
          .task-header {
            border-bottom: 2px solid #DEE2E6;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .task-num {
            font-size: 20px;
            font-weight: 700;
            color: #6C757D;
            margin-right: 8px;
          }
          .task-title {
            font-size: 20px;
            font-weight: 700;
            color: #1A1D24;
          }
          .meta-grid {
            display: flex;
            gap: 14px;
            margin-bottom: 16px;
          }
          .meta-col {
            flex: 1;
            border: 1px solid #DEE2E6;
            border-radius: 6px;
            padding: 10px;
            background: #F8F9FA;
          }
          .meta-label {
            font-size: 10px;
            text-transform: uppercase;
            color: #6C757D;
            font-weight: 700;
            margin-top: 6px;
          }
          .meta-label:first-child {
            margin-top: 0;
          }
          .meta-val {
            font-size: 13px;
            color: #212529;
            margin-top: 2px;
          }
          .minimap-box {
            position: relative;
            width: 100%;
            height: 130px;
            border: 1px solid #ADB5BD;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 6px;
            background: #FFFFFF;
          }
          .minimap-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .minimap-grid {
            width: 100%;
            height: 100%;
            background-color: #F8FAFC;
            background-image: linear-gradient(#E2E8F0 1px, transparent 1px),
                              linear-gradient(90deg, #E2E8F0 1px, transparent 1px);
            background-size: 16px 16px;
          }
          .pin-ring {
            position: absolute;
            width: 24px;
            height: 24px;
            margin-left: -12px;
            margin-top: -12px;
            border-radius: 12px;
            border: 2.5px solid #E53935;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 800;
          }
          .section-title {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            color: #495057;
            border-bottom: 1px solid #DEE2E6;
            padding-bottom: 4px;
            margin: 14px 0 8px 0;
          }
          .comments-box {
            border: 1px solid #DEE2E6;
            border-radius: 6px;
            padding: 10px;
            background: #FFFFFF;
          }
          .comment-item {
            padding: 6px 0;
            border-bottom: 1px solid #F1F3F5;
          }
          .comment-item:last-child {
            border-bottom: none;
          }
          .comment-meta {
            font-size: 10px;
            color: #868E96;
          }
          .comment-text {
            font-size: 12px;
            color: #212529;
            margin-top: 2px;
          }
          .empty-note {
            font-size: 12px;
            color: #868E96;
            font-style: italic;
          }
          .photo-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .photo-card {
            width: 48%;
            height: 165px;
            border: 1px solid #CED4DA;
            border-radius: 6px;
            overflow: hidden;
            background: #F8F9FA;
          }
          .photo-card img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        </style>
      </head>
      <body>
        <div class="glossary-page">
          <div class="glossary-header">
            <h1>Task Glossary &amp; Index</h1>
            <p>&bull; Total Tasks: ${allTasks.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th class="col-num">Task #</th>
                <th>Task Name</th>
                <th>Type</th>
                <th>Sheet</th>
                <th>Status</th>
                <th class="col-page">Report</th>
              </tr>
            </thead>
            <tbody>
              ${glossaryRowsHtml}
            </tbody>
          </table>
        </div>

        ${taskPagesHtmlParts.join('')}
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${projectName} - Task Report`,
      UTI: 'com.adobe.pdf',
    });
  }
}
