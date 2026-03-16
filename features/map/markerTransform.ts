/**
 * Convert MetaForge lat/lng coordinates to Leaflet CRS and to map pixel points.
 * MetaForge may use a custom or game CRS; this module maps them to Leaflet's default
 * EPSG:4326 (WGS84) and to screen/canvas coordinates within given bounds.
 */

import type { MetaForgeMarker } from './metaforge';

/** Leaflet-style point: [lat, lng] in degrees (EPSG:4326) */
export type LeafletLatLng = [number, number];

/** Any object with lat/lng (e.g. MetaForgeMarker, GameMapMarker) */
export interface LatLngMarker {
  lat: number;
  lng: number;
}

/** Min/max lat and lng from a set of markers */
export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Map/canvas size in pixels */
export interface MapSize {
  width: number;
  height: number;
}

/** Point in map pixel space */
export interface MapPoint {
  x: number;
  y: number;
}

export interface ToMapPointOptions {
  /** If true (default), y is flipped so increasing lat goes up. */
  flipY?: boolean;
}

/**
 * Compute min/max lat and lng from an array of markers.
 * Returns a degenerate bounds (minLat === maxLat, minLng === maxLng) for empty arrays.
 *
 * @example
 * // computeBounds([{ lat: 10, lng: 5 }, { lat: 20, lng: 15 }])
 * // => { minLat: 10, maxLat: 20, minLng: 5, maxLng: 15 }
 */
export function computeBounds(markers: LatLngMarker[]): Bounds {
  if (markers.length === 0) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  }
  let minLat = markers[0].lat;
  let maxLat = markers[0].lat;
  let minLng = markers[0].lng;
  let maxLng = markers[0].lng;
  for (let i = 1; i < markers.length; i++) {
    const m = markers[i];
    if (m.lat < minLat) minLat = m.lat;
    if (m.lat > maxLat) maxLat = m.lat;
    if (m.lng < minLng) minLng = m.lng;
    if (m.lng > maxLng) maxLng = m.lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Map a marker's lat/lng to pixel coordinates (x, y) within mapSize using bounds.
 * Normalizes (lat,lng) to [0,1] in bounds then scales to mapSize. With flipY: true
 * (default), increasing lat goes upward (y decreases).
 *
 * @example
 * const markers = [
 *   { lat: 0, lng: 0 },
 *   { lat: 100, lng: 200 },
 * ];
 * const bounds = computeBounds(markers);
 * // bounds => { minLat: 0, maxLat: 100, minLng: 0, maxLng: 200 }
 * const mapSize = { width: 400, height: 300 };
 * toMapPoint(markers[0], bounds, mapSize);
 * // => { x: 0, y: 300 }  (flipY: true → top-left origin, y down)
 * toMapPoint(markers[1], bounds, mapSize);
 * // => { x: 400, y: 0 }
 * toMapPoint(markers[0], bounds, mapSize, { flipY: false });
 * // => { x: 0, y: 0 }
 */
export function toMapPoint(
  marker: LatLngMarker,
  bounds: Bounds,
  mapSize: MapSize,
  options: ToMapPointOptions = {}
): MapPoint {
  const { flipY = true } = options;
  const latRange = bounds.maxLat - bounds.minLat;
  const lngRange = bounds.maxLng - bounds.minLng;
  const normLng = lngRange === 0 ? 0.5 : (marker.lng - bounds.minLng) / lngRange;
  const normLat = latRange === 0 ? 0.5 : (marker.lat - bounds.minLat) / latRange;
  const x = normLng * mapSize.width;
  let y = normLat * mapSize.height;
  if (flipY) y = mapSize.height - y;
  return { x, y };
}

/**
 * Default transform: MetaForge coords are treated as raw lat/lng (no scaling).
 * Override this or add a config if MetaForge uses a different CRS (e.g. 0–1 normalized,
 * or game pixels that need scale + offset).
 */
export function metaforgeToLeafletLatLng(lat: number, lng: number): LeafletLatLng {
  return [lat, lng];
}

/**
 * Convert a MetaForge marker to Leaflet [lat, lng].
 */
export function metaforgeMarkerToLeaflet(marker: MetaForgeMarker): LeafletLatLng {
  return metaforgeToLeafletLatLng(marker.lat, marker.lng);
}

/**
 * Convert an array of MetaForge markers to Leaflet [lat, lng] tuples.
 */
export function metaforgeMarkersToLeaflet(markers: MetaForgeMarker[]): LeafletLatLng[] {
  return markers.map(metaforgeMarkerToLeaflet);
}
