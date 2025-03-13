// src/app/features/tasks/my-tasks/my-tasks.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TaskService } from '../../../core/services/task.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Task, TaskStatus, TaskPriority } from '../../../core/models/task.model';
import { format, isBefore, isToday, isTomorrow, addDays } from 'date-fns';

@Component({
  selector: 'app-my-tasks',
  templateUrl: './my-tasks.component.html'
})
export class MyTasksComponent implements OnInit {
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  isLoading = true;
  searchTerm = '';
  selectedStatus = '';
  selectedPriority = '';
  dateFilter = 'all'; // all, today, tomorrow, week, overdue
  showTaskModal = false;
  selectedTask: Task | null = null;
  isEditingTask = false;

  // For easy access in template
  TaskStatus = TaskStatus;
  TaskPriority = TaskPriority;

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
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
      this.applyFilters();
      
    } catch (error: any) {
      this.notificationService.error('Failed to load tasks: ' + error.message);
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters(): void {
    let filtered = [...this.tasks];
    
    // Apply search term filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(term) || 
        (task.description && task.description.toLowerCase().includes(term)) ||
        (task.related_contact && 
          `${task.related_contact.first_name} ${task.related_contact.last_name}`.toLowerCase().includes(term))
      );
    }
    
    // Apply status filter
    if (this.selectedStatus) {
      filtered = filtered.filter(task => task.status === this.selectedStatus);
    }
    
    // Apply priority filter
    if (this.selectedPriority) {
      filtered = filtered.filter(task => task.priority === this.selectedPriority);
    }
    
    // Apply date filter
    if (this.dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (this.dateFilter === 'today') {
        filtered = filtered.filter(task => task.due_date && isToday(new Date(task.due_date)));
      } else if (this.dateFilter === 'tomorrow') {
        filtered = filtered.filter(task => task.due_date && isTomorrow(new Date(task.due_date)));
      } else if (this.dateFilter === 'week') {
        const endOfWeek = addDays(today, 7);
        filtered = filtered.filter(task => {
          if (!task.due_date) return false;
          const dueDate = new Date(task.due_date);
          return dueDate >= today && dueDate <= endOfWeek;
        });
      } else if (this.dateFilter === 'overdue') {
        filtered = filtered.filter(task => {
          if (!task.due_date) return false;
          const dueDate = new Date(task.due_date);
          dueDate.setHours(23, 59, 59, 999); // End of the due date
          return task.status !== TaskStatus.COMPLETED && isBefore(dueDate, new Date());
        });
      }
    }
    
    this.filteredTasks = filtered;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedPriority = '';
    this.dateFilter = 'all';
    this.applyFilters();
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
      
      this.notificationService.success(`Task status updated to ${status}`);
      this.loadTasks();
    } catch (error: any) {
      this.notificationService.error('Failed to update task status: ' + error.message);
    }
  }

  async deleteTask(taskId: string): Promise<void> {
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
    if (!task.due_date) return 'No due date';
    
    const dueDate = new Date(task.due_date);
    
    if (isToday(dueDate)) {
      return `Today at ${format(dueDate, 'h:mm a')}`;
    } else if (isTomorrow(dueDate)) {
      return `Tomorrow at ${format(dueDate, 'h:mm a')}`;
    } else if (isBefore(dueDate, new Date()) && task.status !== TaskStatus.COMPLETED) {
      return `Overdue: ${format(dueDate, 'MMM d')}`;
    } else {
      return format(dueDate, 'MMM d, yyyy');
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

  getStatusClass(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.TODO:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case TaskStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case TaskStatus.REVIEW:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case TaskStatus.COMPLETED:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }
}