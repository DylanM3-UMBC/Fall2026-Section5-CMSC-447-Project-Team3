import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { exportSheetsToPdf } from '../../../components/project_ant_src/pdfExporter';
import PdfRenderBridge from '../../../components/project_ant_src/pdfRenderBridge';
import { splitPdfIntoSheets } from '../../../components/project_ant_src/pdfSplitter';
import SheetEditor from '../../../components/project_ant_src/SheetEditor';
import { Project, Stroke, TaskPin } from '../../../components/project_ant_src/types';

export default function my_projects_page() {
  const [showPreview, setShowPreview] = useState(false);
  const [targetIdVar, setTargetIdVar] = useState<string>(" ");
  const [targetIDTitleVar, setTargetIDTitleVar] = useState<string>(" ");

  // Level 1 State: List of all projects
  const [projects, setProjects] = useState<Project[]>(Array.of());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState<boolean>(false);
  const [pendingMobilePdf, setPendingMobilePdf] = useState<{
    base64: string;
    baseName: string;
  } | null>(null);


  // New Project Modal State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');

  // Loading / Processing State
  const [isSplitting, setIsSplitting] = useState<boolean>(false);
  const [progress, setProgress] = useState<string>('');

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const activeSheet = activeProject?.sheets.find((s) => s.id === activeSheetId) || null;
  
  // Delete a project from the dashboard
  const handleDeleteProject = (projectId: string, projectName: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
      setActiveSheetId(null);
    }

    setShowPreview(false);
  };


  // Delete an individual split sheet from the active project
  const handleDeleteSheet = (sheetId: string, sheetTitle?: string) => {
    if (!activeProject) return;

    const targetTitle = 
      sheetTitle ||
      activeProject.sheets.find((s) => s.id === sheetId)?.title ||
      'this sheet';

    setProjects((prev) =>
      prev.map((proj) =>
        proj.id === activeProject.id
          ? { ...proj, sheets: proj.sheets.filter((s) => s.id !== sheetId) }
          : proj
      )
    );
    if (activeSheetId === sheetId) {
      setActiveSheetId(null);
    }
  };

  // Share a project from the dashboard
  const handleShareProject = async (project: Project) => {
    try {
      if (project.sheets.length > 0) {
        setIsSplitting(true);
        setProgress(`Preparing "${project.name}" to share...`);
        await exportSheetsToPdf(project.sheets, (current, total) =>
          setProgress(`Rendering report ${current} of ${total}...`)
        );
      } else {
        const totalTasks = project.sheets.reduce(
          (sum, s) => sum + (s.pins?.length || 0),
          0
        );
        const summary = `Project: ${project.name}\nCreated: ${project.createdAt}\nSheets: ${project.sheets.length}\nTotal Tasks: ${totalTasks}`;
        if (Platform.OS === 'web') {
          if (navigator.share) {
            await navigator.share({ title: project.name, text: summary });
          } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(summary);
            alert('Project summary copied to clipboard!');
          } else {
            alert(summary);
          }
        } else {
          await Share.share({ title: project.name, message: summary });
        }
      }
    } catch (error: any) {
      console.error('Share failed:', error);
      alert(`Share Error: ${error?.message || error}`);
    } finally {
      setIsSplitting(false);
      setProgress('');
    }
  };

  // Create a brand new project card starting with nextTaskNumber = 1
  const handleCreateProject = () => {
    const cleanName = newProjectName.trim() || `Project #${projects.length + 1}`;
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: cleanName,
      createdAt: new Date().toLocaleDateString(),
      sheets: Array.of(),
      nextTaskNumber: 1,
    };

    setProjects((prev) => [...prev, newProject]);
    setNewProjectName('');
    setIsNewProjectModalOpen(false);
    setActiveProjectId(newProject.id);
  };

  // Upload & split a PDF inside the currently open project
  const handleUploadPdf = async () => {
    if (!activeProject) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];

      if (Platform.OS !== 'web') {
        console.log('1. Mobile PDF picked:', asset.name, asset.uri);
        setIsProcessingPdf(true);
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });
        console.log('2. Base64 length:', base64.length);
        const baseName = asset.name.replace(/\.pdf$/i, '');
        setPendingMobilePdf({ base64, baseName });
        return;
      }

      
      const file = result.assets.at(0)!;
      setIsSplitting(true);
      setProgress('Opening PDF...');

      const newSheets = await splitPdfIntoSheets(
        file.uri,
        file.name,
        (current, total) => setProgress(`Splitting page ${current} of ${total}...`)
      );

      setProjects((prev) =>
        prev.map((proj) =>
          proj.id === activeProject.id
            ? { ...proj, sheets: [...proj.sheets, ...newSheets] }
            : proj
        )
      );
    } catch (error: any) {
      console.error('PDF split failed:', error);
      alert(`Error: ${error?.message || error}`);
    } finally {
      setIsSplitting(false);
      setProgress('');
    }
    
  };

  // Save strokes, task pins, and updated task counter back to the active project
  const handleSaveSheetData = (
    sheetId: string,
    updatedStrokes: Stroke[],
    updatedPins: TaskPin[],
    boardWidth: number,
    boardHeight: number,
    updatedNextNumber: number
  ) => {
    if (!activeProject) return;

    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProject.id) return proj;
        return {
          ...proj,
          nextTaskNumber: updatedNextNumber,
          sheets: proj.sheets.map((sheet) =>
            sheet.id === sheetId
              ? {
                  ...sheet,
                  strokes: updatedStrokes,
                  pins: updatedPins,
                  boardWidth,
                  boardHeight,
                }
              : sheet
          ),
        };
      })
    );
    setActiveSheetId(null);
  };

  // Export only the currently open project's task report PDF
  const handleExportProjectPdf = async () => {
    if (!activeProject || activeProject.sheets.length === 0) return;
    try {
      setIsSplitting(true);
      setProgress('Building project task report PDF...');
      await exportSheetsToPdf(activeProject.sheets, (current, total) =>
        setProgress(`Rendering report ${current} of ${total}...`)
      );
    } catch (error: any) {
      console.error('Export failed:', error);
      alert(`Export Error: ${error?.message || error}`);
    } finally {
      setIsSplitting(false);
      setProgress('');
    }
  };

  // =========================================================================
  // LEVEL 3: SHEET EDITOR (Annotate & Drop Task Pins inside Active Project)
  // =========================================================================
  if (activeProject && activeSheet) {
    return (
      <SheetEditor
        sheet={activeSheet}
        startingTaskNumber={activeProject.nextTaskNumber}
        onDeleteSheet={(sheetId) => handleDeleteSheet(sheetId, activeSheet.title)}  
        onSaveAndClose={(
          updatedStrokes,
          updatedPins,
          updatedTextNotes,
          boardWidth,
          boardHeight,
          updatedNextNumber
        ) => {
          setProjects((prev) =>
            prev.map((proj) =>
              proj.id === activeProject.id
                ? {
                    ...proj,
                    nextTaskNumber: updatedNextNumber,
                    sheets: proj.sheets.map((s) =>
                      s.id === activeSheet.id
                        ? {
                            ...s,
                            strokes: updatedStrokes,
                            pins: updatedPins,
                            textNotes: updatedTextNotes,
                            boardWidth,
                            boardHeight,
                          }
                        : s
                    ),
                  }
                : proj
            )
          );
          setActiveSheetId(null);
        }}
      />
    );
  }

  // =========================================================================
  // LEVEL 2: PROJECT WORKSPACE (Sheets Grid for the Selected Project)
  // =========================================================================
  if (activeProject) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                setActiveSheetId(null);
                setActiveProjectId(null);
              }}
            >
              <Text style={styles.backBtnText}>← All Projects</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>{activeProject.name}</Text>
              <Text style={styles.subtitle}>
                {activeProject.sheets.length} sheet(s) • Next Task #
                {activeProject.nextTaskNumber}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {activeProject.sheets.length > 0 && (
              <TouchableOpacity
                style={[styles.uploadBtn, styles.exportBtn]}
                onPress={handleExportProjectPdf}
                disabled={isSplitting}
              >
                <Text style={styles.uploadBtnText}>Generate Task Report</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handleUploadPdf}
              disabled={isSplitting}
            >
              <Text style={styles.uploadBtnText}>+ Upload PDF</Text>
            </TouchableOpacity>
          </View>

          {pendingMobilePdf && (
            <PdfRenderBridge
              pdfBase64={pendingMobilePdf.base64}
              baseName={pendingMobilePdf.baseName}
              onComplete={(renderedSheets) => {
                setProjects((prev) =>
                  prev.map((proj) =>
                    proj.id === activeProject.id
                      ? { ...proj, sheets: [...proj.sheets, ...renderedSheets] }
                      : proj
                  )
                );
                setPendingMobilePdf(null);
                setIsProcessingPdf(false);
              }}
              onError={(errMsg) => {
                alert('Could not render PDF pages: ' + errMsg);
                setPendingMobilePdf(null);
                setIsProcessingPdf(false);
              }}
            />
         )}
        </View>

        {isSplitting && (
          <View style={styles.progressBox}>
            <ActivityIndicator size="small" color="#0066CC" />
            <Text style={styles.progressText}>{progress}</Text>
          </View>
        )}

        <FlatList
          data={activeProject.sheets}
          numColumns={3}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            !isSplitting ? (
              <Text style={styles.emptyText}>
                Click "+ Upload PDF" to add blueprint sheets to "{activeProject.name}".
              </Text>
            ) : undefined
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                onPress={() => setActiveSheetId(item.id)}
              >
                <Image source={{ uri: item.thumbnailUri }} style={styles.thumbnail} />
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardSub}>
                  {item.strokes.length > 0 || (item.pins?.length || 0) > 0
                    ? `${item.strokes.length} markup(s) • ${item.pins?.length || 0} task(s)`
                    : 'Tap to annotate'}
                </Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.deleteCardBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      setTargetIdVar(item.id);
                      setTargetIDTitleVar(item.title);
                      setShowPreview(true);
                    }}
                  >
                    <Text style={styles.deleteCardBtnText}>Delete Sheet</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              <Modal visible={showPreview} transparent animationType="fade">
                <View style={styles.modalContainer}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitleTwo}>Delete Sheets</Text>
                    <Text style={styles.descriptionInput}>
                      Are you sure you want to delete "{targetIDTitleVar?.length > 60 ? `${targetIDTitleVar.slice(0, 60)}...` : targetIDTitleVar}" and all its annotations?
                    </Text>
                    <View style={styles.modalButtonsTwo}>
                      <TouchableOpacity 
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={() => {
                        setShowPreview(false);
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.modalButton, styles.DeleteButton]}
                        onPress={() => {
                        handleDeleteSheet(targetIdVar, targetIDTitleVar);
                        setShowPreview(false);
                        }}
                      >
                        <Text style={styles.DeleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>
          )}
        />
      </View>
    );
  }

  // =========================================================================
  // LEVEL 1: PROJECTS DASHBOARD (Create & Select Project Boxes)
  // =========================================================================
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Projects ({projects.length})</Text>
          <Text style={styles.subtitle}>
            Select a project workspace or create a new one
          </Text>
        </View>

        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => {
            setNewProjectName('');
            setIsNewProjectModalOpen(true);
          }}
        >
          <Text style={styles.uploadBtnText}>+ New Project</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        numColumns={3}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No projects yet. Click "+ New Project" to create your first workspace!
          </Text>
        }
        renderItem={({ item }) => {
          const totalTasks = item.sheets.reduce(
            (sum, s) => sum + (s.pins?.length || 0),
            0
          );
          const coverThumbnail = item.sheets.at(0)?.thumbnailUri;

          return (
            <View style={styles.projectCard}>
              <TouchableOpacity
                onPress={() => setActiveProjectId(item.id)}
              >
                {coverThumbnail ? (
                  <Image
                    source={{ uri: coverThumbnail }}
                    style={styles.projectCover}
                  />
                ) : (
                  <View style={styles.projectPlaceholder}>
                    <Text style={styles.projectPlaceholderIcon}>📁</Text>
                    <Text style={styles.projectPlaceholderText}>Empty Project</Text>
                  </View>
                )}

                <Text style={styles.projectTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.projectMeta}>
                  {item.sheets.length} sheet(s) • {totalTasks} task(s)
                </Text>
                <Text style={styles.projectDate}>Created {item.createdAt}</Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.shareCardBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleShareProject(item);
                    }}
                  >
                    <Text style={styles.shareCardBtnText}>Share</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteCardBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      setTargetIdVar(item.id);
                      setTargetIDTitleVar(item.name);
                      setShowPreview(true);
                    }}
                  >
                    <Text style={styles.deleteCardBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              <Modal visible={showPreview} transparent animationType="fade">
                <View style={styles.modalContainer}>
                  <View style={styles.modalContent}>
                      <Text style={styles.modalTitleTwo}>Delete Project</Text>
                      <Text style={styles.descriptionInput}>
                        Are you sure you want to delete "{targetIDTitleVar?.length > 60 ? `${targetIDTitleVar.slice(0, 60)}...` : targetIDTitleVar}" and all its sheets?
                      </Text>
                      <View style={styles.modalButtonsTwo}>
                        <TouchableOpacity 
                          style={[styles.modalButton, styles.cancelButton]}
                          onPress={() => {
                          setShowPreview(false);
                          }}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.modalButton, styles.DeleteButton]}
                          onPress={() => {
                          handleDeleteProject(targetIdVar, targetIDTitleVar);
                          setShowPreview(false);
                          }}
                        >
                          <Text style={styles.DeleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                  </View>
                </View>
              </Modal>
            </View>
          );
        }}
      />

      {/* New Project Modal */}
      <Modal
        visible={isNewProjectModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNewProjectModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create New Project</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Project name (e.g., Building A Renovation)"
              placeholderTextColor="#868E96"
              value={newProjectName}
              onChangeText={setNewProjectName}
              autoFocus
              onSubmitEditing={handleCreateProject}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsNewProjectModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleCreateProject}
              >
                <Text style={styles.modalSaveText}>Create Project</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8', padding: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerActions: { flexDirection: 'row', gap: 10 },
  backBtn: {
    backgroundColor: '#E9ECEF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CED4DA',
  },
  backBtnText: { color: '#212529', fontWeight: '700', fontSize: 14 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1F24' },
  subtitle: { fontSize: 13, color: '#6C757D', marginTop: 2 },
  uploadBtn: {
    backgroundColor: '#0066CC',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  exportBtn: { backgroundColor: '#2E7D32' },
  uploadBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
  },
  progressText: { color: '#004C99', fontWeight: '600' },
  grid: { gap: 16 },
  emptyText: { textAlign: 'center', color: '#6C757D', marginTop: 80, fontSize: 16 },
  card: {
    flex: 1,
    maxWidth: 260,
    margin: 8,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDE2E7',
  },
  thumbnail: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    backgroundColor: '#EAECEF',
    borderRadius: 6,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1A1F24' },
  cardSub: { fontSize: 12, color: '#0066CC', marginTop: 4 },
  projectCard: {
    flex: 1,
    maxWidth: 280,
    margin: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDE2E7',
  },
  projectCover: {
    width: '100%',
    height: 160,
    resizeMode: 'contain',
    backgroundColor: '#EAECEF',
    borderRadius: 8,
    marginBottom: 12,
  },
  projectPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#F1F3F5',
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  projectPlaceholderIcon: { fontSize: 32 },
  projectPlaceholderText: { fontSize: 13, color: '#868E96', fontWeight: '600' },
  projectTitle: { fontSize: 16, fontWeight: '700', color: '#1A1F24' },
  projectMeta: { fontSize: 13, color: '#0066CC', fontWeight: '600', marginTop: 4 },
  projectDate: { fontSize: 12, color: '#868E96', marginTop: 4 },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F2',
  },
  shareCardBtn: {
    flex: 1,
    backgroundColor: '#E6F0FA',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#B8D4F5',
  },
  shareCardBtnText: {
    color: '#0066CC',
    fontWeight: '700',
    fontSize: 12,
  },
  deleteCardBtn: {
    flex: 1,
    backgroundColor: '#FFF0F0',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5C2C7',
  },
  deleteCardBtnText: {
    color: '#C92A2A',
    fontWeight: '700',
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 22,
    gap: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1F24' },
  modalInput: {
    backgroundColor: '#F8F9FA',
    color: '#1A1F24',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#CED4DA',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: '#6C757D', fontWeight: '600' },
  modalSaveBtn: {
    backgroundColor: '#0066CC',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalSaveText: { color: '#FFF', fontWeight: '700' },



  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitleTwo: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#f63c3c",
  },
  descriptionInput: {
    width: "100%",
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    color: "#a72525",
    fontWeight: "600",
  },
  modalButtonsTwo: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#ffffff",
  },
  cancelButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
  DeleteButton: {
    backgroundColor: "#ff0000",
  },
  DeleteButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
