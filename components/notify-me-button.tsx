/**
 * NotifyMeButton - Toggle for event notifications.
 *
 * One button per event (not per occurrence). When enabled, schedules notifications
 * for all upcoming timers passed in. Shows "Notify Me" or "Notifying" with visual
 * distinction when active. Hidden on web (local notifications not supported).
 */

import { Pressable, StyleSheet, Text } from 'react-native';
import type { EventTimer } from '@/hooks/use-event-timers';

interface NotifyMeButtonProps {
  eventName: string;
  upcomingTimers: EventTimer[];
  isNotifying: boolean;
  onToggle: (eventName: string, upcomingTimers: EventTimer[]) => Promise<void>;
  isSupported: boolean;
}

export function NotifyMeButton({
  eventName,
  upcomingTimers,
  isNotifying,
  onToggle,
  isSupported,
}: NotifyMeButtonProps) {
  // Local notifications not supported on web
  if (!isSupported) return null;

  const handlePress = () => {
    onToggle(eventName, upcomingTimers);
  };

  // Disable when no upcoming timers and not already notifying (nothing to schedule)
  const hasUpcoming = upcomingTimers.length > 0;

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.button, isNotifying && styles.buttonActive]}
      disabled={!hasUpcoming && !isNotifying}
    >
      <Text style={[styles.text, isNotifying && styles.textActive]}>
        {isNotifying ? 'Notifying' : 'Notify Me'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#333333',
    borderWidth: 1,
    borderColor: '#555555',
    marginTop: 10,
  },
  buttonActive: {
    backgroundColor: '#4CAF5020',
    borderColor: '#4CAF50',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
  },
  textActive: {
    color: '#4CAF50',
  },
});
