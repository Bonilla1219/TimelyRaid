/**
 * HTML string builder for embedding a Leaflet map in a WebView.
 * Injects Leaflet CSS/JS from CDN and renders map with optional tile layer and markers.
 */

import type { TileLayerConfig } from '../tileConfig';
import { getTileUrlTemplate } from '../tileConfig';
import type { LeafletLatLng } from '../markerTransform';

export interface LeafletHtmlOptions {
  /** Tile layer config (URL template, attribution, etc.) */
  tileConfig: TileLayerConfig;
  /** Initial center [lat, lng] */
  center: [number, number];
  /** Initial zoom level */
  zoom: number;
  /** Markers to show: [lat, lng], optionally with label */
  markers?: Array<{ latLng: LeafletLatLng; label?: string }>;
  /** Container width (CSS, e.g. '100%') */
  width?: string;
  /** Container height (CSS, e.g. '100vh') */
  height?: string;
}

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

/**
 * Build a full HTML document string that loads Leaflet and initializes the map
 * with the given tile layer and markers. Safe to inject into WebView.
 */
export function buildLeafletHtml(options: LeafletHtmlOptions): string {
  const {
    tileConfig,
    center,
    zoom,
    markers = [],
    width = '100%',
    height = '100%',
  } = options;

  const tileUrl = getTileUrlTemplate(tileConfig);
  const attribution = tileConfig.attribution ?? '';
  const maxZoom = tileConfig.maxZoom ?? 18;
  const minZoom = tileConfig.minZoom ?? 0;

  const markersJson = JSON.stringify(
    markers.map((m) => ({ lat: m.latLng[0], lng: m.latLng[1], label: m.label ?? '' }))
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="${LEAFLET_CSS}" />
</head>
<body style="margin:0;padding:0;">
  <div id="map" style="width:${width};height:${height};"></div>
  <script src="${LEAFLET_JS}"></script>
  <script>
    (function() {
      var center = [${center[0]}, ${center[1]}];
      var zoom = ${zoom};
      var tileUrl = ${JSON.stringify(tileUrl)};
      var attribution = ${JSON.stringify(attribution)};
      var maxZoom = ${maxZoom};
      var minZoom = ${minZoom};
      var markersData = ${markersJson};

      var map = L.map('map').setView(center, zoom);
      L.tileLayer(tileUrl, { attribution: attribution, maxZoom: maxZoom, minZoom: minZoom }).addTo(map);

      markersData.forEach(function(m) {
        var marker = L.marker([m.lat, m.lng]).addTo(map);
        if (m.label) marker.bindPopup(m.label);
      });
    })();
  </script>
</body>
</html>`;
}
