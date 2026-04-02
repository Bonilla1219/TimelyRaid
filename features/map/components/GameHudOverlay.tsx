import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  visibleMarkerCount: number;
  activeCategorySummary: string;
  trackingLabel: string | null;
};

export function GameHudOverlay({
  visibleMarkerCount,
  activeCategorySummary,
  trackingLabel,
}: Props) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.panel}>
        <Text style={styles.brand}>Raid Intel</Text>
        <View style={styles.divider} />
        <Text style={styles.line}>
          {visibleMarkerCount} point{visibleMarkerCount === 1 ? '' : 's'} visible
        </Text>
        <Text style={styles.lineMuted} numberOfLines={1}>
          {activeCategorySummary}
        </Text>
        {trackingLabel ? (
          <Text style={styles.track}>{trackingLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
  panel: {
    backgroundColor: 'rgba(6, 8, 12, 0.78)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  brand: {
    color: 'rgba(200, 220, 255, 0.95)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 2,
  },
  line: {
    color: 'rgba(240, 244, 250, 0.92)',
    fontSize: 13,
    fontWeight: '600',
  },
  lineMuted: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  track: {
    marginTop: 2,
    color: 'rgba(120, 200, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
});
