/**
 * UpcomingEventRow - Single row for an upcoming event occurrence.
 *
 * Displays: bullet, time range (mm/dd h:mm - h:mm), map name, and optional
 * "Starts in Xh Xm" countdown when showCountdown is true (used for the next upcoming).
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { EventTimer } from '@/hooks/use-event-timers';

interface UpcomingEventRowProps {
  timer: EventTimer;
  showCountdown?: boolean;
}

/** Format start/end dates as "mm/dd h:mm - h:mm" */
function formatTimeRange(start?: Date, end?: Date): string {
  if (!start || !end) return '';
  const dateStr = start.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
  const startStr = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endStr = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dateStr} ${startStr} - ${endStr}`;
}

/** Format remaining milliseconds as "Starts in Xh Xm" or "Starts in Xm" */
function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Starting';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `Starts in ${hours}h ${minutes}m`;
  }
  return `Starts in ${minutes}m`;
}

export function UpcomingEventRow({ timer, showCountdown = false }: UpcomingEventRowProps) {
  const [displayCountdown, setDisplayCountdown] = useState('');

  // Update countdown display every second when showCountdown is true
  useEffect(() => {
    if (!showCountdown || timer.timeRemaining == null) {
      setDisplayCountdown('');
      return;
    }
    setDisplayCountdown(formatCountdown(timer.timeRemaining));
  }, [showCountdown, timer.timeRemaining]);

  return (
    <View style={styles.row}>
      <View style={styles.bullet} />
      <Text style={styles.timeRange}>{formatTimeRange(timer.startTime, timer.endTime)}</Text>
      <Text style={styles.mapName}>{timer.map}</Text>
      {showCountdown && displayCountdown ? (
        <Text style={styles.countdown}>{displayCountdown}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
  },
  timeRange: {
    fontSize: 13,
    color: '#CCCCCC',
    minWidth: 100,
  },
  mapName: {
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
  },
  countdown: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
});
