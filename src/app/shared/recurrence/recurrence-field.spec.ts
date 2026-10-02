import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { RecurrenceField } from './recurrence-field';

describe('recurrence selection', () => {
  it('lets the user choose a frequency and the end of the selected year', () => {
    const fixture = TestBed.createComponent(RecurrenceField);
    fixture.componentRef.setInput('startDate', '2030-04-02');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const select = element.querySelector('select')!;
    expect([...select.options].map((option) => option.textContent?.trim())).toEqual([
      'Não repetir',
      'Todo dia',
      'Toda semana',
      'Todo mês',
      'Todo ano',
    ]);
    select.value = 'WEEKLY';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    element.querySelector('button')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toEqual({ frequency: 'WEEKLY', until: '2030-12-31' });
    expect(element.querySelector('input')?.value).toBe('2030-12-31');
    select.value = '';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(element.querySelector('input')).toBeNull();
  });
});
