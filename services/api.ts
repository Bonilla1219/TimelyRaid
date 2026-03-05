/**
 * MetaForge ARC Raiders Events Schedule API Service
 *
 * Fetches event schedule from MetaForge API. Uses in-memory cache (24h TTL) to avoid
 * excessive requests. Retries failed fetches with exponential backoff.
 */

import type { ApiError, EventsScheduleResponse } from '@/types/api';

const EVENTS_SCHEDULE_URL = 'https://metaforge.app/api/arc-raiders/events-schedule';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY = 1000; // 1 second

interface CacheEntry {
  data: EventsScheduleResponse;
  timestamp: number;
}

let cache: CacheEntry | null = null;

/** Fetch from API with retry on failure (exponential backoff) */
async function fetchWithRetry(): Promise<EventsScheduleResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(EVENTS_SCHEDULE_URL, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error: ApiError = {
          message: `API Error: ${response.statusText}`,
          status: response.status,
          statusText: response.statusText,
        };
        throw error;
      }

      const data = (await response.json()) as EventsScheduleResponse;
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < RETRY_ATTEMPTS) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Unknown error occurred');
}

/** Fetch events schedule; returns cached data if within 24 hours */
export async function getEventsSchedule(): Promise<EventsScheduleResponse> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  const data = await fetchWithRetry();
  cache = { data, timestamp: now };
  return data;
}

/** Clear the cache (e.g. when user taps Refresh) */
export function clearEventsCache(): void {
  cache = null;
}
