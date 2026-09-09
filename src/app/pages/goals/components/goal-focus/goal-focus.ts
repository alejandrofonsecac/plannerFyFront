import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { WeeklyFocus } from '../../../../shared/goals/goal.models';

@Component({
  selector: 'app-goal-focus',
  imports: [FormsModule, MatIconModule],
  templateUrl: './goal-focus.html',
  styleUrl: './goal-focus.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalFocus {
  readonly focus = input<WeeklyFocus | null>(null);
  readonly saving = input(false);
  readonly save = output<WeeklyFocus>();
  readonly editing = signal(false);
  draft: WeeklyFocus = { focus: '', message: '' };

  constructor() {
    effect(() => {
      const focus = this.focus();
      this.draft = { focus: focus?.focus ?? '', message: focus?.message ?? '' };
      this.editing.set(false);
    });
  }

  startEditing(): void {
    this.editing.set(true);
  }

  cancel(): void {
    const focus = this.focus();
    this.draft = { focus: focus?.focus ?? '', message: focus?.message ?? '' };
    this.editing.set(false);
  }

  submit(): void {
    if (this.saving() || !this.draft.focus.trim()) return;
    this.save.emit({ focus: this.draft.focus.trim(), message: this.draft.message.trim() });
  }
}
