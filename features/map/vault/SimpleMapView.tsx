/**
 * Simple map: zoom level 0 only (single image), pinch/pan to zoom and pan.
 * Full-screen map with HUD overlays, category markers, and filter bar.
 */

import { GameHudOverlay } from '@/features/map/components/GameHudOverlay';
import { MapMarker } from '@/features/map/components/MapMarker';
import { MapTopFilterBar } from '@/features/map/components/MapTopFilterBar';
import { MarkerDetailCard } from '@/features/map/components/MarkerDetailCard';
import {
  CATEGORY_FILTER_MODE,
  useMapScreenState,
} from '@/features/map/hooks/useMapScreenState';
import { MARKER_CATEGORY_CONFIG } from '@/features/map/mapMarkerStyle';
import { fetchMapMarkersCached } from '@/features/map/markerCache';
import type { GameMapMarker } from '@/features/map/metaforge';
import {
  getTileUrlTemplate,
  SIMPLE_MAP_ZOOM,
  TILE_SIZE
} from '@/features/map/tileConfig';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAX_SCALE = 4;

/** Map-space hit radius for selecting a marker (tap competes with pan). */
const MARKER_TAP_RADIUS_MAP = 80;

/**
 * Trimmed zoom-5 stitched tile bounds (inclusive) to remove transparent edge tiles.
 */
const TRIM_MIN_TILE_X = 0;
const TRIM_MAX_TILE_X = 28;
const TRIM_MIN_TILE_Y = 0;
const TRIM_MAX_TILE_Y = 18;

const MAP_LOGICAL_WIDTH = (TRIM_MAX_TILE_X - TRIM_MIN_TILE_X + 1) * TILE_SIZE;
const MAP_LOGICAL_HEIGHT = (TRIM_MAX_TILE_Y - TRIM_MIN_TILE_Y + 1) * TILE_SIZE;

type Props = {
  mapId?: string;
};

