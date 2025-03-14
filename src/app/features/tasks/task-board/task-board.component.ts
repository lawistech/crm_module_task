// src/app/features/tasks/task-board/task-board.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { TaskService } from '../../../core/services/task.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Task, TaskStatus, TaskPriority } from '../../../core/models/task.model';
import { format, isBefore, isToday, formatDistance } from 'date-fns';

@Component({
  selector: 'app-task-board',
  templateUrl: './task-board.component.html',
  styleUrls: ['./task-board.component.scss']
})
export class TaskBoardComponent implements OnInit {
  tasks: Task[] = [];
  isLoading = true;
  showTaskModal = false;
  selectedTask: Task | null = null;
  isEditingTask = false;
  
  // Define columns
  todoTasks: Task[] = [];
  inProgressTasks: Task[] = [];
  reviewTasks: Task[] = [];
  completedTasks: Task[] = [];
  
  // For easy access in template
  TaskStatus = TaskStatus;
  TaskPriority = TaskPriority;

  // Track dragged task
  private draggedTask: Task | null = null;

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  async loadTasks(): Promise<void> {
    try {
      this.isLoading = true;
      
      const currentUser = this.authService.getCurrentUser();
      
      if (!currentUser) {
        this.notificationService.error('User not authenticated');
        return;
      }
      
      const { data, error } = await this.taskService.getMyTasks(currentUser.id);
      
      if (error) {
        throw error;
      }
      
      this.tasks = data || [];
      this.groupTasksByStatus();
      
    } catch (error: any) {
      this.notificationService.error('Failed to load tasks: ' + error.message);
    } finally {
      this.isLoading = false;
    }
  }

  groupTasksByStatus(): void {
    // Reset task groups
    this.todoTasks = [];
    this.inProgressTasks = [];
    this.reviewTasks = [];
    this.completedTasks = [];
    
    // Group tasks by status
    this.tasks.forEach(task => {
      switch (task.status) {
        case TaskStatus.TODO:
          this.todoTasks.push(task);
          break;
        case TaskStatus.IN_PROGRESS:
          this.inProgressTasks.push(task);
          break;
        case TaskStatus.REVIEW:
          this.reviewTasks.push(task);
          break;
        case TaskStatus.COMPLETED:
          this.completedTasks.push(task);
          break;
      }
    });
  }

  openTaskModal(task?: Task): void {
    this.selectedTask = task || null;
    this.isEditingTask = !!task;
    this.showTaskModal = true;
  }

  closeTaskModal(): void {
    this.showTaskModal = false;
    this.selectedTask = null;
    this.isEditingTask = false;
  }

  handleTaskSaved(): void {
    this.loadTasks();
    this.closeTaskModal();
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    try {
      const { error } = await this.taskService.updateTaskStatus(taskId, status);
      
      if (error) {
        throw error;
      }
      
      this.notificationService.success(`Task moved to ${status.replace('_', ' ')}`);
      this.loadTasks();
    } catch (error: any) {
      this.notificationService.error('Failed to update task status: ' + error.message);
    }
  }

  async deleteTask(taskId: string, event?: Event): Promise<void> {
    // Prevent event propagation if event is provided
    if (event) {
      event.stopPropagation();
    }
    
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      const { error } = await this.taskService.deleteTask(taskId);
      
      if (error) {
        throw error;
      }
      
      this.notificationService.success('Task deleted successfully');
      this.loadTasks();
    } catch (error: any) {
      this.notificationService.error('Failed to delete task: ' + error.message);
    }
  }

  getDueLabel(task: Task): string {
    if (!task.due_date) return '';
    
    const dueDate = new Date(task.due_date);
    
    if (isToday(dueDate)) {
      return `Today, ${format(dueDate, 'h:mm a')}`;
    } else if (isBefore(dueDate, new Date()) && task.status !== TaskStatus.COMPLETED) {
      return `Overdue: ${format(dueDate, 'MMM d')}`;
    } else {
      return format(dueDate, 'MMM d');
    }
  }

  formatCompletionDate(dateStr: string): string {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    return formatDistance(date, new Date(), { addSuffix: true });
  }

  getPriorityClass(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'bg-red-100 text-red-800 border-red-200';
      case TaskPriority.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case TaskPriority.MEDIUM:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case TaskPriority.LOW:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  // Drag and drop functionality
  onDragStart(event: DragEvent, task: Task): void {
    this.draggedTask = task;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', task.id);
    }
  }

  onDragOver(event: DragEvent, status: TaskStatus): void {
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.classList.add('bg-stone-100');
    }
  }

  onDragLeave(event: DragEvent): void {
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.classList.remove('bg-stone-100');
    }
  }

  async onDrop(event: DragEvent, status: TaskStatus): Promise<void> {
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.classList.remove('bg-stone-100');
    }
    
    if (!this.draggedTask) return;
    
    if (this.draggedTask.status !== status) {
      await this.updateTaskStatus(this.draggedTask.id, status);
    }
    
    this.draggedTask = null;
  }
}