import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import TaskSidebar from './TaskSidebar';
import { SheetFile, Stroke, TaskPin, TextNote } from './types';

interface Props {
  sheet: SheetFile;
  startingTaskNumber: number;
  onDeleteSheet?: (sheetId: string) => void;
  onSaveAndClose: (
    updatedStrokes: Stroke[],
    updatedPins: TaskPin[],
    updatedTextNotes: TextNote[],
    boardWidth: number,
    boardHeight: number,
    updatedNextNumber: number
  ) => void;
}

type ToolMode = 'draw' | 'pin' | 'text' | 'erase' | 'pan';

type HistoryAction =
  | { kind: 'add-stroke'; item: Stroke }
  | { kind: 'add-text'; item: TextNote }
  | { kind: 'erase-stroke'; item: Stroke }
  | { kind: 'erase-text'; item: TextNote };

const COLORS = Array.of('#E53935', '#1E88E5', '#43A047', '#FB8C00', '#000000');
const WIDTHS = Array.of(3, 6, 10, 16);
const FONT_SIZES = Array.of(12, 16, 22, 30);

export default function SheetEditor({ sheet, startingTaskNumber, onSaveAndClose }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const isCompactScreen = screenWidth < 768;

  const [toolMode, setToolMode] = useState<ToolMode>('draw');
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const [selectedWidth, setSelectedWidth] = useState<number>(WIDTHS[1]);
  const [selectedFontSize, setSelectedFontSize] = useState<number>(16);

  const [paths, setPaths] = useState<Stroke[]>(sheet.strokes || Array.of());
  const [currentPath, setCurrentPath] = useState<string>('');
  const [pins, setPins] = useState<TaskPin[]>(sheet.pins || Array.of());
  const [textNotes, setTextNotes] = useState<TextNote[]>(sheet.textNotes || Array.of());

  const [undoStack, setUndoStack] = useState<HistoryAction[]>(Array.of());
  const [redoStack, setRedoStack] = useState<HistoryAction[]>(Array.of());

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [hiddenPinIds, setHiddenPinIds] = useState<string[]>(Array.of());
  const [currentTaskNumber, setCurrentTaskNumber] = useState<number>(startingTaskNumber);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(!isCompactScreen);

  // Pin Creation Modal State
  const [pendingPinCoords, setPendingPinCoords] = useState<{ x: number; y: number } | null>(null);
  const [newPinTitle, setNewPinTitle] = useState<string>('');
  const [newPinType, setNewPinType] = useState<string>('General');

  // Inline MS Paint Text State
  const [pendingTextCoords, setPendingTextCoords] = useState<{ x: number; y: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInputDraft, setTextInputDraft] = useState<string>('');
  const textInputRef = useRef<any>(null);

  // Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [boardSize, setBoardSize] = useState<{ width: number; height: number }>({
    width: sheet.boardWidth || 800,
    height: sheet.boardHeight || 600,
  });

  // Live Refs for PanResponder closures
  const toolModeRef = useRef<ToolMode>(toolMode);
  toolModeRef.current = toolMode;
  const selectedColorRef = useRef(selectedColor);
  selectedColorRef.current = selectedColor;
  const selectedWidthRef = useRef(selectedWidth);
  selectedWidthRef.current = selectedWidth;
  const activePathRef = useRef<string>('');
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;
  const panStartRef = useRef({ x: 0, y: 0 });
  const stageRef = useRef<any>(null);
  const stageOffsetRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const boardSizeRef = useRef(boardSize);
  boardSizeRef.current = boardSize;
  const pendingTextCoordsRef = useRef(pendingTextCoords);
  pendingTextCoordsRef.current = pendingTextCoords;
  const pathsRef = useRef(paths);
  pathsRef.current = paths;
  const textNotesRef = useRef(textNotes);
  textNotesRef.current = textNotes;

  useEffect(() => {
    if (pendingTextCoords) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [pendingTextCoords]);

  const measureStage = () => {
    if (stageRef.current && typeof stageRef.current.measureInWindow === 'function') {
      stageRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        stageOffsetRef.current = { x, y, width, height };
      });
    }
  };

  const getBoardCoordinates = (pageX: number, pageY: number) => {
    const { x: stageX, y: stageY, width: stageW, height: stageH } = stageOffsetRef.current;
    const bw = boardSizeRef.current.width;
    const bh = boardSizeRef.current.height;
    const z = zoomRef.current;
    const px = panRef.current.x;
    const py = panRef.current.y;

    const centerX = stageX + stageW / 2 + px;
    const centerY = stageY + stageH / 2 + py;

    const unscaledX = (pageX - centerX) / z + bw / 2;
    const unscaledY = (pageY - centerY) / z + bh / 2;

    return {
      x: Math.max(0, Math.min(bw, unscaledX)),
      y: Math.max(0, Math.min(bh, unscaledY)),
    };
  };

  const eraseAtPoint = (x: number, y: number) => {
    const hitRadius = 18;

    // 1. Check Strokes
    const currentStrokes = pathsRef.current;
    const hitStroke = currentStrokes.find((stroke) => {
      const coords = stroke.path.match(/-?\d+(\.\d+)?/g);
      if (!coords) return false;
      for (let i = 0; i < coords.length - 1; i += 2) {
        const px = parseFloat(coords[i]);
        const py = parseFloat(coords[i + 1]);
        if (Math.hypot(px - x, py - y) <= hitRadius + stroke.strokeWidth / 2) {
          return true;
        }
      }
      return false;
    });

    if (hitStroke) {
      setPaths((prev) => prev.filter((s) => s !== hitStroke));
      setUndoStack((prev) => [...prev, { kind: 'erase-stroke', item: hitStroke }]);
      setRedoStack(Array.of());
      return;
    }

    // 2. Check Text Notes
    const currentNotes = textNotesRef.current;
    const hitNote = currentNotes.find(
      (note) => Math.hypot(note.x + 24 - x, note.y - y) <= hitRadius + 12
    );

    if (hitNote) {
      setTextNotes((prev) => prev.filter((n) => n.id !== hitNote.id));
      setUndoStack((prev) => [...prev, { kind: 'erase-text', item: hitNote }]);
      setRedoStack(Array.of());
    }
  };

  const handleSaveTextNote = () => {
    const clean = textInputDraft.trim();
    if (!clean) {
      setPendingTextCoords(null);
      setEditingTextId(null);
      setTextInputDraft('');
      return;
    }

    if (editingTextId) {
      setTextNotes((prev) =>
        prev.map((t) =>
          t.id === editingTextId
            ? { ...t, text: clean, color: selectedColor, fontSize: selectedFontSize }
            : t
        )
      );
    } else if (pendingTextCoords) {
      const newNote: TextNote = {
        id: `txt_${Date.now()}`,
        x: pendingTextCoords.x,
        y: pendingTextCoords.y,
        text: clean,
        color: selectedColor,
        fontSize: selectedFontSize,
      };
      setTextNotes((prev) => [...prev, newNote]);
      setUndoStack((prev) => [...prev, { kind: 'add-text', item: newNote }]);
      setRedoStack(Array.of());
    }

    setPendingTextCoords(null);
    setEditingTextId(null);
    setTextInputDraft('');
  };

  const handleDeleteTextNote = () => {
    if (!editingTextId) return;
    const target = textNotes.find((t) => t.id === editingTextId);
    if (target) {
      setTextNotes((prev) => prev.filter((t) => t.id !== editingTextId));
      setUndoStack((prev) => [...prev, { kind: 'erase-text', item: target }]);
      setRedoStack(Array.of());
    }
    setPendingTextCoords(null);
    setEditingTextId(null);
    setTextInputDraft('');
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !pendingTextCoordsRef.current,
      onMoveShouldSetPanResponder: () =>
        !pendingTextCoordsRef.current &&
        (toolModeRef.current === 'draw' ||
          toolModeRef.current === 'pan' ||
          toolModeRef.current === 'erase'),

      onPanResponderGrant: (evt) => {
        measureStage();
        const { pageX, pageY } = evt.nativeEvent;

        if (toolModeRef.current === 'pan') {
          panStartRef.current = { x: panRef.current.x, y: panRef.current.y };
          return;
        }

        const coords = getBoardCoordinates(pageX, pageY);

        if (toolModeRef.current === 'erase') {
          eraseAtPoint(coords.x, coords.y);
          return;
        }

        if (toolModeRef.current === 'pin') {
          setPendingPinCoords({ x: coords.x, y: coords.y });
          setNewPinTitle('');
          setNewPinType('General');
          return;
        }

        if (toolModeRef.current === 'text') {
          setEditingTextId(null);
          setPendingTextCoords({ x: coords.x, y: coords.y });
          setTextInputDraft('');
          return;
        }

        // Draw mode
        const startCmd = `M ${coords.x.toFixed(1)} ${coords.y.toFixed(1)}`;
        activePathRef.current = startCmd;
        setCurrentPath(startCmd);
      },

      onPanResponderMove: (evt, gestureState) => {
        if (toolModeRef.current === 'pan') {
          setPan({
            x: panStartRef.current.x + gestureState.dx,
            y: panStartRef.current.y + gestureState.dy,
          });
          return;
        }

        const { pageX, pageY } = evt.nativeEvent;
        const coords = getBoardCoordinates(pageX, pageY);

        if (toolModeRef.current === 'erase') {
          eraseAtPoint(coords.x, coords.y);
          return;
        }

        if (toolModeRef.current === 'draw' && activePathRef.current) {
          const nextCmd = `${activePathRef.current} L ${coords.x.toFixed(1)} ${coords.y.toFixed(1)}`;
          activePathRef.current = nextCmd;
          setCurrentPath(nextCmd);
        }
      },

      onPanResponderRelease: () => {
        if (toolModeRef.current === 'draw' && activePathRef.current) {
          const newStroke: Stroke = {
            path: activePathRef.current,
            color: selectedColorRef.current,
            strokeWidth: selectedWidthRef.current,
          };
          setPaths((prev) => [...prev, newStroke]);
          setUndoStack((prev) => [...prev, { kind: 'add-stroke', item: newStroke }]);
          setRedoStack(Array.of());
          activePathRef.current = '';
          setCurrentPath('');
        }
      },
    })
  ).current;

  const handleUndo = () => {
    const last = undoStack.at(-1);
    if (!last) return;

    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);

    if (last.kind === 'add-stroke') {
      setPaths((prev) => prev.filter((s) => s !== last.item));
    } else if (last.kind === 'add-text') {
      setTextNotes((prev) => prev.filter((t) => t.id !== last.item.id));
    } else if (last.kind === 'erase-stroke') {
      setPaths((prev) => [...prev, last.item]);
    } else if (last.kind === 'erase-text') {
      setTextNotes((prev) => [...prev, last.item]);
    }
  };

  const handleRedo = () => {
    const next = redoStack.at(-1);
    if (!next) return;

    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, next]);

    if (next.kind === 'add-stroke') {
      setPaths((prev) => [...prev, next.item]);
    } else if (next.kind === 'add-text') {
      setTextNotes((prev) => [...prev, next.item]);
    } else if (next.kind === 'erase-stroke') {
      setPaths((prev) => prev.filter((s) => s !== next.item));
    } else if (next.kind === 'erase-text') {
      setTextNotes((prev) => prev.filter((t) => t.id !== next.item.id));
    }
  };

  const handleConfirmPin = () => {
    if (!pendingPinCoords) return;
    const title = newPinTitle.trim() || `Task #${currentTaskNumber}`;
    const newPin: TaskPin = {
      id: `pin_${Date.now()}`,
      number: currentTaskNumber,
      x: pendingPinCoords.x,
      y: pendingPinCoords.y,
      title,
      type: newPinType.trim() || 'General',
      status: 'open',
      color: selectedColor,
      comments: Array.of(),
      photos: Array.of(),
    };
    setPins((prev) => [...prev, newPin]);
    setSelectedPinId(newPin.id);
    setCurrentTaskNumber((n) => n + 1);
    setPendingPinCoords(null);
    setNewPinTitle('');
    setSidebarOpen(true);
  };

  const visiblePins = pins.filter((p) => !hiddenPinIds.includes(p.id));
  const aspect = sheet.width && sheet.height ? sheet.width / sheet.height : 1.414;

    const handleTogglePinStatus = (pinId: string) => {
    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId ? { ...p, status: p.status === 'open' ? 'resolved' : 'open' } : p
      )
    );
  };

   const handleUpdatePinTitle = (pinId: string, newTitle: string) => {
    setPins((prev) =>
      prev.map((p) => (p.id === pinId ? { ...p, title: newTitle } : p))
    );
  };

  const handleUpdatePinType = (pinId: string, newType: string) => {
    setPins((prev) =>
      prev.map((p) => (p.id === pinId ? { ...p, type: newType } : p))
    );
  };

  const handleTogglePinVisibility = (pinId: string) => {
    setHiddenPinIds((prev) =>
      prev.includes(pinId) ? prev.filter((id) => id !== pinId) : [...prev, pinId]
    );
  };

  const handleToggleAllVisibility = () => {
    setHiddenPinIds((prev) => (prev.length > 0 ? Array.of() : pins.map((p) => p.id)));
  };

  const handleRequestDeletePin = (pinId: string) => {
    setPins((prev) => prev.filter((p) => p.id !== pinId));
    if (selectedPinId === pinId) setSelectedPinId(null);
  };

  const handleAddComment = (pinId: string, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId
          ? {
              ...p,
              comments: [
                ...(p.comments || Array.of()),
                {
                  id: `cmt_${Date.now()}`,
                  text: clean,
                  createdAt: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                },
              ],
            }
          : p
      )
    );
  };

  const handleAddPhoto = async (pinId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const photoUri = result.assets[0].uri;
    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId ? { ...p, photos: [...(p.photos || Array.of()), photoUri] } : p
      )
    );
  };

