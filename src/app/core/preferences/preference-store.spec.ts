import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PreferenceStore } from './preference-store.service';
import { oneOf } from './model/preference-values';

const COLOR = {
  key: 'color',
  defaultValue: 'blue',
  parse: oneOf(['blue', 'red']),
  storageKey: 'legacy-color',
};

describe('PreferenceStore', () => {
  beforeEach(() => localStorage.clear());

  it('reads legacy cache values, ignores invalid ones and writes JSON', () => {
    localStorage.setItem('legacy-color', 'red');
    localStorage.setItem('plannerfy-preference-size', '"huge"');
    const store = TestBed.inject(PreferenceStore);
    const color = store.define(COLOR);
    const size = store.define({
      key: 'size',
      defaultValue: 'small',
      parse: oneOf(['small', 'large']),
    });

    expect(color.value()).toBe('red');
    expect(size.value()).toBe('small');
    size.set('large');
    expect(localStorage.getItem('plannerfy-preference-size')).toBe('"large"');
  });

  it('notifies user changes only, ignoring invalid and unchanged values', () => {
    const store = TestBed.inject(PreferenceStore);
    const listener = vi.fn();
    store.onChange(listener);
    const color = store.define(COLOR);

    color.set('blue');
    color.set('green' as 'blue');
    expect(listener).not.toHaveBeenCalled();
    color.set('red');
    expect(listener).toHaveBeenCalledExactlyOnceWith('color');

    expect(store.applyRemote('color', 'blue')).toBe(true);
    expect(store.applyRemote('color', 'purple')).toBe(false);
    expect(color.value()).toBe('blue');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('shares one value per key and announces late definitions', () => {
    const store = TestBed.inject(PreferenceStore);
    const defined = vi.fn();
    store.onDefine(defined);
    const first = store.define(COLOR);
    const second = store.define(COLOR);
    first.set('red');
    expect(second.value()).toBe('red');
    expect(defined).toHaveBeenCalledExactlyOnceWith('color');
  });
});
