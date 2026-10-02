import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatTooltip } from '@angular/material/tooltip';
import { describe, expect, it } from 'vitest';
import { HabitCard } from './habit-card';
import type { Habit } from '../../models/habit';

const habit: Habit = {
  id: 1,
  name: 'Caminhar',
  icon: 'directions_run',
  categoryId: 'saude',
  frequencyType: 'custom',
  status: 'active',
  daysOfWeek: [1, 3, 7],
  createdAt: '2026-09-21',
  asOfDate: '2026-09-27',
  completedDates: ['2026-09-21', '2026-09-27'],
  metrics: { currentStreak: 1, bestStreak: 1, consistency: 67, completedDays: 2, milestone: null },
  history: [
    { date: '2026-09-21', completed: true },
    { date: '2026-09-23', completed: false },
    { date: '2026-09-27', completed: true },
  ],
};

describe('scheduled habit history', () => {
  it('renders only API dates and completion states, with accessible date tooltips using server today', () => {
    const fixture = TestBed.createComponent(HabitCard);
    fixture.componentRef.setInput('habit', habit);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.habit-card__heatmap-day')).toHaveLength(3);
    expect(element.querySelectorAll('.habit-card__heatmap-day--completed')).toHaveLength(2);
    const squares = fixture.debugElement.queryAll(By.directive(MatTooltip));
    expect(squares[2].injector.get(MatTooltip).message).toBe('Hoje (27 set) · Concluído');
    expect(squares[1].injector.get(MatTooltip).message).toBe(
      'quarta-feira (23 set) · Não concluído',
    );
    expect((squares[2].nativeElement as HTMLElement).tabIndex).toBe(0);
    expect(element.textContent).toContain('Seg · Qua · Dom');
    fixture.componentInstance.toggleExpanded();
    fixture.detectChanges();
    expect(element.querySelectorAll('.habit-card__heatmap-day')).toHaveLength(3);
  });

  it('caps the displayed grid at 30 squares and shows an empty state without invented dates', () => {
    const fixture = TestBed.createComponent(HabitCard);
    const history = Array.from({ length: 31 }, (_, index) => ({
      date: `2026-08-${String(index + 1).padStart(2, '0')}`,
      completed: false,
    }));
    fixture.componentRef.setInput('habit', { ...habit, history });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.habit-card__heatmap-day')).toHaveLength(30);
    fixture.componentRef.setInput('habit', { ...habit, history: [] });
    fixture.detectChanges();
    expect(element.querySelectorAll('.habit-card__heatmap-day')).toHaveLength(0);
    expect(element.textContent).toContain('Nenhum dia previsto até hoje');
  });
});