const handleRemovePhoto = (pinId: string, photoIndex: number) => {
    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId
          ? {
              ...p,
              photos: (p.photos || Array.of()).filter((_, idx) => idx !== photoIndex),
            }
          : p
      )
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => {
            if (pendingTextCoords) handleSaveTextNote();
            onSaveAndClose(
              paths,
              pins,
              textNotes,
              boardSize.width,
              boardSize.height,
              currentTaskNumber
            );
          }}
        >
          <Text style={styles.doneBtnText}>✓ Done</Text>
        </TouchableOpacity>

        {/* Tool Mode Switcher */}
        <View style={styles.modeSwitcher}>
          {(['draw', 'pin', 'text', 'erase', 'pan'] as ToolMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeBtn, toolMode === mode && styles.activeModeBtn]}
              onPress={() => {
                if (pendingTextCoords) handleSaveTextNote();
                setToolMode(mode);
              }}
            >
              <Text style={styles.modeBtnText}>
                {mode === 'draw'
                  ? 'Pen'
                  : mode === 'pin'
                  ? 'Pin'
                  : mode === 'text'
                  ? 'Text'
                  : mode === 'erase'
                  ? 'Eraser'
                  : 'Pan'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Undo / Redo / Zoom / Sidebar Toggle */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={[styles.actionBtn, undoStack.length === 0 && styles.disabledBtn]}
            onPress={handleUndo}
            disabled={undoStack.length === 0}
          >
            <Text style={styles.btnText}>Undo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, redoStack.length === 0 && styles.disabledBtn]}
            onPress={handleRedo}
            disabled={redoStack.length === 0}
          >
            <Text style={styles.btnText}>Redo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
          >
            <Text style={styles.btnText}>−</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <Text style={styles.btnText}>{Math.round(zoom * 100)}%</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
          >
            <Text style={styles.btnText}>+</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, sidebarOpen && styles.activeModeBtn]}
            onPress={() => setSidebarOpen((prev) => !prev)}
          >
            <Text style={styles.btnText}>Tasks ({pins.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Workspace */}
      <View style={styles.workspace}>
        <View ref={stageRef} onLayout={measureStage} style={styles.canvasStage}>
          <View
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (width > 0 && height > 0) {
                setBoardSize({ width, height });
              }
            }}
            style={[
              styles.sheetBoard,
              {
                width: '94%',
                maxHeight: '90%',
                aspectRatio: aspect,
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y },
                  { scale: zoom },
                ],
              },
            ]}
            {...panResponder.panHandlers}
          >
            {sheet.fullImageUri ? (
              <Image
                source={{ uri: sheet.fullImageUri }}
                style={styles.blueprintImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.fallbackBoard}>
                <Text style={styles.fallbackText}>
                  {sheet.title} ({Math.round(sheet.width)} × {Math.round(sheet.height)})
                </Text>
              </View>
            )}

            {/* Vector Ink Layer */}
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              {paths.map((stroke, idx) => (
                <Path
                  key={`stroke_${idx}`}
                  d={stroke.path}
                  stroke={stroke.color}
                  strokeWidth={stroke.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentPath ? (
                <Path
                  d={currentPath}
                  stroke={selectedColor}
                  strokeWidth={selectedWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </Svg>

            {/* Transparent Ring Task Pins */}
           {visiblePins.map((pin) => {
              const isSelected = pin.id === selectedPinId;
              const isResolved = pin.status === 'resolved';
              const ringColor = isSelected
                ? '#FFD43B'
                : isResolved
                ? '#2E7D32'
                : pin.color;

              return (
                <TouchableOpacity
                  key={pin.id}
                  onPress={() => {
                    setSelectedPinId(pin.id);
                    setSidebarOpen(true);
                  }}
                  style={[
                    styles.pinMarker,
                    {
                      left: pin.x - 16,
                      top: pin.y - 16,
                      borderColor: ringColor,
                    },
                    isSelected && styles.selectedPinMarker,
                  ]}
                >
                  <Text style={[styles.pinNumber, { color: ringColor }]}>
                    {pin.number}
                  </Text>
                </TouchableOpacity>
              );
            })}


            {/* Placed Text Notes */}
            {textNotes
              .filter((note) => note.id !== editingTextId)
              .map((note) => (
                <TouchableOpacity
                  key={note.id}
                  onPress={() => {
                    if (toolMode === 'erase') {
                      setTextNotes((prev) => prev.filter((n) => n.id !== note.id));
                      setUndoStack((prev) => [...prev, { kind: 'erase-text', item: note }]);
                      setRedoStack(Array.of());
                      return;
                    }
                    setEditingTextId(note.id);
                    setPendingTextCoords({ x: note.x, y: note.y });
                    setTextInputDraft(note.text);
                    setSelectedFontSize(note.fontSize || 16);
                  }}
                  style={{
                    position: 'absolute',
                    left: note.x,
                    top: note.y - 10,
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      color: note.color,
                      fontSize: note.fontSize || 16,
                      fontWeight: '700',
                    }}
                  >
                    {note.text}
                  </Text>
                </TouchableOpacity>
              ))}

            {/* MS Paint Inline Text Box + Glowing Anchor Dot */}
            {pendingTextCoords && (
              <View
                style={{
                  position: 'absolute',
                  left: pendingTextCoords.x - 6,
                  top: pendingTextCoords.y - 12,
                  zIndex: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: selectedColor,
                    backgroundColor: '#FFD43B',
                  }}
                />

                <TextInput
                  ref={textInputRef}
                  value={textInputDraft}
                  onChangeText={setTextInputDraft}
                  placeholder="Type here..."
                  placeholderTextColor="rgba(100,100,100,0.7)"
                  autoFocus
                  onSubmitEditing={handleSaveTextNote}
                  style={{
                    color: selectedColor,
                    fontSize: selectedFontSize,
                    fontWeight: '700',
                    minWidth: 110,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: selectedColor,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 4,
                  }}
                />

                {editingTextId && (
                  <TouchableOpacity
                    onPress={handleDeleteTextNote}
                    style={{
                      backgroundColor: '#E53935',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Task Sidebar (Drawer overlay on phones, docked on tablets) */}
         {/* Task Sidebar (Drawer overlay on phones, docked on tablets) */}
        {sidebarOpen && (
          <View style={isCompactScreen ? styles.compactSidebarOverlay : styles.dockedSidebar}>
            <TaskSidebar
              pins={pins}
              selectedPinId={selectedPinId}
              toolMode={toolMode}
              onSelectPin={setSelectedPinId}
              onToggleStatus={handleTogglePinStatus}
              onUpdateTitle={handleUpdatePinTitle}
              onUpdateType={handleUpdatePinType}
              onToggleVisibility={handleTogglePinVisibility}
              onToggleAllVisibility={handleToggleAllVisibility}
              onDeletePin={handleRequestDeletePin}
              onAddComment={handleAddComment}
              onAddPhoto={handleAddPhoto}
              onRemovePhoto={handleRemovePhoto}
            />
          </View>
        )}
      </View>

      {/* Bottom Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolGroup}>
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => setSelectedColor(color)}
              style={[
                styles.colorCircle,
                { backgroundColor: color },
                selectedColor === color && styles.selectedColor,
              ]}
            />
          ))}
        </View>

        <View style={styles.divider} />

        {toolMode === 'text' ? (
          <View style={styles.toolGroup}>
            {FONT_SIZES.map((size) => (
              <TouchableOpacity
                key={size}
                onPress={() => setSelectedFontSize(size)}
                style={[
                  styles.widthBtn,
                  { width: 'auto', paddingHorizontal: 10 },
                  selectedFontSize === size && styles.selectedWidthBtn,
                ]}
              >
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>{size}px</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.toolGroup}>
            {WIDTHS.map((width) => (
              <TouchableOpacity
                key={width}
                onPress={() => setSelectedWidth(width)}
                style={[styles.widthBtn, selectedWidth === width && styles.selectedWidthBtn]}
              >
                <View
                  style={{
                    width: width + 4,
                    height: width + 4,
                    borderRadius: (width + 4) / 2,
                    backgroundColor: selectedColor,
                  }}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* New Task Pin Modal */}
      <Modal
        visible={pendingPinCoords !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingPinCoords(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Task Pin #{currentTaskNumber}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Task title (e.g., Patch drywall crack)"
              placeholderTextColor="#868E96"
              value={newPinTitle}
              onChangeText={setNewPinTitle}
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Type (e.g., Electrical, Plumbing, Punchlist)"
              placeholderTextColor="#868E96"
              value={newPinType}
              onChangeText={setNewPinType}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPendingPinCoords(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleConfirmPin}>
                <Text style={styles.modalSaveText}>Create Pin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E2229' },
  topBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#282C34',
    borderBottomWidth: 1,
    borderBottomColor: '#3A3F4B',
    gap: 6,
  },
  doneBtn: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  doneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E2229',
    borderRadius: 6,
    padding: 3,
    gap: 2,
  },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 },
  activeModeBtn: { backgroundColor: '#0066CC' },
  modeBtnText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtn: {
    backgroundColor: '#3A3F4B',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 5,
  },
  disabledBtn: { opacity: 0.4 },
  btnText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  workspace: { flex: 1, flexDirection: 'row', position: 'relative' },
  canvasStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#181B20',
  },
  sheetBoard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    overflow: 'hidden',
    elevation: 4,
  },
  blueprintImage: { width: '100%', height: '100%' },
  fallbackBoard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  fallbackText: { color: '#868E96', fontSize: 14, fontWeight: '600' },
  pinMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
  },
  selectedPinMarker: {
    transform: Array.of({ scale: 1.25 }),
    borderWidth: 3.5,
  },
  pinNumber: {
    fontWeight: '800',
    fontSize: 13,
  },
  dockedSidebar: { width: 320, borderLeftWidth: 1, borderLeftColor: '#3A3F4B' },
  compactSidebarOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '82%',
    maxWidth: 340,
    zIndex: 40,
    backgroundColor: '#282C34',
    borderLeftWidth: 1,
    borderLeftColor: '#3A3F4B',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#282C34',
    borderTopWidth: 1,
    borderTopColor: '#3A3F4B',
    gap: 12,
  },
  toolGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'transparent' },
  selectedColor: { borderColor: '#FFFFFF', transform: [{ scale: 1.15 }] },
  divider: { width: 1, height: 24, backgroundColor: '#495057' },
  widthBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E2229',
  },
  selectedWidthBtn: { borderWidth: 1.5, borderColor: '#FFD43B' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#282C34',
    borderRadius: 10,
    padding: 18,
    gap: 12,
  },
  modalTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  modalInput: {
    backgroundColor: '#1E2229',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#495057',
    fontSize: 14,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  modalCancelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#495057' },
  modalCancelText: { color: '#FFF', fontWeight: '600' },
  modalSaveBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, backgroundColor: '#0066CC' },
  modalSaveText: { color: '#FFF', fontWeight: '700' },
  
});
