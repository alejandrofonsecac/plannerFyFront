import { GoalCategory, GoalPriority, GoalStatus } from './goal.models';
// Display text only: values and decisions always come from the API.
export const GOAL_PRIORITY_LABELS: Record<GoalPriority, string> = {
  LOW: 'Baixa',
  NORMAL: 'Média',
  HIGH: 'Alta',
};
export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  WORK: 'Trabalho',
  STUDY: 'Estudo',
  HEALTH: 'Saúde',
  MIND: 'Mente',
  WELLBEING: 'Bem-estar',
  PERSONAL: 'Pessoal',
  PROJECT: 'Projetos',
};
export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  PLANNED: 'Planejada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
};
