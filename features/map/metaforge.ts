/**
 * MetaForge map API and types for ARC Raiders map data.
 * Fetches map metadata, tile info, and marker positions (lat/lng from MetaForge).
 */

export interface MetaForgeApiError {
  message: string;
  status: number;
  statusText: string;
}

/** A single marker/POI from MetaForge (game or world coordinates) */
export interface MetaForgeMarker {
  id: string;
  name: string;
  /** Latitude or Y in MetaForge coordinate system */
  lat: number;
  /** Longitude or X in MetaForge coordinate system */
  lng: number;
  icon?: string;
  /** Optional map layer or category */
  layer?: string;
}

/** Response from map markers / POI endpoint */
export interface MetaForgeMapMarkersResponse {
  data: MetaForgeMarker[];
  mapId?: string;
  cachedAt?: number;
}

/** Map metadata (bounds, CRS hint, tile version) */
export interface MetaForgeMapInfo {
  mapId: string;
  name: string;
  /** Suggested center [lat, lng] in MetaForge coords */
  center: [number, number];
  /** Suggested zoom level */
  defaultZoom: number;
  /** Optional bounds [[south, west], [north, east]] */
  bounds?: [[number, number], [number, number]];
}

/** Marker from game-map-data endpoint (arc_map_data) */
export interface GameMapMarker {
  id: string;
  mapID: string;
  category: string;
  subcategory: string;
  lat: number;
  lng: number;
  instanceName: string;
  behindLockedDoor: boolean;
  lootAreas: unknown;
  zlayers: unknown;
  eventConditionMask: unknown;
  updated_at: string;
}

/** Response from game-map-data endpoint */
export interface GameMapDataResponse {
  allData: GameMapMarker[];
}

const MAP_MARKERS_URL = 'https://metaforge.app/api/arc-raiders/map-markers';
const MAP_INFO_URL = 'https://metaforge.app/api/arc-raiders/map-info';
const GAME_MAP_DATA_URL = 'https://metaforge.app/api/game-map-data';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const error: MetaForgeApiError = {
      message: `API Error: ${response.statusText}`,
      status: response.status,
      statusText: response.statusText,
    };
    throw error;
  }
  return (await response.json()) as T;
}

/** Fetch map markers/POIs for the given map (optional mapId for future use) */
export async function getMapMarkers(mapId?: string): Promise<MetaForgeMapMarkersResponse> {
  const url = mapId ? `${MAP_MARKERS_URL}?mapId=${encodeURIComponent(mapId)}` : MAP_MARKERS_URL;
  return fetchJson<MetaForgeMapMarkersResponse>(url);
}

/** Fetch map info (center, zoom, bounds) for the given map */
export async function getMapInfo(mapId?: string): Promise<MetaForgeMapInfo | null> {
  try {
    const url = mapId ? `${MAP_INFO_URL}?mapId=${encodeURIComponent(mapId)}` : MAP_INFO_URL;
    return await fetchJson<MetaForgeMapInfo>(url);
  } catch {
    return null;
  }
}

/** Fetch map markers from game-map-data (arc_map_data) for the given map ID. Returns allData array. */
export async function fetchMapMarkers(mapID: string): Promise<GameMapMarker[]> {
  const params = new URLSearchParams({
    tableID: 'arc_map_data',
    mapID,
  });
  const url = `${GAME_MAP_DATA_URL}?${params.toString()}`;
  const res = await fetchJson<GameMapDataResponse>(url);
  return res.allData ?? [];
}
