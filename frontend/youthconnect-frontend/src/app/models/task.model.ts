import { TaskStatus } from './enums';

export interface TaskRequest {
  adminId: number;
  tasking: string;
  taskDescription?: string;
  skIncharge?: string;
  hyperlink?: string;
  dueDate?: string;
  status?: TaskStatus;
}

export interface TaskEditRequest {
  tasking: string;
  taskDescription?: string;
  skIncharge?: string;
  hyperlink?: string;
  dueDate?: string;
  status?: TaskStatus;
}

export interface TaskHyperlinkRequest {
  hyperlink: string;
}

export interface TaskResponse {
  taskId: number;
  adminId: number;
  tasking: string;
  taskDescription?: string;
  skIncharge?: string;
  hyperlink?: string;
  status: TaskStatus;
  dueDate?: string;
  createdAt: string;
}