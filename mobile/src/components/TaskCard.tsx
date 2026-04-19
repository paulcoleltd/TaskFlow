import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Task } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { formatDate, isOverdue } from '../lib/utils';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '../constants/theme';

interface Props {
  task:    Task;
  onPress: (task: Task) => void;
}

export function TaskCard({ task, onPress }: Props) {
  const overdue = isOverdue(task.dueDate) && task.status !== 'done';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(task)}
      activeOpacity={0.75}
      accessibilityLabel={`Task: ${task.title}`}
    >
      {/* Title row */}
      <Text style={styles.title} numberOfLines={2}>{task.title}</Text>

      {/* Badges row */}
      <View style={styles.badgeRow}>
        <StatusBadge   status={task.status} />
        <PriorityBadge priority={task.priority} />
      </View>

      {/* Meta row */}
      {task.dueDate && (
        <Text style={[styles.meta, overdue && styles.overdue]}>
          {overdue ? '⚠ Overdue · ' : ''}Due {formatDate(task.dueDate)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius:    Radii.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    padding:         Spacing.lg,
    marginBottom:    Spacing.sm,
    gap:             Spacing.sm,
  },
  title: {
    fontSize:   FontSizes.md,
    fontWeight: FontWeights.semibold,
    color:      Colors.textPrimary,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    gap:           Spacing.xs,
    flexWrap:      'wrap',
  },
  meta: {
    fontSize: FontSizes.xs,
    color:    Colors.textFaint,
  },
  overdue: {
    color: Colors.red,
  },
});
