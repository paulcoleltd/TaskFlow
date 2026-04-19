import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { useRoute, type RouteProp, useNavigation } from '@react-navigation/native';
import { useTaskStore }    from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useAuthStore }    from '../store/authStore';
import { StatusBadge }   from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { formatDate, getInitials, isOverdue } from '../lib/utils';
import { getSocket } from '../lib/socket';
import type { TaskStatus, TaskPriority } from '../types';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '../constants/theme';

type Route = RouteProp<RootStackParamList, 'TaskDetail'>;

const STATUSES: TaskStatus[]   = ['todo', 'in-progress', 'in-review', 'done'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  'todo': 'To Do', 'in-progress': 'In Progress', 'in-review': 'In Review', 'done': 'Done',
};

export function TaskDetailScreen() {
  const route      = useRoute<Route>();
  const navigation = useNavigation();
  const { taskId } = route.params;

  const task        = useTaskStore(s => s.tasks.find(t => t.id === taskId));
  const updateTask  = useTaskStore(s => s.updateTask);
  const deleteTask  = useTaskStore(s => s.deleteTask);
  const projects    = useProjectStore(s => s.projects);
  const user        = useAuthStore(s => s.currentUser);

  const [showStatusPicker,   setShowStatusPicker]   = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Task not found.</Text>
      </View>
    );
  }

  const project = projects.find(p => p.id === task.projectId);
  const canEdit = user?.role === 'admin' || user?.role === 'member';
  const overdue = isOverdue(task.dueDate) && task.status !== 'done';

  const changeStatus = (status: TaskStatus) => {
    updateTask(taskId, { status });
    try {
      getSocket().emit('task:update', { id: taskId, status });
    } catch { /* offline */ }
    setShowStatusPicker(false);
  };

  const changePriority = (priority: TaskPriority) => {
    updateTask(taskId, { priority });
    try {
      getSocket().emit('task:update', { id: taskId, priority });
    } catch { /* offline */ }
    setShowPriorityPicker(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          deleteTask(taskId);
          try { getSocket().emit('task:delete', { id: taskId }); } catch { /* offline */ }
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Title */}
      <Text style={styles.title}>{task.title}</Text>

      {/* Status + Priority row */}
      <View style={styles.badgeRow}>
        <TouchableOpacity onPress={() => canEdit && setShowStatusPicker(v => !v)} disabled={!canEdit}>
          <StatusBadge status={task.status} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => canEdit && setShowPriorityPicker(v => !v)} disabled={!canEdit}>
          <PriorityBadge priority={task.priority} />
        </TouchableOpacity>
      </View>

      {/* Inline pickers */}
      {showStatusPicker && canEdit && (
        <View style={styles.picker}>
          <Text style={styles.pickerTitle}>Change Status</Text>
          {STATUSES.map(s => (
            <TouchableOpacity key={s} style={[styles.pickerItem, task.status === s && styles.pickerItemActive]} onPress={() => changeStatus(s)}>
              <Text style={[styles.pickerItemText, task.status === s && styles.pickerItemTextActive]}>{STATUS_LABELS[s]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showPriorityPicker && canEdit && (
        <View style={styles.picker}>
          <Text style={styles.pickerTitle}>Change Priority</Text>
          {PRIORITIES.map(p => (
            <TouchableOpacity key={p} style={[styles.pickerItem, task.priority === p && styles.pickerItemActive]} onPress={() => changePriority(p)}>
              <Text style={[styles.pickerItemText, task.priority === p && styles.pickerItemTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Description */}
      {task.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{task.description}</Text>
        </View>
      )}

      {/* Meta */}
      <View style={styles.metaGrid}>
        {project && (
          <MetaRow label="Project">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
              <View style={[styles.dot, { backgroundColor: project.colour }]} />
              <Text style={styles.metaValue}>{project.name}</Text>
            </View>
          </MetaRow>
        )}
        {task.dueDate && (
          <MetaRow label="Due Date">
            <Text style={[styles.metaValue, overdue && { color: Colors.red }]}>
              {overdue ? '⚠ ' : ''}{formatDate(task.dueDate)}
            </Text>
          </MetaRow>
        )}
        <MetaRow label="Created">
          <Text style={styles.metaValue}>{formatDate(task.createdAt)}</Text>
        </MetaRow>
        <MetaRow label="Updated">
          <Text style={styles.metaValue}>{formatDate(task.updatedAt)}</Text>
        </MetaRow>
      </View>

      {/* Delete */}
      {canEdit && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Task</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.xxl, paddingBottom: Spacing['3xl'] },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  notFound: { color: Colors.textFaint, fontSize: FontSizes.base },

  title:    { fontSize: FontSizes['2xl'], fontWeight: FontWeights.bold, color: Colors.textPrimary, lineHeight: 32 },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },

  picker:           { backgroundColor: Colors.card, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', gap: 1 },
  pickerTitle:      { padding: Spacing.md, fontSize: FontSizes.xs, fontWeight: FontWeights.bold, color: Colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8 },
  pickerItem:       { padding: Spacing.md, paddingHorizontal: Spacing.lg },
  pickerItemActive: { backgroundColor: `${Colors.blue}20` },
  pickerItemText:   { fontSize: FontSizes.base, color: Colors.textPrimary },
  pickerItemTextActive: { color: Colors.blue, fontWeight: FontWeights.semibold },

  section:      { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: Colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8 },
  description:  { fontSize: FontSizes.base, color: Colors.textPrimary, lineHeight: 22 },

  metaGrid: { backgroundColor: Colors.card, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  metaRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  metaLabel: { fontSize: FontSizes.sm, color: Colors.textFaint },
  metaValue: { fontSize: FontSizes.sm, color: Colors.textPrimary, fontWeight: FontWeights.medium },
  dot:       { width: 8, height: 8, borderRadius: Radii.full },

  deleteBtn:     { padding: Spacing.lg, borderRadius: Radii.md, borderWidth: 1, borderColor: `${Colors.red}50`, backgroundColor: `${Colors.red}10`, alignItems: 'center' },
  deleteBtnText: { color: Colors.red, fontWeight: FontWeights.semibold, fontSize: FontSizes.base },
});
