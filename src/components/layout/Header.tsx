import { useRef, useState, useMemo, useEffect } from 'react';
import { Search, Bell, Plus, LogOut, AlertCircle, Clock, X, Command, Timer, Square, Check, AlarmClock } from 'lucide-react';
import { isToday, isBefore, startOfDay, addDays, format } from 'date-fns';
import { useUIStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useAuthActions } from '@convex-dev/auth/react';
import { useCurrentUser } from '../../hooks/useConvexUser';
import { useProjectStore } from '../../store/projectStore';
import { Button } from '../ui/Button';
import { RoleGuard } from '../auth/RoleGuard';
import { canCreateTask, ROLE_META } from '../../lib/permissions';
import { getInitials, formatRelativeDate } from '../../lib/utils';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import { requestNotificationPermission, getNotificationPermission } from '../../hooks/useNotifications';
import { PriorityBadge } from '../ui/PriorityBadge';
import { ConnectionStatus } from '../collaboration/ConnectionStatus';
import { PresenceBar } from '../collaboration/PresenceBar';
import toast from 'react-hot-toast';
import { emitTaskUpdate } from '../../lib/collabEmit';

export function Header({ title }: { title?: string }) {
  const { openTaskModal, setSearchQuery, searchQuery, setSelectedTask, openCommandPalette, activeTimer, stopTimer, notificationsEnabled, setNotificationsEnabled } = useUIStore();
  const { tasks, getOverdueTasks, updateTask } = useTaskStore();
  const { getProjectById } = useProjectStore();
  const currentUser = useCurrentUser();
  const { signOut } = useAuthActions();

  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  const POMODORO_MS = 25 * 60 * 1000;

  // Tick every second; auto-stop pomodoro when 25 min elapses
  useEffect(() => {
    if (!activeTimer) return;
    const id = setInterval(() => {
      forceUpdate(n => n + 1);
      // Access store directly to avoid stale closure
      const current = useUIStore.getState().activeTimer;
      if (current?.mode === 'pomodoro' && Date.now() - current.startedAt >= POMODORO_MS) {
        const result = useUIStore.getState().stopTimer();
        if (result) {
          const task = useTaskStore.getState().tasks.find(t => t.id === result.taskId);
          if (task) {
            useTaskStore.getState().updateTask(result.taskId, {
              loggedHours: Math.round(((task.loggedHours ?? 0) + 0.42) * 100) / 100,
            });
          }
          toast.success('🍅 Pomodoro complete! 25m logged. Take a break.', { duration: 6000 });
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [activeTimer]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(searchRef, () => setSearchFocused(false));
  useOnClickOutside(notifRef, () => setNotifOpen(false));

  const overdueTasks = getOverdueTasks();
  const dueTodayTasks = useMemo(() => tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    const due = new Date(t.dueDate);
    return isToday(due) && !isBefore(due, startOfDay(new Date()));
  }), [tasks]);
  const overdueCount = overdueTasks.length;
  const totalNotifCount = overdueCount + dueTodayTasks.length;
  const role = (currentUser?.role ?? 'viewer') as import('../../store/authStore').Role;
  const roleMeta = ROLE_META[role];

  // Live search — up to 6 matching tasks across the whole workspace
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return tasks
      .filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [searchQuery, tasks]);

  const showResults = searchFocused && searchQuery.trim().length > 0;

  const timerTask = activeTimer ? tasks.find(t => t.id === activeTimer.taskId) : null;
  const isPomodoro = activeTimer?.mode === 'pomodoro';
  const elapsedMs = activeTimer ? Date.now() - activeTimer.startedAt : 0;
  const displaySeconds = isPomodoro
    ? Math.max(0, Math.ceil((POMODORO_MS - elapsedMs) / 1000))  // countdown
    : Math.floor(elapsedMs / 1000);                               // count-up
  const timerDisplay = `${String(Math.floor(displaySeconds / 60)).padStart(2, '0')}:${String(displaySeconds % 60).padStart(2, '0')}`;

  const handleStopTimer = () => {
    const result = stopTimer();
    if (!result) return;
    const task = tasks.find(t => t.id === result.taskId);
    if (task) {
      const added = result.elapsedHours;
      const loggedHours = Math.round(((task.loggedHours ?? 0) + added) * 100) / 100;
      updateTask(result.taskId, { loggedHours });
      emitTaskUpdate(result.taskId, { loggedHours });
      const mins = Math.round(added * 60);
      toast.success(`Timer stopped — ${mins < 1 ? '<1' : mins}m logged to "${task.title}"`);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Signed out successfully.');
  };

  const handleSelectResult = (taskId: string) => {
    setSelectedTask(taskId);
    setSearchQuery('');
    setSearchFocused(false);
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 glass border-b border-[#1C3054]/60 flex-shrink-0 sticky top-0 z-30">
      <h1 className="text-base font-semibold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Command palette trigger */}
        <button
          onClick={openCommandPalette}
          className="hidden sm:flex items-center gap-2 rounded-xl bg-[#0C1526]/60 border border-[#1C3054] px-3 py-1.5 text-slate-500 hover:text-slate-300 hover:border-[#4B8CF7]/40 hover:bg-[#122040]/60 transition-all duration-200"
        >
          <Command className="w-3.5 h-3.5" />
          <span className="text-xs">Search…</span>
          <div className="flex items-center gap-0.5 ml-1">
            <kbd className="text-[10px] font-mono bg-[#06091A] border border-[#1C3054] px-1 py-0.5 rounded">⌘</kbd>
            <kbd className="text-[10px] font-mono bg-[#06091A] border border-[#1C3054] px-1 py-0.5 rounded">K</kbd>
          </div>
        </button>

        {/* Active timer / pomodoro chip */}
        {activeTimer && timerTask && (
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${
            isPomodoro
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {isPomodoro
              ? <span className="text-sm leading-none flex-shrink-0">🍅</span>
              : <Timer className="w-3.5 h-3.5 animate-pulse flex-shrink-0" />
            }
            <span className="text-xs font-mono font-semibold tabular-nums">{timerDisplay}</span>
            <span className={`text-xs max-w-[120px] truncate ${isPomodoro ? 'text-orange-400/70' : 'text-emerald-400/70'}`}>
              {timerTask.title}
            </span>
            <button
              onClick={handleStopTimer}
              title="Stop timer"
              className={`ml-1 p-0.5 rounded transition-colors ${isPomodoro ? 'hover:bg-orange-500/20' : 'hover:bg-emerald-500/20'}`}
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </div>
        )}

        {/* Global search with live results */}
        <div className="relative hidden sm:block" ref={searchRef}>
          <div className={`flex items-center gap-2 rounded-xl bg-[#0C1526]/60 border px-3 py-1.5 transition-all duration-200 ${searchFocused ? 'border-[#4B8CF7]/60 shadow-glow bg-[#0C1526]' : 'border-[#1C3054]'}`}>
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search tasks..."
              className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none w-44"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchFocused(false); }} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {showResults && (
            <div className="absolute top-full mt-2 left-0 w-80 bg-[#0C1526] border border-[#1C3054] rounded-2xl shadow-2xl z-50 overflow-hidden">
              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No tasks match "{searchQuery}"</p>
              ) : (
                <>
                  <div className="px-4 pt-3 pb-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {searchResults.map(task => {
                    const project = getProjectById(task.projectId);
                    return (
                      <button
                        key={task.id}
                        onClick={() => handleSelectResult(task.id)}
                        className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-[#122040] transition-colors text-left border-t border-[#1C3054] first:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 truncate">{task.title}</p>
                          {project && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.colour }} />
                              <span className="text-[10px] text-slate-500 truncate">{project.name}</span>
                            </div>
                          )}
                        </div>
                        <PriorityBadge priority={task.priority} />
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Real-time collaboration status */}
        <ConnectionStatus />
        <PresenceBar />

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(v => !v)}
            className="p-2 rounded-xl hover:bg-[#0C1526] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Bell className="w-4 h-4" />
          </button>
          {totalNotifCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold pointer-events-none">
              {totalNotifCount > 9 ? '9+' : totalNotifCount}
            </span>
          )}

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[#0C1526] border border-[#1C3054] rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1C3054] flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notifications</span>
                <div className="flex items-center gap-1.5">
                  {dueTodayTasks.length > 0 && (
                    <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                      {dueTodayTasks.length} today
                    </span>
                  )}
                  {overdueCount > 0 && (
                    <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-semibold">
                      {overdueCount} overdue
                    </span>
                  )}
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {totalNotifCount === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-xs text-slate-500">You're all caught up!</p>
                  </div>
                ) : (
                  <>
                    {dueTodayTasks.length > 0 && (
                      <>
                        <div className="px-4 py-2 bg-[#06091A]">
                          <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Due Today</span>
                        </div>
                        {dueTodayTasks.map(task => (
                          <div
                            key={task.id}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-[#122040] transition-colors border-b border-[#1C3054] last:border-0 group/notif"
                          >
                            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <button
                              onClick={() => { setSelectedTask(task.id); setNotifOpen(false); }}
                              className="flex-1 min-w-0 text-left"
                            >
                              <p className="text-sm text-slate-200 truncate">{task.title}</p>
                              <p className="text-xs text-amber-400 mt-0.5">Due today</p>
                            </button>
                            <div className="flex items-center gap-1 opacity-0 group-hover/notif:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                onClick={e => { e.stopPropagation(); updateTask(task.id, { status: 'done' }); emitTaskUpdate(task.id, { status: 'done' }); toast.success('Marked done'); }}
                                title="Mark as done"
                                className="p-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  const next = format(addDays(new Date(task.dueDate!), 1), 'yyyy-MM-dd');
                                  updateTask(task.id, { dueDate: next });
                                  emitTaskUpdate(task.id, { dueDate: next });
                                  toast.success(`Snoozed to ${format(addDays(new Date(task.dueDate!), 1), 'd MMM')}`);
                                }}
                                title="Snooze 1 day"
                                className="p-1 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-400 hover:bg-slate-500/20 transition-colors"
                              >
                                <AlarmClock className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {overdueCount > 0 && (
                      <>
                        <div className="px-4 py-2 bg-[#06091A]">
                          <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Overdue</span>
                        </div>
                        {overdueTasks.map(task => (
                          <div
                            key={task.id}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-[#122040] transition-colors border-b border-[#1C3054] last:border-0 group/notif"
                          >
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <button
                              onClick={() => { setSelectedTask(task.id); setNotifOpen(false); }}
                              className="flex-1 min-w-0 text-left"
                            >
                              <p className="text-sm text-slate-200 truncate">{task.title}</p>
                              <p className="text-xs text-red-400 mt-0.5">Due {formatRelativeDate(task.dueDate)}</p>
                            </button>
                            <div className="flex items-center gap-1 opacity-0 group-hover/notif:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                onClick={e => { e.stopPropagation(); updateTask(task.id, { status: 'done' }); emitTaskUpdate(task.id, { status: 'done' }); toast.success('Marked done'); }}
                                title="Mark as done"
                                className="p-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  const next = format(addDays(new Date(task.dueDate!), 1), 'yyyy-MM-dd');
                                  updateTask(task.id, { dueDate: next });
                                  emitTaskUpdate(task.id, { dueDate: next });
                                  toast.success(`Snoozed to ${format(addDays(new Date(task.dueDate!), 1), 'd MMM')}`);
                                }}
                                title="Snooze 1 day"
                                className="p-1 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-400 hover:bg-slate-500/20 transition-colors"
                              >
                                <AlarmClock className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Browser notifications CTA */}
              {!notificationsEnabled && getNotificationPermission() !== 'denied' && getNotificationPermission() !== 'unsupported' && (
                <div className="px-4 py-3 border-t border-[#1C3054] flex items-center justify-between bg-[#06091A]">
                  <p className="text-xs text-slate-500">Get alerted 15 min before due tasks</p>
                  <button
                    onClick={async () => {
                      const result = await requestNotificationPermission();
                      if (result === 'granted') {
                        setNotificationsEnabled(true);
                        toast.success('Browser notifications enabled!');
                        setNotifOpen(false);
                      } else {
                        toast.error('Notification permission denied.');
                      }
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium flex-shrink-0 ml-3 transition-colors"
                  >
                    Enable
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* New Task — hidden for viewers */}
        <RoleGuard allowed={canCreateTask(role)}>
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => openTaskModal()}>
            New Task
          </Button>
        </RoleGuard>

        {/* Current user + role */}
        {currentUser && (
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#1C3054]">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: currentUser.colour }}
            >
              {getInitials(currentUser.name)}
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleMeta.colour} ${roleMeta.bg}`}>
              {roleMeta.label}
            </span>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg hover:bg-[#0C1526] text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
