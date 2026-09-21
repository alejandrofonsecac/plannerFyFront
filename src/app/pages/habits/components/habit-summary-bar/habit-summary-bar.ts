import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { HabitSummary } from '../../models/habit';

@Component({
  selector: 'app-habit-summary-bar',
  imports: [MatIconModule],
  templateUrl: './habit-summary-bar.html',
  styleUrl: './habit-summary-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HabitSummaryBar {
  readonly summary = input.required<HabitSummary>();
}
