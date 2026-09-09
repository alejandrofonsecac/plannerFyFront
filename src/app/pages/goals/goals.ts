import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { GoalDrawer } from './components/goal-drawer/goal-drawer';
import { GoalEmptyState } from './components/goal-empty-state/goal-empty-state';
import { GoalFocus } from './components/goal-focus/goal-focus';
import { GoalList } from './components/goal-list/goal-list';
import { GoalWeekNavigation } from './components/goal-week-navigation/goal-week-navigation';
import { Goal, GoalRequest, GoalStatus, WeeklyFocus } from '../../shared/goals/goal.models';
import { GoalService } from './service/goal.service';

@Component({
  selector: 'app-goals',
  imports: [MatIconModule, GoalDrawer, GoalEmptyState, GoalFocus, GoalList, GoalWeekNavigation],
  templateUrl: './goals.html',
  styleUrl: './goals.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Goals {
  private readonly goalService = inject(GoalService);
  readonly board = this.goalService.board;
  readonly loading = this.goalService.loading;
  readonly saving = this.goalService.saving;
  readonly error = this.goalService.error;
  readonly stateFilter = signal<GoalStatus | ''>('');
  readonly categoryFilter = signal('');
  readonly drawerOpen = signal(false);
  readonly editingGoal = signal<Goal | null>(null);
  private selectedWeekId?: string;

  constructor() {
    this.reloadGoals();
  }
  navigate(weekId: string): void {
    this.selectedWeekId = weekId;
    this.reloadGoals();
  }
  setStateFilter(filter: GoalStatus | ''): void {
    this.stateFilter.set(filter);
    this.reloadGoals();
  }
  setCategoryFilter(category: string): void {
    this.categoryFilter.set(category);
    this.reloadGoals();
  }
  openCreateDrawer(): void {
    this.editingGoal.set(null);
    this.drawerOpen.set(true);
  }
  openEditDrawer(goal: Goal): void {
    this.editingGoal.set(goal);
    this.drawerOpen.set(true);
  }
  closeDrawer(): void {
    if (this.saving()) return;
    this.drawerOpen.set(false);
    this.editingGoal.set(null);
  }
  async saveGoal(request: GoalRequest): Promise<void> {
    const goal = this.editingGoal();
    const saved = goal
      ? await this.goalService.update(goal.id, request)
      : await this.goalService.create(request);
    if (saved) this.closeDrawer();
  }
  reloadGoals(): void {
    this.goalService.load({
      weekId: this.selectedWeekId,
      status: this.stateFilter() || undefined,
      category: this.categoryFilter() || undefined,
    });
  }
  completeGoal(goal: Goal): void {
    void this.goalService.complete(goal.id);
  }
  deferGoal(goal: Goal): void {
    void this.goalService.defer(goal.id);
  }
  saveFocus(focus: WeeklyFocus): void {
    const board = this.board();
    if (board) void this.goalService.saveFocus(board.week.id, focus);
  }
}
