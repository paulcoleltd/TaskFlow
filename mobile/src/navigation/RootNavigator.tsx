import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuthStore }    from '../store/authStore';
import { useTaskStore }    from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useCollaborationStore } from '../store/collaborationStore';
import { getSocket, disconnectSocket } from '../lib/socket';

import { LoginScreen }      from '../screens/LoginScreen';
import { DashboardScreen }  from '../screens/DashboardScreen';
import { TasksScreen }      from '../screens/TasksScreen';
import { ProjectsScreen }   from '../screens/ProjectsScreen';
import { SettingsScreen }   from '../screens/SettingsScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';

import type { RootStackParamList, MainTabParamList } from './types';
import { Colors, FontSizes, FontWeights } from '../constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<MainTabParamList>();

// ── Tab icons (text-emoji fallback — no icon library needed) ─────────────────
const TAB_ICONS: Record<string, string> = {
  Dashboard: '⚡',
  Tasks:     '☑',
  Projects:  '📁',
  Settings:  '⚙',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 20, color }}>{TAB_ICONS[route.name]}</Text>
        ),
        tabBarActiveTintColor:   Colors.blue,
        tabBarInactiveTintColor: Colors.textFaint,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor:  Colors.border,
          borderTopWidth:  1,
        },
        tabBarLabelStyle: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
        headerStyle:  { backgroundColor: Colors.bg },
        headerTitleStyle: { color: Colors.textPrimary, fontWeight: FontWeights.bold, fontSize: FontSizes.lg },
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tasks"     component={TasksScreen}     />
      <Tab.Screen name="Projects"  component={ProjectsScreen}  />
      <Tab.Screen name="Settings"  component={SettingsScreen}  />
    </Tab.Navigator>
  );
}

// ── Collaboration hook (wires Socket.io events to stores) ────────────────────
function useCollaboration() {
  const { currentUser, token } = useAuthStore();
  const { setConnected, setOnlineUsers, addOnlineUser, removeOnlineUser } = useCollaborationStore();
  const { _applyRemoteCreate, _applyRemoteUpdate, _applyRemoteDelete } = useTaskStore();
  const { _applyRemoteCreate: _rcp, _applyRemoteUpdate: _rup, _applyRemoteDelete: _rdp } = useProjectStore();

  useEffect(() => {
    if (!currentUser || !token) return;

    const socket = getSocket(token);

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Presence
    socket.on('presence:list',  (users: any[]) => setOnlineUsers(users));
    socket.on('presence:join',  (user: any)    => addOnlineUser(user));
    socket.on('presence:leave', ({ userId }: { userId: string }) => removeOnlineUser(userId));

    // Tasks
    socket.on('task:created', (task: any) => _applyRemoteCreate(task));
    socket.on('task:updated', ({ id, ...patch }: any) => _applyRemoteUpdate(id, patch));
    socket.on('task:deleted', ({ id }: { id: string }) => _applyRemoteDelete(id));

    // Projects
    socket.on('project:created', (p: any) => _rcp(p));
    socket.on('project:updated', ({ id, ...patch }: any) => _rup(id, patch));
    socket.on('project:deleted', ({ id }: { id: string }) => _rdp(id));

    // Announce presence
    socket.emit('presence:join', {
      userId:     currentUser.id,
      userName:   currentUser.name,
      userColour: currentUser.colour,
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('presence:list');
      socket.off('presence:join');
      socket.off('presence:leave');
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
      socket.off('project:created');
      socket.off('project:updated');
      socket.off('project:deleted');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, token]);
}

// ── Root navigator ────────────────────────────────────────────────────────────
export function RootNavigator() {
  const { isAuthenticated, restoreSession } = useAuthStore();
  const { hydrate: hydrateTasks,    seedIfEmpty: seedTasks    } = useTaskStore();
  const { hydrate: hydrateProjects, seedIfEmpty: seedProjects } = useProjectStore();

  useCollaboration();

  // Boot: restore session + hydrate stores
  useEffect(() => {
    void (async () => {
      await restoreSession();
      await Promise.all([hydrateTasks(), hydrateProjects()]);
      await Promise.all([seedTasks(), seedProjects()]);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle:       { backgroundColor: Colors.bg },
          headerTitleStyle:  { color: Colors.textPrimary, fontWeight: FontWeights.bold, fontSize: FontSizes.lg },
          headerTintColor:   Colors.blue,
          headerShadowVisible: false,
          contentStyle:      { backgroundColor: Colors.bg },
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main"       component={MainTabs}        options={{ headerShown: false }} />
            <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task Detail' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
