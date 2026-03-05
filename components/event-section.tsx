/**
 * EventSection - Card displaying one event with its current status and next upcoming timer.
 *
 * Layout:
 *   - Header: icon, event name, ACTIVE badge (when active), "Now on: [map]" (when active)
 *   - Ends-in countdown (when active)
 *   - Progress bar showing how far through the active event (when active)
 *   - Notify Me button (toggles notifications for all upcoming occurrences)
 *   - Next upcoming timer only (tap to see all)
 *
 * Tapping the card navigates to the event detail screen with full timer list.
 */

import { useEventNotifications } from '@/hooks/use-event-notifications';
import type { EventGroup } from '@/hooks/use-event-timers';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { NotifyMeButton } from './notify-me-button';
import { UpcomingEventRow } from './upcoming-event-row';

interface EventSectionProps {
  eventGroup: EventGroup;
}

/** Format milliseconds remaining as "Xh Xm Xs" for the ends-in display */
function formatEndsIn(ms: number): string {
  if (ms <= 0) return 'Ending';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export function EventSection({ eventGroup }: EventSectionProps) {
  const { name, icon, activeTimers, upcomingTimers } = eventGroup;
  const { isNotifying, toggleNotify, isSupported } = useEventNotifications();
  const isActive = activeTimers.length > 0;
  const activeTimer = activeTimers[0];
  const [endsIn, setEndsIn] = useState('');

  // Update ends-in countdown every second while event is active
  useEffect(() => {
    if (!isActive || !activeTimer?.timeRemaining) {
      setEndsIn('');
      return;
    }
    const update = () => {
      const remaining = (activeTimer.endTime?.getTime() ?? 0) - Date.now();
      setEndsIn(formatEndsIn(remaining));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isActive, activeTimer?.timeRemaining, activeTimer?.endTime]);

  // Progress bar: how far through the active event (if active)
  const progressPercent = (() => {
    if (!isActive || !activeTimer?.startTime || !activeTimer?.endTime) return 0;
    const start = activeTimer.startTime.getTime();
    const end = activeTimer.endTime.getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return ((now - start) / (end - start)) * 100;
  })();

  const router = useRouter();
  const nextUpcoming = upcomingTimers[0]; // Only show the next occurrence
  const hasMoreTimers = upcomingTimers.length > 1;

  /** Navigate to event detail screen with full timer list */
  const handlePress = () => {
    router.push({
      pathname: '/event/[name]',
      params: { name },
    });
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {icon ? (
            <Image source={{ uri: icon }} style={styles.iconImage} />
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
          <View style={styles.headerTextContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.eventName} numberOfLines={1} ellipsizeMode="tail">
                {name}
              </Text>
              {isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              )}
            </View>
            {isActive && activeTimers.length > 0 && (
              <Text style={styles.mapsList}>
                Now on: {[...new Set(activeTimers.map((t) => t.map))].join(', ')}
              </Text>
            )}
          </View>
        </View>
        {isActive && endsIn && (
          <View style={styles.endsInBlock}>
            <Text style={styles.endsInTime}>{endsIn}</Text>
            <Text style={styles.endsInLabel}>ENDS IN</Text>
          </View>
        )}
      </View>

      {/* Progress bar: visual indicator of how far through the active event */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <NotifyMeButton
        eventName={name}
        upcomingTimers={upcomingTimers}
        isNotifying={isNotifying(name)}
        onToggle={toggleNotify}
        isSupported={isSupported}
      />

      {/* Next upcoming timer; hint to tap for full list when more exist */}
      {nextUpcoming && (
        <View style={styles.upcomingList}>
          <UpcomingEventRow timer={nextUpcoming} showCountdown />
          {hasMoreTimers && (
            <Text style={styles.tapHint}>Tap to see all {upcomingTimers.length} upcoming occurrences</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  iconImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'nowrap',
  },
  eventName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 0,
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapsList: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },
  endsInBlock: {
    alignItems: 'flex-end',
  },
  endsInTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F5DC',
    fontVariant: ['tabular-nums'],
  },
  endsInLabel: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  upcomingList: {
    marginTop: 12,
    paddingTop: 12,
  },
  tapHint: {
    fontSize: 12,
    color: '#888888',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
