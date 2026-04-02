import { CATEGORY_FILTER_MODE } from '@/features/map/hooks/useMapScreenState';
import { MARKER_CATEGORY_CONFIG } from '@/features/map/mapMarkerStyle';
import type { MapCategory } from '@/features/map/types/mapTypes';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CategoryChip } from './CategoryChip';

type Props = {
  categoriesPresent: MapCategory[];
  selectedCategories: MapCategory[];
  onCategoryPress: (cat: MapCategory) => void;
  onReset?: () => void;
  showEventsSubRow: boolean;
  showContainersSubRow: boolean;
  showLocationsSubRow: boolean;
  showNatureSubRow: boolean;
  eventSubcategories: string[];
  containerSubcategories: string[];
  locationSubcategories: string[];
  natureSubcategories: string[];
  selectedEventSubcategories: string[];
  selectedContainerSubcategories: string[];
  selectedLocationSubcategories: string[];
  selectedNatureSubcategories: string[];
  onToggleEventSub: (sub: string) => void;
  onToggleContainerSub: (sub: string) => void;
  onToggleLocationSub: (sub: string) => void;
  onToggleNatureSub: (sub: string) => void;
};

export function MapTopFilterBar({
  categoriesPresent,
  selectedCategories,
  onCategoryPress,
  onReset,
  showEventsSubRow,
  showContainersSubRow,
  eventSubcategories,
  containerSubcategories,
  showLocationsSubRow,
  showNatureSubRow,
  locationSubcategories,
  natureSubcategories,
  selectedEventSubcategories,
  selectedContainerSubcategories,
  selectedLocationSubcategories,
  selectedNatureSubcategories,
  onToggleEventSub,
  onToggleContainerSub,
  onToggleLocationSub,
  onToggleNatureSub,
}: Props) {
  const selectedSet = new Set(selectedCategories);

  return (
    <View style={styles.bar}>
      <View style={styles.mainRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {categoriesPresent.map((cat) => {
            const cfg = MARKER_CATEGORY_CONFIG[cat];
            return (
              <CategoryChip
                key={cat}
                label={cfg.label}
                iconName={cfg.iconName}
                accentColor={cfg.accentColor}
                active={selectedSet.has(cat)}
                onPress={() => onCategoryPress(cat)}
              />
            );
          })}
        </ScrollView>
        {CATEGORY_FILTER_MODE === 'multi' && onReset ? (
          <Pressable onPress={onReset} style={styles.resetBtn} hitSlop={8}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        ) : null}
      </View>

      {showEventsSubRow && eventSubcategories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subScroll}
        >
          {eventSubcategories.map((sub) => {
            const selected = selectedEventSubcategories.includes(sub);
            return (
              <Pressable
                key={sub}
                style={[styles.subChip, selected && styles.subChipOn]}
                onPress={() => onToggleEventSub(sub)}
              >
                <Text
                  style={[styles.subChipText, selected && styles.subChipTextOn]}
                  numberOfLines={1}
                >
                  {sub}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {showContainersSubRow && containerSubcategories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subScroll}
        >
          {containerSubcategories.map((sub) => {
            const selected = selectedContainerSubcategories.includes(sub);
            return (
              <Pressable
                key={sub}
                style={[styles.subChip, selected && styles.subChipOn]}
                onPress={() => onToggleContainerSub(sub)}
              >
                <Text
                  style={[styles.subChipText, selected && styles.subChipTextOn]}
                  numberOfLines={1}
                >
                  {sub}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {showLocationsSubRow && locationSubcategories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subScroll}
        >
          {locationSubcategories.map((sub) => {
            const selected = selectedLocationSubcategories.includes(sub);
            return (
              <Pressable
                key={sub}
                style={[styles.subChip, selected && styles.subChipOn]}
                onPress={() => onToggleLocationSub(sub)}
              >
                <Text
                  style={[styles.subChipText, selected && styles.subChipTextOn]}
                  numberOfLines={1}
                >
                  {sub}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {showNatureSubRow && natureSubcategories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subScroll}
        >
          {natureSubcategories.map((sub) => {
            const selected = selectedNatureSubcategories.includes(sub);
            return (
              <Pressable
                key={sub}
                style={[styles.subChip, selected && styles.subChipOn]}
                onPress={() => onToggleNatureSub(sub)}
              >
                <Text
                  style={[styles.subChipText, selected && styles.subChipTextOn]}
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
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(8, 10, 14, 0.72)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 8,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    flexGrow: 0,
  },
  resetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 4,
  },
  resetText: {
    color: 'rgba(120, 200, 255, 0.95)',
    fontSize: 13,
    fontWeight: '600',
  },
  subScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 2,
  },
  subChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxWidth: 200,
  },
  subChipOn: {
    backgroundColor: 'rgba(110, 181, 255, 0.2)',
    borderColor: 'rgba(110, 181, 255, 0.45)',
  },
  subChipText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },
  subChipTextOn: {
    color: '#e8f0ff',
    fontWeight: '600',
  },
});
