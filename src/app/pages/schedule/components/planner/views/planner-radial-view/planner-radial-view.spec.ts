import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CdkDragDrop, CdkDragMove } from '@angular/cdk/drag-drop';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlannerRadialView } from './planner-radial-view';
import { LocalClockService } from '@app/shared/local-clock.service';
import type { PlannerTask } from '@pages/schedule/models';

describe('radial planner interactions', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LocalClockService, useValue: { now: signal(new Date(2026, 8, 10, 12)) } },
      ],
    });
  });

  function setup() {
    const fixture = TestBed.createComponent(PlannerRadialView);
    fixture.componentRef.setInput('date', new Date(2026, 8, 10));
    fixture.componentRef.setInput('events', [
      {
        id: 1,
        date: '2026-09-10',
        title: 'Reunião',
        startTime: '09:00',
        endTime: '10:00',
        category: 'work',
        kind: 'event',
      },
      {
        id: 2,
        date: '2026-09-10',
        title: 'Consulta',
        startTime: '09:15',
        endTime: '09:30',
        category: 'health',
        kind: 'event',
      },
    ]);
    fixture.detectChanges();
    const dial = fixture.nativeElement.querySelector('.radial-dial') as HTMLElement;
    vi.spyOn(dial, 'getBoundingClientRect').mockReturnValue({
      left: 20,
      top: 100,
      width: 340,
      height: 340,
    } as DOMRect);
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn(() => {
      dialog.open = true;
    });
    dialog.close = vi.fn(() => {
      dialog.open = false;
    });
    return { fixture, component: fixture.componentInstance, dialog };
  }

  it('snaps drag previews and drops in viewport coordinates and ignores the center/outside', () => {
    const { component } = setup();
    const dropped = vi.fn();
    component.taskDropped.subscribe(dropped);
    component.dragMoved({
      pointerPosition: { x: 322, y: 270 },
      event: new MouseEvent('mousemove'),
    } as CdkDragMove<PlannerTask>);
    expect(component.hoveredHour()).toBe(6);
    component.dropTask({
      dropPoint: { x: 322, y: 270 },
      isPointerOverContainer: true,
    } as CdkDragDrop<unknown, PlannerTask[], PlannerTask>);
    expect(dropped.mock.calls[0][0].slotTime).toBe('06:00');
    component.dropTask({
      dropPoint: { x: 190, y: 270 },
      isPointerOverContainer: true,
    } as CdkDragDrop<unknown, PlannerTask[], PlannerTask>);
    component.dropTask({
      dropPoint: { x: 322, y: 270 },
      isPointerOverContainer: false,
    } as CdkDragDrop<unknown, PlannerTask[], PlannerTask>);
    expect(dropped).toHaveBeenCalledTimes(1);
  });

  it('opens all overlapping commitments in one details sheet and emits the precise event for editing', () => {
    const { fixture, component, dialog } = setup();
    component.openGroup(component.groups()[0], new MouseEvent('click'));
    fixture.detectChanges();
    expect(dialog.showModal).toHaveBeenCalled();
    expect(dialog.querySelectorAll('article').length).toBe(2);
    expect(dialog.textContent).toContain('09:15 – 09:30');
    const edited = vi.fn();
    component.eventEdited.subscribe(edited);
    component.editEvent(component.groups()[0].events[1]);
    fixture.detectChanges();
    expect(edited.mock.calls[0][0].endTime).toBe('09:30');
    expect(dialog.close).toHaveBeenCalled();
  });

  it('changes dates on horizontal swipes but ignores vertical scrolling and task selection', () => {
    const { fixture, component } = setup();
    const changed = vi.fn();
    component.dayChanged.subscribe(changed);
    component.startSwipe({ clientX: 200, clientY: 200, isPrimary: true } as PointerEvent);
    component.endSwipe({ clientX: 100, clientY: 205 } as PointerEvent);
    expect(changed).toHaveBeenCalledWith(1);
    component.startSwipe({ clientX: 200, clientY: 200, isPrimary: true } as PointerEvent);
    component.endSwipe({ clientX: 205, clientY: 300 } as PointerEvent);
    fixture.componentRef.setInput('selectingTask', true);
    component.startSwipe({ clientX: 200, clientY: 200, isPrimary: true } as PointerEvent);
    component.endSwipe({ clientX: 100, clientY: 205 } as PointerEvent);
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
