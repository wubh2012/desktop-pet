/**
 * Cute reminder scheduling helpers for the renderer.
 *
 * Responsibility: decides when a reminder should be shown and picks the matching
 * text/action payload. It does not touch the DOM, timers, or Electron IPC.
 * Side effects: none.
 */
import type { PetOneShotAction } from '../../../shared/petActionMode';
import type { ReminderSettings } from '../../../shared/petReminderSettings';

export type PetReminderKind = 'rest' | 'lunch' | 'stand';

export interface PetReminder {
  readonly kind: PetReminderKind;
  readonly text: string;
  readonly action: PetOneShotAction;
}

export interface PetReminderState {
  readonly startedAt: number;
  readonly lastRestAt: number;
  readonly lastStandAt: number;
  readonly lastShownAt: number;
  readonly lastLunchDateKey: string | null;
}

export interface PetReminderDecision {
  readonly reminder: PetReminder;
  readonly nextState: PetReminderState;
}

const INITIAL_QUIET_MS = 2 * 60 * 1000;
const REST_TEXTS = [
  '主人～眼睛休息一下叭，看远处 20 秒喵。',
  '小猫提醒：伸个懒腰，眨眨眼睛喵。',
  '辛苦啦，先让眼睛放个小假吧～'
] as const;
const LUNCH_TEXTS = [
  '中午到啦，记得好好吃饭，不许只喝咖啡哦。',
  '咕噜咕噜～该补充能量啦！',
  '午饭时间到！小猫等你吃饱再继续。'
] as const;
const STAND_TEXTS = [
  '坐太久啦，起来走一走，伸个懒腰吧～',
  '小猫申请陪你活动一下肩颈！',
  '起来走两步吧，尾巴都替你着急啦。'
] as const;

export function createInitialReminderState(now: number): PetReminderState {
  return {
    startedAt: now,
    lastRestAt: now,
    lastStandAt: now,
    lastShownAt: 0,
    lastLunchDateKey: null
  };
}

export function getDueReminder(
  now: Date,
  state: PetReminderState,
  settings: ReminderSettings
): PetReminderDecision | null {
  if (!settings.enabled) {
    return null;
  }

  const nowMs = now.getTime();
  const minimumGapMs = minutesToMilliseconds(settings.minimumGapMinutes);

  if (state.lastShownAt > 0 && nowMs - state.lastShownAt < minimumGapMs) {
    return null;
  }

  const lunchDecision = getLunchReminder(now, state, settings);
  if (lunchDecision) {
    return lunchDecision;
  }

  if (nowMs - state.startedAt < INITIAL_QUIET_MS) {
    return null;
  }

  if (nowMs - state.lastStandAt >= minutesToMilliseconds(settings.standIntervalMinutes)) {
    return buildDecision(nowMs, state, {
      kind: 'stand',
      text: pickText(STAND_TEXTS, nowMs),
      action: 'attention'
    });
  }

  if (nowMs - state.lastRestAt >= minutesToMilliseconds(settings.restIntervalMinutes)) {
    return buildDecision(nowMs, state, {
      kind: 'rest',
      text: pickText(REST_TEXTS, nowMs),
      action: 'cute'
    });
  }

  return null;
}

function getLunchReminder(
  now: Date,
  state: PetReminderState,
  settings: ReminderSettings
): PetReminderDecision | null {
  if (!settings.lunchReminder.enabled || !isWithinTimeRange(now, settings.lunchReminder.start, settings.lunchReminder.end)) {
    return null;
  }

  const dateKey = formatDateKey(now);

  if (state.lastLunchDateKey === dateKey) {
    return null;
  }

  return buildDecision(now.getTime(), state, {
    kind: 'lunch',
    text: pickText(LUNCH_TEXTS, now.getTime()),
    action: 'cheer'
  }, dateKey);
}

function buildDecision(
  nowMs: number,
  state: PetReminderState,
  reminder: PetReminder,
  lunchDateKey = state.lastLunchDateKey
): PetReminderDecision {
  return {
    reminder,
    nextState: {
      ...state,
      lastRestAt: reminder.kind === 'rest' ? nowMs : state.lastRestAt,
      lastStandAt: reminder.kind === 'stand' ? nowMs : state.lastStandAt,
      lastShownAt: nowMs,
      lastLunchDateKey: lunchDateKey
    }
  };
}

function isWithinTimeRange(now: Date, start: string, end: string): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeMinutes(start);
  const endMinutes = parseTimeMinutes(end);

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

function parseTimeMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);

  return hours * 60 + minutes;
}

function formatDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

function pickText(texts: readonly string[], nowMs: number): string {
  return texts[Math.floor(nowMs / 1000) % texts.length];
}

function minutesToMilliseconds(minutes: number): number {
  return minutes * 60 * 1000;
}
