import type { PlannerContent, PlannerViewMode } from '@pages/schedule/models';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { PlannerViewService } from '@app/shared/planner-view.service';
import { MatIconModule } from '@angular/material/icon';
import { startOfDay } from '@pages/schedule/utils';

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
  readonly preferences = inject(PlannerViewService);
  readonly radial = computed(
    () =>
      this.activeContent() === 'planning' &&
      this.viewMode() === 'daily' &&
      this.preferences.display() === 'radial',
  );
  readonly activeContent = input<PlannerContent>('planning');
  readonly selectedDate = input<Date>(startOfDay(new Date()));
  readonly viewMode = input<PlannerViewMode>('daily');

  readonly selectedDateChange = output<Date>();
  readonly viewModeChange = output<PlannerViewMode>();
  readonly primaryAction = output<PlannerContent>();

  readonly dateLabel = computed(() => this.formatDate(this.selectedDate()));
  readonly isToday = computed(() => this.isSameDay(this.selectedDate(), new Date()));
  readonly pageTitle = computed(() => (this.activeContent() === 'planning' ? 'Planner' : 'Tasks'));
  readonly showsViewModes = computed(() => this.activeContent() === 'planning');
  readonly primaryActionConfig = computed(() =>
    this.activeContent() === 'planning'
      ? { label: 'Novo evento', icon: 'calendar_add_on' }
      : { label: 'Nova tarefa', icon: 'add' },
  );

  previousDay(): void {
    this.changeDay(-1);
  }

  nextDay(): void {
    this.changeDay(1);
  }

  goToToday(): void {
    this.selectedDateChange.emit(startOfDay(new Date()));
  }

  setViewMode(mode: PlannerViewMode): void {
    this.viewModeChange.emit(mode);
  }

  private changeDay(amount: number): void {
    const nextDate = new Date(this.selectedDate());
    nextDate.setDate(nextDate.getDate() + amount);
    this.selectedDateChange.emit(startOfDay(nextDate));
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
