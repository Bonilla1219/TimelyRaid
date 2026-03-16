/**
 * Simple map: zoom level 0 only (single image), pinch/pan to zoom and pan.
 * Fills the screen; pan is clamped. Markers from MetaForge API are overlaid.
 *
 * VAULTED: Moved here for rollback. Use LeafletMapView for tile map.
 */

import type { GameMapMarker } from '@/features/map/metaforge';
import {
  getTileUrlsForZoom,
  SIMPLE_MAP_ZOOM,
  SOURCE_MAP_HEIGHT,
  SOURCE_MAP_WIDTH,
  TILE_SIZE,
  ZOOM5_IMAGE_SIZE,
} from '@/features/map/tileConfig';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const MAX_SCALE = 4;
const MARKER_RADIUS = 6;

/** Logical size for marker coords: zoom-5 stitched map (32×256 = 8192). */
const MAP_LOGICAL_SIZE = ZOOM5_IMAGE_SIZE;

type MapMarker = GameMapMarker & { x: number; y: number };

type Props = {
  mapId?: string;
};

const ALL_CATEGORIES = 'All';

/** Test markers for debugging placement. */
const TEST_MARKERS: GameMapMarker[] = [
  {
    id: '80f8c40f-33cd-bf23-f878-95570edaf386',
    mapID: 'dam',
    category: '',
    subcategory: 'untended-garden',
    lat: 1991.487410463,
    lng: 3998.75,
    instanceName: '',
    behindLockedDoor: false,
    lootAreas: null,
    zlayers: null,
    eventConditionMask: null,
    updated_at: '',
  },
  {
    id: '5b5b99b3-20d8-5817-6a79-8157fa536ea1',
    mapID: 'dam',
    category: '',
    subcategory: 'untended-garden',
    lat: 1916.40293036322,
    lng: 3767.21594033664,
    instanceName: '',
    behindLockedDoor: false,
    lootAreas: null,
    zlayers: null,
    eventConditionMask: null,
    updated_at: '',
  },
];

