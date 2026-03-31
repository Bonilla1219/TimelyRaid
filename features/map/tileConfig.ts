/**
 * Map tile URL templates and version config for MetaForge ARC Raiders maps.
 * Tiles are served as {z}/{x}/{y}.webp under a map ID and version.
 */

/** Tile version per map ID; unknown maps fall back to DEFAULT_VERSION */
export const MAP_VERSIONS: Record<string, string> = {
  dam: '20260112',
  bluegate: '20260112',
  spaceport: '20260112',
  buriedcity: '20260112',
  stellamontis: '20260112',
};

const DEFAULT_VERSION = '20260112';
const BASE_URL = 'https://cdn.metaforge.app/arc-raiders/maps';

export const DEFAULT_ZOOM = 2;
export const MAP_MIN_ZOOM = 0;

/** Zoom levels available for the map. */
export const ZOOM_LEVELS = [1, 2, 3, 5] as const;

/** Grid size per zoom: {maxX, maxY}. Missing tiles render blank. */
export const ZOOM_GRIDS: Record<number, { maxX: number; maxY: number }> = {
  1: { maxX: 1, maxY: 1 },
  2: { maxX: 3, maxY: 2 },
  3: { maxX: 7, maxY: 7 },
  5: { maxX: 31, maxY: 31 },
};

/** Source map dimensions in MetaForge coordinate space; markers lat/lng are in this range. */
export const SOURCE_MAP_WIDTH = 8050;
export const SOURCE_MAP_HEIGHT = 5270;

/** Tile grid at z=2: 4×3 (x: 0–3, y: 0–2). Fallback when zoom not in ZOOM_GRIDS. */
export const TILE_GRID_WIDTH = 4;
export const TILE_GRID_HEIGHT = 3;
export const TILE_GRID_MAX_X = 3;
export const TILE_GRID_MAX_Y = 2;

export function getGridForZoom(z: number): { maxX: number; maxY: number } {
  return ZOOM_GRIDS[z] ?? { maxX: (1 << z) - 1, maxY: (1 << z) - 1 };
}
export const MIN_ZOOM = 0;
export const MAX_ZOOM = 5;

/**
 * Returns the tile URL template for the given map ID.
 * Use with Leaflet: {z}, {x}, {y} are replaced by the tile layer.
 * Unknown map IDs use DEFAULT_VERSION.
 */
export function getTileUrlTemplate(mapId: string): string {
  const version = MAP_VERSIONS[mapId] ?? DEFAULT_VERSION;
  const normalizedId = mapId.toLowerCase();
  return `${BASE_URL}/${normalizedId}/${version}/{z}/{x}/{y}.webp`;
}

const ZOOM_0 = 0;

/** Tile size in pixels (matches CDN tile dimensions). */
export const TILE_SIZE = 256;

/**
 * Returns the single tile URL for zoom level 0 (whole map, one image) for the given map ID.
 */
export function getZoom0TileUrl(mapId: string): string {
  const version = MAP_VERSIONS[mapId] ?? DEFAULT_VERSION;
  const normalizedId = mapId.toLowerCase();
  return `${BASE_URL}/${normalizedId}/${version}/${ZOOM_0}/0/0.webp`;
}

export type TileCoord = { url: string; x: number; y: number };

/**
 * Returns tile URLs for zoom level 1 (2x2 grid). Tiles are 256x256 each,
 * so the stitched map is 512x512. Order: (0,0), (1,0), (0,1), (1,1).
 */
export function getZoom1TileUrls(mapId: string): TileCoord[] {
  const version = MAP_VERSIONS[mapId] ?? DEFAULT_VERSION;
  const normalizedId = mapId.toLowerCase();
  const zoom = 1;
  const tiles: TileCoord[] = [];
  const grid = 2 ** zoom;
  for (let x = 0; x < grid; x++) {
    for (let y = 0; y < grid; y++) {
      tiles.push({
        url: `${BASE_URL}/${normalizedId}/${version}/${zoom}/${x}/${y}.webp`,
        x,
        y,
      });
    }
  }
  return tiles;
}

/**
 * Full stitched image size at zoom 1 (2x2 tiles).
 */
export const ZOOM1_IMAGE_SIZE = TILE_SIZE * 2;

/** Zoom level used by SimpleMapView for stitched full map (32×32 grid). */
export const SIMPLE_MAP_ZOOM = 5;

/**
 * Returns tile URLs for a given zoom level (e.g. 5 for 32×32 stitched map).
 * Uses ZOOM_GRIDS for bounds; each tile is TILE_SIZE × TILE_SIZE.
 */
export function getTileUrlsForZoom(mapId: string, zoom: number): TileCoord[] {
  const version = MAP_VERSIONS[mapId] ?? DEFAULT_VERSION;
  const normalizedId = mapId.toLowerCase();
  const grid = getGridForZoom(zoom);
  const tiles: TileCoord[] = [];
  for (let x = 0; x <= grid.maxX; x++) {
    for (let y = 0; y <= grid.maxY; y++) {
      tiles.push({
        url: `${BASE_URL}/${normalizedId}/${version}/${zoom}/${x}/${y}.webp`,
        x,
        y,
      });
    }
  }
  return tiles;
}

/** Stitched map size at zoom 5: 32 × 256 = 8192. */
export const ZOOM5_IMAGE_SIZE = (ZOOM_GRIDS[5]?.maxX != null ? ZOOM_GRIDS[5].maxX + 1 : 32) * TILE_SIZE;
