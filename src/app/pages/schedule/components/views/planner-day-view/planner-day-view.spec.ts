import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlannerDayView } from './planner-day-view';
import { PlannerViewService } from '@app/shared/planner-view.service';
import { LocalClockService } from '@app/shared/local-clock.service';

describe('planner display and period navigation', () => {
  const now = signal(new Date(2026, 8, 10, 6, 59));
  function configure() {
    TestBed.configureTestingModule({
      providers: [{ provide: LocalClockService, useValue: { now } }],
    });
  }

  /** Simula uma nova carga da página, que lê o cache local de novo. */
  function reloadedPlannerView() {
    TestBed.resetTestingModule();
    configure();
    return TestBed.inject(PlannerViewService);
  }

  beforeEach(() => {
    localStorage.clear();
    now.set(new Date(2026, 8, 10, 6, 59));
    configure();
  });

  it('defaults to compact and preserves the chosen display across page loads', () => {
    const preferences = TestBed.inject(PlannerViewService);
    expect(preferences.display()).toBe('compact');
    preferences.setDisplay('radial');
    expect(reloadedPlannerView().display()).toBe('radial');
    localStorage.setItem('plannerfy-planner-display', 'invalid');
    expect(reloadedPlannerView().display()).toBe('compact');
  });

  it('keeps each free hour as a compact scheduling slot', () => {
    const fixture = TestBed.createComponent(PlannerDayView);
    fixture.componentRef.setInput('date', now());
    fixture.componentRef.setInput('events', [
      {
        id: 1,
        date: '2026-09-10',
        title: 'Consulta',
        startTime: '06:45',
        endTime: '07:15',
        category: 'health',
        kind: 'event',
      },
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.planner-slot__event').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.planner-slot').length).toBe(24);
    expect(fixture.nativeElement.querySelectorAll('.planner-segment--free').length).toBe(22);
    expect(fixture.componentInstance.visibleSlotTimes()).toContain('23:00');
    expect(fixture.nativeElement.querySelector('[id="daily-slot-23:00"]')).not.toBeNull();
    fixture.componentInstance.activateSlot('23:00');
    fixture.detectChanges();
    expect(
      fixture.nativeElement
        .querySelector('[id="daily-slot-23:00"]')
        .classList.contains('planner-slot--expanded'),
    ).toBe(true);
  });

  it('shows a long event once and toggles its covered hours from the card', () => {
    const fixture = TestBed.createComponent(PlannerDayView);
    fixture.componentRef.setInput('date', now());
    fixture.componentRef.setInput('events', [
      {
        id: 2,
        date: '2026-09-10',
        title: 'Escola',
        startTime: '07:10',
        endTime: '12:30',
        category: 'study',
        kind: 'event',
      },
    ]);
    fixture.detectChanges();

    const condensed = fixture.nativeElement.querySelector(
      '.planner-slot__event--condensed',
    ) as HTMLButtonElement;
    expect(condensed.textContent).toContain('07:10 – 12:30 · 5h 20min');
    expect(fixture.nativeElement.querySelectorAll('.planner-slot__event').length).toBe(1);
    expect(fixture.nativeElement.querySelector('[id="daily-slot-12:00"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[id="daily-slot-13:00"]')).not.toBeNull();

    condensed.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[id="daily-slot-12:00"]')).not.toBeNull();
    (fixture.nativeElement.querySelector('.planner-slot__event') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[id="daily-slot-12:00"]')).toBeNull();
  });

  it('preserves manual browsing on other dates across period boundaries', () => {
    TestBed.inject(PlannerViewService).setDisplay('periods');
    const fixture = TestBed.createComponent(PlannerDayView);
    fixture.componentRef.setInput('date', new Date(2026, 8, 11));
    fixture.detectChanges();
    fixture.componentInstance.activePeriod.set('night');
    now.set(new Date(2026, 8, 10, 7, 0));
    fixture.detectChanges();
    expect(fixture.componentInstance.activePeriod()).toBe('night');
  });

  it('preserves expanded compact slots across period boundaries', () => {
    const fixture = TestBed.createComponent(PlannerDayView);
    fixture.componentRef.setInput('date', now());
    fixture.detectChanges();
    fixture.componentInstance.activateSlot('23:00');
    now.set(new Date(2026, 8, 10, 7, 0));
    fixture.detectChanges();
    expect(fixture.componentInstance.expandedSlots().has('23:00')).toBe(true);
  });

  it('advances at period boundaries but preserves manual browsing within the same period', () => {
    const preferences = TestBed.inject(PlannerViewService);
    preferences.setDisplay('periods');
    const fixture = TestBed.createComponent(PlannerDayView);
    fixture.componentRef.setInput('date', now());
    fixture.detectChanges();
    expect(fixture.componentInstance.activePeriod()).toBe('dawn');
    now.set(new Date(2026, 8, 10, 7, 0));
    fixture.detectChanges();
    expect(fixture.componentInstance.activePeriod()).toBe('morning');
    expect(fixture.componentInstance.slots().map((slot) => slot.startTime)).toEqual([
      '07:00',
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '12:00',
    ]);
    fixture.componentInstance.activePeriod.set('night');
    now.set(new Date(2026, 8, 10, 7, 30));
    fixture.detectChanges();
    expect(fixture.componentInstance.activePeriod()).toBe('night');
    now.set(new Date(2026, 8, 10, 13, 0));
    fixture.detectChanges();
    expect(fixture.componentInstance.activePeriod()).toBe('afternoon');
  });
});
