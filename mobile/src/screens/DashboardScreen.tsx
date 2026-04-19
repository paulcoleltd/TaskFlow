import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTaskStore }    from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useAuthStore }    from '../store/authStore';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '../constants/theme';

interface StatCardProps { label: string; value: number; color: string }

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function DashboardScreen() {
  const tasks    = useTaskStore(s => s.tasks);
  const projects = useProjectStore(s => s.projects);
  const user     = useAuthStore(s => s.currentUser);

  const stats = useMemo(() => ({
    total:      tasks.length,
    todo:       tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done:       tasks.filter(t => t.status === 'done').length,
    overdue:    tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      return new Date(t.dueDate) < new Date();
    }).length,
  }), [tasks]);

  const myTasks = useMemo(
    () => tasks.filter(t => t.assigneeId === user?.id && t.status !== 'done').slice(0, 5),
    [tasks, user?.id],
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
          <Text style={styles.name}>{user?.name ?? 'there'} 👋</Text>
        </View>
        <ConnectionStatus />
      </View>

      {/* Stat grid */}
      <View style={styles.statGrid}>
        <StatCard label="Total Tasks"  value={stats.total}      color={Colors.blue}    />
        <StatCard label="In Progress"  value={stats.inProgress} color={Colors.violet}  />
        <StatCard label="Completed"    value={stats.done}       color={Colors.emerald} />
        <StatCard label="Overdue"      value={stats.overdue}    color={Colors.red}     />
      </View>

      {/* Active projects */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Projects</Text>
        <View style={styles.projectRow}>
          {projects.filter(p => p.status === 'active').slice(0, 3).map(p => {
            const pt   = tasks.filter(t => t.projectId === p.id);
            const done = pt.filter(t => t.status === 'done').length;
            const pct  = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0;
            return (
              <View key={p.id} style={styles.projectMini}>
                <View style={[styles.projectDot, { backgroundColor: p.colour }]} />
                <Text style={styles.projectName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.projectPct}>{pct}%</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* My tasks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assigned to me</Text>
        {myTasks.length === 0 ? (
          <Text style={styles.empty}>You're all caught up!</Text>
        ) : (
          myTasks.map(t => (
            <View key={t.id} style={styles.taskRow}>
              <View style={[styles.taskDot, { backgroundColor: t.priority === 'urgent' ? Colors.red : t.priority === 'high' ? Colors.amber : Colors.blue }]} />
              <Text style={styles.taskTitle} numberOfLines={1}>{t.title}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.xxl, paddingBottom: Spacing['3xl'] },

  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: FontSizes.base, color: Colors.textMuted },
  name:     { fontSize: FontSizes['2xl'], fontWeight: FontWeights.bold, color: Colors.textPrimary },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: {
    flex:            1,
    minWidth:        '45%' as any,
    backgroundColor: Colors.card,
    borderRadius:    Radii.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderTopWidth:  3,
    padding:         Spacing.lg,
    gap:             4,
  },
  statValue: { fontSize: FontSizes['2xl'], fontWeight: FontWeights.bold },
  statLabel: { fontSize: FontSizes.sm, color: Colors.textMuted },

  section:      { gap: Spacing.md },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.textPrimary },

  projectRow:  { gap: Spacing.sm },
  projectMini: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border },
  projectDot:  { width: 8, height: 8, borderRadius: Radii.full },
  projectName: { flex: 1, fontSize: FontSizes.sm, color: Colors.textPrimary },
  projectPct:  { fontSize: FontSizes.xs, color: Colors.textFaint },

  taskRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  taskDot:   { width: 6, height: 6, borderRadius: Radii.full },
  taskTitle: { flex: 1, fontSize: FontSizes.base, color: Colors.textPrimary },

  empty: { fontSize: FontSizes.sm, color: Colors.textFaint, textAlign: 'center', paddingVertical: Spacing.lg },
});
