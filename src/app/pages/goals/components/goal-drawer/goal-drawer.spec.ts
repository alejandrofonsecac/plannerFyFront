import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { GoalDrawer } from './goal-drawer';
import { GoalRequest } from '../../../../shared/goals/goal.models';
describe('GoalDrawer', () => {
  it('uses backend defaults and emits form fields', () => {
    TestBed.configureTestingModule({ imports: [GoalDrawer] });
    const fixture: ComponentFixture<GoalDrawer> = TestBed.createComponent(GoalDrawer);
    const defaults: GoalRequest = {
      name: '',
      expectedTarget: '',
      priority: 'HIGH',
      category: 'HEALTH',
      weekId: '2027-W01',
    };
    fixture.componentRef.setInput('defaults', defaults);
    fixture.componentRef.setInput('options', {
      priorities: [{ value: 'HIGH', label: 'Alta' }],
      categories: [{ value: 'HEALTH', label: 'Saúde' }],
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.draft).toEqual(defaults);
    fixture.componentInstance.draft.name = 'Caminhar';
    fixture.componentInstance.draft.expectedTarget = 'Três vezes';
    let result: GoalRequest | undefined;
    fixture.componentInstance.formSubmitted.subscribe((value) => (result = value));
    fixture.componentInstance.submit();
    expect(result?.name).toBe('Caminhar');
    expect(fixture.nativeElement.textContent).toContain('Saúde');
  });
});
