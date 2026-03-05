/**
 * Hook for managing event notification preferences and scheduling.
 *
 * One "Notify Me" button per event - when enabled, schedules a local notification for each
 * upcoming occurrence. Persists enabled state to AsyncStorage so preferences survive app restarts.
 * Notifications show event name (title) and map (body) when the event goes active.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import type { EventTimer } from '@/hooks/use-event-timers';
import {
  cancelEventNotification,
  isNotificationsSupported,
  requestNotificationPermissions,
  scheduleEventNotification,
} from '@/services/event-notifications';

const STORAGE_KEY = 'event-notification-ids';

/** eventName -> timer IDs we scheduled for that event */
type EventNotificationMap = Record<string, string[]>;

export function useEventNotifications() {
  const [eventMap, setEventMap] = useState<EventNotificationMap>({});
  const [loaded, setLoaded] = useState(false);

  /** Load persisted notification preferences from AsyncStorage */
  const loadFromStorage = useCallback(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as EventNotificationMap;
            setEventMap(typeof parsed === 'object' ? parsed : {});
          } catch {
            setEventMap({});
          }
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Load on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Reload when screen gains focus so notify state stays synced across Home/Active tabs
  useFocusEffect(
    useCallback(() => {
      loadFromStorage();
    }, [loadFromStorage])
  );

  /** Save notification state to AsyncStorage */
  const persist = useCallback((map: EventNotificationMap) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }, []);

  const isNotifying = useCallback(
    (eventName: string): boolean => {
      return eventName in eventMap;
    },
    [eventMap]
  );

  /** Enable or disable notifications for an event; when enabling, schedules one notification per upcoming occurrence */
  const toggleNotify = useCallback(
    async (eventName: string, upcomingTimers: EventTimer[]): Promise<void> => {
      if (!isNotificationsSupported()) return;

      const currentlyEnabled = eventName in eventMap;

      if (currentlyEnabled) {
        // Disable: cancel all scheduled notifications for this event
        const ids = eventMap[eventName] ?? [];
        for (const id of ids) {
          await cancelEventNotification(id);
        }
        const next = { ...eventMap };
        delete next[eventName];
        setEventMap(next);
        persist(next);
      } else {
        // Enable: request permission, then schedule notification for each upcoming occurrence
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert(
            'Notifications Disabled',
            'Please enable notifications in your device settings to get event reminders.'
          );
          return;
        }

        const ids: string[] = [];
        for (const timer of upcomingTimers) {
          const id = await scheduleEventNotification(timer);
          if (id) ids.push(id);
        }
        if (ids.length > 0 || upcomingTimers.length === 0) {
          const next = { ...eventMap, [eventName]: ids };
          setEventMap(next);
          persist(next);
        }
      }
    },
    [eventMap, persist]
  );

  return {
    isNotifying,
    toggleNotify,
    isSupported: isNotificationsSupported(),
    loaded,
  };
}
