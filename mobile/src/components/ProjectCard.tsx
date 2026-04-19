import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Project } from '../types';
import { useTaskStore } from '../store/taskStore';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '../constants/theme';

interface Props {
  project: Project;
  onPress: (project: Project) => void;
}

export function ProjectCard({ project, onPress }: Props) {
  const tasks       = useTaskStore(s => s.tasks);
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const done        = projectTasks.filter(t => t.status === 'done').length;
  const total       = projectTasks.length;
  const progress    = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(project)}
      activeOpacity={0.75}
      accessibilityLabel={`Project: ${project.name}`}
    >
      {/* Colour stripe */}
      <View style={[styles.stripe, { backgroundColor: project.colour }]} />

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{project.name}</Text>
        {project.description ? (
          <Text style={styles.desc} numberOfLines={2}>{project.description}</Text>
        ) : null}

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` as `${number}%`, backgroundColor: project.colour }]} />
        </View>
        <Text style={styles.progressLabel}>{done}/{total} tasks · {progress}%</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius:    Radii.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    marginBottom:    Spacing.sm,
    flexDirection:   'row',
    overflow:        'hidden',
  },
  stripe: {
    width: 4,
  },
  body: {
    flex:    1,
    padding: Spacing.lg,
    gap:     Spacing.xs,
  },
  name: {
    fontSize:   FontSizes.md,
    fontWeight: FontWeights.bold,
    color:      Colors.textPrimary,
  },
  desc: {
    fontSize: FontSizes.sm,
    color:    Colors.textMuted,
    lineHeight: 18,
  },
  progressTrack: {
    height:          4,
    backgroundColor: Colors.border,
    borderRadius:    Radii.full,
    overflow:        'hidden',
    marginTop:       Spacing.xs,
  },
  progressFill: {
    height:          4,
    borderRadius:    Radii.full,
  },
  progressLabel: {
    fontSize: FontSizes.xs,
    color:    Colors.textFaint,
  },
});
