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
    expect(fixture.componentInstance.value()).toEqual({
      frequency: 'WEEKLY',
      until: '2030-12-31',
      weekdaysOnly: false,
    });
    expect(element.querySelector<HTMLInputElement>('input[type="date"]')?.value).toBe('2030-12-31');
    select.value = '';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(element.querySelector('input[type="date"]')).toBeNull();
  });

  it('repeats on weekdays only through a checkbox that selects daily repetition', () => {
    const fixture = TestBed.createComponent(RecurrenceField);
    fixture.componentRef.setInput('startDate', '2030-01-05');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const select = element.querySelector('select')!;
    const checkbox = element.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(checkbox.closest('label')?.textContent?.trim()).toBe('Apenas dias úteis');
    expect(checkbox.checked).toBe(false);

    checkbox.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toEqual({
      frequency: 'DAILY',
      until: '',
      weekdaysOnly: true,
    });
    expect(select.value).toBe('DAILY');
    expect(element.querySelector('input[type="date"]')).not.toBeNull();
    expect(element.textContent).toContain('Repete de segunda a sexta');

    select.value = 'WEEKLY';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.componentInstance.value().weekdaysOnly).toBe(false);
    expect(checkbox.checked).toBe(false);
    expect(element.textContent).not.toContain('Repete de segunda a sexta');
  });

  it('keeps daily repetition when weekdays only is unchecked', () => {
    const fixture = TestBed.createComponent(RecurrenceField);
    fixture.componentRef.setInput('value', {
      frequency: 'DAILY',
      until: '2030-01-31',
      weekdaysOnly: true,
    });
    fixture.detectChanges();
    const checkbox = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    expect(checkbox.checked).toBe(true);
    checkbox.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toEqual({
      frequency: 'DAILY',
      until: '2030-01-31',
      weekdaysOnly: false,
    });
  });
});
