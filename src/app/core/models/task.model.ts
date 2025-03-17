export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inProgress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  tags: string[];
  attachments?: string[]; // Add this line
  completed?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Used for creating a new task (without the server-generated fields)
export type TaskCreate = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;