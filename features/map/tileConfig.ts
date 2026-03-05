/**
 * Map tile URL templates and version config for Leaflet.
 * Used to build tile layer URLs (e.g. for MetaForge or third-party tile servers).
 */

export interface TileLayerConfig {
  /** Template: {z} = zoom, {x}, {y} = tile indices; {s} = subdomain; {v} = version */
  urlTemplate: string;
  /** Optional version string for cache busting */
  version?: string;
  /** Subdomains for load balancing (e.g. ['a','b','c']) */
  subdomains?: string[];
  /** Max zoom level */
  maxZoom?: number;
  /** Min zoom level */
  minZoom?: number;
  /** Attribution HTML string */
  attribution?: string;
}

/** Default tile URL template (placeholder – replace with real MetaForge or OSM template) */
const DEFAULT_TILE_TEMPLATE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/** Current map tile version for cache busting when tiles are updated */
export const TILE_VERSION = '1';

/** Default tile layer config for the in-game map */
export const defaultTileConfig: TileLayerConfig = {
  urlTemplate: DEFAULT_TILE_TEMPLATE,
  version: TILE_VERSION,
  subdomains: ['a', 'b', 'c'],
  maxZoom: 18,
  minZoom: 1,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

/**
 * Build the final tile URL template with version substituted.
 * Replaces {v} with tileConfig.version if present.
 */
export function getTileUrlTemplate(config: TileLayerConfig): string {
  let url = config.urlTemplate;
  if (config.version != null && url.includes('{v}')) {
    url = url.replace('{v}', config.version);
  }
  return url;
}
