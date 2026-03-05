/**
 * Convert MetaForge lat/lng coordinates to Leaflet CRS (latitude, longitude in degrees).
 * MetaForge may use a custom or game CRS; this module maps them to Leaflet's default
 * EPSG:4326 (WGS84) for use in Leaflet.
 */

import type { MetaForgeMarker } from './metaforge';

/** Leaflet-style point: [lat, lng] in degrees (EPSG:4326) */
export type LeafletLatLng = [number, number];

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
