import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

interface PinPoint {
  id: string;
  x: number;
  y: number;
  label: string;
}

export default function InteractivePdfViewer() {
  const { pdfUri, pdfName } = useLocalSearchParams();
  const fileUri = typeof pdfUri === 'string' ? pdfUri : '';

  const [activeTool, setActiveTool] = useState<'scroll' | 'draw' | 'marker'>('scroll');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [savedPaths, setSavedPaths] = useState<string[]>([]);
  const [pins, setPins] = useState<PinPoint[]>([]);
  
  const [selectedPin, setSelectedPin] = useState<PinPoint | null>(null);
  const [labelInput, setLabelInput] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const isDrawingRef = useRef(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const processCanvasClick = (x: number, y: number) => {
    const clickedPin = pins.find(
      (pin) => Math.abs(pin.x - x) < 22 && Math.abs(pin.y - y) < 22
    );

    if (clickedPin) {
      setSelectedPin(clickedPin);
      setLabelInput(clickedPin.label);
      setModalVisible(true);
      return;
    }

    if (activeTool === 'marker') {
      const newPin: PinPoint = {
        id: Math.random().toString(36).substring(2, 9),
        x: x,
        y: y,
        label: '',
      };
      setPins((prev) => [...prev, newPin]);
      setSelectedPin(newPin);
      setLabelInput('');
      setModalVisible(true);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => activeTool !== 'scroll',
      onMoveShouldSetPanResponder: () => activeTool === 'draw',
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (activeTool === 'draw') {
          setCurrentPath(`M ${locationX} ${locationY}`);
        } else {
          processCanvasClick(locationX, locationY);
        }
      },
      onPanResponderMove: (evt) => {
        if (activeTool !== 'draw') return;
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L ${locationX} ${locationY}`);
      },
      onPanResponderRelease: () => {
        if (activeTool !== 'draw') return;
        if (currentPath) {
          setSavedPaths((prev) => [...prev, currentPath]);
        }
        setCurrentPath('');
      },
    })
  ).current;

  useEffect(() => {
    if (Platform.OS !== 'web' || !overlayRef.current) return;

    const element = overlayRef.current;

    const getMouseCoords = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (activeTool === 'scroll') return;
      e.preventDefault();
      
      const coords = getMouseCoords(e);
      if (activeTool === 'draw') {
        isDrawingRef.current = true;
        setCurrentPath(`M ${coords.x} ${coords.y}`);
      } else if (activeTool === 'marker') {
        processCanvasClick(coords.x, coords.y);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current || activeTool !== 'draw') return;
      const coords = getMouseCoords(e);
      setCurrentPath((prev) => `${prev} L ${coords.x} ${coords.y}`);
    };

    const handleMouseUp = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      if (currentPath) {
        setSavedPaths((prev) => [...prev, currentPath]);
      }
      setCurrentPath('');
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeTool, currentPath, pins]);

  const handleSaveLabel = () => {
    if (!selectedPin) return;
    setPins((prevPins) =>
      prevPins.map((pin) => (pin.id === selectedPin.id ? { ...pin, label: labelInput } : pin))
    );
    setModalVisible(false);
    setSelectedPin(null);
  };

  const handleDeletePin = () => {
    if (!selectedPin) return;
    setPins((prevPins) => prevPins.filter((pin) => pin.id !== selectedPin.id));
    setModalVisible(false);
    setSelectedPin(null);
  };

  const handleClearWorkspace = () => {
    setSavedPaths([]);
    setPins([]);
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #ffffff; font-family: sans-serif; overflow: hidden; }
        #workspace-viewport { position: relative; width: 100vw; height: 100vh; margin: 0; padding: 0; box-sizing: border-box; background: #ffffff; }
        #pdf-frame { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; z-index: 1; }
        #drawing-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2; cursor: crosshair; }
      </style>
    </head>
    <body>
      <div id="workspace-viewport">
        <iframe id="pdf-frame" src="${fileUri}"></iframe>
        <canvas id="drawing-canvas"></canvas>
      </div>
      <script>
        const canvas = document.getElementById('drawing-canvas');
        const ctx = canvas.getContext('2d');
        const viewport = document.getElementById('workspace-viewport');
        let isDrawing = false;
        let activeTool = 'scroll';
        function resize() {
          canvas.width = viewport.clientWidth;
          canvas.height = viewport.clientHeight;
          ctx.strokeStyle = '#007aff';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
        window.addEventListener('resize', resize);
        setTimeout(resize, 200);
        function updatePointerBehavior() {
          if (activeTool === 'scroll') { canvas.style.zIndex = "0"; } else { canvas.style.zIndex = "2"; }
        }
        updatePointerBehavior();
        window.addEventListener('message', (e) => {
          if (e.data === 'tool:scroll') { activeTool = 'scroll'; updatePointerBehavior(); }
          if (e.data === 'tool:draw') { activeTool = 'draw'; updatePointerBehavior(); }
          if (e.data === 'tool:marker') { activeTool = 'marker'; updatePointerBehavior(); }
          if (e.data === 'action:clear') { ctx.clearRect(0, 0, canvas.width, canvas.height); }
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{pdfName || 'PDF Viewer Workspace'}</Text>
      </View>

      <View style={styles.viewerContainer}>
        <iframe id="layered-editor-frame" srcDoc={htmlContent} style={styles.frameStyle} />
        <View style={[styles.interactiveOverlay, { pointerEvents: activeTool === 'scroll' && pins.length === 0 ? 'none' : 'auto' }]} {...panResponder.panHandlers}>
          <div ref={overlayRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <Svg width="100%" height="100%" style={styles.absoluteFillStyle}>
              {savedPaths.map((path, idx) => (
                <Path key={idx} d={path} fill="none" stroke="#007aff" strokeWidth="3" strokeLinecap="round" />
              ))}
              {currentPath ? <Path d={currentPath} fill="none" stroke="#007aff" strokeWidth="3" strokeLinecap="round" /> : null}
              {pins.map((pin) => (
                <React.Fragment key={pin.id}>
                  <Circle cx={pin.x} cy={pin.y} r="8" fill="#e03131" stroke="#ffffff" strokeWidth="2" />
                  {pin.label ? (
                    <SvgText x={pin.x + 14} y={pin.y + 4} fill="#212529" fontSize="12" fontWeight="bold">
                      {pin.label}
                    </SvgText>
                  ) : null}
                </React.Fragment>
              ))}
            </Svg>
          </div>
        </View>
      </View>

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalCenteredView}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Configure Pin Options</Text>
            <TextInput style={styles.modalInput} placeholder="Enter custom text label or marker name..." value={labelInput} onChangeText={setLabelInput} maxLength={30} />
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={[styles.modalButton, styles.deleteBtn]} onPress={handleDeletePin}>
                <Text style={styles.deleteBtnText}>Delete Pin</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveBtn]} onPress={handleSaveLabel}>
                <Text style={styles.saveBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      <View style={styles.toolbar}>
        <TouchableOpacity style={[styles.toolButton, activeTool === 'scroll' && styles.activeBtn]} onPress={() => setActiveTool('scroll')}>
          <Text style={styles.toolIcon}>🖐️</Text>
          <Text style={styles.toolText}>Scroll PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolButton, activeTool === 'draw' && styles.activeBtn]} onPress={() => setActiveTool('draw')}>
          <Text style={styles.toolIcon}>✏️</Text>
          <Text style={styles.toolText}>Draw Ink</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolButton, activeTool === 'marker' && styles.activeBtn]} onPress={() => setActiveTool('marker')}>
          <Text style={styles.toolIcon}>📍</Text>
          <Text style={styles.toolText}>Add Pin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton} onPress={handleClearWorkspace}>
          <Text style={styles.toolIcon}>🧹</Text>
          <Text style={styles.toolText}>Clear All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff', paddingTop: 50 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e9ecef', backgroundColor: '#fff' },
    backButton: { paddingRight: 16 },
    backButtonText: { color: '#007aff', fontSize: 16, fontWeight: '600' },
    title: { color: '#212529', fontSize: 16, fontWeight: '700', flex: 1 },
    viewerContainer: { flex: 1, width: '100%', height: '100%', backgroundColor: '#ffffff', position: 'relative' },
    frameStyle: { width: '100%', height: '100%',},
    interactiveOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'transparent' },
    absoluteFillStyle: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    toolbar: { flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#e9ecef', justifyContent: 'space-around' },
    toolButton: { alignItems: 'center', justifyContent: 'center', width: 75, paddingVertical: 4, borderRadius: 6 },
    activeBtn: { backgroundColor: '#f1f3f5' },
    toolIcon: { fontSize: 20, marginBottom: 2 },
    toolText: { color: '#495057', fontSize: 11, fontWeight: '600' },
    modalCenteredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalCard: { width: '90%', maxWidth: 400, backgroundColor: 'white', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
    modalTitle: { fontSize: 16, fontWeight: '700', color: '#212529', marginBottom: 14 },
    modalInput: { width: '100%', borderWidth: 1, borderColor: '#dee2e6', borderRadius: 6, padding: 10, fontSize: 14, marginBottom: 20 },
    modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    modalButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, justifyContent: 'center' },
    deleteBtn: { marginRight: 'auto', backgroundColor: '#fff' },
    deleteBtnText: { color: '#e03131', fontWeight: '600', fontSize: 13 },
    cancelBtn: { backgroundColor: '#f1f3f5' },
    cancelBtnText: { color: '#495057', fontWeight: '500', fontSize: 13 },
    saveBtn: { backgroundColor: '#007aff' },
    saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});