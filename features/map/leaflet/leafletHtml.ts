/**
 * HTML string builder for embedding a Leaflet map in a WebView.
 * Uses CRS.Simple with fixed bounds; markers are set via postMessage.
 * Loads Leaflet dynamically to improve compatibility with WebView.
 */

export interface LeafletHtmlOptions {
  /** Tile URL template with {z}, {x}, {y} placeholders */
  tileUrlTemplate: string;
  /** Map zoom range (can be negative for CRS.Simple) */
  minZoom: number;
  maxZoom: number;
  /** Tile layer zoom range (should match CDN, typically 0–6) */
  tileMinZoom?: number;
  tileMaxZoom?: number;
  /** Map extent: bounds [[0,0], [mapSize, mapSize]] (square). Ignored when mapWidth/mapHeight provided. */
  mapSize?: number;
  /** Map width in pixels (for rectangular bounds). Use with mapHeight. */
  mapWidth?: number;
  /** Map height in pixels (for rectangular bounds). Use with mapWidth. */
  mapHeight?: number;
  /** Tile grid bounds: max x (e.g. 29 for 30-column grid) */
  tileMaxX?: number;
  /** Tile grid bounds: max y (e.g. 19 for 20-row grid) */
  tileMaxY?: number;
  /** Enable marker layer and SET_MARKERS listener. Default false. */
  markersEnabled?: boolean;
  /** Initial zoom level (e.g. 1) */
  initialZoom?: number;
  /** Initial center x (map coords). Used with initialCenterY. */
  initialCenterX?: number;
  /** Initial center y (map coords). Used with initialCenterX. */
  initialCenterY?: number;
  /** If true, tiles keep their intrinsic size from the URL (do not force 256×256). Default true. */
  keepTileIntrinsicSize?: boolean;
  /** If true, limit panning to map bounds so tiles are not infinitely generated. Default false. */
  limitPanning?: boolean;
  /** If true, use custom stitch layer with cumulative offsets (for variable tile sizes). Requires tileMaxX, tileMaxY. */
  useStitchLayer?: boolean;
  /** Zoom levels for zoom buttons, e.g. [1, 2, 3]. */
  zoomLevels?: number[];
  /** Grid {maxX, maxY} per zoom level. Missing tiles render blank. */
  zoomGrids?: Record<number, { maxX: number; maxY: number }>;
  /** If false, hide status/debug overlay. Default false. */
  showDebug?: boolean;
}

export interface LeafletMarker {
  id: string;
  x: number;
  y: number;
  category: string;
  subcategory: string;
  title: string;
}

const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

/** Critical Leaflet CSS inlined so map renders even when external CSS is blocked */
const LEAFLET_CSS_INLINE = `.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{position:absolute;left:0;top:0}.leaflet-container{overflow:hidden;background:#1a1a1a}.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow{-webkit-user-select:none;user-select:none;-webkit-user-drag:none}.leaflet-tile{filter:inherit;visibility:hidden}.leaflet-tile-loaded{visibility:inherit}.leaflet-container img.leaflet-tile{max-width:none!important;max-height:none!important;width:auto!important;height:auto!important;padding:0}.leaflet-tile-pane{z-index:200}.leaflet-overlay-pane{z-index:400}.leaflet-marker-pane{z-index:600}.leaflet-popup-pane{z-index:700}.leaflet-container.leaflet-touch-zoom{-ms-touch-action:pan-x pan-y;touch-action:pan-x pan-y}.leaflet-container.leaflet-touch-drag{-ms-touch-action:pinch-zoom;touch-action:pinch-zoom}`;

/**
 * Build a full HTML document string that loads Leaflet 1.9.x and initializes
 * a map with L.CRS.Simple, fixed bounds, and a tile layer. Markers are set
 * by posting SET_MARKERS messages; marker clicks post MARKER_CLICK to the WebView.
 */
