import { describe, expect, test } from 'vitest';

import { DEFAULT_REMINDER_SETTINGS } from '../../../shared/petReminderSettings';
import { createInitialReminderState, getDueReminder } from './reminders';

const start = new Date('2026-05-01T09:00:00');

describe('pet reminders', () => {
  test('does not remind during initial quiet period', () => {
    const state = createInitialReminderState(start.getTime());
    const decision = getDueReminder(new Date('2026-05-01T09:01:00'), state, DEFAULT_REMINDER_SETTINGS);

    expect(decision).toBeNull();
  });

  test('triggers rest reminder after configured interval', () => {
    const state = createInitialReminderState(start.getTime());
    const decision = getDueReminder(new Date('2026-05-01T09:45:00'), state, DEFAULT_REMINDER_SETTINGS);

    expect(decision?.reminder.kind).toBe('rest');
    expect(decision?.reminder.action).toBe('cute');
    expect(decision?.reminder.text.length).toBeGreaterThan(0);
  });

  test('triggers stand reminder before rest when both are due', () => {
    const state = createInitialReminderState(start.getTime());
    const decision = getDueReminder(new Date('2026-05-01T10:00:00'), state, DEFAULT_REMINDER_SETTINGS);

    expect(decision?.reminder.kind).toBe('stand');
    expect(decision?.reminder.action).toBe('greet');
  });

  test('throttles reminders by minimum gap', () => {
    const state = {
      ...createInitialReminderState(start.getTime()),
      lastShownAt: new Date('2026-05-01T09:40:00').getTime()
    };
    const decision = getDueReminder(new Date('2026-05-01T09:45:00'), state, DEFAULT_REMINDER_SETTINGS);

    expect(decision).toBeNull();
  });

  test('triggers lunch once per day', () => {
    const state = createInitialReminderState(start.getTime());
    const settings = {
      ...DEFAULT_REMINDER_SETTINGS,
      restIntervalMinutes: 999,
      standIntervalMinutes: 999
    };
    const first = getDueReminder(new Date('2026-05-01T11:55:00'), state, settings);
    const second = first ? getDueReminder(new Date('2026-05-01T12:10:00'), first.nextState, settings) : null;

    expect(first?.reminder.kind).toBe('lunch');
    expect(first?.reminder.action).toBe('cheer');
    expect(second).toBeNull();
  });
});
