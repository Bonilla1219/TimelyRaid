/**
 * TypeScript types for MetaForge ARC Raiders Events Schedule API
 * API: https://metaforge.app/api/arc-raiders/events-schedule
 */

export interface ApiError {
  message: string;
  status: number;
  statusText: string;
}

export interface ScheduleEvent {
  name: string;
  map: string;
  icon?: string;
  startTime: number; // Unix timestamp in ms
  endTime: number;   // Unix timestamp in ms
}

export interface EventsScheduleResponse {
  data: ScheduleEvent[];
  cachedAt?: number;
}