export function buildLeafletHtml(options: LeafletHtmlOptions): string {
  const {
    tileUrlTemplate,
    minZoom,
    maxZoom,
    mapSize = 256,
    mapWidth,
    mapHeight,
    tileMaxX,
    tileMaxY,
    markersEnabled = false,
    tileMinZoom = 0,
    tileMaxZoom = maxZoom,
    initialZoom,
    initialCenterX,
    initialCenterY,
    keepTileIntrinsicSize = true,
    limitPanning = false,
    useStitchLayer = false,
    zoomLevels = [1, 2, 3],
    zoomGrids = { 1: { maxX: 1, maxY: 1 }, 2: { maxX: 3, maxY: 2 }, 3: { maxX: 7, maxY: 7 } },
    showDebug = false,
  } = options;
  const tileUrlEscaped = JSON.stringify(tileUrlTemplate);
  const zoom = initialZoom ?? Math.round((minZoom + maxZoom) / 2);

  const initGrid = zoomGrids[zoom] ?? { maxX: (1 << zoom) - 1, maxY: (1 << zoom) - 1 };
  const initEstW = (initGrid.maxX + 1) * 256;
  const initEstH = (initGrid.maxY + 1) * 256;
  const useRect = mapWidth != null && mapHeight != null;
  const bounds = `[[0, 0], [${initEstH}, ${initEstW}]]`;
  const center = `[${initEstH / 2}, ${initEstW / 2}]`;
  const maxX = tileMaxX != null ? tileMaxX : -1;
  const maxY = tileMaxY != null ? tileMaxY : -1;
  const keepIntrinsic = keepTileIntrinsicSize === true;
  const useMaxBounds = limitPanning === true;
  const useStitch = useStitchLayer === true && maxX >= 0 && maxY >= 0;
  const zoomLevelsStr = JSON.stringify(zoomLevels);
  const zoomGridsStr = JSON.stringify(zoomGrids);
  const debug = showDebug === true;

  const tileLayerGetUrl = maxX >= 0 && maxY >= 0
    ? `var x = Math.round(coords.x);
              var y = Math.round(coords.y);
              if (x < 0 || x > ${maxX} || y < 0 || y > ${maxY}) {
                lastTileUrl = 'OOB z=' + z + ' x=' + x + ' y=' + y + ' (maxX=${maxX}, maxY=${maxY}) -> transparent';
                return transparentTile;
              }
              var cdnX = x;
              var cdnY = y;`
    : `var maxIdx = Math.pow(2, z) - 1;
              var cdnX = Math.max(0, Math.min(maxIdx, Math.round(coords.x)));
              var cdnY = Math.max(0, Math.min(maxIdx, Math.round(coords.y)));`;

  const markersBlock = markersEnabled
    ? `
        var markerLayer = L.layerGroup().addTo(map);
        var markerIdToLayer = {};
        var lastMarkers = [];
        var currentMapWidth = ${initEstW};
        var currentMapHeight = ${initEstH};

        function clearMarkers() {
          markerLayer.clearLayers();
          markerIdToLayer = {};
        }

        function setMarkers(markers) {
          lastMarkers = markers || [];
          clearMarkers();
          if (!Array.isArray(markers) || markers.length === 0) return;
          markers.forEach(function(m) {
            var x = (m.normX != null ? m.normX * currentMapWidth : (m.x != null ? m.x : 0));
            var y = (m.normY != null ? m.normY * currentMapHeight : (m.y != null ? m.y : 0));
            x = Math.max(0, Math.min(currentMapWidth, x));
            y = Math.max(0, Math.min(currentMapHeight, y));
            var latlng = [y, x];
            var circle = L.circleMarker(latlng, { radius: 6, pane: 'markerPane', draggable: false });
            var lines = [];
            if (m.title) lines.push(m.title);
            if (m.category) lines.push(m.category);
            if (m.subcategory) lines.push(m.subcategory);
            if (lines.length) circle.bindPopup(lines.join(' \\u2013 '));
            circle.on('click', function() {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARKER_CLICK', id: m.id }));
              }
            });
            circle.addTo(markerLayer);
            markerIdToLayer[m.id] = circle;
          });
        }

        window.addEventListener('message', function(event) {
          try {
            var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (msg.type === 'SET_MARKERS' && msg.markers) setMarkers(msg.markers);
          } catch (e) {}
        });
      `
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #1a1a1a; }
    #map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; }
    #tile-crosshair { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 10000; pointer-events: none; text-align: center; }
    #tile-crosshair .crosshair-line { position: absolute; background: rgba(255,0,0,0.9); }
    #tile-crosshair .crosshair-h { width: 24px; height: 2px; left: 50%; top: 50%; margin-left: -12px; margin-top: -1px; }
    #tile-crosshair .crosshair-v { width: 2px; height: 24px; left: 50%; top: 50%; margin-left: -1px; margin-top: -12px; }
    #tile-crosshair .tile-label { margin-top: 18px; font: 14px monospace; color: #0f0; background: rgba(0,0,0,0.9); padding: 4px 8px; border-radius: 4px; white-space: nowrap; }
    #status { position: fixed; top: 8px; left: 8px; right: 8px; z-index: 9999; padding: 8px; background: rgba(0,0,0,0.8); color: #0f0; font: 12px monospace; border-radius: 4px; white-space: pre-wrap; word-break: break-all; }
    #zoom-controls { position: fixed; bottom: 16px; right: 16px; z-index: 9999; display: flex; align-items: center; gap: 12px; }
    #stitch-size { color: #0f0; font: 12px monospace; background: rgba(0,0,0,0.8); padding: 6px 10px; border-radius: 4px; min-width: 80px; }
    #zoom-btns { display: flex; gap: 8px; }
    #zoom-btns button { padding: 10px 16px; background: rgba(0,0,0,0.8); color: #0f0; border: 1px solid #0f0; border-radius: 6px; font: 14px monospace; cursor: pointer; }
    #zoom-btns button.active { background: rgba(0,255,0,0.2); }
    ${LEAFLET_CSS_INLINE}
    .leaflet-marker-pane { pointer-events: none; }
    .leaflet-marker-pane * { pointer-events: auto; }
  </style>
</head>
<body>
  <div id="map"></div>
  ${debug ? '<div id="status">Initializing...</div>' : ''}
  <div id="zoom-controls">
    <span id="stitch-size">-- × -- px</span>
    <div id="zoom-btns"></div>
  </div>
  <div id="tile-crosshair">
    <div class="crosshair-line crosshair-h"></div>
    <div class="crosshair-line crosshair-v"></div>
    <div class="tile-label" id="tile-label">Tile: -, -</div>
  </div>
  <script>
    (function() {
      var tileUrl = ${tileUrlEscaped};
      var minZoom = ${minZoom};
      var maxZoom = ${maxZoom};
      var initialZoom = ${zoom};
      var bounds = ${bounds};
      var center = ${center};
      var transparentTile = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
      var tilesLoaded = 0, tilesFailed = 0;
      var lastError = '';
      var lastTileUrl = '';
      var previewTileUrl = tileUrl
        .replace('{z}', initialZoom)
        .replace('{x}', 0)
        .replace('{y}', 0);
      var sampleUrls = [];
      var getTileUrlCalls = 0;
      var inBoundsUrls = [];

      function formatStatus(txt) {
        var parts = [txt];
        parts.push('TileUrlTemplate: ' + tileUrl);
        parts.push('PreviewTileUrl(z,x,y=0,0,0): ' + previewTileUrl);
        if (lastTileUrl) parts.push('LastTileUrl: ' + lastTileUrl);
        return parts.join('\\n');
      }

      function setStatus(txt) {
        if (!${debug}) return;
        var el = document.getElementById('status');
        if (el) el.textContent = formatStatus(txt);
        if (window.ReactNativeWebView) {
          try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_STATUS', status: formatStatus(txt) })); } catch (e) {}
        }
      }

      function initMap() {
        if (typeof L === 'undefined') { setStatus('ERROR: L undefined'); return; }
        setStatus('Leaflet OK, creating map...');
        window.onerror = function(message, source, lineno, colno, error) {
          try {
            setStatus('JS ERROR: ' + message + ' @' + lineno + ':' + colno);
          } catch (e) {}
          return false;
        };
        try {
          var initialBounds = L.latLngBounds(bounds);
          var mapOpts = {
            crs: L.CRS.Simple,
            zoomControl: false,
            attributionControl: false,
            minZoom: minZoom,
            maxZoom: maxZoom,
            touchZoom: true,
            scrollWheelZoom: true
          };
          if (${useMaxBounds}) {
            mapOpts.maxBounds = initialBounds;
            mapOpts.maxBoundsViscosity = 1.0;
          }
          var map = L.map('map', mapOpts);
          if (${useMaxBounds}) map.setMaxBounds(initialBounds);
          map.setView(center, initialZoom, { animate: false });
          var mapEl = document.getElementById('map');
          var w = mapEl ? mapEl.offsetWidth : 0;
          var h = mapEl ? mapEl.offsetHeight : 0;
          setStatus('Map ready (container ' + w + 'x' + h + ')' + (${useStitch} ? ', adding stitch layer...' : ', adding tile layer...'));

          var boundsCenter = L.latLng(${initEstH / 2}, ${initEstW / 2});
          var maxTileX = ${initGrid.maxX};
          var maxTileY = ${initGrid.maxY};
          function updateTileCrosshair() {
            var el = document.getElementById('tile-label');
            if (!el) return;
            var c = map.getCenter();
            var rawX = Math.floor(c.lng / 256);
            var rawY = Math.floor(c.lat / 256);
            var tileX = Math.max(0, Math.min(maxTileX, rawX));
            var tileY = Math.max(0, Math.min(maxTileY, rawY));
            var out = (rawX !== tileX || rawY !== tileY) ? ' [OOB]' : '';
            el.textContent = 'Tile: ' + tileX + ', ' + tileY + ' (map: ' + Math.round(c.lng) + ', ' + Math.round(c.lat) + ')' + out;
          }
          map.on('moveend', updateTileCrosshair);
          map.on('zoomend', updateTileCrosshair);
          setTimeout(updateTileCrosshair, 0);

          if (${useStitch}) {
            var zoomLevels = ${zoomLevelsStr};
            var zoomGrids = ${zoomGridsStr};
            var stitchLayerRef = null;
            var currentZoomLevel = initialZoom;

            function createStitchLayer(z, mx, my) {
              var StitchLayerClass = L.Layer.extend({
                onAdd: function(m) {
                  var pane = m.getPane('overlayPane');
                  this._container = L.DomUtil.create('div', 'leaflet-stitch-layer', pane);
                  this._container.style.position = 'absolute';
                  this._container.style.left = '0';
                  this._container.style.top = '0';
                  this._container.style.pointerEvents = 'none';
                  var tileWidths = {};
                  var tileHeights = {};
                  var loaded = {};
                  var total = (mx + 1) * (my + 1);
                  function checkDone() {
                    var count = Object.keys(loaded).length;
                    if (count < total) return;
                    var xOffsets = {};
                    var yOffsets = {};
                    var cx = 0;
                    for (var xi = 0; xi <= mx; xi++) {
                      xOffsets[xi] = cx;
                      cx += tileWidths[xi] || 0;
                    }
                    var cy = 0;
                    for (var yi = 0; yi <= my; yi++) {
                      yOffsets[yi] = cy;
                      cy += tileHeights[yi] || 0;
                    }
                    var c = this._container;
                    c.style.width = cx + 'px';
                    c.style.height = cy + 'px';
                    for (var k in loaded) {
                      var img = loaded[k];
                      if (!img) continue;
                      var p = k.split(',');
                      var tx = parseInt(p[0], 10);
                      var ty = parseInt(p[1], 10);
                      img.style.position = 'absolute';
                      img.style.left = xOffsets[tx] + 'px';
                      img.style.top = yOffsets[ty] + 'px';
                      img.style.width = 'auto';
                      img.style.height = 'auto';
                      img.style.visibility = 'visible';
                    }
                    var ok = 0;
                    for (var kk in loaded) { if (loaded[kk]) ok++; }
                    tilesLoaded = ok;
                    setStatus('Stitch z=' + z + ': ' + tilesLoaded + ' loaded, ' + (count - ok) + ' blank, canvas ' + cx + 'x' + cy);
                    if (typeof updateStitchSize === 'function') updateStitchSize(cx, cy);
                  }
                  var self = this;
                  for (var y = 0; y <= my; y++) {
                    for (var x = 0; x <= mx; x++) {
                      var url = tileUrl.replace('{z}', z).replace('{x}', x).replace('{y}', y);
                      lastTileUrl = url;
                      var img = document.createElement('img');
                      img.style.visibility = 'hidden';
                      img.style.position = 'absolute';
                      img.crossOrigin = 'anonymous';
                      img.onload = function() {
                        var ix = this.getAttribute('data-x') | 0;
                        var iy = this.getAttribute('data-y') | 0;
                        tileWidths[ix] = this.naturalWidth || 256;
                        tileHeights[iy] = this.naturalHeight || 256;
                        loaded[ix + ',' + iy] = this;
                        checkDone.call(self);
                      };
                      img.onerror = function() {
                        var ix = this.getAttribute('data-x') | 0;
                        var iy = this.getAttribute('data-y') | 0;
                        tilesFailed++;
                        loaded[ix + ',' + iy] = null;
                        if (this.parentNode) this.parentNode.removeChild(this);
                        checkDone.call(self);
                      };
                      img.setAttribute('data-x', x);
                      img.setAttribute('data-y', y);
                      img.src = url;
                      self._container.appendChild(img);
                    }
                  }
                },
                onRemove: function() {
                  if (this._container && this._container.parentNode) {
                    this._container.parentNode.removeChild(this._container);
                  }
                }
              });
              return new StitchLayerClass();
            }

            var prevEstW = ${initEstW}, prevEstH = ${initEstH};
            function switchZoom(z) {
              if (stitchLayerRef) map.removeLayer(stitchLayerRef);
              var g = zoomGrids[z];
              if (!g) g = { maxX: (1 << z) - 1, maxY: (1 << z) - 1 };
              currentZoomLevel = z;
              stitchLayerRef = createStitchLayer(z, g.maxX, g.maxY);
              stitchLayerRef.addTo(map);
              var estW = (g.maxX + 1) * 256, estH = (g.maxY + 1) * 256;
              currentMapWidth = estW;
              currentMapHeight = estH;
              var newBounds = L.latLngBounds([[0, 0], [estH, estW]]);
              var c = map.getCenter();
              var normX = prevEstW > 0 ? Math.max(0, Math.min(1, c.lng / prevEstW)) : 0.5;
              var normY = prevEstH > 0 ? Math.max(0, Math.min(1, c.lat / prevEstH)) : 0.5;
              var newCenter = L.latLng(normY * estH, normX * estW);
              prevEstW = estW;
              prevEstH = estH;
              map.setView(newCenter, map.getZoom(), { animate: false });
              if (${useMaxBounds}) map.setMaxBounds(newBounds);
              if (typeof markerLayer !== 'undefined') {
                markerLayer.bringToFront();
                if (lastMarkers && lastMarkers.length) setMarkers(lastMarkers);
              }
              setStatus('Switched to z=' + z + ' (grid ' + (g.maxX+1) + 'x' + (g.maxY+1) + ')...');
              var btns = document.querySelectorAll('#zoom-btns button');
              for (var i = 0; i < btns.length; i++) {
                btns[i].className = parseInt(btns[i].textContent, 10) === z ? 'active' : '';
              }
            }

            function updateStitchSize(cx, cy) {
              var el = document.getElementById('stitch-size');
              if (el) el.textContent = cx + ' × ' + cy + ' px';
            }
            var zb = document.getElementById('zoom-btns');
            for (var zi = 0; zi < zoomLevels.length; zi++) {
              var zl = zoomLevels[zi];
              var btn = document.createElement('button');
              btn.textContent = '' + zl;
              btn.className = zl === initialZoom ? 'active' : '';
              btn.onclick = (function(zz) { return function() { switchZoom(zz); }; })(zl);
              zb.appendChild(btn);
            }

            switchZoom(initialZoom);
            map.setView(boundsCenter, initialZoom, { animate: false });
          } else {
            var zoomLevels = ${zoomLevelsStr};
            var zoomGrids = ${zoomGridsStr};
            var currentZoom = initialZoom;
            var currentMaxX = ${maxX};
            var currentMaxY = ${maxY};
            var tileLayerRef = null;
            var prevEstW = ${initEstW}, prevEstH = ${initEstH};

            function snapToValidZoom(z) {
              var levels = zoomLevels;
              var best = levels[0];
              for (var i = 0; i < levels.length; i++) {
                if (Math.abs(levels[i] - z) < Math.abs(best - z)) best = levels[i];
              }
              return best;
            }

            function onZoomChanged(z) {
              var snapped = snapToValidZoom(z);
              currentZoom = snapped;
              var g = zoomGrids[snapped] || { maxX: (1 << snapped) - 1, maxY: (1 << snapped) - 1 };
              currentMaxX = g.maxX;
              currentMaxY = g.maxY;
              if (typeof maxTileX !== 'undefined') { maxTileX = g.maxX; maxTileY = g.maxY; }
              var estW = (g.maxX + 1) * 256, estH = (g.maxY + 1) * 256;
              if (typeof currentMapWidth !== 'undefined') currentMapWidth = estW;
              if (typeof currentMapHeight !== 'undefined') currentMapHeight = estH;
              if (typeof markerLayer !== 'undefined' && lastMarkers && lastMarkers.length) setMarkers(lastMarkers);
              var btns = document.querySelectorAll('#zoom-btns button');
              for (var i = 0; i < btns.length; i++) {
                btns[i].className = parseInt(btns[i].textContent, 10) === snapped ? 'active' : '';
              }
            }

            function createTileLayer() {
              var BoundedTileLayer = L.TileLayer.extend({
                _setTileSize: function(tile, coords) {
                  L.GridLayer.prototype._setTileSize.call(this, tile, coords);
                  if (${keepIntrinsic}) tile.style.width = tile.style.height = 'auto';
                },
                getTileUrl: function(coords) {
                  getTileUrlCalls++;
                  var z = snapToValidZoom(Math.round(coords.z));
                  var x = Math.round(coords.x), y = Math.round(coords.y);
                  var g = zoomGrids[z] || { maxX: (1 << z) - 1, maxY: (1 << z) - 1 };
                  if (x < 0 || x > g.maxX || y < 0 || y > g.maxY) {
                    lastTileUrl = 'OOB z=' + z + ' x=' + x + ' y=' + y + ' -> transparent';
                    return transparentTile;
                  }
                  var url = tileUrl.replace('{z}', z).replace('{x}', x).replace('{y}', y);
                  inBoundsUrls.push(url);
                  lastTileUrl = url;
                  return url;
                }
              });
              return new BoundedTileLayer(tileUrl, {
                minZoom: ${tileMinZoom},
                maxZoom: ${tileMaxZoom},
                noWrap: true
              });
            }

            function switchZoom(z) {
              if (tileLayerRef) map.removeLayer(tileLayerRef);
              var g = zoomGrids[z];
              if (!g) g = { maxX: (1 << z) - 1, maxY: (1 << z) - 1 };
              currentZoom = z;
              currentMaxX = g.maxX;
              currentMaxY = g.maxY;
              tileLayerRef = createTileLayer();
              tileLayerRef.on('tileload', function() { tilesLoaded++; setStatus('Tiles: ' + tilesLoaded + ' loaded (viewport)'); });
              tileLayerRef.on('tileerror', function() { tilesFailed++; setStatus('Tiles: ' + tilesLoaded + ' loaded, ' + tilesFailed + ' failed'); });
              tileLayerRef.addTo(map);
              var estW = (g.maxX + 1) * 256, estH = (g.maxY + 1) * 256;
              if (typeof currentMapWidth !== 'undefined') currentMapWidth = estW;
              if (typeof currentMapHeight !== 'undefined') currentMapHeight = estH;
              var newBounds = L.latLngBounds([[0, 0], [estH, estW]]);
              var c = map.getCenter();
              var normX = prevEstW > 0 ? Math.max(0, Math.min(1, c.lng / prevEstW)) : 0.5;
              var normY = prevEstH > 0 ? Math.max(0, Math.min(1, c.lat / prevEstH)) : 0.5;
              var newCenter = L.latLng(normY * estH, normX * estW);
              prevEstW = estW;
              prevEstH = estH;
              map.setView(newCenter, z, { animate: false });
              if (${useMaxBounds}) map.setMaxBounds(newBounds);
              if (typeof markerLayer !== 'undefined') markerLayer.bringToFront();
              onZoomChanged(z);
              setStatus('Switched to z=' + z + ' (viewport loading, grid ' + (g.maxX+1) + 'x' + (g.maxY+1) + ')');
            }

            map.on('zoomend', function() { onZoomChanged(map.getZoom()); });

            var zb = document.getElementById('zoom-btns');
            for (var zi = 0; zi < zoomLevels.length; zi++) {
              var zl = zoomLevels[zi];
              var btn = document.createElement('button');
              btn.textContent = '' + zl;
              btn.className = zl === initialZoom ? 'active' : '';
              btn.onclick = (function(zz) { return function() { switchZoom(zz); }; })(zl);
              zb.appendChild(btn);
            }

            switchZoom(initialZoom);
            map.setView(boundsCenter, initialZoom, { animate: false });
          }
          function ensureMapSize() {
            if (document.body) { document.body.scrollTop = 0; document.documentElement.scrollTop = 0; }
            map.invalidateSize();
            var cnt = map.getContainer();
            if (cnt && cnt.offsetWidth > 0 && cnt.offsetHeight > 0) {
              var z = map.getZoom();
              map.setView(boundsCenter, z, { animate: false });
            }
            if (typeof updateTileCrosshair === 'function') updateTileCrosshair();
          }
          setTimeout(ensureMapSize, 100);
          setTimeout(ensureMapSize, 400);
          setTimeout(ensureMapSize, 800);
        } catch (err) {
          setStatus('ERROR: ' + (err.message || String(err)));
        }
${markersBlock}
      }

      setStatus('Loading Leaflet from unpkg...');
      var s = document.createElement('script');
      s.src = '${LEAFLET_JS}';
      s.onload = function() { setStatus('Leaflet script loaded'); initMap(); };
      s.onerror = function() {
        setStatus('ERROR: Failed to load Leaflet from unpkg');
        document.body.innerHTML = '<div style="color:#fff;padding:20px;font-family:sans-serif">Failed to load map library</div>';
      };
      document.head.appendChild(s);
    })();
  </script>
</body>
</html>`;
}
