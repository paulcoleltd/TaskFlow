import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useProjectStore } from '../store/projectStore';
import { ProjectCard }     from '../components/ProjectCard';
import type { Project }    from '../types';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '../constants/theme';

type Filter = 'all' | 'active' | 'on-hold' | 'completed';

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all',       label: 'All'       },
  { key: 'active',    label: 'Active'    },
  { key: 'on-hold',   label: 'On Hold'   },
  { key: 'completed', label: 'Completed' },
];

export function ProjectsScreen() {
  const projects = useProjectStore(s => s.projects);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all'
    ? projects
    : projects.filter(p => p.status === filter);

  return (
    <View style={styles.root}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        renderItem={({ item }) => (
          <ProjectCard project={item} onPress={() => {}} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No projects found.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  filterRow: { flexDirection: 'row', gap: Spacing.xs, padding: Spacing.lg, flexWrap: 'wrap' },
  chip:       { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  chipActive: { backgroundColor: `${Colors.blue}30`, borderColor: Colors.blue },
  chipText:   { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, color: Colors.textMuted },
  chipTextActive: { color: Colors.blue },

  list:  { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] },
  empty: { textAlign: 'center', color: Colors.textFaint, paddingTop: Spacing['3xl'], fontSize: FontSizes.base },
});
