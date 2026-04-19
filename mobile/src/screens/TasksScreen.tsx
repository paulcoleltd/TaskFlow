import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTaskStore } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import { TaskCard } from '../components/TaskCard';
import type { Task, TaskStatus } from '../types';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '../constants/theme';
import { statusLabel } from '../lib/utils';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Tasks'>;

const FILTERS: Array<{ key: TaskStatus | 'all'; label: string }> = [
  { key: 'all',         label: 'All'         },
  { key: 'todo',        label: 'To Do'       },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'in-review',   label: 'In Review'   },
  { key: 'done',        label: 'Done'        },
];

export function TasksScreen() {
  const navigation = useNavigation<Nav>();
  const tasks      = useTaskStore(s => s.tasks);
  const user       = useAuthStore(s => s.currentUser);

  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<TaskStatus | 'all'>('all');
  const [myOnly, setMyOnly]   = useState(false);

  const filtered = useMemo(() => {
    let list = tasks;
    if (myOnly && user) list = list.filter(t => t.assigneeId === user.id);
    if (filter !== 'all') list = list.filter(t => t.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [tasks, filter, search, myOnly, user]);

  return (
    <View style={styles.root}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search tasks…"
          placeholderTextColor={Colors.textFaint}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter chips */}
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

      {/* Mine toggle */}
      <TouchableOpacity
        style={[styles.mineToggle, myOnly && styles.mineToggleActive]}
        onPress={() => setMyOnly(v => !v)}
      >
        <Text style={[styles.mineText, myOnly && styles.mineTextActive]}>
          {myOnly ? '✓ My tasks only' : 'All team tasks'}
        </Text>
      </TouchableOpacity>

      {/* Count */}
      <Text style={styles.count}>{filtered.length} task{filtered.length !== 1 ? 's' : ''}</Text>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No tasks match your filters.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  searchWrap: { padding: Spacing.lg, paddingBottom: 0 },
  search: {
    backgroundColor: Colors.input,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderRadius:    Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    fontSize:        FontSizes.base,
    color:           Colors.textPrimary,
  },

  filterRow: { flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, flexWrap: 'wrap' },
  chip:       { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  chipActive: { backgroundColor: `${Colors.blue}30`, borderColor: Colors.blue },
  chipText:   { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, color: Colors.textMuted },
  chipTextActive: { color: Colors.blue },

  mineToggle:       { marginHorizontal: Spacing.lg, marginBottom: Spacing.xs, alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  mineToggleActive: { backgroundColor: `${Colors.emerald}20`, borderColor: Colors.emerald },
  mineText:         { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold, color: Colors.textMuted },
  mineTextActive:   { color: Colors.emerald },

  count: { fontSize: FontSizes.xs, color: Colors.textFaint, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xs },
  list:  { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] },
  empty: { textAlign: 'center', color: Colors.textFaint, paddingTop: Spacing['3xl'], fontSize: FontSizes.base },
});