export function SimpleMapView({ mapId = 'dam' }: Props) {
  const insets = useSafeAreaInsets();
  const [markers, setMarkers] = React.useState<GameMapMarker[]>([]);

  const mapWidth = MAP_LOGICAL_WIDTH;
  const mapHeight = MAP_LOGICAL_HEIGHT;

  const {
    categoriesPresent,
    eventSubcategories,
    containerSubcategories,
    locationSubcategories,
    natureSubcategories,
    selectedCategories,
    selectedEventSubcategories,
    setSelectedEventSubcategories,
    selectedContainerSubcategories,
    setSelectedContainerSubcategories,
    selectedLocationSubcategories,
    setSelectedLocationSubcategories,
    selectedNatureSubcategories,
    setSelectedNatureSubcategories,
    selectedMarkerId,
    setSelectedMarkerId,
    favoriteIds,
    toggleFavorite,
    resetCategories,
    onCategoryChipPress,
    showEventsSubRow,
    showContainersSubRow,
    showLocationsSubRow,
    showNatureSubRow,
    filteredMapPoints,
    mapPoints,
  } = useMapScreenState(markers, mapWidth, mapHeight);

  const filteredRef = useRef(filteredMapPoints);
  filteredRef.current = filteredMapPoints;

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

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [mapContainerSize, setMapContainerSize] = React.useState<{
    width: number;
    height: number;
  } | null>(null);

  const fillScale = useMemo(() => {
    if (!mapContainerSize) return 1;
    const w = mapContainerSize.width;
    const h = mapContainerSize.height;
    return Math.max(w / mapWidth, h / mapHeight);
  }, [mapContainerSize, mapWidth, mapHeight]);

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
  const pinchStartScale = useSharedValue(fillScale);
  const pinchSavedTranslateX = useSharedValue(0);
  const pinchSavedTranslateY = useSharedValue(0);
  const containerW = useSharedValue(windowWidth);
  const containerH = useSharedValue(windowHeight);

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

  const handleMapTap = useCallback(
    (x: number, y: number) => {
      const cx = Math.max(0, Math.min(mapWidth, x));
      const cy = Math.max(0, Math.min(mapHeight, y));
      const list = filteredRef.current;
      let bestId: string | null = null;
      let bestD = MARKER_TAP_RADIUS_MAP;

      for (const p of list) {
        const dx = p.longitude - cx;
        const dy = p.latitude - cy;
        const d = Math.hypot(dx, dy);
        if (d < bestD) {
          bestD = d;
          bestId = p.id;
        }
      }

      setSelectedMarkerId(bestId);
    },
    [mapWidth, mapHeight, setSelectedMarkerId]
  );

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => {
      const cx = Math.max(0, Math.min(mapWidth, e.x));
      const cy = Math.max(0, Math.min(mapHeight, e.y));
      runOnJS(handleMapTap)(cx, cy);
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

      const focalX = clamp(e.focalX, 0, mapWidth);
      const focalY = clamp(e.focalY, 0, mapHeight);

      const deltaScale = nextScale - pinchStartScale.value;

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

  const maxXPos = mapWidth - 4;
  const maxYPos = mapHeight - 4;

  const selectedPoint = useMemo(
    () => mapPoints.find((p) => p.id === selectedMarkerId) ?? null,
    [mapPoints, selectedMarkerId]
  );

  const activeCategorySummary = useMemo(() => {
    if (selectedCategories.length === 0) return 'No filter';
    const labels = selectedCategories.map((c) => MARKER_CATEGORY_CONFIG[c].label);
    return labels.join(' · ');
  }, [selectedCategories]);

  const trackingLabel =
    selectedMarkerId && selectedPoint
      ? `Tracking: ${selectedPoint.title}`
      : null;

  return (
    <View style={styles.container} collapsable={false}>
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
              <View
                style={[styles.tileGrid, { width: mapWidth, height: mapHeight }]}
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
                {filteredMapPoints.map((m) => {
                  const left = Math.max(0, Math.min(maxXPos, m.longitude));
                  const top = Math.max(0, Math.min(maxYPos, m.latitude));
                  return (
                    <View
                      key={m.id}
                      style={[styles.markerWrapper, { left, top }]}
                      pointerEvents="box-none"
                    >
                      <MapMarker
                        category={m.category}
                        selected={selectedMarkerId === m.id}
                        scale={scale}
                        minScale={minScale}
                        onPress={() => setSelectedMarkerId(m.id)}
                      />
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </View>

      <View
        style={[
          styles.overlayTop,
          {
            paddingTop: 20,
            paddingHorizontal: 12,
          },
        ]}
        pointerEvents="box-none"
      >
        <MapTopFilterBar
          categoriesPresent={categoriesPresent}
          selectedCategories={selectedCategories}
          onCategoryPress={onCategoryChipPress}
          onReset={CATEGORY_FILTER_MODE === 'multi' ? resetCategories : undefined}
          showEventsSubRow={showEventsSubRow}
          showContainersSubRow={showContainersSubRow}
          showLocationsSubRow={showLocationsSubRow}
          showNatureSubRow={showNatureSubRow}
          eventSubcategories={eventSubcategories}
          containerSubcategories={containerSubcategories}
          locationSubcategories={locationSubcategories}
          natureSubcategories={natureSubcategories}
          selectedEventSubcategories={selectedEventSubcategories}
          selectedContainerSubcategories={selectedContainerSubcategories}
          selectedLocationSubcategories={selectedLocationSubcategories}
          selectedNatureSubcategories={selectedNatureSubcategories}
          onToggleEventSub={(sub) => {
            setSelectedEventSubcategories((prev) =>
              prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
            );
          }}
          onToggleContainerSub={(sub) => {
            setSelectedContainerSubcategories((prev) =>
              prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
            );
          }}
          onToggleLocationSub={(sub) => {
            setSelectedLocationSubcategories((prev) =>
              prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
            );
          }}
          onToggleNatureSub={(sub) => {
            setSelectedNatureSubcategories((prev) =>
              prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
            );
          }}
        />
      </View>

      <View
        style={[
          styles.overlayBottom,
          {
            paddingBottom: Math.max(insets.bottom, 10) + 8,
            paddingHorizontal: 12,
          },
        ]}
        pointerEvents="box-none"
      >
        <GameHudOverlay
          visibleMarkerCount={filteredMapPoints.length}
          activeCategorySummary={activeCategorySummary}
          trackingLabel={trackingLabel}
        />
      </View>

      <MarkerDetailCard
        point={selectedPoint}
        onClose={() => setSelectedMarkerId(null)}
        isFavorite={
          selectedPoint ? favoriteIds.includes(selectedPoint.id) : false
        }
        onToggleFavorite={() => {
          if (selectedPoint) toggleFavorite(selectedPoint.id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0e12',
    overflow: 'hidden',
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  mapClip: {
    flex: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 30,
  },
  overlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
});

export default SimpleMapView;