export function SimpleMapView({ mapId = 'dam' }: Props) {
  const [markers] = useState<GameMapMarker[]>(TEST_MARKERS);
  const [markersLoading] = useState(false);
  const [markersError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [crosshairLabel, setCrosshairLabel] = useState('x=0 y=0 | tile 0,0');

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [mapContainerSize, setMapContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  /** Stitched map size in px (zoom 5: 32×256 = 8192). */
  const mapSize = MAP_LOGICAL_SIZE;

  const fillScale = useMemo(() => {
    if (!mapContainerSize) return 1;
    const w = mapContainerSize.width;
    const h = mapContainerSize.height;
    return Math.max(w, h) / mapSize;
  }, [mapContainerSize, mapSize]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    markers.forEach((m) => {
      const c = m.category?.trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [markers]);

  const mapMarkers = useMemo((): MapMarker[] => {
    if (markers.length === 0) return [];
    const displayWidth = MAP_LOGICAL_SIZE;
    const displayHeight = MAP_LOGICAL_SIZE;
    return markers.map((m) => {
      const x =
        SOURCE_MAP_WIDTH > 0
          ? (m.lng / SOURCE_MAP_WIDTH) * displayWidth
          : 0;
      const y =
        SOURCE_MAP_HEIGHT > 0
          ? (m.lat / SOURCE_MAP_HEIGHT) * displayHeight
          : 0;
      return { ...m, x, y };
    });
  }, [markers]);

  const filteredMapMarkers = useMemo((): MapMarker[] => {
    if (!selectedCategory || selectedCategory === ALL_CATEGORIES)
      return mapMarkers;
    return mapMarkers.filter((m) => m.category === selectedCategory);
  }, [mapMarkers, selectedCategory]);

  const tileUrls = useMemo(
    () => getTileUrlsForZoom(mapId, SIMPLE_MAP_ZOOM),
    [mapId]
  );
  const scale = useSharedValue(fillScale);
  const savedScale = useSharedValue(fillScale);
  const minScale = useSharedValue(fillScale);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const containerW = useSharedValue(windowWidth);
  const containerH = useSharedValue(windowHeight);
  const crosshairScreenX = useSharedValue(windowWidth / 2);
  const crosshairScreenY = useSharedValue(windowHeight / 2);

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = e.nativeEvent.layout;
      setMapContainerSize({ width, height });
      containerW.value = width;
      containerH.value = height;
      if (width > 0 && height > 0 && mapSize > 0) {
        const fitScale = Math.max(width, height) / mapSize;
        minScale.value = fitScale;
        scale.value = fitScale;
        savedScale.value = fitScale;
      }
    },
    [containerW, containerH, minScale, scale, savedScale, mapSize]
  );

  const updateCrosshairLabel = useCallback((x: number, y: number) => {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    setCrosshairLabel(`x=${Math.round(x)} y=${Math.round(y)} | tile ${tileX},${tileY}`);
  }, []);

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => {
      crosshairScreenX.value = e.x;
      crosshairScreenY.value = e.y;

      // e.x, e.y are in the gesture target's local coords (same 8192×8192 map space as markers).
      const cx = Math.max(0, Math.min(mapSize, e.x));
      const cy = Math.max(0, Math.min(mapSize, e.y));
      runOnJS(updateCrosshairLabel)(cx, cy);
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(
        savedScale.value * e.scale,
        minScale.value,
        MAX_SCALE
      );
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const w = containerW.value;
      const h = containerH.value;
      const s = scale.value;
      const scaledMapW = mapSize * s;
      const scaledMapH = mapSize * s;
      const maxTx = Math.max(0, (scaledMapW - w) / 2);
      const maxTy = Math.max(0, (scaledMapH - h) / 2);
      translateX.value = clamp(
        savedTranslateX.value + e.translationX,
        -maxTx,
        maxTx
      );
      translateY.value = clamp(
        savedTranslateY.value + e.translationY,
        -maxTy,
        maxTy
      );
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(tapGesture, pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => {
    const w = containerW.value;
    const h = containerH.value;
    const s = scale.value;
    const scaledMapW = mapSize * s;
    const scaledMapH = mapSize * s;
    const maxTx = Math.max(0, (scaledMapW - w) / 2);
    const maxTy = Math.max(0, (scaledMapH - h) / 2);
    return {
      transform: [
        { translateX: clamp(translateX.value, -maxTx, maxTx) },
        { translateY: clamp(translateY.value, -maxTy, maxTy) },
        { scale: scale.value },
      ],
    };
  });

  const crosshairStyle = useAnimatedStyle(() => {
    return {
      left: crosshairScreenX.value,
      top: crosshairScreenY.value,
    };
  });

  const maxPos = mapSize - MARKER_RADIUS * 2;

  return (
    <View style={styles.container} collapsable={false}>
      <View style={styles.topSection}>
        <View style={styles.mapContainer} onLayout={onLayout}>
          <View
            style={[
              styles.mapClip,
              mapContainerSize
                ? {
                    width: mapContainerSize.width,
                    height: mapContainerSize.height,
                  }
                : styles.mapClipFill,
            ]}
          >
            <GestureDetector gesture={composed}>
              <Animated.View
                style={[
                  styles.mapWrap,
                  { width: mapSize, height: mapSize },
                  animatedStyle,
                ]}
              >
                <View style={styles.crosshairOverlay} pointerEvents="none">
                  <Animated.View style={[styles.crosshairAnchor, crosshairStyle]}>
                    <View style={styles.crosshairH} />
                    <View style={styles.crosshairV} />
                    <View style={styles.crosshairLabelWrap}>
                      <Text style={styles.crosshairLabelText}>{crosshairLabel}</Text>
                    </View>
                  </Animated.View>
                </View>
                <View style={styles.mapSizeBadge} pointerEvents="none">
                  <Text style={styles.mapSizeBadgeText}>
                    {MAP_LOGICAL_SIZE}×{MAP_LOGICAL_SIZE}px
                  </Text>
                </View>
                <View style={[styles.tileGrid, { width: mapSize, height: mapSize }]}>
                  {tileUrls.map((tile) => (
                    <Image
                      key={`${tile.x}-${tile.y}`}
                      source={{ uri: tile.url }}
                      style={{
                        position: 'absolute',
                        left: tile.x * TILE_SIZE,
                        top: tile.y * TILE_SIZE,
                        width: TILE_SIZE,
                        height: TILE_SIZE,
                      }}
                      contentFit="fill"
                    />
                  ))}
                </View>
                <View
                  style={[
                    styles.markerOverlay,
                    { width: mapSize, height: mapSize },
                  ]}
                  pointerEvents="box-none"
                >
                  {filteredMapMarkers.map((m) => {
                    const viewX = (m.x / MAP_LOGICAL_SIZE) * mapSize;
                    const viewY = (m.y / MAP_LOGICAL_SIZE) * mapSize;
                    const left = Math.max(0, Math.min(maxPos, viewX - MARKER_RADIUS));
                    const top = Math.max(0, Math.min(maxPos, viewY - MARKER_RADIUS));
                    return (
                      <View
                        key={m.id}
                        style={[styles.markerWrapper, { left, top }]}
                      >
                        <View
                          style={[
                            styles.markerDot,
                            {
                              width: MARKER_RADIUS * 2,
                              height: MARKER_RADIUS * 2,
                              borderRadius: MARKER_RADIUS,
                            },
                          ]}
                        />
                        <View style={styles.markerCoordBox}>
                          <Text style={styles.markerCoordText}>
                            x: {Math.round(m.x)}, y: {Math.round(m.y)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            </GestureDetector>
          </View>
        </View>
      </View>
      <View style={styles.bottomSection}>
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
    overflow: 'hidden',
  },
  topSection: {
    flex: 0,
    width: '100%',
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  mapContainer: {
    width: '100%',
    aspectRatio: 3/4,
    overflow: 'hidden',
  },
  mapClip: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapClipFill: {
    flex: 1,
    alignSelf: 'stretch',
  },
  mapWrap: {
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'green',
  },
  crosshairOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  crosshairAnchor: {
    position: 'absolute',
    transform: [{ translateX: -14 }, { translateY: -14 }],
  },
  crosshairH: {
    position: 'absolute',
    width: 28,
    height: 2,
    backgroundColor: 'rgba(0,255,0,0.9)',
  },
  crosshairV: {
    position: 'absolute',
    width: 2,
    height: 28,
    backgroundColor: 'rgba(0,255,0,0.9)',
  },
  crosshairLabelWrap: {
    position: 'absolute',
    top: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,0,0.7)',
  },
  crosshairLabelText: {
    color: '#0f0',
    fontSize: 12,
    fontWeight: '600',
  },
  mapSizeBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    zIndex: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,0,0.7)',
  },
  mapSizeBadgeText: {
    color: '#0f0',
    fontSize: 12,
    fontWeight: '600',
  },
  tileGrid: {
    position: 'relative',
  },
  markerOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  markerWrapper: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markerCoordBox: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  markerCoordText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  markerDot: {
    position: 'absolute',
    backgroundColor: 'rgba(74, 158, 255, 0.9)',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});

export default SimpleMapView;
