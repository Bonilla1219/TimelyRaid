/**
 * Leaflet map: tile-based, zoom levels 1–3. Stitch layer with variable tile sizes.
 * Markers from MetaForge API; filter by category.
 */

import { buildLeafletHtml } from '@/features/map/leaflet/leafletHtml';
import { fetchMapMarkersCached } from '@/features/map/markerCache';
import type { GameMapMarker } from '@/features/map/metaforge';
import {
  getGridForZoom,
  getTileUrlTemplate,
  SOURCE_MAP_HEIGHT,
  SOURCE_MAP_WIDTH,
  TILE_GRID_HEIGHT,
  TILE_GRID_WIDTH,
  TILE_SIZE,
  ZOOM_GRIDS,
  ZOOM_LEVELS,
} from '@/features/map/tileConfig';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WebView from 'react-native-webview';

const ALL_CATEGORIES = 'All';

type Props = {
  mapId?: string;
};

type LeafletMarker = {
  id: string;
  normX: number;
  normY: number;
  category: string;
  subcategory: string;
  title: string;
};

export function LeafletMapView({ mapId = 'dam' }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [markers, setMarkers] = useState<GameMapMarker[]>([]);
  const [markersLoading, setMarkersLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const mapWidth = TILE_GRID_WIDTH * TILE_SIZE;
  const mapHeight = TILE_GRID_HEIGHT * TILE_SIZE;
  const mapSize = { width: mapWidth, height: mapHeight };

  useEffect(() => {
    if (!mapId) return;
    let cancelled = false;
    setMarkersLoading(true);
    fetchMapMarkersCached(mapId)
      .then((data) => {
        if (!cancelled) setMarkers(data);
      })
      .finally(() => {
        if (!cancelled) setMarkersLoading(false);
      });
    return () => { cancelled = true; };
  }, [mapId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    markers.forEach((m) => {
      const c = m.category?.trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [markers]);

  const mapMarkers = useMemo((): LeafletMarker[] => {
    if (markers.length === 0) return [];
    return markers.map((m) => {
      const normX =
        SOURCE_MAP_WIDTH > 0 ? Math.max(0, Math.min(1, m.lng / SOURCE_MAP_WIDTH)) : 0;
      // MetaForge Y-axis appears inverted relative to Leaflet CRS.Simple (top-left origin),
      // so flip Y to keep markers aligned with the stitched image.
      const normYRaw = SOURCE_MAP_HEIGHT > 0 ? m.lat / SOURCE_MAP_HEIGHT : 0;
      const normY = Math.max(0, Math.min(1, 1 - normYRaw));
      return {
        id: m.id,
        normX,
        normY,
        category: m.category ?? '',
        subcategory: m.subcategory ?? '',
        title: m.instanceName ?? m.category ?? '',
      };
    });
  }, [markers]);

  const filteredMarkers = useMemo((): LeafletMarker[] => {
    if (!selectedCategory || selectedCategory === ALL_CATEGORIES) return mapMarkers;
    return mapMarkers.filter((m) => m.category === selectedCategory);
  }, [mapMarkers, selectedCategory]);

  const sendMarkers = useCallback((list: LeafletMarker[]) => {
    const script = `(function(){
      var m=${JSON.stringify(JSON.stringify({ type: 'SET_MARKERS', markers: list }))};
      try{window.dispatchEvent(new MessageEvent('message',{data:JSON.parse(m)}));}catch(e){}
    })();`;
    webViewRef.current?.injectJavaScript(script);
  }, []);

  useEffect(() => {
    sendMarkers(filteredMarkers);
  }, [filteredMarkers, sendMarkers]);

  const html = useMemo(() => {
    const grid = getGridForZoom(1);
    return buildLeafletHtml({
      tileUrlTemplate: getTileUrlTemplate(mapId ?? 'dam'),
      minZoom: 1,
      maxZoom: 5,
      tileMinZoom: 1,
      tileMaxZoom: 5,
      mapWidth,
      mapHeight,
      tileMaxX: grid.maxX,
      tileMaxY: grid.maxY,
      markersEnabled: true,
      initialZoom: 1,
      initialCenterX: 1,
      initialCenterY: 1,
      keepTileIntrinsicSize: true,
      limitPanning: false,
      useStitchLayer: true,
      zoomLevels: [...ZOOM_LEVELS],
      zoomGrids: ZOOM_GRIDS,
      showDebug: false,
    });
  }, [mapId, mapWidth, mapHeight]);

  return (
    <View style={styles.container}>
      <View style={styles.mapSection}>
        <WebView
          ref={webViewRef}
          source={{ html }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          originWhitelist={['*']}
          mixedContentMode="compatibility"
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          style={styles.chipScroll}
          contentContainerStyle={styles.chipScrollContent}
          showsHorizontalScrollIndicator={false}
        >
          <Pressable
            style={[
              styles.chip,
              selectedCategory === null || selectedCategory === ALL_CATEGORIES
                ? styles.chipSelected
                : undefined,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === null || selectedCategory === ALL_CATEGORIES
                  ? styles.chipTextSelected
                  : undefined,
              ]}
            >
              {ALL_CATEGORIES}
            </Text>
          </Pressable>
          {categories.map((cat) => (
            <Pressable
              key={cat}
              style={[
                styles.chip,
                selectedCategory === cat ? styles.chipSelected : undefined,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategory === cat ? styles.chipTextSelected : undefined,
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  mapSection: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  filterSection: {
    paddingVertical: 12,
    justifyContent: 'center',
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  chipSelected: {
    backgroundColor: 'rgba(74, 158, 255, 0.5)',
  },
  chipText: {
    fontSize: 14,
    color: '#ccc',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default LeafletMapView;
