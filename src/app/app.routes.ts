import { Routes } from '@angular/router';
import { Calendar, Files, Goals, Habits, Home, Login, Notes, Projects, Schedule } from './pages';
import { AppShell } from './shared/components/app-shell/app-shell';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: Login, data: { title: 'Login' } },
  {
    path: '',
    component: AppShell,
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
