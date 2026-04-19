import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TaskPriority } from '../types';
import { priorityColor, priorityLabel } from '../lib/utils';
import { Radii, FontSizes, FontWeights, Spacing } from '../constants/theme';

interface Props { priority: TaskPriority }

export function PriorityBadge({ priority }: Props) {
  const color = priorityColor(priority);
  return (
    <View style={[styles.badge, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
      <Text style={[styles.label, { color }]}>{priorityLabel(priority)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical:   3,
    borderRadius:      Radii.full,
    borderWidth:       1,
    alignSelf:         'flex-start',
  },
  label: {
    fontSize:   FontSizes.xs,
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.3,
  },
});
