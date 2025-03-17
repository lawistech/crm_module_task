// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { TaskBoardComponent } from './features/tasks/task-board/task-board.component';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tasks',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'tasks',
    component: TaskBoardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: '**',
    redirectTo: 'tasks'
  }
];
