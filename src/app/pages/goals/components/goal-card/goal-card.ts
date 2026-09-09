import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Goal } from '../../../../shared/goals/goal.models';
import {
  GOAL_CATEGORY_LABELS,
  GOAL_PRIORITY_LABELS,
  GOAL_STATUS_LABELS,
} from '../../../../shared/goals/goal.labels';
@Component({
  selector: 'app-goal-card',
  imports: [MatIconModule],
  templateUrl: './goal-card.html',
  styleUrl: './goal-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalCard {
  readonly goal = input.required<Goal>();
  readonly saving = input(false);
  readonly edit = output<Goal>();
  readonly complete = output<Goal>();
  readonly defer = output<Goal>();
  readonly expanded = signal(false);
  readonly priorityLabels = GOAL_PRIORITY_LABELS;
  readonly categoryLabels = GOAL_CATEGORY_LABELS;
  readonly statusLabels = GOAL_STATUS_LABELS;
  
  toggleExpanded(): void {
    this.expanded.update((expanded) => !expanded);
  }
  onOverviewKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleExpanded();
    }
  }
}
