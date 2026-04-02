import type { MapPoint } from '@/features/map/types/mapTypes';

/** Dev-only sample markers for empty API / UI testing. */
export const SAMPLE_MAP_POINTS: MapPoint[] = [
  {
    id: 'sample-quest-1',
    category: 'quests',
    title: 'Sample objective',
    subtitle: 'Main',
    description: 'Dev placeholder',
    latitude: 2400,
    longitude: 3600,
  },
  {
    id: 'sample-event-1',
    category: 'events',
    title: 'Sample event',
    subtitle: 'Storm',
    latitude: 1800,
    longitude: 4200,
  },
  {
    id: 'sample-container-1',
    category: 'containers',
    title: 'Sample crate',
    subtitle: 'Loot',
    latitude: 3000,
    longitude: 3000,
  },
];
