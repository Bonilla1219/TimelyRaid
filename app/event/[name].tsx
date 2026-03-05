/**
 * Event detail screen - full list of all timers for a single event.
 *
 * Opened when user taps an event card. Shows active (green), upcoming (orange), and
 * past (gray) timers with time range, map, and status. Uses event name from URL params
 * to find the matching EventGroup from useEventTimers.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEventTimers } from '@/hooks/use-event-timers';
import type { EventTimer } from '@/hooks/use-event-timers';

/** Format start/end dates as "mm/dd h:mm - h:mm" */
function formatTimeRange(start?: Date, end?: Date): string {
  if (!start || !end) return '—';
  const dateStr = start.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
  const startStr = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endStr = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dateStr} ${startStr} - ${endStr}`;
}

/** Single row in the timer list: bullet, time range, map, status badge */
function TimerRow({ timer }: { timer: EventTimer }) {
  const status = timer.isActive ? 'Active' : timer.isUpcoming ? 'Upcoming' : 'Past';
  const statusColor = timer.isActive ? '#4CAF50' : timer.isUpcoming ? '#FFA500' : '#888888';

  return (
    <View style={styles.timerRow}>
      <View style={[styles.bullet, { backgroundColor: statusColor }]} />
      <Text style={styles.timeRange}>{formatTimeRange(timer.startTime, timer.endTime)}</Text>
      <Text style={styles.mapName}>{timer.map}</Text>
      <Text style={[styles.statusBadge, { color: statusColor }]}>{status}</Text>
    </View>
  );
}

export default function EventDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const { eventGroups, loading } = useEventTimers();

  // Match event by name from URL params (passed when user taps event card)
  const eventGroup = eventGroups.find((eg) => eg.name === name);
  const isActive = eventGroup && eventGroup.activeTimers.length > 0;
  const activeMap =
    eventGroup?.activeTimers.length && eventGroup.activeTimers[0]
      ? [...new Set(eventGroup.activeTimers.map((t) => t.map))].join(', ')
      : null;

  // Show "not found" when event name missing or no matching event after load
  if (!name || (eventGroup === undefined && !loading)) {
    return (
      <ImageBackground
        source={require('@/assets/images/Background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>Event not found</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('@/assets/images/Background.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.backButton} onPress={() => router.back()}>
            ← Back
          </Text>
        </View>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : eventGroup ? (
            <View style={styles.detailCard}>
              <View style={styles.eventHeader}>
                {eventGroup.icon ? (
                  <Image source={{ uri: eventGroup.icon }} style={styles.iconImage} />
                ) : (
                  <View style={styles.iconPlaceholder} />
                )}
                <View style={styles.eventTitleBlock}>
                  <Text style={styles.eventName}>{eventGroup.name}</Text>
                  {isActive && activeMap && (
                    <Text style={styles.activeMap}>Now on: {activeMap}</Text>
                  )}
                </View>
              </View>

              {/* Active first, then upcoming, then past */}
              <Text style={styles.sectionLabel}>All times</Text>
              {eventGroup.activeTimers.map((t) => (
                <TimerRow key={t.id} timer={t} />
              ))}
              {eventGroup.upcomingTimers.map((t) => (
                <TimerRow key={t.id} timer={t} />
              ))}
              {eventGroup.expiredTimers.map((t) => (
                <TimerRow key={t.id} timer={t} />
              ))}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    fontSize: 16,
    color: '#4A9EFF',
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  detailCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  iconImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  eventTitleBlock: {
    flex: 1,
  },
  eventName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeMap: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeRange: {
    fontSize: 14,
    color: '#CCCCCC',
    minWidth: 130,
  },
  mapName: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
  },
  loadingText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginTop: 40,
  },
});
