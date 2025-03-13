// src/app/core/models/task.model.ts
import { Contact } from './contact.model';
import { User } from './user.model';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  assigned_user?: User;
  created_by: string;
  related_to_contact?: string;
  related_contact?: Contact;
  related_to_call?: string;
  tags?: string[];
  completion_date?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
}