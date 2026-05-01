/**
 * Shared reminder settings contract for cute desktop-pet prompts.
 *
 * Responsibility: defines the serializable settings that cross the
 * main/preload/renderer boundary and validates untrusted JSON or IPC values.
 * Side effects: none.
 */
export interface LunchReminderSettings {
  readonly enabled: boolean;
  readonly start: string;
  readonly end: string;
}

export interface ReminderSettings {
  readonly enabled: boolean;
  readonly restIntervalMinutes: number;
  readonly standIntervalMinutes: number;
  readonly minimumGapMinutes: number;
  readonly bubbleDurationSeconds: number;
  readonly lunchReminder: LunchReminderSettings;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  restIntervalMinutes: 45,
  standIntervalMinutes: 60,
  minimumGapMinutes: 10,
  bubbleDurationSeconds: 8,
  lunchReminder: {
    enabled: true,
    start: '11:50',
    end: '12:30'
  }
};

export function normalizeReminderSettings(value: unknown): ReminderSettings {
  if (!isRecord(value)) {
    return DEFAULT_REMINDER_SETTINGS;
  }

  const lunchReminder = isRecord(value.lunchReminder) ? value.lunchReminder : {};

  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : DEFAULT_REMINDER_SETTINGS.enabled,
    restIntervalMinutes: normalizePositiveNumber(
      value.restIntervalMinutes,
      DEFAULT_REMINDER_SETTINGS.restIntervalMinutes
    ),
    standIntervalMinutes: normalizePositiveNumber(
      value.standIntervalMinutes,
      DEFAULT_REMINDER_SETTINGS.standIntervalMinutes
    ),
    minimumGapMinutes: normalizePositiveNumber(
      value.minimumGapMinutes,
      DEFAULT_REMINDER_SETTINGS.minimumGapMinutes
    ),
    bubbleDurationSeconds: normalizePositiveNumber(
      value.bubbleDurationSeconds,
      DEFAULT_REMINDER_SETTINGS.bubbleDurationSeconds
    ),
    lunchReminder: {
      enabled:
        typeof lunchReminder.enabled === 'boolean'
          ? lunchReminder.enabled
          : DEFAULT_REMINDER_SETTINGS.lunchReminder.enabled,
      start: normalizeTimeString(lunchReminder.start, DEFAULT_REMINDER_SETTINGS.lunchReminder.start),
      end: normalizeTimeString(lunchReminder.end, DEFAULT_REMINDER_SETTINGS.lunchReminder.end)
    }
  };
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeTimeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? value
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
