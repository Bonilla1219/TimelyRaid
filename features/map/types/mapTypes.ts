/**
 * Map UI types. `latitude` / `longitude` on MapPoint are map pixel coordinates
 * in the same space as the stitched tile map (not WGS84).
 */

import type { GameMapMarker } from '@/features/map/metaforge';
import { SOURCE_MAP_HEIGHT, SOURCE_MAP_WIDTH } from '@/features/map/tileConfig';

export type MapCategory =
  | 'containers'
  | 'events'
  | 'locations'
  | 'nature'
  | 'quests';

/** Preferred chip order for the filter bar. */
export const MAP_CATEGORY_ORDER: MapCategory[] = [
  'quests',
  'events',
  'containers',
  'locations',
  'nature',
];

export type MapPoint = {
  id: string;
  category: MapCategory;
  title: string;
  subtitle?: string;
  description?: string;
  /** Map Y in pixel space (same as marker layout `y`). */
  latitude: number;
  /** Map X in pixel space (same as marker layout `x`). */
  longitude: number;
  rarity?: string;
  status?: string;
  iconLabel?: string;
};

const ALIASES: Record<string, MapCategory> = {
  quest: 'quests',
  quests: 'quests',
  container: 'containers',
  containers: 'containers',
  event: 'events',
  events: 'events',
  location: 'locations',
  locations: 'locations',
  nature: 'nature',
};

/**
 * Normalize API category string to MapCategory.
 * Unknown values map to `locations` so markers remain visible with a neutral style.
 */
export function normalizeMapCategory(raw: string): MapCategory {
  const key = raw.trim().toLowerCase();
  return ALIASES[key] ?? 'locations';
}

export function gameMarkerToMapPoint(
  m: GameMapMarker,
  displayWidth: number,
  displayHeight: number
): MapPoint {
  const category = normalizeMapCategory(m.category ?? '');
  const x =
    SOURCE_MAP_WIDTH > 0 ? (m.lng / SOURCE_MAP_WIDTH) * displayWidth : 0;
  const y =
    SOURCE_MAP_HEIGHT > 0 ? (m.lat / SOURCE_MAP_HEIGHT) * displayHeight : 0;

  const parts: string[] = [];
  if (m.behindLockedDoor) parts.push('Behind locked door');

  return {
    id: m.id,
    category,
    title: m.instanceName?.trim() || m.subcategory?.trim() || 'Unknown',
    subtitle: m.subcategory?.trim() || undefined,
    description: parts.length > 0 ? parts.join(' · ') : undefined,
    latitude: y,
    longitude: x,
    status: m.behindLockedDoor ? 'Locked' : undefined,
  };
}
