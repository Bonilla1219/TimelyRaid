/**
 * Simple map: zoom level 0 only (single image), pinch/pan to zoom and pan.
 * Fills the screen; pan is clamped. Markers from MetaForge API are overlaid.
 *
 * VAULTED: Moved here for rollback. Use LeafletMapView for tile map.
 */

import { fetchMapMarkersCached } from '@/features/map/markerCache';
import type { GameMapMarker } from '@/features/map/metaforge';
import {
  getTileUrlTemplate,
  SIMPLE_MAP_ZOOM,
  SOURCE_MAP_HEIGHT,
  SOURCE_MAP_WIDTH,
  TILE_SIZE,
} from '@/features/map/tileConfig';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const MAX_SCALE = 4;
const MARKER_RADIUS = 6;

const MARKER_RADIUS_SCREEN_ZOOMED_OUT = 8;
const MARKER_RADIUS_SCREEN_ZOOMED_IN = 6;

/**
 * Trimmed zoom-5 stitched tile bounds (inclusive) to remove transparent edge tiles.
 * Current known meaningful content area: x=0..28, y=0..18.
 */
const TRIM_MIN_TILE_X = 0;
const TRIM_MAX_TILE_X = 28;
const TRIM_MIN_TILE_Y = 0;
const TRIM_MAX_TILE_Y = 18;

const MAP_LOGICAL_WIDTH = (TRIM_MAX_TILE_X - TRIM_MIN_TILE_X + 1) * TILE_SIZE; // 7424
const MAP_LOGICAL_HEIGHT = (TRIM_MAX_TILE_Y - TRIM_MIN_TILE_Y + 1) * TILE_SIZE; // 4864

type MapMarker = GameMapMarker & { x: number; y: number };

type Props = {
  mapId?: string;
};

function MarkerDot({
  scale,
  minScale,
}: {
  scale: SharedValue<number>;
  minScale: SharedValue<number>;
}) {
  const dotStyle = useAnimatedStyle(() => {
    const s = Math.max(0.0001, scale.value);
    const minS = Math.max(0.0001, minScale.value);
    const denom = Math.max(0.0001, MAX_SCALE - minS);
    const t = clamp((s - minS) / denom, 0, 1);

    // Desired radius in SCREEN pixels: big when zoomed out, small when zoomed in.
    const rScreen = interpolate(
      t,
      [0, 1],
      [MARKER_RADIUS_SCREEN_ZOOMED_OUT, MARKER_RADIUS_SCREEN_ZOOMED_IN]
    );

    // Convert to MAP-space radius so that after parent scale transform,
    // the on-screen radius matches rScreen.
    const rMap = rScreen / s;
    const d = rMap * 2;

    return {
      width: d,
      height: d,
      borderRadius: rMap,
      transform: [{ translateX: -rMap }, { translateY: -rMap }],
    };
  });

  return <Animated.View style={[styles.markerDot, dotStyle]} />;
}

