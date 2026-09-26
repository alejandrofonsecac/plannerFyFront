import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { PlannerEvent, PlannerHabit } from '@pages/schedule/models';
import { PlannerFreeTimeCard } from '@pages/schedule/components/planner/sidebar/planner-free-time-card/planner-free-time-card';
import { PlannerHabitsCard } from '@pages/schedule/components/planner/sidebar/planner-habits-card/planner-habits-card';
import { PlannerNextActivityCard } from '@pages/schedule/components/planner/sidebar/planner-next-activity-card/planner-next-activity-card';
import { DailySummaryComponent } from '@pages/schedule/components/planner/sidebar/daily-summary/daily-summary';

@Component({
  selector: 'app-planner-sidebar',
  imports: [DailySummaryComponent, PlannerNextActivityCard, PlannerHabitsCard, PlannerFreeTimeCard],
  templateUrl: './planner-sidebar.html',
  styleUrl: './planner-sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerSidebar {
  readonly date = input.required<Date>();
  readonly events = input<PlannerEvent[]>([]);
  readonly nextActivity = input<PlannerEvent | null>(null);
  readonly habits = input<PlannerHabit[]>([]);
  readonly taskCount = input(0);
  readonly eventCount = input(0);
  readonly plannedHours = input('0h');
  readonly freeTime = input('0h');
  readonly freeTimePercentage = input(0);
  readonly habitToggled = output<number>();
}
