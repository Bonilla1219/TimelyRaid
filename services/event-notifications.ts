/**
 * Event notification service - schedules local notifications when events become active.
 *
 * Uses expo-notifications for local scheduling. Each notification fires at the event's startTime
 * and displays the event name (title) and map (body). Not supported on web - no-op.
 */

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { EventTimer } from '@/hooks/use-event-timers';

const ANDROID_CHANNEL_ID = 'event-reminders';

/**
 * Check if notifications are supported on this platform (not on web)
 */
export function isNotificationsSupported(): boolean {
  return Platform.OS !== 'web';
}

/**
 * Request notification permissions. Returns true if granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!isNotificationsSupported()) return false;

  if (!Device.isDevice) {
    return false;
  }

  // Android 8+ requires a notification channel before permissions prompt appears
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Event Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Schedule a notification for when an event becomes active.
 * Notification displays event name (title) and map (body).
 */
export async function scheduleEventNotification(timer: EventTimer): Promise<string | null> {
  if (!isNotificationsSupported()) return null;
  if (!timer.startTime) return null;

  const now = Date.now();
  const startMs = timer.startTime.getTime();
  if (startMs <= now) {
    return null;
  }

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  // Use timer.id as identifier so we can cancel this specific notification later
  const identifier = await Notifications.scheduleNotificationAsync({
    identifier: timer.id,
    content: {
      title: timer.name,
      body: timer.map,
      data: { timerId: timer.id, eventName: timer.name, map: timer.map },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: timer.startTime,
      ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
    },
  });

  return identifier;
}

/**
 * Cancel a scheduled notification by identifier (timer.id used as identifier).
 * Note: expo-notifications uses its own identifier - we store the mapping in the hook.
 */
export async function cancelEventNotification(identifier: string): Promise<void> {
  if (!isNotificationsSupported()) return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}
