import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss']
})
export class TaskFormComponent implements OnInit {
  taskForm: FormGroup;
  @Output() taskCreated = new EventEmitter<Task>();
  @Output() closeForm = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService
  ) {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit(): void {
  }

onSubmit(): void {
  console.log('TaskFormComponent onSubmit called');
  if (this.taskForm.valid) {
    const newTask = this.taskForm.value;
    this.taskService.createTask(newTask);
    this.taskCreated.emit(newTask);
    this.closeForm.emit();
    this.taskForm.reset();
  }
}
}
