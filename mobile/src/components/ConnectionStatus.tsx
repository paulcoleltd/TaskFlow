import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCollaborationStore } from '../store/collaborationStore';
import { Colors, FontSizes, FontWeights, Radii, Spacing } from '../constants/theme';

export function ConnectionStatus() {
  const connected = useCollaborationStore(s => s.connected);

  const bg    = connected ? `${Colors.emerald}18` : `${Colors.amber}18`;
  const border= connected ? `${Colors.emerald}40` : `${Colors.amber}40`;
  const color = connected ? Colors.emerald : Colors.amber;
  const label = connected ? 'Live' : 'Reconnecting…';

  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius:   Radii.md,
    borderWidth:    1,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: Radii.full,
  },
  label: {
    fontSize:   FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
});
