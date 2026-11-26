import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

const COLORS = Array.of('#E53935', '#1E88E5', '#43A047', '#FB8C00', '#000000');
const WIDTHS = Array.of(3, 6, 10, 16);
const FONT_SIZES = Array.of(12, 16, 22, 30);

export default function SheetEditor({sheet, startingTaskNumber, onSaveAndClose }: Props) {
  const [selectedFontSize, setSelectedFontSize] = useState<number>(16);
  const [toolMode, setToolMode] = useState<'draw' | 'pin' | 'text' | 'erase' | 'pan'>('draw');
  const toolModeRef = useRef<'draw' | 'pin' | 'text' | 'erase' | 'pan'>(toolMode);
  toolModeRef.current = toolMode;



  // History Stacks
  type HistoryAction =
  | { kind: 'stroke'; item: Stroke }
  | { kind: 'text'; item: TextNote };

  const [undoStack, setUndoStack] = useState<HistoryAction[]>(Array.of());
  const [redoStack, setRedoStack] = useState<HistoryAction[]>(Array.of());


  // Text annotations state
  const [textNotes, setTextNotes] = useState<TextNote[]>(sheet.textNotes || Array.of());
  const [pendingTextCoords, setPendingTextCoords] = useState<{ x: number; y: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInputDraft, setTextInputDraft] = useState<string>('');
  const textInputRef = useRef<any>(null);

  useEffect(() => {
    if (pendingTextCoords) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [pendingTextCoords]);


  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [currentTaskNumber, setCurrentTaskNumber] = useState<number>(startingTaskNumber);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Freehand strokes state
  const [paths, setPaths] = useState<Stroke[]>(sheet.strokes);
  const [currentPath, setCurrentPath] = useState<string>('');

  // Task pins state
  const [pins, setPins] = useState<TaskPin[]>(sheet.pins || Array.of());
  const [deletedPins, setDeletedPins] = useState<TaskPin[]>(Array.of());
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [pinToDelete, setPinToDelete] = useState<TaskPin | null>(null);
  const [pendingPinCoords, setPendingPinCoords] = useState<{ x: number; y: number } | null>(null);
  const [taskTitleInput, setTaskTitleInput] = useState<string>('');
  const [taskTypeInput, setTaskTypeInput] = useState<string>('Issue');

  // Brush settings
  const [selectedColor, setSelectedColor] = useState<string>('#E53935');
  const [selectedWidth, setSelectedWidth] = useState<number>(6);

  const [boardSize, setBoardSize] = useState({
    width: sheet.boardWidth || sheet.width,
    height: sheet.boardHeight || sheet.height,
  });

  // Live refs for PanResponder coordinate sync
  const stageRef = useRef<any>(null);
  const stageRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const boardSizeRef = useRef(boardSize);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const currentPathRef = useRef<string>('');
  const colorRef = useRef<string>(selectedColor);
  const widthRef = useRef<number>(selectedWidth);
  const pendingTextCoordsRef = useRef(pendingTextCoords);
  pendingTextCoordsRef.current = pendingTextCoords;



  boardSizeRef.current = boardSize;
  zoomRef.current = zoom;
  panRef.current = pan;
  colorRef.current = selectedColor;
  widthRef.current = selectedWidth;
  toolModeRef.current = toolMode;

  const updateStageRect = () => {
    if (stageRef.current && stageRef.current.measureInWindow) {
      stageRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        stageRectRef.current = { x, y, width, height };
      });
    }
  };

  const getBoardCoordinates = (pageX: number, pageY: number) => {
    const rect = stageRectRef.current;
    const bSize = boardSizeRef.current;
    const z = zoomRef.current;
    const p = panRef.current;

    const pointerInStageX = pageX - rect.x;
    const pointerInStageY = pageY - rect.y;

    const stageCenterX = rect.width / 2;
    const stageCenterY = rect.height / 2;

    const unscaledX = bSize.width / 2 + (pointerInStageX - stageCenterX - p.x) / z;
    const unscaledY = bSize.height / 2 + (pointerInStageY - stageCenterY - p.y) / z;

    return {
      x: Math.max(0, Math.min(bSize.width, unscaledX)),
      y: Math.max(0, Math.min(bSize.height, unscaledY)),
    };
  };

  const handleZoomIn = () => setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const eraseAtPoint = (x: number, y: number) => {
    const hitRadius = 16;

    // 1. Check if cursor touches any stroke point ("M x y L x y ...")
    setPaths((prev) =>
      prev.filter((stroke) => {
        const coords = stroke.path.match(/-?\d+(\.\d+)?/g);
        if (!coords) return true;
        for (let i = 0; i < coords.length - 1; i += 2) {
          const px = parseFloat(coords[i]);
          const py = parseFloat(coords[i + 1]);
          if (Math.hypot(px - x, py - y) <= hitRadius + stroke.strokeWidth / 2) {
            return false; // Hit! Remove this stroke
          }
        }
        return true;
      })
    );

    // 2. Check if cursor touches any placed text note
    setTextNotes((prev) =>
      prev.filter((note) => Math.hypot(note.x + 20 - x, note.y - y) > hitRadius + 10)
    );
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !pendingTextCoordsRef.current,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        updateStageRect();

        if (toolModeRef.current === 'pan') {
          dragStartRef.current = { x: panRef.current.x, y: panRef.current.y };
          return;
        }

        const { pageX, pageY } = evt.nativeEvent;
        const coords = getBoardCoordinates(pageX, pageY);
        if (toolModeRef.current === 'erase') {
          eraseAtPoint(coords.x, coords.y);
          return;
        }
        
        if (toolModeRef.current === 'pin') {
          setPendingPinCoords({ x: coords.x, y: coords.y });
          setTaskTitleInput('');
          setTaskTypeInput('Issue');
          return;
        }
        
        // If user was typing inline text and clicks elsewhere, commit it first!
        if (pendingTextCoords) {
          handleSaveTextNote();
          if (toolModeRef.current !== 'text') return;
        }

        if (toolModeRef.current === 'text') {
          setEditingTextId(null);
          setPendingTextCoords({ x: coords.x, y: coords.y });
          setTextInputDraft('');
          return;
        }



        const start = `M ${coords.x.toFixed(1)} ${coords.y.toFixed(1)}`;
        currentPathRef.current = start;
        setCurrentPath(start);
      },

      onPanResponderMove: (evt, gestureState) => {
        if (toolModeRef.current === 'pan') {
          setPan({
            x: dragStartRef.current.x + gestureState.dx,
            y: dragStartRef.current.y + gestureState.dy,
          });
          return;
        }
        if (toolModeRef.current === 'erase') {
          const { pageX, pageY } = evt.nativeEvent;
          const coords = getBoardCoordinates(pageX, pageY);
          eraseAtPoint(coords.x, coords.y);
          return;
        }
        if (toolModeRef.current !== 'draw') return;
        const { pageX, pageY } = evt.nativeEvent;
        const coords = getBoardCoordinates(pageX, pageY);
        const next = ` L ${coords.x.toFixed(1)} ${coords.y.toFixed(1)}`;
        currentPathRef.current += next;
        setCurrentPath(currentPathRef.current);
      },

      onPanResponderRelease: () => {
        if (toolModeRef.current !== 'draw') return;
        if (currentPathRef.current) {
          const newStroke: Stroke = {
            path: currentPathRef.current,
            color: colorRef.current,
            strokeWidth: widthRef.current,
          };
          setPaths((prev) => [...prev, newStroke]);
          setUndoStack((prev) => [...prev, { kind: 'stroke', item: newStroke }]);
          setRedoStack(Array.of());
          currentPathRef.current = '';
          setCurrentPath('');
        }
      },
    })
  ).current;

  const handleConfirmNewPin = () => {
    if (!pendingPinCoords) return;
    const cleanTitle = taskTitleInput.trim() || `Task #${currentTaskNumber}`;
    const cleanType = taskTypeInput.trim();
    const newPin: TaskPin = {
      id: `pin_${Date.now()}`,
      number: currentTaskNumber,
      x: pendingPinCoords.x,
      y: pendingPinCoords.y,
      title: cleanTitle,
      type: cleanType,
      status: 'open',
      color: selectedColor,
      hidden: false,
      comments: Array.of(),
      photos: Array.of(),
    };

    setPins((prev) => [...prev, newPin]);
    setCurrentTaskNumber((prev) => prev + 1);
    setSelectedPinId(newPin.id);
    setPendingPinCoords(null);
    setTaskTitleInput('');
    setTaskTypeInput('Issue');
    setSidebarOpen(true);
  };

  const handleSaveTextNote = () => {
    const clean = textInputDraft.trim();
    if (!clean) {
      setPendingTextCoords(null);
      setEditingTextId(null);
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
      setUndoStack((prev) => [...prev, { kind: 'text', item: newNote }]);
      setRedoStack(Array.of());
    }

    setPendingTextCoords(null);
    setEditingTextId(null);
    setTextInputDraft('');
  };

  const handleDeleteTextNote = () => {
    if (!editingTextId) return;
    setTextNotes((prev) => prev.filter((t) => t.id !== editingTextId));
    setPendingTextCoords(null);
    setEditingTextId(null);
    setTextInputDraft('');
  };


  const handleTogglePinStatus = (pinId: string) => {
    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId
          ? { ...p, status: p.status === 'open' ? 'resolved' : 'open' }
          : p
      )
    );
  };

  const handleUpdatePinTitle = (pinId: string, newTitle: string) => {
    const cleanTitle = newTitle.trim() || `Task #${currentTaskNumber}`;
    setPins((prev) =>
      prev.map((p) => (p.id === pinId ? { ...p, title: cleanTitle } : p))
    );
  };

  const handleUpdatePinType = (pinId: string, newType: string) => {
    const cleanType = newType.trim() || 'Issue';
    setPins((prev) =>
      prev.map((p) => (p.id === pinId ? { ...p, type: cleanType } : p))
    );
  };

  const handleTogglePinVisibility = (pinId: string) => {
    setPins((prev) =>
      prev.map((p) => (p.id === pinId ? { ...p, hidden: !p.hidden } : p))
    );
  };

  const handleToggleAllVisibility = (hideAll: boolean) => {
    setPins((prev) => prev.map((p) => ({ ...p, hidden: hideAll })));
  };

  const handleRequestDeletePin = (pinId: string) => {
    const target = pins.find((p) => p.id === pinId);
    if (target) setPinToDelete(target);
  };

  const handleConfirmDeletePin = () => {
    if (!pinToDelete) return;
    setDeletedPins((prev) => [...prev, pinToDelete]);
    setPins((prev) => prev.filter((p) => p.id !== pinToDelete.id));
    if (selectedPinId === pinToDelete.id) setSelectedPinId(null);
    setPinToDelete(null);
  };

  const handleRestoreLastPin = () => {
    const lastDeleted = deletedPins.at(-1);
    if (!lastDeleted) return;
    setDeletedPins((prev) => prev.slice(0, -1));
    setPins((prev) =>
      [...prev, { ...lastDeleted, hidden: false }].sort((a, b) => a.number - b.number)
    );
    setSelectedPinId(lastDeleted.id);
  };

  const handleAddComment = (pinId: string, text: string) => {
    const newComment = {
      id: `cmt_${Date.now()}`,
      text,
      createdAt: new Date().toLocaleString(),
    };
    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId
          ? { ...p, comments: [...(p.comments || Array.of()), newComment] }
          : p
      )
    );
  };

  const handleAddPhoto = (pinId: string, photoUri: string) => {
    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId
          ? { ...p, photos: [...(p.photos || Array.of()), photoUri] }
          : p
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

  const handleUndo = () => {
    const lastAction = undoStack.at(-1);
    if (!lastAction) return;

    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, lastAction]);

    if (lastAction.kind === 'stroke') {
      setPaths((prev) => prev.slice(0, -1));
    } else {
      setTextNotes((prev) => prev.filter((t) => t.id !== lastAction.item.id));
    }
  };

  const handleRedo = () => {
    const nextAction = redoStack.at(-1);
    if (!nextAction) return;

    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, nextAction]);

    if (nextAction.kind === 'stroke') {
      setPaths((prev) => [...prev, nextAction.item]);
    } else {
      setTextNotes((prev) => [...prev, nextAction.item]);
    }
  };


  const visiblePins = pins.filter((p) => !p.hidden);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() =>
            onSaveAndClose(paths, pins, textNotes, boardSize.width, boardSize.height, currentTaskNumber)
          }
        >
          <Text style={styles.backBtnText}>Done & Save</Text>
        </TouchableOpacity>

        {/* Tool Mode Switcher */}
        <View style={styles.modeSwitcher}>
          <TouchableOpacity
            style={[styles.modeBtn, toolMode === 'draw' && styles.activeModeBtn]}
            onPress={() => setToolMode('draw')}
          >
            <Text style={styles.modeBtnText}>Pen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, toolMode === 'erase' && styles.activeModeBtn]}
            onPress={() => setToolMode('erase')}
          >
            <Text style={styles.modeBtnText}>Eraser</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, toolMode === 'pin' && styles.activeModeBtn]}
            onPress={() => setToolMode('pin')}
          >
            <Text style={styles.modeBtnText}>Task Pin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, toolMode === 'text' && styles.activeModeBtn]}
            onPress={() => setToolMode('text')}
          >
            <Text style={styles.modeBtnText}>Text</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, toolMode === 'pan' && styles.activeModeBtn]}
            onPress={() => setToolMode('pan')}
          >
            <Text style={styles.modeBtnText}>Pan</Text>
          </TouchableOpacity>
        </View>

        {/* Zoom Controls */}
        <View style={styles.modeSwitcher}>
          <TouchableOpacity style={styles.modeBtn} onPress={handleZoomOut}>
            <Text style={styles.modeBtnText}>-</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modeBtn} onPress={handleResetZoom}>
            <Text style={styles.modeBtnText}>{Math.round(zoom * 100)}%</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modeBtn} onPress={handleZoomIn}>
            <Text style={styles.modeBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Undo / Redo / Restore / Sidebar Toggle */}
        <View style={styles.historyGroup}>
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

          {deletedPins.length > 0 && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.restoreBtn]}
              onPress={handleRestoreLastPin}
            >
              <Text style={styles.btnText}>
                Restore Pin #{deletedPins.at(-1)?.number}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, sidebarOpen && styles.activeSidebarBtn]}
            onPress={() => setSidebarOpen((prev) => !prev)}
          >
            <Text style={styles.btnText}>Tasks ({pins.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Workspace */}
      <View style={styles.workspace}>
        <View
          ref={stageRef}
          onLayout={updateStageRect}
          style={styles.stage}
          {...panResponder.panHandlers}
          // @ts-ignore - onWheel supported on React Native Web
          onWheel={(e: any) => {
            e.preventDefault();
            if (e.deltaY < 0) handleZoomIn();
            else handleZoomOut();
          }}
        >
          <View
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (width > 0 && height > 0) setBoardSize({ width, height });
              updateStageRect();
            }}
            style={[
              styles.sheetBoard,
              {
                aspectRatio: sheet.width / sheet.height,
                transform: Array.of(
                  { translateX: pan.x },
                  { translateY: pan.y },
                  { scale: zoom }
                ),
              },
            ]}
          >
            <Image
              source={{ uri: sheet.fullImageUri }}
              style={styles.sheetImage}
              resizeMode="contain"
            />

            <Svg
              width="100%"
              height="100%"
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              {paths.map((item, idx) => (
                <Path
                  key={idx}
                  d={item.path}
                  stroke={item.color}
                  strokeWidth={item.strokeWidth}
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
              ) : undefined}
            </Svg>

            {/* Transparent Ring Pins */}
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

            {textNotes.map((note) => (
              <TouchableOpacity
                key={note.id}
                onPress={() => {
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
                <Text style={{ color: note.color, fontSize: note.fontSize, fontWeight: '700' }}>
                  {note.text}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Live Indicator & Typing Preview at the Exact Clicked Spot */}
            {/* MS Paint-Style Inline Text Box + Anchor Circle Indicator */}
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
                {/* Glowing Anchor Circle Indicator */}
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: selectedColor,
                    backgroundColor: 'transparent',
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
                    minWidth: 120,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: selectedColor,
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
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

        {sidebarOpen && (
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
        )}
      </View>

      {/* Bottom Toolbar */}
      <View style={styles.toolbar}>
        {/* Left: Active Color Picker (works for Pen, Pins, and Text) */}
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

        {/* Right: Shows Text Font Sizes in Text Mode, or Brush Widths in Pen Mode */}
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
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>
                  {size}px
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.toolGroup}>
            {WIDTHS.map((width) => (
              <TouchableOpacity
                key={width}
                onPress={() => setSelectedWidth(width)}
                style={[
                  styles.widthBtn,
                  selectedWidth === width && styles.selectedWidthBtn,
                ]}
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


      {/* New Task Pin Naming & Type Modal */}
      <Modal
        visible={pendingPinCoords !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingPinCoords(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Task Pin #{currentTaskNumber}</Text>

            <Text style={styles.inputLabel}>Task Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter task name (e.g., Check electrical box)"
              placeholderTextColor="#868E96"
              value={taskTitleInput}
              onChangeText={setTaskTitleInput}
              autoFocus
            />

            <Text style={styles.inputLabel}>Type (e.g., Issue, Task, Safety, RFI)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter pin type (default: Issue)"
              placeholderTextColor="#868E96"
              value={taskTypeInput}
              onChangeText={setTaskTypeInput}
              onSubmitEditing={handleConfirmNewPin}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPendingPinCoords(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleConfirmNewPin}
              >
                <Text style={styles.modalSaveText}>Create Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={pinToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPinToDelete(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Task #{pinToDelete?.number}?</Text>
            <Text style={styles.modalBodyText}>
              Are you sure you want to delete "{pinToDelete?.title}"? You can restore it before saving this sheet.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPinToDelete(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteBtn}
                onPress={handleConfirmDeletePin}
              >
                <Text style={styles.modalSaveText}>Yes, Delete</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#282C34',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#3A3F4B',
    flexWrap: 'wrap',
    gap: 8,
  },
  backBtn: {
    backgroundColor: '#0066CC',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  backBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#181A1F',
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  modeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeModeBtn: { backgroundColor: '#0066CC' },
  modeBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  historyGroup: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    backgroundColor: '#3A3F4B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  restoreBtn: { backgroundColor: '#2E7D32' },
  activeSidebarBtn: { backgroundColor: '#0066CC' },
  disabledBtn: { opacity: 0.35 },
  btnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  workspace: { flex: 1, flexDirection: 'row' },
  stage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    overflow: 'hidden',
  },
  sheetBoard: {
    height: '100%',
    maxWidth: '100%',
    backgroundColor: '#FFF',
    borderRadius: 4,
    overflow: 'hidden',
    userSelect: 'none',
  },
  sheetImage: {
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
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
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#282C34',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 20,
    borderTopWidth: 1,
    borderColor: '#3A3F4B',
  },
  toolGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { width: 1, height: 26, backgroundColor: '#495057' },
  colorCircle: { width: 28, height: 28, borderRadius: 14 },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: Array.of({ scale: 1.15 }),
  },
  widthBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3A3F4B',
  },
  selectedWidthBtn: { borderWidth: 2, borderColor: '#FFFFFF' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#282C34',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3A3F4B',
    gap: 12,
  },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  inputLabel: { color: '#ADB5BD', fontSize: 12, fontWeight: '600', marginBottom: -6 },
  modalBodyText: { color: '#CED4DA', fontSize: 14, lineHeight: 20 },
  modalInput: {
    backgroundColor: '#1E2229',
    color: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#495057',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: '#ADB5BD', fontWeight: '600' },
  modalSaveBtn: {
    backgroundColor: '#0066CC',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalDeleteBtn: {
    backgroundColor: '#C92A2A',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalSaveText: { color: '#FFF', fontWeight: '700' },
});
