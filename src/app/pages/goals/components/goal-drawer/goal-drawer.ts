import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Goal, GoalRequest, GoalOptions } from '../../../../shared/goals/goal.models';
@Component({
  selector: 'app-goal-drawer',
  imports: [FormsModule, MatIconModule],
  templateUrl: './goal-drawer.html',
  styleUrl: './goal-drawer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalDrawer {
  readonly goal = input<Goal | null>(null);
  readonly defaults = input.required<GoalRequest>();
  readonly options = input.required<GoalOptions>();
  readonly saving = input(false);
  readonly error = input<string | null>(null);
  readonly dismissed = output<void>();
  readonly formSubmitted = output<GoalRequest>();
  draft!: GoalRequest;
  submitted = false;

  constructor() {
    effect(() => {
      const source = this.goal() ?? this.defaults();
      // Select editable fields only; lifecycle fields are read-only API results.
      const { name, expectedTarget, priority, category, weekId } = source;
      this.draft = { name, expectedTarget, priority, category, weekId };
      this.submitted = false;
    });
  }
  
  submit(): void {
    if (this.saving()) return;
    this.submitted = true;
    if (!this.draft.name.trim() || !this.draft.expectedTarget.trim()) return;
    this.formSubmitted.emit({ ...this.draft });
  }
  closeFromBackdrop(event: MouseEvent): void {
    if (!this.saving() && event.target === event.currentTarget) this.dismissed.emit();
  }
}
