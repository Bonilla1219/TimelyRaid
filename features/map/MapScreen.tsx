/**
 * Map screen: simple single-image map with pinch/pan and markers.
 */

import { SimpleMapView } from '@/features/map/vault/SimpleMapView';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAP_ID = 'dam';

export function MapScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SimpleMapView mapId={MAP_ID} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
});

export default MapScreen;
