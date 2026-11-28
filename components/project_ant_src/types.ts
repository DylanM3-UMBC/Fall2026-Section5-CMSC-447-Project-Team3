export interface Stroke {
  path: string;
  color: string;
  strokeWidth: number;
}

export interface TextNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
}

export interface TaskComment {
  id: string;
  text: string;
  createdAt: string;
}

export interface TaskPin {
  id: string;
  number: number;
  x: number;
  y: number;
  title: string;
  type: string;
  status: 'open' | 'resolved';
  color: string;
  hidden?: boolean;
  comments: TaskComment[];
  photos: string[];
}

export interface SheetFile {
  id: string;
  sheetNumber: number;
  title: string;
  thumbnailUri: string;
  fullImageUri: string;
  width: number;
  height: number;
  strokes: Stroke[];
  pins: TaskPin[];
  textNotes?: TextNote[];
  boardWidth?: number;
  boardHeight?: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  sheets: SheetFile[];
  nextTaskNumber: number;
}
