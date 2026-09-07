import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { WeeklyGoalCategory, WeeklyGoalPriority } from '../../models/weekly-goal';
import { WeeklyGoalsService } from '../../service/weekly-goals.service';

const PRIORITY_LABELS: Record<WeeklyGoalPriority, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
};

const CATEGORY_LABELS: Record<WeeklyGoalCategory, string> = {
  WORK: 'Trabalho',
  STUDY: 'Estudo',
  HEALTH: 'Saúde',
  MIND: 'Mente',
  WELLBEING: 'Bem-estar',
  PERSONAL: 'Pessoal',
  PROJECT: 'Projeto',
};

@Component({
  selector: 'app-weekly-goals-card',
  imports: [MatIconModule],
  providers: [WeeklyGoalsService],
  templateUrl: './weekly-goals-card.html',
  styleUrl: './weekly-goals-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyGoalsCard implements OnInit {
  private readonly weeklyGoalsService = inject(WeeklyGoalsService);

  readonly goals = this.weeklyGoalsService.goals;
  readonly loading = this.weeklyGoalsService.loading;
  readonly error = this.weeklyGoalsService.error;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly categoryLabels = CATEGORY_LABELS;

  ngOnInit(): void {
    this.loadGoals();
  }

  loadGoals(): void {
    this.weeklyGoalsService.load();
  }
}
