import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuthStore }          from '../store/authStore';
import { useCollaborationStore } from '../store/collaborationStore';
import { ConnectionStatus }      from '../components/ConnectionStatus';
import { getInitials }           from '../lib/utils';
import { disconnectSocket }      from '../lib/socket';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '../constants/theme';

export function SettingsScreen() {
  const { currentUser, logout } = useAuthStore();
  const onlineUsers = useCollaborationStore(s => s.onlineUsers);

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          disconnectSocket();
          await logout();
        },
      },
    ]);
  };

  if (!currentUser) return null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Avatar + name */}
      <View style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: currentUser.colour }]}>
          <Text style={styles.avatarText}>{getInitials(currentUser.name)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{currentUser.name}</Text>
          <Text style={styles.profileEmail}>{currentUser.email}</Text>
          <View style={[styles.roleBadge, { borderColor: `${Colors.blue}50`, backgroundColor: `${Colors.blue}15` }]}>
            <Text style={[styles.roleText, { color: Colors.blue }]}>{currentUser.role}</Text>
          </View>
        </View>
      </View>

      {/* Connection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Real-Time Collaboration</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Server status</Text>
          <ConnectionStatus />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Online now</Text>
          <Text style={styles.rowValue}>{onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* App info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Info</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Platform</Text>
          <Text style={styles.rowValue}>React Native / Expo</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.xxl, paddingBottom: Spacing['3xl'] },

  profileCard: { flexDirection: 'row', gap: Spacing.lg, backgroundColor: Colors.card, borderRadius: Radii.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl, alignItems: 'center' },
  avatar:      { width: 56, height: 56, borderRadius: Radii.full, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: FontSizes.xl, fontWeight: FontWeights.bold, color: Colors.white },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.textPrimary },
  profileEmail: { fontSize: FontSizes.sm, color: Colors.textMuted },
  roleBadge:   { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radii.full, borderWidth: 1, marginTop: 4 },
  roleText:    { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },

  section:      { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold, color: Colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.8 },

  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.card, padding: Spacing.lg, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border },
  rowLabel:  { fontSize: FontSizes.base, color: Colors.textPrimary },
  rowValue:  { fontSize: FontSizes.sm, color: Colors.textMuted },

  logoutBtn:  { padding: Spacing.lg, borderRadius: Radii.md, borderWidth: 1, borderColor: `${Colors.red}50`, backgroundColor: `${Colors.red}10`, alignItems: 'center' },
  logoutText: { color: Colors.red, fontWeight: FontWeights.semibold, fontSize: FontSizes.base },
});
