import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { GOAL_CATEGORY_LABELS, GOAL_PRIORITY_LABELS } from '../../../../shared/goals/goal.labels';
import { WeeklyGoalsService } from '../../service/weekly-goals.service';

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
  readonly priorityLabels = GOAL_PRIORITY_LABELS;
  readonly categoryLabels = GOAL_CATEGORY_LABELS;

  ngOnInit(): void {
    this.loadGoals();
  }

  loadGoals(): void {
    this.weeklyGoalsService.load();
  }
}