export function SimpleMapView({ mapId = 'dam' }: Props) {
  const [markers, setMarkers] = useState<GameMapMarker[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [selectedEventSubcategories, setSelectedEventSubcategories] = useState<string[]>([]);
  const [containersExpanded, setContainersExpanded] = useState(false);
  const [selectedContainerSubcategories, setSelectedContainerSubcategories] = useState<
    string[]
  >([]);
  const [crosshairLabel, setCrosshairLabel] = useState('x=0 y=0 | tile 0,0');

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [mapContainerSize, setMapContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!mapId) return;
    let cancelled = false;

    fetchMapMarkersCached(mapId)
      .then((data) => {
        if (cancelled) return;
        setMarkers(data);
      })
      .catch(() => {
        if (cancelled) return;
        setMarkers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [mapId]);

  /** Trimmed stitched map size in px for marker/tap coordinate space. */
  const mapWidth = MAP_LOGICAL_WIDTH;
  const mapHeight = MAP_LOGICAL_HEIGHT;

  const fillScale = useMemo(() => {
    if (!mapContainerSize) return 1;
    const w = mapContainerSize.width;
    const h = mapContainerSize.height;
    // Scale so the trimmed map fills the container (letterboxing avoided).
    return Math.max(w / mapWidth, h / mapHeight);
  }, [mapContainerSize, mapWidth, mapHeight]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    markers.forEach((m) => {
      const c = m.category?.trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [markers]);

  const eventSubcategories = useMemo(() => {
    const set = new Set<string>();
    markers.forEach((m) => {
      const c = (m.category ?? '').trim().toLowerCase();
      if (c !== 'events') return;
      const sub = (m.subcategory ?? '').trim();
      if (sub) set.add(sub);
    });
    return Array.from(set).sort();
  }, [markers]);

  const containerSubcategories = useMemo(() => {
    const set = new Set<string>();
    markers.forEach((m) => {
      const c = (m.category ?? '').trim().toLowerCase();
      if (c !== 'containers') return;
      const sub = (m.subcategory ?? '').trim();
      if (sub) set.add(sub);
    });
    return Array.from(set).sort();
  }, [markers]);

  // Default to a single category (no "All"): pick Quests if present, else first available.
  useEffect(() => {
    if (selectedCategory != null) return;
    if (categories.length === 0) return;
    const preferred =
      categories.find((c) => c.toLowerCase() === 'quests') ??
      categories.find((c) => c.toLowerCase() === 'quest') ??
      categories[0];
    setSelectedCategory(preferred);
  }, [categories, selectedCategory]);

  const mapMarkers = useMemo((): MapMarker[] => {
    if (markers.length === 0) return [];
    const displayWidth = mapWidth;
    const displayHeight = mapHeight;
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
  }, [markers, mapWidth, mapHeight]);

  const filteredMapMarkers = useMemo((): MapMarker[] => {
    if (!selectedCategory) return [];

    const selected = selectedCategory.trim().toLowerCase();

    if (selected === 'events') {
      if (selectedEventSubcategories.length === 0) return [];
      const allow = new Set(selectedEventSubcategories);
      return mapMarkers.filter(
        (m) =>
          (m.category ?? '').trim().toLowerCase() === 'events' &&
          allow.has((m.subcategory ?? '').trim())
      );
    }

    if (selected === 'containers') {
      if (selectedContainerSubcategories.length === 0) return [];
      const allow = new Set(selectedContainerSubcategories);
      return mapMarkers.filter(
        (m) =>
          (m.category ?? '').trim().toLowerCase() === 'containers' &&
          allow.has((m.subcategory ?? '').trim())
      );
    }

    return mapMarkers.filter((m) => m.category === selectedCategory);
  }, [
    mapMarkers,
    selectedCategory,
    selectedEventSubcategories,
    selectedContainerSubcategories,
  ]);

  const tileUrlTemplate = useMemo(() => getTileUrlTemplate(mapId), [mapId]);
  const tileUrls = useMemo(() => {
    const tiles: Array<{ x: number; y: number; url: string }> = [];
    for (let x = TRIM_MIN_TILE_X; x <= TRIM_MAX_TILE_X; x++) {
      for (let y = TRIM_MIN_TILE_Y; y <= TRIM_MAX_TILE_Y; y++) {
        const url = tileUrlTemplate
          .replace('{z}', String(SIMPLE_MAP_ZOOM))
          .replace('{x}', String(x))
          .replace('{y}', String(y));
        tiles.push({ x, y, url });
      }
    }
    return tiles;
  }, [tileUrlTemplate]);
  const scale = useSharedValue(fillScale);
  const savedScale = useSharedValue(fillScale);
  const minScale = useSharedValue(fillScale);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  // Pinch anchoring state: keeps the zoom centered on the gesture focal point.
  const pinchStartScale = useSharedValue(fillScale);
  const pinchSavedTranslateX = useSharedValue(0);
  const pinchSavedTranslateY = useSharedValue(0);
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
      if (width > 0 && height > 0 && mapWidth > 0 && mapHeight > 0) {
        const fitScale = Math.max(width / mapWidth, height / mapHeight);
        minScale.value = fitScale;
        scale.value = fitScale;
        savedScale.value = fitScale;
      }
    },
    [containerW, containerH, minScale, scale, savedScale, mapWidth, mapHeight]
  );

  const updateCrosshairLabel = useCallback((x: number, y: number) => {
    const tileX = Math.floor(x / TILE_SIZE) + TRIM_MIN_TILE_X;
    const tileY = Math.floor(y / TILE_SIZE) + TRIM_MIN_TILE_Y;
    setCrosshairLabel(
      `x=${Math.round(x)} y=${Math.round(y)} | tile ${tileX},${tileY}`
    );
  }, []);

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => {
      crosshairScreenX.value = e.x;
      crosshairScreenY.value = e.y;

      // e.x, e.y are in the gesture target's local coords (same trimmed map space as markers).
      const cx = Math.max(0, Math.min(mapWidth, e.x));
      const cy = Math.max(0, Math.min(mapHeight, e.y));
      runOnJS(updateCrosshairLabel)(cx, cy);
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      pinchStartScale.value = scale.value;
      pinchSavedTranslateX.value = translateX.value;
      pinchSavedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      const nextScale = clamp(
        pinchStartScale.value * e.scale,
        minScale.value,
        MAX_SCALE
      );

      // `focalX/Y` are in the gesture target's local coords (same space as markers).
      const focalX = clamp(e.focalX, 0, mapWidth);
      const focalY = clamp(e.focalY, 0, mapHeight);

      const deltaScale = nextScale - pinchStartScale.value;

      // translate is applied after scale (see `animatedStyle` transform order),
      // so the adjustment below keeps the focal point visually stationary.
      const w = containerW.value;
      const h = containerH.value;
      const scaledMapW = mapWidth * nextScale;
      const scaledMapH = mapHeight * nextScale;
      const maxTx = Math.max(0, (scaledMapW - w) / 2);
      const maxTy = Math.max(0, (scaledMapH - h) / 2);

      translateX.value = clamp(
        pinchSavedTranslateX.value + deltaScale * (mapWidth / 2 - focalX),
        -maxTx,
        maxTx
      );
      translateY.value = clamp(
        pinchSavedTranslateY.value + deltaScale * (mapHeight / 2 - focalY),
        -maxTy,
        maxTy
      );

      scale.value = nextScale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const w = containerW.value;
      const h = containerH.value;
      const s = scale.value;
      const scaledMapW = mapWidth * s;
      const scaledMapH = mapHeight * s;
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
    const scaledMapW = mapWidth * s;
    const scaledMapH = mapHeight * s;
    const maxTx = Math.max(0, (scaledMapW - w) / 2);
    const maxTy = Math.max(0, (scaledMapH - h) / 2);
    return {
      transform: [
        { scale: scale.value },
        { translateX: clamp(translateX.value, -maxTx, maxTx) },
        { translateY: clamp(translateY.value, -maxTy, maxTy) },
      ],
    };
  });

  const crosshairStyle = useAnimatedStyle(() => {
    return {
      left: crosshairScreenX.value,
      top: crosshairScreenY.value,
    };
  });

  const maxXPos = mapWidth - MARKER_RADIUS * 2;
  const maxYPos = mapHeight - MARKER_RADIUS * 2;

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
                  { width: mapWidth, height: mapHeight },
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
                    {MAP_LOGICAL_WIDTH}×{MAP_LOGICAL_HEIGHT}px
                  </Text>
                </View>
                <View
                  style={[
                    styles.tileGrid,
                    { width: mapWidth, height: mapHeight },
                  ]}
                >
                  {tileUrls.map((tile) => (
                    <Image
                      key={`${tile.x}-${tile.y}`}
                      source={{ uri: tile.url }}
                      style={{
                        position: 'absolute',
                        left: (tile.x - TRIM_MIN_TILE_X) * TILE_SIZE,
                        top: (tile.y - TRIM_MIN_TILE_Y) * TILE_SIZE,
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
                    { width: mapWidth, height: mapHeight },
                  ]}
                  pointerEvents="box-none"
                >
                  {filteredMapMarkers.map((m) => {
                    const left = Math.max(0, Math.min(maxXPos, m.x));
                    const top = Math.max(0, Math.min(maxYPos, m.y));
                    return (
                      <View
                        key={m.id}
                        style={[styles.markerWrapper, { left, top }]}
                      >
                        <MarkerDot scale={scale} minScale={minScale} />
                        {/*<View style={styles.markerCoordBox}>
                          <Text style={styles.markerCoordText}>
                            x: {Math.round(m.x)}, y: {Math.round(m.y)}
                          </Text>*/}
                        {/*</View>*/}
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
        <View style={styles.filterStack}>
          <ScrollView
            horizontal
            style={styles.chipScroll}
            contentContainerStyle={styles.chipScrollContent}
            showsHorizontalScrollIndicator={false}
          >
            {categories.map((cat) => {
              const selected = selectedCategory === cat;
              const isEvents = cat.trim().toLowerCase() === 'events';
              const isContainers = cat.trim().toLowerCase() === 'containers';
              return (
                <Pressable
                  key={cat}
                  style={[styles.chip, selected ? styles.chipSelected : undefined]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    if (!isEvents) setEventsExpanded(false);
                    if (!isContainers) setContainersExpanded(false);
                    if (isEvents) setEventsExpanded((v) => !v);
                    if (isContainers) setContainersExpanded((v) => !v);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected ? styles.chipTextSelected : undefined,
                    ]}
                  >
                    {isEvents ? 'Events' : isContainers ? 'Containers' : cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {(selectedCategory ?? '').trim().toLowerCase() === 'events' &&
          eventsExpanded &&
          eventSubcategories.length > 0 ? (
            <ScrollView
              horizontal
              style={styles.subChipScroll}
              contentContainerStyle={styles.subChipScrollContent}
              showsHorizontalScrollIndicator={false}
            >
              {eventSubcategories.map((sub) => {
                const selected = selectedEventSubcategories.includes(sub);
                return (
                  <Pressable
                    key={sub}
                    style={[
                      styles.subChip,
                      selected ? styles.subChipSelected : undefined,
                    ]}
                    onPress={() => {
                      setSelectedEventSubcategories((prev) => {
                        if (prev.includes(sub)) return prev.filter((s) => s !== sub);
                        return [...prev, sub];
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.subChipText,
                        selected ? styles.subChipTextSelected : undefined,
                      ]}
                      numberOfLines={1}
                    >
                      {sub}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {(selectedCategory ?? '').trim().toLowerCase() === 'containers' &&
          containersExpanded &&
          containerSubcategories.length > 0 ? (
            <ScrollView
              horizontal
              style={styles.subChipScroll}
              contentContainerStyle={styles.subChipScrollContent}
              showsHorizontalScrollIndicator={false}
            >
              {containerSubcategories.map((sub) => {
                const selected = selectedContainerSubcategories.includes(sub);
                return (
                  <Pressable
                    key={sub}
                    style={[
                      styles.subChip,
                      selected ? styles.subChipSelected : undefined,
                    ]}
                    onPress={() => {
                      setSelectedContainerSubcategories((prev) => {
                        if (prev.includes(sub)) return prev.filter((s) => s !== sub);
                        return [...prev, sub];
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.subChipText,
                        selected ? styles.subChipTextSelected : undefined,
                      ]}
                      numberOfLines={1}
                    >
                      {sub}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
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
  filterStack: {
    gap: 10,
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
  subChipScroll: {
    flexGrow: 0,
  },
  subChipScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  subChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    maxWidth: 220,
  },
  subChipSelected: {
    backgroundColor: 'rgba(74, 158, 255, 0.35)',
  },
  subChipText: {
    fontSize: 13,
    color: '#bbb',
  },
  subChipTextSelected: {
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
    borderWidth: 20,
    borderColor: 'orange',
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
  /*markerCoordBox: {
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
  },*/
  markerDot: {
    position: 'absolute',
    backgroundColor: 'rgba(74, 158, 255, 0.9)',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});

export default SimpleMapView;
