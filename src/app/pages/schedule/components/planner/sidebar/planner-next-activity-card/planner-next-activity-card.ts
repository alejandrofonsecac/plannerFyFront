import { LocalClockService } from '@app/shared/local-clock.service';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { PlannerEvent } from '@pages/schedule/models';
import { dateKey, toMinutes } from '@pages/schedule/utils';

@Component({
  selector: 'app-planner-next-activity-card',
  imports: [MatIconModule],
  templateUrl: './planner-next-activity-card.html',
  styleUrl: './planner-next-activity-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerNextActivityCard {
  private readonly clock = inject(LocalClockService);
  readonly date = input.required<Date>();
  readonly events = input<PlannerEvent[]>([]);
  readonly nextActivity = computed(() => {
    const selectedDate = dateKey(this.date());
    const today = dateKey(this.clock.now());

    if (selectedDate < today) {
      return null;
    }

    const minimumTime =
      selectedDate === today ? this.clock.now().getHours() * 60 + this.clock.now().getMinutes() : 0;
    return (
      [...this.events()]
        .sort((first, second) => toMinutes(first.startTime) - toMinutes(second.startTime))
        .find(
          (event) => event.date === selectedDate && toMinutes(event.startTime) >= minimumTime,
        ) ?? null
    );
  });
  readonly startsInLabel = computed(() => {
    const activity = this.nextActivity();
    if (!activity) {
      return '';
    }

    if (dateKey(this.date()) !== dateKey(this.clock.now())) {
      return 'Próxima atividade do dia';
    }

    const currentMinutes = this.clock.now().getHours() * 60 + this.clock.now().getMinutes();
    const difference = Math.max(0, toMinutes(activity.startTime) - currentMinutes);
    const hours = Math.floor(difference / 60);
    const minutes = difference % 60;
    const duration =
      hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}` : `${minutes} minutos`;
    return `Começa em ${duration}`;
  });
}
