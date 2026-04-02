import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MARKER_CATEGORY_CONFIG } from '@/features/map/mapMarkerStyle';
import type { MapPoint } from '@/features/map/types/mapTypes';

type Props = {
  point: MapPoint | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
};

export function MarkerDetailCard({
  point,
  onClose,
  isFavorite,
  onToggleFavorite,
}: Props) {
  if (!point) return null;

  const cfg = MARKER_CATEGORY_CONFIG[point.category];

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={[styles.accentBar, { backgroundColor: cfg.accentColor }]} />
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={2}>
                {point.title}
              </Text>
              {point.subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {point.subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onToggleFavorite}
              hitSlop={10}
              accessibilityLabel={isFavorite ? 'Remove favorite' : 'Add favorite'}
            >
              <MaterialIcons
                name={isFavorite ? 'star' : 'star-border'}
                size={26}
                color={isFavorite ? '#e8c547' : 'rgba(255,255,255,0.5)'}
              />
            </Pressable>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <MaterialIcons name="close" size={24} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.badge, { borderColor: cfg.accentColor }]}>
              <Text style={[styles.badgeText, { color: cfg.accentColor }]}>
                {cfg.label}
              </Text>
            </View>
            {point.status ? (
              <View style={styles.badgeMuted}>
                <Text style={styles.badgeMutedText}>{point.status}</Text>
              </View>
            ) : null}
            {point.rarity ? (
              <View style={styles.badgeMuted}>
                <Text style={styles.badgeMutedText}>{point.rarity}</Text>
              </View>
            ) : null}
          </View>

          {point.description ? (
            <ScrollView
              style={styles.descScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.description}>{point.description}</Text>
            </ScrollView>
          ) : (
            <Text style={styles.placeholder}>No additional intel.</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    paddingBottom: 24,
    paddingHorizontal: 12,
  },
  card: {
    maxHeight: '38%',
    minHeight: 160,
    backgroundColor: 'rgba(14, 16, 22, 0.96)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  accentBar: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
    minHeight: 40,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f2f4f8',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeMuted: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  badgeMutedText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
  },
  descScroll: {
    maxHeight: 120,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(230, 235, 245, 0.88)',
  },
  placeholder: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
});
