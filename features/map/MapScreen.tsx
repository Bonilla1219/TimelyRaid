/**
 * Map screen: full-screen Leaflet map in a WebView.
 * Fetches map markers from MetaForge, transforms coords for Leaflet, and injects
 * HTML built by leafletHtml. Requires react-native-webview.
 */

import { defaultTileConfig } from '@/features/map/tileConfig';
import { buildLeafletHtml } from '@/features/map/leaflet/leafletHtml';
import { metaforgeMarkerToLeaflet } from '@/features/map/markerTransform';
import { getMapInfo, getMapMarkers } from '@/features/map/metaforge';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

const DEFAULT_CENTER: [number, number] = [0, 0];
const DEFAULT_ZOOM = 2;

export function MapScreen() {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mapInfo, markersRes] = await Promise.all([
        getMapInfo(),
        getMapMarkers(),
      ]);

      const center = mapInfo?.center ?? DEFAULT_CENTER;
      const zoom = mapInfo?.defaultZoom ?? DEFAULT_ZOOM;

      const markers = (markersRes.data ?? []).map((m) => ({
        latLng: metaforgeMarkerToLeaflet(m),
        label: m.name,
      }));

      const built = buildLeafletHtml({
        tileConfig: defaultTileConfig,
        center,
        zoom,
        markers,
        width: '100%',
        height: '100%',
      });
      setHtml(built);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  if (loading && !html) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4A9EFF" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !html) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error: {error.message}</Text>
          <TouchableOpacity onPress={loadMap} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!html) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WebView
        source={{ html }}
        style={styles.webView}
        scrollEnabled={true}
        bounces={false}
        originWhitelist={['*']}
        mixedContentMode="compatibility"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  webView: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ccc',
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#4A9EFF',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MapScreen;
