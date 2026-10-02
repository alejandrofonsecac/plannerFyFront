import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PlannerViewService } from '@app/shared/planner-view.service';
import type { PlannerViewMode } from '@pages/schedule/models';
import { addDays, startOfDay } from '@pages/schedule/utils';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

@Component({
  selector: 'app-schedule-header',
  imports: [MatIconModule],
  templateUrl: './schedule-header.html',
  styleUrl: './schedule-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleHeader {
  private readonly preferences = inject(PlannerViewService);
  readonly selectedDate = input<Date>(startOfDay(new Date()));
  readonly viewMode = input<PlannerViewMode>('daily');

  readonly selectedDateChange = output<Date>();
  readonly viewModeChange = output<PlannerViewMode>();
  readonly newEvent = output<void>();

  readonly radial = computed(
    () => this.viewMode() === 'daily' && this.preferences.display() === 'radial',
  );
  readonly dateLabel = computed(() => this.formatDate(this.selectedDate()));
  readonly isToday = computed(() => this.isSameDay(this.selectedDate(), new Date()));

  previousDay(): void {
    this.changeDay(-1);
  }

  nextDay(): void {
    this.changeDay(1);
  }

  goToToday(): void {
    this.selectedDateChange.emit(startOfDay(new Date()));
  }

  private changeDay(amount: number): void {
    this.selectedDateChange.emit(addDays(this.selectedDate(), amount));
  }

  private formatDate(date: Date): string {
    return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  private isSameDay(firstDate: Date, secondDate: Date): boolean {
    return (
      firstDate.getFullYear() === secondDate.getFullYear() &&
      firstDate.getMonth() === secondDate.getMonth() &&
      firstDate.getDate() === secondDate.getDate()
    );
  }
}
