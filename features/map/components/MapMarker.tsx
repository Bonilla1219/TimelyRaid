import { MARKER_CATEGORY_CONFIG } from '@/features/map/mapMarkerStyle';
import type { MapCategory } from '@/features/map/types/mapTypes';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  clamp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const MAX_SCALE = 4;

const BASE_SCREEN_PX = 22;
const SELECTED_SCREEN_PX = 28;
const BASE_SCREEN_PX_ZOOMED_IN = 18;
const SELECTED_SCREEN_PX_ZOOMED_IN = 24;

type Props = {
  category: MapCategory;
  selected: boolean;
  scale: SharedValue<number>;
  minScale: SharedValue<number>;
  onPress: () => void;
};

export function MapMarker({ category, selected, scale, minScale, onPress }: Props) {
  const cfg = MARKER_CATEGORY_CONFIG[category];
  const selectedProgress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selectedProgress.value = withTiming(selected ? 1 : 0, { duration: 160 });
  }, [selected, selectedProgress]);

  const iconCompensateStyle = useAnimatedStyle(() => {
    const s = Math.max(0.00001, scale.value);
    const minS = Math.max(0.00001, minScale.value);
    const denom = Math.max(0.00001, MAX_SCALE - minS);
    const t = clamp((s - minS) / denom, 0, 1);

    // Icon should grow when zoomed out (to match marker feel), but still
    // compensate for parent map scaling so it doesn't become tiny.
    const baseIconScreen = interpolate(t, [0, 1], [18, 13]);
    const selIconScreen = interpolate(t, [0, 1], [20, 15]);
    const iconScreen =
      baseIconScreen + (selIconScreen - baseIconScreen) * selectedProgress.value;

    const baseSize = 14;
    const iconScale = iconScreen / (baseSize * s);
    return { transform: [{ scale: iconScale }] };
  });

  const outerStyle = useAnimatedStyle(() => {
    const s = Math.max(0.0001, scale.value);
    const minS = Math.max(0.0001, minScale.value);
    const denom = Math.max(0.0001, MAX_SCALE - minS);
    const t = clamp((s - minS) / denom, 0, 1);

    const baseScreen = interpolate(
      t,
      [0, 1],
      [BASE_SCREEN_PX, BASE_SCREEN_PX_ZOOMED_IN]
    );
    const selScreen = interpolate(
      t,
      [0, 1],
      [SELECTED_SCREEN_PX, SELECTED_SCREEN_PX_ZOOMED_IN]
    );
    const sizeScreen =
      baseScreen + (selScreen - baseScreen) * selectedProgress.value;
    const sizeMap = sizeScreen / s;
    const half = sizeMap / 2;

    return {
      width: sizeMap,
      height: sizeMap,
      borderRadius: sizeMap * 0.28,
      transform: [{ translateX: -half }, { translateY: -half }],
      borderColor: cfg.glowColor,
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={styles.hit}
      accessibilityRole="button"
      accessibilityLabel={`${cfg.label} marker`}
    >
      <Animated.View style={[styles.glowRing, glowStyle, outerStyle]}>
        <Animated.View
          style={[
            styles.accentFill,
            fillStyle,
            { backgroundColor: cfg.accentColor },
          ]}
        />
        <View
          style={[
            styles.inner,
            {
              borderColor: cfg.accentColor,
              shadowColor: cfg.accentColor,
            },
          ]}
        >
          <Animated.View style={iconCompensateStyle}>
            <MaterialIcons
              name={cfg.iconName}
              size={14}
              color={'rgba(10,12,16,0.92)'}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  accentFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    borderRadius: 6,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
    elevation: 6,
  },
});
