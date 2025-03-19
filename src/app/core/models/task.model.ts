// src/app/core/models/task.model.ts
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inProgress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  tags: string[];
  attachments?: string[]; // Array of file attachment IDs
  completed?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Used for creating a new task (without the server-generated fields)
export type TaskCreate = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;

// File attachment type for task attachments
export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}