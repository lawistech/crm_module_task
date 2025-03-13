// src/app/features/tasks/tasks.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MyTasksComponent } from './my-tasks/my-tasks.component';
import { TaskBoardComponent } from './task-board/task-board.component';
import { TaskFormComponent } from './task-form/task-form.component';

const routes: Routes = [
  { path: '', redirectTo: 'my-tasks', pathMatch: 'full' },
  { path: 'my-tasks', component: MyTasksComponent },
  { path: 'task-board', component: TaskBoardComponent }
];

@NgModule({
  declarations: [
    MyTasksComponent,
    TaskBoardComponent,
    TaskFormComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    TaskFormComponent
  ]
})
export class TasksModule { }