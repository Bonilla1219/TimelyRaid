/**
 * Cache layer for map markers. Stores markers_${mapID}.json with fetchedAt.
 * TTL 24 hours. Use forceRefresh to bypass cache.
 */

import type { GameMapMarker } from '@/features/map/metaforge';
import { fetchMapMarkers } from '@/features/map/metaforge';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cacheKey(mapID: string): string {
  return `markers_${mapID}.json`;
}

interface CachedEntry {
  data: GameMapMarker[];
  fetchedAt: number;
}

/** Read cached markers if present and not expired. Returns null if miss or expired. */
export async function getCachedMarkers(mapID: string): Promise<GameMapMarker[] | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(mapID));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry;
    if (!entry?.data || !Number.isFinite(entry.fetchedAt)) return null;
    if (Date.now() - entry.fetchedAt > TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/** Write markers to cache with current timestamp. */
export async function setCachedMarkers(mapID: string, data: GameMapMarker[]): Promise<void> {
  const entry: CachedEntry = { data, fetchedAt: Date.now() };
  await AsyncStorage.setItem(cacheKey(mapID), JSON.stringify(entry));
}

export interface FetchMarkersOptions {
  /** If true, skip cache and refetch from API. */
  forceRefresh?: boolean;
}

/** Fetch markers: use cache when fresh, otherwise fetch from API and cache. */
export async function fetchMapMarkersCached(
  mapID: string,
  options: FetchMarkersOptions = {}
): Promise<GameMapMarker[]> {
  const { forceRefresh = false } = options;

  if (!forceRefresh) {
    const cached = await getCachedMarkers(mapID);
    if (cached != null) return cached;
  }

  const data = await fetchMapMarkers(mapID);
  await setCachedMarkers(mapID, data);
  return data;
}
