import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  ImageStyle,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle
} from 'react-native';
import { TaskPin } from './types';

interface Props {
  pins: TaskPin[];
  selectedPinId: string | null;
  toolMode: 'draw' | 'pin' | 'text' | 'erase' | 'pan';
  onSelectPin: (pinId: string) => void;
  onToggleStatus: (pinId: string) => void;
  onToggleVisibility: (pinId: string) => void;
  onToggleAllVisibility: (hideAll: boolean) => void;
  onUpdateTitle: (pinId: string, newTitle: string) => void;
  onUpdateType: (pinId: string, newType: string) => void;
  onDeletePin: (pinId: string) => void;
  onAddComment: (pinId: string, text: string) => void;
  onAddPhoto: (pinId: string, photoUri: string) => void;
  onRemovePhoto: (pinId: string, photoIndex: number) => void;
}

export default function TaskSidebar({
  pins,
  selectedPinId,
  toolMode,
  onSelectPin,
  onToggleStatus,
  onToggleVisibility,
  onToggleAllVisibility,
  onUpdateTitle,
  onUpdateType,
  onDeletePin,
  onAddComment,
  onAddPhoto,
  onRemovePhoto,
}: Props) {
  const [showrRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [targetIdVar, setTargetIdVar] = useState<string>(" ");
  const [commentText, setCommentText] = useState<string>('');
  const [typeTitle, setTypeTitle] = useState<string>('');
  const [typeDraft, setTypeDraft] = useState<string>('');
  const [previewPhotoUri, setPreviewPhotoUri] = useState<string | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  
  const selectedPin = pins.find((p) => p.id === selectedPinId);
  
  const webHoverProps = (id: TaskPin | undefined) =>
    Platform.OS === 'web'
      ? {
          onMouseEnter: () => setIsPressed(id === selectedPin),
          onMouseLeave: () => setIsPressed(false),
        }
      : {};

  useEffect(() => {
    setTypeTitle(selectedPin ? selectedPin.title || '' : '');
    setTypeDraft(selectedPin ? selectedPin.type || '' : '');
    setCommentText('');
  }, [selectedPinId]);

  const anyVisible = pins.some((p) => !p.hidden);

  const handlePostComment = (pinId: string) => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onAddComment(pinId, trimmed);
    setCommentText('');
  };

  const handlePickPhoto = async (pinId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      const asset = result.assets.at(0);
      if (asset?.uri) {
        onAddPhoto(pinId, asset.uri);
      }
    }
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View style={styles.headerTopRow}>
          <Text style={styles.sidebarTitle}>Sheet Tasks ({pins.length})</Text>
          {pins.length > 0 && (
            <TouchableOpacity
              style={styles.toggleAllBtn}
              onPress={() => onToggleAllVisibility(anyVisible)}
            >
              <Text style={styles.toggleAllText}>
                {anyVisible ? 'Hide All' : 'Show All'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.sidebarHint}>
          {toolMode === 'pin'
            ? 'Click anywhere on sheet to drop a pin'
            : 'Switch to "Task Pin" to add tasks'}
        </Text>
      </View>

      <FlatList
        data={pins}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.taskList}
        ListEmptyComponent={
          <Text style={styles.emptyTasks}>No task pins on this sheet yet.</Text>
        }
        renderItem={({ item }) => {
          const isSelected = item.id === selectedPinId;
          const isResolved = item.status === 'resolved';
          const isHidden = Boolean(item.hidden);
          const comments = item.comments || [];
          const photos = item.photos || [];
          const badgeColor = isSelected
            ? '#FFD43B'
            : isResolved
            ? '#2E7D32'
            : item.color;

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.taskCard,
                isSelected && styles.selectedTaskCard,
                isHidden && styles.hiddenTaskCard,
              ]}
              onPress={() => onSelectPin(item.id)}
            >
              <View style={styles.taskCardTop}>
                <View style={[styles.taskBadge, { borderColor: badgeColor }]}>
                  <Text style={[styles.taskBadgeText, { color: badgeColor }]}>
                    #{item.number}
                  </Text>
                </View>
               
                <View style={styles.titleBlock}>
                  <TouchableOpacity
                    style={{alignSelf: "flex-start"}}
                    onPress={() => {
                      isSelected ? onSelectPin('') : onSelectPin(item.id)
                      setTargetIdVar(item.id)
                      setShowRenameModal(true)
                    }}
                  >
                    <Text 
                      {...webHoverProps(item)} 
                      style={[styles.taskTitle, (isPressed && isSelected) && styles.taskTitleTextActive]} 
                      numberOfLines={1} 
                      ellipsizeMode="tail"
                    >
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                  
                  {item.type ? (
                    <Text style={styles.typePill}>{item.type}</Text>
                  ) : null}

                  
                </View>
              </View>

              <View style={styles.taskActions}>
                <TouchableOpacity
                  style={[
                    styles.statusPill,
                    isResolved ? styles.resolvedPill : styles.openPill,
                  ]}
                  onPress={() => onToggleStatus(item.id)}
                >
                  <Text style={styles.statusPillText}>
                    {isResolved ? 'Resolved' : 'Open'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.visBtn}
                  onPress={() => onToggleVisibility(item.id)}
                >
                  <Text style={styles.visBtnText}>
                    {isHidden ? 'Show Pin' : 'Hide Pin'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => onDeletePin(item.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>

              {isSelected && (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionLabel}>Type</Text>
                  <TextInput
                    style={styles.typeInput}
                    placeholder="e.g., Issue, Safety, Electrical..."
                    placeholderTextColor="#868E96"
                    value={typeDraft}
                    onChangeText={setTypeDraft}
                    onBlur={() => onUpdateType(item.id, typeDraft.trim())}
                    onSubmitEditing={() => onUpdateType(item.id, typeDraft.trim())}
                  />

                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionLabel}>
                      Photos ({photos.length})
                    </Text>
                    <TouchableOpacity
                      style={styles.addPhotoBtn}
                      onPress={() => handlePickPhoto(item.id)}
                    >
                      <Text style={styles.addPhotoBtnText}>+ Add Photo</Text>
                    </TouchableOpacity>
                  </View>

                  {photos.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.photoRow}
                    >
                      {photos.map((uri, idx) => (
                        <View key={`${uri}_${idx}`} style={styles.photoThumbWrap}>
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => setPreviewPhotoUri(uri)}
                          >
                            <Image
                              source={{ uri }}
                              style={styles.photoThumb}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.removePhotoBadge}
                            onPress={() => onRemovePhoto(item.id, idx)}
                          >
                            <Text style={styles.removePhotoText}>x</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}

                  <Text style={[styles.sectionLabel, { marginTop: 8 }]}>
                    Comments ({comments.length})
                  </Text>

                  {comments.map((c) => (
                    <View key={c.id} style={styles.commentBubble}>
                      <Text style={styles.commentText}>{c.text}</Text>
                      <Text style={styles.commentTime}>{c.createdAt}</Text>
                    </View>
                  ))}

                  <View style={styles.commentInputRow}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Write a note..."
                      placeholderTextColor="#868E96"
                      value={commentText}
                      onChangeText={setCommentText}
                      onSubmitEditing={() => handlePostComment(item.id)}
                    />
                    <TouchableOpacity
                      style={styles.postBtn}
                      onPress={() => handlePostComment(item.id)}
                    >
                      <Text style={styles.postBtnText}>Post</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={previewPhotoUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhotoUri(null)}
      >
        <View style={styles.lightboxBackdrop}>
          <View style={styles.lightboxTopBar}>
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={() => setPreviewPhotoUri(null)}
            >
              <Text style={styles.lightboxCloseText}>Close</Text>
            </TouchableOpacity>
          </View>

          {previewPhotoUri ? (
            <Image
              source={{ uri: previewPhotoUri }}
              style={styles.lightboxImage}
            />
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={showrRenameModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Task</Text>
            <Text style={styles.inputLabel}>Task Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter task name (e.g., Check electrical box)"
              placeholderTextColor="#868E96"
              value={typeTitle}
              onChangeText={setTypeTitle}
              maxLength={38}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => {
                  onUpdateTitle(targetIdVar, typeTitle.trim());
                  setShowRenameModal(false);
                }}
              >
                <Text style={styles.modalSaveText}>Rename Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface Styles {
  sidebar: ViewStyle;
  sidebarHeader: ViewStyle;
  headerTopRow: ViewStyle;
  sidebarTitle: TextStyle;
  toggleAllBtn: ViewStyle;
  toggleAllText: TextStyle;
  sidebarHint: TextStyle;
  taskList: ViewStyle;
  emptyTasks: TextStyle;
  taskCard: ViewStyle;
  selectedTaskCard: ViewStyle;
  hiddenTaskCard: ViewStyle;
  taskCardTop: ViewStyle;
  taskBadge: ViewStyle;
  taskBadgeText: TextStyle;
  titleBlock: ViewStyle;
  taskTitle: TextStyle;
  taskTitleTextActive: TextStyle;
  typePill: TextStyle;
  taskActions: ViewStyle;
  statusPill: ViewStyle;
  openPill: ViewStyle;
  resolvedPill: ViewStyle;
  statusPillText: TextStyle;
  visBtn: ViewStyle;
  visBtnText: TextStyle;
  deleteText: TextStyle;
  detailsSection: ViewStyle;
  sectionHeaderRow: ViewStyle;
  sectionLabel: TextStyle;
  typeInput: TextStyle;
  addPhotoBtn: ViewStyle;
  addPhotoBtnText: TextStyle;
  photoRow: ViewStyle;
  photoThumbWrap: ViewStyle;
  photoThumb: ImageStyle;
  removePhotoBadge: ViewStyle;
  removePhotoText: TextStyle;
  commentBubble: ViewStyle;
  commentText: TextStyle;
  commentTime: TextStyle;
  commentInputRow: ViewStyle;
  commentInput: TextStyle;
  postBtn: ViewStyle;
  postBtnText: TextStyle;
  lightboxBackdrop: ViewStyle;
  lightboxTopBar: ViewStyle;
  lightboxCloseBtn: ViewStyle;
  lightboxCloseText: TextStyle;
  lightboxImage: ImageStyle;
}

const styles = StyleSheet.create({
  sidebar: {
    width: 320,
    backgroundColor: '#252932',
    borderLeftWidth: 1,
    borderColor: '#3A3F4B',
  },
  sidebarHeader: {
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#3A3F4B',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  toggleAllBtn: {
    backgroundColor: '#3A3F4B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleAllText: { color: '#E9ECEF', fontSize: 11, fontWeight: '600' },
  sidebarHint: { color: '#ADB5BD', fontSize: 12, marginTop: 4 },
  taskList: { padding: 12, gap: 10 },
  emptyTasks: { color: '#868E96', textAlign: 'center', marginTop: 40, fontSize: 13 },
  taskCard: {
    backgroundColor: '#2F3440',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3E4452',
    gap: 10,
  },
  selectedTaskCard: {
    borderColor: '#FFD43B',
    backgroundColor: '#363C4A',
  },
  hiddenTaskCard: {
    opacity: 0.65,
  },
  taskCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  taskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  taskBadgeText: { fontWeight: '800', fontSize: 12 },
  titleBlock: { flex: 1, gap: 4 },
  taskTitle: { color: '#F8F9FA', fontWeight: '600', fontSize: 14, maxWidth: 150 },
  taskTitleTextActive: {color: '#54a3f7', textDecorationLine: 'underline'},
  typePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E2229',
    color: '#ADB5BD',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  openPill: { backgroundColor: '#4A2528' },
  resolvedPill: { backgroundColor: '#1B4332' },
  statusPillText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  visBtn: {
    backgroundColor: '#3A3F4B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  visBtnText: { color: '#E9ECEF', fontSize: 11, fontWeight: '600' },
  deleteText: { color: '#FF8787', fontSize: 12, fontWeight: '600' },
  detailsSection: {
    borderTopWidth: 1,
    borderColor: '#495057',
    paddingTop: 10,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionLabel: {
    color: '#ADB5BD',
    fontSize: 12,
    fontWeight: '700',
  },
  typeInput: {
    backgroundColor: '#1E2229',
    color: '#FFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#495057',
  },
  addPhotoBtn: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addPhotoBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  photoRow: { gap: 8, paddingVertical: 4 },
  photoThumbWrap: { position: 'relative' },
  photoThumb: {
    width: 68,
    height: 68,
    borderRadius: 6,
    backgroundColor: '#1E2229',
    borderWidth: 1,
    borderColor: '#495057',
  },
  removePhotoBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  commentBubble: {
    backgroundColor: '#252932',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#3E4452',
    gap: 4,
  },
  commentText: { color: '#F8F9FA', fontSize: 13 },
  commentTime: { color: '#868E96', fontSize: 10 },
  commentInputRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  commentInput: {
    flex: 1,
    backgroundColor: '#1E2229',
    color: '#FFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#495057',
  },
  postBtn: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lightboxTopBar: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  lightboxCloseBtn: {
    backgroundColor: '#3A3F4B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  lightboxCloseText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  lightboxImage: {
    width: '90%',
    height: '80%',
    resizeMode: 'contain',
  },


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
