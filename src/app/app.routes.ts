import { Routes } from '@angular/router';
import { authGuard, authChildGuard, guestGuard } from './core/auth/routing/auth.guard';
import { Calendar, Files, Goals, Habits, Home, Login, Notes, Projects, Schedule } from './pages';
import { AppShell } from './shared/components/app-shell/app-shell';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: Login, canActivate: [guestGuard], data: { title: 'Login' } },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    children: [
      {
        path: 'home',
        component: Home,
        data: { title: 'Início' },
      },
      {
        path: 'habits',
        component: Habits,
        data: { title: 'Hábitos' },
      },
      {
        path: 'goals',
        component: Goals,
        data: { title: 'Metas Semanais' },
      },
      {
        path: 'notes',
        component: Notes,
        data: { title: 'Notas' },
      },
      {
        path: 'calendar',
        component: Calendar,
        data: { title: 'Calendário' },
      },
      {
        path: 'files',
        component: Files,
        data: { title: 'Arquivos' },
      },
      {
        path: 'projects',
        component: Projects,
        data: { title: 'Projetos' },
      },
      {
        path: 'schedule',
        component: Schedule,
        data: { title: 'Planner' },
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
