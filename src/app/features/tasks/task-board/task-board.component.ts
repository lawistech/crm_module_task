// src/app/features/tasks/task-board/task-board.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../../core/models/task.model';
import { TaskService } from '../../../core/services/task.service';
import { TaskFormComponent } from '../task-form/task-form.component';
import { TaskDetailsComponent } from '../task-details/task-details.component';
import { NotificationService } from '../../../core/services/notification.service';
import { FilterByStatusPipe } from '../../../shared/pipes/filter-by-status.pipe';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    TaskFormComponent, 
    TaskDetailsComponent,
    FilterByStatusPipe
  ],
  templateUrl: './task-board.component.html',
  styleUrls: ['./task-board.component.scss']
})
export class TaskBoardComponent implements OnInit {
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  showTaskForm: boolean = false;
  showTaskDetails: boolean = false;
  currentTask: Task | null = null;
  selectedTask: Task | null = null;
  isLoading: boolean = true;
  
  // Filters
  statusFilter: string = 'all';
  priorityFilter: string = 'all';
  searchTerm: string = '';

  constructor(
    private taskService: TaskService, 
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.isLoading = true;
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.notificationService.error('Failed to load tasks');
        console.error(error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredTasks = this.tasks.filter(task => {
      // Status filter
      if (this.statusFilter !== 'all' && task.status !== this.statusFilter) {
        return false;
      }
      
      // Priority filter
      if (this.priorityFilter !== 'all' && task.priority !== this.priorityFilter) {
        return false;
      }
      
      // Search filter (search in title and description)
      if (this.searchTerm && !this.matchesSearch(task)) {
        return false;
      }
      
      return true;
    });
    
    // Sort tasks by priority first, then due date if available
    this.filteredTasks.sort((a, b) => {
      // First sort by priority (high -> medium -> low)
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder];
      const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder];
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then sort by due date if both have one
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      
      // Tasks with due dates come before those without
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      
      // Finally sort by creation date (newest first)
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }
  
  matchesSearch(task: Task): boolean {
    const term = this.searchTerm.toLowerCase();
    return task.title.toLowerCase().includes(term) || 
           (task.description ? task.description.toLowerCase().includes(term) : false) ||
           (task.tags ? task.tags.some(tag => tag.toLowerCase().includes(term)) : false);
  }

  deleteTask(id: string): void {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(id).subscribe({
        next: () => {
          this.tasks = this.tasks.filter(task => task.id !== id);
          this.applyFilters();
          this.notificationService.success('Task deleted successfully');
        },
        error: (error) => {
          this.notificationService.error('Failed to delete task');
          console.error(error);
        }
      });
    }
  }

  createTask(): void {
    this.currentTask = null;
    this.showTaskForm = true;
  }
  
  editTask(task: Task): void {
    this.currentTask = {...task};
    this.showTaskForm = true;
  }
  
  viewTaskDetails(task: Task): void {
    this.selectedTask = {...task};
    this.showTaskDetails = true;
  }
  
  closeTaskDetails(): void {
    this.showTaskDetails = false;
    this.selectedTask = null;
  }
  
  editTaskFromDetails(task: Task): void {
    this.currentTask = task;
    this.showTaskForm = true;
    this.closeTaskDetails();
  }

  closeTaskForm(): void {
    this.showTaskForm = false;
    this.currentTask = null;
  }

  onTaskSaved(task: Task): void {
    if (this.tasks.find(t => t.id === task.id)) {
      // Update existing task in the list
      this.tasks = this.tasks.map(t => t.id === task.id ? task : t);
    } else {
      // Add new task to the list
      this.tasks.unshift(task);
    }
    
    this.applyFilters();
    this.closeTaskForm();
  }
  
  // Helper methods for class names
  getPriorityBarClass(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-rose-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-stone-500';
    }
  }
  
  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'bg-rose-100 text-rose-800';
      case 'medium': return 'bg-amber-100 text-amber-800';
      case 'low': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-stone-100 text-stone-800';
    }
  }
  
  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'inProgress': return 'bg-blue-100 text-blue-800';
      case 'todo': return 'bg-amber-100 text-amber-800';
      default: return 'bg-stone-100 text-stone-800';
    }
  }
  
  // NEW METHOD: For styled status badges in the list view
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed': return 'flex items-center text-xs font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-800';
      case 'inProgress': return 'flex items-center text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800';
      case 'todo': return 'flex items-center text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-800';
      default: return 'flex items-center text-xs font-semibold px-2 py-1 rounded bg-stone-100 text-stone-800';
    }
  }
  
  getStatusDisplay(status: string): string {
    switch (status) {
      case 'inProgress': return 'In Progress';
      case 'todo': return 'To Do';
      case 'completed': return 'Completed';
      default: return status;
    }
  }
  
  isOverdue(dueDate: Date | undefined): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }
  
  // Filter management
  hasActiveFilters(): boolean {
    return this.searchTerm !== '' || this.statusFilter !== 'all' || this.priorityFilter !== 'all';
  }
  
  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }
  
  clearStatusFilter(): void {
    this.statusFilter = 'all';
    this.applyFilters();
  }
  
  clearPriorityFilter(): void {
    this.priorityFilter = 'all';
    this.applyFilters();
  }
  
  clearAllFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.priorityFilter = 'all';
    this.applyFilters();
  }
  
  // Helper method to safely count tasks by status
  getCountByStatus(status: string): number {
    return this.filteredTasks.filter(task => task.status === status).length;
  }
}