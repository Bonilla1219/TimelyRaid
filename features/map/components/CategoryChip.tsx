import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

type Props = {
  label: string;
  iconName: IconName;
  active: boolean;
  accentColor: string;
  onPress: () => void;
};

export function CategoryChip({
  label,
  iconName,
  active,
  accentColor,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        active && { borderColor: accentColor, shadowColor: accentColor },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        <MaterialIcons
          name={iconName}
          size={18}
          color={active ? accentColor : 'rgba(255,255,255,0.55)'}
        />
        <Text
          style={[styles.label, active && { color: '#f2f4f8' }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  pressed: {
    opacity: 0.88,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    maxWidth: 120,
  },
});
