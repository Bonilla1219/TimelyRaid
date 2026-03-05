/**
 * React hook for managing event timers from the events-schedule API.
 *
 * Fetches event schedule data, groups events by name, and computes active/upcoming/expired
 * status for each occurrence. Updates every second for live countdown display.
 */

import { getEventsSchedule, clearEventsCache } from '@/services/api';
import type { ApiError, ScheduleEvent } from '@/types/api';
import { useEffect, useMemo, useState } from 'react';

export interface EventTimer {
  id: string;
  name: string;
  map: string;
  icon?: string;
  startTime?: Date;
  endTime?: Date;
  timeRemaining?: number; // in milliseconds
  isActive?: boolean;
  isUpcoming?: boolean;
  isExpired?: boolean;
}

export interface MapEventTimers {
  map: string;
  mapDisplayName: string;
  timers: EventTimer[];
}

export interface EventGroup {
  name: string;
  icon?: string;
  activeTimers: EventTimer[];
  upcomingTimers: EventTimer[];
  expiredTimers: EventTimer[];
  /** Unique maps this event appears on (for display) */
  maps: string[];
}

interface UseEventTimersResult {
  mapTimers: MapEventTimers[];
  /** Events grouped by name, sorted: active first, then by next upcoming */
  eventGroups: EventGroup[];
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

/**
 * Converts a raw API schedule event into an EventTimer with computed status
 * (active/upcoming/expired) and timeRemaining for countdown display.
 */
function scheduleEventToTimer(event: ScheduleEvent, now: number): EventTimer {
  const startTime = event.startTime;
  const endTime = event.endTime;

  const isActive = now >= startTime && now < endTime;
  const isUpcoming = now < startTime;
  const isExpired = now >= endTime;

  let timeRemaining: number;
  if (isActive) {
    timeRemaining = endTime - now;
  } else if (isUpcoming) {
    timeRemaining = startTime - now;
  } else {
    timeRemaining = 0;
  }

  return {
    id: `${event.name}-${event.map}-${event.startTime}`,
    name: event.name,
    map: event.map,
    icon: event.icon,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    timeRemaining,
    isActive,
    isUpcoming,
    isExpired,
  };
}

export function useEventTimers(): UseEventTimersResult {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  // Ticks every second so countdown displays update in real time
  const [currentTime, setCurrentTime] = useState(Date.now());

  /** Fetch schedule from API; bypasses cache when forceRefresh is true */
  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      if (forceRefresh) {
        clearEventsCache();
      }

      const response = await getEventsSchedule();
      setEvents(response.data || []);
    } catch (err) {
      const apiError: ApiError =
        err instanceof Error
          ? {
              message: err.message,
              status: 500,
              statusText: 'Internal Error',
            }
          : (err as ApiError);

      setError(apiError);
      console.error('Error fetching events schedule:', apiError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update current time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /** Group raw events into EventGroups, compute status for each timer */
  const { mapTimers, eventGroups } = useMemo(() => {
    const now = currentTime;

    // Group events by map (for backward compatibility / map-centric views)
    const mapGroups = new Map<string, EventTimer[]>();

    // Group events by event name
    const eventGroupsMap = new Map<string, { timers: EventTimer[]; icon?: string }>();

    for (const event of events) {
      const timer = scheduleEventToTimer(event, now);
      const mapKey = event.map;

      if (!mapGroups.has(mapKey)) {
        mapGroups.set(mapKey, []);
      }
      mapGroups.get(mapKey)!.push(timer);

      const eventKey = event.name;
      if (!eventGroupsMap.has(eventKey)) {
        eventGroupsMap.set(eventKey, { timers: [], icon: event.icon });
      }
      eventGroupsMap.get(eventKey)!.timers.push(timer);
    }

    // Sort timers within each map
    const mapTimersResult: MapEventTimers[] = [];
    for (const [mapDisplayName, timers] of mapGroups) {
      timers.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        if (a.isUpcoming && !b.isUpcoming) return -1;
        if (!a.isUpcoming && b.isUpcoming) return 1;
        if (a.timeRemaining != null && b.timeRemaining != null) {
          return a.timeRemaining - b.timeRemaining;
        }
        return 0;
      });
      mapTimersResult.push({
        map: mapDisplayName.toLowerCase().replace(/\s+/g, '-'),
        mapDisplayName,
        timers,
      });
    }

    // Build event groups
    const eventGroupsResult: EventGroup[] = [];
    for (const [eventName, { timers, icon }] of eventGroupsMap) {
      const activeTimers = timers.filter((t) => t.isActive);
      const upcomingTimers = timers
        .filter((t) => t.isUpcoming)
        .sort((a, b) => (a.startTime?.getTime() ?? 0) - (b.startTime?.getTime() ?? 0));
      const expiredTimers = timers.filter((t) => t.isExpired);
      const maps = [...new Set(timers.map((t) => t.map))];

      eventGroupsResult.push({
        name: eventName,
        icon,
        activeTimers,
        upcomingTimers,
        expiredTimers,
        maps,
      });
    }

    // Sort event groups: those with active first, then by next upcoming start time
    eventGroupsResult.sort((a, b) => {
      const aHasActive = a.activeTimers.length > 0;
      const bHasActive = b.activeTimers.length > 0;
      if (aHasActive && !bHasActive) return -1;
      if (!aHasActive && bHasActive) return 1;
      const aNextStart = a.upcomingTimers[0]?.startTime?.getTime() ?? Infinity;
      const bNextStart = b.upcomingTimers[0]?.startTime?.getTime() ?? Infinity;
      return aNextStart - bNextStart;
    });

    return { mapTimers: mapTimersResult, eventGroups: eventGroupsResult };
  }, [events, currentTime]);

  return {
    mapTimers,
    eventGroups,
    loading,
    error,
    refetch: () => fetchData(true),
  };
}
