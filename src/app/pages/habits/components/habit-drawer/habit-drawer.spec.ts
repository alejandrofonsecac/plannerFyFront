import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { HabitDrawer } from './habit-drawer';
import type { Habit } from '../../models/habit';

describe('habit weekday selection', () => {
  it('reveals the weekdays when Definir is chosen and sends the selected ISO weekdays', async () => {
    const fixture = TestBed.createComponent(HabitDrawer);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const form = fixture.componentInstance;
    const saved = vi.fn();
    form.formSubmitted.subscribe(saved);
    form.draft.name = 'Caminhar';
    expect(element.querySelector('.habit-drawer__day-picker')).toBeNull();
    const select = element.querySelector<HTMLSelectElement>('#habit-frequency')!;
    expect([...select.options].map((option) => option.textContent?.trim())).toEqual([
      'Todo dia',
      'Definir',
    ]);
    select.value = 'custom';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(saved).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Escolha pelo menos um dia');
    for (const label of ['Segunda-feira', 'Quarta-feira', 'Sexta-feira']) {
      element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
    }
    fixture.detectChanges();
    expect(element.querySelectorAll('.habit-drawer__day[aria-pressed="true"]')).toHaveLength(3);
    form.submit();
    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({ frequencyType: 'custom', daysOfWeek: [1, 3, 5] }),
    );
    select.value = 'daily';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
    form.submit();
    expect(saved.mock.lastCall?.[0]).toMatchObject({ frequencyType: 'daily', daysOfWeek: [] });
  });

  it('edits legacy weekdays as Monday to Friday without mutating the loaded habit', () => {
    const fixture = TestBed.createComponent(HabitDrawer);
    const habit = {
      name: 'Ler',
      icon: 'auto_stories',
      categoryId: 'estudo',
      frequencyType: 'weekdays',
      daysOfWeek: [],
    } as unknown as Habit;
    fixture.componentRef.setInput('habit', habit);
    fixture.detectChanges();
    const form = fixture.componentInstance;
    expect(form.draft.frequencyType).toBe('custom');
    expect(form.draft.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    form.toggleWeekday(3);
    expect(form.draft.daysOfWeek).toEqual([1, 2, 4, 5]);
    expect(habit.daysOfWeek).toEqual([]);
    const saved = vi.fn();
    form.formSubmitted.subscribe(saved);
    fixture.componentRef.setInput('saving', true);
    form.submit();
    expect(saved).not.toHaveBeenCalled();
  });
});
