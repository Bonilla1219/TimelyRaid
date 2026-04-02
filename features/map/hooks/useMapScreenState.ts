import type { GameMapMarker } from '@/features/map/metaforge';
import {
  gameMarkerToMapPoint,
  MAP_CATEGORY_ORDER,
  type MapCategory,
  type MapPoint,
} from '@/features/map/types/mapTypes';
import { useCallback, useEffect, useMemo, useState } from 'react';

/** Switch to `'multi'` to allow multiple category filters at once. */
export const CATEGORY_FILTER_MODE: 'single' | 'multi' = 'single';

export function useMapScreenState(
  markers: GameMapMarker[],
  mapWidth: number,
  mapHeight: number
) {
  const getSubcategoriesFor = useCallback(
    (categoryKey: string) => {
      const set = new Set<string>();
      markers.forEach((m) => {
        if ((m.category ?? '').trim().toLowerCase() !== categoryKey) return;
        const sub = (m.subcategory ?? '').trim();
        if (sub) set.add(sub);
      });
      return Array.from(set).sort();
    },
    [markers]
  );

  const mapPoints = useMemo((): MapPoint[] => {
    if (markers.length === 0) return [];
    return markers.map((m) => gameMarkerToMapPoint(m, mapWidth, mapHeight));
  }, [markers, mapWidth, mapHeight]);

  const categoriesPresent = useMemo(() => {
    const set = new Set<MapCategory>();
    mapPoints.forEach((p) => set.add(p.category));
    return MAP_CATEGORY_ORDER.filter((c) => set.has(c));
  }, [mapPoints]);

  const eventSubcategories = useMemo(
    () => getSubcategoriesFor('events'),
    [getSubcategoriesFor]
  );

  const containerSubcategories = useMemo(
    () => getSubcategoriesFor('containers'),
    [getSubcategoriesFor]
  );

  const locationSubcategories = useMemo(
    () => getSubcategoriesFor('locations'),
    [getSubcategoriesFor]
  );

  const natureSubcategories = useMemo(
    () => getSubcategoriesFor('nature'),
    [getSubcategoriesFor]
  );

  const [selectedCategories, setSelectedCategories] = useState<MapCategory[]>(
    []
  );
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [containersExpanded, setContainersExpanded] = useState(false);
  const [locationsExpanded, setLocationsExpanded] = useState(false);
  const [natureExpanded, setNatureExpanded] = useState(false);
  const [selectedEventSubcategories, setSelectedEventSubcategories] = useState<
    string[]
  >([]);
  const [selectedContainerSubcategories, setSelectedContainerSubcategories] =
    useState<string[]>([]);
  const [selectedLocationSubcategories, setSelectedLocationSubcategories] =
    useState<string[]>([]);
  const [selectedNatureSubcategories, setSelectedNatureSubcategories] =
    useState<string[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    if (selectedCategories.length > 0 || categoriesPresent.length === 0) return;
    const preferred =
      categoriesPresent.find((c) => c === 'quests') ?? categoriesPresent[0];
    setSelectedCategories([preferred]);
  }, [categoriesPresent, selectedCategories.length]);

  const resetCategories = useCallback(() => {
    const preferred =
      categoriesPresent.find((c) => c === 'quests') ?? categoriesPresent[0];
    if (preferred) setSelectedCategories([preferred]);
    setEventsExpanded(false);
    setContainersExpanded(false);
    setLocationsExpanded(false);
    setNatureExpanded(false);
  }, [categoriesPresent]);

  const toggleCategory = useCallback(
    (cat: MapCategory) => {
      if (CATEGORY_FILTER_MODE === 'single') {
        setSelectedCategories([cat]);
        return;
      }
      setSelectedCategories((prev) => {
        if (prev.includes(cat)) {
          if (prev.length <= 1) return prev;
          return prev.filter((c) => c !== cat);
        }
        return [...prev, cat];
      });
    },
    []
  );

  const onCategoryChipPress = useCallback(
    (cat: MapCategory) => {
      if (CATEGORY_FILTER_MODE === 'single') {
        toggleCategory(cat);
        if (cat !== 'events') setEventsExpanded(false);
        if (cat !== 'containers') setContainersExpanded(false);
        if (cat !== 'locations') setLocationsExpanded(false);
        if (cat !== 'nature') setNatureExpanded(false);
        if (cat === 'events') setEventsExpanded((v) => !v);
        if (cat === 'containers') setContainersExpanded((v) => !v);
        if (cat === 'locations') setLocationsExpanded((v) => !v);
        if (cat === 'nature') setNatureExpanded((v) => !v);
        return;
      }
      toggleCategory(cat);
    },
    [toggleCategory]
  );

  const showEventsSubRow =
    selectedCategories.includes('events') &&
    eventSubcategories.length > 0 &&
    (CATEGORY_FILTER_MODE === 'multi' || eventsExpanded);
  const showContainersSubRow =
    selectedCategories.includes('containers') &&
    containerSubcategories.length > 0 &&
    (CATEGORY_FILTER_MODE === 'multi' || containersExpanded);
  const showLocationsSubRow =
    selectedCategories.includes('locations') &&
    locationSubcategories.length > 0 &&
    (CATEGORY_FILTER_MODE === 'multi' || locationsExpanded);
  const showNatureSubRow =
    selectedCategories.includes('nature') &&
    natureSubcategories.length > 0 &&
    (CATEGORY_FILTER_MODE === 'multi' || natureExpanded);

  const filteredMapPoints = useMemo((): MapPoint[] => {
    if (selectedCategories.length === 0) return [];

    const selectedSet = new Set(selectedCategories);

    return mapPoints.filter((p) => {
      if (!selectedSet.has(p.category)) return false;

      if (p.category === 'events') {
        const sub = (p.subtitle ?? '').trim();
        if (selectedEventSubcategories.length === 0) return false;
        return selectedEventSubcategories.includes(sub);
      }

      if (p.category === 'containers') {
        const sub = (p.subtitle ?? '').trim();
        if (selectedContainerSubcategories.length === 0) return false;
        return selectedContainerSubcategories.includes(sub);
      }

      if (p.category === 'locations') {
        const sub = (p.subtitle ?? '').trim();
        if (selectedLocationSubcategories.length === 0) return false;
        return selectedLocationSubcategories.includes(sub);
      }

      if (p.category === 'nature') {
        const sub = (p.subtitle ?? '').trim();
        if (selectedNatureSubcategories.length === 0) return false;
        return selectedNatureSubcategories.includes(sub);
      }

      return true;
    });
  }, [
    mapPoints,
    selectedCategories,
    selectedEventSubcategories,
    selectedContainerSubcategories,
    selectedLocationSubcategories,
    selectedNatureSubcategories,
  ]);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  return {
    mapPoints,
    categoriesPresent,
    eventSubcategories,
    containerSubcategories,
    locationSubcategories,
    natureSubcategories,
    selectedCategories,
    setSelectedCategories,
    eventsExpanded,
    containersExpanded,
    locationsExpanded,
    natureExpanded,
    setEventsExpanded,
    setContainersExpanded,
    setLocationsExpanded,
    setNatureExpanded,
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
  };
}
