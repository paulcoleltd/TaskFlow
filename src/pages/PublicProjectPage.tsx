import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { Zap, ExternalLink } from 'lucide-react';

export default function PublicProjectPage() {
  const { token } = useParams<{ token: string }>();
  const data = useQuery(api.projects.getByShareToken, token ? { token } : 'skip');

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-[#0B1437] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="min-h-screen bg-[#0B1437] flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-4xl">🔒</div>
        <h1 className="text-xl font-semibold text-slate-200">Project not found</h1>
        <p className="text-slate-400 text-sm">This link may be expired or the project is no longer public.</p>
        <Link to="/" className="text-blue-400 text-sm hover:underline">Go to TaskFlow →</Link>
      </div>
    );
  }

  const { project, tasks } = data;
  const total = tasks.length;
  const done  = tasks.filter((t: any) => t.status === 'done').length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0B1437] text-slate-200">
      {/* Header */}
      <div className="border-b border-[#1F3461] bg-[#0C1526]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-slate-200">TaskFlow</span>
          </div>
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            Sign up free
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Project header */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{(project as any).icon}</span>
          <h1 className="text-2xl font-bold text-slate-100">{(project as any).name}</h1>
        </div>
        {(project as any).description && (
          <p className="text-slate-400 text-sm mb-4">{(project as any).description}</p>
        )}

        {/* Progress */}
        {total > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>{done} / {total} tasks complete</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-[#1F3461] rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No tasks in this project.</p>
          ) : (
            tasks.map((task: any) => (
              <div
                key={task._id}
                className="flex items-center gap-3 p-3 bg-[#111C44] border border-[#1F3461] rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* CTA */}
        <div className="mt-10 p-6 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-2xl text-center">
          <p className="text-sm font-semibold text-slate-200 mb-1">Manage your projects with TaskFlow</p>
          <p className="text-xs text-slate-400 mb-4">Free, powerful task management for teams of all sizes.</p>
          <Link
            to="/login"
            className="inline-block px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Get started for free →
          </Link>
        </div>
      </div>
    </div>
  );
}
