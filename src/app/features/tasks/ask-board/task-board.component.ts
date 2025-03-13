// src/app/features/tasks/task-board/task-board.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { TaskService } from '../../../core/services/task.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Task, TaskStatus, TaskPriority } from '../../../core/models/task.model';
import { format, isBefore, isToday } from 'date-fns';

@Component({
  selector: 'app-task-board',
  templateUrl: './task-board.component.html',
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
    
    // Sort each group by priority (higher priority first) then by due date
    const sortTasksByPriorityAndDueDate = (tasks: Task[]) => {
      return tasks.sort((a, b) => {
        // First by priority (higher first)
        const priorityOrder = this.getPriorityOrder(b.priority) - this.getPriorityOrder(a.priority);
        if (priorityOrder !== 0) return priorityOrder;
        
        // Then by due date (sooner first)
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        
        // If only one task has a due date, it comes first
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        
        // If no due dates, sort by creation date (newer first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    };
    
    this.todoTasks = sortTasksByPriorityAndDueDate(this.todoTasks);
    this.inProgressTasks = sortTasksByPriorityAndDueDate(this.inProgressTasks);
    this.reviewTasks = sortTasksByPriorityAndDueDate(this.reviewTasks);
    this.completedTasks = sortTasksByPriorityAndDueDate(this.completedTasks);
  }

  getPriorityOrder(priority: TaskPriority): number {
    switch (priority) {
      case TaskPriority.URGENT: return 4;
      case TaskPriority.HIGH: return 3;
      case TaskPriority.MEDIUM: return 2;
      case TaskPriority.LOW: return 1;
      default: return 0;
    }
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

  async deleteTask(taskId: string, event: Event): Promise<void> {
    // Stop event propagation to prevent opening the task modal
    event.stopPropagation();
    
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

  onDragStart(event: DragEvent, task: Task): void {
    // Store the task ID in the drag event's dataTransfer object
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', task.id);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, status: TaskStatus): void {
    // Allow dropping in this zone
    event.preventDefault();
    event.stopPropagation();
    
    // Add visual feedback for the drop target
    const dropZone = event.currentTarget as HTMLElement;
    dropZone.classList.add('bg-stone-100');
  }

  onDragLeave(event: DragEvent): void {
    // Remove visual feedback when dragging out of the drop zone
    const dropZone = event.currentTarget as HTMLElement;
    dropZone.classList.remove('bg-stone-100');
  }

  async onDrop(event: DragEvent, targetStatus: TaskStatus): Promise<void> {
    event.preventDefault();
    
    // Remove visual feedback
    const dropZone = event.currentTarget as HTMLElement;
    dropZone.classList.remove('bg-stone-100');
    
    // Get the task ID from the drag event's dataTransfer object
    const taskId = event.dataTransfer?.getData('text/plain');
    
    if (!taskId) return;
    
    // Find the task in our task list
    const task = this.tasks.find(t => t.id === taskId);
    
    if (!task || task.status === targetStatus) return;
    
    // Update the task status
    await this.updateTaskStatus(taskId, targetStatus);
  }
}