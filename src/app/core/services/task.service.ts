// src/app/core/services/task.service.ts
import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Task, TaskStatus, TaskPriority } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private supabaseClient: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabaseClient = this.supabaseService.supabaseClient;
  }

  async getTasks(options: { status?: TaskStatus, priority?: TaskPriority, assigned_to?: string } = {}) {
    let query = this.supabaseClient
      .from('tasks')
      .select(`
        *,
        assigned_user:profiles!assigned_to(*),
        related_contact:contacts(*)
      `)
      .order('due_date', { ascending: true });

    // Apply filters if provided
    if (options.status) {
      query = query.eq('status', options.status);
    }
    
    if (options.priority) {
      query = query.eq('priority', options.priority);
    }
    
    if (options.assigned_to) {
      query = query.eq('assigned_to', options.assigned_to);
    }

    return query;
  }

  async getTaskById(id: string) {
    return this.supabaseClient
      .from('tasks')
      .select(`
        *,
        assigned_user:profiles!assigned_to(*),
        related_contact:contacts(*)
      `)
      .eq('id', id)
      .single();
  }

  async createTask(taskData: Partial<Task>) {
    return this.supabaseClient
      .from('tasks')
      .insert(taskData)
      .select(`
        *,
        assigned_user:profiles!assigned_to(*),
        related_contact:contacts(*)
      `);
  }

  async updateTask(id: string, taskData: Partial<Task>) {
    return this.supabaseClient
      .from('tasks')
      .update(taskData)
      .eq('id', id)
      .select(`
        *,
        assigned_user:profiles!assigned_to(*),
        related_contact:contacts(*)
      `);
  }

  async deleteTask(id: string) {
    return this.supabaseClient
      .from('tasks')
      .delete()
      .eq('id', id);
  }

  async getTasksByContactId(contactId: string) {
    return this.supabaseClient
      .from('tasks')
      .select(`
        *,
        assigned_user:profiles!assigned_to(*)
      `)
      .eq('related_to_contact', contactId)
      .order('created_at', { ascending: false });
  }

  async getTasksByCallId(callId: string) {
    return this.supabaseClient
      .from('tasks')
      .select(`
        *,
        assigned_user:profiles!assigned_to(*)
      `)
      .eq('related_to_call', callId)
      .order('created_at', { ascending: false });
  }

  async getMyTasks(userId: string) {
    return this.supabaseClient
      .from('tasks')
      .select(`
        *,
        related_contact:contacts(*)
      `)
      .eq('assigned_to', userId)
      .order('due_date', { ascending: true });
  }

  // src/app/core/services/task.service.ts
async updateTaskStatus(id: string, status: TaskStatus) {
    const updates: Partial<Task> = {
      status,
      updated_at: new Date().toISOString()
    };
    
    // If marking as completed, add completion date
    if (status === TaskStatus.COMPLETED) {
      updates.completion_date = new Date().toISOString();
    } else {
      // Fix: Use undefined instead of null
      updates.completion_date = undefined;
    }
    
    return this.supabaseClient
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select();
  }
}