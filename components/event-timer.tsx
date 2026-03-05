/**
 * EventTimer - Standalone countdown display for a single timer.
 *
 * Shows event name, map, countdown (or "Active"/"Expired"), and start/end times.
 * Used in map-centric views; EventSection uses UpcomingEventRow for upcoming display.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { EventTimer } from '@/hooks/use-event-timers';

interface EventTimerProps {
  timer: EventTimer;
}

export function EventTimer({ timer }: EventTimerProps) {
  const [displayTime, setDisplayTime] = useState('');

  // Update countdown every second
  useEffect(() => {
    const updateDisplay = () => {
      if (timer.isExpired) {
        setDisplayTime('Expired');
        return;
      }

      if (!timer.timeRemaining || timer.timeRemaining <= 0) {
        if (timer.isActive) {
          setDisplayTime('Active');
        } else {
          setDisplayTime('No timer data');
        }
        return;
      }

      const totalSeconds = Math.floor(timer.timeRemaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (days > 0) {
        setDisplayTime(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setDisplayTime(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setDisplayTime(`${minutes}m ${seconds}s`);
      } else {
        setDisplayTime(`${seconds}s`);
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);

    return () => clearInterval(interval);
  }, [timer.timeRemaining, timer.isActive, timer.isExpired]);

  const getStatusColor = () => {
    if (timer.isExpired) return '#888888';
    if (timer.isActive) return '#4CAF50';
    if (timer.isUpcoming) return '#FFA500';
    return '#4A9EFF';
  };

  const getStatusText = () => {
    if (timer.isExpired) return 'Expired';
    if (timer.isActive) return 'Active';
    if (timer.isUpcoming) return 'Starting Soon';
    return 'Active';
  };

  return (
    <View style={styles.timerContainer}>
      <View style={styles.timerHeader}>
        <Text style={styles.timerName}>{timer.name}</Text>
        {timer.map && (
          <Text style={styles.timerSite}>{timer.map}</Text>
        )}
      </View>
      <View style={styles.timerContent}>
        <View style={[styles.timerBadge, { backgroundColor: getStatusColor() + '20', borderColor: getStatusColor() }]}>
          <Text style={[styles.timerText, { color: getStatusColor() }]}>{displayTime}</Text>
        </View>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
      </View>
      {timer.startTime && (
        <Text style={styles.timeInfo}>
          Starts: {timer.startTime.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })} {timer.startTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </Text>
      )}
      {timer.endTime && (
        <Text style={styles.timeInfo}>
          Ends: {timer.endTime.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })} {timer.endTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  timerContainer: {
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  timerSite: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  timerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  timeInfo: {
    fontSize: 11,
    color: '#888888',
    marginTop: 4,
  },
});

