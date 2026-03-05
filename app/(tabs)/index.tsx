import { EventSection } from '@/components/event-section';
import { useEventTimers } from '@/hooks/use-event-timers';
import { ActivityIndicator, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { eventGroups, loading, error, refetch } = useEventTimers();

  return (
    <ImageBackground
      source={require('@/assets/images/Background.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer}>
        {/* Timely Raid Banner */}
        {/* <View style={styles.bannerContainer}>
          <Image
            source={require('@/assets/images/timelyraid.png')}
            style={styles.bannerImage}
            contentFit="contain"
          />
        </View> */}

        {/* Bottom section with content */}
        <View style={styles.bottomSection}>
          {/* Current Events Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Events</Text>
            <TouchableOpacity onPress={refetch} style={styles.refreshButton}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Loading event timers...</Text>
            </View>
          )}

          {/* Error State */}
          {error && !loading && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error: {error.message}</Text>
              <TouchableOpacity onPress={refetch} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Event Timers Content - organized by event */}
          {!loading && !error && (
            <>
              {eventGroups.length > 0 ? (
                eventGroups.map((eg) => (
                  <EventSection key={eg.name} eventGroup={eg} />
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No event timers available</Text>
                </View>
              )}
            </>
          )}

          {/* Attribution */}
          <View style={styles.attribution}>
            <Text style={styles.attributionText}>
              Data provided by{' '}
              <Text
                style={styles.attributionLink}
                onPress={() => {
                  // Open MetaForge website
                  // You can use Linking.openURL('https://metaforge.app/arc-raiders') if needed
                }}
              >
                MetaForge
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  bannerContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bottomSection: {
    padding: 20,
    paddingTop: 30,
    minHeight: 500,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#333333',
    borderRadius: 6,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#2a1a1a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF6B6B',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
    fontStyle: 'italic',
  },
  attribution: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    alignItems: 'center',
  },
  attributionText: {
    fontSize: 12,
    color: '#000000',
  },
  attributionLink: {
    color: '#4A9EFF',
    textDecorationLine: 'underline',
  },
});
