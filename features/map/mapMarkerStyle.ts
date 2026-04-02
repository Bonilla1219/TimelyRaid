import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { MapCategory } from '@/features/map/types/mapTypes';

export type MarkerCategoryStyle = {
  label: string;
  accentColor: string;
  glowColor: string;
  iconName: ComponentProps<typeof MaterialIcons>['name'];
};

export const MARKER_CATEGORY_CONFIG: Record<MapCategory, MarkerCategoryStyle> = {
  containers: {
    label: 'Containers',
    accentColor: '#c9a227',
    glowColor: 'rgba(201, 162, 39, 0.55)',
    iconName: 'inventory-2',
  },
  events: {
    label: 'Events',
    accentColor: '#e85d4c',
    glowColor: 'rgba(232, 93, 76, 0.5)',
    iconName: 'bolt',
  },
  locations: {
    label: 'Locations',
    accentColor: '#6eb5ff',
    glowColor: 'rgba(110, 181, 255, 0.5)',
    iconName: 'place',
  },
  nature: {
    label: 'Nature',
    accentColor: '#5ccc8a',
    glowColor: 'rgba(92, 204, 138, 0.5)',
    iconName: 'park',
  },
  quests: {
    label: 'Quests',
    accentColor: '#b388ff',
    glowColor: 'rgba(179, 136, 255, 0.55)',
    iconName: 'flag',
  },
};
