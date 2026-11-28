import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { SheetFile } from './types';

interface Props {
  pdfBase64: string;
  baseName: string;
  onComplete: (sheets: SheetFile[]) => void;
  onError: (message: string) => void;
}

export default function PdfRenderBridge({
  pdfBase64,
  baseName,
  onComplete,
  onError,
}: Props) {
  const webViewRef = useRef<any>(null);
  const sheetsRef = useRef<SheetFile[]>([]);
  const hasStartedRef = useRef(false);
  const NativeWebView = WebView as any;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    </head>
    <body>
    <canvas id="pdfCanvas"></canvas>
    <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        function sendMsg(obj) {
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
        }

        async function renderPdfFromBase64(b64) {
        try {
            sendMsg({ type: 'log', message: '3. Decoding base64 inside WebView...' });
            const raw = atob(b64);
            const uint8 = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) {
            uint8[i] = raw.charCodeAt(i);
            }

            const loadingTask = pdfjsLib.getDocument({ data: uint8 });
            const pdf = await loadingTask.promise;
            sendMsg({ type: 'log', message: '4. PDF loaded, total pages: ' + pdf.numPages });

            const canvas = document.getElementById('pdfCanvas');
            const ctx = canvas.getContext('2d');

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            sendMsg({
                type: 'page',
                pageNumber: pageNum,
                totalPages: pdf.numPages,
                width: Math.round(viewport.width),
                height: Math.round(viewport.height),
                dataUrl: dataUrl,
            });
            }

            sendMsg({ type: 'done' });
        } catch (err) {
            sendMsg({ type: 'error', message: err && err.message ? err.message : String(err) });
        }
        }

        window.startRender = function(b64) {
        renderPdfFromBase64(b64);
        };

        sendMsg({ type: 'ready' });
    </script>
    </body>
    </html>
    `;

    const triggerRender = () => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;
        console.log('3. WebView & pdf.js ready — injecting PDF...');
        const cleanB64 = pdfBase64.replace(/\s/g, '');
        webViewRef.current?.injectJavaScript(
            `if (window.startRender) { window.startRender("${cleanB64}"); } true;`
        );
    };

    const handleMessage = async (event: WebViewMessageEvent) => {
        try {
        const payload = JSON.parse(event.nativeEvent.data);

        if (payload.type === 'ready') {
            triggerRender();
            return;
        }

        if (payload.type === 'log') {
            console.log(payload.message);
            return;
        }

        if (payload.type === 'page') {
            const base64Image = payload.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
            const fileUri = `${FileSystem.cacheDirectory}sheet_${Date.now()}_p${payload.pageNumber}.jpg`;

            await FileSystem.writeAsStringAsync(fileUri, base64Image, {
            encoding: 'base64',
            });

            console.log(`5. Saved rendered page ${payload.pageNumber}/${payload.totalPages} to ${fileUri}`);

            sheetsRef.current.push({
            id: `sheet_${Date.now()}_page_${payload.pageNumber}`,
            sheetNumber: payload.pageNumber,
            title: `${baseName} - Page ${payload.pageNumber}`,
            thumbnailUri: fileUri,
            fullImageUri: fileUri,
            width: payload.width,
            height: payload.height,
            strokes: [],
            pins: [],
            textNotes: [],
            });
            return;
        }

        if (payload.type === 'done') {
            console.log('6. All PDF pages rendered successfully!');
            onComplete(sheetsRef.current);
            return;
        }

        if (payload.type === 'error') {
            console.error('WebView PDF render error:', payload.message);
            onError(payload.message);
        }
        } catch (err: any) {
        onError(err?.message || 'Failed to parse WebView message');
        }
    };

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -1000,
        left: -1000,
        width: 300,
        height: 300,
        opacity: 0.01,
      }}
    >
      <NativeWebView
        ref={webViewRef}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        source={{ html }}
        onMessage={handleMessage}
        onError={(e: any) => onError(e.nativeEvent?.description || 'WebView load error')}
        />

    </View>
  );
}
